/**
 * ============================================================================
 * COMPANY EMAIL PROCESS SERVICE
 * ============================================================================
 *
 * Servicio para asignar emails de empresa a procesos de notificación.
 *
 * LÓGICA ESPECIAL:
 * - Primer email configurado → auto-asignar a TODOS los procesos (scope=company)
 * - Emails siguientes → asignación manual por admin empresa
 *
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class CompanyEmailProcessService {

    /**
     * Asignar un email a un proceso específico
     */
    async assignEmailToProcess(companyId, emailConfigId, processKey, userId = null) {
        try {
            // 1. Verificar que el email pertenece a la empresa
            const [emailConfig] = await sequelize.query(`
                SELECT id, smtp_from_email, smtp_from_name
                FROM company_email_config
                WHERE id = :emailConfigId AND company_id = :companyId
            `, {
                replacements: { emailConfigId, companyId },
                type: QueryTypes.SELECT
            });

            if (!emailConfig) {
                throw new Error('Email config no encontrado o no pertenece a esta empresa');
            }

            // 2. Obtener info del proceso
            const [process] = await sequelize.query(`
                SELECT process_key, process_name, module
                FROM notification_workflows
                WHERE process_key = :processKey AND scope = 'company'
            `, {
                replacements: { processKey },
                type: QueryTypes.SELECT
            });

            if (!process) {
                throw new Error('Proceso no encontrado o no es company-scoped');
            }

            // 3. Insertar o actualizar mapeo
            await sequelize.query(`
                INSERT INTO company_email_process_mapping
                    (company_id, email_config_id, process_key, process_name, module, assigned_by)
                VALUES
                    (:companyId, :emailConfigId, :processKey, :processName, :module, :userId)
                ON CONFLICT (company_id, process_key)
                DO UPDATE SET
                    email_config_id = EXCLUDED.email_config_id,
                    assigned_by = EXCLUDED.assigned_by,
                    updated_at = CURRENT_TIMESTAMP
            `, {
                replacements: {
                    companyId,
                    emailConfigId,
                    processKey,
                    processName: process.process_name,
                    module: process.module,
                    userId
                },
                type: QueryTypes.INSERT
            });

            return {
                success: true,
                message: `Proceso "${process.process_name}" asignado a "${emailConfig.smtp_from_name}"`
            };

        } catch (error) {
            console.error('[CompanyEmailProcess] Error asignando:', error);
            throw error;
        }
    }

    /**
     * Auto-asignar TODOS los procesos company al primer email configurado
     * (se ejecuta automáticamente al crear el primer email)
     */
    async autoAssignAllProcessesToFirstEmail(companyId, emailConfigId, userId = null) {
        try {
            console.log(`[CompanyEmailProcess] Auto-asignando TODOS los procesos company a primer email de empresa ${companyId}...`);

            // 1. Obtener todos los procesos company-scoped
            const processes = await sequelize.query(`
                SELECT process_key, process_name, module
                FROM notification_workflows
                WHERE scope = 'company' AND is_active = TRUE
                ORDER BY module, process_name
            `, { type: QueryTypes.SELECT });

            console.log(`[CompanyEmailProcess] Encontrados ${processes.length} procesos company para auto-asignar`);

            // 2. Insertar todos los mapeos en batch
            if (processes.length > 0) {
                const values = processes.map(p => `(${companyId}, '${emailConfigId}', '${p.process_key}', '${p.process_name.replace(/'/g, "''")}', '${p.module}', ${userId ? `'${userId}'` : 'NULL'})`).join(',\n');

                await sequelize.query(`
                    INSERT INTO company_email_process_mapping
                        (company_id, email_config_id, process_key, process_name, module, assigned_by)
                    VALUES
                        ${values}
                    ON CONFLICT (company_id, process_key) DO NOTHING
                `);
            }

            console.log(`[CompanyEmailProcess] ✅ ${processes.length} procesos auto-asignados`);

            return {
                success: true,
                totalAssigned: processes.length,
                message: `${processes.length} procesos auto-asignados al primer email`
            };

        } catch (error) {
            console.error('[CompanyEmailProcess] Error en auto-asignación:', error);
            throw error;
        }
    }

    /**
     * Verificar si es el primer email de la empresa
     */
    async isFirstEmail(companyId) {
        const [result] = await sequelize.query(`
            SELECT COUNT(*) as total
            FROM company_email_config
            WHERE company_id = :companyId AND is_active = TRUE
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        return result.total === 1; // Es el primero si solo hay 1
    }

    /**
     * Obtener mapeos de una empresa
     */
    async getCompanyMappings(companyId) {
        const mappings = await sequelize.query(`
            SELECT
                cepm.id,
                cepm.process_key,
                cepm.process_name,
                cepm.module,
                cepm.email_config_id,
                cec.smtp_from_email,
                cec.smtp_from_name,
                cepm.assigned_at,
                cepm.is_active
            FROM company_email_process_mapping cepm
            INNER JOIN company_email_config cec ON cepm.email_config_id = cec.id
            WHERE cepm.company_id = :companyId AND cepm.is_active = TRUE
            ORDER BY cepm.module, cepm.process_name
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        return mappings;
    }

    /**
     * Obtener procesos SIN asignar de una empresa
     */
    async getUnassignedProcesses(companyId) {
        const unassigned = await sequelize.query(`
            SELECT
                nw.process_key,
                nw.process_name,
                nw.module,
                nw.description,
                nw.priority
            FROM notification_workflows nw
            WHERE nw.scope = 'company'
              AND nw.is_active = TRUE
              AND NOT EXISTS (
                  SELECT 1
                  FROM company_email_process_mapping cepm
                  WHERE cepm.company_id = :companyId
                    AND cepm.process_key = nw.process_key
                    AND cepm.is_active = TRUE
              )
            ORDER BY nw.module, nw.process_name
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        return unassigned;
    }

    /**
     * Des-asignar un proceso (marcar como inactivo)
     */
    async unassignProcess(companyId, processKey) {
        await sequelize.query(`
            UPDATE company_email_process_mapping
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :companyId AND process_key = :processKey
        `, {
            replacements: { companyId, processKey },
            type: QueryTypes.UPDATE
        });

        return { success: true, message: 'Proceso des-asignado' };
    }

    /**
     * Obtener estadísticas de asignación de una empresa
     */
    async getAssignmentStats(companyId) {
        const [stats] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM notification_workflows WHERE scope = 'company' AND is_active = TRUE) as total_processes,
                (SELECT COUNT(*) FROM company_email_process_mapping WHERE company_id = :companyId AND is_active = TRUE) as assigned,
                (SELECT COUNT(*) FROM notification_workflows nw
                 WHERE nw.scope = 'company' AND nw.is_active = TRUE
                   AND NOT EXISTS (
                       SELECT 1 FROM company_email_process_mapping cepm
                       WHERE cepm.company_id = :companyId
                         AND cepm.process_key = nw.process_key
                         AND cepm.is_active = TRUE
                   )) as unassigned
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        return stats;
    }
}

module.exports = new CompanyEmailProcessService();
