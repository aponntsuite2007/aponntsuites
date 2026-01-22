/**
 * ============================================================================
 * INBOUND EMAIL ROUTES - Webhooks para Emails Entrantes
 * ============================================================================
 *
 * Endpoints para recibir emails entrantes de diferentes proveedores:
 * - SendGrid Inbound Parse
 * - Mailgun Routes
 * - Postmark Inbound
 * - Amazon SES (via SNS)
 *
 * BASE URL: /api/email/inbound/*
 *
 * @version 1.0
 * @date 2025-12-17
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const InboundEmailService = require('../services/InboundEmailService');

// Configurar multer para manejar form-data (SendGrid envía así)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// ==============================================
// 📄 INTEGRACIÓN DMS - SSOT DOCUMENTAL
// ==============================================
const registerEmailAttachmentsInDMS = async (req, files, emailMetadata = {}) => {
    try {
        const dmsService = req.app.get('dmsIntegrationService');
        if (!dmsService || !files || files.length === 0) {
            return null;
        }

        const results = [];
        const companyId = emailMetadata.companyId || 1; // Default company for inbound emails

        for (const file of files) {
            try {
                const result = await dmsService.registerDocument({
                    module: 'communications',
                    documentType: 'EMAIL_ATTACHMENT',
                    companyId,
                    employeeId: null,
                    createdById: null,
                    sourceEntityType: 'inbound-email',
                    sourceEntityId: emailMetadata.messageId || null,
                    file: {
                        buffer: file.buffer,
                        originalname: file.originalname || file.filename || 'attachment',
                        mimetype: file.mimetype || 'application/octet-stream',
                        size: file.size
                    },
                    title: file.originalname || file.filename || 'Email Attachment',
                    description: `Email attachment from ${emailMetadata.provider || 'unknown'} - ${emailMetadata.subject || 'No subject'}`,
                    metadata: {
                        emailProvider: emailMetadata.provider,
                        fromEmail: emailMetadata.from,
                        toEmail: emailMetadata.to,
                        subject: emailMetadata.subject,
                        receivedAt: new Date().toISOString()
                    }
                });
                results.push({ documentId: result.document?.id, filename: file.originalname || file.filename });
            } catch (error) {
                console.error(`❌ [DMS-EMAIL] Error con attachment ${file.originalname}:`, error.message);
            }
        }

        if (results.length > 0) {
            console.log(`📄 [DMS-EMAIL] ${results.length} attachments registrados`);
        }
        return results.length > 0 ? results : null;
    } catch (error) {
        console.error('❌ [DMS-EMAIL] Error registrando attachments:', error.message);
        return null;
    }
};

/**
 * ============================================================================
 * WEBHOOK PRINCIPAL: Recepción universal de emails
 * ============================================================================
 * POST /api/email/inbound/webhook
 *
 * Detecta automáticamente el proveedor por headers/formato
 */
router.post('/webhook', upload.any(), async (req, res) => {
    try {
        console.log('📧 [INBOUND-WEBHOOK] Recibido email entrante');

        // Detectar proveedor
        const provider = detectProvider(req);
        console.log(`📧 [INBOUND-WEBHOOK] Proveedor detectado: ${provider}`);

        // Combinar body y files (SendGrid envía attachments separados)
        const emailData = {
            ...req.body,
            attachments: req.files
        };

        // Procesar email
        const result = await InboundEmailService.processInboundEmail(emailData, provider);

        // ✅ Registrar attachments en DMS (SSOT)
        if (req.files && req.files.length > 0) {
            await registerEmailAttachmentsInDMS(req, req.files, {
                provider,
                messageId: result?.messageId || emailData.messageId,
                from: emailData.from || emailData.sender,
                to: emailData.to || emailData.recipient,
                subject: emailData.subject
            });
        }

        // Responder según el proveedor
        if (provider === 'sendgrid') {
            // SendGrid espera 200 OK sin body específico
            return res.status(200).send('OK');
        } else if (provider === 'mailgun') {
            // Mailgun espera 200 con JSON
            return res.status(200).json({ status: 'ok' });
        } else {
            return res.status(200).json({
                success: true,
                ...result
            });
        }

    } catch (error) {
        console.error('❌ [INBOUND-WEBHOOK] Error:', error);
        // Siempre devolver 200 para evitar que el proveedor reintente
        // (registrar el error internamente)
        return res.status(200).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * WEBHOOK SENDGRID
 * ============================================================================
 * POST /api/email/inbound/sendgrid
 */
router.post('/sendgrid', upload.any(), async (req, res) => {
    try {
        console.log('📧 [SENDGRID-WEBHOOK] Recibido email');

        // Verificar firma si está configurada
        if (process.env.SENDGRID_INBOUND_KEY) {
            const isValid = verifySendGridSignature(req);
            if (!isValid) {
                console.warn('⚠️ [SENDGRID-WEBHOOK] Firma inválida');
                return res.status(401).send('Invalid signature');
            }
        }

        const emailData = {
            ...req.body,
            attachments: req.files
        };

        await InboundEmailService.processInboundEmail(emailData, 'sendgrid');

        // ✅ Registrar attachments en DMS (SSOT)
        if (req.files && req.files.length > 0) {
            await registerEmailAttachmentsInDMS(req, req.files, {
                provider: 'sendgrid',
                from: emailData.from || emailData.sender,
                to: emailData.to || emailData.recipient,
                subject: emailData.subject
            });
        }

        return res.status(200).send('OK');

    } catch (error) {
        console.error('❌ [SENDGRID-WEBHOOK] Error:', error);
        return res.status(200).send('OK'); // Evitar reintentos
    }
});

/**
 * ============================================================================
 * WEBHOOK MAILGUN
 * ============================================================================
 * POST /api/email/inbound/mailgun
 */
router.post('/mailgun', upload.any(), async (req, res) => {
    try {
        console.log('📧 [MAILGUN-WEBHOOK] Recibido email');

        // Verificar firma si está configurada
        if (process.env.MAILGUN_WEBHOOK_KEY) {
            const isValid = verifyMailgunSignature(req);
            if (!isValid) {
                console.warn('⚠️ [MAILGUN-WEBHOOK] Firma inválida');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }

        const emailData = {
            ...req.body,
            attachments: req.files
        };

        await InboundEmailService.processInboundEmail(emailData, 'mailgun');

        // ✅ Registrar attachments en DMS (SSOT)
        if (req.files && req.files.length > 0) {
            await registerEmailAttachmentsInDMS(req, req.files, {
                provider: 'mailgun',
                from: emailData.from || emailData.sender,
                to: emailData.to || emailData.recipient,
                subject: emailData.subject || emailData.Subject
            });
        }

        return res.status(200).json({ status: 'ok' });

    } catch (error) {
        console.error('❌ [MAILGUN-WEBHOOK] Error:', error);
        return res.status(200).json({ status: 'ok' }); // Evitar reintentos
    }
});

/**
 * ============================================================================
 * WEBHOOK POSTMARK
 * ============================================================================
 * POST /api/email/inbound/postmark
 */
router.post('/postmark', express.json({ limit: '25mb' }), async (req, res) => {
    try {
        console.log('📧 [POSTMARK-WEBHOOK] Recibido email');

        await InboundEmailService.processInboundEmail(req.body, 'postmark');

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ [POSTMARK-WEBHOOK] Error:', error);
        return res.status(200).json({ success: true }); // Evitar reintentos
    }
});

/**
 * ============================================================================
 * WEBHOOK AMAZON SES (via SNS)
 * ============================================================================
 * POST /api/email/inbound/ses
 */
router.post('/ses', express.json({ limit: '25mb' }), async (req, res) => {
    try {
        console.log('📧 [SES-WEBHOOK] Recibido mensaje');

        // SNS puede enviar diferentes tipos de mensajes
        const messageType = req.headers['x-amz-sns-message-type'];

        if (messageType === 'SubscriptionConfirmation') {
            // Confirmar suscripción automáticamente
            const subscribeUrl = req.body.SubscribeURL;
            console.log('📧 [SES-WEBHOOK] Confirmando suscripción SNS');
            // Hacer request a subscribeUrl para confirmar
            const https = require('https');
            https.get(subscribeUrl);
            return res.status(200).send('OK');
        }

        if (messageType === 'Notification') {
            // Parsear el mensaje de SNS
            let emailData = req.body;
            if (typeof req.body.Message === 'string') {
                emailData = JSON.parse(req.body.Message);
            }

            await InboundEmailService.processInboundEmail(emailData, 'ses');
        }

        return res.status(200).send('OK');

    } catch (error) {
        console.error('❌ [SES-WEBHOOK] Error:', error);
        return res.status(200).send('OK');
    }
});

/**
 * ============================================================================
 * ENDPOINT MANUAL (para testing o integración directa)
 * ============================================================================
 * POST /api/email/inbound/manual
 */
router.post('/manual', express.json({ limit: '25mb' }), async (req, res) => {
    try {
        // Verificar API key si está configurada
        const apiKey = req.headers['x-api-key'];
        if (process.env.INBOUND_EMAIL_API_KEY && apiKey !== process.env.INBOUND_EMAIL_API_KEY) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        const result = await InboundEmailService.processInboundEmail(req.body, 'manual');

        return res.status(200).json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('❌ [MANUAL-INBOUND] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * ESTADÍSTICAS
 * ============================================================================
 * GET /api/email/inbound/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const { company_id } = req.query;
        const stats = await InboundEmailService.getStats(company_id);

        return res.status(200).json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ [INBOUND-STATS] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * HISTORIAL DE EMAILS ENTRANTES
 * ============================================================================
 * GET /api/email/inbound/history
 */
router.get('/history', async (req, res) => {
    try {
        const {
            status,
            company_id,
            limit = 50,
            offset = 0
        } = req.query;

        let whereClause = '1=1';
        const replacements = { limit: parseInt(limit), offset: parseInt(offset) };

        if (status) {
            whereClause += ' AND processing_status = :status';
            replacements.status = status;
        }

        if (company_id) {
            whereClause += ' AND linked_company_id = :companyId';
            replacements.companyId = parseInt(company_id);
        }

        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        const [emails] = await sequelize.query(`
            SELECT
                id, message_id, from_email, from_name, to_email,
                subject, processing_status, linked_company_id,
                linked_thread_id, linked_notification_id,
                is_auto_reply, created_at, processed_at
            FROM email_inbound_log
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) as total FROM email_inbound_log WHERE ${whereClause}
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        return res.status(200).json({
            success: true,
            emails,
            total: parseInt(countResult.total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('❌ [INBOUND-HISTORY] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * HELPERS
 * ============================================================================
 */

function detectProvider(req) {
    // SendGrid envía charset en content-type y tiene campo 'envelope'
    if (req.body.envelope || req.body.charsets) {
        return 'sendgrid';
    }

    // Mailgun tiene campos específicos
    if (req.body['message-headers'] || req.body['body-plain']) {
        return 'mailgun';
    }

    // Postmark tiene MessageID y FromFull
    if (req.body.MessageID && req.body.FromFull) {
        return 'postmark';
    }

    // Amazon SES via SNS
    if (req.headers['x-amz-sns-message-type']) {
        return 'ses';
    }

    // Por defecto
    return 'unknown';
}

function verifySendGridSignature(req) {
    // SendGrid no envía firma en Inbound Parse por defecto
    // Pero si usas Event Webhook, puedes verificar así:
    const signature = req.headers['x-twilio-email-event-webhook-signature'];
    const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'];

    if (!signature || !timestamp) return true; // No hay firma que verificar

    const publicKey = process.env.SENDGRID_INBOUND_KEY;
    const payload = timestamp + JSON.stringify(req.body);

    try {
        const verify = crypto.createVerify('sha256');
        verify.update(payload);
        return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
        return false;
    }
}

function verifyMailgunSignature(req) {
    const { timestamp, token, signature } = req.body;
    if (!timestamp || !token || !signature) return true;

    const key = process.env.MAILGUN_WEBHOOK_KEY;
    const data = timestamp + token;
    const hmac = crypto.createHmac('sha256', key).update(data).digest('hex');

    return hmac === signature;
}

module.exports = router;
