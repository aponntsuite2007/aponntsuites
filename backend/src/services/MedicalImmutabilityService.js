/**
 * MedicalImmutabilityService
 * Servicio central para manejo de inmutabilidad de registros médicos
 *
 * Funcionalidades:
 * - Firma digital SHA-256 para validez legal
 * - Control de ventanas de edición (48h inicial, 24h post-autorización)
 * - Bloqueo automático de registros expirados
 * - Workflow de autorización vía notificaciones proactivas
 * - Auditoria completa append-only
 *
 * Cumple: Ley 19.587, Decreto 351/79, Res. SRT 37/10, 43/97, 905/15
 */

const crypto = require('crypto');
const {
    MedicalRecord,
    MedicalExamTemplate,
    MedicalEditAuthorization,
    MedicalRecordAuditLog,
    User,
    Company,
    Notification,
    sequelize
} = require('../config/database');
const { Op } = require('sequelize');

// 🔥 NCE: Central Telefónica de Notificaciones (elimina bypass)
const NCE = require('./NotificationCentralExchange');

class MedicalImmutabilityService {
    // Configuración de ventanas temporales
    static EDIT_WINDOW_HOURS = 48; // Ventana inicial de edición
    static AUTHORIZATION_WINDOW_HOURS = 24; // Ventana post-autorización
    static STEP1_TIMEOUT_HOURS = 48; // Timeout para RRHH
    static STEP2_TIMEOUT_HOURS = 24; // Timeout para Supervisor

    /**
     * Crea un nuevo registro médico con firma digital
     * @param {Object} data - Datos del registro
     * @param {Object} context - Contexto (userId, companyId, ipAddress, userAgent)
     * @returns {Object} Registro creado
     */
    static async createRecord(data, context) {
        const transaction = await sequelize.transaction();

        try {
            const now = new Date();

            // Calcular fecha de expiración si hay template
            let expirationDate = data.expiration_date;
            if (data.template_id && !expirationDate) {
                const template = await MedicalExamTemplate.findByPk(data.template_id);
                if (template && template.validity_days) {
                    const examDate = new Date(data.exam_date);
                    expirationDate = new Date(examDate.getTime() + template.validity_days * 24 * 60 * 60 * 1000);
                }
            }

            // Crear registro
            const record = await MedicalRecord.create({
                company_id: context.companyId,
                employee_id: data.employee_id,
                record_type: data.record_type,
                template_id: data.template_id || null,
                title: data.title,
                description: data.description,
                exam_date: data.exam_date,
                expiration_date: expirationDate,
                result: data.result || 'pendiente',
                result_details: data.result_details,
                observations: data.observations,
                restrictions: data.restrictions || [],
                attachments: data.attachments || [],
                completed_studies: data.completed_studies || [],
                submitted_documents: data.submitted_documents || [],
                created_by: context.userId,
                // editable_until se calcula automáticamente en el hook
            }, { transaction });

            // Generar firma digital
            const signature = this.generateSignature(record);
            record.digital_signature = signature;
            record.signature_timestamp = now;
            record.signature_data = this.getSignatureData(record);
            record.signed_by = context.userId;
            await record.save({ transaction });

            // Registrar en audit log
            await MedicalRecordAuditLog.create({
                company_id: context.companyId,
                record_id: record.id,
                record_type: record.record_type,
                action: 'created',
                action_by: context.userId,
                action_by_name: context.userName || 'Usuario',
                action_by_role: context.userRole || 'medico',
                new_values: record.toJSON(),
                ip_address: context.ipAddress,
                user_agent: context.userAgent,
                notes: 'Registro médico creado con firma digital'
            }, { transaction });

            await transaction.commit();

            console.log(`✅ [MEDICAL] Registro médico creado: ID=${record.id}, Empleado=${data.employee_id}`);

            return {
                success: true,
                record: record,
                signature: signature,
                editableUntil: record.editable_until,
                message: 'Registro médico creado exitosamente'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [MEDICAL] Error creando registro:', error);
            throw error;
        }
    }

    /**
     * Verifica si un registro es editable
     * @param {number} recordId - ID del registro
     * @param {number} userId - ID del usuario
     * @returns {Object} Estado de editabilidad
     */
    static async checkEditability(recordId, userId = null) {
        const record = await MedicalRecord.findByPk(recordId);

        if (!record) {
            return {
                editable: false,
                reason: 'Registro no encontrado',
                code: 'NOT_FOUND'
            };
        }

        if (record.is_deleted) {
            return {
                editable: false,
                reason: 'Registro eliminado',
                code: 'DELETED'
            };
        }

        const now = new Date();

        // Verificar ventana de edición normal
        if (!record.is_locked && record.editable_until && new Date(record.editable_until) > now) {
            const remainingMs = new Date(record.editable_until) - now;
            const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
            const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

            return {
                editable: true,
                reason: 'Dentro de ventana de edición',
                code: 'EDIT_WINDOW',
                editableUntil: record.editable_until,
                remainingTime: `${remainingHours}h ${remainingMinutes}m`,
                remainingMs,
                requiresAuthorization: false
            };
        }

        // Verificar si hay autorización activa
        const authorization = await MedicalEditAuthorization.findOne({
            where: {
                record_id: recordId,
                status: 'approved',
                window_used: false,
                authorization_window_end: { [Op.gt]: now },
                ...(userId ? { requested_by: userId } : {})
            },
            order: [['authorized_at', 'DESC']]
        });

        if (authorization) {
            const windowEnd = new Date(authorization.authorization_window_end);
            const remainingMs = windowEnd - now;
            const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
            const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

            return {
                editable: true,
                reason: 'Autorización activa',
                code: 'AUTHORIZATION_ACTIVE',
                authorizationId: authorization.id,
                windowEnd: authorization.authorization_window_end,
                remainingTime: `${remainingHours}h ${remainingMinutes}m`,
                remainingMs,
                requiresAuthorization: false,
                actionType: authorization.action_type
            };
        }

        // Registro bloqueado
        return {
            editable: false,
            reason: 'Registro bloqueado - requiere autorización',
            code: 'LOCKED',
            lockedAt: record.locked_at,
            lockedReason: record.locked_reason,
            requiresAuthorization: true
        };
    }

    /**
     * Actualiza un registro médico
     * @param {number} recordId - ID del registro
     * @param {Object} updates - Campos a actualizar
     * @param {Object} context - Contexto (userId, companyId, ipAddress)
     * @returns {Object} Resultado de la actualización
     */
    static async updateRecord(recordId, updates, context) {
        const transaction = await sequelize.transaction();

        try {
            const editability = await this.checkEditability(recordId, context.userId);

            if (!editability.editable) {
                return {
                    success: false,
                    error: editability.reason,
                    code: editability.code,
                    requiresAuthorization: editability.requiresAuthorization
                };
            }

            const record = await MedicalRecord.findByPk(recordId, { transaction });
            const oldValues = record.toJSON();

            // Campos que se pueden actualizar
            const allowedFields = [
                'title', 'description', 'exam_date', 'expiration_date',
                'result', 'result_details', 'observations', 'restrictions',
                'attachments', 'completed_studies', 'submitted_documents'
            ];

            // Aplicar actualizaciones
            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    record[field] = updates[field];
                }
            }

            // Actualizar contadores
            record.edit_count = (record.edit_count || 0) + 1;
            record.last_edited_by = context.userId;
            record.last_edited_at = new Date();
            record.version = (record.version || 1) + 1;

            // Re-firmar el registro
            record.digital_signature = this.generateSignature(record);
            record.signature_timestamp = new Date();
            record.signature_data = this.getSignatureData(record);
            record.signed_by = context.userId;

            await record.save({ transaction });

            // Si usó autorización, marcarla como usada
            if (editability.code === 'AUTHORIZATION_ACTIVE' && editability.authorizationId) {
                await MedicalEditAuthorization.update({
                    window_used: true,
                    window_used_at: new Date(),
                    window_action_performed: 'edited'
                }, {
                    where: { id: editability.authorizationId },
                    transaction
                });
            }

            // Registrar en audit log
            await MedicalRecordAuditLog.create({
                company_id: context.companyId,
                record_id: record.id,
                record_type: record.record_type,
                action: 'edited',
                action_by: context.userId,
                action_by_name: context.userName || 'Usuario',
                action_by_role: context.userRole || 'medico',
                old_values: oldValues,
                new_values: record.toJSON(),
                ip_address: context.ipAddress,
                user_agent: context.userAgent,
                authorization_id: editability.authorizationId || null,
                notes: editability.authorizationId
                    ? 'Edición con autorización'
                    : 'Edición en ventana normal'
            }, { transaction });

            await transaction.commit();

            console.log(`✅ [MEDICAL] Registro actualizado: ID=${record.id}, Edición #${record.edit_count}`);

            return {
                success: true,
                record: record,
                editCount: record.edit_count,
                message: 'Registro actualizado exitosamente'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [MEDICAL] Error actualizando registro:', error);
            throw error;
        }
    }

    /**
     * Solicita autorización para editar/eliminar un registro bloqueado
     * @param {number} recordId - ID del registro
     * @param {Object} requestData - Datos de la solicitud
     * @param {Object} context - Contexto
     * @returns {Object} Autorización creada
     */
    static async requestAuthorization(recordId, requestData, context) {
        const transaction = await sequelize.transaction();

        try {
            const record = await MedicalRecord.findByPk(recordId, {
                include: [{ model: User, as: 'employee', attributes: ['user_id', 'name', 'email'] }],
                transaction
            });

            if (!record) {
                throw new Error('Registro no encontrado');
            }

            // Verificar que el registro está bloqueado
            const editability = await this.checkEditability(recordId, context.userId);
            if (editability.editable && editability.code !== 'AUTHORIZATION_ACTIVE') {
                return {
                    success: false,
                    error: 'El registro aún es editable, no requiere autorización',
                    code: 'NOT_REQUIRED'
                };
            }

            // Verificar si ya hay una solicitud pendiente
            const existingRequest = await MedicalEditAuthorization.findOne({
                where: {
                    record_id: recordId,
                    requested_by: context.userId,
                    status: { [Op.in]: ['pending', 'escalated'] }
                },
                transaction
            });

            if (existingRequest) {
                return {
                    success: false,
                    error: 'Ya existe una solicitud pendiente para este registro',
                    code: 'ALREADY_REQUESTED',
                    existingRequest: existingRequest.id
                };
            }

            // Crear solicitud de autorización
            const now = new Date();
            const authorization = await MedicalEditAuthorization.create({
                company_id: context.companyId,
                record_id: recordId,
                record_type: record.record_type,
                requested_by: context.userId,
                request_reason: requestData.reason,
                action_type: requestData.action_type || 'edit',
                proposed_changes: requestData.proposed_changes || null,
                priority: requestData.priority || 'normal',
                status: 'pending',
                current_step: 1,
                expires_at: new Date(now.getTime() + (this.STEP1_TIMEOUT_HOURS + this.STEP2_TIMEOUT_HOURS) * 60 * 60 * 1000),
                audit_trail: [{
                    timestamp: now.toISOString(),
                    action: 'created',
                    user_id: context.userId,
                    user_name: context.userName || 'Usuario',
                    details: { reason: requestData.reason }
                }]
            }, { transaction });

            // Crear notificación proactiva para RRHH
            const notificationResult = await this.createAuthorizationNotification(
                authorization,
                record,
                context,
                transaction
            );

            if (notificationResult.notification_id) {
                authorization.notification_id = notificationResult.notification_id;
                authorization.notification_group_id = notificationResult.group_id;
                await authorization.save({ transaction });
            }

            // Registrar en audit log del registro
            await MedicalRecordAuditLog.create({
                company_id: context.companyId,
                record_id: recordId,
                record_type: record.record_type,
                action: 'authorization_requested',
                action_by: context.userId,
                action_by_name: context.userName || 'Usuario',
                action_by_role: context.userRole || 'medico',
                authorization_id: authorization.id,
                ip_address: context.ipAddress,
                user_agent: context.userAgent,
                notes: `Solicitud de ${requestData.action_type}: ${requestData.reason.substring(0, 100)}...`
            }, { transaction });

            await transaction.commit();

            console.log(`✅ [MEDICAL] Autorización solicitada: Auth=${authorization.id}, Record=${recordId}`);

            return {
                success: true,
                authorization: authorization,
                notificationSent: !!notificationResult.notification_id,
                message: 'Solicitud de autorización enviada a RRHH'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [MEDICAL] Error solicitando autorización:', error);
            throw error;
        }
    }

    /**
     * Aprueba una solicitud de autorización
     * @param {number} authorizationId - ID de la autorización
     * @param {Object} approvalData - Datos de aprobación
     * @param {Object} context - Contexto
     * @returns {Object} Resultado
     */
    static async approveAuthorization(authorizationId, approvalData, context) {
        const transaction = await sequelize.transaction();

        try {
            const authorization = await MedicalEditAuthorization.findByPk(authorizationId, {
                include: [
                    { model: MedicalRecord, as: 'record' },
                    { model: User, as: 'requestor', attributes: ['user_id', 'name', 'email'] }
                ],
                transaction
            });

            if (!authorization) {
                throw new Error('Autorización no encontrada');
            }

            if (!['pending', 'escalated'].includes(authorization.status)) {
                return {
                    success: false,
                    error: `La autorización ya fue procesada (${authorization.status})`,
                    code: 'ALREADY_PROCESSED'
                };
            }

            const now = new Date();

            // Actualizar autorización
            authorization.status = 'approved';
            authorization.authorized_by = context.userId;
            authorization.authorized_at = now;
            authorization.authorization_response = approvalData.response || '';
            authorization.authorization_window_start = now;
            authorization.authorization_window_end = new Date(
                now.getTime() + this.AUTHORIZATION_WINDOW_HOURS * 60 * 60 * 1000
            );

            // Agregar al audit trail
            const trail = authorization.audit_trail || [];
            trail.push({
                timestamp: now.toISOString(),
                action: 'approved',
                user_id: context.userId,
                user_name: context.userName || 'RRHH',
                details: { response: approvalData.response }
            });
            authorization.audit_trail = trail;

            await authorization.save({ transaction });

            // Notificar al médico solicitante
            await this.notifyRequestorApproved(authorization, context, transaction);

            // Registrar en audit log del registro
            await MedicalRecordAuditLog.create({
                company_id: authorization.company_id,
                record_id: authorization.record_id,
                record_type: authorization.record_type,
                action: 'authorization_approved',
                action_by: context.userId,
                action_by_name: context.userName || 'RRHH',
                action_by_role: context.userRole || 'rrhh',
                authorization_id: authorization.id,
                ip_address: context.ipAddress,
                user_agent: context.userAgent,
                notes: `Autorización aprobada. Ventana: ${this.AUTHORIZATION_WINDOW_HOURS}h`
            }, { transaction });

            await transaction.commit();

            console.log(`✅ [MEDICAL] Autorización aprobada: Auth=${authorizationId}, Ventana hasta ${authorization.authorization_window_end}`);

            return {
                success: true,
                authorization: authorization,
                windowEnd: authorization.authorization_window_end,
                windowHours: this.AUTHORIZATION_WINDOW_HOURS,
                message: `Autorización aprobada. El solicitante tiene ${this.AUTHORIZATION_WINDOW_HOURS} horas para realizar la acción.`
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [MEDICAL] Error aprobando autorización:', error);
            throw error;
        }
    }

    /**
     * Rechaza una solicitud de autorización
     */
    static async rejectAuthorization(authorizationId, rejectionData, context) {
        const transaction = await sequelize.transaction();

        try {
            const authorization = await MedicalEditAuthorization.findByPk(authorizationId, {
                include: [
                    { model: MedicalRecord, as: 'record' },
                    { model: User, as: 'requestor', attributes: ['user_id', 'name', 'email'] }
                ],
                transaction
            });

            if (!authorization) {
                throw new Error('Autorización no encontrada');
            }

            if (!['pending', 'escalated'].includes(authorization.status)) {
                return {
                    success: false,
                    error: `La autorización ya fue procesada (${authorization.status})`,
                    code: 'ALREADY_PROCESSED'
                };
            }

            const now = new Date();

            authorization.status = 'rejected';
            authorization.authorized_by = context.userId;
            authorization.authorized_at = now;
            authorization.authorization_response = rejectionData.response || 'Solicitud rechazada';

            const trail = authorization.audit_trail || [];
            trail.push({
                timestamp: now.toISOString(),
                action: 'rejected',
                user_id: context.userId,
                user_name: context.userName || 'RRHH',
                details: { response: rejectionData.response }
            });
            authorization.audit_trail = trail;

            await authorization.save({ transaction });

            // Notificar al médico
            await this.notifyRequestorRejected(authorization, context, transaction);

            // Registrar en audit log
            await MedicalRecordAuditLog.create({
                company_id: authorization.company_id,
                record_id: authorization.record_id,
                record_type: authorization.record_type,
                action: 'authorization_rejected',
                action_by: context.userId,
                action_by_name: context.userName || 'RRHH',
                action_by_role: context.userRole || 'rrhh',
                authorization_id: authorization.id,
                ip_address: context.ipAddress,
                user_agent: context.userAgent,
                notes: `Autorización rechazada: ${(rejectionData.response || '').substring(0, 100)}`
            }, { transaction });

            await transaction.commit();

            console.log(`✅ [MEDICAL] Autorización rechazada: Auth=${authorizationId}`);

            return {
                success: true,
                authorization: authorization,
                message: 'Autorización rechazada'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [MEDICAL] Error rechazando autorización:', error);
            throw error;
        }
    }

    /**
     * Soft delete de un registro médico
     */
    static async softDeleteRecord(recordId, deleteData, context) {
        const transaction = await sequelize.transaction();

        try {
            const editability = await this.checkEditability(recordId, context.userId);

            if (!editability.editable) {
                return {
                    success: false,
                    error: editability.reason,
                    code: editability.code,
                    requiresAuthorization: editability.requiresAuthorization
                };
            }

            // Si hay autorización activa, verificar que sea para delete
            if (editability.authorizationId) {
                const auth = await MedicalEditAuthorization.findByPk(editability.authorizationId);
                if (auth && auth.action_type !== 'delete') {
                    return {
                        success: false,
                        error: 'La autorización activa es para edición, no para eliminación',
                        code: 'WRONG_ACTION_TYPE'
                    };
                }
            }

            const record = await MedicalRecord.findByPk(recordId, { transaction });
            const oldValues = record.toJSON();

            record.is_deleted = true;
            record.deleted_at = new Date();
            record.deleted_by = context.userId;
            record.deletion_reason = deleteData.reason;
            record.deletion_authorized_by = editability.authorizationId
                ? (await MedicalEditAuthorization.findByPk(editability.authorizationId))?.authorized_by
                : null;
            record.deletion_authorization_id = editability.authorizationId || null;

            await record.save({ transaction });

            // Marcar autorización como usada
            if (editability.authorizationId) {
                await MedicalEditAuthorization.update({
                    window_used: true,
                    window_used_at: new Date(),
                    window_action_performed: 'deleted'
                }, {
                    where: { id: editability.authorizationId },
                    transaction
                });
            }

            // Audit log
            await MedicalRecordAuditLog.create({
                company_id: context.companyId,
                record_id: recordId,
                record_type: record.record_type,
                action: 'deleted',
                action_by: context.userId,
                action_by_name: context.userName || 'Usuario',
                action_by_role: context.userRole || 'medico',
                old_values: oldValues,
                authorization_id: editability.authorizationId || null,
                ip_address: context.ipAddress,
                user_agent: context.userAgent,
                notes: `Eliminación: ${deleteData.reason}`
            }, { transaction });

            await transaction.commit();

            console.log(`✅ [MEDICAL] Registro eliminado (soft): ID=${recordId}`);

            return {
                success: true,
                message: 'Registro eliminado exitosamente'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [MEDICAL] Error eliminando registro:', error);
            throw error;
        }
    }

    /**
     * Bloquea registros con ventana de edición expirada (cron job)
     */
    static async lockExpiredRecords() {
        const transaction = await sequelize.transaction();

        try {
            const now = new Date();

            const [affectedCount] = await MedicalRecord.update({
                is_locked: true,
                locked_at: now,
                locked_reason: 'Ventana de edición expirada (automático)'
            }, {
                where: {
                    is_locked: false,
                    is_deleted: false,
                    editable_until: { [Op.lt]: now }
                },
                transaction
            });

            if (affectedCount > 0) {
                console.log(`🔒 [MEDICAL] ${affectedCount} registros bloqueados automáticamente`);
            }

            await transaction.commit();

            return { locked: affectedCount };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [MEDICAL] Error en bloqueo automático:', error);
            throw error;
        }
    }

    /**
     * Escala autorizaciones sin respuesta (cron job)
     */
    static async escalateTimedOutAuthorizations() {
        const now = new Date();
        const step1Timeout = new Date(now.getTime() - this.STEP1_TIMEOUT_HOURS * 60 * 60 * 1000);
        const step2Timeout = new Date(now.getTime() - this.STEP2_TIMEOUT_HOURS * 60 * 60 * 1000);

        let escalated = 0;
        let expired = 0;

        // Escalar step 1 → step 2
        const toEscalate = await MedicalEditAuthorization.findAll({
            where: {
                status: 'pending',
                current_step: 1,
                requested_at: { [Op.lt]: step1Timeout }
            }
        });

        for (const auth of toEscalate) {
            auth.status = 'escalated';
            auth.current_step = 2;
            auth.escalated_at = now;
            auth.escalation_reason = 'Timeout: RRHH no respondió en 48 horas';

            const trail = auth.audit_trail || [];
            trail.push({
                timestamp: now.toISOString(),
                action: 'escalated',
                user_id: 0,
                user_name: 'SYSTEM',
                details: { reason: 'Timeout RRHH' }
            });
            auth.audit_trail = trail;

            await auth.save();
            escalated++;

            // TODO: Notificar a supervisor
        }

        // Expirar step 2 sin respuesta
        const toExpire = await MedicalEditAuthorization.findAll({
            where: {
                status: 'escalated',
                current_step: 2,
                escalated_at: { [Op.lt]: step2Timeout }
            }
        });

        for (const auth of toExpire) {
            auth.status = 'expired';

            const trail = auth.audit_trail || [];
            trail.push({
                timestamp: now.toISOString(),
                action: 'expired',
                user_id: 0,
                user_name: 'SYSTEM',
                details: { reason: 'Timeout en todos los niveles' }
            });
            auth.audit_trail = trail;

            await auth.save();
            expired++;
        }

        if (escalated > 0 || expired > 0) {
            console.log(`⏰ [MEDICAL] Autorizaciones: ${escalated} escaladas, ${expired} expiradas`);
        }

        return { escalated, expired };
    }

    /**
     * Expira ventanas de autorización no utilizadas (cron job)
     */
    static async expireUnusedWindows() {
        const now = new Date();

        const [affectedCount] = await MedicalEditAuthorization.update({
            window_action_performed: 'expired_unused'
        }, {
            where: {
                status: 'approved',
                window_used: false,
                authorization_window_end: { [Op.lt]: now }
            }
        });

        if (affectedCount > 0) {
            console.log(`⏰ [MEDICAL] ${affectedCount} ventanas de autorización expiradas sin uso`);
        }

        return { expired: affectedCount };
    }

    // ==================== MÉTODOS AUXILIARES ====================

    /**
     * Genera firma digital SHA-256
     */
    static generateSignature(record) {
        const dataToSign = JSON.stringify(this.getSignatureData(record));
        return crypto.createHash('sha256').update(dataToSign).digest('hex');
    }

    /**
     * Obtiene los datos que se incluyen en la firma
     */
    static getSignatureData(record) {
        return {
            id: record.id,
            company_id: record.company_id,
            employee_id: record.employee_id,
            record_type: record.record_type,
            title: record.title,
            description: record.description || '',
            exam_date: record.exam_date,
            result: record.result || '',
            created_at: record.created_at,
            created_by: record.created_by
        };
    }

    /**
     * Verifica la integridad de la firma
     */
    static verifySignature(record) {
        if (!record.digital_signature || !record.signature_data) {
            return { valid: false, reason: 'Sin firma' };
        }

        const expectedSignature = crypto
            .createHash('sha256')
            .update(JSON.stringify(record.signature_data))
            .digest('hex');

        return {
            valid: record.digital_signature === expectedSignature,
            reason: record.digital_signature === expectedSignature
                ? 'Firma válida'
                : 'Firma inválida - datos modificados'
        };
    }

    /**
     * Crea notificación proactiva para RRHH
     */
    static async createAuthorizationNotification(authorization, record, context, transaction) {
        try {
            // Buscar usuarios RRHH de la empresa
            const rhrhUsers = await User.findAll({
                where: {
                    company_id: context.companyId,
                    role: { [Op.in]: ['rrhh', 'admin', 'hr_manager'] },
                    is_active: true
                },
                attributes: ['user_id', 'name', 'email']
            });

            if (rhrhUsers.length === 0) {
                console.warn('⚠️ [MEDICAL] No hay usuarios RRHH para notificar');
                return { notification_id: null };
            }

            const actionTypeText = authorization.action_type === 'delete' ? 'ELIMINAR' : 'EDITAR';
            const employee = record.employee || {};

            // 🔥 NCE: Central Telefónica de Notificaciones
            const nceResult = await NCE.send({
                companyId: context.companyId,
                module: 'medical',
                originType: 'medical_authorization_request',
                originId: `medical-auth-${authorization.id}`,

                workflowKey: 'medical.authorization_request',

                recipientType: 'user',
                recipientId: rhrhUsers[0].user_id,

                title: `[MÉDICO] Solicitud de ${actionTypeText} - ${employee.name || 'Empleado'}`,
                message: `El Dr. ${context.userName || 'Médico'} solicita autorización para ${actionTypeText.toLowerCase()} un registro médico.`,

                metadata: {
                    authorization_id: authorization.id,
                    record_id: record.id,
                    action_type: authorization.action_type,
                    employee_id: record.employee_id,
                    employee_name: employee.name || 'N/A',
                    record_type: record.record_type,
                    record_title: record.title,
                    request_reason: authorization.request_reason,
                    proposed_changes: authorization.proposed_changes,
                    locked_at: record.locked_at,
                    actions: [
                        { key: 'approve', label: 'Aprobar', style: 'success' },
                        { key: 'reject', label: 'Rechazar', style: 'danger' }
                    ]
                },

                priority: authorization.priority === 'urgent' ? 'urgent' : 'high',
                requiresAction: true,
                actionType: 'approval',

                channels: ['inbox'],
            });

            return {
                notification_id: nceResult.notificationId,
                group_id: `medical-auth-${authorization.id}`
            };

        } catch (error) {
            console.error('❌ [MEDICAL] Error creando notificación:', error);
            return { notification_id: null };
        }
    }

    /**
     * Notifica al solicitante que fue aprobada
     * 🔥 MIGRADO A NCE
     */
    static async notifyRequestorApproved(authorization, context, transaction) {
        try {
            await NCE.send({
                companyId: authorization.company_id,
                module: 'medical',
                originType: 'medical_authorization_approved',
                originId: `medical-auth-approved-${authorization.id}`,

                workflowKey: 'medical.authorization_approved',

                recipientType: 'user',
                recipientId: authorization.requested_by,

                title: `✅ Autorización APROBADA - Ventana de ${this.AUTHORIZATION_WINDOW_HOURS} horas`,
                message: `Su solicitud de ${authorization.action_type === 'delete' ? 'eliminación' : 'edición'} ha sido aprobada.`,

                metadata: {
                    authorization_id: authorization.id,
                    record_id: authorization.record_id,
                    window_end: authorization.authorization_window_end,
                    authorization_response: authorization.authorization_response
                },

                priority: 'high',
                requiresAction: true,
                actionType: 'execute',

                channels: ['inbox'],
            });

        } catch (error) {
            console.error('❌ [NCE] Error notificando aprobación:', error);
        }
    }

    /**
     * Notifica al solicitante que fue rechazada
     * 🔥 MIGRADO A NCE
     */
    static async notifyRequestorRejected(authorization, context, transaction) {
        try {
            await NCE.send({
                companyId: authorization.company_id,
                module: 'medical',
                originType: 'medical_authorization_rejected',
                originId: `medical-auth-rejected-${authorization.id}`,

                workflowKey: 'medical.authorization_rejected',

                recipientType: 'user',
                recipientId: authorization.requested_by,

                title: `❌ Autorización RECHAZADA`,
                message: `Su solicitud de ${authorization.action_type === 'delete' ? 'eliminación' : 'edición'} ha sido rechazada.${authorization.authorization_response ? ` Motivo: ${authorization.authorization_response}` : ''}`,

                metadata: {
                    authorization_id: authorization.id,
                    record_id: authorization.record_id,
                    authorization_response: authorization.authorization_response
                },

                priority: 'normal',
                requiresAction: false,

                channels: ['inbox'],
            });

        } catch (error) {
            console.error('❌ [MEDICAL] Error notificando rechazo:', error);
        }
    }

    /**
     * Obtiene el timeline de auditoría de un registro
     */
    static async getAuditTimeline(recordId, options = {}) {
        return MedicalRecordAuditLog.getTimeline(recordId, options);
    }

    /**
     * Genera reporte de cadena de custodia
     */
    static async getCustodyChainReport(recordId) {
        return MedicalRecordAuditLog.generateCustodyChainReport(recordId);
    }

    /**
     * Obtiene estadísticas de registros médicos
     */
    static async getStats(companyId, options = {}) {
        const stats = {
            total: 0,
            byType: {},
            byResult: {},
            locked: 0,
            pendingAuthorizations: 0,
            expiringSoon: 0
        };

        // Total y por tipo/resultado
        const records = await MedicalRecord.findAll({
            where: {
                company_id: companyId,
                is_deleted: false
            },
            attributes: ['id', 'record_type', 'result', 'is_locked', 'expiration_date']
        });

        stats.total = records.length;
        const today = new Date();
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        for (const record of records) {
            // Por tipo
            stats.byType[record.record_type] = (stats.byType[record.record_type] || 0) + 1;

            // Por resultado
            const result = record.result || 'pendiente';
            stats.byResult[result] = (stats.byResult[result] || 0) + 1;

            // Bloqueados
            if (record.is_locked) stats.locked++;

            // Por vencer
            if (record.expiration_date) {
                const expDate = new Date(record.expiration_date);
                if (expDate >= today && expDate <= thirtyDaysFromNow) {
                    stats.expiringSoon++;
                }
            }
        }

        // Autorizaciones pendientes
        stats.pendingAuthorizations = await MedicalEditAuthorization.count({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['pending', 'escalated'] }
            }
        });

        return stats;
    }
}

module.exports = MedicalImmutabilityService;
