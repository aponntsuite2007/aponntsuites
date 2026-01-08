/**
 * PLATFORM - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module platform-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class PlatformNotifications {

    /**
     * Anuncio de plataforma
     * Workflow: platform_announcement
     */
    static async notifyAnnouncement({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'platform',
                workflowKey: 'platform_announcement',
                recipientType: 'user',
                recipientId,
                title: 'Anuncio de plataforma',
                message: data.message || 'Anuncio general a todas las empresas',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'platform_platform',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PLATFORM] Notificación enviada: platform_announcement`);
        } catch (error) {
            console.error(`❌ [PLATFORM] Error en notifyAnnouncement:`, error);
        }
    }

    /**
     * Mantenimiento programado
     * Workflow: platform_maintenance
     */
    static async notifyMaintenance({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'platform',
                workflowKey: 'platform_maintenance',
                recipientType: 'user',
                recipientId,
                title: 'Mantenimiento programado',
                message: data.message || 'Notificación de mantenimiento',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'platform_platform',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PLATFORM] Notificación enviada: platform_maintenance`);
        } catch (error) {
            console.error(`❌ [PLATFORM] Error en notifyMaintenance:`, error);
        }
    }

    /**
     * Nueva funcionalidad
     * Workflow: platform_new_feature
     */
    static async notifyNewFeature({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'platform',
                workflowKey: 'platform_new_feature',
                recipientType: 'user',
                recipientId,
                title: 'Nueva funcionalidad',
                message: data.message || 'Anuncio de nueva funcionalidad',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'platform_platform',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PLATFORM] Notificación enviada: platform_new_feature`);
        } catch (error) {
            console.error(`❌ [PLATFORM] Error en notifyNewFeature:`, error);
        }
    }

}

module.exports = PlatformNotifications;
