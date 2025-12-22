/**
 * ============================================================================
 * EMAIL SERVICE - ARQUITECTURA MULTICAPA
 * ============================================================================
 *
 * Sistema profesional de emails con 3 capas:
 * 1. APONNT: Emails de la plataforma (transaccionales, soporte, billing)
 * 2. EMPRESA: Emails institucionales del cliente (ISI, etc.)
 * 3. EMPLEADOS: Emails individuales con preferencias personalizadas
 *
 * Características:
 * - Validación SMTP obligatoria al crear empresa
 * - Sincronización automática de emails de empleados
 * - Logs completos de todos los envíos
 * - Templates reutilizables
 * - Límites y cuotas configurables
 * - Tracking de aperturas y clicks
 *
 * ============================================================================
 */

const nodemailer = require('nodemailer');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

class EmailService {
    constructor() {
        this.transporters = new Map(); // Cache de transporters SMTP por empresa
        this.aponntTransporters = new Map(); // Transporters de Aponnt
    }

    /**
     * ========================================================================
     * CAPA 1: APONNT - Emails de la plataforma
     * ========================================================================
     */

    /**
     * Enviar email desde Aponnt (plataforma)
     * @param {string} configType - 'transactional', 'support', 'billing', 'marketing'
     * @param {object} emailData - {to, subject, html, text, attachments}
     */
    async sendFromAponnt(configType, emailData) {
        try {
            console.log(`📧 [APONNT] Enviando email tipo: ${configType} a: ${emailData.to}`);

            // Obtener configuración de Aponnt
            const [config] = await sequelize.query(`
                SELECT * FROM aponnt_email_config
                WHERE email_type = :configType AND is_active = true
                LIMIT 1
            `, {
                replacements: { configType },
                type: sequelize.QueryTypes.SELECT
            });

            if (!config) {
                throw new Error(`Configuración de email de Aponnt no encontrada: ${configType}`);
            }

            // Crear/obtener transporter
            const transporter = await this._getAponntTransporter(config);

            // Enviar email
            const info = await transporter.sendMail({
                from: `"${config.from_name}" <${config.from_email}>`,
                to: emailData.to,
                replyTo: config.reply_to || config.from_email,
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text,
                attachments: emailData.attachments
            });

            // Registrar en log
            await this._logEmail({
                sender_type: 'aponnt',
                sender_id: configType,
                company_id: emailData.companyId || null, // Si el email de Aponnt es para una empresa específica
                recipient_email: emailData.to,
                recipient_name: emailData.recipientName,
                subject: emailData.subject,
                body_html: emailData.html,
                body_text: emailData.text,
                category: emailData.category || 'transactional',
                status: 'sent',
                sent_at: new Date(),
                message_id: info.messageId
            });

            console.log(`✅ [APONNT] Email enviado exitosamente: ${info.messageId}`);
            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error(`❌ [APONNT] Error enviando email:`, error.message);

            // Registrar error en log
            await this._logEmail({
                sender_type: 'aponnt',
                sender_id: configType,
                recipient_email: emailData.to,
                subject: emailData.subject,
                status: 'failed',
                error_message: error.message,
                error_code: error.code
            });

            throw error;
        }
    }

    /**
     * ========================================================================
     * CAPA 2: EMPRESA - Emails institucionales del cliente
     * ========================================================================
     */

    /**
     * Validar configuración SMTP de una empresa (se ejecuta al crear empresa)
     * @param {object} smtpConfig - {host, port, user, password, secure}
     * @returns {Promise<{valid: boolean, error?: string}>}
     */
    async validateCompanySMTP(smtpConfig) {
        try {
            console.log(`🔍 [EMPRESA] Validando configuración SMTP: ${smtpConfig.host}:${smtpConfig.port}`);

            const transporter = nodemailer.createTransport({
                host: smtpConfig.host,
                port: smtpConfig.port,
                secure: smtpConfig.secure || false,
                auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.password
                },
                tls: {
                    rejectUnauthorized: false // Para desarrollo
                }
            });

            // Verificar conexión SMTP
            await transporter.verify();

            // Enviar email de prueba
            const testEmail = await transporter.sendMail({
                from: `"${smtpConfig.fromName || 'Test'}" <${smtpConfig.user}>`,
                to: smtpConfig.user, // Enviar a sí mismo
                subject: '✅ Configuración SMTP Validada - Sistema Biométrico',
                html: `
                    <h2>¡Configuración SMTP Exitosa!</h2>
                    <p>Tu configuración de email institucional ha sido validada correctamente.</p>
                    <p><strong>Servidor:</strong> ${smtpConfig.host}:${smtpConfig.port}</p>
                    <p><strong>Usuario:</strong> ${smtpConfig.user}</p>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
                    <hr>
                    <p style="color: #666; font-size: 0.9em;">Este es un email de prueba automático del Sistema Biométrico Aponnt.</p>
                `
            });

            console.log(`✅ [EMPRESA] SMTP validado exitosamente: ${testEmail.messageId}`);
            return { valid: true, messageId: testEmail.messageId };

        } catch (error) {
            console.error(`❌ [EMPRESA] Error validando SMTP:`, error.message);
            return {
                valid: false,
                error: error.message,
                code: error.code
            };
        }
    }

    /**
     * Configurar email institucional de una empresa
     * @param {number} companyId
     * @param {object} emailConfig
     */
    async configureCompanyEmail(companyId, emailConfig, userId) {
        try {
            console.log(`📧 [EMPRESA] Configurando email para company_id: ${companyId}`);

            // 1. Validar configuración SMTP primero
            const validation = await this.validateCompanySMTP(emailConfig.smtp);

            if (!validation.valid) {
                throw new Error(`Configuración SMTP inválida: ${validation.error}`);
            }

            // 2. Encriptar password (en producción usar mejor encryption)
            const encryptedPassword = Buffer.from(emailConfig.smtp.password).toString('base64');

            // 3. Insertar o actualizar configuración
            const [result] = await sequelize.query(`
                INSERT INTO email_configurations (
                    company_id,
                    institutional_email,
                    display_name,
                    smtp_host,
                    smtp_port,
                    smtp_user,
                    smtp_password,
                    smtp_secure,
                    from_name,
                    reply_to,
                    is_verified,
                    verified_at,
                    created_by,
                    updated_by
                ) VALUES (
                    :companyId,
                    :institutionalEmail,
                    :displayName,
                    :smtpHost,
                    :smtpPort,
                    :smtpUser,
                    :smtpPassword,
                    :smtpSecure,
                    :fromName,
                    :replyTo,
                    true,
                    CURRENT_TIMESTAMP,
                    :userId,
                    :userId
                )
                ON CONFLICT (company_id)
                DO UPDATE SET
                    institutional_email = EXCLUDED.institutional_email,
                    smtp_host = EXCLUDED.smtp_host,
                    smtp_port = EXCLUDED.smtp_port,
                    smtp_user = EXCLUDED.smtp_user,
                    smtp_password = EXCLUDED.smtp_password,
                    smtp_secure = EXCLUDED.smtp_secure,
                    from_name = EXCLUDED.from_name,
                    reply_to = EXCLUDED.reply_to,
                    is_verified = true,
                    verified_at = CURRENT_TIMESTAMP,
                    updated_by = :userId,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
            `, {
                replacements: {
                    companyId,
                    institutionalEmail: emailConfig.institutionalEmail,
                    displayName: emailConfig.displayName,
                    smtpHost: emailConfig.smtp.host,
                    smtpPort: emailConfig.smtp.port,
                    smtpUser: emailConfig.smtp.user,
                    smtpPassword: encryptedPassword,
                    smtpSecure: emailConfig.smtp.secure || false,
                    fromName: emailConfig.fromName,
                    replyTo: emailConfig.replyTo,
                    userId
                },
                type: sequelize.QueryTypes.INSERT
            });

            // 4. Limpiar cache de transporter
            this.transporters.delete(companyId);

            console.log(`✅ [EMPRESA] Email configurado exitosamente para company_id: ${companyId}`);
            return { success: true, configId: result[0].id };

        } catch (error) {
            console.error(`❌ [EMPRESA] Error configurando email:`, error.message);
            throw error;
        }
    }

    /**
     * Enviar email desde una empresa a sus empleados
     * @param {number} companyId
     * @param {object} emailData
     */
    async sendFromCompany(companyId, emailData) {
        try {
            console.log(`📧 [EMPRESA] Enviando email desde company_id: ${companyId} a: ${emailData.to}`);

            // 1. Verificar límites
            const withinLimits = await this._checkEmailLimits(companyId);
            if (!withinLimits) {
                throw new Error('Límite de envío de emails alcanzado para hoy/mes');
            }

            // 2. Obtener configuración de la empresa
            const config = await this._getCompanyConfig(companyId);
            if (!config) {
                throw new Error(`Configuración de email no encontrada para company_id: ${companyId}`);
            }

            // 3. Obtener transporter
            const transporter = await this._getCompanyTransporter(companyId);

            // 4. Enviar email
            const info = await transporter.sendMail({
                from: `"${config.from_name || config.display_name}" <${config.institutional_email}>`,
                to: emailData.to,
                cc: emailData.cc || config.cc_copy,
                bcc: emailData.bcc || config.bcc_copy,
                replyTo: config.reply_to || config.institutional_email,
                subject: emailData.subject,
                html: this._addSignature(emailData.html, config.signature),
                text: emailData.text,
                attachments: emailData.attachments
            });

            // 5. Incrementar contador
            await sequelize.query(`
                SELECT increment_email_counter(:companyId)
            `, {
                replacements: { companyId }
            });

            // 6. Registrar en log
            await this._logEmail({
                sender_type: 'company',
                sender_id: companyId.toString(),
                email_config_id: config.id,
                company_id: companyId, // ← IMPORTANTE: siempre incluir company_id
                recipient_email: emailData.to,
                recipient_name: emailData.recipientName,
                recipient_type: emailData.recipientType || 'employee',
                subject: emailData.subject,
                body_html: emailData.html,
                body_text: emailData.text,
                category: emailData.category,
                notification_id: emailData.notificationId,
                status: 'sent',
                sent_at: new Date(),
                message_id: info.messageId
            });

            console.log(`✅ [EMPRESA] Email enviado exitosamente: ${info.messageId}`);
            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error(`❌ [EMPRESA] Error enviando email:`, error.message);

            await this._logEmail({
                sender_type: 'company',
                sender_id: companyId.toString(),
                company_id: companyId,
                recipient_email: emailData.to,
                subject: emailData.subject,
                status: 'failed',
                error_message: error.message
            });

            throw error;
        }
    }

    /**
     * ========================================================================
     * CAPA 3: EMPLEADOS - Emails individuales
     * ========================================================================
     */

    /**
     * Enviar notificación a un empleado (respeta sus preferencias)
     * @param {string} userId
     * @param {string} notificationType
     * @param {object} emailData
     */
    async sendToEmployee(userId, notificationType, emailData) {
        try {
            console.log(`📧 [EMPLEADO] Enviando notificación tipo: ${notificationType} a user_id: ${userId}`);

            // 1. Obtener preferencias del empleado
            const [userEmail] = await sequelize.query(`
                SELECT
                    ue.*,
                    u.company_id,
                    u."firstName",
                    u."lastName"
                FROM user_emails ue
                JOIN users u ON u.user_id = ue.user_id
                WHERE ue.user_id = :userId
                AND ue.is_active = true
                AND ue.is_primary = true
                LIMIT 1
            `, {
                replacements: { userId },
                type: sequelize.QueryTypes.SELECT
            });

            if (!userEmail) {
                throw new Error(`Email no encontrado para user_id: ${userId}`);
            }

            // 2. Verificar preferencias de notificación
            const preferenceMap = {
                'system': 'receive_system_notifications',
                'attendance': 'receive_attendance_alerts',
                'vacation': 'receive_vacation_updates',
                'medical': 'receive_medical_notifications',
                'legal': 'receive_legal_notices',
                'shifts': 'receive_shifts_changes',
                'payroll': 'receive_payroll_notifications'
            };

            const preferenceField = preferenceMap[notificationType];
            if (preferenceField && !userEmail[preferenceField]) {
                console.log(`⚠️  [EMPLEADO] Usuario tiene desactivadas notificaciones de tipo: ${notificationType}`);
                return { success: true, skipped: true, reason: 'user_preference' };
            }

            // 3. Verificar si email está verificado
            if (!userEmail.is_verified) {
                console.log(`⚠️  [EMPLEADO] Email no verificado: ${userEmail.email}`);
                // Continuar de todas formas (opcional: agregar warning)
            }

            // 4. Personalizar email con datos del empleado
            const personalizedEmail = {
                ...emailData,
                to: userEmail.email,
                recipientName: `${userEmail.firstName || ''} ${userEmail.lastName || ''}`.trim(),
                recipientType: 'employee',
                recipientId: userId
            };

            // 5. Enviar desde la empresa del empleado
            const result = await this.sendFromCompany(userEmail.company_id, personalizedEmail);

            // 6. Actualizar última fecha de envío
            await sequelize.query(`
                UPDATE user_emails
                SET last_email_sent = CURRENT_TIMESTAMP
                WHERE user_id = :userId
            `, {
                replacements: { userId }
            });

            console.log(`✅ [EMPLEADO] Notificación enviada exitosamente a: ${userEmail.email}`);
            return result;

        } catch (error) {
            console.error(`❌ [EMPLEADO] Error enviando notificación:`, error.message);
            throw error;
        }
    }

    /**
     * Enviar notificación a múltiples empleados
     * @param {array} userIds
     * @param {string} notificationType
     * @param {object} emailData
     */
    async sendToMultipleEmployees(userIds, notificationType, emailData) {
        const results = {
            total: userIds.length,
            sent: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };

        for (const userId of userIds) {
            try {
                const result = await this.sendToEmployee(userId, notificationType, emailData);

                if (result.skipped) {
                    results.skipped++;
                } else {
                    results.sent++;
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    userId,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * ========================================================================
     * FUNCIONES HELPER PRIVADAS
     * ========================================================================
     */

    async _getAponntTransporter(config) {
        const key = config.config_type || config.email_type;

        if (this.aponntTransporters.has(key)) {
            return this.aponntTransporters.get(key);
        }

        // Usar EmailConfigService para obtener passwords desencriptados
        const EmailConfigService = require('./EmailConfigService');
        let decryptedConfig;

        try {
            decryptedConfig = await EmailConfigService.getConfigByType(key);
        } catch (error) {
            console.warn(`⚠️ [EMAIL] No se pudo obtener config de EmailConfigService, usando config directa:`, error.message);
            decryptedConfig = config;
        }

        // Usar app_password si existe, sino smtp_password
        const password = decryptedConfig?.app_password_decrypted ||
                        decryptedConfig?.smtp_password_decrypted ||
                        config.smtp_password ||
                        config.app_password;

        if (!password) {
            throw new Error(`No hay password configurado para email tipo: ${key}`);
        }

        const transporter = nodemailer.createTransport({
            host: config.smtp_host || decryptedConfig?.smtp_host,
            port: config.smtp_port || decryptedConfig?.smtp_port || 587,
            secure: config.smtp_secure !== undefined ? config.smtp_secure : (decryptedConfig?.smtp_secure || false),
            auth: {
                user: config.from_email || config.smtp_user || decryptedConfig?.from_email || decryptedConfig?.email_address,
                pass: password
            },
            tls: {
                rejectUnauthorized: false // Para desarrollo/testing
            }
        });

        this.aponntTransporters.set(key, transporter);
        console.log(`✅ [EMAIL] Transporter creado para: ${key}`);
        return transporter;
    }

    async _getCompanyTransporter(companyId) {
        if (this.transporters.has(companyId)) {
            return this.transporters.get(companyId);
        }

        const config = await this._getCompanyConfig(companyId);
        if (!config) {
            throw new Error(`Configuración de email no encontrada para company_id: ${companyId}`);
        }

        // Desencriptar password
        const password = Buffer.from(config.smtp_password, 'base64').toString('utf8');

        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_secure,
            auth: {
                user: config.smtp_user,
                pass: password
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        this.transporters.set(companyId, transporter);
        return transporter;
    }

    async _getCompanyConfig(companyId) {
        const [config] = await sequelize.query(`
            SELECT * FROM email_configurations
            WHERE company_id = :companyId
            AND is_active = true
            AND is_verified = true
            LIMIT 1
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        return config;
    }

    async _checkEmailLimits(companyId) {
        const [result] = await sequelize.query(`
            SELECT check_email_limits(:companyId) as within_limits
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        return result.within_limits;
    }

    async _logEmail(logData) {
        try {
            await sequelize.query(`
                INSERT INTO email_logs (
                    sender_type, sender_id, email_config_id,
                    company_id,
                    recipient_email, recipient_name, recipient_type, recipient_id,
                    subject, body_html, body_text,
                    notification_id, category, status,
                    sent_at, message_id, error_message, error_code,
                    has_attachments, attachments
                ) VALUES (
                    :sender_type, :sender_id, :email_config_id,
                    :company_id,
                    :recipient_email, :recipient_name, :recipient_type, :recipient_id,
                    :subject, :body_html, :body_text,
                    :notification_id, :category, :status,
                    :sent_at, :message_id, :error_message, :error_code,
                    :has_attachments, :attachments
                )
            `, {
                replacements: {
                    sender_type: logData.sender_type,
                    sender_id: logData.sender_id,
                    email_config_id: logData.email_config_id || null,
                    company_id: logData.company_id || null,
                    recipient_email: logData.recipient_email,
                    recipient_name: logData.recipient_name || null,
                    recipient_type: logData.recipient_type || null,
                    recipient_id: logData.recipient_id || null,
                    subject: logData.subject,
                    body_html: logData.body_html || null,
                    body_text: logData.body_text || null,
                    notification_id: logData.notification_id || null,
                    category: logData.category || 'general',
                    status: logData.status,
                    sent_at: logData.sent_at || null,
                    message_id: logData.message_id || null,
                    error_message: logData.error_message || null,
                    error_code: logData.error_code || null,
                    has_attachments: logData.attachments && logData.attachments.length > 0,
                    attachments: logData.attachments ? JSON.stringify(logData.attachments) : null
                }
            });
        } catch (error) {
            console.error('❌ Error logging email:', error.message);
        }
    }

    _addSignature(html, signature) {
        if (!signature) return html;
        return `${html}<br><br><hr>${signature}`;
    }

    /**
     * ========================================================================
     * CAPA 4: PARTNERS - Emails a asociados externos
     * ========================================================================
     */

    /**
     * Enviar email a partner (médico, legal, HSE)
     * Se envía desde Aponnt para mantener neutralidad
     * @param {object} partnerData - {email, name, category, partnerId}
     * @param {number} companyId - ID de la empresa que solicitó la acción
     * @param {object} emailData - {subject, html, text, notificationId, category}
     */
    async sendToPartner(partnerData, companyId, emailData) {
        try {
            console.log(`📧 [PARTNER] Enviando email a partner: ${partnerData.email} (${partnerData.category})`);

            // Obtener nombre de la empresa para contexto
            const [company] = await sequelize.query(`
                SELECT name FROM companies WHERE company_id = :companyId
            `, {
                replacements: { companyId },
                type: sequelize.QueryTypes.SELECT
            });

            const companyName = company ? company.name : 'la empresa';

            // Enviar desde Aponnt con contexto de empresa
            const result = await this.sendFromAponnt('transactional', {
                to: partnerData.email,
                subject: `[${companyName}] ${emailData.subject}`,
                html: emailData.html,
                text: emailData.text,
                recipientName: partnerData.name,
                category: emailData.category || 'partner_notification',
                notificationId: emailData.notificationId
            });

            // Registrar en log con metadata de partner
            await this._logEmail({
                sender_type: 'aponnt',
                sender_id: 'partner_notification',
                company_id: companyId, // ← IMPORTANTE: registrar empresa origen
                recipient_email: partnerData.email,
                recipient_name: partnerData.name,
                recipient_type: 'partner',
                recipient_id: partnerData.partnerId ? partnerData.partnerId.toString() : null,
                subject: `[${companyName}] ${emailData.subject}`,
                body_html: emailData.html,
                body_text: emailData.text,
                notification_id: emailData.notificationId,
                category: emailData.category || 'partner_notification',
                status: 'sent',
                sent_at: new Date(),
                message_id: result.messageId
            });

            console.log(`✅ [PARTNER] Email enviado exitosamente a partner: ${partnerData.email}`);
            return result;

        } catch (error) {
            console.error(`❌ [PARTNER] Error enviando email a partner:`, error.message);

            await this._logEmail({
                sender_type: 'aponnt',
                sender_id: 'partner_notification',
                company_id: companyId,
                recipient_email: partnerData.email,
                recipient_type: 'partner',
                subject: emailData.subject,
                status: 'failed',
                error_message: error.message
            });

            throw error;
        }
    }

    /**
     * ========================================================================
     * UTILIDADES PÚBLICAS
     * ========================================================================
     */

    /**
     * Verificar si una empresa tiene email configurado
     */
    async companyHasEmailConfigured(companyId) {
        const [result] = await sequelize.query(`
            SELECT company_has_email_configured(:companyId) as has_config
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        return result.has_config;
    }

    /**
     * Obtener estadísticas de emails de una empresa
     */
    async getCompanyEmailStats(companyId) {
        const [stats] = await sequelize.query(`
            SELECT * FROM v_email_stats_by_company
            WHERE company_id = :companyId
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        return stats || {
            company_id: companyId,
            total_sent: 0,
            total_delivered: 0,
            total_bounced: 0,
            total_opened: 0,
            delivery_rate: 0,
            open_rate: 0
        };
    }
}

// Singleton
const emailService = new EmailService();

module.exports = emailService;
