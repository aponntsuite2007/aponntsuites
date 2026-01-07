/**
 * ============================================================================
 * NOTIFICATION RECIPIENT RESOLVER v2.0
 * ============================================================================
 *
 * Resuelve destinatarios de forma dinámica e inteligente
 *
 * TIPOS DE DESTINATARIOS SOPORTADOS:
 * - 'user' - Usuario específico por ID
 * - 'role' - Todos los usuarios con un rol (admin, manager, etc.)
 * - 'hierarchy' - Resolución jerárquica (supervisor → manager → RRHH → admin)
 * - 'group' - Grupo/departamento/shift
 * - 'department' - Departamento específico
 * - 'shift' - Turno específico
 * - 'dynamic' - Resolución basada en reglas custom
 *
 * EJEMPLOS:
 * ```javascript
 * // Usuario específico
 * await resolver.resolve({ recipientType: 'user', recipientId: 'uuid-123', companyId: 11 })
 * // → [{ user_id: 'uuid-123', email: 'user@example.com', ... }]
 *
 * // Por rol
 * await resolver.resolve({ recipientType: 'role', recipientId: 'manager', companyId: 11 })
 * // → [{ user_id: 'uuid-456', ... }, { user_id: 'uuid-789', ... }]
 *
 * // Jerarquía organizacional
 * await resolver.resolve({ recipientType: 'hierarchy', recipientId: 'employee-uuid', companyId: 11 })
 * // → [{ user_id: 'supervisor-uuid', ... }] // Supervisor directo
 *
 * // Departamento completo
 * await resolver.resolve({ recipientType: 'group', recipientId: 'department:5', companyId: 11 })
 * // → [{ user_id: 'user1', ... }, { user_id: 'user2', ... }]
 * ```
 *
 * INTEGRACIÓN CON:
 * - organizational_hierarchy (jerarquía dinámica)
 * - users table (roles, departamentos, shifts)
 * - OrganizationalHierarchyService (escalamiento)
 * - department_aliases (aliases de departamentos)
 *
 * BACKWARD COMPATIBILITY:
 * - Método estático resolve(companyId, departmentIdentifier) se mantiene
 * - Nuevos métodos de instancia para NCE
 *
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Aliases comunes para departamentos de RRHH
const RRHH_ALIASES = ['rrhh', 'hr', 'recursos humanos', 'human resources', 'personal', 'talento humano'];
const LEGAL_ALIASES = ['legal', 'legales', 'juridico', 'jurídico'];

class NotificationRecipientResolver {

    constructor() {
        console.log('[RecipientResolver] Inicializado (v2.0)');
    }

    // ========================================================================
    // MÉTODO PRINCIPAL - RESOLUCIÓN DINÁMICA (para NCE)
    // ========================================================================

    /**
     * RESOLVER DESTINATARIOS - Método principal
     *
     * @param {Object} params - Parámetros de resolución
     * @param {string} params.recipientType - Tipo: user, role, hierarchy, group, dynamic
     * @param {string} params.recipientId - ID del destinatario (depende del tipo)
     * @param {number} params.companyId - ID de la empresa (multi-tenant)
     * @param {string} [params.module] - Módulo (opcional, para reglas custom)
     * @param {Object} [params.context] - Contexto adicional para resolución dinámica
     * @returns {Promise<Array>} Lista de usuarios destinatarios
     */
    async resolve(params) {
        const { recipientType, recipientId, companyId, module, context } = params;

        console.log(`[RecipientResolver] Resolviendo: ${recipientType}:${recipientId} (company: ${companyId})`);

        try {
            let recipients = [];

            switch (recipientType) {
                case 'user':
                    recipients = await this._resolveUser(recipientId, companyId);
                    break;

                case 'role':
                    recipients = await this._resolveRole(recipientId, companyId);
                    break;

                case 'hierarchy':
                    recipients = await this._resolveHierarchy(recipientId, companyId, context);
                    break;

                case 'group':
                    recipients = await this._resolveGroup(recipientId, companyId);
                    break;

                case 'department':
                    recipients = await this._resolveDepartment(recipientId, companyId);
                    break;

                case 'shift':
                    recipients = await this._resolveShift(recipientId, companyId);
                    break;

                case 'dynamic':
                    recipients = await this._resolveDynamic(recipientId, companyId, module, context);
                    break;

                default:
                    throw new Error(`Tipo de destinatario no soportado: ${recipientType}`);
            }

            // Validar que hay destinatarios
            if (!recipients || recipients.length === 0) {
                console.warn(`[RecipientResolver] No se encontraron destinatarios para ${recipientType}:${recipientId}`);
                throw new Error(`No se encontraron destinatarios para ${recipientType}:${recipientId}`);
            }

            // Filtrar usuarios inactivos
            recipients = recipients.filter(r => r.account_status === 'active' || r.status === 'active');

            console.log(`[RecipientResolver] Resueltos ${recipients.length} destinatario(s)`);

            return recipients;

        } catch (error) {
            console.error(`[RecipientResolver] Error:`, error.message);
            throw error;
        }
    }

    // ========================================================================
    // RESOLVERS POR TIPO (métodos de instancia)
    // ========================================================================

    /**
     * Resolver usuario específico por ID
     */
    async _resolveUser(userId, companyId) {
        const query = `
            SELECT
                user_id,
                "employeeId",
                email,
                "firstName",
                "lastName",
                ("firstName" || ' ' || "lastName") as full_name,
                role,
                department_id,
                phone,
                account_status,
                email_verified
            FROM users
            WHERE user_id = :userId
              AND company_id = :companyId
              AND account_status = 'active'
            LIMIT 1
        `;

        const users = await sequelize.query(query, {
            replacements: { userId, companyId },
            type: QueryTypes.SELECT
        });

        return users;
    }

    /**
     * Resolver todos los usuarios con un rol específico
     */
    async _resolveRole(roleName, companyId) {
        const query = `
            SELECT
                user_id,
                "employeeId",
                email,
                "firstName",
                "lastName",
                ("firstName" || ' ' || "lastName") as full_name,
                role,
                department_id,
                phone,
                account_status,
                email_verified
            FROM users
            WHERE role = :roleName
              AND company_id = :companyId
              AND account_status = 'active'
            ORDER BY "firstName", "lastName"
        `;

        const users = await sequelize.query(query, {
            replacements: { roleName, companyId },
            type: QueryTypes.SELECT
        });

        return users;
    }

    /**
     * Resolver jerarquía organizacional (supervisor → manager → RRHH → admin)
     */
    async _resolveHierarchy(employeeId, companyId, context) {
        console.log(`[RecipientResolver] Resolviendo jerarquía para employee: ${employeeId}`);

        // Estrategia:
        // 1. Buscar supervisor directo en organizational_hierarchy
        // 2. Si no hay, buscar manager del departamento
        // 3. Si no hay, buscar RRHH
        // 4. Si no hay, buscar admin

        // PASO 1: Buscar supervisor directo
        let supervisor = await this._getSupervisor(employeeId, companyId);
        if (supervisor) {
            console.log(`[RecipientResolver] Supervisor encontrado: ${supervisor.full_name}`);
            return [supervisor];
        }

        // PASO 2: Buscar manager del departamento
        const employee = await this._resolveUser(employeeId, companyId);
        if (employee[0] && employee[0].department_id) {
            const manager = await this._getDepartmentManager(employee[0].department_id, companyId);
            if (manager) {
                console.log(`[RecipientResolver] Manager de departamento encontrado: ${manager.full_name}`);
                return [manager];
            }
        }

        // PASO 3: Buscar RRHH
        const rrhh = await this._resolveRole('rrhh', companyId);
        if (rrhh.length > 0) {
            console.log(`[RecipientResolver] RRHH encontrado: ${rrhh.length} usuario(s)`);
            return rrhh;
        }

        // PASO 4: Buscar admin como último recurso
        const admins = await this._resolveRole('admin', companyId);
        console.log(`[RecipientResolver] Admin como fallback: ${admins.length} usuario(s)`);
        return admins;
    }

    /**
     * Obtener supervisor directo de organizational_hierarchy
     */
    async _getSupervisor(employeeId, companyId) {
        const query = `
            SELECT
                u.user_id,
                u."employeeId",
                u.email,
                u."firstName",
                u."lastName",
                (u."firstName" || ' ' || u."lastName") as full_name,
                u.role,
                u.phone,
                u.account_status
            FROM organizational_hierarchy oh
            INNER JOIN users u ON oh.supervisor_id = u.user_id
            WHERE oh.employee_id = :employeeId
              AND oh.company_id = :companyId
              AND oh.is_active = TRUE
              AND u.account_status = 'active'
            LIMIT 1
        `;

        const [supervisor] = await sequelize.query(query, {
            replacements: { employeeId, companyId },
            type: QueryTypes.SELECT
        });

        return supervisor;
    }

    /**
     * Obtener manager de departamento
     */
    async _getDepartmentManager(departmentId, companyId) {
        const query = `
            SELECT
                u.user_id,
                u."employeeId",
                u.email,
                u."firstName",
                u."lastName",
                (u."firstName" || ' ' || u."lastName") as full_name,
                u.role,
                u.phone,
                u.account_status
            FROM users u
            WHERE u.department_id = :departmentId
              AND u.company_id = :companyId
              AND u.role IN ('manager', 'supervisor', 'admin')
              AND u.account_status = 'active'
            ORDER BY
                CASE u.role
                    WHEN 'manager' THEN 1
                    WHEN 'supervisor' THEN 2
                    WHEN 'admin' THEN 3
                    ELSE 4
                END
            LIMIT 1
        `;

        const [manager] = await sequelize.query(query, {
            replacements: { departmentId, companyId },
            type: QueryTypes.SELECT
        });

        return manager;
    }

    /**
     * Resolver grupo (departamento, shift, o custom)
     */
    async _resolveGroup(groupId, companyId) {
        // Formato: "department:5" o "shift:3" o custom ID
        const [groupType, id] = groupId.split(':');

        if (groupType === 'department') {
            return this._resolveDepartment(id, companyId);
        } else if (groupType === 'shift') {
            return this._resolveShift(id, companyId);
        } else {
            throw new Error(`Tipo de grupo no soportado: ${groupType}`);
        }
    }

    /**
     * Resolver todos los usuarios de un departamento
     */
    async _resolveDepartment(departmentId, companyId) {
        const query = `
            SELECT
                user_id,
                "employeeId",
                email,
                "firstName",
                "lastName",
                ("firstName" || ' ' || "lastName") as full_name,
                role,
                department_id,
                phone,
                account_status,
                email_verified
            FROM users
            WHERE department_id = :departmentId
              AND company_id = :companyId
              AND account_status = 'active'
            ORDER BY "firstName", "lastName"
        `;

        const users = await sequelize.query(query, {
            replacements: { departmentId, companyId },
            type: QueryTypes.SELECT
        });

        return users;
    }

    /**
     * Resolver todos los usuarios de un shift
     */
    async _resolveShift(shiftId, companyId) {
        const query = `
            SELECT
                user_id,
                "employeeId",
                email,
                "firstName",
                "lastName",
                ("firstName" || ' ' || "lastName") as full_name,
                role,
                department_id,
                phone,
                account_status,
                email_verified
            FROM users
            WHERE shift_id = :shiftId
              AND company_id = :companyId
              AND account_status = 'active'
            ORDER BY "firstName", "lastName"
        `;

        const users = await sequelize.query(query, {
            replacements: { shiftId, companyId },
            type: QueryTypes.SELECT
        });

        return users;
    }

    /**
     * Resolver dinámicamente basado en reglas custom
     */
    async _resolveDynamic(ruleKey, companyId, module, context) {
        console.log(`[RecipientResolver] Resolución dinámica: ${ruleKey}`);

        // TODO: Implementar lógica de reglas dinámicas
        // Por ejemplo: "approver_for_amount_over_10000" → Buscar aprobador nivel 2
        // Por ahora, stub que busca admin

        return this._resolveRole('admin', companyId);
    }

    // ========================================================================
    // MÉTODOS ESTÁTICOS - BACKWARD COMPATIBILITY (Legacy API)
    // ========================================================================

    /**
     * Resolver destinatarios para un departamento (LEGACY)
     * @deprecated Usar instance method resolve() en su lugar
     */
    static async resolve(companyId, departmentIdentifier, options = {}) {
        console.warn('[RecipientResolver] DEPRECATED: Usar instance method resolve() en su lugar');

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
     * Resolver destinatarios para RRHH específicamente (LEGACY)
     */
    static async resolveRRHH(companyId, options = {}) {
        return this.resolve(companyId, 'RRHH', options);
    }

    /**
     * Configurar destinatarios para un departamento (LEGACY)
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
     * Agregar alias para un departamento (LEGACY)
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
     * Obtener todos los destinatarios configurados para una empresa (LEGACY)
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
    // MÉTODOS PRIVADOS ESTÁTICOS (para Legacy API)
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
