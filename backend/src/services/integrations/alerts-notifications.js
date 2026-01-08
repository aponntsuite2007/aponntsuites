/**
 * ALERTS - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module alerts-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class AlertsNotifications {

    /**
     * Límite alcanzado
     * Workflow: alert_limit_reached
     */
    static async notifyLimitReached({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'alerts',
                workflowKey: 'alert_limit_reached',
                recipientType: 'user',
                recipientId,
                title: 'Límite alcanzado',
                message: data.message || 'Alerta de límite de usuarios/recursos',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'alerts_alert',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ALERTS] Notificación enviada: alert_limit_reached`);
        } catch (error) {
            console.error(`❌ [ALERTS] Error en notifyLimitReached:`, error);
        }
    }

    /**
     * Servicio suspendido
     * Workflow: alert_service_suspended
     */
    static async notifyServiceSuspended({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'alerts',
                workflowKey: 'alert_service_suspended',
                recipientType: 'user',
                recipientId,
                title: 'Servicio suspendido',
                message: data.message || 'Alerta de servicio suspendido',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'alerts_alert',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ALERTS] Notificación enviada: alert_service_suspended`);
        } catch (error) {
            console.error(`❌ [ALERTS] Error en notifyServiceSuspended:`, error);
        }
    }

    /**
     * Error crítico del sistema
     * Workflow: alert_system_error
     */
    static async notifySystemError({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'alerts',
                workflowKey: 'alert_system_error',
                recipientType: 'user',
                recipientId,
                title: 'Error crítico del sistema',
                message: data.message || 'Alerta de error crítico',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'alerts_alert',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ALERTS] Notificación enviada: alert_system_error`);
        } catch (error) {
            console.error(`❌ [ALERTS] Error en notifySystemError:`, error);
        }
    }

}

module.exports = AlertsNotifications;
