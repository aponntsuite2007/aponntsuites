/**
 * CONTACT ROUTES - Formulario de contacto publico
 *
 * Endpoint publico (sin autenticacion) para recibir consultas
 * desde la landing page y enviarlas a aponntsuite@gmail.com
 *
 * @version 1.0.0
 * @date 2025-11-25
 */

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Configuracion SMTP desde variables de entorno
const SMTP_CONFIG = {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER || 'aponntsuite@gmail.com',
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
};

const DESTINATION_EMAIL = 'aponntsuite@gmail.com';

// Mapa de asuntos para el email
const SUBJECT_MAP = {
    'demo': 'Solicitud de Demo',
    'pricing': 'Consulta de Precios',
    'technical': 'Consulta Tecnica',
    'partnership': 'Programa de Asociados',
    'support': 'Soporte',
    'other': 'Consulta General'
};

/**
 * POST /api/contact
 * Recibe formulario de contacto y envia email
 */
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, company, subject, message } = req.body;

        // Validacion basica
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos (nombre, email, asunto, mensaje)'
            });
        }

        // Validar formato email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Formato de email invalido'
            });
        }

        console.log(`📧 [CONTACT] Nueva consulta de: ${name} <${email}>`);

        // Crear transporter
        const transporter = nodemailer.createTransport(SMTP_CONFIG);

        // Formatear fecha
        const fecha = new Date().toLocaleString('es-AR', {
            dateStyle: 'full',
            timeStyle: 'short'
        });

        // Email para Aponnt (notificacion interna)
        const emailToAponnt = {
            from: `"Aponnt Web" <${SMTP_CONFIG.auth.user}>`,
            to: DESTINATION_EMAIL,
            replyTo: email,
            subject: `[Web Contact] ${SUBJECT_MAP[subject] || subject} - ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                        <h2 style="color: white; margin: 0;">Nueva Consulta desde la Web</h2>
                    </div>
                    <div style="background: #f8fafc; padding: 25px; border: 1px solid #e2e8f0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 120px;">Nombre:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><a href="mailto:${email}">${email}</a></td>
                            </tr>
                            ${phone ? `
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Telefono:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><a href="tel:${phone}">${phone}</a></td>
                            </tr>
                            ` : ''}
                            ${company ? `
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Empresa:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${company}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Asunto:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${SUBJECT_MAP[subject] || subject}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; font-weight: bold;">Fecha:</td>
                                <td style="padding: 10px 0;">${fecha}</td>
                            </tr>
                        </table>

                        <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <h4 style="margin: 0 0 10px 0; color: #1e293b;">Mensaje:</h4>
                            <p style="margin: 0; white-space: pre-wrap; color: #475569;">${message}</p>
                        </div>
                    </div>
                    <div style="background: #1e293b; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
                        <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                            Este mensaje fue enviado desde el formulario de contacto de aponnt.com
                        </p>
                    </div>
                </div>
            `,
            text: `
Nueva Consulta desde la Web
===========================

Nombre: ${name}
Email: ${email}
${phone ? `Telefono: ${phone}` : ''}
${company ? `Empresa: ${company}` : ''}
Asunto: ${SUBJECT_MAP[subject] || subject}
Fecha: ${fecha}

Mensaje:
${message}
            `
        };

        // Email de confirmacion para el usuario
        const emailToUser = {
            from: `"Aponnt Suite" <${SMTP_CONFIG.auth.user}>`,
            to: email,
            subject: `Recibimos tu consulta - Aponnt`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Aponnt</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Sistema Integral de Administracion de Recursos Empresariales</p>
                    </div>
                    <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #1e293b; margin-top: 0;">Hola ${name.split(' ')[0]},</h2>
                        <p style="color: #475569; line-height: 1.6;">
                            Gracias por contactarnos. Hemos recibido tu consulta sobre
                            <strong>${SUBJECT_MAP[subject] || subject}</strong> y nos pondremos
                            en contacto contigo en las proximas 24 horas habiles.
                        </p>

                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="margin: 0 0 10px 0; color: #1e293b;">Tu mensaje:</h4>
                            <p style="margin: 0; color: #64748b; font-style: italic;">"${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"</p>
                        </div>

                        <p style="color: #475569; line-height: 1.6;">
                            Mientras tanto, puedes contactarnos directamente por WhatsApp para una respuesta mas rapida:
                        </p>

                        <div style="text-align: center; margin: 25px 0;">
                            <a href="https://wa.me/5492657673741" style="display: inline-block; background: #22c55e; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                                Contactar por WhatsApp
                            </a>
                        </div>
                    </div>
                    <div style="background: #1e293b; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
                        <p style="color: #94a3b8; margin: 0 0 10px 0; font-size: 14px;">
                            Aponnt Suite - Plataforma SaaS B2B
                        </p>
                        <p style="color: #64748b; margin: 0; font-size: 12px;">
                            Este es un mensaje automatico, por favor no respondas a este email.
                        </p>
                    </div>
                </div>
            `,
            text: `
Hola ${name.split(' ')[0]},

Gracias por contactarnos. Hemos recibido tu consulta sobre "${SUBJECT_MAP[subject] || subject}" y nos pondremos en contacto contigo en las proximas 24 horas habiles.

Tu mensaje:
"${message}"

Mientras tanto, puedes contactarnos directamente por WhatsApp: +54 9 2657 673741

Saludos,
Equipo Aponnt
            `
        };

        // Enviar ambos emails
        await transporter.sendMail(emailToAponnt);
        console.log(`✅ [CONTACT] Email interno enviado a ${DESTINATION_EMAIL}`);

        await transporter.sendMail(emailToUser);
        console.log(`✅ [CONTACT] Email de confirmacion enviado a ${email}`);

        res.json({
            success: true,
            message: 'Mensaje enviado correctamente'
        });

    } catch (error) {
        console.error('❌ [CONTACT] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error al enviar el mensaje. Por favor intenta de nuevo.'
        });
    }
});

module.exports = router;
