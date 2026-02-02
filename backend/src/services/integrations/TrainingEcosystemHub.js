/**
 * ============================================================================
 * SERVICIO: TrainingEcosystemHub - Centro de Integración de Capacitaciones
 * ============================================================================
 *
 * Hub central que orquesta las integraciones entre Capacitaciones y:
 * - HSE (Seguridad e Higiene)
 * - Medical (Exámenes Médicos)
 * - ART (Accidentes Laborales)
 * - Procedures (Procedimientos)
 * - Risk Intelligence (Dashboard de Riesgos)
 *
 * CIRCUITOS DE INTEGRACIÓN:
 *
 * ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
 * │     HSE     │    │   MEDICAL   │    │     ART     │
 * │  Violación  │    │ Examen Def. │    │  Accidente  │
 * └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
 *        │                  │                  │
 *        ▼                  ▼                  ▼
 *    ┌───────────────────────────────────────────┐
 *    │         TRAINING ECOSYSTEM HUB            │
 *    │                                           │
 *    │  • Recibe eventos de módulos afluentes   │
 *    │  • Valida elegibilidad del usuario       │
 *    │  • Auto-asigna capacitaciones            │
 *    │  • Registra auditoría de integración     │
 *    │  • Notifica vía NCE                      │
 *    └───────────────────────────────────────────┘
 *        │                  │                  │
 *        ▼                  ▼                  ▼
 * ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
 * │ PROCEDURES  │    │    RISK     │    │ ONBOARDING  │
 * │ Nuevo SOP   │    │ Score Alto  │    │ Ingreso     │
 * └─────────────┘    └─────────────┘    └─────────────┘
 *
 * @version 1.0.0
 * @date 2026-02-01
 */

const { Training, TrainingAssignment, User, sequelize } = require('../../config/database');
const TrainingNotifications = require('./training-notifications');
const { Op } = require('sequelize');

class TrainingEcosystemHub {

    // =========================================================================
    // CONFIGURACIÓN DE MAPEOS
    // =========================================================================

    /**
     * Mapeo de violaciones HSE a capacitaciones
     * Circuito: Violación HSE → Capacitación de Seguridad
     */
    static HSE_VIOLATION_TRAINING_MAP = {
        // Violaciones de EPP
        'NO_HELMET': { category: 'safety', keywords: ['casco', 'protección cabeza'] },
        'NO_GLOVES': { category: 'safety', keywords: ['guantes', 'protección manos'] },
        'NO_GOGGLES': { category: 'safety', keywords: ['lentes', 'protección visual'] },
        'NO_HARNESS': { category: 'safety', keywords: ['arnés', 'altura', 'caída'] },
        'NO_BOOTS': { category: 'safety', keywords: ['calzado', 'seguridad pies'] },
        'NO_VEST': { category: 'safety', keywords: ['chaleco', 'visibilidad'] },
        'NO_MASK': { category: 'safety', keywords: ['mascarilla', 'respiratoria'] },

        // Violaciones de procedimiento
        'UNSAFE_BEHAVIOR': { category: 'safety', keywords: ['comportamiento', 'seguro'] },
        'PROCEDURE_VIOLATION': { category: 'compliance', keywords: ['procedimiento', 'normativa'] }
    };

    /**
     * Mapeo de resultados médicos a capacitaciones
     * Circuito: Deficiencia Médica → Capacitación Remedial
     */
    static MEDICAL_TRAINING_MAP = {
        'audiometry_deficient': { keywords: ['auditivo', 'protector', 'ruido'] },
        'visual_impaired': { keywords: ['visual', 'seguridad', 'iluminación'] },
        'respiratory_issues': { keywords: ['respiratorio', 'EPP', 'mascarilla'] },
        'ergonomic_problems': { keywords: ['ergonomía', 'postura', 'movimiento'] },
        'cardiovascular_risk': { keywords: ['salud', 'primeros auxilios'] },
        'psychological_issues': { keywords: ['estrés', 'bienestar', 'salud mental'] }
    };

    /**
     * Mapeo de tipos de accidente ART a capacitaciones
     * Circuito: Accidente → Capacitación Preventiva
     */
    static ART_ACCIDENT_TRAINING_MAP = {
        'caida_altura': { keywords: ['altura', 'arnés', 'caída'] },
        'caida_nivel': { keywords: ['piso', 'orden', 'limpieza'] },
        'golpe_objeto': { keywords: ['EPP', 'casco', 'protección'] },
        'corte_herida': { keywords: ['guantes', 'herramienta', 'corte'] },
        'atrapamiento': { keywords: ['máquina', 'bloqueo', 'etiquetado'] },
        'quemadura': { keywords: ['fuego', 'químico', 'protección'] },
        'electrico': { keywords: ['eléctrico', 'lockout', 'aislamiento'] },
        'ergonomico': { keywords: ['ergonomía', 'levantamiento', 'postura'] },
        'in_itinere': { keywords: ['vial', 'tránsito', 'manejo'] }
    };

    // =========================================================================
    // MÉTODO PRINCIPAL: Asignar capacitación desde módulo externo
    // =========================================================================

    /**
     * Asigna una capacitación a un usuario desde un módulo afluente
     *
     * @param {Object} params
     * @param {number} params.userId - ID del usuario a capacitar
     * @param {number} params.companyId - ID de la empresa
     * @param {string} params.sourceModule - Módulo origen: 'hse', 'medical', 'art', 'procedures', 'risk_intelligence'
     * @param {string} params.sourceEntityType - Tipo de entidad: 'hse_case', 'medical_exam', etc.
     * @param {number} params.sourceEntityId - ID de la entidad origen
     * @param {number} [params.trainingId] - ID específico de capacitación (opcional)
     * @param {string} [params.trainingCategory] - Categoría para buscar (si no hay trainingId)
     * @param {string[]} [params.keywords] - Palabras clave para buscar capacitación
     * @param {string} [params.priority='normal'] - Prioridad: 'critical', 'high', 'normal', 'low'
     * @param {boolean} [params.mandatory=true] - Si es obligatoria
     * @param {Date} [params.deadline] - Fecha límite
     * @param {string} [params.reason] - Razón de la asignación
     * @param {number} [params.assignedBy] - Usuario que asigna (sistema si no se especifica)
     *
     * @returns {Object} Resultado de la asignación
     */
    static async assignFromExternalModule(params) {
        const {
            userId,
            companyId,
            sourceModule,
            sourceEntityType,
            sourceEntityId,
            trainingId,
            trainingCategory,
            keywords = [],
            priority = 'normal',
            mandatory = true,
            deadline,
            reason,
            assignedBy
        } = params;

        console.log(`🔗 [ECOSYSTEM-HUB] Asignación desde ${sourceModule}/${sourceEntityType} para usuario ${userId}`);

        try {
            // 1. Buscar la capacitación apropiada
            let training = null;

            if (trainingId) {
                training = await Training.findOne({
                    where: { id: trainingId, company_id: companyId }
                });
            } else {
                // Buscar por categoría y keywords
                training = await this.findMatchingTraining(companyId, trainingCategory, keywords);
            }

            if (!training) {
                console.warn(`⚠️ [ECOSYSTEM-HUB] No se encontró capacitación para ${sourceModule}/${sourceEntityType}`);
                await this.logIntegration({
                    companyId,
                    sourceModule,
                    sourceEntityType,
                    sourceEntityId,
                    action: 'auto_assign',
                    userId,
                    success: false,
                    errorMessage: 'No se encontró capacitación apropiada',
                    metadata: { keywords, trainingCategory }
                });
                return { success: false, error: 'No se encontró capacitación apropiada' };
            }

            // 2. Verificar elegibilidad médica si aplica
            if (training.requires_medical_clearance) {
                const eligibility = await this.checkMedicalEligibility(userId, training.id);
                if (!eligibility.eligible) {
                    console.warn(`⚠️ [ECOSYSTEM-HUB] Usuario ${userId} no elegible: ${eligibility.reason}`);
                    await this.logIntegration({
                        companyId,
                        sourceModule,
                        sourceEntityType,
                        sourceEntityId,
                        action: 'block',
                        trainingId: training.id,
                        userId,
                        success: false,
                        errorMessage: eligibility.reason,
                        metadata: eligibility
                    });
                    return { success: false, error: eligibility.reason, blocked: true };
                }
            }

            // 3. Verificar si ya tiene esta asignación
            const existingAssignment = await TrainingAssignment.findOne({
                where: {
                    training_id: training.id,
                    user_id: userId,
                    company_id: companyId,
                    status: { [Op.notIn]: ['completed', 'cancelled'] }
                }
            });

            if (existingAssignment) {
                console.log(`ℹ️ [ECOSYSTEM-HUB] Usuario ${userId} ya tiene asignación activa`);

                // Actualizar prioridad si la nueva es más alta
                const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
                if (priorityOrder[priority] > priorityOrder[existingAssignment.priority || 'normal']) {
                    await existingAssignment.update({ priority });
                }

                return {
                    success: true,
                    existing: true,
                    assignmentId: existingAssignment.id,
                    message: 'Ya tiene asignación activa (prioridad actualizada si aplica)'
                };
            }

            // 4. Crear la asignación
            const assignment = await TrainingAssignment.create({
                training_id: training.id,
                user_id: userId,
                company_id: companyId,
                assigned_by: assignedBy || null,
                assigned_at: new Date(),
                due_date: deadline || this.calculateDeadline(priority),
                priority,
                status: 'assigned',
                source_module: sourceModule,
                source_entity_type: sourceEntityType,
                source_entity_id: sourceEntityId,
                auto_assigned: true,
                assignment_reason: reason || `Auto-asignada desde ${sourceModule}: ${sourceEntityType} #${sourceEntityId}`,
                notes: `[AUTO] Generada por integración con módulo ${sourceModule.toUpperCase()}`
            });

            console.log(`✅ [ECOSYSTEM-HUB] Asignación creada: ${assignment.id} - Training: ${training.title}`);

            // 5. Log de integración
            await this.logIntegration({
                companyId,
                sourceModule,
                sourceEntityType,
                sourceEntityId,
                action: 'auto_assign',
                trainingId: training.id,
                assignmentId: assignment.id,
                userId,
                success: true,
                metadata: { priority, mandatory, reason }
            });

            // 6. Notificar al usuario vía NCE
            try {
                await TrainingNotifications.notifyCourseAssigned({
                    companyId,
                    recipientId: userId,
                    data: {
                        trainingId: training.id,
                        trainingTitle: training.title,
                        sourceModule,
                        priority,
                        deadline: assignment.due_date,
                        reason: reason || `Requerida por ${this.getModuleDisplayName(sourceModule)}`
                    }
                });
            } catch (notifError) {
                console.warn('⚠️ [ECOSYSTEM-HUB] Error enviando notificación:', notifError.message);
            }

            return {
                success: true,
                assignmentId: assignment.id,
                trainingId: training.id,
                trainingTitle: training.title,
                priority,
                deadline: assignment.due_date
            };

        } catch (error) {
            console.error('❌ [ECOSYSTEM-HUB] Error en asignación:', error);

            await this.logIntegration({
                companyId,
                sourceModule,
                sourceEntityType,
                sourceEntityId,
                action: 'auto_assign',
                userId,
                success: false,
                errorMessage: error.message
            });

            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // MÉTODOS DE INTEGRACIÓN POR MÓDULO
    // =========================================================================

    /**
     * Circuito HSE: Violación → Capacitación
     */
    static async onHSEViolation(params) {
        const { violationCode, userId, companyId, caseId, caseNumber } = params;

        console.log(`🛡️ [ECOSYSTEM-HUB] Procesando violación HSE: ${violationCode}`);

        const mapping = this.HSE_VIOLATION_TRAINING_MAP[violationCode];
        if (!mapping) {
            console.warn(`⚠️ [ECOSYSTEM-HUB] No hay mapeo para violación: ${violationCode}`);
            return { success: false, error: 'Código de violación no mapeado' };
        }

        return this.assignFromExternalModule({
            userId,
            companyId,
            sourceModule: 'hse',
            sourceEntityType: 'hse_case',
            sourceEntityId: caseId,
            trainingCategory: mapping.category,
            keywords: mapping.keywords,
            priority: 'high',
            mandatory: true,
            reason: `Violación HSE: ${violationCode} - Caso #${caseNumber}`
        });
    }

    /**
     * Circuito Medical: Deficiencia → Capacitación Remedial
     */
    static async onMedicalDeficiency(params) {
        const { deficiencyType, userId, companyId, examId, examType } = params;

        console.log(`⚕️ [ECOSYSTEM-HUB] Procesando deficiencia médica: ${deficiencyType}`);

        const mapping = this.MEDICAL_TRAINING_MAP[deficiencyType];
        if (!mapping) {
            console.warn(`⚠️ [ECOSYSTEM-HUB] No hay mapeo para deficiencia: ${deficiencyType}`);
            return { success: false, error: 'Tipo de deficiencia no mapeado' };
        }

        return this.assignFromExternalModule({
            userId,
            companyId,
            sourceModule: 'medical',
            sourceEntityType: 'medical_exam',
            sourceEntityId: examId,
            keywords: mapping.keywords,
            priority: 'normal',
            mandatory: true,
            reason: `Examen ${examType}: ${deficiencyType} detectado`
        });
    }

    /**
     * Circuito ART: Accidente → Capacitación Preventiva
     */
    static async onARTAccident(params) {
        const { accidentType, userId, companyId, accidentId, denunciaNumber, affectedArea } = params;

        console.log(`🏥 [ECOSYSTEM-HUB] Procesando accidente ART: ${accidentType}`);

        const mapping = this.ART_ACCIDENT_TRAINING_MAP[accidentType];
        if (!mapping) {
            console.warn(`⚠️ [ECOSYSTEM-HUB] No hay mapeo para tipo de accidente: ${accidentType}`);
            return { success: false, error: 'Tipo de accidente no mapeado' };
        }

        // Capacitación para el accidentado (reinserción)
        const result = await this.assignFromExternalModule({
            userId,
            companyId,
            sourceModule: 'art',
            sourceEntityType: 'art_accident',
            sourceEntityId: accidentId,
            keywords: [...mapping.keywords, 'reinserción'],
            priority: 'critical',
            mandatory: true,
            reason: `Post-accidente: Denuncia ART #${denunciaNumber}`
        });

        // Capacitación preventiva para el área (si se especifica)
        if (affectedArea) {
            await this.assignPreventiveTrainingToArea({
                companyId,
                areaId: affectedArea,
                accidentId,
                accidentType,
                keywords: mapping.keywords
            });
        }

        return result;
    }

    /**
     * Circuito Procedures: Nuevo/Actualizado → Capacitación
     */
    static async onProcedureChange(params) {
        const { procedureId, procedureName, changeType, affectedUserIds, companyId, linkedTrainingId } = params;

        console.log(`📋 [ECOSYSTEM-HUB] Procesando cambio en procedimiento: ${changeType}`);

        const results = [];

        for (const userId of affectedUserIds) {
            const result = await this.assignFromExternalModule({
                userId,
                companyId,
                sourceModule: 'procedures',
                sourceEntityType: changeType === 'new' ? 'procedure' : 'procedure_update',
                sourceEntityId: procedureId,
                trainingId: linkedTrainingId,
                keywords: [procedureName.toLowerCase()],
                priority: changeType === 'new' ? 'high' : 'normal',
                mandatory: true,
                reason: `${changeType === 'new' ? 'Nuevo' : 'Actualización de'} procedimiento: ${procedureName}`
            });
            results.push(result);
        }

        return {
            success: results.every(r => r.success),
            totalAssigned: results.filter(r => r.success).length,
            results
        };
    }

    /**
     * Circuito Risk Intelligence: Score Crítico → Priorización
     */
    static async onCriticalRiskScore(params) {
        const { userId, companyId, riskCategory, riskScore, alertId } = params;

        console.log(`📊 [ECOSYSTEM-HUB] Procesando riesgo crítico: ${riskCategory} (score: ${riskScore})`);

        const categoryKeywords = {
            'attendance_risk': ['puntualidad', 'asistencia', 'gestión tiempo'],
            'safety_risk': ['seguridad', 'EPP', 'procedimiento'],
            'performance_risk': ['desempeño', 'productividad', 'mejora'],
            'compliance_risk': ['cumplimiento', 'normativa', 'regulación']
        };

        const keywords = categoryKeywords[riskCategory] || ['general'];

        return this.assignFromExternalModule({
            userId,
            companyId,
            sourceModule: 'risk_intelligence',
            sourceEntityType: 'risk_alert',
            sourceEntityId: alertId,
            keywords,
            priority: riskScore >= 80 ? 'critical' : 'high',
            mandatory: true,
            reason: `Alerta de riesgo: ${riskCategory} (score: ${riskScore})`
        });
    }

    // =========================================================================
    // MÉTODOS AUXILIARES
    // =========================================================================

    /**
     * Busca una capacitación que coincida con categoría y keywords
     */
    static async findMatchingTraining(companyId, category, keywords) {
        const where = { company_id: companyId, status: 'active' };

        if (category) {
            where.category = category;
        }

        const trainings = await Training.findAll({ where });

        if (trainings.length === 0) return null;
        if (trainings.length === 1) return trainings[0];

        // Buscar mejor match por keywords
        let bestMatch = null;
        let bestScore = 0;

        for (const training of trainings) {
            const titleLower = training.title.toLowerCase();
            const descLower = (training.description || '').toLowerCase();
            let score = 0;

            for (const keyword of keywords) {
                if (titleLower.includes(keyword.toLowerCase())) score += 2;
                if (descLower.includes(keyword.toLowerCase())) score += 1;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = training;
            }
        }

        return bestMatch || trainings[0];
    }

    /**
     * Verifica elegibilidad médica del usuario
     */
    static async checkMedicalEligibility(userId, trainingId) {
        try {
            const [result] = await sequelize.query(
                'SELECT check_medical_eligibility($1, $2) as eligibility',
                { bind: [userId, trainingId], type: sequelize.QueryTypes.SELECT }
            );
            return result?.eligibility || { eligible: true };
        } catch (error) {
            console.warn('⚠️ [ECOSYSTEM-HUB] Error verificando elegibilidad médica:', error.message);
            return { eligible: true, reason: 'Verificación no disponible' };
        }
    }

    /**
     * Calcula deadline basado en prioridad
     */
    static calculateDeadline(priority) {
        const daysMap = {
            critical: 3,
            high: 7,
            normal: 30,
            low: 60
        };
        const days = daysMap[priority] || 30;
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + days);
        return deadline;
    }

    /**
     * Log de integración para auditoría
     */
    static async logIntegration(params) {
        try {
            await sequelize.query(`
                INSERT INTO training_integration_log
                (company_id, source_module, source_entity_type, source_entity_id,
                 action, training_id, assignment_id, user_id,
                 success, error_message, metadata, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, {
                bind: [
                    params.companyId,
                    params.sourceModule,
                    params.sourceEntityType,
                    params.sourceEntityId,
                    params.action,
                    params.trainingId || null,
                    params.assignmentId || null,
                    params.userId || null,
                    params.success,
                    params.errorMessage || null,
                    JSON.stringify(params.metadata || {}),
                    params.createdBy || null
                ],
                type: sequelize.QueryTypes.INSERT
            });
        } catch (error) {
            console.warn('⚠️ [ECOSYSTEM-HUB] Error en log de integración:', error.message);
        }
    }

    /**
     * Asigna capacitación preventiva a todos los empleados de un área
     */
    static async assignPreventiveTrainingToArea(params) {
        const { companyId, areaId, accidentId, accidentType, keywords } = params;

        try {
            // Obtener usuarios del área
            const users = await User.findAll({
                where: {
                    company_id: companyId,
                    department_id: areaId,
                    isActive: true
                },
                attributes: ['user_id']
            });

            console.log(`📢 [ECOSYSTEM-HUB] Asignando capacitación preventiva a ${users.length} usuarios del área`);

            for (const user of users) {
                await this.assignFromExternalModule({
                    userId: user.user_id,
                    companyId,
                    sourceModule: 'art',
                    sourceEntityType: 'art_accident_prevention',
                    sourceEntityId: accidentId,
                    keywords,
                    priority: 'high',
                    mandatory: true,
                    reason: `Prevención post-accidente tipo: ${accidentType}`
                });
            }

        } catch (error) {
            console.error('❌ [ECOSYSTEM-HUB] Error asignando al área:', error.message);
        }
    }

    /**
     * Nombre display para módulos
     */
    static getModuleDisplayName(moduleKey) {
        const names = {
            hse: 'Seguridad e Higiene (HSE)',
            medical: 'Exámenes Médicos',
            art: 'Gestión de ART',
            procedures: 'Procedimientos',
            risk_intelligence: 'Risk Intelligence',
            onboarding: 'Inducción',
            manual: 'Asignación Manual'
        };
        return names[moduleKey] || moduleKey;
    }

    // =========================================================================
    // ESTADÍSTICAS Y REPORTES
    // =========================================================================

    /**
     * Obtiene estadísticas de asignaciones por origen
     */
    static async getAssignmentsBySource(companyId) {
        try {
            const results = await sequelize.query(
                'SELECT * FROM get_training_assignments_by_source($1)',
                { bind: [companyId], type: sequelize.QueryTypes.SELECT }
            );
            return results;
        } catch (error) {
            console.error('❌ [ECOSYSTEM-HUB] Error obteniendo estadísticas:', error.message);
            return [];
        }
    }

    /**
     * Obtiene historial de integraciones
     */
    static async getIntegrationHistory(companyId, options = {}) {
        const { sourceModule, limit = 50, offset = 0 } = options;

        let where = 'WHERE company_id = $1';
        const bind = [companyId];

        if (sourceModule) {
            where += ' AND source_module = $2';
            bind.push(sourceModule);
        }

        try {
            const results = await sequelize.query(`
                SELECT * FROM training_integration_log
                ${where}
                ORDER BY created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `, { bind, type: sequelize.QueryTypes.SELECT });

            return results;
        } catch (error) {
            console.error('❌ [ECOSYSTEM-HUB] Error obteniendo historial:', error.message);
            return [];
        }
    }
}

module.exports = TrainingEcosystemHub;
