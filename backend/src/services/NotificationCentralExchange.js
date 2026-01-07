/**
 * ============================================================================
 * NOTIFICATION CENTRAL EXCHANGE (NCE) v1.0
 * ============================================================================
 *
 * CENTRAL TELEFÓNICA DE NOTIFICACIONES
 * Único punto de entrada para TODAS las notificaciones del ecosistema
 *
 * PRINCIPIOS:
 * 1. Single Entry Point - Un solo método NCE.send() para todo
 * 2. Policy-Based - Reglas configurables por empresa/módulo/tipo
 * 3. Multi-Channel - Email, SMS, WhatsApp, Push, WebSocket, Inbox
 * 4. Workflow-Driven - Todos los flows son workflows registrados en BD
 * 5. Proactive & Reactive - Notificaciones automáticas y bajo demanda
 * 6. SLA-Aware - Tracking completo de tiempos de respuesta
 * 7. Audit Trail - Trazabilidad completa de TODA comunicación
 * 8. AI-Enhanced - Respuestas sugeridas por Ollama
 *
 * ARQUITECTURA:
 * ┌─────────────────────────────────────────────────────────────┐
 * │           NOTIFICATION CENTRAL EXCHANGE (NCE)               │
 * │  🔹 UN SOLO módulo que gestiona TODAS las notificaciones   │
 * │  🔹 NADA puede bypass este sistema                          │
 * └─────────────────────────────────────────────────────────────┘
 *                            ▲
 *          TODAS las notificaciones pasan por aquí
 *                            │
 *    ┌───────────────────────┴──────────────────────────┐
 *    │                                                   │
 * Panel    Panel     Panel      APK       APK       Cron
 * Empresa  Admin    Provs     Kiosk    Medical     Jobs
 *
 * USO:
 * ```javascript
 * await NCE.send({
 *   companyId: 11,
 *   module: 'procurement',
 *   workflowKey: 'procurement.order_approval',
 *   recipientType: 'role',
 *   recipientId: 'approver_l1',
 *   title: 'Nueva orden requiere aprobación',
 *   message: 'Orden #PO-12345 por $15,000',
 *   metadata: { order_id: 'PO-12345', total: 15000 },
 *   priority: 'high',
 *   requiresAction: true,
 *   actionType: 'approval',
 *   slaHours: 24
 * });
 * ```
 *
 * CONSOLIDACIÓN:
 * - Fusiona NotificationOrchestrator.js (workflow-based, multi-channel)
 * - Fusiona NotificationWorkflowService.js (enterprise workflows, jerarquía)
 * - Fusiona NotificationUnifiedService.js (threads, SLA, AI)
 *
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const NotificationRecipientResolver = require('./NotificationRecipientResolver');
const NotificationChannelDispatcher = require('./NotificationChannelDispatcher');

class NotificationCentralExchange {

    constructor() {
        console.log('📞 [NCE] Notification Central Exchange inicializado');
        console.log('📞 [NCE] Consolidando 3 servicios legacy en una central telefónica');

        this.recipientResolver = new NotificationRecipientResolver();
        // FIX: ChannelDispatcher exporta singleton, no usar 'new'
        this.channelDispatcher = NotificationChannelDispatcher;
    }

    // ========================================================================
    // MÉTODO PRINCIPAL - SINGLE ENTRY POINT
    // ========================================================================

    /**
     * ENVIAR NOTIFICACIÓN - Único punto de entrada
     *
     * @param {Object} params - Parámetros de la notificación
     * @param {number} params.companyId - ID de la empresa (multi-tenant)
     * @param {string} params.module - Módulo origen (procurement, wms, finance, etc.)
     * @param {string} params.workflowKey - Clave del workflow (OBLIGATORIO)
     * @param {string} params.originType - Tipo de entidad origen (purchase_order, invoice, etc.)
     * @param {string} params.originId - ID de la entidad origen
     * @param {string} params.recipientType - Tipo destinatario: 'user', 'role', 'hierarchy', 'group'
     * @param {string} params.recipientId - ID del destinatario (user_id, role_name, etc.)
     * @param {string} params.title - Título de la notificación
     * @param {string} params.message - Mensaje completo
     * @param {Object} params.metadata - Metadata adicional (formato libre)
     * @param {string} [params.priority='normal'] - Prioridad: urgent, high, normal, low
     * @param {boolean} [params.requiresAction=false] - Requiere respuesta
     * @param {string} [params.actionType] - Tipo de acción: approval, acknowledgement, response
     * @param {number} [params.slaHours] - SLA en horas (si no, usa política del workflow)
     * @param {Array<string>} [params.channels] - Canales (si no, usa política del workflow)
     * @param {Object} [params.escalationPolicy] - Política de escalamiento custom
     * @param {string} [params.threadId] - ID de thread (para conversaciones)
     * @param {string} [params.createdBy] - ID de usuario que crea la notificación
     * @returns {Promise<Object>} Resultado de la notificación
     */
    async send(params) {
        const startTime = Date.now();
        console.log('\n📞 [NCE.send] ========================================');
        console.log(`📞 [NCE.send] Workflow: ${params.workflowKey}`);
        console.log(`📞 [NCE.send] Company: ${params.companyId}, Module: ${params.module}`);
        console.log(`📞 [NCE.send] Recipient: ${params.recipientType}:${params.recipientId}`);
        console.log(`📞 [NCE.send] Priority: ${params.priority || 'normal'}`);

        try {
            // ================================================================
            // PASO 1: VALIDAR PARÁMETROS OBLIGATORIOS
            // ================================================================
            this._validateRequiredParams(params);

            // ================================================================
            // PASO 2: OBTENER WORKFLOW DE BD (SSOT)
            // ================================================================
            const workflow = await this._getWorkflow(params.workflowKey, params.companyId);

            if (!workflow) {
                throw new Error(`Workflow '${params.workflowKey}' no encontrado`);
            }

            if (!workflow.is_active) {
                throw new Error(`Workflow '${params.workflowKey}' está inactivo`);
            }

            console.log(`✅ [NCE.send] Workflow encontrado: ${workflow.process_name || workflow.workflow_name || params.workflowKey}`);
            console.log(`📋 [NCE.send] Scope: ${workflow.scope}, Category: ${workflow.category || workflow.notification_type}`);

            // ================================================================
            // PASO 3: RESOLVER DESTINATARIO(S) DINÁMICAMENTE
            // ================================================================
            const recipients = await this.recipientResolver.resolve({
                recipientType: params.recipientType,
                recipientId: params.recipientId,
                companyId: params.companyId,
                module: params.module,
                context: {
                    originType: params.originType,
                    originId: params.originId,
                    metadata: params.metadata
                }
            });

            console.log(`✅ [NCE.send] Destinatarios resueltos: ${recipients.length} usuario(s)`);

            // ================================================================
            // PASO 4: PREPARAR PAYLOAD CONSOLIDADO
            // ================================================================
            const notificationPayload = this._buildNotificationPayload(params, workflow, recipients);

            // ================================================================
            // PASO 5: DETERMINAR CANALES (workflow policy o custom)
            // ================================================================
            const channels = params.channels || workflow.channels || ['email', 'inbox'];
            console.log(`📡 [NCE.send] Canales: ${channels.join(', ')}`);

            // ================================================================
            // PASO 6: CREAR THREAD SI ES CONVERSACIÓN
            // ================================================================
            let threadId = params.threadId;
            if (!threadId && workflow.supports_threads) {
                threadId = await this._createThread({
                    companyId: params.companyId,
                    subject: params.title,
                    category: workflow.category || workflow.notification_type,
                    module: params.module,
                    workflowKey: params.workflowKey,
                    initiatorId: params.createdBy || params.originId,
                    priority: params.priority || 'normal'
                });
                console.log(`📬 [NCE.send] Thread creado: ${threadId}`);
            }

            // ================================================================
            // PASO 7: GUARDAR EN notification_log (TRACKING UNIFICADO)
            // ================================================================
            const notificationLog = await this._createNotificationLog({
                ...notificationPayload,
                workflowKey: params.workflowKey,
                workflow_id: workflow.id,
                threadId,
                channels,
                recipients
            });

            console.log(`✅ [NCE.send] Log creado: ${notificationLog.id}`);

            // ================================================================
            // PASO 8: DISPATCH A MULTI-CHANNEL (paralelo para cada destinatario)
            // ================================================================
            const allDispatchResults = [];

            for (const recipient of recipients) {
                try {
                    const dispatchResult = await this.channelDispatcher.dispatch({
                        workflow,
                        recipient,
                        title: params.title,
                        message: params.message,
                        metadata: params.metadata,
                        channels,
                        priority: params.priority || 'normal',
                        logId: notificationLog.id
                    });
                    allDispatchResults.push(dispatchResult);
                } catch (error) {
                    console.error(`❌ [NCE.send] Error dispatching to ${recipient.email}:`, error.message);
                    allDispatchResults.push({
                        success: false,
                        recipient,
                        channels: {},
                        errors: [error.message]
                    });
                }
            }

            // Agregar resultados
            const dispatchResults = {
                totalCount: allDispatchResults.length,
                successCount: allDispatchResults.filter(r => r.success).length,
                failedCount: allDispatchResults.filter(r => !r.success).length,
                results: allDispatchResults.reduce((acc, result) => {
                    // Consolidar canales por tipo
                    Object.keys(result.channels).forEach(channel => {
                        if (!acc[channel]) {
                            acc[channel] = { sent: 0, failed: 0, details: [] };
                        }
                        if (result.channels[channel].status === 'sent') {
                            acc[channel].sent++;
                        } else {
                            acc[channel].failed++;
                        }
                        acc[channel].details.push({
                            recipient: result.recipient.email,
                            ...result.channels[channel]
                        });
                    });
                    return acc;
                }, {})
            };

            console.log(`✅ [NCE.send] Dispatch completado: ${dispatchResults.successCount}/${dispatchResults.totalCount} exitosos`);

            // ================================================================
            // PASO 9: PROGRAMAR ESCALAMIENTO AUTOMÁTICO (si aplica)
            // ================================================================
            if (params.requiresAction || workflow.requires_action) {
                await this._scheduleEscalation({
                    notificationLogId: notificationLog.id,
                    workflowKey: params.workflowKey,
                    escalationPolicy: params.escalationPolicy || workflow.escalation_policy,
                    slaHours: params.slaHours || workflow.sla_hours,
                    companyId: params.companyId
                });
                console.log(`⏰ [NCE.send] Escalamiento programado (SLA: ${params.slaHours || workflow.sla_hours}h)`);
            }

            // ================================================================
            // PASO 10: AI RESPONSE SUGGESTION (async, no bloqueante)
            // ================================================================
            if (workflow.ai_enabled) {
                this._tryAIResponse(notificationLog).catch(err => {
                    console.error('[NCE.send] Error en AI:', err.message);
                });
            }

            const duration = Date.now() - startTime;
            console.log(`🎉 [NCE.send] Notificación enviada exitosamente en ${duration}ms`);
            console.log('📞 [NCE.send] ========================================\n');

            // ================================================================
            // RETORNAR RESULTADO
            // ================================================================
            return {
                success: true,
                notificationId: notificationLog.id,
                threadId: threadId || null,
                workflowKey: params.workflowKey,
                recipients: recipients.map(r => ({
                    userId: r.user_id,
                    email: r.email,
                    name: r.full_name
                })),
                channels: dispatchResults.results,
                dispatchSummary: {
                    total: dispatchResults.totalCount,
                    successful: dispatchResults.successCount,
                    failed: dispatchResults.failedCount
                },
                duration: `${duration}ms`
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ [NCE.send] Error después de ${duration}ms:`, error.message);
            console.error(error.stack);

            throw new Error(`[NCE] Error enviando notificación: ${error.message}`);
        }
    }

    // ========================================================================
    // MÉTODO SECUNDARIO - RESPONDER A NOTIFICACIÓN
    // ========================================================================

    /**
     * RESPONDER A NOTIFICACIÓN - Aprobar, rechazar, etc.
     *
     * @param {string} notificationId - ID de la notificación
     * @param {string} action - Acción: approve, reject, acknowledge, custom
     * @param {string} userId - ID del usuario que responde
     * @param {string} [responseText] - Texto de respuesta (opcional)
     * @param {Object} [metadata] - Metadata adicional
     * @returns {Promise<Object>} Resultado de la acción
     */
    async respond(notificationId, action, userId, responseText = null, metadata = {}) {
        console.log(`\n📞 [NCE.respond] Notificación: ${notificationId}, Acción: ${action}, User: ${userId}`);

        try {
            // Obtener notificación
            const notification = await this._getNotificationLog(notificationId);

            if (!notification) {
                throw new Error('Notificación no encontrada');
            }

            if (!notification.requires_action) {
                throw new Error('Esta notificación no requiere acción');
            }

            if (notification.action_status !== 'pending') {
                throw new Error(`Notificación ya tiene estado: ${notification.action_status}`);
            }

            // Validar que el usuario puede responder
            await this._validateUserCanRespond(notification, userId);

            // Obtener workflow
            const workflow = await this._getWorkflow(notification.workflow_key, notification.company_id);

            // Registrar acción
            await this._recordAction({
                notificationId,
                action,
                userId,
                responseText,
                metadata
            });

            // Procesar acción según tipo
            let result;
            switch (action) {
                case 'approve':
                case 'approved':
                    result = await this._handleApproval(notification, workflow, userId, responseText);
                    break;

                case 'reject':
                case 'rejected':
                    result = await this._handleRejection(notification, workflow, userId, responseText);
                    break;

                case 'acknowledge':
                case 'acknowledged':
                    result = await this._handleAcknowledgement(notification, userId);
                    break;

                default:
                    result = await this._handleCustomAction(notification, action, userId, responseText, metadata);
            }

            console.log(`✅ [NCE.respond] Acción procesada: ${action}`);

            return {
                success: true,
                action,
                notificationId,
                newStatus: result.newStatus,
                escalated: result.escalated || false,
                finalDecision: result.finalDecision || null
            };

        } catch (error) {
            console.error(`❌ [NCE.respond] Error:`, error.message);
            throw error;
        }
    }

    // ========================================================================
    // BACKWARD COMPATIBILITY - WRAPPERS LEGACY
    // ========================================================================

    /**
     * BACKWARD COMPATIBILITY: NotificationOrchestrator.trigger()
     * @deprecated Usar NCE.send() en su lugar
     */
    async trigger(processKey, options = {}) {
        console.warn('⚠️  [NCE] DEPRECATED: Usar NCE.send() en vez de trigger()');

        return this.send({
            companyId: options.companyId,
            workflowKey: processKey, // process_key → workflow_key
            module: options.module || 'unknown',
            originType: options.recipientType,
            originId: options.recipientId,
            recipientType: 'user',
            recipientId: options.recipientId,
            title: options.title || 'Notificación',
            message: options.message || '',
            metadata: options.metadata || {},
            priority: options.priority || 'normal',
            channels: options.channels
        });
    }

    /**
     * BACKWARD COMPATIBILITY: NotificationWorkflowService.createNotification()
     * @deprecated Usar NCE.send() en su lugar
     */
    async createNotification(data) {
        console.warn('⚠️  [NCE] DEPRECATED: Usar NCE.send() en vez de createNotification()');

        return this.send({
            companyId: data.companyId,
            module: data.module,
            workflowKey: `${data.module}.${data.notificationType}`,
            originType: data.relatedEntityType || 'unknown',
            originId: data.relatedEntityId || null,
            recipientType: data.recipient?.type || 'user',
            recipientId: data.recipient?.id || data.recipient?.userId,
            title: data.title,
            message: data.message,
            metadata: data.metadata || {},
            priority: data.priority || 'medium',
            requiresAction: data.category === 'approval_request',
            actionType: data.actionType || 'approval',
            createdBy: data.createdBy
        });
    }

    /**
     * BACKWARD COMPATIBILITY: NotificationWorkflowService.processAction()
     * @deprecated Usar NCE.respond() en su lugar
     */
    async processAction(notificationId, action, userId, response = null, metadata = {}) {
        console.warn('⚠️  [NCE] DEPRECATED: Usar NCE.respond() en vez de processAction()');

        return this.respond(notificationId, action, userId, response, metadata);
    }

    // ========================================================================
    // MÉTODOS PRIVADOS - HELPERS INTERNOS
    // ========================================================================

    /**
     * Validar parámetros obligatorios
     */
    _validateRequiredParams(params) {
        const required = ['companyId', 'module', 'workflowKey', 'recipientType', 'recipientId', 'title', 'message'];

        for (const field of required) {
            if (!params[field]) {
                throw new Error(`Parámetro obligatorio faltante: ${field}`);
            }
        }
    }

    /**
     * Obtener workflow de BD
     */
    async _getWorkflow(workflowKey, companyId) {
        const query = `
            SELECT * FROM notification_workflows
            WHERE (process_key = :workflowKey OR workflow_key = :workflowKey)
              AND (
                (scope = 'aponnt' AND company_id IS NULL)
                OR (scope = 'company' AND company_id = :companyId)
              )
              AND is_active = TRUE
            ORDER BY scope DESC -- Priorizar company-specific sobre aponnt
            LIMIT 1
        `;

        const [workflow] = await sequelize.query(query, {
            replacements: { workflowKey, companyId },
            type: QueryTypes.SELECT
        });

        return workflow;
    }

    /**
     * Construir payload consolidado de notificación
     */
    _buildNotificationPayload(params, workflow, recipients) {
        // Calcular SLA deadline
        const slaHours = params.slaHours || workflow.sla_hours || this._getDefaultSLA(params.priority);
        const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

        return {
            companyId: params.companyId,
            module: params.module,
            originType: params.originType,
            originId: params.originId,
            title: params.title,
            message: params.message,
            shortMessage: params.message.substring(0, 280),
            metadata: params.metadata || {},
            priority: params.priority || workflow.default_priority || 'normal',
            requiresAction: params.requiresAction || workflow.requires_action || false,
            actionType: params.actionType || workflow.action_type,
            slaHours,
            slaDeadline,
            createdBy: params.createdBy
        };
    }

    /**
     * Crear thread de conversación
     */
    async _createThread(data) {
        const query = `
            INSERT INTO notification_threads (
                company_id, subject, category, module, workflow_key,
                initiator_id, priority, status
            ) VALUES (
                :companyId, :subject, :category, :module, :workflowKey,
                :initiatorId, :priority, 'active'
            ) RETURNING id
        `;

        const [result] = await sequelize.query(query, {
            replacements: data,
            type: QueryTypes.INSERT
        });

        return result[0]?.id || result.id;
    }

    /**
     * Crear registro en notification_log
     */
    async _createNotificationLog(data) {
        // TODO: Implementar INSERT completo con todos los campos
        // Por ahora, stub básico
        const query = `
            INSERT INTO notification_log (
                company_id, workflow_key, workflow_id, thread_id,
                module, origin_type, origin_id,
                recipient_type, recipient_id, recipient_email,
                title, message, metadata,
                priority, requires_action, action_type,
                sla_hours, sla_deadline_at, channels,
                status, created_at
            ) VALUES (
                :companyId, :workflowKey, :workflow_id, :threadId,
                :module, :originType, :originId,
                :recipientType, :recipientId, :recipientEmail,
                :title, :message, :metadata,
                :priority, :requiresAction, :actionType,
                :slaHours, :slaDeadline, :channels,
                'sent', NOW()
            ) RETURNING *
        `;

        const [notification] = await sequelize.query(query, {
            replacements: {
                companyId: data.companyId,
                workflowKey: data.workflowKey,
                workflow_id: data.workflow_id,
                threadId: data.threadId || null,
                module: data.module,
                originType: data.originType,
                originId: data.originId,
                recipientType: data.recipients[0]?.user_id ? 'user' : 'unknown',
                recipientId: data.recipients[0]?.user_id || null,
                recipientEmail: data.recipients[0]?.email || null,
                title: data.title,
                message: data.message,
                metadata: JSON.stringify(data.metadata),
                priority: data.priority,
                requiresAction: data.requiresAction,
                actionType: data.actionType,
                slaHours: data.slaHours,
                slaDeadline: data.slaDeadline,
                channels: JSON.stringify(data.channels)
            },
            type: QueryTypes.INSERT
        });

        return notification[0] || notification;
    }

    /**
     * Obtener notificación por ID
     */
    async _getNotificationLog(notificationId) {
        const [notification] = await sequelize.query(`
            SELECT * FROM notification_log WHERE id = :notificationId
        `, {
            replacements: { notificationId },
            type: QueryTypes.SELECT
        });

        return notification;
    }

    /**
     * Validar que usuario puede responder
     */
    async _validateUserCanRespond(notification, userId) {
        // Verificar que el userId es el recipient o tiene permisos
        if (notification.recipient_id !== userId) {
            // TODO: Validar permisos adicionales (ej: admin puede responder por otro)
            throw new Error('Usuario no autorizado para responder esta notificación');
        }
    }

    /**
     * Registrar acción en log
     */
    async _recordAction(data) {
        await sequelize.query(`
            INSERT INTO notification_actions_log (
                notification_id, action, user_id, response_text, metadata, created_at
            ) VALUES (
                :notificationId, :action, :userId, :responseText, :metadata, NOW()
            )
        `, {
            replacements: {
                notificationId: data.notificationId,
                action: data.action,
                userId: data.userId,
                responseText: data.responseText,
                metadata: JSON.stringify(data.metadata)
            },
            type: QueryTypes.INSERT
        });

        // Actualizar notification_log
        await sequelize.query(`
            UPDATE notification_log
            SET action_status = :action,
                responded_at = NOW(),
                responded_by_user_id = :userId,
                response_text = :responseText
            WHERE id = :notificationId
        `, {
            replacements: {
                notificationId: data.notificationId,
                action: data.action,
                userId: data.userId,
                responseText: data.responseText
            },
            type: QueryTypes.UPDATE
        });
    }

    /**
     * Manejar aprobación
     */
    async _handleApproval(notification, workflow, userId, responseText) {
        // Verificar si hay siguiente nivel en workflow
        const currentLevel = notification.escalation_level || 0;
        const nextLevel = currentLevel + 1;

        // TODO: Buscar en workflow.escalation_policy si hay siguiente nivel
        const hasNextLevel = false; // Por ahora stub

        if (hasNextLevel) {
            // Escalar al siguiente nivel
            return {
                newStatus: 'escalated',
                escalated: true,
                finalDecision: null
            };
        } else {
            // Es la aprobación final
            return {
                newStatus: 'final_approved',
                escalated: false,
                finalDecision: 'approved'
            };
        }
    }

    /**
     * Manejar rechazo
     */
    async _handleRejection(notification, workflow, userId, responseText) {
        // Rechazo siempre es final
        return {
            newStatus: 'final_rejected',
            escalated: false,
            finalDecision: 'rejected'
        };
    }

    /**
     * Manejar acknowledgement
     */
    async _handleAcknowledgement(notification, userId) {
        return {
            newStatus: 'acknowledged',
            escalated: false,
            finalDecision: null
        };
    }

    /**
     * Manejar acción custom
     */
    async _handleCustomAction(notification, action, userId, responseText, metadata) {
        return {
            newStatus: action,
            escalated: false,
            finalDecision: null
        };
    }

    /**
     * Programar escalamiento automático
     */
    async _scheduleEscalation(data) {
        // TODO: Integrar con cron job o queue system
        console.log('[NCE] Escalamiento programado (stub)');
    }

    /**
     * Intentar respuesta AI
     */
    async _tryAIResponse(notification) {
        // TODO: Integrar con Ollama
        console.log('[NCE] AI Response (stub)');
    }

    /**
     * Obtener SLA por defecto según prioridad
     */
    _getDefaultSLA(priority) {
        const slaMap = {
            'critical': 0.083,  // 5 minutos
            'urgent': 0.5,      // 30 minutos
            'high': 1,          // 1 hora
            'medium': 24,       // 24 horas
            'normal': 24,       // 24 horas
            'low': 72           // 72 horas
        };

        return slaMap[priority] || 24;
    }

}

// Exportar singleton
module.exports = new NotificationCentralExchange();
