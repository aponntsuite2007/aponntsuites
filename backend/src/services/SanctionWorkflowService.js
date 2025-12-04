/**
 * SANCTION WORKFLOW SERVICE v2.0
 * Servicio para gestión del workflow multi-etapa de sanciones
 *
 * Flujo: DRAFT → PENDING_LAWYER → PENDING_HR → ACTIVE
 *        ↓
 *      REJECTED / APPEALED / CLOSED
 *
 * @version 2.0
 * @date 2025-12-03
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const crypto = require('crypto');

// ============================================================================
// NOTIFICATION TYPES FOR SANCTIONS
// ============================================================================
const NOTIFICATION_TYPES = {
    SANCTION_PENDING_LEGAL: 'sanction_pending_legal_review',
    SANCTION_PENDING_HR: 'sanction_pending_hr_confirmation',
    SANCTION_APPROVED_LEGAL: 'sanction_approved_by_legal',
    SANCTION_REJECTED_LEGAL: 'sanction_rejected_by_legal',
    SANCTION_ACTIVATED: 'sanction_activated',
    SANCTION_APPEAL_REGISTERED: 'sanction_appeal_registered',
    SANCTION_APPEAL_RESOLVED: 'sanction_appeal_resolved'
};

// Estados del workflow
const WORKFLOW_STATUS = {
    DRAFT: 'draft',
    PENDING_LAWYER: 'pending_lawyer',
    PENDING_HR: 'pending_hr',
    ACTIVE: 'active',
    REJECTED: 'rejected',
    APPEALED: 'appealed',
    CLOSED: 'closed'
};

// Acciones del historial
const HISTORY_ACTIONS = {
    CREATED: 'created',
    SUBMITTED: 'submitted',
    LAWYER_APPROVED: 'lawyer_approved',
    LAWYER_REJECTED: 'lawyer_rejected',
    LAWYER_MODIFIED: 'lawyer_modified',
    HR_CONFIRMED: 'hr_confirmed',
    ACTIVATED: 'activated',
    APPEALED: 'appealed',
    APPEAL_APPROVED: 'appeal_approved',
    APPEAL_DENIED: 'appeal_denied',
    CLOSED: 'closed',
    NOTES_ADDED: 'notes_added'
};

// Severidades disponibles
const SEVERITIES = {
    WARNING: 'warning',
    MINOR: 'minor',
    MAJOR: 'major',
    SEVERE: 'severe',
    TERMINATION: 'termination'
};

// Métodos de entrega
const DELIVERY_METHODS = {
    SYSTEM: 'system',
    EMAIL: 'email',
    CARTA_DOCUMENTO: 'carta_documento',
    PRESENCIAL: 'presencial'
};

class SanctionWorkflowService {

    /**
     * Obtener tipos de sanción disponibles
     * @param {number} companyId - ID de la empresa (null = solo globales)
     */
    static async getSanctionTypes(companyId = null) {
        try {
            const query = `
                SELECT id, code, name, description, category,
                       default_severity, default_points_deducted,
                       requires_legal_review, suspension_days_default,
                       is_system, sort_order
                FROM sanction_types
                WHERE is_active = true
                  AND (company_id IS NULL OR company_id = $1)
                ORDER BY sort_order, name
            `;
            const types = await sequelize.query(query, {
                bind: [companyId],
                type: QueryTypes.SELECT
            });
            return { success: true, types };
        } catch (error) {
            console.error('[SANCTION-WF] Error getting types:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crear tipo de sanción personalizado para empresa
     */
    static async createSanctionType(companyId, typeData) {
        try {
            const {
                code, name, description, category,
                default_severity, default_points_deducted,
                requires_legal_review, suspension_days_default
            } = typeData;

            const query = `
                INSERT INTO sanction_types (
                    company_id, code, name, description, category,
                    default_severity, default_points_deducted,
                    requires_legal_review, suspension_days_default,
                    is_system, is_active, sort_order
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, true, 100)
                RETURNING *
            `;

            const [newType] = await sequelize.query(query, {
                bind: [
                    companyId, code, name, description, category || 'other',
                    default_severity || 'warning', default_points_deducted || 0,
                    requires_legal_review !== false, suspension_days_default || 0
                ],
                type: QueryTypes.INSERT
            });

            return { success: true, type: newType };
        } catch (error) {
            console.error('[SANCTION-WF] Error creating type:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crear nueva solicitud de sanción (DRAFT)
     */
    static async createSanctionRequest(data, requesterId, requesterRole, ipAddress = null) {
        const transaction = await sequelize.transaction();

        try {
            const {
                company_id,
                user_id, // UUID del empleado a sancionar
                sanction_type_id,
                sanction_type, // string fallback
                severity,
                title,
                description,
                suspension_days,
                documents
            } = data;

            // Obtener datos del empleado
            const [employee] = await sequelize.query(`
                SELECT "firstName", "lastName", "employeeId", position, department_id
                FROM users WHERE user_id = $1
            `, {
                bind: [user_id],
                type: QueryTypes.SELECT,
                transaction
            });

            if (!employee) {
                throw new Error('Empleado no encontrado');
            }

            // Obtener tipo de sanción si se especificó
            let sanctionTypeData = null;
            if (sanction_type_id) {
                [sanctionTypeData] = await sequelize.query(`
                    SELECT * FROM sanction_types WHERE id = $1
                `, {
                    bind: [sanction_type_id],
                    type: QueryTypes.SELECT,
                    transaction
                });
            }

            // Determinar si requiere revisión legal
            const requiresLegalReview = sanctionTypeData?.requires_legal_review ?? true;

            // Crear la sanción en estado DRAFT
            const insertQuery = `
                INSERT INTO sanctions (
                    company_id, user_id, employee_id, employee_name, employee_department,
                    sanction_type_id, sanction_type, severity, title, description,
                    original_description, suspension_days, documents,
                    workflow_status, status, requester_id, requester_role,
                    points_deducted, created_by, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    $10, $11, $12,
                    'draft', 'pending', $13, $14,
                    $15, $13, NOW(), NOW()
                )
                RETURNING id
            `;

            const employeeName = `${employee.firstName} ${employee.lastName}`;
            const effectiveSeverity = severity || sanctionTypeData?.default_severity || 'warning';
            const effectivePoints = sanctionTypeData?.default_points_deducted || 0;
            const effectiveSanctionType = sanctionTypeData?.name || sanction_type || 'other';

            const [[result]] = await sequelize.query(insertQuery, {
                bind: [
                    company_id, user_id, employee.employeeId, employeeName, employee.position,
                    sanction_type_id, effectiveSanctionType, effectiveSeverity, title, description,
                    suspension_days || 0, JSON.stringify(documents || []),
                    requesterId, requesterRole,
                    effectivePoints
                ],
                type: QueryTypes.INSERT,
                transaction
            });

            const sanctionId = result.id;

            // Registrar en historial
            await this._logHistory(sanctionId, HISTORY_ACTIONS.CREATED, {
                actor_id: requesterId,
                actor_role: requesterRole,
                new_status: WORKFLOW_STATUS.DRAFT,
                notes: `Solicitud creada para ${employeeName}`,
                metadata: { sanction_type: effectiveSanctionType, severity: effectiveSeverity },
                ip_address: ipAddress
            }, transaction);

            await transaction.commit();

            console.log(`[SANCTION-WF] Sanción #${sanctionId} creada en estado DRAFT`);

            return {
                success: true,
                sanctionId,
                message: 'Solicitud de sanción creada exitosamente',
                requiresLegalReview
            };

        } catch (error) {
            await transaction.rollback();
            console.error('[SANCTION-WF] Error creating sanction:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enviar sanción a revisión (DRAFT → PENDING_LAWYER o PENDING_HR)
     */
    static async submitForReview(sanctionId, actorId, actorRole, companyHasLegalModule = true, ipAddress = null) {
        const transaction = await sequelize.transaction();

        try {
            // Verificar sanción existe y está en draft
            const [sanction] = await sequelize.query(`
                SELECT * FROM sanctions WHERE id = $1 FOR UPDATE
            `, {
                bind: [sanctionId],
                type: QueryTypes.SELECT,
                transaction
            });

            if (!sanction) {
                throw new Error('Sanción no encontrada');
            }

            if (sanction.workflow_status !== WORKFLOW_STATUS.DRAFT) {
                throw new Error(`No se puede enviar a revisión. Estado actual: ${sanction.workflow_status}`);
            }

            // Determinar siguiente estado
            const nextStatus = companyHasLegalModule
                ? WORKFLOW_STATUS.PENDING_LAWYER
                : WORKFLOW_STATUS.PENDING_HR;

            // Actualizar estado
            await sequelize.query(`
                UPDATE sanctions
                SET workflow_status = $1, updated_at = NOW()
                WHERE id = $2
            `, {
                bind: [nextStatus, sanctionId],
                type: QueryTypes.UPDATE,
                transaction
            });

            // Registrar en historial
            await this._logHistory(sanctionId, HISTORY_ACTIONS.SUBMITTED, {
                actor_id: actorId,
                actor_role: actorRole,
                previous_status: WORKFLOW_STATUS.DRAFT,
                new_status: nextStatus,
                notes: companyHasLegalModule
                    ? 'Enviado a revisión legal'
                    : 'Enviado a confirmación RRHH (sin módulo legal)',
                ip_address: ipAddress
            }, transaction);

            await transaction.commit();

            console.log(`[SANCTION-WF] Sanción #${sanctionId} enviada a ${nextStatus}`);

            // === ENVIAR NOTIFICACIÓN ===
            const targetRole = companyHasLegalModule ? 'legal' : 'rrhh';
            const targetUsers = await this._getUsersByRole(sanction.company_id, targetRole);

            for (const user of targetUsers) {
                await this._sendSanctionNotification({
                    companyId: sanction.company_id,
                    sanctionId,
                    notificationType: companyHasLegalModule
                        ? NOTIFICATION_TYPES.SANCTION_PENDING_LEGAL
                        : NOTIFICATION_TYPES.SANCTION_PENDING_HR,
                    recipientId: user.user_id,
                    recipientRole: targetRole,
                    senderId: actorId,
                    senderName: 'Sistema de Sanciones',
                    subject: `🚨 Nueva sanción pendiente de ${companyHasLegalModule ? 'revisión legal' : 'confirmación'}`,
                    content: `Se ha enviado una nueva solicitud de sanción para el empleado ${sanction.employee_name}. Severidad: ${sanction.severity}. Requiere su ${companyHasLegalModule ? 'revisión legal' : 'confirmación'}.`,
                    priority: 'high'
                });
            }

            return {
                success: true,
                newStatus: nextStatus,
                message: companyHasLegalModule
                    ? 'Sanción enviada a revisión legal'
                    : 'Sanción enviada a confirmación de RRHH'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('[SANCTION-WF] Error submitting for review:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Abogado aprueba sanción (PENDING_LAWYER → PENDING_HR)
     */
    static async lawyerApprove(sanctionId, lawyerId, notes, deliveryMethod = 'system', ipAddress = null) {
        const transaction = await sequelize.transaction();

        try {
            const [sanction] = await sequelize.query(`
                SELECT * FROM sanctions WHERE id = $1 FOR UPDATE
            `, {
                bind: [sanctionId],
                type: QueryTypes.SELECT,
                transaction
            });

            if (!sanction) {
                throw new Error('Sanción no encontrada');
            }

            if (sanction.workflow_status !== WORKFLOW_STATUS.PENDING_LAWYER) {
                throw new Error(`Sanción no está pendiente de revisión legal. Estado: ${sanction.workflow_status}`);
            }

            await sequelize.query(`
                UPDATE sanctions
                SET workflow_status = 'pending_hr',
                    lawyer_id = $1,
                    lawyer_review_date = NOW(),
                    lawyer_notes = $2,
                    delivery_method = $3,
                    updated_at = NOW()
                WHERE id = $4
            `, {
                bind: [lawyerId, notes, deliveryMethod, sanctionId],
                type: QueryTypes.UPDATE,
                transaction
            });

            await this._logHistory(sanctionId, HISTORY_ACTIONS.LAWYER_APPROVED, {
                actor_id: lawyerId,
                actor_role: 'legal',
                previous_status: WORKFLOW_STATUS.PENDING_LAWYER,
                new_status: WORKFLOW_STATUS.PENDING_HR,
                notes: notes || 'Aprobado por departamento legal',
                metadata: { delivery_method: deliveryMethod },
                ip_address: ipAddress
            }, transaction);

            await transaction.commit();

            console.log(`[SANCTION-WF] Sanción #${sanctionId} aprobada por legal`);

            // === NOTIFICAR A RRHH ===
            const hrUsers = await this._getUsersByRole(sanction.company_id, 'rrhh');
            for (const user of hrUsers) {
                await this._sendSanctionNotification({
                    companyId: sanction.company_id,
                    sanctionId,
                    notificationType: NOTIFICATION_TYPES.SANCTION_PENDING_HR,
                    recipientId: user.user_id,
                    recipientRole: 'rrhh',
                    senderId: lawyerId,
                    senderName: 'Departamento Legal',
                    subject: '✅ Sanción aprobada por Legal - Pendiente confirmación RRHH',
                    content: `La sanción para ${sanction.employee_name} ha sido aprobada por el departamento legal. Requiere su confirmación para activarse.`,
                    priority: 'high'
                });
            }

            // === NOTIFICAR AL SOLICITANTE ===
            if (sanction.requester_id) {
                await this._sendSanctionNotification({
                    companyId: sanction.company_id,
                    sanctionId,
                    notificationType: NOTIFICATION_TYPES.SANCTION_APPROVED_LEGAL,
                    recipientId: sanction.requester_id,
                    recipientRole: sanction.requester_role || 'employee',
                    senderId: lawyerId,
                    senderName: 'Departamento Legal',
                    subject: '✅ Su solicitud de sanción fue aprobada por Legal',
                    content: `Su solicitud de sanción para ${sanction.employee_name} ha sido aprobada por el departamento legal y está pendiente de confirmación por RRHH.`,
                    priority: 'medium'
                });
            }

            return {
                success: true,
                newStatus: WORKFLOW_STATUS.PENDING_HR,
                message: 'Sanción aprobada por legal. Pendiente de confirmación RRHH.'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('[SANCTION-WF] Error lawyer approve:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Abogado rechaza sanción (PENDING_LAWYER → REJECTED)
     */
    static async lawyerReject(sanctionId, lawyerId, rejectionReason, ipAddress = null) {
        const transaction = await sequelize.transaction();

        try {
            const [sanction] = await sequelize.query(`
                SELECT * FROM sanctions WHERE id = $1 FOR UPDATE
            `, {
                bind: [sanctionId],
                type: QueryTypes.SELECT,
                transaction
            });

            if (!sanction) {
                throw new Error('Sanción no encontrada');
            }

            if (sanction.workflow_status !== WORKFLOW_STATUS.PENDING_LAWYER) {
                throw new Error(`Sanción no está pendiente de revisión legal. Estado: ${sanction.workflow_status}`);
            }

            if (!rejectionReason || rejectionReason.trim().length < 10) {
                throw new Error('Debe proporcionar un motivo de rechazo detallado (mínimo 10 caracteres)');
            }

            await sequelize.query(`
                UPDATE sanctions
                SET workflow_status = 'rejected',
                    status = 'revoked',
                    lawyer_id = $1,
                    lawyer_review_date = NOW(),
                    lawyer_notes = $2,
                    rejection_reason = $2,
                    rejected_by = $1,
                    rejected_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3
            `, {
                bind: [lawyerId, rejectionReason, sanctionId],
                type: QueryTypes.UPDATE,
                transaction
            });

            await this._logHistory(sanctionId, HISTORY_ACTIONS.LAWYER_REJECTED, {
                actor_id: lawyerId,
                actor_role: 'legal',
                previous_status: WORKFLOW_STATUS.PENDING_LAWYER,
                new_status: WORKFLOW_STATUS.REJECTED,
                notes: rejectionReason,
                ip_address: ipAddress
            }, transaction);

            await transaction.commit();

            console.log(`[SANCTION-WF] Sanción #${sanctionId} rechazada por legal`);

            // === NOTIFICAR AL SOLICITANTE ===
            if (sanction.requester_id) {
                await this._sendSanctionNotification({
                    companyId: sanction.company_id,
                    sanctionId,
                    notificationType: NOTIFICATION_TYPES.SANCTION_REJECTED_LEGAL,
                    recipientId: sanction.requester_id,
                    recipientRole: sanction.requester_role || 'employee',
                    senderId: lawyerId,
                    senderName: 'Departamento Legal',
                    subject: '❌ Solicitud de sanción rechazada por Legal',
                    content: `Su solicitud de sanción para ${sanction.employee_name} ha sido rechazada por el departamento legal. Motivo: ${rejectionReason}`,
                    priority: 'high'
                });
            }

            return {
                success: true,
                newStatus: WORKFLOW_STATUS.REJECTED,
                message: 'Sanción rechazada por departamento legal'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('[SANCTION-WF] Error lawyer reject:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Abogado modifica descripción (mantiene original)
     */
    static async lawyerModifyDescription(sanctionId, lawyerId, newDescription, notes, ipAddress = null) {
        const transaction = await sequelize.transaction();

        try {
            const [sanction] = await sequelize.query(`
                SELECT * FROM sanctions WHERE id = $1 FOR UPDATE
            `, {
                bind: [sanctionId],
                type: QueryTypes.SELECT,
                transaction
            });

            if (!sanction) {
                throw new Error('Sanción no encontrada');
            }

            if (sanction.workflow_status !== WORKFLOW_STATUS.PENDING_LAWYER) {
                throw new Error(`Sanción no está pendiente de revisión legal`);
            }

            await sequelize.query(`
                UPDATE sanctions
                SET description = $1,
                    lawyer_modified_description = $1,
                    lawyer_notes = $2,
                    lawyer_id = $3,
                    updated_at = NOW()
                WHERE id = $4
            `, {
                bind: [newDescription, notes, lawyerId, sanctionId],
                type: QueryTypes.UPDATE,
                transaction
            });

            await this._logHistory(sanctionId, HISTORY_ACTIONS.LAWYER_MODIFIED, {
                actor_id: lawyerId,
                actor_role: 'legal',
                previous_status: WORKFLOW_STATUS.PENDING_LAWYER,
                new_status: WORKFLOW_STATUS.PENDING_LAWYER,
                notes: notes || 'Descripción modificada por legal',
                metadata: {
                    original_description: sanction.original_description,
                    new_description: newDescription
                },
                ip_address: ipAddress
            }, transaction);

            await transaction.commit();

            return {
                success: true,
                message: 'Descripción modificada. La versión original se conserva.'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('[SANCTION-WF] Error lawyer modify:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * RRHH confirma sanción (PENDING_HR → ACTIVE)
     */
    static async hrConfirm(sanctionId, hrUserId, suspensionStartDate, hrNotes, ipAddress = null) {
        const transaction = await sequelize.transaction();

        try {
            const [sanction] = await sequelize.query(`
                SELECT * FROM sanctions WHERE id = $1 FOR UPDATE
            `, {
                bind: [sanctionId],
                type: QueryTypes.SELECT,
                transaction
            });

            if (!sanction) {
                throw new Error('Sanción no encontrada');
            }

            if (sanction.workflow_status !== WORKFLOW_STATUS.PENDING_HR) {
                throw new Error(`Sanción no está pendiente de confirmación RRHH. Estado: ${sanction.workflow_status}`);
            }

            // Actualizar con fecha de suspensión si aplica
            const updateFields = [
                "workflow_status = 'active'",
                "status = 'active'",
                "hr_confirmation_id = $1",
                "hr_confirmation_date = NOW()",
                "hr_notes = $2",
                "updated_at = NOW()"
            ];

            const bindings = [hrUserId, hrNotes];
            let bindIndex = 3;

            if (sanction.suspension_days > 0 && suspensionStartDate) {
                updateFields.push(`suspension_start_date = $${bindIndex}`);
                bindings.push(suspensionStartDate);
                bindIndex++;
            }

            bindings.push(sanctionId);

            await sequelize.query(`
                UPDATE sanctions
                SET ${updateFields.join(', ')}
                WHERE id = $${bindIndex}
            `, {
                bind: bindings,
                type: QueryTypes.UPDATE,
                transaction
            });

            await this._logHistory(sanctionId, HISTORY_ACTIONS.ACTIVATED, {
                actor_id: hrUserId,
                actor_role: 'rrhh',
                previous_status: WORKFLOW_STATUS.PENDING_HR,
                new_status: WORKFLOW_STATUS.ACTIVE,
                notes: hrNotes || 'Sanción activada por RRHH',
                metadata: {
                    suspension_start_date: suspensionStartDate,
                    suspension_days: sanction.suspension_days
                },
                ip_address: ipAddress
            }, transaction);

            await transaction.commit();

            console.log(`[SANCTION-WF] Sanción #${sanctionId} activada`);

            // === NOTIFICAR AL EMPLEADO SANCIONADO ===
            await this._sendSanctionNotification({
                companyId: sanction.company_id,
                sanctionId,
                notificationType: NOTIFICATION_TYPES.SANCTION_ACTIVATED,
                recipientId: sanction.user_id,
                recipientRole: 'employee',
                senderId: hrUserId,
                senderName: 'Recursos Humanos',
                subject: '🚨 Se ha aplicado una sanción disciplinaria',
                content: `Se le ha aplicado una sanción disciplinaria: ${sanction.title}. Severidad: ${sanction.severity}.${sanction.suspension_days > 0 ? ` Suspensión de ${sanction.suspension_days} días laborables a partir del ${suspensionStartDate || 'fecha próxima'}.` : ''} Tiene derecho a apelar esta decisión.`,
                priority: 'critical'
            });

            // === NOTIFICAR AL SOLICITANTE ===
            if (sanction.requester_id && sanction.requester_id !== hrUserId) {
                await this._sendSanctionNotification({
                    companyId: sanction.company_id,
                    sanctionId,
                    notificationType: NOTIFICATION_TYPES.SANCTION_ACTIVATED,
                    recipientId: sanction.requester_id,
                    recipientRole: sanction.requester_role || 'employee',
                    senderId: hrUserId,
                    senderName: 'Recursos Humanos',
                    subject: '✅ Sanción activada exitosamente',
                    content: `La sanción que solicitó para ${sanction.employee_name} ha sido activada por RRHH.`,
                    priority: 'medium'
                });
            }

            // === NOTIFICAR AL ABOGADO (si participó) ===
            if (sanction.lawyer_id) {
                await this._sendSanctionNotification({
                    companyId: sanction.company_id,
                    sanctionId,
                    notificationType: NOTIFICATION_TYPES.SANCTION_ACTIVATED,
                    recipientId: sanction.lawyer_id,
                    recipientRole: 'legal',
                    senderId: hrUserId,
                    senderName: 'Recursos Humanos',
                    subject: '✅ Sanción que revisó ha sido activada',
                    content: `La sanción para ${sanction.employee_name} que usted aprobó ha sido confirmada y activada por RRHH.`,
                    priority: 'low'
                });
            }

            return {
                success: true,
                newStatus: WORKFLOW_STATUS.ACTIVE,
                message: 'Sanción activada exitosamente',
                hasSuspension: sanction.suspension_days > 0
            };

        } catch (error) {
            await transaction.rollback();
            console.error('[SANCTION-WF] Error HR confirm:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Registrar apelación del empleado
     */
    static async registerAppeal(sanctionId, employeeId, appealNotes, ipAddress = null) {
        const transaction = await sequelize.transaction();

        try {
            const [sanction] = await sequelize.query(`
                SELECT * FROM sanctions WHERE id = $1 AND user_id = $2 FOR UPDATE
            `, {
                bind: [sanctionId, employeeId],
                type: QueryTypes.SELECT,
                transaction
            });

            if (!sanction) {
                throw new Error('Sanción no encontrada o no pertenece al empleado');
            }

            if (sanction.workflow_status !== WORKFLOW_STATUS.ACTIVE) {
                throw new Error('Solo se pueden apelar sanciones activas');
            }

            await sequelize.query(`
                UPDATE sanctions
                SET workflow_status = 'appealed',
                    status = 'appealed',
                    appeal_notes = $1,
                    appeal_date = NOW(),
                    appeal_status = 'pending',
                    updated_at = NOW()
                WHERE id = $2
            `, {
                bind: [appealNotes, sanctionId],
                type: QueryTypes.UPDATE,
                transaction
            });

            await this._logHistory(sanctionId, HISTORY_ACTIONS.APPEALED, {
                actor_id: employeeId,
                actor_role: 'employee',
                previous_status: WORKFLOW_STATUS.ACTIVE,
                new_status: WORKFLOW_STATUS.APPEALED,
                notes: appealNotes,
                ip_address: ipAddress
            }, transaction);

            await transaction.commit();

            // === NOTIFICAR A RRHH ===
            const hrUsers = await this._getUsersByRole(sanction.company_id, 'rrhh');
            for (const user of hrUsers) {
                await this._sendSanctionNotification({
                    companyId: sanction.company_id,
                    sanctionId,
                    notificationType: NOTIFICATION_TYPES.SANCTION_APPEAL_REGISTERED,
                    recipientId: user.user_id,
                    recipientRole: 'rrhh',
                    senderId: employeeId,
                    senderName: sanction.employee_name,
                    subject: '📨 Nueva apelación de sanción recibida',
                    content: `El empleado ${sanction.employee_name} ha apelado la sanción "${sanction.title}". Motivo de apelación: ${appealNotes}`,
                    priority: 'high'
                });
            }

            // === NOTIFICAR A LEGAL (si participó) ===
            if (sanction.lawyer_id) {
                await this._sendSanctionNotification({
                    companyId: sanction.company_id,
                    sanctionId,
                    notificationType: NOTIFICATION_TYPES.SANCTION_APPEAL_REGISTERED,
                    recipientId: sanction.lawyer_id,
                    recipientRole: 'legal',
                    senderId: employeeId,
                    senderName: sanction.employee_name,
                    subject: '📨 Apelación recibida - Sanción que revisó',
                    content: `El empleado ${sanction.employee_name} ha apelado la sanción que usted revisó. Motivo: ${appealNotes}`,
                    priority: 'medium'
                });
            }

            return {
                success: true,
                newStatus: WORKFLOW_STATUS.APPEALED,
                message: 'Apelación registrada exitosamente'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('[SANCTION-WF] Error register appeal:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Resolver apelación
     */
    static async resolveAppeal(sanctionId, resolverId, approved, resolutionNotes, ipAddress = null) {
        const transaction = await sequelize.transaction();

        try {
            const [sanction] = await sequelize.query(`
                SELECT * FROM sanctions WHERE id = $1 FOR UPDATE
            `, {
                bind: [sanctionId],
                type: QueryTypes.SELECT,
                transaction
            });

            if (!sanction) {
                throw new Error('Sanción no encontrada');
            }

            if (sanction.workflow_status !== WORKFLOW_STATUS.APPEALED) {
                throw new Error('La sanción no está en estado de apelación');
            }

            const newStatus = approved ? WORKFLOW_STATUS.CLOSED : WORKFLOW_STATUS.ACTIVE;
            const sanctionStatus = approved ? 'revoked' : 'active';
            const appealStatus = approved ? 'approved' : 'denied';

            await sequelize.query(`
                UPDATE sanctions
                SET workflow_status = $1,
                    status = $2,
                    appeal_status = $3,
                    appeal_resolved_by = $4,
                    appeal_resolved_at = NOW(),
                    appeal_resolution = $5,
                    updated_at = NOW()
                WHERE id = $6
            `, {
                bind: [newStatus, sanctionStatus, appealStatus, resolverId, resolutionNotes, sanctionId],
                type: QueryTypes.UPDATE,
                transaction
            });

            // Si la apelación fue aprobada, desactivar bloqueo de suspensión
            if (approved) {
                await sequelize.query(`
                    UPDATE suspension_blocks
                    SET is_active = false,
                        deactivated_at = NOW(),
                        deactivated_by = $1,
                        notes = 'Desactivado por apelación aprobada'
                    WHERE sanction_id = $2 AND is_active = true
                `, {
                    bind: [resolverId, sanctionId],
                    type: QueryTypes.UPDATE,
                    transaction
                });
            }

            const action = approved ? HISTORY_ACTIONS.APPEAL_APPROVED : HISTORY_ACTIONS.APPEAL_DENIED;
            await this._logHistory(sanctionId, action, {
                actor_id: resolverId,
                actor_role: 'admin',
                previous_status: WORKFLOW_STATUS.APPEALED,
                new_status: newStatus,
                notes: resolutionNotes,
                ip_address: ipAddress
            }, transaction);

            await transaction.commit();

            // === NOTIFICAR AL EMPLEADO ===
            await this._sendSanctionNotification({
                companyId: sanction.company_id,
                sanctionId,
                notificationType: NOTIFICATION_TYPES.SANCTION_APPEAL_RESOLVED,
                recipientId: sanction.user_id,
                recipientRole: 'employee',
                senderId: resolverId,
                senderName: 'Recursos Humanos',
                subject: approved
                    ? '✅ Su apelación ha sido aceptada'
                    : '❌ Su apelación ha sido rechazada',
                content: approved
                    ? `Su apelación de la sanción "${sanction.title}" ha sido aceptada. La sanción ha sido revocada.`
                    : `Su apelación de la sanción "${sanction.title}" ha sido rechazada. Motivo: ${resolutionNotes}. La sanción continúa activa.`,
                priority: 'critical'
            });

            return {
                success: true,
                approved,
                newStatus,
                message: approved
                    ? 'Apelación aprobada. Sanción revocada.'
                    : 'Apelación denegada. Sanción continúa activa.'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('[SANCTION-WF] Error resolve appeal:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener sanciones pendientes de revisión para un usuario
     */
    static async getPendingReviews(userId, userRole, companyId) {
        try {
            let statusFilter = '';
            if (userRole === 'legal') {
                statusFilter = "AND workflow_status = 'pending_lawyer'";
            } else if (['rrhh', 'admin'].includes(userRole)) {
                statusFilter = "AND workflow_status IN ('pending_hr', 'appealed')";
            }

            const query = `
                SELECT s.*,
                       st.name as sanction_type_name,
                       st.category as sanction_category,
                       u."firstName" || ' ' || u."lastName" as employee_full_name,
                       u.email as employee_email,
                       req."firstName" || ' ' || req."lastName" as requester_name
                FROM sanctions s
                LEFT JOIN sanction_types st ON st.id = s.sanction_type_id
                LEFT JOIN users u ON u.user_id = s.user_id
                LEFT JOIN users req ON req.user_id = s.requester_id
                WHERE s.company_id = $1
                ${statusFilter}
                ORDER BY s.created_at DESC
            `;

            const sanctions = await sequelize.query(query, {
                bind: [companyId],
                type: QueryTypes.SELECT
            });

            return { success: true, sanctions };

        } catch (error) {
            console.error('[SANCTION-WF] Error getting pending reviews:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener historial disciplinario de un empleado
     */
    static async getEmployeeDisciplinaryHistory(employeeId, companyId) {
        try {
            const history = await sequelize.query(`
                SELECT * FROM get_employee_disciplinary_history($1, $2)
            `, {
                bind: [employeeId, companyId],
                type: QueryTypes.SELECT
            });

            // Contar totales por severidad
            const stats = {
                total: history.length,
                active: history.filter(h => h.is_active).length,
                by_severity: {
                    warning: history.filter(h => h.severity === 'warning').length,
                    minor: history.filter(h => h.severity === 'minor').length,
                    major: history.filter(h => h.severity === 'major').length,
                    severe: history.filter(h => h.severity === 'severe').length
                },
                total_suspension_days: history.reduce((sum, h) => sum + (h.suspension_days || 0), 0),
                total_points_deducted: history.reduce((sum, h) => sum + (h.points_deducted || 0), 0)
            };

            return { success: true, history, stats };

        } catch (error) {
            console.error('[SANCTION-WF] Error getting disciplinary history:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener historial de una sanción específica
     */
    static async getSanctionHistory(sanctionId) {
        try {
            const history = await sequelize.query(`
                SELECT sh.*,
                       u."firstName" || ' ' || u."lastName" as actor_name
                FROM sanction_history sh
                LEFT JOIN users u ON u.user_id = sh.actor_id
                WHERE sh.sanction_id = $1
                ORDER BY sh.created_at ASC
            `, {
                bind: [sanctionId],
                type: QueryTypes.SELECT
            });

            return { success: true, history };

        } catch (error) {
            console.error('[SANCTION-WF] Error getting sanction history:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener estadísticas de sanciones
     */
    static async getSanctionStats(companyId, periodDays = 30) {
        try {
            const [stats] = await sequelize.query(`
                SELECT * FROM get_sanction_stats($1, $2)
            `, {
                bind: [companyId, periodDays],
                type: QueryTypes.SELECT
            });

            return { success: true, stats };

        } catch (error) {
            console.error('[SANCTION-WF] Error getting stats:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener detalle completo de una sanción
     */
    static async getSanctionDetail(sanctionId, companyId) {
        try {
            const [sanction] = await sequelize.query(`
                SELECT s.*,
                       st.name as sanction_type_name,
                       st.category as sanction_category,
                       st.description as sanction_type_description,
                       u."firstName" || ' ' || u."lastName" as employee_full_name,
                       u.email as employee_email,
                       u."employeeId" as employee_code,
                       u.position as employee_position,
                       req."firstName" || ' ' || req."lastName" as requester_name,
                       law."firstName" || ' ' || law."lastName" as lawyer_name,
                       hr."firstName" || ' ' || hr."lastName" as hr_name
                FROM sanctions s
                LEFT JOIN sanction_types st ON st.id = s.sanction_type_id
                LEFT JOIN users u ON u.user_id = s.user_id
                LEFT JOIN users req ON req.user_id = s.requester_id
                LEFT JOIN users law ON law.user_id = s.lawyer_id
                LEFT JOIN users hr ON hr.user_id = s.hr_confirmation_id
                WHERE s.id = $1 AND s.company_id = $2
            `, {
                bind: [sanctionId, companyId],
                type: QueryTypes.SELECT
            });

            if (!sanction) {
                return { success: false, error: 'Sanción no encontrada' };
            }

            // Obtener historial
            const historyResult = await this.getSanctionHistory(sanctionId);

            return {
                success: true,
                sanction,
                history: historyResult.success ? historyResult.history : []
            };

        } catch (error) {
            console.error('[SANCTION-WF] Error getting sanction detail:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================================================
    // NOTIFICATION INTEGRATION
    // ========================================================================

    /**
     * Enviar notificación del sistema de sanciones
     * @private
     */
    static async _sendSanctionNotification(options) {
        const {
            companyId,
            sanctionId,
            notificationType,
            recipientId,
            recipientRole,
            senderId,
            senderName,
            subject,
            content,
            priority = 'high',
            metadata = {},
            transaction = null
        } = options;

        try {
            // Crear grupo de notificación si no existe para esta sanción
            let groupId;

            // Buscar grupo existente para esta sanción
            const [existingGroup] = await sequelize.query(`
                SELECT id FROM notification_groups
                WHERE company_id = $1
                  AND group_type = 'sanction_workflow'
                  AND metadata->>'sanction_id' = $2
                LIMIT 1
            `, {
                bind: [companyId, sanctionId.toString()],
                type: QueryTypes.SELECT,
                transaction
            });

            if (existingGroup) {
                groupId = existingGroup.id;
            } else {
                // Crear nuevo grupo
                const [[newGroup]] = await sequelize.query(`
                    INSERT INTO notification_groups (
                        company_id, group_type, initiator_type, initiator_id,
                        subject, status, priority, metadata, created_at
                    ) VALUES (
                        $1, 'sanction_workflow', 'system', $2,
                        $3, 'active', $4,
                        $5::jsonb, NOW()
                    )
                    RETURNING id
                `, {
                    bind: [
                        companyId,
                        senderId,
                        subject,
                        priority,
                        JSON.stringify({ sanction_id: sanctionId, notification_type: notificationType })
                    ],
                    type: QueryTypes.INSERT,
                    transaction
                });
                groupId = newGroup.id;
            }

            // Obtener siguiente número de secuencia
            const [[seqResult]] = await sequelize.query(`
                SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
                FROM notification_messages WHERE group_id = $1
            `, {
                bind: [groupId],
                type: QueryTypes.SELECT,
                transaction
            });

            const sequenceNumber = seqResult.next_seq;

            // Generar hash del mensaje
            const messageHash = crypto
                .createHash('sha256')
                .update(`${groupId}-${sequenceNumber}-${content}-${Date.now()}`)
                .digest('hex')
                .substring(0, 32);

            // Crear mensaje de notificación
            await sequelize.query(`
                INSERT INTO notification_messages (
                    group_id, sequence_number,
                    sender_type, sender_id, sender_name,
                    recipient_type, recipient_id,
                    message_type, subject, content,
                    requires_response, channels, message_hash,
                    created_at, delivered_at
                ) VALUES (
                    $1, $2,
                    'system', $3, $4,
                    $5, $6,
                    $7, $8, $9,
                    false, '["system", "email"]'::jsonb, $10,
                    NOW(), NOW()
                )
            `, {
                bind: [
                    groupId, sequenceNumber,
                    senderId, senderName,
                    recipientRole, recipientId,
                    notificationType, subject, content,
                    messageHash
                ],
                type: QueryTypes.INSERT,
                transaction
            });

            console.log(`[SANCTION-NOTIF] Notificación enviada: ${notificationType} → ${recipientRole}`);

            return { success: true, groupId };

        } catch (error) {
            console.error('[SANCTION-NOTIF] Error enviando notificación:', error);
            // No fallar el workflow por error de notificación
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener usuarios por rol para notificaciones
     * @private
     */
    static async _getUsersByRole(companyId, role, transaction = null) {
        try {
            const users = await sequelize.query(`
                SELECT user_id, "firstName", "lastName", email
                FROM users
                WHERE company_id = $1
                  AND role = $2
                  AND is_active = true
                LIMIT 10
            `, {
                bind: [companyId, role],
                type: QueryTypes.SELECT,
                transaction
            });
            return users;
        } catch (error) {
            console.error('[SANCTION-NOTIF] Error getting users by role:', error);
            return [];
        }
    }

    /**
     * Registrar entrada en historial
     * @private
     */
    static async _logHistory(sanctionId, action, data, transaction = null) {
        const {
            actor_id, actor_role, previous_status, new_status,
            notes, metadata, ip_address
        } = data;

        // Obtener nombre del actor
        let actorName = null;
        if (actor_id) {
            const [actor] = await sequelize.query(`
                SELECT "firstName" || ' ' || "lastName" as name FROM users WHERE user_id = $1
            `, {
                bind: [actor_id],
                type: QueryTypes.SELECT,
                transaction
            });
            actorName = actor?.name;
        }

        await sequelize.query(`
            INSERT INTO sanction_history (
                sanction_id, action, actor_id, actor_name, actor_role,
                previous_status, new_status, notes, metadata, ip_address, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `, {
            bind: [
                sanctionId, action, actor_id, actorName, actor_role,
                previous_status, new_status, notes,
                JSON.stringify(metadata || {}), ip_address
            ],
            type: QueryTypes.INSERT,
            transaction
        });
    }
}

// Exportar constantes también
SanctionWorkflowService.WORKFLOW_STATUS = WORKFLOW_STATUS;
SanctionWorkflowService.HISTORY_ACTIONS = HISTORY_ACTIONS;
SanctionWorkflowService.SEVERITIES = SEVERITIES;
SanctionWorkflowService.DELIVERY_METHODS = DELIVERY_METHODS;

module.exports = SanctionWorkflowService;
