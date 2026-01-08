/**
 * notificationWebhookRoutes.js
 *
 * Endpoints para recibir webhooks de Twilio (respuestas SMS/WhatsApp)
 * IMPORTANTE: Estos endpoints NO requieren auth (Twilio los llama directamente)
 */

const express = require('express');
const router = express.Router();
const NotificationIncomingWebhookService = require('../services/NotificationIncomingWebhookService');
const { auth } = require('../middleware/auth');

/**
 * POST /api/webhooks/twilio/incoming
 * Webhook de Twilio para mensajes entrantes (SMS/WhatsApp)
 *
 * Twilio envía POST con:
 * - MessageSid: ID del mensaje
 * - From: Número del remitente
 * - To: Número Aponnt que recibió
 * - Body: Texto del mensaje
 * - NumMedia: Cantidad de archivos adjuntos (WhatsApp)
 * - MediaUrl0, MediaUrl1...: URLs de archivos
 */
router.post('/twilio/incoming', async (req, res) => {
  try {
    console.log('\n📥 [WEBHOOK-TWILIO] Mensaje entrante recibido');
    console.log('Body:', req.body);

    // Procesar webhook
    const result = await NotificationIncomingWebhookService.processTwilioIncoming(req.body);

    // Responder a Twilio con TwiML (vacío = no auto-responder)
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  } catch (error) {
    console.error('❌ [WEBHOOK-TWILIO] Error procesando webhook:', error);

    // Aún así responder 200 a Twilio para evitar reintentos
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

/**
 * POST /api/webhooks/twilio/status
 * Webhook de Twilio para updates de status de mensajes (delivery, failed, etc.)
 */
router.post('/twilio/status', async (req, res) => {
  try {
    console.log('\n📊 [WEBHOOK-TWILIO-STATUS] Update de status recibido');
    console.log('Body:', req.body);

    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage
    } = req.body;

    // TODO: Actualizar status en tabla notifications
    // UPDATE notifications SET status = MessageStatus WHERE provider_message_id = MessageSid

    console.log(`Status de ${MessageSid}: ${MessageStatus}`);
    if (ErrorCode) {
      console.error(`Error ${ErrorCode}: ${ErrorMessage}`);
    }

    // Responder a Twilio
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  } catch (error) {
    console.error('❌ [WEBHOOK-TWILIO-STATUS] Error procesando status:', error);
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

/**
 * GET /api/webhooks/incoming/:companyId
 * Obtener mensajes entrantes de una empresa (requiere auth)
 */
router.get('/incoming/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { channel, limit = 50, offset = 0, unprocessedOnly = false } = req.query;

    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      if (req.user.company_id !== parseInt(companyId)) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado'
        });
      }
    }

    const messages = await NotificationIncomingWebhookService.getIncomingMessages(
      parseInt(companyId),
      {
        channel,
        limit: parseInt(limit),
        offset: parseInt(offset),
        unprocessedOnly: unprocessedOnly === 'true'
      }
    );

    res.json({
      success: true,
      data: messages,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: messages.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ [WEBHOOK-API] Error obteniendo mensajes entrantes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/webhooks/incoming/:messageId/mark-processed
 * Marcar mensaje entrante como procesado
 */
router.post('/incoming/:messageId/mark-processed', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const success = await NotificationIncomingWebhookService.markAsProcessed(parseInt(messageId));

    res.json({
      success,
      message: success
        ? 'Mensaje marcado como procesado'
        : 'Error marcando mensaje'
    });

  } catch (error) {
    console.error('❌ [WEBHOOK-API] Error marcando como procesado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
