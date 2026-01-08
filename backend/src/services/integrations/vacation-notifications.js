/**
 * VACATION - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module vacation-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class VacationNotifications {

    /**
     * Vacaciones aprobadas
     * Workflow: vacation_approved
     */
    static async notifyApproved({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'vacation',
                workflowKey: 'vacation_approved',
                recipientType: 'user',
                recipientId,
                title: 'Vacaciones aprobadas',
                message: data.message || 'Notificación de vacaciones aprobadas',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'vacation_vacation',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [VACATION] Notificación enviada: vacation_approved`);
        } catch (error) {
            console.error(`❌ [VACATION] Error en notifyApproved:`, error);
        }
    }

    /**
     * Vacaciones rechazadas
     * Workflow: vacation_rejected
     */
    static async notifyRejected({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'vacation',
                workflowKey: 'vacation_rejected',
                recipientType: 'user',
                recipientId,
                title: 'Vacaciones rechazadas',
                message: data.message || 'Notificación de vacaciones rechazadas',
                priority: 'high',
                channels: ["email","inbox","websocket"],
                originType: 'vacation_vacation',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [VACATION] Notificación enviada: vacation_rejected`);
        } catch (error) {
            console.error(`❌ [VACATION] Error en notifyRejected:`, error);
        }
    }

    /**
     * Recordatorio post-vacaciones
     * Workflow: vacation_reminder_post
     */
    static async notifyReminderPost({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'vacation',
                workflowKey: 'vacation_reminder_post',
                recipientType: 'user',
                recipientId,
                title: 'Recordatorio post-vacaciones',
                message: data.message || 'Recordatorio de regreso de vacaciones',
                priority: 'high',
                channels: ["email","push","inbox"],
                originType: 'vacation_vacation',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [VACATION] Notificación enviada: vacation_reminder_post`);
        } catch (error) {
            console.error(`❌ [VACATION] Error en notifyReminderPost:`, error);
        }
    }

    /**
     * Recordatorio pre-vacaciones
     * Workflow: vacation_reminder_pre
     */
    static async notifyReminderPre({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'vacation',
                workflowKey: 'vacation_reminder_pre',
                recipientType: 'user',
                recipientId,
                title: 'Recordatorio pre-vacaciones',
                message: data.message || 'Recordatorio antes de inicio de vacaciones',
                priority: 'high',
                channels: ["email","push","inbox"],
                originType: 'vacation_vacation',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [VACATION] Notificación enviada: vacation_reminder_pre`);
        } catch (error) {
            console.error(`❌ [VACATION] Error en notifyReminderPre:`, error);
        }
    }

    /**
     * Solicitud de vacaciones
     * Workflow: vacation_request_created
     */
    static async notifyRequestCreated({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'vacation',
                workflowKey: 'vacation_request_created',
                recipientType: 'user',
                recipientId,
                title: 'Solicitud de vacaciones',
                message: data.message || 'Notificación de nueva solicitud de vacaciones',
                priority: 'high',
                channels: ["email","push","inbox","websocket"],
                originType: 'vacation_vacation',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: true,
                metadata: data
            });
            console.log(`✅ [VACATION] Notificación enviada: vacation_request_created`);
        } catch (error) {
            console.error(`❌ [VACATION] Error en notifyRequestCreated:`, error);
        }
    }

}

module.exports = VacationNotifications;
