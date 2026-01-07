/**
 * ============================================================================
 * NOTIFICATION WEBHOOK SERVICE
 * ============================================================================
 *
 * Servicio para enviar webhooks a sistemas externos cuando ocurren eventos
 * en el sistema de notificaciones
 *
 * EVENTOS SOPORTADOS:
 * - notification.sent - Notificación enviada
 * - notification.delivered - Notificación entregada
 * - notification.read - Notificación leída
 * - notification.action_completed - Acción completada
 * - notification.sla_breached - SLA violado
 *
 * ============================================================================
 */

const axios = require('axios');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class NotificationWebhookService {

    /**
     * Enviar webhook a URL configurada
     */
    async sendWebhook(event, payload, webhookUrl) {
        try {
            console.log(`🪝 [WEBHOOK] Enviando evento: ${event} a ${webhookUrl}`);

            const webhookPayload = {
                event,
                timestamp: new Date().toISOString(),
                data: payload
            };

            const response = await axios.post(webhookUrl, webhookPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'NotificationSystem/1.0',
                    'X-Webhook-Event': event
                },
                timeout: 10000 // 10 segundos
            });

            console.log(`✅ [WEBHOOK] Respuesta ${response.status}: ${event}`);

            return {
                success: true,
                status: response.status,
                response: response.data
            };

        } catch (error) {
            console.error(`❌ [WEBHOOK] Error enviando webhook:`, error.message);

            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    /**
     * Buscar webhooks configurados para un evento específico
     */
    async getWebhooksForEvent(event, companyId = null) {
        try {
            const whereCompany = companyId ? 'AND company_id = :companyId' : 'AND company_id IS NULL';

            const webhooks = await sequelize.query(`
                SELECT id, webhook_url, events, is_active
                FROM notification_webhooks
                WHERE is_active = TRUE
                  AND :event = ANY(events)
                  ${whereCompany}
            `, {
                replacements: { event, companyId },
                type: QueryTypes.SELECT
            });

            return webhooks;

        } catch (error) {
            console.error('Error obteniendo webhooks:', error.message);
            return [];
        }
    }

    /**
     * Disparar webhooks para un evento
     */
    async triggerEvent(event, payload, companyId = null) {
        try {
            const webhooks = await this.getWebhooksForEvent(event, companyId);

            if (webhooks.length === 0) {
                console.log(`🪝 [WEBHOOK] No hay webhooks configurados para evento: ${event}`);
                return;
            }

            console.log(`🪝 [WEBHOOK] Disparando ${webhooks.length} webhooks para evento: ${event}`);

            const results = [];

            for (const webhook of webhooks) {
                const result = await this.sendWebhook(event, payload, webhook.webhook_url);
                results.push({
                    webhookId: webhook.id,
                    url: webhook.webhook_url,
                    ...result
                });
            }

            return results;

        } catch (error) {
            console.error('Error disparando webhooks:', error.message);
        }
    }
}

// Exportar singleton
const notificationWebhookService = new NotificationWebhookService();
module.exports = notificationWebhookService;
