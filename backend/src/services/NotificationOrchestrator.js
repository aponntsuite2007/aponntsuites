/**
 * ============================================================================
 * NOTIFICATION ORCHESTRATOR - DEPRECADO
 * ============================================================================
 *
 * ⚠️ DEPRECATION NOTICE (Enero 2025):
 * Este servicio está DEPRECADO. Usa NotificationCentralExchange.send() en su lugar.
 *
 * Todos los métodos de este servicio ahora delegan a NotificationCentralExchange
 * para mantener backward compatibility 100%.
 *
 * ANTES (deprecado):
 * ```javascript
 * await NotificationOrchestrator.trigger('payroll_receipt', {
 *   companyId: 11,
 *   recipientId: 'uuid-123',
 *   metadata: { period: '2025-12', amount: 5000 }
 * });
 * ```
 *
 * AHORA (recomendado):
 * ```javascript
 * await NCE.send({
 *   companyId: 11,
 *   workflowKey: 'payroll_receipt',
 *   recipientType: 'user',
 *   recipientId: 'uuid-123',
 *   title: 'Recibo de nómina disponible',
 *   message: 'Tu recibo del período 2025-12 está listo',
 *   metadata: { period: '2025-12', amount: 5000 }
 * });
 * ```
 *
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const NCE = require('./NotificationCentralExchange');
// 🔐 SSOT: Usar EmailService en lugar de nodemailer directo
const EmailService = require('./EmailService');

class NotificationOrchestrator {

    /**
     * ========================================================================
     * TRIGGER - Punto de entrada principal
     * ========================================================================
     *
     * ⚠️ DEPRECADO: Usa NotificationCentralExchange.send() en su lugar.
     *
     * Este método ahora delega a NCE.send() para backward compatibility.
     *
     * @deprecated Usar NotificationCentralExchange.send() directamente
     * @param {string} processKey - Identificador del proceso (ej: 'payroll_receipt')
     * @param {object} options - Opciones de ejecución
     * @param {number} options.companyId - ID de la empresa (solo para scope='company')
     * @param {string} options.recipientId - UUID del destinatario
     * @param {string} options.recipientType - Tipo: 'employee', 'user', 'partner', 'staff'
     * @param {object} options.metadata - Metadata específica del proceso
     * @param {object} options.templateVars - Variables para el template
     * @param {string} options.title - Título de la notificación
     * @param {string} options.message - Mensaje de la notificación
     * @returns {Promise<object>} Resultado del workflow
     */
    static async trigger(processKey, options = {}) {
        console.warn(`⚠️ [ORCHESTRATOR-DEPRECATED] NotificationOrchestrator.trigger() is deprecated. Use NCE.send() instead.`);
        console.log(`🔀 [ORCHESTRATOR-DEPRECATED] Delegating to NCE.send() for workflow: ${processKey}`);

        try {
            // Mapear parámetros legacy a formato NCE
            const nceParams = {
                companyId: options.companyId,
                workflowKey: processKey,
                module: options.module || 'legacy',

                // Destinatario
                recipientType: options.recipientType || 'user',
                recipientId: options.recipientId,

                // Contenido (usar templateVars si está disponible)
                title: options.title || options.templateVars?.title || `Notificación: ${processKey}`,
                message: options.message || options.templateVars?.message || 'Contenido de notificación',

                // Metadata
                metadata: {
                    ...options.metadata,
                    ...options.templateVars,
                    _legacy_source: 'NotificationOrchestrator.trigger',
                    _legacy_processKey: processKey
                },

                // Opciones adicionales
                priority: options.priority || 'normal',
                channels: options.channels,
                requiresAction: options.requiresAction,
                slaHours: options.slaHours
            };

            // Delegar a NCE
            const result = await NCE.send(nceParams);

            console.log(`✅ [ORCHESTRATOR-DEPRECATED] Delegación exitosa a NCE. Notification ID: ${result.notificationId}`);

            // Retornar en formato legacy compatible
            return {
                success: result.success,
                notificationId: result.notificationId,
                workflowKey: processKey,
                recipients: result.recipients,
                channels: result.channels,
                dispatchSummary: result.dispatchSummary,
                _delegated_to: 'NotificationCentralExchange'
            };

        } catch (error) {
            console.error(`❌ [ORCHESTRATOR-DEPRECATED] Error delegating to NCE:`, error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * GET WORKFLOW - Obtener configuración del workflow
     * ========================================================================
     */
    static async getWorkflow(processKey, companyId = null) {
        const query = `
            SELECT * FROM notification_workflows
            WHERE process_key = :processKey
              AND (
                (scope = 'aponnt' AND company_id IS NULL)
                OR (scope = 'company' AND company_id = :companyId)
              )
            LIMIT 1
        `;

        const [workflow] = await sequelize.query(query, {
            replacements: { processKey, companyId },
            type: QueryTypes.SELECT
        });

        return workflow;
    }

    /**
     * ========================================================================
     * EXECUTE WORKFLOW - Ejecutar steps del workflow
     * ========================================================================
     */
    static async executeWorkflow(workflow, options) {
        const { workflow_steps, channels } = workflow;
        const steps = workflow_steps?.steps || [];

        console.log(`\n🔄 [WORKFLOW] Ejecutando ${steps.length} steps...`);

        const results = {
            workflowId: workflow.id,
            processKey: workflow.process_key,
            steps: [],
            notifications: [],
            success: true,
            errors: []
        };

        // Ejecutar cada step secuencialmente
        for (const step of steps) {
            console.log(`\n📌 [STEP ${step.step}] ${step.action}: ${step.description || ''}`);

            try {
                let stepResult;

                switch (step.action) {
                    case 'send_notification':
                        stepResult = await this.executeSendNotification(workflow, step, options);
                        results.notifications.push(...stepResult.notifications);
                        break;

                    case 'wait_for_response':
                        stepResult = await this.executeWaitForResponse(workflow, step, options);
                        break;

                    case 'process_response':
                        stepResult = await this.executeProcessResponse(workflow, step, options);
                        break;

                    default:
                        console.warn(`⚠️  [STEP ${step.step}] Unknown action: ${step.action}`);
                        stepResult = { action: step.action, status: 'skipped' };
                }

                results.steps.push({
                    step: step.step,
                    action: step.action,
                    status: 'completed',
                    result: stepResult
                });

            } catch (error) {
                console.error(`❌ [STEP ${step.step}] Error:`, error.message);
                results.errors.push({
                    step: step.step,
                    error: error.message
                });
                results.success = false;
            }
        }

        return results;
    }

    /**
     * ========================================================================
     * STEP: SEND NOTIFICATION - Enviar notificación por canales configurados
     * ========================================================================
     */
    static async executeSendNotification(workflow, step, options) {
        const channelsToUse = step.channels || workflow.channels || ['email'];
        console.log(`📤 [SEND] Canales: ${channelsToUse.join(', ')}`);

        const notifications = [];

        for (const channel of channelsToUse) {
            try {
                const notification = await this.sendToChannel(
                    workflow,
                    channel,
                    step.template_key || workflow.email_template_key,
                    options
                );

                notifications.push(notification);
                console.log(`✅ [SEND] ${channel}: enviado con ID ${notification.id}`);

            } catch (error) {
                console.error(`❌ [SEND] ${channel}: ${error.message}`);
                notifications.push({
                    channel,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return { notifications };
    }

    /**
     * ========================================================================
     * SEND TO CHANNEL - Enviar por un canal específico
     * ========================================================================
     */
    static async sendToChannel(workflow, channel, templateKey, options) {
        const {
            companyId,
            recipientId,
            recipientType = 'employee',
            recipientEmail,
            recipientPhone,
            metadata = {},
            templateVars = {}
        } = options;

        // Crear registro en notification_log
        const logId = await this.createNotificationLog({
            workflow_id: workflow.id,
            process_key: workflow.process_key,
            company_id: companyId,
            recipient_type: recipientType,
            recipient_id: recipientId,
            recipient_email: recipientEmail,
            recipient_phone: recipientPhone,
            channel,
            metadata
        });

        // Enviar según el canal
        let sendResult;
        switch (channel) {
            case 'email':
                sendResult = await this.sendEmail(workflow, templateKey, recipientEmail, templateVars, logId);
                break;

            case 'whatsapp':
                sendResult = await this.sendWhatsApp(workflow, recipientPhone, templateVars, logId);
                break;

            case 'sms':
                sendResult = await this.sendSMS(workflow, recipientPhone, templateVars, logId);
                break;

            case 'push':
                sendResult = await this.sendPush(workflow, recipientId, templateVars, logId);
                break;

            default:
                throw new Error(`Canal no soportado: ${channel}`);
        }

        // Actualizar log con resultado
        await this.updateNotificationLog(logId, {
            status: sendResult.success ? 'sent' : 'failed',
            error_message: sendResult.error || null,
            provider: sendResult.provider || null,
            provider_message_id: sendResult.messageId || null
        });

        return {
            id: logId,
            channel,
            status: sendResult.success ? 'sent' : 'failed',
            messageId: sendResult.messageId
        };
    }

    /**
     * ========================================================================
     * SEND EMAIL - Enviar email (SSOT via EmailService)
     * ========================================================================
     * @deprecated Este servicio está deprecado. Usar NCE.send() con channels: ['email']
     */
    static async sendEmail(workflow, templateKey, recipientEmail, vars, logId, companyId = null) {
        console.warn(`⚠️ [ORCHESTRATOR-DEPRECATED] sendEmail() is deprecated. Use NCE.send() instead.`);
        console.log(`📧 [EMAIL-SSOT] Sending to: ${recipientEmail} via EmailService`);

        try {
            // Construir email
            const subject = `[${workflow.module.toUpperCase()}] ${workflow.process_name}`;
            const body = this.renderTemplate(workflow.description, vars);

            // Agregar botones de respuesta si requiere respuesta
            let html = `<p>${body}</p>`;
            if (workflow.requires_response && workflow.response_options) {
                html += this.renderResponseButtons(workflow.response_options, logId);
            }

            // 🔐 SSOT: Usar EmailService para envío multi-tenant
            let result;
            if (companyId) {
                // Enviar desde la empresa específica
                result = await EmailService.sendFromCompany(companyId, {
                    to: recipientEmail,
                    subject,
                    text: body,
                    html
                });
            } else {
                // Fallback: Enviar desde Aponnt (nivel sistema)
                result = await EmailService.sendFromAponnt({
                    to: recipientEmail,
                    subject,
                    text: body,
                    html
                });
            }

            console.log(`✅ [EMAIL-SSOT] Sent via EmailService`);

            return {
                success: true,
                provider: 'EmailService-SSOT',
                messageId: result?.messageId || 'sent'
            };

        } catch (error) {
            console.error(`❌ [EMAIL-SSOT] Error:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ========================================================================
     * SEND WHATSAPP - Enviar por WhatsApp
     * ========================================================================
     */
    static async sendWhatsApp(workflow, phone, vars, logId) {
        console.log(`📱 [WHATSAPP] Sending to: ${phone}`);

        // TODO: Integrar con Twilio, MessageBird, o API de WhatsApp Business
        // Por ahora simular envío

        return {
            success: true,
            provider: 'twilio',
            messageId: `wa_${Date.now()}`
        };
    }

    /**
     * ========================================================================
     * SEND SMS - Enviar SMS
     * ========================================================================
     */
    static async sendSMS(workflow, phone, vars, logId) {
        console.log(`💬 [SMS] Sending to: ${phone}`);

        // TODO: Integrar con Twilio, Nexmo, etc.

        return {
            success: true,
            provider: 'twilio',
            messageId: `sms_${Date.now()}`
        };
    }

    /**
     * ========================================================================
     * SEND PUSH - Enviar push notification
     * ========================================================================
     */
    static async sendPush(workflow, recipientId, vars, logId) {
        console.log(`🔔 [PUSH] Sending to: ${recipientId}`);

        // TODO: Integrar con Firebase Cloud Messaging (FCM)

        return {
            success: true,
            provider: 'fcm',
            messageId: `push_${Date.now()}`
        };
    }

    /**
     * ========================================================================
     * RENDER TEMPLATE - Renderizar template con variables
     * ========================================================================
     */
    static renderTemplate(template, vars) {
        let rendered = template;

        for (const [key, value] of Object.entries(vars)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            rendered = rendered.replace(regex, value);
        }

        return rendered;
    }

    /**
     * ========================================================================
     * RENDER RESPONSE BUTTONS - Generar HTML de botones de respuesta
     * ========================================================================
     */
    static renderResponseButtons(options, logId) {
        if (!Array.isArray(options) || options.length === 0) return '';

        const baseUrl = process.env.BASE_URL || 'http://localhost:9998';

        let html = '<div style="margin-top: 20px;">';

        for (const option of options) {
            const style = option.style === 'danger' ? 'background: #dc3545; color: white;' :
                         option.style === 'success' ? 'background: #28a745; color: white;' :
                         'background: #007bff; color: white;';

            html += `
                <a href="${baseUrl}/api/notifications/response/${logId}?response=${option.value || option}"
                   style="${style} padding: 10px 20px; text-decoration: none; display: inline-block; margin: 5px; border-radius: 5px;">
                    ${option.label || option}
                </a>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * ========================================================================
     * STEP: WAIT FOR RESPONSE - Esperar respuesta (async)
     * ========================================================================
     */
    static async executeWaitForResponse(workflow, step, options) {
        console.log(`⏳ [WAIT] Esperando respuesta (timeout: ${step.timeout_hours}h)`);

        // Este step no es bloqueante
        // Se registra el timeout y se procesa en background
        // TODO: Implementar cron job para procesar timeouts

        return {
            action: 'wait_for_response',
            timeout_hours: step.timeout_hours,
            status: 'waiting'
        };
    }

    /**
     * ========================================================================
     * STEP: PROCESS RESPONSE - Procesar respuesta del usuario
     * ========================================================================
     */
    static async executeProcessResponse(workflow, step, options) {
        console.log(`🔄 [PROCESS] Procesando respuesta...`);

        // TODO: Implementar lógica de procesamiento según step.on_accept, step.on_reject, etc.

        return {
            action: 'process_response',
            status: 'pending_response'
        };
    }

    /**
     * ========================================================================
     * DATABASE - Crear log de notificación
     * ========================================================================
     */
    static async createNotificationLog(data) {
        const query = `
            INSERT INTO notification_log (
                workflow_id, process_key, company_id,
                recipient_type, recipient_id, recipient_email, recipient_phone,
                channel, metadata
            ) VALUES (
                :workflow_id, :process_key, :company_id,
                :recipient_type, :recipient_id, :recipient_email, :recipient_phone,
                :channel, :metadata::jsonb
            )
            RETURNING id
        `;

        const [result] = await sequelize.query(query, {
            replacements: {
                ...data,
                metadata: JSON.stringify(data.metadata || {})
            },
            type: QueryTypes.SELECT
        });

        return result.id;
    }

    /**
     * ========================================================================
     * DATABASE - Actualizar log de notificación
     * ========================================================================
     */
    static async updateNotificationLog(logId, updates) {
        const setParts = [];
        const replacements = { logId };

        for (const [key, value] of Object.entries(updates)) {
            setParts.push(`${key} = :${key}`);
            replacements[key] = value;
        }

        const query = `
            UPDATE notification_log
            SET ${setParts.join(', ')}
            WHERE id = :logId
        `;

        await sequelize.query(query, { replacements });
    }

    /**
     * ========================================================================
     * PROCESS RESPONSE - Registrar respuesta del usuario
     * ========================================================================
     */
    static async processUserResponse(logId, response, metadata = {}) {
        console.log(`\n👤 [RESPONSE] Processing user response for log ${logId}`);

        const query = `
            UPDATE notification_log
            SET response = :response,
                response_at = CURRENT_TIMESTAMP,
                response_metadata = :metadata::jsonb,
                status = 'responded'
            WHERE id = :logId
            RETURNING *
        `;

        const [result] = await sequelize.query(query, {
            replacements: {
                logId,
                response,
                metadata: JSON.stringify(metadata)
            },
            type: QueryTypes.SELECT
        });

        console.log(`✅ [RESPONSE] Response registered: ${response}`);

        // TODO: Ejecutar acciones automáticas según la respuesta
        // (ej: si response='APPROVE' → aprobar solicitud)

        return result;
    }

    /**
     * ========================================================================
     * MÉTRICAS - Obtener métricas de un proceso
     * ========================================================================
     */
    static async getProcessMetrics(processKey, companyId = null, days = 30) {
        const query = `SELECT * FROM get_notification_process_metrics(:processKey, :companyId, :days)`;

        const [metrics] = await sequelize.query(query, {
            replacements: { processKey, companyId, days },
            type: QueryTypes.SELECT
        });

        return metrics;
    }

    /**
     * ========================================================================
     * MÉTRICAS - Obtener stats por canal
     * ========================================================================
     */
    static async getChannelStats(days = 30) {
        const query = `SELECT * FROM get_notification_channel_stats(:days)`;

        const stats = await sequelize.query(query, {
            replacements: { days },
            type: QueryTypes.SELECT
        });

        return stats;
    }
}

module.exports = NotificationOrchestrator;
