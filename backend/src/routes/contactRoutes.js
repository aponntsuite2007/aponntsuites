/**
 * CONTACT ROUTES - Formulario de contacto publico
 *
 * Endpoint publico (sin autenticacion) para recibir consultas
 * desde la landing page - TODO pasa por NCE (Central Telefónica)
 *
 * @version 2.0.0 - Migrado a NCE
 * @date 2026-01-07
 */

const express = require('express');
const router = express.Router();

// 🔥 NCE: Central Telefónica de Notificaciones (elimina bypass)
const NCE = require('../services/NotificationCentralExchange');

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

        // Generar ID único para este contacto
        const contactId = `contact-${Date.now()}`;

        // 🔥 REEMPLAZO 1: Email interno a Aponnt → NCE (Central Telefónica)
        const nceToAponnt = await NCE.send({
            companyId: null, // Scope aponnt (global)
            module: 'contact',
            originType: 'contact_form',
            originId: contactId,

            workflowKey: 'contact.form_submission',

            recipientType: 'group',
            recipientId: 'aponnt_support_team',
            recipientEmail: DESTINATION_EMAIL,

            title: `[Web Contact] ${SUBJECT_MAP[subject] || subject} - ${name}`,
            message: `Nueva consulta desde la web de ${name} (${email}): ${message.substring(0, 200)}...`,

            metadata: {
                contactId,
                senderName: name,
                senderEmail: email,
                senderPhone: phone || null,
                senderCompany: company || null,
                subject: SUBJECT_MAP[subject] || subject,
                subjectKey: subject,
                fullMessage: message,
                source: 'web_form',
                replyTo: email
            },

            priority: subject === 'support' ? 'high' : 'normal',
            requiresAction: true,
            actionType: 'response',
            slaHours: subject === 'support' ? 24 : 48,

            channels: ['email', 'inbox'],
        });

        console.log(`✅ [NCE] Email interno enviado a ${DESTINATION_EMAIL} (ID: ${nceToAponnt.notificationId})`);

        // 🔥 REEMPLAZO 2: Email de confirmación al usuario → NCE (Central Telefónica)
        const nceToUser = await NCE.send({
            companyId: null, // Scope aponnt (global)
            module: 'contact',
            originType: 'contact_form_confirmation',
            originId: contactId,

            workflowKey: 'contact.auto_reply',

            recipientType: 'external',
            recipientId: email, // Email como ID para externos
            recipientEmail: email,

            title: `Recibimos tu consulta - Aponnt`,
            message: `Hola ${name.split(' ')[0]}, gracias por contactarnos. Hemos recibido tu consulta sobre "${SUBJECT_MAP[subject] || subject}" y te responderemos en las próximas 24 horas hábiles.`,

            metadata: {
                contactId,
                senderName: name,
                senderEmail: email,
                subject: SUBJECT_MAP[subject] || subject,
                messagePreview: message.substring(0, 200),
                whatsappLink: 'https://wa.me/5492657673741'
            },

            priority: 'low',
            requiresAction: false,

            channels: ['email'],
        });

        console.log(`✅ [NCE] Email de confirmación enviado a ${email} (ID: ${nceToUser.notificationId})`);

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
