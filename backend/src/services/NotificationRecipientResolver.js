/**
 * NotificationRecipientResolver
 * ==============================
 * Servicio SSOT para resolver destinatarios de notificaciones
 * cuando se envían a departamentos como entidad (ej: "RRHH", "Legal", etc.)
 *
 * Uso:
 *   const recipients = await NotificationRecipientResolver.resolve(companyId, 'RRHH');
 *   // Retorna: [{ userId: 'uuid', role: 'primary' }, ...]
 *
 * Estrategia de resolución (orden de prioridad):
 *   1. notification_recipients configurados en el departamento
 *   2. manager_user_id del departamento
 *   3. Usuarios con rol 'admin' o 'manager' de la empresa (fallback)
 *
 * @module NotificationRecipientResolver
 * @version 1.0.0
 * @date 2025-12-16
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Aliases comunes para departamentos de RRHH
const RRHH_ALIASES = ['rrhh', 'hr', 'recursos humanos', 'human resources', 'personal', 'talento humano'];
const LEGAL_ALIASES = ['legal', 'legales', 'juridico', 'jurídico'];

class NotificationRecipientResolver {

    /**
     * Resolver destinatarios para un departamento
     * @param {number} companyId - ID de la empresa
     * @param {string} departmentIdentifier - Nombre o alias del departamento (ej: "RRHH")
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Array>} Lista de destinatarios [{userId, role, name, email}]
     */
    static async resolve(companyId, departmentIdentifier, options = {}) {
        const {
            maxRecipients = 5,
            includeUserDetails = true,
            fallbackToAdmins = true
        } = options;

        if (!companyId || !departmentIdentifier) {
            console.warn('[NotificationRecipientResolver] companyId o departmentIdentifier faltante');
            return [];
        }

        const normalizedIdentifier = departmentIdentifier.toLowerCase().trim();

        try {
            // 1. Buscar departamento por nombre directo o alias
            const department = await this._findDepartment(companyId, normalizedIdentifier);

            if (department) {
                // 2. Obtener destinatarios configurados
                let recipients = await this._getConfiguredRecipients(department, maxRecipients);

                if (recipients.length > 0) {
                    console.log(`[NotificationRecipientResolver] ${recipients.length} destinatarios configurados para ${departmentIdentifier}`);
                    return includeUserDetails ? await this._enrichWithUserDetails(recipients) : recipients;
                }

                // 3. Fallback: manager del departamento
                if (department.manager_user_id) {
                    console.log(`[NotificationRecipientResolver] Usando manager del departamento ${departmentIdentifier}`);
                    recipients = [{ userId: department.manager_user_id, role: 'manager' }];
                    return includeUserDetails ? await this._enrichWithUserDetails(recipients) : recipients;
                }
            }

            // 4. Último fallback: admins de la empresa
            if (fallbackToAdmins) {
                console.log(`[NotificationRecipientResolver] Usando admins como fallback para ${departmentIdentifier}`);
                return this._getFallbackAdmins(companyId, maxRecipients, includeUserDetails);
            }

            return [];
        } catch (error) {
            console.error('[NotificationRecipientResolver] Error:', error.message);
            return fallbackToAdmins ? this._getFallbackAdmins(companyId, maxRecipients, includeUserDetails) : [];
        }
    }

    /**
     * Resolver destinatarios para RRHH específicamente
     * Atajo conveniente para el caso más común
     */
    static async resolveRRHH(companyId, options = {}) {
        return this.resolve(companyId, 'RRHH', options);
    }

    /**
     * Configurar destinatarios para un departamento
     * @param {number} departmentId - ID del departamento
     * @param {Array} recipients - Array de {userId, role: 'primary'|'backup'|'cc'}
     */
    static async configureRecipients(departmentId, recipients) {
        const jsonRecipients = JSON.stringify(recipients.map(r => ({
            user_id: r.userId,
            role: r.role || 'member'
        })));

        await sequelize.query(`
            UPDATE departments
            SET notification_recipients = :recipients::jsonb
            WHERE id = :departmentId
        `, {
            replacements: { departmentId, recipients: jsonRecipients },
            type: QueryTypes.UPDATE
        });

        console.log(`[NotificationRecipientResolver] Configurados ${recipients.length} destinatarios para departamento ${departmentId}`);
    }

    /**
     * Agregar alias para un departamento
     * @param {number} companyId - ID de la empresa
     * @param {number} departmentId - ID del departamento
     * @param {string} alias - Alias a agregar (ej: "RRHH")
     */
    static async addAlias(companyId, departmentId, alias) {
        await sequelize.query(`
            INSERT INTO department_aliases (alias, department_id, company_id)
            VALUES (:alias, :departmentId, :companyId)
            ON CONFLICT (alias, company_id) DO UPDATE SET department_id = :departmentId
        `, {
            replacements: { alias: alias.toLowerCase(), departmentId, companyId },
            type: QueryTypes.INSERT
        });
    }

    /**
     * Obtener todos los destinatarios configurados para una empresa
     * Útil para panel de administración
     */
    static async getAllConfigured(companyId) {
        const results = await sequelize.query(`
            SELECT
                d.id as department_id,
                d.name as department_name,
                d.notification_recipients,
                d.manager_user_id,
                u."firstName" || ' ' || u."lastName" as manager_name,
                COALESCE(
                    (SELECT array_agg(da.alias) FROM department_aliases da WHERE da.department_id = d.id),
                    ARRAY[]::varchar[]
                ) as aliases
            FROM departments d
            LEFT JOIN users u ON d.manager_user_id = u.user_id
            WHERE d.company_id = :companyId AND d.is_active = true
            ORDER BY d.name
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        return results.map(r => ({
            departmentId: r.department_id,
            departmentName: r.department_name,
            recipients: r.notification_recipients || [],
            managerId: r.manager_user_id,
            managerName: r.manager_name,
            aliases: r.aliases || []
        }));
    }

    // ========================================================================
    // MÉTODOS PRIVADOS
    // ========================================================================

    static async _findDepartment(companyId, normalizedIdentifier) {
        // Primero buscar por alias
        const byAlias = await sequelize.query(`
            SELECT d.id, d.name, d.notification_recipients, d.manager_user_id
            FROM departments d
            JOIN department_aliases da ON da.department_id = d.id
            WHERE da.company_id = :companyId
              AND LOWER(da.alias) = :identifier
              AND d.is_active = true
            LIMIT 1
        `, {
            replacements: { companyId, identifier: normalizedIdentifier },
            type: QueryTypes.SELECT
        });

        if (byAlias.length > 0) return byAlias[0];

        // Buscar por nombre directo
        const byName = await sequelize.query(`
            SELECT id, name, notification_recipients, manager_user_id
            FROM departments
            WHERE company_id = :companyId
              AND LOWER(name) = :identifier
              AND is_active = true
            LIMIT 1
        `, {
            replacements: { companyId, identifier: normalizedIdentifier },
            type: QueryTypes.SELECT
        });

        if (byName.length > 0) return byName[0];

        // Buscar por nombre parcial (LIKE)
        const byPartialName = await sequelize.query(`
            SELECT id, name, notification_recipients, manager_user_id
            FROM departments
            WHERE company_id = :companyId
              AND LOWER(name) LIKE :pattern
              AND is_active = true
            ORDER BY LENGTH(name)
            LIMIT 1
        `, {
            replacements: { companyId, pattern: `%${normalizedIdentifier}%` },
            type: QueryTypes.SELECT
        });

        return byPartialName.length > 0 ? byPartialName[0] : null;
    }

    static async _getConfiguredRecipients(department, maxRecipients) {
        const recipients = department.notification_recipients;

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return [];
        }

        return recipients.slice(0, maxRecipients).map(r => ({
            userId: r.user_id,
            role: r.role || 'member'
        }));
    }

    static async _enrichWithUserDetails(recipients) {
        if (recipients.length === 0) return [];

        const userIds = recipients.map(r => r.userId);

        const users = await sequelize.query(`
            SELECT user_id, "firstName", "lastName", email
            FROM users
            WHERE user_id = ANY(:userIds::uuid[])
              AND is_active = true
        `, {
            replacements: { userIds },
            type: QueryTypes.SELECT
        });

        const userMap = new Map(users.map(u => [u.user_id, u]));

        return recipients.map(r => {
            const user = userMap.get(r.userId);
            return {
                userId: r.userId,
                role: r.role,
                name: user ? `${user.firstName} ${user.lastName}` : null,
                email: user?.email || null
            };
        }).filter(r => r.name !== null); // Solo incluir usuarios que existen
    }

    static async _getFallbackAdmins(companyId, maxRecipients, includeUserDetails) {
        const admins = await sequelize.query(`
            SELECT user_id, "firstName", "lastName", email, role
            FROM users
            WHERE company_id = :companyId
              AND role IN ('admin', 'manager')
              AND is_active = true
            ORDER BY
                CASE role WHEN 'admin' THEN 1 ELSE 2 END,
                created_at ASC
            LIMIT :maxRecipients
        `, {
            replacements: { companyId, maxRecipients },
            type: QueryTypes.SELECT
        });

        return admins.map(a => ({
            userId: a.user_id,
            role: 'admin_fallback',
            name: includeUserDetails ? `${a.firstName} ${a.lastName}` : null,
            email: includeUserDetails ? a.email : null
        }));
    }
}

module.exports = NotificationRecipientResolver;
