/**
 * ============================================================================
 * NOTIFICATION CHANNEL DISPATCHER v1.0
 * ============================================================================
 *
 * Multi-channel dispatcher para el sistema de notificaciones unificado.
 * Maneja envío por email, SMS, WhatsApp, Push, WebSocket e Inbox.
 *
 * RESPONSABILIDADES:
 * - Resolver configuración SMTP según scope (aponnt vs company) y process_key
 * - Enviar notificaciones por múltiples canales
 * - Trackear estado de entrega por canal independientemente
 * - Retry logic para fallos transitorios
 * - Integración con servicios de email existentes
 *
 * INTEGRACIÓN:
 * - EmailConfigService: Configuración SMTP de Aponnt (11 emails)
 * - CompanyEmailProcessService: Configuración SMTP de empresas
 * - email_process_mapping: Mapeo de procesos Aponnt a tipos de email
 * - company_email_process_mapping: Mapeo de procesos de empresas a emails
 *
 * ============================================================================
 */

const nodemailer = require('nodemailer');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const EmailConfigService = require('./EmailConfigService');
const CompanyEmailProcessService = require('./CompanyEmailProcessService');

class NotificationChannelDispatcher {

    /**
     * ========================================================================
     * DISPATCH - Enviar notificación a un destinatario por múltiples canales
     * ========================================================================
     *
     * @param {object} params - Parámetros de envío
     * @param {object} params.workflow - Workflow de notification_workflows
     * @param {object} params.recipient - Destinatario resuelto (email, phone, user_id)
     * @param {string} params.title - Título de la notificación
     * @param {string} params.message - Mensaje/cuerpo
     * @param {object} params.metadata - Metadata adicional
     * @param {array} params.channels - Canales a usar ['email', 'push', etc.]
     * @param {string} params.priority - Prioridad (urgent, high, normal, low)
     * @param {number} params.logId - ID del notification_log (para tracking)
     * @returns {Promise<object>} Resultado del envío por cada canal
     */
    async dispatch(params) {
        const {
            workflow,
            recipient,
            title,
            message,
            metadata = {},
            channels = ['email'],
            priority = 'normal',
            logId
        } = params;

        console.log(`\n📤 [DISPATCHER] Dispatching to ${recipient.email || recipient.user_id}`);
        console.log(`📋 [DISPATCHER] Channels: ${channels.join(', ')}`);

        const results = {
            logId,
            recipient: recipient.email || recipient.user_id,
            channels: {},
            success: false,
            errors: []
        };

        // Dispatch a cada canal en paralelo
        const dispatchPromises = channels.map(async (channel) => {
            try {
                console.log(`\n🔹 [DISPATCHER] Sending via ${channel}...`);

                let channelResult;
                switch (channel) {
                    case 'email':
                        channelResult = await this.sendEmail({
                            workflow,
                            recipient,
                            title,
                            message,
                            metadata,
                            priority,
                            logId
                        });
                        break;

                    case 'sms':
                        channelResult = await this.sendSMS({
                            recipient,
                            message,
                            metadata,
                            logId
                        });
                        break;

                    case 'whatsapp':
                        channelResult = await this.sendWhatsApp({
                            recipient,
                            message,
                            metadata,
                            logId
                        });
                        break;

                    case 'push':
                        channelResult = await this.sendPush({
                            recipient,
                            title,
                            message,
                            metadata,
                            logId
                        });
                        break;

                    case 'websocket':
                        channelResult = await this.sendWebSocket({
                            recipient,
                            title,
                            message,
                            metadata,
                            logId
                        });
                        break;

                    case 'inbox':
                        channelResult = await this.sendInbox({
                            recipient,
                            title,
                            message,
                            metadata,
                            logId
                        });
                        break;

                    default:
                        throw new Error(`Canal no soportado: ${channel}`);
                }

                results.channels[channel] = {
                    status: 'sent',
                    ...channelResult
                };

                console.log(`✅ [DISPATCHER] ${channel}: SUCCESS`);

            } catch (error) {
                console.error(`❌ [DISPATCHER] ${channel}: ${error.message}`);
                results.channels[channel] = {
                    status: 'failed',
                    error: error.message
                };
                results.errors.push({
                    channel,
                    error: error.message
                });
            }
        });

        // Esperar que todos los canales completen
        await Promise.allSettled(dispatchPromises);

        // Determinar éxito general (al menos un canal exitoso)
        results.success = Object.values(results.channels).some(ch => ch.status === 'sent');

        console.log(`\n📊 [DISPATCHER] Results:`, {
            success: results.success,
            channels: Object.keys(results.channels).map(ch => ({
                channel: ch,
                status: results.channels[ch].status
            }))
        });

        return results;
    }

    /**
     * ========================================================================
     * SEND EMAIL - Enviar email usando configuración SMTP correcta
     * ========================================================================
     *
     * Resuelve SMTP según:
     * - workflow.scope === 'aponnt' → EmailConfigService + email_process_mapping
     * - workflow.scope === 'company' → CompanyEmailProcessService + company_email_process_mapping
     */
    async sendEmail(params) {
        const { workflow, recipient, title, message, metadata, priority, logId } = params;

        console.log(`📧 [EMAIL] Resolving SMTP for workflow: ${workflow.process_key} (scope: ${workflow.scope})`);

        try {
            // PASO 1: Resolver configuración SMTP según scope
            const smtpConfig = await this._getSmtpConfig(workflow);

            if (!smtpConfig) {
                throw new Error(`No se encontró configuración SMTP para ${workflow.process_key} (scope: ${workflow.scope})`);
            }

            console.log(`✅ [EMAIL] SMTP resolved: ${smtpConfig.fromEmail} via ${smtpConfig.host}`);

            // PASO 2: Crear transporter de nodemailer
            const transporter = nodemailer.createTransport({
                host: smtpConfig.host,
                port: smtpConfig.port,
                secure: smtpConfig.port === 465, // true para 465, false para otros
                auth: {
                    user: smtpConfig.username,
                    pass: smtpConfig.password
                },
                tls: {
                    rejectUnauthorized: smtpConfig.requireTls || false
                }
            });

            // PASO 3: Renderizar contenido del email
            const emailContent = this._renderEmailTemplate({
                workflow,
                title,
                message,
                metadata,
                priority,
                logId
            });

            // PASO 4: Enviar email
            const info = await transporter.sendMail({
                from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
                to: recipient.email,
                subject: emailContent.subject,
                text: emailContent.text,
                html: emailContent.html
            });

            console.log(`✅ [EMAIL] Sent: ${info.messageId}`);

            return {
                provider: 'nodemailer',
                messageId: info.messageId,
                smtpHost: smtpConfig.host,
                fromEmail: smtpConfig.fromEmail
            };

        } catch (error) {
            console.error(`❌ [EMAIL] Error:`, error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * GET SMTP CONFIG - Resolver configuración SMTP según scope y process_key
     * ========================================================================
     *
     * LÓGICA:
     * 1. Si scope='aponnt':
     *    - Buscar en email_process_mapping (process_key → email_type)
     *    - Obtener config de aponnt_email_config (email_type)
     *
     * 2. Si scope='company':
     *    - Buscar en company_email_process_mapping (company_id + process_key → email_config_id)
     *    - Obtener config de company_email_config (email_config_id)
     */
    async _getSmtpConfig(workflow) {
        const { scope, process_key, company_id } = workflow;

        console.log(`🔍 [SMTP] Resolving for: scope=${scope}, process_key=${process_key}, company_id=${company_id || 'N/A'}`);

        if (scope === 'aponnt') {
            // CASO 1: Configuración de Aponnt
            return await this._getAponntSmtpConfig(process_key);

        } else if (scope === 'company') {
            // CASO 2: Configuración de empresa
            if (!company_id) {
                throw new Error(`company_id es requerido para workflows con scope='company'`);
            }
            return await this._getCompanySmtpConfig(company_id, process_key);

        } else {
            throw new Error(`Scope no soportado: ${scope}`);
        }
    }

    /**
     * ========================================================================
     * GET APONNT SMTP CONFIG - Configuración de emails de Aponnt
     * ========================================================================
     */
    async _getAponntSmtpConfig(processKey) {
        console.log(`🔍 [SMTP APONNT] Resolving for process_key: ${processKey}`);

        // PASO 1: Buscar mapeo en email_process_mapping
        const mappingQuery = `
            SELECT email_type
            FROM email_process_mapping
            WHERE process_key = :processKey
            LIMIT 1
        `;

        const [mapping] = await sequelize.query(mappingQuery, {
            replacements: { processKey },
            type: QueryTypes.SELECT
        });

        if (!mapping) {
            console.warn(`⚠️ [SMTP APONNT] No mapping found for process_key: ${processKey}. Using default 'general'.`);
            // Fallback a tipo 'general' si no hay mapeo específico
            return await this._getAponntEmailConfigByType('general');
        }

        console.log(`✅ [SMTP APONNT] Mapping found: ${processKey} → ${mapping.email_type}`);

        // PASO 2: Obtener configuración SMTP del tipo de email
        return await this._getAponntEmailConfigByType(mapping.email_type);
    }

    /**
     * ========================================================================
     * GET APONNT EMAIL CONFIG BY TYPE - Obtener config de aponnt_email_config
     * ========================================================================
     */
    async _getAponntEmailConfigByType(emailType) {
        console.log(`🔍 [SMTP APONNT] Getting config for email_type: ${emailType}`);

        // Usar EmailConfigService para obtener configuración (incluye desencriptación)
        const config = await EmailConfigService.getConfigByType(emailType);

        if (!config) {
            throw new Error(`No se encontró configuración SMTP de Aponnt para tipo: ${emailType}`);
        }

        console.log(`✅ [SMTP APONNT] Config found for ${emailType}: ${config.email}`);

        return {
            host: config.smtp_host,
            port: config.smtp_port,
            username: config.smtp_user,
            password: config.smtp_password, // Ya viene desencriptado por EmailConfigService
            fromEmail: config.email,
            fromName: config.from_name || 'Aponnt',
            requireTls: config.require_tls
        };
    }

    /**
     * ========================================================================
     * GET COMPANY SMTP CONFIG - Configuración de emails de empresa
     * ========================================================================
     */
    async _getCompanySmtpConfig(companyId, processKey) {
        console.log(`🔍 [SMTP COMPANY] Resolving for company_id=${companyId}, process_key=${processKey}`);

        // PASO 1: Buscar mapeo en company_email_process_mapping
        const mappings = await CompanyEmailProcessService.getCompanyMappings(companyId);

        const mapping = mappings.find(m => m.process_key === processKey);

        if (!mapping) {
            console.warn(`⚠️ [SMTP COMPANY] No mapping found for process_key: ${processKey}. Using first available email.`);
            // Fallback: usar el primer email configurado de la empresa
            if (mappings.length === 0) {
                throw new Error(`La empresa ${companyId} no tiene emails configurados`);
            }
            // Usar el primer mapeo disponible
            return await this._getCompanyEmailConfig(mappings[0].email_config_id);
        }

        console.log(`✅ [SMTP COMPANY] Mapping found: ${processKey} → email_config_id ${mapping.email_config_id}`);

        // PASO 2: Obtener configuración SMTP del email de la empresa
        return await this._getCompanyEmailConfig(mapping.email_config_id);
    }

    /**
     * ========================================================================
     * GET COMPANY EMAIL CONFIG - Obtener config de company_email_config
     * ========================================================================
     */
    async _getCompanyEmailConfig(emailConfigId) {
        console.log(`🔍 [SMTP COMPANY] Getting config for email_config_id: ${emailConfigId}`);

        const configQuery = `
            SELECT
                email,
                smtp_host,
                smtp_port,
                smtp_user,
                smtp_password,
                from_name,
                require_tls,
                is_active
            FROM company_email_config
            WHERE id = :emailConfigId
              AND is_active = true
            LIMIT 1
        `;

        const [config] = await sequelize.query(configQuery, {
            replacements: { emailConfigId },
            type: QueryTypes.SELECT
        });

        if (!config) {
            throw new Error(`No se encontró configuración SMTP de empresa para email_config_id: ${emailConfigId}`);
        }

        console.log(`✅ [SMTP COMPANY] Config found: ${config.email}`);

        // TODO: Desencriptar smtp_password si está encriptado
        // Por ahora asumimos que está en texto plano o ya desencriptado

        return {
            host: config.smtp_host,
            port: config.smtp_port,
            username: config.smtp_user,
            password: config.smtp_password,
            fromEmail: config.email,
            fromName: config.from_name || 'Sistema',
            requireTls: config.require_tls
        };
    }

    /**
     * ========================================================================
     * RENDER EMAIL TEMPLATE - Renderizar contenido del email
     * ========================================================================
     */
    _renderEmailTemplate(params) {
        const { workflow, title, message, metadata, priority, logId } = params;

        // TODO: Integrar con notification_templates si existe
        // Por ahora usar template simple

        const priorityEmoji = {
            urgent: '🚨',
            high: '⚠️',
            normal: 'ℹ️',
            low: '📌'
        };

        const subject = `${priorityEmoji[priority] || ''} ${title}`;

        const text = `
${title}

${message}

---
Módulo: ${workflow.module}
Proceso: ${workflow.process_name}
Prioridad: ${priority.toUpperCase()}

Este mensaje fue enviado automáticamente por el Sistema de Notificaciones de Aponnt.
        `.trim();

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .footer { background: #f1f1f1; padding: 15px; border-radius: 0 0 5px 5px; font-size: 12px; color: #666; }
        .priority-${priority} { border-left: 4px solid ${priority === 'urgent' ? '#dc3545' : priority === 'high' ? '#ff9800' : priority === 'normal' ? '#007bff' : '#28a745'}; }
        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>${priorityEmoji[priority] || ''} ${title}</h2>
        </div>
        <div class="content priority-${priority}">
            <p>${message.replace(/\n/g, '<br>')}</p>

            ${metadata.actionButtons ? this._renderActionButtons(metadata.actionButtons, logId) : ''}
        </div>
        <div class="footer">
            <strong>Módulo:</strong> ${workflow.module}<br>
            <strong>Proceso:</strong> ${workflow.process_name}<br>
            <strong>Prioridad:</strong> ${priority.toUpperCase()}<br>
            <br>
            <small>Este mensaje fue enviado automáticamente por el Sistema de Notificaciones de Aponnt.</small>
        </div>
    </div>
</body>
</html>
        `.trim();

        return { subject, text, html };
    }

    /**
     * ========================================================================
     * RENDER ACTION BUTTONS - Renderizar botones de acción en email
     * ========================================================================
     */
    _renderActionButtons(buttons, logId) {
        if (!Array.isArray(buttons) || buttons.length === 0) return '';

        const baseUrl = process.env.BASE_URL || 'http://localhost:9998';

        let html = '<div style="margin-top: 20px;">';

        for (const button of buttons) {
            const color = button.type === 'approve' ? '#28a745' :
                         button.type === 'reject' ? '#dc3545' :
                         '#007bff';

            html += `
                <a href="${baseUrl}/api/notifications/response/${logId}?action=${button.action}"
                   class="button"
                   style="background: ${color}; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin: 5px; border-radius: 5px;">
                    ${button.label}
                </a>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * ========================================================================
     * SEND SMS - Enviar SMS (integración pendiente)
     * ========================================================================
     */
    async sendSMS(params) {
        const { recipient, message, metadata, logId } = params;

        console.log(`💬 [SMS] Sending to: ${recipient.phone}`);

        // TODO: Integrar con Twilio, Nexmo, o proveedor local
        // Por ahora simular envío exitoso

        return {
            provider: 'twilio',
            messageId: `sms_${Date.now()}`,
            status: 'simulated'
        };
    }

    /**
     * ========================================================================
     * SEND WHATSAPP - Enviar WhatsApp (integración pendiente)
     * ========================================================================
     */
    async sendWhatsApp(params) {
        const { recipient, message, metadata, logId } = params;

        console.log(`📱 [WHATSAPP] Sending to: ${recipient.phone}`);

        // TODO: Integrar con API de WhatsApp Business
        // Por ahora simular envío exitoso

        return {
            provider: 'whatsapp_business',
            messageId: `wa_${Date.now()}`,
            status: 'simulated'
        };
    }

    /**
     * ========================================================================
     * SEND PUSH - Enviar push notification (integración pendiente)
     * ========================================================================
     */
    async sendPush(params) {
        const { recipient, title, message, metadata, logId } = params;

        console.log(`🔔 [PUSH] Sending to user: ${recipient.user_id}`);

        // TODO: Integrar con Firebase Cloud Messaging (FCM)
        // Por ahora simular envío exitoso

        return {
            provider: 'fcm',
            messageId: `push_${Date.now()}`,
            status: 'simulated'
        };
    }

    /**
     * ========================================================================
     * SEND WEBSOCKET - Enviar por WebSocket (integración pendiente)
     * ========================================================================
     */
    async sendWebSocket(params) {
        const { recipient, title, message, metadata, logId } = params;

        console.log(`🌐 [WEBSOCKET] Sending to user: ${recipient.user_id}`);

        // TODO: Integrar con Socket.IO o WebSocket server
        // Por ahora simular envío exitoso

        return {
            provider: 'websocket',
            messageId: `ws_${Date.now()}`,
            status: 'simulated'
        };
    }

    /**
     * ========================================================================
     * SEND INBOX - Enviar a bandeja interna (integración pendiente)
     * ========================================================================
     */
    async sendInbox(params) {
        const { recipient, title, message, metadata, logId } = params;

        console.log(`📥 [INBOX] Creating inbox message for user: ${recipient.user_id}`);

        // TODO: Crear registro en notification_threads o tabla de inbox
        // Por ahora simular envío exitoso

        return {
            provider: 'inbox',
            messageId: `inbox_${Date.now()}`,
            status: 'simulated'
        };
    }
}

module.exports = new NotificationChannelDispatcher();
