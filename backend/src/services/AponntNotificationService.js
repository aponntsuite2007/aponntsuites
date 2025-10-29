/**
 * ============================================================================
 * APONNT NOTIFICATION SERVICE
 * ============================================================================
 *
 * Servicio centralizado para notificaciones automáticas del circuito:
 * APONNT (Plataforma) → EMPRESAS (Clientes)
 *
 * Eventos que disparan notificaciones:
 * 1. Alta de nueva empresa
 * 2. Cambio en facturación/módulos
 * 3. Avisos de la plataforma (actualizaciones, mantenimiento, etc.)
 * 4. Alertas críticas del sistema
 *
 * Canales de notificación:
 * - Email (EmailService.sendFromAponnt)
 * - Notificación interna (NotificationsEnterprise)
 * - SMS (futuro)
 *
 * ============================================================================
 */

const { sequelize } = require('../config/database');

class AponntNotificationService {
    constructor() {
        this.emailService = null; // Se inicializa lazy
        console.log('🔔 [APONNT-NOTIF] Servicio de notificaciones Aponnt → Empresas inicializado');
    }

    /**
     * Inicializar EmailService de forma lazy
     */
    _getEmailService() {
        if (!this.emailService) {
            try {
                const EmailService = require('./EmailService');
                this.emailService = new EmailService();
            } catch (error) {
                console.error('❌ [APONNT-NOTIF] Error cargando EmailService:', error.message);
                this.emailService = null;
            }
        }
        return this.emailService;
    }

    /**
     * ========================================================================
     * EVENTO 1: NUEVA EMPRESA REGISTRADA
     * ========================================================================
     */
    async notifyNewCompany(companyData) {
        try {
            console.log(`🏢 [APONNT-NOTIF] Notificando nueva empresa: ${companyData.name} (ID: ${companyData.id})`);

            const notifications = [];

            // 1. EMAIL A LA EMPRESA (BIENVENIDA)
            try {
                const emailService = this._getEmailService();
                if (emailService) {
                    const welcomeEmail = await emailService.sendFromAponnt('transactional', {
                        to: companyData.contactEmail,
                        recipientName: companyData.name,
                        subject: `¡Bienvenido a Aponnt! - ${companyData.name}`,
                        category: 'onboarding',
                        html: this._generateWelcomeEmailHTML(companyData),
                        text: this._generateWelcomeEmailText(companyData)
                    });

                    notifications.push({
                        type: 'email',
                        status: 'sent',
                        messageId: welcomeEmail.messageId
                    });

                    console.log(`📧 [APONNT-NOTIF] Email de bienvenida enviado a ${companyData.contactEmail}`);
                }
            } catch (emailError) {
                console.error(`❌ [APONNT-NOTIF] Error enviando email de bienvenida:`, emailError.message);
                notifications.push({
                    type: 'email',
                    status: 'failed',
                    error: emailError.message
                });
            }

            // 2. NOTIFICACIÓN INTERNA (PARA ADMIN DE LA EMPRESA)
            try {
                await this._createInternalNotification({
                    company_id: companyData.id,
                    title: '¡Bienvenido a Aponnt! 🎉',
                    message: `Tu empresa ${companyData.name} ha sido registrada exitosamente. Ya puedes comenzar a configurar tus módulos.`,
                    type: 'info',
                    category: 'onboarding',
                    priority: 'high',
                    from_user: 'aponnt-system',
                    action_url: '/dashboard',
                    metadata: {
                        companyId: companyData.id,
                        licenseType: companyData.licenseType,
                        maxEmployees: companyData.maxEmployees
                    }
                });

                notifications.push({
                    type: 'internal',
                    status: 'created'
                });

                console.log(`🔔 [APONNT-NOTIF] Notificación interna creada para empresa ${companyData.id}`);
            } catch (notifError) {
                console.error(`❌ [APONNT-NOTIF] Error creando notificación interna:`, notifError.message);
                notifications.push({
                    type: 'internal',
                    status: 'failed',
                    error: notifError.message
                });
            }

            // 3. NOTIFICACIÓN INTERNA PARA APONNT (ADMIN DE PLATAFORMA)
            try {
                await this._createInternalNotification({
                    company_id: 1, // ID de la empresa Aponnt (plataforma)
                    title: '🏢 Nueva empresa registrada',
                    message: `${companyData.name} se ha registrado en la plataforma`,
                    type: 'info',
                    category: 'platform_activity',
                    priority: 'medium',
                    from_user: 'system',
                    action_url: `/aponnt/companies/${companyData.id}`,
                    metadata: {
                        companyId: companyData.id,
                        companyName: companyData.name,
                        licenseType: companyData.licenseType,
                        maxEmployees: companyData.maxEmployees,
                        modules: companyData.modules
                    }
                });

                console.log(`🔔 [APONNT-NOTIF] Notificación enviada a plataforma Aponnt`);
            } catch (error) {
                console.error(`❌ [APONNT-NOTIF] Error notificando a Aponnt:`, error.message);
            }

            return {
                success: true,
                notifications
            };

        } catch (error) {
            console.error(`❌ [APONNT-NOTIF] Error en notifyNewCompany:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ========================================================================
     * EVENTO 2: CAMBIO EN FACTURACIÓN/MÓDULOS
     * ========================================================================
     */
    async notifyModuleChange(companyId, changeData) {
        try {
            console.log(`💰 [APONNT-NOTIF] Notificando cambio de módulos para empresa ${companyId}`);

            // Obtener datos de la empresa
            const [company] = await sequelize.query(`
                SELECT company_id as id, name, contact_email FROM companies WHERE company_id = ?
            `, {
                replacements: [companyId],
                type: sequelize.QueryTypes.SELECT
            });

            if (!company) {
                throw new Error(`Empresa ${companyId} no encontrada`);
            }

            const notifications = [];

            // 1. EMAIL A LA EMPRESA
            try {
                const emailService = this._getEmailService();
                if (emailService) {
                    const moduleChangeEmail = await emailService.sendFromAponnt('billing', {
                        to: company.contact_email,
                        recipientName: company.name,
                        subject: `Cambios en tu suscripción - ${company.name}`,
                        category: 'billing',
                        html: this._generateModuleChangeEmailHTML(company, changeData),
                        text: this._generateModuleChangeEmailText(company, changeData)
                    });

                    notifications.push({
                        type: 'email',
                        status: 'sent',
                        messageId: moduleChangeEmail.messageId
                    });
                }
            } catch (emailError) {
                console.error(`❌ [APONNT-NOTIF] Error enviando email de cambio:`, emailError.message);
            }

            // 2. NOTIFICACIÓN INTERNA
            try {
                const changeType = changeData.added?.length > 0 ? 'Nuevos módulos agregados' :
                                   changeData.removed?.length > 0 ? 'Módulos desactivados' :
                                   'Cambios en tu suscripción';

                await this._createInternalNotification({
                    company_id: companyId,
                    title: `💰 ${changeType}`,
                    message: this._generateModuleChangeMessage(changeData),
                    type: 'warning',
                    category: 'billing',
                    priority: 'high',
                    from_user: 'aponnt-billing',
                    action_url: '/billing',
                    metadata: changeData
                });

                notifications.push({
                    type: 'internal',
                    status: 'created'
                });
            } catch (notifError) {
                console.error(`❌ [APONNT-NOTIF] Error creando notificación:`, notifError.message);
            }

            return {
                success: true,
                notifications
            };

        } catch (error) {
            console.error(`❌ [APONNT-NOTIF] Error en notifyModuleChange:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ========================================================================
     * EVENTO 3: AVISO DE LA PLATAFORMA (BROADCAST)
     * ========================================================================
     */
    async notifyPlatformAnnouncement(announcementData) {
        try {
            console.log(`📢 [APONNT-NOTIF] Enviando aviso de plataforma: ${announcementData.title}`);

            // Obtener todas las empresas activas
            const companies = await sequelize.query(`
                SELECT company_id as id, name, contact_email FROM companies WHERE is_active = true
            `, {
                type: sequelize.QueryTypes.SELECT
            });

            console.log(`📊 [APONNT-NOTIF] Enviando a ${companies.length} empresas`);

            const results = [];

            for (const company of companies) {
                try {
                    // Email
                    const emailService = this._getEmailService();
                    if (emailService && announcementData.sendEmail) {
                        await emailService.sendFromAponnt('marketing', {
                            to: company.contact_email,
                            recipientName: company.name,
                            subject: announcementData.title,
                            category: 'announcement',
                            html: announcementData.html,
                            text: announcementData.text
                        });
                    }

                    // Notificación interna
                    await this._createInternalNotification({
                        company_id: company.id,
                        title: announcementData.title,
                        message: announcementData.message,
                        type: announcementData.type || 'info',
                        category: 'platform_announcement',
                        priority: announcementData.priority || 'medium',
                        from_user: 'aponnt-platform',
                        action_url: announcementData.actionUrl,
                        metadata: announcementData.metadata
                    });

                    results.push({
                        companyId: company.id,
                        success: true
                    });

                } catch (error) {
                    console.error(`❌ [APONNT-NOTIF] Error notificando empresa ${company.id}:`, error.message);
                    results.push({
                        companyId: company.id,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`✅ [APONNT-NOTIF] Aviso enviado a ${successCount}/${companies.length} empresas`);

            return {
                success: true,
                totalCompanies: companies.length,
                successCount,
                results
            };

        } catch (error) {
            console.error(`❌ [APONNT-NOTIF] Error en notifyPlatformAnnouncement:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ========================================================================
     * EVENTO 4: ALERTA CRÍTICA DEL SISTEMA
     * ========================================================================
     */
    async notifySystemAlert(companyId, alertData) {
        try {
            console.log(`🚨 [APONNT-NOTIF] Enviando alerta crítica a empresa ${companyId}`);

            // Obtener datos de la empresa
            const [company] = await sequelize.query(`
                SELECT company_id as id, name, contact_email FROM companies WHERE company_id = ?
            `, {
                replacements: [companyId],
                type: sequelize.QueryTypes.SELECT
            });

            if (!company) {
                throw new Error(`Empresa ${companyId} no encontrada`);
            }

            const notifications = [];

            // 1. EMAIL URGENTE
            try {
                const emailService = this._getEmailService();
                if (emailService) {
                    const alertEmail = await emailService.sendFromAponnt('support', {
                        to: company.contact_email,
                        recipientName: company.name,
                        subject: `🚨 ALERTA: ${alertData.title}`,
                        category: 'alert',
                        html: this._generateAlertEmailHTML(company, alertData),
                        text: this._generateAlertEmailText(company, alertData)
                    });

                    notifications.push({
                        type: 'email',
                        status: 'sent',
                        messageId: alertEmail.messageId
                    });
                }
            } catch (emailError) {
                console.error(`❌ [APONNT-NOTIF] Error enviando email de alerta:`, emailError.message);
            }

            // 2. NOTIFICACIÓN INTERNA CRÍTICA
            try {
                await this._createInternalNotification({
                    company_id: companyId,
                    title: `🚨 ${alertData.title}`,
                    message: alertData.message,
                    type: 'error',
                    category: 'system_alert',
                    priority: 'critical',
                    from_user: 'aponnt-system',
                    action_url: alertData.actionUrl,
                    metadata: alertData.metadata,
                    requires_action: true
                });

                notifications.push({
                    type: 'internal',
                    status: 'created'
                });
            } catch (notifError) {
                console.error(`❌ [APONNT-NOTIF] Error creando notificación:`, notifError.message);
            }

            return {
                success: true,
                notifications
            };

        } catch (error) {
            console.error(`❌ [APONNT-NOTIF] Error en notifySystemAlert:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ========================================================================
     * HELPERS INTERNOS
     * ========================================================================
     */

    async _createInternalNotification(notificationData) {
        await sequelize.query(`
            INSERT INTO notifications_enterprise (
                company_id,
                title,
                message,
                type,
                category,
                priority,
                from_user,
                action_url,
                metadata,
                requires_action,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, {
            replacements: [
                notificationData.company_id,
                notificationData.title,
                notificationData.message,
                notificationData.type || 'info',
                notificationData.category || 'general',
                notificationData.priority || 'medium',
                notificationData.from_user || 'system',
                notificationData.action_url || null,
                JSON.stringify(notificationData.metadata || {}),
                notificationData.requires_action || false
            ]
        });
    }

    _generateWelcomeEmailHTML(companyData) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                    .highlight { background: #fff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>¡Bienvenido a Aponnt! 🎉</h1>
                    </div>
                    <div class="content">
                        <p>Hola <strong>${companyData.name}</strong>,</p>

                        <p>Tu empresa ha sido registrada exitosamente en nuestra plataforma.</p>

                        <div class="highlight">
                            <h3>Datos de tu cuenta</h3>
                            <ul>
                                <li><strong>Empresa:</strong> ${companyData.name}</li>
                                <li><strong>Tipo de licencia:</strong> ${companyData.licenseType}</li>
                                <li><strong>Empleados máximos:</strong> ${companyData.maxEmployees}</li>
                                <li><strong>Módulos contratados:</strong> ${companyData.modules?.length || 0}</li>
                            </ul>
                        </div>

                        <p><strong>Credenciales de acceso:</strong></p>
                        <ul>
                            <li>Usuario: <code>admin</code></li>
                            <li>Contraseña: <code>admin123</code></li>
                            <li>Empresa (slug): <code>${companyData.slug || companyData.name.toLowerCase()}</code></li>
                        </ul>

                        <p style="background: #fff3cd; padding: 15px; border-radius: 5px;">
                            ⚠️ <strong>Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña en el primer acceso.
                        </p>

                        <a href="http://localhost:9998/panel-empresa.html" class="button">Acceder al Panel</a>

                        <p>Si tienes alguna duda, nuestro equipo de soporte está disponible para ayudarte.</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Aponnt - Sistema de Asistencia Biométrico</p>
                        <p>Este es un email automático, por favor no respondas a este mensaje.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    _generateWelcomeEmailText(companyData) {
        return `
¡Bienvenido a Aponnt!

Hola ${companyData.name},

Tu empresa ha sido registrada exitosamente en nuestra plataforma.

DATOS DE TU CUENTA:
- Empresa: ${companyData.name}
- Tipo de licencia: ${companyData.licenseType}
- Empleados máximos: ${companyData.maxEmployees}
- Módulos contratados: ${companyData.modules?.length || 0}

CREDENCIALES DE ACCESO:
- Usuario: admin
- Contraseña: admin123
- Empresa (slug): ${companyData.slug || companyData.name.toLowerCase()}

IMPORTANTE: Por seguridad, te recomendamos cambiar tu contraseña en el primer acceso.

Accede al panel: http://localhost:9998/panel-empresa.html

Si tienes alguna duda, nuestro equipo de soporte está disponible para ayudarte.

---
© ${new Date().getFullYear()} Aponnt - Sistema de Asistencia Biométrico
        `;
    }

    _generateModuleChangeEmailHTML(company, changeData) {
        const addedModules = changeData.added?.map(m => `<li>${m.name}</li>`).join('') || '';
        const removedModules = changeData.removed?.map(m => `<li>${m.name}</li>`).join('') || '';

        return `
            <h2>Cambios en tu suscripción - ${company.name}</h2>
            ${addedModules ? `<h3>Módulos agregados:</h3><ul>${addedModules}</ul>` : ''}
            ${removedModules ? `<h3>Módulos desactivados:</h3><ul>${removedModules}</ul>` : ''}
            <p><strong>Nuevo total mensual:</strong> $${changeData.newTotal || 0}</p>
        `;
    }

    _generateModuleChangeEmailText(company, changeData) {
        return `
Cambios en tu suscripción - ${company.name}

${changeData.added?.length ? `Módulos agregados:\n${changeData.added.map(m => `- ${m.name}`).join('\n')}` : ''}
${changeData.removed?.length ? `Módulos desactivados:\n${changeData.removed.map(m => `- ${m.name}`).join('\n')}` : ''}

Nuevo total mensual: $${changeData.newTotal || 0}
        `;
    }

    _generateModuleChangeMessage(changeData) {
        if (changeData.added?.length > 0) {
            return `Se han agregado ${changeData.added.length} módulo(s) a tu suscripción. Nuevo total: $${changeData.newTotal || 0}/mes`;
        }
        if (changeData.removed?.length > 0) {
            return `Se han desactivado ${changeData.removed.length} módulo(s) de tu suscripción. Nuevo total: $${changeData.newTotal || 0}/mes`;
        }
        return `Se han realizado cambios en tu suscripción. Nuevo total: $${changeData.newTotal || 0}/mes`;
    }

    _generateAlertEmailHTML(company, alertData) {
        return `
            <h2 style="color: #dc3545;">🚨 ALERTA: ${alertData.title}</h2>
            <p>${alertData.message}</p>
            ${alertData.details ? `<div style="background: #f8d7da; padding: 15px; border-radius: 5px;">${alertData.details}</div>` : ''}
            ${alertData.actionUrl ? `<a href="${alertData.actionUrl}" style="display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Ver Detalles</a>` : ''}
        `;
    }

    _generateAlertEmailText(company, alertData) {
        return `
🚨 ALERTA: ${alertData.title}

${alertData.message}

${alertData.details || ''}

${alertData.actionUrl ? `Ver detalles: ${alertData.actionUrl}` : ''}
        `;
    }
}

// Exportar instancia singleton
module.exports = new AponntNotificationService();
