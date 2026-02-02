/**
 * ============================================================================
 * INTEGRACIÓN: ART → Training
 * ============================================================================
 *
 * CIRCUITO DE INTEGRACIÓN:
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │                        ART → TRAINING                                 │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │                                                                       │
 *  │  ┌─────────────────────────────────────────────────────────────────┐ │
 *  │  │                     FLUJO POST-ACCIDENTE                        │ │
 *  │  ├─────────────────────────────────────────────────────────────────┤ │
 *  │  │                                                                  │ │
 *  │  │  ACCIDENTE          DENUNCIA           CIERRE           ALTA    │ │
 *  │  │  OCURRE      ──▶    ART        ──▶    MÉDICA    ──▶    LABORAL  │ │
 *  │  │     │                 │                  │                │     │ │
 *  │  │     ▼                 ▼                  ▼                ▼     │ │
 *  │  │  Registro         Adjuntar           Capacitación      Seguim.  │ │
 *  │  │  inicial          historial          REINSERCIÓN       final    │ │
 *  │  │                   trainings                                     │ │
 *  │  └─────────────────────────────────────────────────────────────────┘ │
 *  │                                                                       │
 *  │  ┌─────────────────────────────────────────────────────────────────┐ │
 *  │  │                   CAPACITACIÓN PREVENTIVA                       │ │
 *  │  ├─────────────────────────────────────────────────────────────────┤ │
 *  │  │                                                                  │ │
 *  │  │  ACCIDENTE          ANÁLISIS          CAPACITACIÓN              │ │
 *  │  │  REGISTRADO   ──▶   DE CAUSA    ──▶   A TODA EL ÁREA            │ │
 *  │  │     │                  │                   │                     │ │
 *  │  │     ▼                  ▼                   ▼                     │ │
 *  │  │  Tipo de           Falta de            Todos los                │ │
 *  │  │  accidente         capacitación?       empleados                │ │
 *  │  │  identificado                          del área                 │ │
 *  │  │                                                                  │ │
 *  │  └─────────────────────────────────────────────────────────────────┘ │
 *  │                                                                       │
 *  │  TIPOS DE ACCIDENTE → CAPACITACIÓN:                                  │
 *  │  ───────────────────────────────────                                 │
 *  │  • Caída altura     → Trabajo en altura, Uso de arnés               │
 *  │  • Caída nivel      → Orden y limpieza, 5S                          │
 *  │  • Golpe objeto     → EPP, Seguridad general                        │
 *  │  • Corte/herida     → Herramientas manuales, Primeros auxilios      │
 *  │  • Atrapamiento     → LOTO, Bloqueo/etiquetado                      │
 *  │  • Quemadura        → Manejo químicos, Protección térmica           │
 *  │  • Eléctrico        → Riesgo eléctrico, LOTO                        │
 *  │  • Ergonómico       → Ergonomía, Levantamiento cargas               │
 *  │  • In itinere       → Seguridad vial, Manejo defensivo              │
 *  │                                                                       │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 * @version 1.0.0
 * @date 2026-02-01
 */

const TrainingEcosystemHub = require('./TrainingEcosystemHub');
const { sequelize } = require('../../config/database');

class ARTTrainingIntegration {

    /**
     * Mapeo de tipos de accidente a capacitaciones requeridas
     */
    static ACCIDENT_TRAINING_MAP = {
        // Caídas
        caida_altura: {
            victim: ['Trabajo en altura', 'Uso correcto de arnés', 'Inspección de equipos'],
            area: ['Prevención de caídas', 'Seguridad en altura'],
            priority: 'critical'
        },
        caida_nivel: {
            victim: ['Orden y limpieza', 'Identificación de riesgos'],
            area: ['5S', 'Housekeeping'],
            priority: 'high'
        },

        // Golpes y cortes
        golpe_objeto: {
            victim: ['Uso de EPP', 'Seguridad general'],
            area: ['Prevención de golpes', 'Almacenamiento seguro'],
            priority: 'high'
        },
        corte_herida: {
            victim: ['Herramientas manuales', 'Primeros auxilios'],
            area: ['Seguridad con herramientas', 'Uso de guantes'],
            priority: 'high'
        },

        // Atrapamientos y mecánicos
        atrapamiento: {
            victim: ['LOTO - Bloqueo y etiquetado', 'Seguridad en máquinas'],
            area: ['Procedimientos LOTO', 'Guardas de seguridad'],
            priority: 'critical'
        },

        // Térmicos y químicos
        quemadura: {
            victim: ['Manejo de químicos', 'Protección térmica', 'EPP especializado'],
            area: ['Seguridad química', 'Emergencias químicas'],
            priority: 'critical'
        },

        // Eléctricos
        electrico: {
            victim: ['Riesgo eléctrico', 'LOTO eléctrico', 'Primeros auxilios RCP'],
            area: ['Seguridad eléctrica', 'Identificación de riesgos eléctricos'],
            priority: 'critical'
        },

        // Ergonómicos
        ergonomico: {
            victim: ['Ergonomía laboral', 'Levantamiento de cargas'],
            area: ['Prevención de lesiones musculoesqueléticas'],
            priority: 'normal'
        },

        // In itinere (en trayecto)
        in_itinere: {
            victim: ['Seguridad vial', 'Manejo defensivo'],
            area: ['Concientización vial'],
            priority: 'normal'
        },

        // Otros
        enfermedad_profesional: {
            victim: ['Salud ocupacional', 'Prevención específica'],
            area: ['Higiene industrial'],
            priority: 'high'
        }
    };

    /**
     * Hook: Cuando se cierra un accidente (alta médica)
     * Llamar desde: artRoutes.js al cerrar caso
     */
    static async onAccidentClosed(accident, closedBy) {
        console.log(`🏥 [ART→TRAINING] Accidente cerrado: ${accident.denuncia_number || accident.id}`);

        const mapping = this.ACCIDENT_TRAINING_MAP[accident.accident_type];

        if (!mapping) {
            console.warn(`⚠️ [ART→TRAINING] Sin mapeo para tipo: ${accident.accident_type}`);
            return { success: false, reason: 'Tipo de accidente no mapeado' };
        }

        const results = {
            victimTrainings: [],
            areaTrainings: []
        };

        // 1. Capacitación de reinserción para la víctima
        for (const trainingKeyword of mapping.victim) {
            const result = await TrainingEcosystemHub.assignFromExternalModule({
                userId: accident.employee_id,
                companyId: accident.company_id,
                sourceModule: 'art',
                sourceEntityType: 'art_accident',
                sourceEntityId: accident.id,
                keywords: trainingKeyword.toLowerCase().split(' '),
                priority: mapping.priority,
                mandatory: true,
                reason: `Reinserción post-accidente: ${accident.denuncia_number || accident.id}`,
                assignedBy: closedBy
            });

            results.victimTrainings.push({ keyword: trainingKeyword, ...result });
        }

        // 2. Capacitación preventiva para el área (si aplica)
        if (accident.department_id && mapping.area.length > 0) {
            const areaResult = await this.assignPreventiveToArea(
                accident,
                mapping.area,
                mapping.priority
            );
            results.areaTrainings = areaResult;
        }

        const victimSuccess = results.victimTrainings.filter(r => r.success).length;
        console.log(`✅ [ART→TRAINING] Víctima: ${victimSuccess}/${mapping.victim.length} capacitaciones`);

        return {
            success: victimSuccess > 0,
            victimTrainings: results.victimTrainings,
            areaTrainings: results.areaTrainings
        };
    }

    /**
     * Asigna capacitación preventiva a todos los empleados del área
     */
    static async assignPreventiveToArea(accident, trainingKeywords, priority) {
        const { User } = require('../../config/database');

        try {
            // Obtener empleados del área
            const employees = await User.findAll({
                where: {
                    company_id: accident.company_id,
                    department_id: accident.department_id,
                    isActive: true,
                    user_id: { [require('sequelize').Op.ne]: accident.employee_id } // Excluir víctima
                },
                attributes: ['user_id']
            });

            console.log(`📢 [ART→TRAINING] Asignando prevención a ${employees.length} empleados del área`);

            const results = [];

            for (const emp of employees) {
                // Asignar la primera capacitación del área como prevención
                const result = await TrainingEcosystemHub.assignFromExternalModule({
                    userId: emp.user_id,
                    companyId: accident.company_id,
                    sourceModule: 'art',
                    sourceEntityType: 'art_accident_prevention',
                    sourceEntityId: accident.id,
                    keywords: trainingKeywords[0].toLowerCase().split(' '),
                    priority: priority === 'critical' ? 'high' : 'normal', // Bajar prioridad para área
                    mandatory: true,
                    reason: `Prevención post-accidente tipo: ${accident.accident_type}`
                });

                results.push({ userId: emp.user_id, ...result });
            }

            return results;

        } catch (error) {
            console.error('❌ [ART→TRAINING] Error asignando al área:', error);
            return [];
        }
    }

    /**
     * Hook: Al crear denuncia ART, adjuntar historial de capacitaciones
     * Llamar desde: artRoutes.js al crear denuncia
     */
    static async attachTrainingHistory(denunciaId, employeeId, companyId) {
        console.log(`📎 [ART→TRAINING] Adjuntando historial a denuncia: ${denunciaId}`);

        try {
            const history = await sequelize.query(`
                SELECT
                    t.title as training_title,
                    t.category,
                    ta.status,
                    ta.completed_at,
                    ta.score,
                    CASE
                        WHEN ta.status = 'completed' THEN 'Completada'
                        WHEN ta.status = 'in_progress' THEN 'En progreso'
                        ELSE 'Pendiente'
                    END as status_display
                FROM training_assignments ta
                JOIN trainings t ON t.id = ta.training_id
                WHERE ta.user_id = $1 AND ta.company_id = $2
                  AND t.category = 'safety'
                ORDER BY ta.completed_at DESC NULLS LAST
                LIMIT 20
            `, { bind: [employeeId, companyId], type: sequelize.QueryTypes.SELECT });

            // Guardar en metadata de la denuncia
            await sequelize.query(`
                UPDATE art_accidents
                SET training_history = $1,
                    updated_at = NOW()
                WHERE id = $2
            `, {
                bind: [JSON.stringify(history), denunciaId],
                type: sequelize.QueryTypes.UPDATE
            });

            console.log(`✅ [ART→TRAINING] Historial adjuntado: ${history.length} capacitaciones`);

            return {
                success: true,
                trainingsAttached: history.length,
                history
            };

        } catch (error) {
            console.error('❌ [ART→TRAINING] Error adjuntando historial:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene estadísticas de capacitaciones post-accidente
     */
    static async getPostAccidentStats(companyId, dateFrom, dateTo) {
        try {
            const stats = await sequelize.query(`
                SELECT
                    COUNT(DISTINCT ta.id) as total_assignments,
                    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'completed') as completed,
                    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'in_progress') as in_progress,
                    COUNT(DISTINCT ta.id) FILTER (WHERE ta.source_entity_type = 'art_accident') as victim_trainings,
                    COUNT(DISTINCT ta.id) FILTER (WHERE ta.source_entity_type = 'art_accident_prevention') as area_trainings,
                    AVG(EXTRACT(EPOCH FROM (ta.completed_at - ta.assigned_at)) / 86400)::numeric(10,2) as avg_completion_days
                FROM training_assignments ta
                WHERE ta.company_id = $1
                  AND ta.source_module = 'art'
                  AND ta.assigned_at BETWEEN $2 AND $3
            `, {
                bind: [companyId, dateFrom, dateTo],
                type: sequelize.QueryTypes.SELECT
            });

            return stats[0] || {};

        } catch (error) {
            console.error('❌ [ART→TRAINING] Error obteniendo estadísticas:', error);
            return {};
        }
    }

    /**
     * Verifica si un empleado tiene las capacitaciones de seguridad requeridas
     * antes de permitir trabajar en áreas de riesgo
     */
    static async verifySafetyTrainingCompliance(userId, companyId, riskLevel = 'high') {
        try {
            const required = await sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE t.category = 'safety' AND ta.status = 'completed') as completed_safety,
                    COUNT(*) FILTER (WHERE t.category = 'safety' AND ta.status != 'completed') as pending_safety,
                    ARRAY_AGG(t.title) FILTER (WHERE t.category = 'safety' AND ta.status != 'completed') as pending_titles
                FROM training_assignments ta
                JOIN trainings t ON t.id = ta.training_id
                WHERE ta.user_id = $1 AND ta.company_id = $2
                  AND ta.source_module = 'art'
            `, { bind: [userId, companyId], type: sequelize.QueryTypes.SELECT });

            const data = required[0] || {};

            return {
                compliant: (data.pending_safety || 0) === 0,
                completedCount: data.completed_safety || 0,
                pendingCount: data.pending_safety || 0,
                pendingTitles: data.pending_titles || []
            };

        } catch (error) {
            console.error('❌ [ART→TRAINING] Error verificando compliance:', error);
            return { compliant: true, error: error.message };
        }
    }
}

module.exports = ARTTrainingIntegration;
