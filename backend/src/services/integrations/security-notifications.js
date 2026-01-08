/**
 * SECURITY - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module security-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class SecurityNotifications {

    /**
     * Login desde nuevo dispositivo
     * Workflow: security_login_new_device
     */
    static async notifyLoginNewDevice({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'security',
                workflowKey: 'security_login_new_device',
                recipientType: 'user',
                recipientId,
                title: 'Login desde nuevo dispositivo',
                message: data.message || 'Notificación de login desde dispositivo nuevo',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'security_security',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [SECURITY] Notificación enviada: security_login_new_device`);
        } catch (error) {
            console.error(`❌ [SECURITY] Error en notifyLoginNewDevice:`, error);
        }
    }

    /**
     * Reset de contraseña
     * Workflow: security_password_reset
     */
    static async notifyPasswordReset({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'security',
                workflowKey: 'security_password_reset',
                recipientType: 'user',
                recipientId,
                title: 'Reset de contraseña',
                message: data.message || 'Email de reset de contraseña',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'security_security',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [SECURITY] Notificación enviada: security_password_reset`);
        } catch (error) {
            console.error(`❌ [SECURITY] Error en notifyPasswordReset:`, error);
        }
    }

    /**
     * Actividad sospechosa
     * Workflow: security_suspicious_activity
     */
    static async notifySuspiciousActivity({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'security',
                workflowKey: 'security_suspicious_activity',
                recipientType: 'user',
                recipientId,
                title: 'Actividad sospechosa',
                message: data.message || 'Alerta de actividad sospechosa',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'security_security',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [SECURITY] Notificación enviada: security_suspicious_activity`);
        } catch (error) {
            console.error(`❌ [SECURITY] Error en notifySuspiciousActivity:`, error);
        }
    }

}

module.exports = SecurityNotifications;
