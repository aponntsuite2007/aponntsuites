/**
 * ============================================================================
 * INTEGRACIÓN: Medical → Training
 * ============================================================================
 *
 * CIRCUITO DE INTEGRACIÓN:
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │                      MEDICAL → TRAINING                               │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │                                                                       │
 *  │  ENTRADA                    PROCESO                    SALIDA         │
 *  │  ────────                   ────────                   ──────         │
 *  │                                                                       │
 *  │  ┌─────────────┐     ┌─────────────────────┐     ┌─────────────────┐ │
 *  │  │ EXAMEN      │ ──▶ │  ANÁLISIS           │ ──▶ │ CAPACITACIÓN    │ │
 *  │  │ MÉDICO      │     │  DEFICIENCIAS       │     │ REMEDIAL        │ │
 *  │  └─────────────┘     └─────────────────────┘     └─────────────────┘ │
 *  │        │                      │                          │           │
 *  │        ▼                      ▼                          ▼           │
 *  │  • Audiometría         • Si audiometría         • "Protección       │
 *  │  • Visual                deficiente                auditiva"        │
 *  │  • Ergonómico          • Si visual impaired     • "Seguridad        │
 *  │  • Psicotécnico        • Si ergonómico             visual"          │
 *  │  • Físico general        deficiente             • "Ergonomía"       │
 *  │                                                                      │
 *  │  ════════════════════════════════════════════════════════════════   │
 *  │                                                                      │
 *  │  BLOQUEO DE INSCRIPCIÓN (sentido inverso):                          │
 *  │                                                                      │
 *  │  ┌─────────────┐     ┌─────────────────────┐     ┌─────────────────┐ │
 *  │  │ TRAINING    │ ──▶ │  VALIDACIÓN         │ ──▶ │ BLOQUEO O       │ │
 *  │  │ ALTO RIESGO │     │  MÉDICA             │     │ INSCRIPCIÓN     │ │
 *  │  └─────────────┘     └─────────────────────┘     └─────────────────┘ │
 *  │        │                      │                          │           │
 *  │        ▼                      ▼                          ▼           │
 *  │  • Trabajo altura      • Cert. médico         • OK: inscribir      │
 *  │  • Maquinaria            vigente?             • NO: mensaje         │
 *  │  • Conducción          • Aptitud                "Renovar certif."  │
 *  │  • Espacio confinado     verificada?                                │
 *  │                                                                      │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 * @version 1.0.0
 * @date 2026-02-01
 */

const TrainingEcosystemHub = require('./TrainingEcosystemHub');
const { sequelize } = require('../../config/database');

class MedicalTrainingIntegration {

    /**
     * Mapeo de tipos de deficiencia a capacitaciones recomendadas
     */
    static DEFICIENCY_MAP = {
        // Deficiencias auditivas
        audiometry_mild: {
            category: 'safety',
            keywords: ['auditivo', 'ruido', 'protector'],
            priority: 'normal'
        },
        audiometry_moderate: {
            category: 'safety',
            keywords: ['auditivo', 'ruido', 'protector', 'obligatorio'],
            priority: 'high'
        },
        audiometry_severe: {
            category: 'safety',
            keywords: ['auditivo', 'EPP', 'obligatorio'],
            priority: 'critical'
        },

        // Deficiencias visuales
        visual_mild: {
            category: 'safety',
            keywords: ['visual', 'iluminación', 'pantalla'],
            priority: 'normal'
        },
        visual_moderate: {
            category: 'safety',
            keywords: ['visual', 'seguridad', 'protección'],
            priority: 'high'
        },

        // Problemas ergonómicos
        ergonomic_posture: {
            category: 'quality',
            keywords: ['ergonomía', 'postura', 'espalda'],
            priority: 'normal'
        },
        ergonomic_repetitive: {
            category: 'quality',
            keywords: ['ergonomía', 'movimiento', 'descanso'],
            priority: 'normal'
        },

        // Problemas respiratorios
        respiratory_mild: {
            category: 'safety',
            keywords: ['respiratorio', 'mascarilla', 'ventilación'],
            priority: 'normal'
        },
        respiratory_moderate: {
            category: 'safety',
            keywords: ['respiratorio', 'EPP', 'obligatorio'],
            priority: 'high'
        },

        // Salud mental
        stress_moderate: {
            category: 'soft_skills',
            keywords: ['estrés', 'bienestar', 'salud mental'],
            priority: 'normal'
        },
        stress_severe: {
            category: 'soft_skills',
            keywords: ['estrés', 'bienestar', 'crisis'],
            priority: 'high'
        }
    };

    /**
     * Hook: Cuando se registra un examen médico con deficiencias
     * Llamar desde: userMedicalExamsRoutes.js al crear/actualizar examen
     */
    static async onExamCompleted(exam, deficiencies) {
        console.log(`⚕️ [MEDICAL→TRAINING] Examen completado: ${exam.id}`);

        if (!deficiencies || deficiencies.length === 0) {
            return { success: true, message: 'Sin deficiencias, no se requiere capacitación' };
        }

        const results = [];

        for (const deficiency of deficiencies) {
            const mapping = this.DEFICIENCY_MAP[deficiency.type];

            if (!mapping) {
                console.warn(`⚠️ [MEDICAL→TRAINING] Sin mapeo para: ${deficiency.type}`);
                continue;
            }

            const result = await TrainingEcosystemHub.onMedicalDeficiency({
                deficiencyType: deficiency.type,
                userId: exam.user_id,
                companyId: exam.company_id,
                examId: exam.id,
                examType: exam.exam_type || 'general'
            });

            results.push({
                deficiency: deficiency.type,
                severity: deficiency.severity,
                ...result
            });
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ [MEDICAL→TRAINING] ${successCount}/${deficiencies.length} capacitaciones asignadas`);

        return {
            success: successCount > 0,
            totalDeficiencies: deficiencies.length,
            trainingsAssigned: successCount,
            results
        };
    }

    /**
     * Hook: Validar elegibilidad médica antes de inscribir en capacitación
     * Llamar desde: trainingRoutes.js antes de crear asignación
     */
    static async validateEligibility(userId, trainingId, companyId) {
        console.log(`🔍 [MEDICAL→TRAINING] Validando elegibilidad para training ${trainingId}`);

        try {
            // Obtener requisitos del training
            const [training] = await sequelize.query(`
                SELECT id, title, requires_medical_clearance, required_medical_exams, risk_level
                FROM trainings
                WHERE id = $1 AND company_id = $2
            `, { bind: [trainingId, companyId], type: sequelize.QueryTypes.SELECT });

            if (!training) {
                return { eligible: true, reason: 'Training no encontrado (permitiendo inscripción)' };
            }

            if (!training.requires_medical_clearance) {
                return { eligible: true, reason: 'No requiere certificado médico' };
            }

            // Buscar último examen médico vigente
            const [latestExam] = await sequelize.query(`
                SELECT id, exam_type, result, exam_date, next_exam_date,
                       observations, restrictions
                FROM user_medical_exams
                WHERE user_id = $1 AND company_id = $2
                  AND result IN ('apto', 'apto_con_restricciones')
                  AND (next_exam_date IS NULL OR next_exam_date > NOW())
                ORDER BY exam_date DESC
                LIMIT 1
            `, { bind: [userId, companyId], type: sequelize.QueryTypes.SELECT });

            if (!latestExam) {
                return {
                    eligible: false,
                    reason: 'No tiene certificado médico vigente',
                    requiredAction: 'Debe realizarse examen médico ocupacional',
                    trainingTitle: training.title,
                    blockingRule: 'medical_clearance_required'
                };
            }

            // Verificar restricciones
            if (latestExam.result === 'apto_con_restricciones') {
                const restrictions = latestExam.restrictions || {};

                // Verificar si las restricciones afectan este training
                if (training.risk_level === 'high' || training.risk_level === 'critical') {
                    return {
                        eligible: false,
                        reason: 'Certificado tiene restricciones incompatibles con capacitación de alto riesgo',
                        restrictions: restrictions,
                        trainingTitle: training.title,
                        blockingRule: 'medical_restrictions'
                    };
                }
            }

            // Verificar tipos de examen requeridos
            if (training.required_medical_exams && training.required_medical_exams.length > 0) {
                const hasAllExams = await this.verifyRequiredExams(
                    userId,
                    companyId,
                    training.required_medical_exams
                );

                if (!hasAllExams.valid) {
                    return {
                        eligible: false,
                        reason: `Falta(n) examen(es): ${hasAllExams.missing.join(', ')}`,
                        requiredExams: training.required_medical_exams,
                        missingExams: hasAllExams.missing,
                        trainingTitle: training.title,
                        blockingRule: 'missing_specific_exams'
                    };
                }
            }

            return {
                eligible: true,
                reason: 'Certificado médico vigente y sin restricciones aplicables',
                examDate: latestExam.exam_date,
                validUntil: latestExam.next_exam_date
            };

        } catch (error) {
            console.error('❌ [MEDICAL→TRAINING] Error validando elegibilidad:', error);
            // En caso de error, permitir inscripción para no bloquear operación
            return { eligible: true, reason: 'Error en validación (permitiendo por defecto)' };
        }
    }

    /**
     * Verifica que el usuario tenga todos los exámenes requeridos
     */
    static async verifyRequiredExams(userId, companyId, requiredTypes) {
        const [exams] = await sequelize.query(`
            SELECT DISTINCT exam_type
            FROM user_medical_exams
            WHERE user_id = $1 AND company_id = $2
              AND result IN ('apto', 'apto_con_restricciones')
              AND (next_exam_date IS NULL OR next_exam_date > NOW())
        `, { bind: [userId, companyId], type: sequelize.QueryTypes.SELECT });

        const existingTypes = exams.map(e => e.exam_type);
        const missing = requiredTypes.filter(t => !existingTypes.includes(t));

        return {
            valid: missing.length === 0,
            existing: existingTypes,
            missing
        };
    }

    /**
     * Obtiene exámenes próximos a vencer que pueden afectar capacitaciones
     */
    static async getExpiringCertificatesWithTrainingImpact(companyId, daysAhead = 30) {
        try {
            const results = await sequelize.query(`
                SELECT
                    ume.id as exam_id,
                    ume.user_id,
                    u."firstName" || ' ' || u."lastName" as employee_name,
                    ume.exam_type,
                    ume.next_exam_date,
                    COUNT(ta.id) as pending_trainings,
                    ARRAY_AGG(DISTINCT t.title) FILTER (WHERE t.id IS NOT NULL) as training_titles
                FROM user_medical_exams ume
                JOIN users u ON u.user_id = ume.user_id
                LEFT JOIN training_assignments ta ON ta.user_id = ume.user_id
                    AND ta.company_id = ume.company_id
                    AND ta.status IN ('assigned', 'in_progress')
                LEFT JOIN trainings t ON t.id = ta.training_id
                    AND t.requires_medical_clearance = true
                WHERE ume.company_id = $1
                  AND ume.result IN ('apto', 'apto_con_restricciones')
                  AND ume.next_exam_date BETWEEN NOW() AND NOW() + INTERVAL '${daysAhead} days'
                GROUP BY ume.id, ume.user_id, u."firstName", u."lastName", ume.exam_type, ume.next_exam_date
                HAVING COUNT(ta.id) > 0
                ORDER BY ume.next_exam_date ASC
            `, { bind: [companyId], type: sequelize.QueryTypes.SELECT });

            return results;

        } catch (error) {
            console.error('❌ [MEDICAL→TRAINING] Error obteniendo certificados por vencer:', error);
            return [];
        }
    }

    /**
     * Notifica a usuarios sobre exámenes por vencer que bloquearán capacitaciones
     */
    static async notifyExpiringCertificates(companyId) {
        const expiring = await this.getExpiringCertificatesWithTrainingImpact(companyId, 30);

        const TrainingNotifications = require('./training-notifications');

        for (const record of expiring) {
            try {
                await TrainingNotifications.notifyDeadlineReminder({
                    companyId,
                    recipientId: record.user_id,
                    data: {
                        message: `Tu certificado médico vence el ${new Date(record.next_exam_date).toLocaleDateString()}. Tienes ${record.pending_trainings} capacitación(es) pendiente(s) que requieren certificado vigente.`,
                        type: 'medical_expiry_warning',
                        expiryDate: record.next_exam_date,
                        affectedTrainings: record.training_titles
                    }
                });
            } catch (error) {
                console.warn(`⚠️ Error notificando a usuario ${record.user_id}:`, error.message);
            }
        }

        return { notified: expiring.length };
    }
}

module.exports = MedicalTrainingIntegration;
