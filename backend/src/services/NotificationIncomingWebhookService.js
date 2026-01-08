/**
 * NotificationIncomingWebhookService.js
 *
 * Procesa webhooks entrantes de Twilio (respuestas SMS/WhatsApp)
 * y los registra en la tabla notification_incoming_messages
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class NotificationIncomingWebhookService {
  /**
   * Procesar webhook entrante de Twilio (SMS o WhatsApp)
   *
   * @param {object} twilioData - Payload de Twilio
   * @returns {Promise<object>}
   */
  static async processTwilioIncoming(twilioData) {
    try {
      const {
        MessageSid,
        From,
        To,
        Body,
        NumMedia,
        MediaUrl0,
        MediaContentType0
      } = twilioData;

      // Determinar si es SMS o WhatsApp
      const channel = From.startsWith('whatsapp:') ? 'whatsapp' : 'sms';

      // Normalizar números (quitar prefijo whatsapp:)
      const fromNumber = From.replace('whatsapp:', '');
      const toNumber = To.replace('whatsapp:', '');

      console.log(`📥 [INCOMING-${channel.toUpperCase()}] De: ${fromNumber}, Para: ${toNumber}`);

      // Buscar notificación original (matching por teléfono)
      const originalNotification = await this._findOriginalNotification(fromNumber, channel);

      // Preparar media URLs (si hay archivos adjuntos en WhatsApp)
      const mediaUrls = [];
      if (NumMedia && parseInt(NumMedia) > 0) {
        for (let i = 0; i < parseInt(NumMedia); i++) {
          const urlKey = `MediaUrl${i}`;
          const typeKey = `MediaContentType${i}`;
          if (twilioData[urlKey]) {
            mediaUrls.push({
              url: twilioData[urlKey],
              contentType: twilioData[typeKey] || 'unknown'
            });
          }
        }
      }

      // Insertar en notification_incoming_messages
      const [result] = await sequelize.query(`
        INSERT INTO notification_incoming_messages (
          company_id,
          channel,
          from_number,
          to_number,
          message_body,
          media_urls,
          original_notification_id,
          conversation_thread_id,
          provider_message_id,
          provider_metadata,
          is_processed,
          received_at
        ) VALUES (
          :companyId,
          :channel,
          :fromNumber,
          :toNumber,
          :messageBody,
          :mediaUrls::jsonb,
          :originalNotificationId,
          :conversationThreadId,
          :providerMessageId,
          :providerMetadata::jsonb,
          false,
          CURRENT_TIMESTAMP
        )
        RETURNING id
      `, {
        replacements: {
          companyId: originalNotification?.company_id || null,
          channel,
          fromNumber,
          toNumber,
          messageBody: Body || '',
          mediaUrls: JSON.stringify(mediaUrls),
          originalNotificationId: originalNotification?.id || null,
          conversationThreadId: originalNotification?.conversation_thread_id || null,
          providerMessageId: MessageSid,
          providerMetadata: JSON.stringify(twilioData)
        },
        type: QueryTypes.INSERT
      });

      const incomingId = result[0].id;

      console.log(`✅ [INCOMING-${channel.toUpperCase()}] Registrado ID: ${incomingId}`);

      // Si encontramos notificación original, actualizar status
      if (originalNotification) {
        await this._updateOriginalNotification(originalNotification.id, Body);
      }

      return {
        success: true,
        incomingId,
        channel,
        fromNumber,
        messageBody: Body,
        originalNotificationId: originalNotification?.id || null
      };

    } catch (error) {
      console.error('❌ [INCOMING-WEBHOOK] Error procesando webhook:', error);
      throw error;
    }
  }

  /**
   * Buscar notificación original basado en número de teléfono
   *
   * @param {string} phoneNumber
   * @param {string} channel
   * @returns {Promise<object|null>}
   */
  static async _findOriginalNotification(phoneNumber, channel) {
    try {
      // Buscar en usuarios por teléfono
      const [user] = await sequelize.query(`
        SELECT id, company_id
        FROM users
        WHERE (
          phone = :phoneNumber
          OR mobile_phone = :phoneNumber
          OR whatsapp_phone = :phoneNumber
        )
        AND deleted_at IS NULL
        LIMIT 1
      `, {
        replacements: { phoneNumber },
        type: QueryTypes.SELECT
      });

      if (!user) {
        console.warn(`⚠️  [INCOMING] No se encontró usuario con teléfono ${phoneNumber}`);
        return null;
      }

      // Buscar última notificación enviada a este usuario por este canal
      const [notification] = await sequelize.query(`
        SELECT
          id,
          company_id,
          conversation_thread_id,
          title,
          message
        FROM notifications
        WHERE recipient_id = :userId
          AND channels::jsonb ? :channel
          AND created_at >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
        ORDER BY created_at DESC
        LIMIT 1
      `, {
        replacements: {
          userId: user.id,
          channel
        },
        type: QueryTypes.SELECT
      });

      if (notification) {
        console.log(`🔗 [INCOMING] Matched con notificación ${notification.id}`);
        return notification;
      }

      console.warn(`⚠️  [INCOMING] No se encontró notificación reciente para usuario ${user.id}`);
      return { company_id: user.company_id }; // Al menos retornar company_id

    } catch (error) {
      console.error('❌ [INCOMING] Error buscando notificación original:', error);
      return null;
    }
  }

  /**
   * Actualizar notificación original con respuesta del usuario
   *
   * @param {number} notificationId
   * @param {string} responseText
   * @returns {Promise<void>}
   */
  static async _updateOriginalNotification(notificationId, responseText) {
    try {
      // Actualizar metadata con respuesta
      await sequelize.query(`
        UPDATE notifications
        SET
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'user_response', :responseText,
            'user_responded_at', CURRENT_TIMESTAMP
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = :notificationId
      `, {
        replacements: {
          notificationId,
          responseText
        },
        type: QueryTypes.UPDATE
      });

      console.log(`📝 [INCOMING] Actualizada notificación ${notificationId} con respuesta`);

    } catch (error) {
      console.error('❌ [INCOMING] Error actualizando notificación:', error);
    }
  }

  /**
   * Obtener mensajes entrantes de una empresa
   *
   * @param {number} companyId
   * @param {object} filters
   * @returns {Promise<Array>}
   */
  static async getIncomingMessages(companyId, filters = {}) {
    try {
      const {
        channel = null,
        limit = 50,
        offset = 0,
        unprocessedOnly = false
      } = filters;

      const channelFilter = channel ? 'AND channel = :channel' : '';
      const processedFilter = unprocessedOnly ? 'AND is_processed = false' : '';

      const messages = await sequelize.query(`
        SELECT
          id,
          channel,
          from_number,
          to_number,
          message_body,
          media_urls,
          original_notification_id,
          conversation_thread_id,
          is_processed,
          received_at
        FROM notification_incoming_messages
        WHERE company_id = :companyId
          ${channelFilter}
          ${processedFilter}
        ORDER BY received_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: {
          companyId,
          channel,
          limit,
          offset
        },
        type: QueryTypes.SELECT
      });

      return messages.map(m => ({
        id: m.id,
        channel: m.channel,
        fromNumber: m.from_number,
        toNumber: m.to_number,
        messageBody: m.message_body,
        mediaUrls: m.media_urls,
        originalNotificationId: m.original_notification_id,
        conversationThreadId: m.conversation_thread_id,
        isProcessed: m.is_processed,
        receivedAt: m.received_at
      }));

    } catch (error) {
      console.error('❌ [INCOMING] Error obteniendo mensajes:', error);
      return [];
    }
  }

  /**
   * Marcar mensaje como procesado
   *
   * @param {number} messageId
   * @returns {Promise<boolean>}
   */
  static async markAsProcessed(messageId) {
    try {
      await sequelize.query(`
        UPDATE notification_incoming_messages
        SET
          is_processed = true,
          processed_at = CURRENT_TIMESTAMP
        WHERE id = :messageId
      `, {
        replacements: { messageId },
        type: QueryTypes.UPDATE
      });

      return true;
    } catch (error) {
      console.error('❌ [INCOMING] Error marcando como procesado:', error);
      return false;
    }
  }
}

module.exports = NotificationIncomingWebhookService;
