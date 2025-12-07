/**
 * LegalWorkflowService.js
 * Gestiona el workflow completo de casos legales
 *
 * Etapas del workflow:
 * 1. PREJUDICIAL: Intimaciones, cartas documento, negociaciones previas
 * 2. MEDIACION: Mediacion/conciliacion obligatoria (segun jurisdiccion)
 * 3. JUDICIAL: Proceso judicial completo
 * 4. APELACION: Recursos de apelacion
 * 5. EJECUCION: Ejecucion de sentencia
 * 6. CERRADO: Caso finalizado
 *
 * Cada etapa tiene sub-estados especificos
 * Sistema multi-jurisdiccion: la jurisdiccion se obtiene automaticamente de la sucursal
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const LegalCase360Service = require('./LegalCase360Service');
const LegalOllamaService = require('./LegalOllamaService');
const LegalJurisdictionService = require('./LegalJurisdictionService');

class LegalWorkflowService {

    // Definicion de etapas y sub-estados
    static STAGES = {
        prejudicial: {
            name: 'Prejudicial',
            order: 1,
            sub_statuses: [
                { code: 'initial_review', name: 'Revision inicial', next: ['intimation_sent'] },
                { code: 'intimation_sent', name: 'Intimacion enviada', next: ['intimation_received', 'negotiation'] },
                { code: 'intimation_received', name: 'Intimacion recibida', next: ['response_analysis', 'negotiation'] },
                { code: 'carta_documento_sent', name: 'Carta documento enviada', next: ['carta_documento_received'] },
                { code: 'carta_documento_received', name: 'Carta documento recibida', next: ['response_analysis'] },
                { code: 'response_analysis', name: 'Analisis de respuesta', next: ['negotiation', 'mediation_required'] },
                { code: 'negotiation', name: 'Negociacion en curso', next: ['settlement_reached', 'mediation_required'] },
                { code: 'settlement_reached', name: 'Acuerdo alcanzado', next: [] },
                { code: 'mediation_required', name: 'Mediacion requerida', next: [] }
            ],
            transitions_to: ['mediation', 'closed']
        },
        mediation: {
            name: 'Mediacion',
            order: 2,
            sub_statuses: [
                { code: 'mediation_initiated', name: 'Mediacion iniciada', next: ['first_hearing_scheduled'] },
                { code: 'first_hearing_scheduled', name: 'Primera audiencia programada', next: ['first_hearing_held'] },
                { code: 'first_hearing_held', name: 'Primera audiencia realizada', next: ['subsequent_hearings', 'agreement_reached', 'mediation_failed'] },
                { code: 'subsequent_hearings', name: 'Audiencias posteriores', next: ['agreement_reached', 'mediation_failed'] },
                { code: 'agreement_reached', name: 'Acuerdo alcanzado', next: [] },
                { code: 'mediation_failed', name: 'Mediacion fracasada', next: [] }
            ],
            transitions_to: ['judicial', 'closed']
        },
        judicial: {
            name: 'Judicial',
            order: 3,
            sub_statuses: [
                { code: 'lawsuit_filed', name: 'Demanda presentada', next: ['notification_received'] },
                { code: 'notification_received', name: 'Notificacion recibida', next: ['response_preparation'] },
                { code: 'response_preparation', name: 'Preparacion contestacion', next: ['response_filed'] },
                { code: 'response_filed', name: 'Contestacion presentada', next: ['discovery_phase'] },
                { code: 'discovery_phase', name: 'Etapa probatoria', next: ['evidence_closed'] },
                { code: 'evidence_closed', name: 'Cierre de prueba', next: ['arguments_phase'] },
                { code: 'arguments_phase', name: 'Alegatos', next: ['awaiting_sentence'] },
                { code: 'awaiting_sentence', name: 'Esperando sentencia', next: ['first_instance_sentence'] },
                { code: 'first_instance_sentence', name: 'Sentencia primera instancia', next: ['sentence_final', 'appeal_decision'] },
                { code: 'appeal_decision', name: 'Evaluando apelacion', next: [] },
                { code: 'sentence_final', name: 'Sentencia firme', next: [] }
            ],
            transitions_to: ['appeal', 'execution', 'closed']
        },
        appeal: {
            name: 'Apelacion',
            order: 4,
            sub_statuses: [
                { code: 'appeal_filed', name: 'Recurso presentado', next: ['appeal_transferred'] },
                { code: 'appeal_transferred', name: 'Traslado corrido', next: ['appeal_response'] },
                { code: 'appeal_response', name: 'Respuesta al recurso', next: ['appeal_resolution'] },
                { code: 'appeal_resolution', name: 'Resolucion de Camara', next: [] }
            ],
            transitions_to: ['judicial', 'execution', 'closed']
        },
        execution: {
            name: 'Ejecucion',
            order: 5,
            sub_statuses: [
                { code: 'liquidation', name: 'Liquidacion', next: ['liquidation_approved'] },
                { code: 'liquidation_approved', name: 'Liquidacion aprobada', next: ['payment_pending'] },
                { code: 'payment_pending', name: 'Pago pendiente', next: ['payment_made'] },
                { code: 'payment_made', name: 'Pago realizado', next: ['case_closure'] },
                { code: 'embargo', name: 'Embargo', next: ['payment_made'] },
                { code: 'case_closure', name: 'Cierre de causa', next: [] }
            ],
            transitions_to: ['closed']
        },
        closed: {
            name: 'Cerrado',
            order: 6,
            sub_statuses: [
                { code: 'favorable', name: 'Resolucion favorable', next: [] },
                { code: 'unfavorable', name: 'Resolucion desfavorable', next: [] },
                { code: 'settlement', name: 'Acuerdo/Conciliacion', next: [] },
                { code: 'withdrawal', name: 'Desistimiento', next: [] },
                { code: 'dismissal', name: 'Rechazo de demanda', next: [] },
                { code: 'prescription', name: 'Prescripcion', next: [] }
            ],
            transitions_to: []
        }
    };

    /**
     * Crea un nuevo caso legal
     */
    static async createCase(caseData, context) {
        const { companyId, userId } = context;

        try {
            // Generar expediente 360 del empleado automaticamente
            const employee360 = await LegalCase360Service.generateFullDossier(
                caseData.employee_id,
                companyId
            );

            // Obtener jurisdicción automáticamente de la empresa/sucursal si no se especifica
            let jurisdictionCode = caseData.jurisdiction_code;
            let jurisdiction = caseData.jurisdiction;
            let currency = caseData.currency;

            if (!jurisdictionCode || !jurisdiction) {
                const companyJurisdiction = await LegalJurisdictionService.getJurisdictionForCompany(sequelize, companyId);
                if (companyJurisdiction) {
                    jurisdictionCode = jurisdictionCode || companyJurisdiction.countryCode;
                    jurisdiction = jurisdiction || companyJurisdiction.countryName;
                    // Obtener moneda del país si no se especificó
                    if (!currency && companyJurisdiction.countryCode) {
                        currency = LegalJurisdictionService.getCurrencyForCountry(companyJurisdiction.countryCode);
                    }
                }
            }

            // Obtener datos del empleado para snapshot
            const employeeInfo = employee360.personal || {};
            const employmentInfo = employee360.employment || {};

            // Insertar caso
            const [result] = await sequelize.query(`
                INSERT INTO legal_cases (
                    company_id, case_type, employee_id,
                    employee_name, employee_position, employee_department,
                    employee_hire_date, employee_termination_date,
                    title, description, claimed_amount, currency,
                    jurisdiction, jurisdiction_code,
                    plaintiff_lawyer, defendant_lawyer_id,
                    current_stage, current_sub_status,
                    priority, risk_assessment, estimated_exposure,
                    incident_date, notification_date, filing_date,
                    employee_360_snapshot,
                    created_by, assigned_to,
                    tags
                ) VALUES (
                    :companyId, :caseType, :employeeId,
                    :employeeName, :employeePosition, :employeeDepartment,
                    :hireDate, :terminationDate,
                    :title, :description, :claimedAmount, :currency,
                    :jurisdiction, :jurisdictionCode,
                    :plaintiffLawyer, :defendantLawyerId,
                    'prejudicial', 'initial_review',
                    :priority, :riskAssessment, :estimatedExposure,
                    :incidentDate, :notificationDate, :filingDate,
                    :employee360Snapshot,
                    :createdBy, :assignedTo,
                    :tags
                )
                RETURNING id, case_number
            `, {
                replacements: {
                    companyId,
                    caseType: caseData.case_type,
                    employeeId: caseData.employee_id,
                    employeeName: employeeInfo.name || caseData.employee_name,
                    employeePosition: employmentInfo.position || caseData.employee_position,
                    employeeDepartment: employmentInfo.department_name || caseData.employee_department,
                    hireDate: employmentInfo.hire_date,
                    terminationDate: employmentInfo.termination_date,
                    title: caseData.title,
                    description: caseData.description,
                    claimedAmount: caseData.claimed_amount,
                    currency: currency || null,
                    jurisdiction: jurisdiction || null,
                    jurisdictionCode: jurisdictionCode || null,
                    plaintiffLawyer: caseData.plaintiff_lawyer,
                    defendantLawyerId: caseData.defendant_lawyer_id || userId,
                    priority: caseData.priority || 'normal',
                    riskAssessment: caseData.risk_assessment,
                    estimatedExposure: caseData.estimated_exposure,
                    incidentDate: caseData.incident_date,
                    notificationDate: caseData.notification_date,
                    filingDate: caseData.filing_date,
                    employee360Snapshot: JSON.stringify(employee360),
                    createdBy: userId,
                    assignedTo: caseData.assigned_to || userId,
                    tags: caseData.tags || []
                },
                type: QueryTypes.INSERT
            });

            const caseId = result[0]?.id;
            const caseNumber = result[0]?.case_number;

            // Crear etapa inicial
            await this.createStage(caseId, 'prejudicial', 'initial_review', {
                description: 'Caso creado - Revision inicial',
                recorded_by: userId
            });

            // Crear evento en timeline
            await this.addTimelineEvent(caseId, {
                event_type: 'stage_change',
                title: 'Caso creado',
                description: `Nuevo expediente legal creado: ${caseData.title}`,
                event_date: new Date(),
                importance: 'high',
                is_milestone: true,
                created_by: userId
            });

            // Crear notificacion en sistema central
            await this.createCaseNotification(caseId, caseNumber, caseData, companyId, userId);

            // Si Ollama esta disponible, generar analisis inicial
            if (await LegalOllamaService.isAvailable()) {
                const fullCase = await this.getCaseById(caseId, companyId);
                LegalOllamaService.analyzeRisk(fullCase, employee360).catch(err => {
                    console.error('[LegalWorkflow] Error en analisis IA:', err.message);
                });
            }

            return {
                success: true,
                case_id: caseId,
                case_number: caseNumber,
                employee_360: employee360
            };

        } catch (error) {
            console.error('[LegalWorkflow] Error creando caso:', error);
            throw error;
        }
    }

    /**
     * Avanza el caso a la siguiente etapa
     */
    static async advanceStage(caseId, newStage, subStatus, data, context) {
        const { companyId, userId } = context;

        try {
            // Verificar que la transicion es valida
            const currentCase = await this.getCaseById(caseId, companyId);
            if (!currentCase) {
                throw new Error('Caso no encontrado');
            }

            const currentStageConfig = this.STAGES[currentCase.current_stage];
            if (!currentStageConfig.transitions_to.includes(newStage)) {
                throw new Error(`No se puede transicionar de ${currentCase.current_stage} a ${newStage}`);
            }

            // Cerrar etapa actual
            await sequelize.query(`
                UPDATE legal_case_stages
                SET end_date = NOW(),
                    outcome = :outcome,
                    outcome_details = :outcomeDetails,
                    updated_at = NOW()
                WHERE case_id = :caseId
                  AND stage = :currentStage
                  AND end_date IS NULL
            `, {
                replacements: {
                    caseId,
                    currentStage: currentCase.current_stage,
                    outcome: data.outcome || 'completed',
                    outcomeDetails: data.outcome_details
                },
                type: QueryTypes.UPDATE
            });

            // Actualizar caso
            await sequelize.query(`
                UPDATE legal_cases
                SET current_stage = :newStage,
                    current_sub_status = :subStatus,
                    updated_at = NOW()
                WHERE id = :caseId AND company_id = :companyId
            `, {
                replacements: { caseId, companyId, newStage, subStatus },
                type: QueryTypes.UPDATE
            });

            // Crear nueva etapa
            await this.createStage(caseId, newStage, subStatus, {
                description: data.description,
                notes: data.notes,
                recorded_by: userId
            });

            // Agregar evento a timeline
            await this.addTimelineEvent(caseId, {
                event_type: 'stage_change',
                title: `Avance a etapa: ${this.STAGES[newStage].name}`,
                description: data.description || `El caso avanza de ${currentCase.current_stage} a ${newStage}`,
                event_date: new Date(),
                importance: 'high',
                is_milestone: true,
                created_by: userId
            });

            // Notificacion de cambio de etapa
            await this.createStageChangeNotification(caseId, currentCase, newStage, companyId);

            return {
                success: true,
                previous_stage: currentCase.current_stage,
                new_stage: newStage,
                sub_status: subStatus
            };

        } catch (error) {
            console.error('[LegalWorkflow] Error avanzando etapa:', error);
            throw error;
        }
    }

    /**
     * Actualiza el sub-estado dentro de una etapa
     */
    static async updateSubStatus(caseId, newSubStatus, data, context) {
        const { companyId, userId } = context;

        try {
            const currentCase = await this.getCaseById(caseId, companyId);
            if (!currentCase) {
                throw new Error('Caso no encontrado');
            }

            // Verificar que el sub-estado es valido para la etapa actual
            const stageConfig = this.STAGES[currentCase.current_stage];
            const validSubStatuses = stageConfig.sub_statuses.map(s => s.code);

            if (!validSubStatuses.includes(newSubStatus)) {
                throw new Error(`Sub-estado ${newSubStatus} no valido para etapa ${currentCase.current_stage}`);
            }

            // Actualizar
            await sequelize.query(`
                UPDATE legal_cases
                SET current_sub_status = :newSubStatus,
                    updated_at = NOW()
                WHERE id = :caseId AND company_id = :companyId
            `, {
                replacements: { caseId, companyId, newSubStatus },
                type: QueryTypes.UPDATE
            });

            // Actualizar etapa actual
            await sequelize.query(`
                UPDATE legal_case_stages
                SET sub_status = :newSubStatus,
                    notes = COALESCE(:notes, notes),
                    updated_at = NOW()
                WHERE case_id = :caseId
                  AND stage = :currentStage
                  AND end_date IS NULL
            `, {
                replacements: {
                    caseId,
                    currentStage: currentCase.current_stage,
                    newSubStatus,
                    notes: data.notes
                },
                type: QueryTypes.UPDATE
            });

            // Agregar evento a timeline
            const subStatusName = stageConfig.sub_statuses.find(s => s.code === newSubStatus)?.name || newSubStatus;
            await this.addTimelineEvent(caseId, {
                event_type: 'status_change',
                title: `Estado actualizado: ${subStatusName}`,
                description: data.description,
                event_date: new Date(),
                importance: 'normal',
                created_by: userId
            });

            return {
                success: true,
                stage: currentCase.current_stage,
                previous_sub_status: currentCase.current_sub_status,
                new_sub_status: newSubStatus
            };

        } catch (error) {
            console.error('[LegalWorkflow] Error actualizando sub-estado:', error);
            throw error;
        }
    }

    /**
     * Crea una nueva etapa
     */
    static async createStage(caseId, stage, subStatus, data) {
        // Obtener orden
        const [existingStages] = await sequelize.query(`
            SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_order
            FROM legal_case_stages
            WHERE case_id = :caseId
        `, { replacements: { caseId }, type: QueryTypes.SELECT });

        await sequelize.query(`
            INSERT INTO legal_case_stages (
                case_id, stage, sub_status, description, notes,
                start_date, recorded_by, sequence_order
            ) VALUES (
                :caseId, :stage, :subStatus, :description, :notes,
                NOW(), :recordedBy, :sequenceOrder
            )
        `, {
            replacements: {
                caseId,
                stage,
                subStatus,
                description: data.description,
                notes: data.notes,
                recordedBy: data.recorded_by,
                sequenceOrder: existingStages.next_order
            },
            type: QueryTypes.INSERT
        });
    }

    /**
     * Agrega evento a la linea de tiempo
     */
    static async addTimelineEvent(caseId, eventData) {
        const [result] = await sequelize.query(`
            INSERT INTO legal_case_timeline_events (
                case_id, stage_id, event_type, title, description,
                event_date, importance, is_milestone, is_public,
                document_id, metadata, created_by
            ) VALUES (
                :caseId,
                (SELECT id FROM legal_case_stages WHERE case_id = :caseId AND end_date IS NULL ORDER BY id DESC LIMIT 1),
                :eventType, :title, :description,
                :eventDate, :importance, :isMilestone, :isPublic,
                :documentId, :metadata, :createdBy
            )
            RETURNING id
        `, {
            replacements: {
                caseId,
                eventType: eventData.event_type,
                title: eventData.title,
                description: eventData.description,
                eventDate: eventData.event_date || new Date(),
                importance: eventData.importance || 'normal',
                isMilestone: eventData.is_milestone || false,
                isPublic: eventData.is_public !== false,
                documentId: eventData.document_id,
                metadata: JSON.stringify(eventData.metadata || {}),
                createdBy: eventData.created_by
            },
            type: QueryTypes.INSERT
        });

        return result[0]?.id;
    }

    /**
     * Agrega un documento al caso
     */
    static async addDocument(caseId, documentData, context) {
        const { companyId, userId } = context;

        try {
            const [result] = await sequelize.query(`
                INSERT INTO legal_case_documents (
                    case_id, stage_id, document_type,
                    file_name, file_path, file_size, mime_type,
                    document_date, document_number,
                    title, description, source,
                    is_confidential, is_original, is_certified,
                    uploaded_by
                ) VALUES (
                    :caseId,
                    (SELECT id FROM legal_case_stages WHERE case_id = :caseId AND end_date IS NULL ORDER BY id DESC LIMIT 1),
                    :documentType,
                    :fileName, :filePath, :fileSize, :mimeType,
                    :documentDate, :documentNumber,
                    :title, :description, :source,
                    :isConfidential, :isOriginal, :isCertified,
                    :uploadedBy
                )
                RETURNING id
            `, {
                replacements: {
                    caseId,
                    documentType: documentData.document_type,
                    fileName: documentData.file_name,
                    filePath: documentData.file_path,
                    fileSize: documentData.file_size,
                    mimeType: documentData.mime_type,
                    documentDate: documentData.document_date,
                    documentNumber: documentData.document_number,
                    title: documentData.title,
                    description: documentData.description,
                    source: documentData.source || 'internal',
                    isConfidential: documentData.is_confidential || false,
                    isOriginal: documentData.is_original || false,
                    isCertified: documentData.is_certified || false,
                    uploadedBy: userId
                },
                type: QueryTypes.INSERT
            });

            const documentId = result[0]?.id;

            // Agregar evento a timeline
            await this.addTimelineEvent(caseId, {
                event_type: 'document_filed',
                title: `Documento agregado: ${documentData.title}`,
                description: `Tipo: ${documentData.document_type}`,
                event_date: new Date(),
                importance: 'normal',
                document_id: documentId,
                created_by: userId
            });

            return { success: true, document_id: documentId };

        } catch (error) {
            console.error('[LegalWorkflow] Error agregando documento:', error);
            throw error;
        }
    }

    /**
     * Crea un vencimiento/deadline
     */
    static async createDeadline(caseId, deadlineData, context) {
        const { companyId, userId } = context;

        try {
            const [result] = await sequelize.query(`
                INSERT INTO legal_deadlines (
                    case_id, stage_id, company_id, deadline_type,
                    title, description, due_date, reminder_date,
                    alert_days_before, priority,
                    assigned_to, notify_users, created_by
                ) VALUES (
                    :caseId,
                    (SELECT id FROM legal_case_stages WHERE case_id = :caseId AND end_date IS NULL ORDER BY id DESC LIMIT 1),
                    :companyId, :deadlineType,
                    :title, :description, :dueDate, :reminderDate,
                    :alertDaysBefore, :priority,
                    :assignedTo, :notifyUsers, :createdBy
                )
                RETURNING id
            `, {
                replacements: {
                    caseId,
                    companyId,
                    deadlineType: deadlineData.deadline_type,
                    title: deadlineData.title,
                    description: deadlineData.description,
                    dueDate: deadlineData.due_date,
                    reminderDate: deadlineData.reminder_date,
                    alertDaysBefore: deadlineData.alert_days_before || 3,
                    priority: deadlineData.priority || 'normal',
                    assignedTo: deadlineData.assigned_to || userId,
                    notifyUsers: deadlineData.notify_users || [],
                    createdBy: userId
                },
                type: QueryTypes.INSERT
            });

            const deadlineId = result[0]?.id;

            // Agregar evento a timeline
            await this.addTimelineEvent(caseId, {
                event_type: 'deadline_set',
                title: `Vencimiento establecido: ${deadlineData.title}`,
                description: `Fecha limite: ${deadlineData.due_date}`,
                event_date: new Date(),
                importance: deadlineData.priority === 'critical' ? 'critical' : 'high',
                created_by: userId
            });

            // Crear notificacion
            await this.createDeadlineNotification(caseId, deadlineId, deadlineData, companyId);

            return { success: true, deadline_id: deadlineId };

        } catch (error) {
            console.error('[LegalWorkflow] Error creando vencimiento:', error);
            throw error;
        }
    }

    /**
     * Obtiene caso por ID
     */
    static async getCaseById(caseId, companyId) {
        const [result] = await sequelize.query(`
            SELECT * FROM legal_cases
            WHERE id = :caseId AND company_id = :companyId
        `, {
            replacements: { caseId, companyId },
            type: QueryTypes.SELECT
        });
        return result;
    }

    /**
     * Obtiene timeline completo del caso
     */
    static async getCaseTimeline(caseId, companyId) {
        return await sequelize.query(`
            SELECT
                lte.*,
                lcd.file_name as document_file_name,
                lcd.document_type
            FROM legal_case_timeline_events lte
            LEFT JOIN legal_case_documents lcd ON lte.document_id = lcd.id
            JOIN legal_cases lc ON lte.case_id = lc.id
            WHERE lte.case_id = :caseId
              AND lc.company_id = :companyId
            ORDER BY lte.event_date DESC
        `, {
            replacements: { caseId, companyId },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Obtiene documentos del caso
     */
    static async getCaseDocuments(caseId, companyId) {
        return await sequelize.query(`
            SELECT lcd.*
            FROM legal_case_documents lcd
            JOIN legal_cases lc ON lcd.case_id = lc.id
            WHERE lcd.case_id = :caseId
              AND lc.company_id = :companyId
            ORDER BY lcd.document_date DESC, lcd.created_at DESC
        `, {
            replacements: { caseId, companyId },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Obtiene vencimientos del caso
     */
    static async getCaseDeadlines(caseId, companyId, status = null) {
        const whereStatus = status ? 'AND ld.status = :status' : '';

        return await sequelize.query(`
            SELECT ld.*,
                   EXTRACT(DAY FROM ld.due_date - NOW())::INTEGER as days_remaining
            FROM legal_deadlines ld
            WHERE ld.case_id = :caseId
              AND ld.company_id = :companyId
              ${whereStatus}
            ORDER BY ld.due_date ASC
        `, {
            replacements: { caseId, companyId, status },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Obtiene estadisticas del dashboard
     */
    static async getDashboardStats(companyId) {
        const [stats] = await sequelize.query(`
            SELECT * FROM get_legal_dashboard_stats(:companyId)
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        return stats;
    }

    /**
     * Cierra un caso
     */
    static async closeCase(caseId, resolutionData, context) {
        const { companyId, userId } = context;

        try {
            await sequelize.query(`
                UPDATE legal_cases
                SET current_stage = 'closed',
                    current_sub_status = :resolutionType,
                    resolution_type = :resolutionType,
                    resolution_amount = :resolutionAmount,
                    resolution_date = :resolutionDate,
                    resolution_summary = :resolutionSummary,
                    is_active = FALSE,
                    closed_at = NOW(),
                    updated_at = NOW()
                WHERE id = :caseId AND company_id = :companyId
            `, {
                replacements: {
                    caseId,
                    companyId,
                    resolutionType: resolutionData.resolution_type,
                    resolutionAmount: resolutionData.resolution_amount,
                    resolutionDate: resolutionData.resolution_date || new Date(),
                    resolutionSummary: resolutionData.resolution_summary
                },
                type: QueryTypes.UPDATE
            });

            // Cerrar etapa actual
            await sequelize.query(`
                UPDATE legal_case_stages
                SET end_date = NOW(),
                    outcome = :resolutionType,
                    outcome_details = :resolutionSummary
                WHERE case_id = :caseId AND end_date IS NULL
            `, {
                replacements: {
                    caseId,
                    resolutionType: resolutionData.resolution_type,
                    resolutionSummary: resolutionData.resolution_summary
                },
                type: QueryTypes.UPDATE
            });

            // Crear etapa de cierre
            await this.createStage(caseId, 'closed', resolutionData.resolution_type, {
                description: resolutionData.resolution_summary,
                recorded_by: userId
            });

            // Agregar evento final a timeline
            await this.addTimelineEvent(caseId, {
                event_type: 'stage_change',
                title: `Caso cerrado: ${resolutionData.resolution_type}`,
                description: resolutionData.resolution_summary,
                event_date: new Date(),
                importance: 'critical',
                is_milestone: true,
                created_by: userId
            });

            // Cancelar vencimientos pendientes
            await sequelize.query(`
                UPDATE legal_deadlines
                SET status = 'cancelled', updated_at = NOW()
                WHERE case_id = :caseId AND status = 'pending'
            `, {
                replacements: { caseId },
                type: QueryTypes.UPDATE
            });

            return { success: true };

        } catch (error) {
            console.error('[LegalWorkflow] Error cerrando caso:', error);
            throw error;
        }
    }

    // =============== NOTIFICACIONES ===============

    /**
     * Crea notificacion al crear caso
     */
    static async createCaseNotification(caseId, caseNumber, caseData, companyId, userId) {
        try {
            await sequelize.query(`
                INSERT INTO notification_groups (
                    company_id, notification_type, title, priority,
                    source_module, source_reference, metadata, status
                ) VALUES (
                    :companyId, 'legal_case_created', :title, 'high',
                    'legal', :sourceRef, :metadata, 'pending'
                )
            `, {
                replacements: {
                    companyId,
                    title: `Nuevo expediente legal: ${caseNumber}`,
                    sourceRef: `case_${caseId}`,
                    metadata: JSON.stringify({
                        case_id: caseId,
                        case_number: caseNumber,
                        case_type: caseData.case_type,
                        employee_id: caseData.employee_id
                    })
                },
                type: QueryTypes.INSERT
            });
        } catch (error) {
            console.error('[LegalWorkflow] Error creando notificacion:', error.message);
        }
    }

    /**
     * Crea notificacion de cambio de etapa
     */
    static async createStageChangeNotification(caseId, currentCase, newStage, companyId) {
        try {
            await sequelize.query(`
                INSERT INTO notification_groups (
                    company_id, notification_type, title, priority,
                    source_module, source_reference, metadata, status
                ) VALUES (
                    :companyId, 'legal_stage_change', :title, 'normal',
                    'legal', :sourceRef, :metadata, 'pending'
                )
            `, {
                replacements: {
                    companyId,
                    title: `Caso ${currentCase.case_number} avanza a ${this.STAGES[newStage].name}`,
                    sourceRef: `case_${caseId}`,
                    metadata: JSON.stringify({
                        case_id: caseId,
                        case_number: currentCase.case_number,
                        previous_stage: currentCase.current_stage,
                        new_stage: newStage
                    })
                },
                type: QueryTypes.INSERT
            });
        } catch (error) {
            console.error('[LegalWorkflow] Error creando notificacion de etapa:', error.message);
        }
    }

    /**
     * Crea notificacion de vencimiento
     */
    static async createDeadlineNotification(caseId, deadlineId, deadlineData, companyId) {
        try {
            const caseInfo = await this.getCaseById(caseId, companyId);

            await sequelize.query(`
                INSERT INTO notification_groups (
                    company_id, notification_type, title, priority,
                    source_module, source_reference, deadline, metadata, status
                ) VALUES (
                    :companyId, 'legal_deadline', :title, :priority,
                    'legal', :sourceRef, :deadline, :metadata, 'pending'
                )
            `, {
                replacements: {
                    companyId,
                    title: `Vencimiento: ${deadlineData.title} (${caseInfo?.case_number || caseId})`,
                    priority: deadlineData.priority || 'normal',
                    sourceRef: `deadline_${deadlineId}`,
                    deadline: deadlineData.due_date,
                    metadata: JSON.stringify({
                        case_id: caseId,
                        deadline_id: deadlineId,
                        deadline_type: deadlineData.deadline_type
                    })
                },
                type: QueryTypes.INSERT
            });
        } catch (error) {
            console.error('[LegalWorkflow] Error creando notificacion de vencimiento:', error.message);
        }
    }
}

module.exports = LegalWorkflowService;
