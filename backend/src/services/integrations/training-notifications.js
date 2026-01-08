/**
 * TRAINING - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module training-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class TrainingNotifications {

    /**
     * Certificado emitido
     * Workflow: training_certificate_issued
     */
    static async notifyCertificateIssued({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'training',
                workflowKey: 'training_certificate_issued',
                recipientType: 'user',
                recipientId,
                title: 'Certificado emitido',
                message: data.message || 'Notificación de certificado de capacitación emitido',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'training_training',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [TRAINING] Notificación enviada: training_certificate_issued`);
        } catch (error) {
            console.error(`❌ [TRAINING] Error en notifyCertificateIssued:`, error);
        }
    }

    /**
     * Capacitación completada
     * Workflow: training_completed
     */
    static async notifyCompleted({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'training',
                workflowKey: 'training_completed',
                recipientType: 'user',
                recipientId,
                title: 'Capacitación completada',
                message: data.message || 'Notificación de capacitación completada',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'training_training',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [TRAINING] Notificación enviada: training_completed`);
        } catch (error) {
            console.error(`❌ [TRAINING] Error en notifyCompleted:`, error);
        }
    }

    /**
     * Curso asignado
     * Workflow: training_course_assigned
     */
    static async notifyCourseAssigned({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'training',
                workflowKey: 'training_course_assigned',
                recipientType: 'user',
                recipientId,
                title: 'Curso asignado',
                message: data.message || 'Notificación de curso de capacitación asignado',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'training_training',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [TRAINING] Notificación enviada: training_course_assigned`);
        } catch (error) {
            console.error(`❌ [TRAINING] Error en notifyCourseAssigned:`, error);
        }
    }

    /**
     * Recordatorio deadline capacitación
     * Workflow: training_deadline_reminder
     */
    static async notifyDeadlineReminder({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'training',
                workflowKey: 'training_deadline_reminder',
                recipientType: 'user',
                recipientId,
                title: 'Recordatorio deadline capacitación',
                message: data.message || 'Recordatorio de fecha límite para completar capacitación',
                priority: 'high',
                channels: ["email","push","inbox"],
                originType: 'training_training',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [TRAINING] Notificación enviada: training_deadline_reminder`);
        } catch (error) {
            console.error(`❌ [TRAINING] Error en notifyDeadlineReminder:`, error);
        }
    }

}

module.exports = TrainingNotifications;
