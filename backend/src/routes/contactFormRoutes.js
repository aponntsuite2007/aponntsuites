/**
 * ============================================================================
 * CONTACT FORM ROUTES - Formulario de contacto de index.html
 * ============================================================================
 *
 * Endpoint: POST /api/contact
 * Función: Procesar formulario de contacto de la landing page
 *
 * Acciones:
 * 1. Enviar email a aponntcomercial@gmail.com
 * 2. Crear notificación enterprise para staff de Aponnt (roles GG y GA)
 * 3. Guardar lead en base de datos
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// 🔥 NCE: Central Telefónica de Notificaciones (elimina bypass)
const NCE = require('../services/NotificationCentralExchange');

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * POST /api/contact
 * Procesar formulario de contacto de index.html
 */
router.post('/contact', async (req, res) => {
    try {
        const { name, email, phone, company, subject, message } = req.body;

        // Validaciones básicas
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                error: 'Campos requeridos: name, email, subject, message'
            });
        }

        console.log(`📬 [CONTACT FORM] Nueva solicitud de contacto de: ${name} (${email})`);

        // ===================================================================
        // PASO 1: ENVIAR EMAIL A aponntcomercial@gmail.com
        // ===================================================================

        const emailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .field { margin-bottom: 20px; }
                    .field-label { font-weight: bold; color: #374151; margin-bottom: 5px; }
                    .field-value { background: white; padding: 10px; border-radius: 5px; border-left: 3px solid #667eea; }
                    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📬 Nueva Solicitud de Contacto</h1>
                        <p>Formulario de index.html - Aponnt Suite</p>
                    </div>
                    <div class="content">
                        <div class="field">
                            <div class="field-label">👤 Nombre</div>
                            <div class="field-value">${name}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">📧 Email</div>
                            <div class="field-value"><a href="mailto:${email}">${email}</a></div>
                        </div>
                        ${phone ? `
                        <div class="field">
                            <div class="field-label">📱 Teléfono/WhatsApp</div>
                            <div class="field-value"><a href="https://wa.me/${phone.replace(/\D/g, '')}">${phone}</a></div>
                        </div>
                        ` : ''}
                        ${company ? `
                        <div class="field">
                            <div class="field-label">🏢 Empresa</div>
                            <div class="field-value">${company}</div>
                        </div>
                        ` : ''}
                        <div class="field">
                            <div class="field-label">📋 Asunto</div>
                            <div class="field-value">${subject}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">💬 Mensaje</div>
                            <div class="field-value">${message}</div>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Este email fue enviado automáticamente desde el formulario de contacto de <strong>Aponnt Suite</strong></p>
                        <p>Fecha: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Generar ID único para este contacto
        const contactId = `contact-form-${Date.now()}`;

        // 🔥 REEMPLAZO 1: Email a equipo comercial → NCE (Central Telefónica)
        const nceToComercial = await NCE.send({
            companyId: null, // Scope aponnt (global)
            module: 'contact',
            originType: 'contact_form',
            originId: contactId,

            workflowKey: 'contact.form_submission_comercial',

            recipientType: 'group',
            recipientId: 'aponnt_comercial_team',
            recipientEmail: 'aponntcomercial@gmail.com',

            title: `🆕 Contacto Web: ${subject}`,
            message: `Nueva solicitud de contacto de ${name} (${email}): "${subject}"`,

            metadata: {
                contactId,
                senderName: name,
                senderEmail: email,
                senderPhone: phone || null,
                senderCompany: company || null,
                subject,
                fullMessage: message,
                source: 'index_html_form',
                emailHtml: emailHTML,
                submittedAt: new Date().toISOString()
            },

            priority: 'high',
            requiresAction: true,
            actionType: 'response',
            slaHours: 24,

            channels: ['email'],
        });

        console.log(`✅ [NCE] Email enviado a aponntcomercial@gmail.com (ID: ${nceToComercial.notificationId})`);

        // ===================================================================
        // PASO 2: OBTENER STAFF DE APONNT CON ROLES GG Y GA
        // ===================================================================

        const staffQuery = `
            SELECT DISTINCT
                s.staff_id,
                s.first_name,
                s.last_name,
                s.email,
                s.user_id,
                r.role_code,
                r.role_name,
                r.level
            FROM aponnt_staff s
            INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
            WHERE s.is_active = true
              AND r.role_code IN ('GG', 'GA')
            ORDER BY r.level ASC
        `;

        const staffMembers = await sequelize.query(staffQuery, {
            type: QueryTypes.SELECT
        });

        console.log(`📊 [CONTACT FORM] Staff notificables encontrados: ${staffMembers.length}`);

        // ===================================================================
        // PASO 3: CREAR NOTIFICACIONES ENTERPRISE PARA EL STAFF
        // ===================================================================

        // 🔥 REEMPLAZO 2: Notificaciones inbox al staff → NCE (Central Telefónica)
        if (staffMembers.length > 0) {
            const staffWithUserIds = staffMembers.filter(s => s.user_id);

            for (const staff of staffWithUserIds) {
                try {
                    const nceToStaff = await NCE.send({
                        companyId: null, // Scope aponnt (global - staff de Aponnt)
                        module: 'contact',
                        originType: 'contact_form_staff_notification',
                        originId: `${contactId}-staff-${staff.staff_id}`,

                        workflowKey: 'contact.form_submission_staff_inbox',

                        recipientType: 'user',
                        recipientId: staff.user_id,
                        recipientEmail: staff.email,

                        title: '📬 Nueva Solicitud de Contacto Web',
                        message: `${name} (${email}) ha enviado una consulta: "${subject}"`,

                        metadata: {
                            contactId,
                            contact_name: name,
                            contact_email: email,
                            contact_phone: phone || null,
                            contact_company: company || null,
                            subject,
                            fullMessage: message,
                            submitted_at: new Date().toISOString(),
                            staff_role: staff.role_code,
                            staff_name: `${staff.first_name} ${staff.last_name}`
                        },

                        priority: 'high',
                        requiresAction: true,
                        actionType: 'response',

                        channels: ['inbox'], // Solo inbox, el email ya fue enviado arriba
                    });

                    console.log(`✅ [NCE] Notificación inbox creada para: ${staff.first_name} ${staff.last_name} (ID: ${nceToStaff.notificationId})`);
                } catch (notifError) {
                    console.error(`⚠️ [NCE] Error creando notificación para ${staff.first_name}:`, notifError.message);
                }
            }
        }

        // ===================================================================
        // PASO 4: GUARDAR LEAD EN BASE DE DATOS (opcional - tabla contact_leads)
        // ===================================================================

        try {
            await sequelize.query(`
                INSERT INTO contact_leads (
                    name, email, phone, company, subject, message,
                    source, status, created_at
                )
                VALUES (
                    :name, :email, :phone, :company, :subject, :message,
                    'website_index', 'new', NOW()
                )
            `, {
                replacements: { name, email, phone: phone || null, company: company || null, subject, message },
                type: QueryTypes.INSERT
            });

            console.log(`✅ [CONTACT FORM] Lead guardado en contact_leads`);
        } catch (leadError) {
            // Si la tabla no existe, solo loguear warning (no es crítico)
            console.warn(`⚠️ [CONTACT FORM] No se pudo guardar lead (tabla contact_leads puede no existir):`, leadError.message);
        }

        // ===================================================================
        // RESPUESTA EXITOSA
        // ===================================================================

        return res.status(200).json({
            success: true,
            message: '¡Mensaje enviado exitosamente! Nos pondremos en contacto contigo pronto.',
            data: {
                contactId,
                email_sent: nceToComercial.success,
                nce_notification_id: nceToComercial.notificationId,
                notifications_created: staffMembers.filter(s => s.user_id).length,
                staff_notified: staffMembers.map(s => ({
                    name: `${s.first_name} ${s.last_name}`,
                    role: s.role_name
                }))
            }
        });

    } catch (error) {
        console.error('❌ [CONTACT FORM] Error procesando formulario de contacto:', error);
        return res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo procesar tu solicitud. Por favor intenta de nuevo o contactanos por WhatsApp.'
        });
    }
});

module.exports = router;
