/**
 * ============================================================================
 * INTEGRACIÓN: Procedures → Training
 * ============================================================================
 *
 * CIRCUITO DE INTEGRACIÓN:
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │                    PROCEDURES → TRAINING                              │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │                                                                       │
 *  │  ┌─────────────────────────────────────────────────────────────────┐ │
 *  │  │                   NUEVO PROCEDIMIENTO                           │ │
 *  │  ├─────────────────────────────────────────────────────────────────┤ │
 *  │  │                                                                  │ │
 *  │  │  PROCEDIMIENTO        PUBLICACIÓN         CAPACITACIÓN          │ │
 *  │  │  CREADO         ──▶   APROBADA      ──▶   OBLIGATORIA           │ │
 *  │  │     │                    │                    │                  │ │
 *  │  │     ▼                    ▼                    ▼                  │ │
 *  │  │  • SOP nuevo        • Estado =          • Auto-asignar          │ │
 *  │  │  • Instructivo        "published"        a afectados            │ │
 *  │  │  • Política         • requires_         • Deadline según        │ │
 *  │  │  • Manual             training=true       criticidad            │ │
 *  │  │                                                                  │ │
 *  │  └─────────────────────────────────────────────────────────────────┘ │
 *  │                                                                       │
 *  │  ┌─────────────────────────────────────────────────────────────────┐ │
 *  │  │                ACTUALIZACIÓN DE PROCEDIMIENTO                   │ │
 *  │  ├─────────────────────────────────────────────────────────────────┤ │
 *  │  │                                                                  │ │
 *  │  │  PROCEDIMIENTO        CAMBIOS            RE-CAPACITACIÓN        │ │
 *  │  │  ACTUALIZADO    ──▶   CRÍTICOS?    ──▶   AUTOMÁTICA             │ │
 *  │  │     │                    │                    │                  │ │
 *  │  │     ▼                    ▼                    ▼                  │ │
 *  │  │  • Nueva versión    • Cambio en         • Notificar a           │ │
 *  │  │  • Cambios en         pasos críticos      quienes ya            │ │
 *  │  │    pasos            • Cambio en           completaron           │ │
 *  │  │  • Nuevos EPP         EPP requerido     • Nueva inscripción     │ │
 *  │  │                                                                  │ │
 *  │  └─────────────────────────────────────────────────────────────────┘ │
 *  │                                                                       │
 *  │  ┌─────────────────────────────────────────────────────────────────┐ │
 *  │  │                   AUDITORÍA → CAPACITACIÓN                      │ │
 *  │  ├─────────────────────────────────────────────────────────────────┤ │
 *  │  │                                                                  │ │
 *  │  │  AUDITORÍA           HALLAZGO           CAPACITACIÓN            │ │
 *  │  │  REALIZADA     ──▶   NO-CONFORMIDAD ──▶ CORRECTIVA              │ │
 *  │  │     │                    │                    │                  │ │
 *  │  │     ▼                    ▼                    ▼                  │ │
 *  │  │  • Checklist        • Empleado no       • Asignar training      │ │
 *  │  │    completado         conoce               específico           │ │
 *  │  │  • Evidencia          procedimiento     • Priority: HIGH        │ │
 *  │  │    recopilada                                                    │ │
 *  │  │                                                                  │ │
 *  │  └─────────────────────────────────────────────────────────────────┘ │
 *  │                                                                       │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 * @version 1.0.0
 * @date 2026-02-01
 */

const TrainingEcosystemHub = require('./TrainingEcosystemHub');
const { sequelize } = require('../../config/database');

class ProceduresTrainingIntegration {

    /**
     * Hook: Cuando un procedimiento es publicado
     * Llamar desde: proceduresRoutes.js al cambiar status a 'published'
     */
    static async onProcedurePublished(procedure, publishedBy) {
        console.log(`📋 [PROCEDURES→TRAINING] Procedimiento publicado: ${procedure.name}`);

        // Verificar si requiere capacitación
        if (!procedure.requires_training) {
            return { success: true, message: 'Procedimiento no requiere capacitación' };
        }

        // Obtener usuarios afectados
        const affectedUsers = await this.getAffectedUsers(procedure);

        if (affectedUsers.length === 0) {
            return { success: true, message: 'No hay usuarios afectados' };
        }

        console.log(`👥 [PROCEDURES→TRAINING] ${affectedUsers.length} usuarios afectados`);

        const results = [];

        for (const userId of affectedUsers) {
            const result = await TrainingEcosystemHub.assignFromExternalModule({
                userId,
                companyId: procedure.company_id,
                sourceModule: 'procedures',
                sourceEntityType: 'procedure',
                sourceEntityId: procedure.id,
                trainingId: procedure.linked_training_id,
                keywords: [procedure.name.toLowerCase(), procedure.category],
                priority: procedure.criticality === 'critical' ? 'critical' : 'high',
                mandatory: true,
                deadline: procedure.mandatory_completion_date,
                reason: `Nuevo procedimiento: ${procedure.name} v${procedure.version}`,
                assignedBy: publishedBy
            });

            results.push({ userId, ...result });
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ [PROCEDURES→TRAINING] ${successCount}/${affectedUsers.length} asignaciones`);

        return {
            success: successCount > 0,
            totalAffected: affectedUsers.length,
            trainingsAssigned: successCount,
            results
        };
    }

    /**
     * Hook: Cuando un procedimiento es actualizado
     * Llamar desde: proceduresRoutes.js al actualizar versión
     */
    static async onProcedureUpdated(procedure, changes, updatedBy) {
        console.log(`📝 [PROCEDURES→TRAINING] Procedimiento actualizado: ${procedure.name}`);

        // Verificar si los cambios son críticos
        const criticalChanges = this.identifyCriticalChanges(changes);

        if (criticalChanges.length === 0) {
            return { success: true, message: 'Cambios no requieren re-capacitación' };
        }

        console.log(`⚠️ [PROCEDURES→TRAINING] Cambios críticos detectados: ${criticalChanges.join(', ')}`);

        // Obtener usuarios que ya completaron la capacitación anterior
        const previouslyTrained = await this.getPreviouslyTrainedUsers(procedure);

        if (previouslyTrained.length === 0) {
            return { success: true, message: 'No hay usuarios para re-capacitar' };
        }

        console.log(`🔄 [PROCEDURES→TRAINING] ${previouslyTrained.length} usuarios a re-capacitar`);

        const results = [];

        for (const userId of previouslyTrained) {
            const result = await TrainingEcosystemHub.assignFromExternalModule({
                userId,
                companyId: procedure.company_id,
                sourceModule: 'procedures',
                sourceEntityType: 'procedure_update',
                sourceEntityId: procedure.id,
                trainingId: procedure.linked_training_id,
                keywords: [procedure.name.toLowerCase(), 'actualización'],
                priority: 'high',
                mandatory: true,
                reason: `Actualización de procedimiento: ${procedure.name} v${procedure.version} - Cambios: ${criticalChanges.join(', ')}`,
                assignedBy: updatedBy
            });

            results.push({ userId, ...result });
        }

        const successCount = results.filter(r => r.success).length;

        return {
            success: successCount > 0,
            criticalChanges,
            totalToRetrain: previouslyTrained.length,
            retrainedCount: successCount,
            results
        };
    }

    /**
     * Hook: Cuando una auditoría detecta no-conformidad
     */
    static async onAuditNonConformance(audit, employeeId, procedureId, companyId) {
        console.log(`🔍 [PROCEDURES→TRAINING] No-conformidad en auditoría: ${audit.id}`);

        // Obtener procedimiento
        const [procedure] = await sequelize.query(`
            SELECT id, name, linked_training_id
            FROM procedures
            WHERE id = $1 AND company_id = $2
        `, { bind: [procedureId, companyId], type: sequelize.QueryTypes.SELECT });

        if (!procedure) {
            return { success: false, error: 'Procedimiento no encontrado' };
        }

        return TrainingEcosystemHub.assignFromExternalModule({
            userId: employeeId,
            companyId,
            sourceModule: 'procedures',
            sourceEntityType: 'procedure_audit',
            sourceEntityId: audit.id,
            trainingId: procedure.linked_training_id,
            keywords: [procedure.name.toLowerCase()],
            priority: 'high',
            mandatory: true,
            reason: `No-conformidad en auditoría: ${audit.finding_description || 'Sin descripción'}`
        });
    }

    /**
     * Obtiene usuarios afectados por un procedimiento
     */
    static async getAffectedUsers(procedure) {
        try {
            // Los procedimientos pueden afectar por:
            // 1. Departamento
            // 2. Posición/Rol
            // 3. Toda la empresa

            let query = '';
            const bind = [procedure.company_id];

            if (procedure.applies_to_all) {
                // Toda la empresa
                query = `
                    SELECT user_id FROM users
                    WHERE company_id = $1 AND "isActive" = true
                `;
            } else if (procedure.department_ids && procedure.department_ids.length > 0) {
                // Departamentos específicos
                query = `
                    SELECT user_id FROM users
                    WHERE company_id = $1 AND "isActive" = true
                      AND department_id = ANY($2::int[])
                `;
                bind.push(procedure.department_ids);
            } else if (procedure.position_ids && procedure.position_ids.length > 0) {
                // Posiciones específicas
                query = `
                    SELECT user_id FROM users
                    WHERE company_id = $1 AND "isActive" = true
                      AND position = ANY($2::text[])
                `;
                bind.push(procedure.position_ids);
            } else {
                // Sin alcance definido, asumir toda la empresa
                query = `
                    SELECT user_id FROM users
                    WHERE company_id = $1 AND "isActive" = true
                `;
            }

            const users = await sequelize.query(query, {
                bind,
                type: sequelize.QueryTypes.SELECT
            });

            return users.map(u => u.user_id);

        } catch (error) {
            console.error('❌ [PROCEDURES→TRAINING] Error obteniendo usuarios:', error);
            return [];
        }
    }

    /**
     * Obtiene usuarios que ya completaron la capacitación de un procedimiento
     */
    static async getPreviouslyTrainedUsers(procedure) {
        try {
            const users = await sequelize.query(`
                SELECT DISTINCT ta.user_id
                FROM training_assignments ta
                WHERE ta.company_id = $1
                  AND ta.source_module = 'procedures'
                  AND ta.source_entity_id = $2
                  AND ta.status = 'completed'
            `, {
                bind: [procedure.company_id, procedure.id],
                type: sequelize.QueryTypes.SELECT
            });

            return users.map(u => u.user_id);

        } catch (error) {
            console.error('❌ [PROCEDURES→TRAINING] Error obteniendo previamente capacitados:', error);
            return [];
        }
    }

    /**
     * Identifica cambios críticos que requieren re-capacitación
     */
    static identifyCriticalChanges(changes) {
        const criticalFields = [
            'steps',           // Cambio en pasos del procedimiento
            'critical_steps',  // Cambio en pasos críticos
            'epp_required',    // Cambio en EPP requerido
            'safety_measures', // Cambio en medidas de seguridad
            'warnings',        // Cambio en advertencias
            'prerequisites',   // Cambio en prerequisitos
            'permissions'      // Cambio en permisos requeridos
        ];

        const detected = [];

        for (const field of criticalFields) {
            if (changes[field]) {
                detected.push(field);
            }
        }

        return detected;
    }

    /**
     * Verifica si un empleado leyó y aprobó el procedimiento
     */
    static async verifyProcedureCompliance(userId, procedureId, companyId) {
        try {
            // Buscar si tiene capacitación completada para este procedimiento
            const [assignment] = await sequelize.query(`
                SELECT ta.id, ta.status, ta.completed_at, ta.score
                FROM training_assignments ta
                WHERE ta.user_id = $1
                  AND ta.company_id = $2
                  AND ta.source_module = 'procedures'
                  AND ta.source_entity_id = $3
                ORDER BY ta.completed_at DESC NULLS LAST
                LIMIT 1
            `, {
                bind: [userId, companyId, procedureId],
                type: sequelize.QueryTypes.SELECT
            });

            if (!assignment) {
                return { compliant: false, reason: 'No tiene capacitación asignada' };
            }

            if (assignment.status !== 'completed') {
                return {
                    compliant: false,
                    reason: `Capacitación en estado: ${assignment.status}`,
                    assignmentId: assignment.id
                };
            }

            return {
                compliant: true,
                completedAt: assignment.completed_at,
                score: assignment.score,
                assignmentId: assignment.id
            };

        } catch (error) {
            console.error('❌ [PROCEDURES→TRAINING] Error verificando compliance:', error);
            return { compliant: false, error: error.message };
        }
    }

    /**
     * Obtiene estadísticas de cumplimiento de procedimientos
     */
    static async getProcedureComplianceStats(companyId, procedureId = null) {
        try {
            let whereClause = 'WHERE ta.company_id = $1 AND ta.source_module = $2';
            const bind = [companyId, 'procedures'];

            if (procedureId) {
                whereClause += ' AND ta.source_entity_id = $3';
                bind.push(procedureId);
            }

            const stats = await sequelize.query(`
                SELECT
                    COUNT(DISTINCT ta.user_id) as total_assigned,
                    COUNT(DISTINCT ta.user_id) FILTER (WHERE ta.status = 'completed') as completed,
                    COUNT(DISTINCT ta.user_id) FILTER (WHERE ta.status = 'in_progress') as in_progress,
                    COUNT(DISTINCT ta.user_id) FILTER (WHERE ta.status = 'assigned') as not_started,
                    ROUND(
                        COUNT(DISTINCT ta.user_id) FILTER (WHERE ta.status = 'completed')::numeric /
                        NULLIF(COUNT(DISTINCT ta.user_id), 0) * 100, 2
                    ) as compliance_rate
                FROM training_assignments ta
                ${whereClause}
            `, { bind, type: sequelize.QueryTypes.SELECT });

            return stats[0] || {};

        } catch (error) {
            console.error('❌ [PROCEDURES→TRAINING] Error obteniendo stats:', error);
            return {};
        }
    }
}

module.exports = ProceduresTrainingIntegration;
