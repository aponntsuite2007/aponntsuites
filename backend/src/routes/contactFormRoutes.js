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
const emailService = require('../services/EmailService'); // ✅ EmailService es singleton
const { sequelize, Notification } = require('../config/database');
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

        // Enviar email a aponntcomercial@gmail.com
        const emailResult = await emailService.sendFromAponnt('support', {
            to: 'aponntcomercial@gmail.com',
            subject: `🆕 Contacto Web: ${subject}`,
            html: emailHTML,
            text: `
                Nueva Solicitud de Contacto
                ===========================

                Nombre: ${name}
                Email: ${email}
                ${phone ? `Teléfono: ${phone}` : ''}
                ${company ? `Empresa: ${company}` : ''}
                Asunto: ${subject}

                Mensaje:
                ${message}

                ---
                Enviado desde formulario de contacto de Aponnt Suite
                Fecha: ${new Date().toLocaleString('es-AR')}
            `,
            category: 'contact_form',
            recipientName: 'Aponnt Comercial'
        });

        console.log(`✅ [CONTACT FORM] Email enviado a aponntcomercial@gmail.com`);

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

        if (staffMembers.length > 0) {
            // Crear notificaciones para cada miembro del staff que tenga user_id
            const staffWithUserIds = staffMembers.filter(s => s.user_id);

            for (const staff of staffWithUserIds) {
                try {
                    await Notification.create({
                        company_id: null, // null porque es una notificación de Aponnt (no de una empresa cliente)
                        user_id: staff.user_id,
                        type: 'contact_form_submission',
                        title: '📬 Nueva Solicitud de Contacto Web',
                        message: `${name} (${email}) ha enviado una consulta: "${subject}"`,
                        link_url: null,
                        link_text: null,
                        data: {
                            contact_name: name,
                            contact_email: email,
                            contact_phone: phone,
                            contact_company: company,
                            subject: subject,
                            message: message,
                            submitted_at: new Date().toISOString(),
                            staff_role: staff.role_code,
                            staff_name: `${staff.first_name} ${staff.last_name}`
                        },
                        priority: 'high',
                        read: false,
                        read_at: null
                    });

                    console.log(`✅ [CONTACT FORM] Notificación creada para: ${staff.first_name} ${staff.last_name} (${staff.role_name})`);
                } catch (notifError) {
                    console.error(`⚠️ [CONTACT FORM] Error creando notificación para ${staff.first_name}:`, notifError.message);
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
                email_sent: emailResult.success,
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
