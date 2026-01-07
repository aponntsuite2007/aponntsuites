/**
 * LegalImmutabilityService
 * Servicio central para manejo de inmutabilidad de registros legales
 *
 * Patrón copiado de MedicalImmutabilityService
 *
 * Funcionalidades:
 * - Control de ventanas de edición (48h inicial, 24h post-autorización)
 * - Bloqueo automático de registros expirados
 * - Workflow de autorización vía notificaciones proactivas
 * - Auditoría completa append-only
 * - Multi-jurisdicción (integrado con LegalJurisdictionService)
 *
 * Tablas SSOT:
 * - legal_communications (disciplinarios)
 * - user_legal_issues (juicios/mediaciones)
 */

const { Op } = require('sequelize');
const {
    LegalCommunication,
    LegalCommunicationType,
    UserLegalIssue,
    LegalEditAuthorization,
    User,
    Company,
    Notification,
    sequelize
} = require('../config/database');
const LegalJurisdictionService = require('./LegalJurisdictionService');

// 🔥 NCE: Central Telefónica de Notificaciones - CERO BYPASS
const NCE = require('./NotificationCentralExchange');

class LegalImmutabilityService {
    // Configuración de ventanas temporales (igual que médico)
    static EDIT_WINDOW_HOURS = 48; // Ventana inicial de edición
    static AUTHORIZATION_WINDOW_HOURS = 24; // Ventana post-autorización
    static STEP1_TIMEOUT_HOURS = 48; // Timeout para RRHH
    static STEP2_TIMEOUT_HOURS = 24; // Timeout para Gerencia Legal

    /**
     * Verifica si un registro legal es editable
     * @param {string} table - 'legal_communications' o 'user_legal_issues'
     * @param {number} recordId - ID del registro
     * @param {number} userId - ID del usuario
     * @returns {Object} Estado de editabilidad
     */
    static async checkEditability(table, recordId, userId = null) {
        let record;

        // Obtener registro según la tabla
        if (table === 'legal_communications') {
            record = await LegalCommunication?.findByPk(recordId);
        } else if (table === 'user_legal_issues') {
            record = await UserLegalIssue?.findByPk(recordId);
        }

        if (!record) {
            return {
                editable: false,
                reason: 'Registro no encontrado',
                code: 'NOT_FOUND'
            };
        }

        // Verificar si está eliminado (soft delete)
        if (record.is_deleted || record.deleted_at) {
            return {
                editable: false,
                reason: 'Registro eliminado',
                code: 'DELETED'
            };
        }

        const now = new Date();
        const createdAt = new Date(record.created_at);
        const editWindowEnd = new Date(createdAt.getTime() + this.EDIT_WINDOW_HOURS * 60 * 60 * 1000);

        // Verificar ventana de edición normal (48h desde creación)
        if (!record.is_locked && editWindowEnd > now) {
            const remainingMs = editWindowEnd - now;
            const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
            const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

            return {
                editable: true,
                reason: 'Dentro de ventana de edición (48h)',
                code: 'EDIT_WINDOW',
                editableUntil: editWindowEnd,
                remainingTime: `${remainingHours}h ${remainingMinutes}m`,
                remainingMs,
                requiresAuthorization: false
            };
        }

        // Verificar si hay autorización activa
        const authorization = await LegalEditAuthorization?.findOne({
            where: {
                record_id: recordId,
                record_table: table,
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
                reason: 'Autorización activa (24h)',
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
            reason: 'Registro bloqueado - requiere autorización de RRHH',
            code: 'LOCKED',
            lockedAt: record.locked_at || editWindowEnd,
            requiresAuthorization: true
        };
    }

    /**
     * Solicita autorización para editar/eliminar un registro bloqueado
     * @param {string} table - 'legal_communications' o 'user_legal_issues'
     * @param {number} recordId - ID del registro
     * @param {Object} requestData - Datos de la solicitud
     * @param {Object} context - Contexto (userId, companyId, ipAddress)
     * @returns {Object} Autorización creada
     */
    static async requestAuthorization(table, recordId, requestData, context) {
        const transaction = await sequelize.transaction();

        try {
            // Obtener registro
            let record, recordType, employeeId;

            if (table === 'legal_communications') {
                record = await LegalCommunication?.findByPk(recordId, { transaction });
                recordType = record?.communication_type || 'disciplinary';
                employeeId = record?.employee_id;
            } else if (table === 'user_legal_issues') {
                record = await UserLegalIssue?.findByPk(recordId, { transaction });
                recordType = record?.issue_type || 'lawsuit';
                employeeId = record?.user_id;
            }

            if (!record) {
                throw new Error('Registro no encontrado');
            }

            // Verificar que el registro está bloqueado
            const editability = await this.checkEditability(table, recordId, context.userId);
            if (editability.editable && editability.code !== 'AUTHORIZATION_ACTIVE') {
                return {
                    success: false,
                    error: 'El registro aún es editable, no requiere autorización',
                    code: 'NOT_REQUIRED',
                    editableUntil: editability.editableUntil
                };
            }

            // Verificar si ya hay una solicitud pendiente
            const existingRequest = await LegalEditAuthorization?.findOne({
                where: {
                    record_id: recordId,
                    record_table: table,
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

            // Obtener jurisdicción para contexto
            let jurisdictionCode = null;
            try {
                const jurisdiction = await LegalJurisdictionService.getJurisdictionForCompany(context.companyId);
                jurisdictionCode = jurisdiction?.code;
            } catch (e) {
                console.warn('⚠️ [LEGAL] No se pudo obtener jurisdicción:', e.message);
            }

            // Crear solicitud de autorización
            const now = new Date();
            const authorization = await LegalEditAuthorization.create({
                company_id: context.companyId,
                record_id: recordId,
                record_table: table,
                record_type: recordType,
                requested_by: context.userId,
                request_reason: requestData.reason,
                action_type: requestData.action_type || 'edit',
                proposed_changes: requestData.proposed_changes || null,
                priority: requestData.priority || 'normal',
                jurisdiction_code: jurisdictionCode,
                status: 'pending',
                current_step: 1,
                expires_at: new Date(now.getTime() + (this.STEP1_TIMEOUT_HOURS + this.STEP2_TIMEOUT_HOURS) * 60 * 60 * 1000),
                audit_trail: [{
                    timestamp: now.toISOString(),
                    action: 'created',
                    user_id: context.userId,
                    user_name: context.userName || 'Usuario',
                    details: { reason: requestData.reason, table, recordId }
                }]
            }, { transaction });

            // Crear notificación proactiva para RRHH
            const notificationResult = await this.createAuthorizationNotification(
                authorization,
                record,
                table,
                employeeId,
                context,
                transaction
            );

            if (notificationResult.notification_id) {
                authorization.notification_id = notificationResult.notification_id;
                authorization.notification_group_id = notificationResult.group_id;
                await authorization.save({ transaction });
            }

            await transaction.commit();

            console.log(`✅ [LEGAL] Autorización solicitada: Auth=${authorization.id}, Table=${table}, Record=${recordId}`);

            return {
                success: true,
                authorization: authorization,
                notificationSent: !!notificationResult.notification_id,
                message: 'Solicitud de autorización enviada a RRHH'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [LEGAL] Error solicitando autorización:', error);
            throw error;
        }
    }

    /**
     * Aprueba una solicitud de autorización
     */
    static async approveAuthorization(authorizationId, approvalData, context) {
        const transaction = await sequelize.transaction();

        try {
            const authorization = await LegalEditAuthorization.findByPk(authorizationId, {
                include: [{
                    model: User,
                    as: 'requestor',
                    attributes: ['user_id', 'name', 'email']
                }],
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

            // Notificar al solicitante
            await this.notifyRequestorApproved(authorization, context, transaction);

            await transaction.commit();

            console.log(`✅ [LEGAL] Autorización aprobada: Auth=${authorizationId}, Ventana hasta ${authorization.authorization_window_end}`);

            return {
                success: true,
                authorization: authorization,
                windowEnd: authorization.authorization_window_end,
                windowHours: this.AUTHORIZATION_WINDOW_HOURS,
                message: `Autorización aprobada. El solicitante tiene ${this.AUTHORIZATION_WINDOW_HOURS} horas para realizar la acción.`
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [LEGAL] Error aprobando autorización:', error);
            throw error;
        }
    }

    /**
     * Rechaza una solicitud de autorización
     */
    static async rejectAuthorization(authorizationId, rejectionData, context) {
        const transaction = await sequelize.transaction();

        try {
            const authorization = await LegalEditAuthorization.findByPk(authorizationId, {
                include: [{
                    model: User,
                    as: 'requestor',
                    attributes: ['user_id', 'name', 'email']
                }],
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

            // Notificar al solicitante
            await this.notifyRequestorRejected(authorization, context, transaction);

            await transaction.commit();

            console.log(`✅ [LEGAL] Autorización rechazada: Auth=${authorizationId}`);

            return {
                success: true,
                authorization: authorization,
                message: 'Autorización rechazada'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [LEGAL] Error rechazando autorización:', error);
            throw error;
        }
    }

    /**
     * Actualiza un registro legal (con verificación de editabilidad)
     */
    static async updateRecord(table, recordId, updates, context) {
        const transaction = await sequelize.transaction();

        try {
            const editability = await this.checkEditability(table, recordId, context.userId);

            if (!editability.editable) {
                return {
                    success: false,
                    error: editability.reason,
                    code: editability.code,
                    requiresAuthorization: editability.requiresAuthorization
                };
            }

            let record;
            if (table === 'legal_communications') {
                record = await LegalCommunication?.findByPk(recordId, { transaction });
            } else if (table === 'user_legal_issues') {
                record = await UserLegalIssue?.findByPk(recordId, { transaction });
            }

            if (!record) {
                throw new Error('Registro no encontrado');
            }

            // Aplicar actualizaciones
            for (const [key, value] of Object.entries(updates)) {
                if (value !== undefined && key !== 'id' && key !== 'company_id') {
                    record[key] = value;
                }
            }

            // Actualizar contadores de edición
            record.edit_count = (record.edit_count || 0) + 1;
            record.last_edited_by = context.userId;
            record.last_edited_at = new Date();

            await record.save({ transaction });

            // Si usó autorización, marcarla como usada
            if (editability.code === 'AUTHORIZATION_ACTIVE' && editability.authorizationId) {
                await LegalEditAuthorization.update({
                    window_used: true,
                    window_used_at: new Date(),
                    window_action_performed: 'edited'
                }, {
                    where: { id: editability.authorizationId },
                    transaction
                });
            }

            await transaction.commit();

            console.log(`✅ [LEGAL] Registro actualizado: Table=${table}, ID=${recordId}`);

            return {
                success: true,
                record: record,
                message: 'Registro actualizado exitosamente'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [LEGAL] Error actualizando registro:', error);
            throw error;
        }
    }

    /**
     * Elimina un registro legal (soft delete con verificación)
     */
    static async deleteRecord(table, recordId, deleteData, context) {
        const transaction = await sequelize.transaction();

        try {
            const editability = await this.checkEditability(table, recordId, context.userId);

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
                const auth = await LegalEditAuthorization.findByPk(editability.authorizationId);
                if (auth && auth.action_type !== 'delete') {
                    return {
                        success: false,
                        error: 'La autorización activa es para edición, no para eliminación',
                        code: 'WRONG_ACTION_TYPE'
                    };
                }
            }

            let record;
            if (table === 'legal_communications') {
                record = await LegalCommunication?.findByPk(recordId, { transaction });
            } else if (table === 'user_legal_issues') {
                record = await UserLegalIssue?.findByPk(recordId, { transaction });
            }

            if (!record) {
                throw new Error('Registro no encontrado');
            }

            // Soft delete
            record.is_deleted = true;
            record.deleted_at = new Date();
            record.deleted_by = context.userId;
            record.deletion_reason = deleteData.reason;

            await record.save({ transaction });

            // Marcar autorización como usada
            if (editability.authorizationId) {
                await LegalEditAuthorization.update({
                    window_used: true,
                    window_used_at: new Date(),
                    window_action_performed: 'deleted'
                }, {
                    where: { id: editability.authorizationId },
                    transaction
                });
            }

            await transaction.commit();

            console.log(`✅ [LEGAL] Registro eliminado (soft): Table=${table}, ID=${recordId}`);

            return {
                success: true,
                message: 'Registro eliminado exitosamente'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [LEGAL] Error eliminando registro:', error);
            throw error;
        }
    }

    // ==================== CRON JOBS ====================

    /**
     * Escala autorizaciones sin respuesta (cron job)
     */
    static async escalateTimedOutAuthorizations() {
        if (!LegalEditAuthorization) {
            console.warn('⚠️ [LEGAL] Modelo LegalEditAuthorization no disponible');
            return { escalated: 0, expired: 0 };
        }

        return LegalEditAuthorization.escalateTimedOut();
    }

    /**
     * Expira ventanas de autorización no utilizadas (cron job)
     */
    static async expireUnusedWindows() {
        if (!LegalEditAuthorization) {
            return { expired: 0 };
        }

        const expired = await LegalEditAuthorization.expireUnusedWindows();
        if (expired > 0) {
            console.log(`⏰ [LEGAL] ${expired} ventanas de autorización expiradas sin uso`);
        }
        return { expired };
    }

    // ==================== NOTIFICACIONES ====================

    /**
     * Crea notificación proactiva para RRHH
     */
    static async createAuthorizationNotification(authorization, record, table, employeeId, context, transaction) {
        try {
            // Buscar usuarios RRHH de la empresa
            const rhrhUsers = await User.findAll({
                where: {
                    company_id: context.companyId,
                    role: { [Op.in]: ['rrhh', 'admin', 'hr_manager', 'legal'] },
                    is_active: true
                },
                attributes: ['user_id', 'name', 'email']
            });

            if (rhrhUsers.length === 0) {
                console.warn('⚠️ [LEGAL] No hay usuarios RRHH para notificar');
                return { notification_id: null };
            }

            const actionTypeText = authorization.action_type === 'delete' ? 'ELIMINAR' : 'EDITAR';
            const tableLabel = table === 'legal_communications' ? 'Comunicación Legal' : 'Juicio/Mediación';

            // Obtener nombre del empleado
            let employeeName = 'Empleado';
            if (employeeId) {
                const employee = await User.findByPk(employeeId, { attributes: ['name'] });
                employeeName = employee?.name || 'Empleado';
            }

            // 🔥 NCE: Notificación a RRHH via Central Telefónica
            const nceResult = await NCE.send({
                companyId: context.companyId,
                module: 'legal',
                originType: 'legal_authorization_request',
                originId: `legal-auth-${authorization.id}`,
                workflowKey: 'legal.authorization_request',
                recipientType: 'user',
                recipientId: rhrhUsers[0].user_id,
                title: `[LEGAL] Solicitud de ${actionTypeText} - ${employeeName}`,
                message: `${context.userName || 'Usuario'} solicita autorización para ${actionTypeText.toLowerCase()} un registro legal.\n\n` +
                    `**Tipo:** ${tableLabel}\n` +
                    `**Empleado:** ${employeeName}\n` +
                    `**Razón:** ${authorization.request_reason}\n\n` +
                    `Este registro requiere autorización de RRHH para ser modificado.`,
                priority: authorization.priority === 'urgent' ? 'urgent' : 'high',
                requiresAction: true,
                actionType: 'approval',
                metadata: {
                    authorization_id: authorization.id,
                    record_id: record.id,
                    record_table: table,
                    action_type: authorization.action_type,
                    employee_id: employeeId,
                    category: 'legal',
                    source_module: 'legal-dashboard',
                    actions: [
                        { key: 'approve', label: 'Aprobar', style: 'success' },
                        { key: 'reject', label: 'Rechazar', style: 'danger' }
                    ],
                    expires_at: authorization.expires_at
                },
                channels: ['inbox'],
            });

            return {
                notification_id: nceResult.notificationId,
                group_id: `legal-auth-${authorization.id}`
            };

        } catch (error) {
            console.error('❌ [LEGAL] Error creando notificación:', error);
            return { notification_id: null };
        }
    }

    /**
     * Notifica al solicitante que fue aprobada
     */
    static async notifyRequestorApproved(authorization, context, transaction) {
        try {
            // 🔥 NCE: Notificación de aprobación via Central Telefónica
            await NCE.send({
                companyId: authorization.company_id,
                module: 'legal',
                originType: 'legal_authorization_approved',
                originId: `legal-approved-${authorization.id}`,
                workflowKey: 'legal.authorization_approved',
                recipientType: 'user',
                recipientId: authorization.requested_by,
                title: `✅ Autorización LEGAL APROBADA - Ventana de ${this.AUTHORIZATION_WINDOW_HOURS} horas`,
                message: `Su solicitud de ${authorization.action_type === 'delete' ? 'eliminación' : 'edición'} ha sido aprobada.\n\n` +
                    `**IMPORTANTE:** Tiene ${this.AUTHORIZATION_WINDOW_HOURS} horas para realizar la acción.\n` +
                    `**Vence:** ${new Date(authorization.authorization_window_end).toLocaleString()}\n\n` +
                    (authorization.authorization_response ? `**Respuesta:** ${authorization.authorization_response}` : ''),
                priority: 'high',
                requiresAction: true,
                actionType: 'action_window',
                metadata: {
                    authorization_id: authorization.id,
                    record_id: authorization.record_id,
                    record_table: authorization.record_table,
                    window_end: authorization.authorization_window_end,
                    category: 'legal',
                    source_module: 'legal-dashboard',
                    actions: [
                        { key: 'go_to_record', label: 'Ir al registro', style: 'primary' }
                    ],
                    expires_at: authorization.authorization_window_end
                },
                slaHours: this.AUTHORIZATION_WINDOW_HOURS,
                channels: ['inbox'],
            });

        } catch (error) {
            console.error('❌ [LEGAL] Error notificando aprobación:', error);
        }
    }

    /**
     * Notifica al solicitante que fue rechazada
     */
    static async notifyRequestorRejected(authorization, context, transaction) {
        try {
            // 🔥 NCE: Notificación de rechazo via Central Telefónica
            await NCE.send({
                companyId: authorization.company_id,
                module: 'legal',
                originType: 'legal_authorization_rejected',
                originId: `legal-rejected-${authorization.id}`,
                workflowKey: 'legal.authorization_rejected',
                recipientType: 'user',
                recipientId: authorization.requested_by,
                title: `❌ Autorización LEGAL RECHAZADA`,
                message: `Su solicitud de ${authorization.action_type === 'delete' ? 'eliminación' : 'edición'} ha sido rechazada.\n\n` +
                    (authorization.authorization_response ? `**Motivo:** ${authorization.authorization_response}` : ''),
                priority: 'normal',
                requiresAction: false,
                metadata: {
                    authorization_id: authorization.id,
                    record_id: authorization.record_id,
                    record_table: authorization.record_table,
                    category: 'legal',
                    source_module: 'legal-dashboard'
                },
                channels: ['inbox'],
            });

        } catch (error) {
            console.error('❌ [LEGAL] Error notificando rechazo:', error);
        }
    }

    /**
     * Obtiene autorizaciones pendientes para RRHH
     */
    static async getPendingAuthorizations(companyId, userRole) {
        if (!LegalEditAuthorization) {
            return [];
        }

        return LegalEditAuthorization.getPendingForAuthorizer(companyId, userRole);
    }

    /**
     * Obtiene solicitudes del usuario actual
     */
    static async getMyAuthorizationRequests(companyId, userId, status = null) {
        if (!LegalEditAuthorization) {
            return [];
        }

        return LegalEditAuthorization.getMyRequests(companyId, userId, { status });
    }
}

module.exports = LegalImmutabilityService;
