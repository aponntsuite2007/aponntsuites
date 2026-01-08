/**
 * PERFORMANCE - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module performance-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class PerformanceNotifications {

    /**
     * Feedback solicitado
     * Workflow: performance_feedback_requested
     */
    static async notifyFeedbackRequested({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'performance',
                workflowKey: 'performance_feedback_requested',
                recipientType: 'user',
                recipientId,
                title: 'Feedback solicitado',
                message: data.message || 'Solicitud de feedback de desempeño',
                priority: 'high',
                channels: ["email","push","inbox","websocket"],
                originType: 'performance_performance',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: true,
                metadata: data
            });
            console.log(`✅ [PERFORMANCE] Notificación enviada: performance_feedback_requested`);
        } catch (error) {
            console.error(`❌ [PERFORMANCE] Error en notifyFeedbackRequested:`, error);
        }
    }

    /**
     * Evaluación completada
     * Workflow: performance_review_completed
     */
    static async notifyReviewCompleted({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'performance',
                workflowKey: 'performance_review_completed',
                recipientType: 'user',
                recipientId,
                title: 'Evaluación completada',
                message: data.message || 'Notificación de evaluación de desempeño completada',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'performance_performance',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PERFORMANCE] Notificación enviada: performance_review_completed`);
        } catch (error) {
            console.error(`❌ [PERFORMANCE] Error en notifyReviewCompleted:`, error);
        }
    }

    /**
     * Evaluación programada
     * Workflow: performance_review_scheduled
     */
    static async notifyReviewScheduled({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'performance',
                workflowKey: 'performance_review_scheduled',
                recipientType: 'user',
                recipientId,
                title: 'Evaluación programada',
                message: data.message || 'Notificación de evaluación de desempeño programada',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'performance_performance',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PERFORMANCE] Notificación enviada: performance_review_scheduled`);
        } catch (error) {
            console.error(`❌ [PERFORMANCE] Error en notifyReviewScheduled:`, error);
        }
    }

}

module.exports = PerformanceNotifications;
