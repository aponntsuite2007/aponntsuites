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
const { sequelize, UserNotificationPreference } = require('../config/database');
const { QueryTypes } = require('sequelize');
const EmailConfigService = require('./EmailConfigService');
const CompanyEmailProcessService = require('./CompanyEmailProcessService');
const FirebasePushService = require('./FirebasePushService');
const TwilioMessagingService = require('./TwilioMessagingService');
const NotificationWebSocketService = require('./NotificationWebSocketService');
const NotificationBillingService = require('./NotificationBillingService');

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
        console.log(`📋 [DISPATCHER] Requested channels: ${channels.join(', ')}`);

        const results = {
            logId,
            recipient: recipient.email || recipient.user_id,
            channels: {},
            success: false,
            errors: [],
            preferencesApplied: false,
            quietHoursDeferred: false
        };

        // ========================================================================
        // USER PREFERENCES ENFORCEMENT (FIX - Enero 2025)
        // ========================================================================
        let effectiveChannels = [...channels];
        const userId = recipient.user_id;
        const companyId = recipient.company_id || workflow.company_id || metadata.companyId;
        const module = workflow.module || metadata.module || 'general';

        // Solo verificar preferencias si hay user_id (no aplica para externos)
        if (userId && companyId) {
            try {
                const userPrefs = await UserNotificationPreference.getForUser(userId, companyId, module);

                if (userPrefs) {
                    results.preferencesApplied = true;

                    // CHECK 1: Quiet Hours - Diferir a inbox si estamos en horario silencioso
                    // (excepto notificaciones urgentes)
                    if (priority !== 'urgent' && userPrefs.isQuietHours()) {
                        console.log(`🌙 [DISPATCHER] User ${userId} in quiet hours - deferring to inbox only`);
                        results.quietHoursDeferred = true;

                        // En quiet hours, solo enviar a inbox (siempre permitido)
                        effectiveChannels = ['inbox'];

                        // Guardar notificación diferida para enviar después de quiet hours
                        // (el inbox siempre funciona)
                    } else {
                        // CHECK 2: Filter channels based on user's enabled channels
                        const enabledChannels = userPrefs.getEnabledChannels();
                        console.log(`🔧 [DISPATCHER] User ${userId} enabled channels: ${enabledChannels.join(', ')}`);

                        // Mapeo de nombres de canales (preferencias → dispatcher)
                        const channelMapping = {
                            'app': 'websocket',       // app = websocket + inbox
                            'email': 'email',
                            'sms': 'sms',
                            'whatsapp': 'whatsapp',
                            'push': 'push'
                        };

                        // Filtrar canales: solo los que el usuario tiene habilitados
                        effectiveChannels = channels.filter(ch => {
                            // inbox siempre permitido
                            if (ch === 'inbox') return true;
                            // websocket = canal 'app' en preferencias
                            if (ch === 'websocket') return enabledChannels.includes('app');
                            // otros canales directamente
                            return enabledChannels.includes(ch);
                        });

                        // Si el usuario tiene 'app' habilitado, asegurar inbox
                        if (enabledChannels.includes('app') && !effectiveChannels.includes('inbox')) {
                            effectiveChannels.push('inbox');
                        }
                    }

                    console.log(`✅ [DISPATCHER] Effective channels after preferences: ${effectiveChannels.join(', ')}`);
                }
            } catch (prefError) {
                console.warn(`⚠️ [DISPATCHER] Error checking user preferences: ${prefError.message}`);
                // Si falla la verificación de preferencias, continuar con canales originales
            }
        }

        // Si no quedan canales efectivos, al menos inbox
        if (effectiveChannels.length === 0) {
            console.log(`⚠️ [DISPATCHER] No effective channels - defaulting to inbox`);
            effectiveChannels = ['inbox'];
        }

        console.log(`📋 [DISPATCHER] Final channels to dispatch: ${effectiveChannels.join(', ')}`);

        // Dispatch a cada canal en paralelo
        const dispatchPromises = effectiveChannels.map(async (channel) => {
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
            preferencesApplied: results.preferencesApplied,
            quietHoursDeferred: results.quietHoursDeferred,
            channels: Object.keys(results.channels).map(ch => ({
                channel: ch,
                status: results.channels[ch].status
            }))
        });

        // Agregar info de canales filtrados por preferencias
        if (results.preferencesApplied) {
            results.requestedChannels = channels;
            results.effectiveChannels = effectiveChannels;
            results.channelsSkippedByPreference = channels.filter(ch => !effectiveChannels.includes(ch));
        }

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

        console.log(`✅ [SMTP APONNT] Config found for ${emailType}: ${config.from_email || config.email_address}`);

        return {
            host: config.smtp_host,
            port: config.smtp_port,
            username: config.from_email || config.email_address,
            password: config.app_password_decrypted || config.smtp_password_decrypted,
            fromEmail: config.from_email || config.email_address,
            fromName: config.from_name || config.display_name || 'Aponnt',
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

        // Si viene HTML personalizado en metadata, usarlo directamente
        // Esto es para emails de marketing/flyers que ya traen su propio diseño
        if (metadata && metadata.htmlContent) {
            console.log(`📧 [DISPATCHER] Usando HTML personalizado del metadata`);
            return {
                subject: title,
                text: message,
                html: metadata.htmlContent
            };
        }

        // TODO: Integrar con notification_templates si existe
        // Por ahora usar template simple

        const priorityEmoji = {
            urgent: '🚨',
            high: '⚠️',
            normal: 'ℹ️',
            low: '📌',
            medium: 'ℹ️'
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

        const baseUrl = require('../utils/urlHelper').getBaseUrl();

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
     * SEND SMS - Enviar SMS vía Twilio
     * ========================================================================
     */
    async sendSMS(params) {
        const { recipient, message, metadata, logId } = params;

        console.log(`💬 [SMS] Sending to: ${recipient.phone}`);

        try {
            // PASO 1: VERIFICAR SI EMPRESA PUEDE ENVIAR (CUOTA, SUSPENSIÓN)
            const companyId = recipient.company_id || metadata.companyId;
            if (!companyId) {
                throw new Error('No se pudo determinar company_id del recipient');
            }

            const billingCheck = await NotificationBillingService.canCompanySend(companyId, 'sms');

            if (!billingCheck.canSend) {
                console.warn(`🚫 [SMS] Empresa ${companyId} NO puede enviar SMS: ${billingCheck.reason}`);

                // Mensaje explícito según razón de suspensión
                let errorMessage = 'Canal SMS deshabilitado';
                if (billingCheck.reason === 'quota_exceeded') {
                    errorMessage = `Cuota mensual de SMS agotada (${billingCheck.usage.current}/${billingCheck.usage.quota})`;
                } else if (billingCheck.reason === 'channel_suspended') {
                    errorMessage = 'Canal SMS suspendido por Aponnt (contactar administrador)';
                } else if (billingCheck.reason.includes('non_payment')) {
                    errorMessage = 'Canal SMS suspendido por falta de pago';
                }

                return {
                    provider: 'twilio_sms',
                    status: 'suspended',
                    reason: billingCheck.reason,
                    message: errorMessage,
                    messageId: null
                };
            }

            console.log(`✅ [SMS] Empresa ${companyId} puede enviar (${billingCheck.usage.current}/${billingCheck.usage.quota || '∞'})`);

            // PASO 2: Obtener número de teléfono del recipient
            let phoneNumber = recipient.phone;

            // Si no tiene phone en recipient, buscar en BD
            if (!phoneNumber && recipient.user_id) {
                const userPhone = await sequelize.query(`
                    SELECT phone, mobile_phone
                    FROM users
                    WHERE id = :userId
                      AND deleted_at IS NULL
                `, {
                    replacements: { userId: recipient.user_id },
                    type: QueryTypes.SELECT
                });

                if (userPhone && userPhone.length > 0) {
                    phoneNumber = userPhone[0].mobile_phone || userPhone[0].phone;
                }
            }

            if (!phoneNumber) {
                console.warn(`⚠️  [SMS] Usuario ${recipient.user_id} no tiene número de teléfono`);
                return {
                    provider: 'twilio_sms',
                    status: 'no_phone',
                    messageId: null
                };
            }

            // PASO 3: Enviar SMS vía Twilio
            const result = await TwilioMessagingService.sendSMS({
                to: phoneNumber,
                body: message
            });

            // PASO 4: REGISTRAR BILLING (acumular costo)
            const notificationId = metadata.notificationId || logId;
            if (notificationId) {
                await NotificationBillingService.registerBilling(
                    companyId,
                    notificationId,
                    'sms',
                    result.success ? 'delivered' : 'failed'
                );
            }

            return {
                provider: 'twilio_sms',
                messageId: result.messageSid || `sms_${Date.now()}`,
                status: result.success ? 'sent' : 'failed',
                details: result
            };

        } catch (error) {
            console.error('❌ [SMS] Error enviando SMS:', error);
            return {
                provider: 'twilio_sms',
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * ========================================================================
     * SEND WHATSAPP - Enviar WhatsApp vía Twilio
     * ========================================================================
     */
    async sendWhatsApp(params) {
        const { recipient, message, metadata, logId } = params;

        console.log(`📱 [WHATSAPP] Sending to: ${recipient.phone}`);

        try {
            // PASO 1: VERIFICAR SI EMPRESA PUEDE ENVIAR (CUOTA, SUSPENSIÓN)
            const companyId = recipient.company_id || metadata.companyId;
            if (!companyId) {
                throw new Error('No se pudo determinar company_id del recipient');
            }

            const billingCheck = await NotificationBillingService.canCompanySend(companyId, 'whatsapp');

            if (!billingCheck.canSend) {
                console.warn(`🚫 [WHATSAPP] Empresa ${companyId} NO puede enviar WhatsApp: ${billingCheck.reason}`);

                // Mensaje explícito según razón de suspensión
                let errorMessage = 'Canal WhatsApp deshabilitado';
                if (billingCheck.reason === 'quota_exceeded') {
                    errorMessage = `Cuota mensual de WhatsApp agotada (${billingCheck.usage.current}/${billingCheck.usage.quota})`;
                } else if (billingCheck.reason === 'channel_suspended') {
                    errorMessage = 'Canal WhatsApp suspendido por Aponnt (contactar administrador)';
                } else if (billingCheck.reason.includes('non_payment')) {
                    errorMessage = 'Canal WhatsApp suspendido por falta de pago';
                }

                return {
                    provider: 'twilio_whatsapp',
                    status: 'suspended',
                    reason: billingCheck.reason,
                    message: errorMessage,
                    messageId: null
                };
            }

            console.log(`✅ [WHATSAPP] Empresa ${companyId} puede enviar (${billingCheck.usage.current}/${billingCheck.usage.quota || '∞'})`);

            // PASO 2: Obtener número de teléfono del recipient
            let phoneNumber = recipient.phone;

            // Si no tiene phone en recipient, buscar en BD
            if (!phoneNumber && recipient.user_id) {
                const userPhone = await sequelize.query(`
                    SELECT phone, mobile_phone, whatsapp_phone
                    FROM users
                    WHERE id = :userId
                      AND deleted_at IS NULL
                `, {
                    replacements: { userId: recipient.user_id },
                    type: QueryTypes.SELECT
                });

                if (userPhone && userPhone.length > 0) {
                    phoneNumber = userPhone[0].whatsapp_phone || userPhone[0].mobile_phone || userPhone[0].phone;
                }
            }

            if (!phoneNumber) {
                console.warn(`⚠️  [WHATSAPP] Usuario ${recipient.user_id} no tiene número de teléfono`);
                return {
                    provider: 'twilio_whatsapp',
                    status: 'no_phone',
                    messageId: null
                };
            }

            // PASO 3: Enviar WhatsApp vía Twilio
            const result = await TwilioMessagingService.sendWhatsApp({
                to: phoneNumber,
                body: message
            });

            // PASO 4: REGISTRAR BILLING (acumular costo)
            const notificationId = metadata.notificationId || logId;
            if (notificationId) {
                await NotificationBillingService.registerBilling(
                    companyId,
                    notificationId,
                    'whatsapp',
                    result.success ? 'delivered' : 'failed'
                );
            }

            return {
                provider: 'twilio_whatsapp',
                messageId: result.messageSid || `wa_${Date.now()}`,
                status: result.success ? 'sent' : 'failed',
                details: result
            };

        } catch (error) {
            console.error('❌ [WHATSAPP] Error enviando WhatsApp:', error);
            return {
                provider: 'twilio_whatsapp',
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * ========================================================================
     * SEND PUSH - Enviar push notification vía Firebase Cloud Messaging
     * ========================================================================
     */
    async sendPush(params) {
        const { recipient, title, message, metadata, logId } = params;

        console.log(`🔔 [PUSH] Sending to user: ${recipient.user_id}`);

        try {
            // Obtener push token del usuario desde BD
            const userTokens = await sequelize.query(`
                SELECT push_token, push_token_ios, push_token_android
                FROM users
                WHERE id = :userId
                  AND deleted_at IS NULL
                  AND (push_token IS NOT NULL
                    OR push_token_ios IS NOT NULL
                    OR push_token_android IS NOT NULL)
            `, {
                replacements: { userId: recipient.user_id },
                type: QueryTypes.SELECT
            });

            if (!userTokens || userTokens.length === 0) {
                console.warn(`⚠️  [PUSH] Usuario ${recipient.user_id} no tiene push tokens registrados`);
                return {
                    provider: 'fcm',
                    status: 'no_token',
                    messageId: null
                };
            }

            const user = userTokens[0];
            const tokens = [
                user.push_token,
                user.push_token_ios,
                user.push_token_android
            ].filter(Boolean);

            if (tokens.length === 0) {
                console.warn(`⚠️  [PUSH] Usuario ${recipient.user_id} no tiene push tokens válidos`);
                return {
                    provider: 'fcm',
                    status: 'no_token',
                    messageId: null
                };
            }

            // Preparar data adicional
            const data = {
                notification_id: logId || '',
                module: metadata?.module || '',
                origin_type: metadata?.origin_type || '',
                origin_id: metadata?.origin_id || '',
                action_required: metadata?.requires_action ? 'true' : 'false',
                ...metadata
            };

            // Enviar a todos los tokens del usuario
            let result;
            if (tokens.length === 1) {
                result = await FirebasePushService.sendToDevice({
                    token: tokens[0],
                    title,
                    body: message,
                    data
                });
            } else {
                result = await FirebasePushService.sendToMultipleDevices({
                    tokens,
                    title,
                    body: message,
                    data
                });
            }

            return {
                provider: 'fcm',
                messageId: result.messageId || `push_${Date.now()}`,
                status: result.success ? 'sent' : 'failed',
                details: result
            };

        } catch (error) {
            console.error('❌ [PUSH] Error enviando push notification:', error);
            return {
                provider: 'fcm',
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * ========================================================================
     * SEND WEBSOCKET - Enviar por WebSocket vía Socket.IO
     * ========================================================================
     */
    async sendWebSocket(params) {
        const { recipient, title, message, metadata, logId } = params;

        console.log(`🌐 [WEBSOCKET] Sending to user: ${recipient.user_id}`);

        try {
            // Preparar payload de notificación
            const notification = {
                id: logId,
                title,
                message,
                priority: metadata?.priority || 'normal',
                category: metadata?.category || 'info',
                requiresAction: metadata?.requires_action || false,
                actionType: metadata?.action_type,
                module: metadata?.module,
                originType: metadata?.origin_type,
                originId: metadata?.origin_id,
                metadata
            };

            // Enviar via WebSocket
            const result = await NotificationWebSocketService.sendToUser(
                recipient.user_id,
                notification
            );

            return {
                provider: 'websocket',
                messageId: result.messageId || `ws_${Date.now()}`,
                status: result.success ? 'sent' : result.status,
                isOnline: result.status !== 'user_offline',
                details: result
            };

        } catch (error) {
            console.error('❌ [WEBSOCKET] Error enviando por WebSocket:', error);
            return {
                provider: 'websocket',
                status: 'failed',
                error: error.message,
                isOnline: false
            };
        }
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
