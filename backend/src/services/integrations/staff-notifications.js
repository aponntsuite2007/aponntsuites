/**
 * STAFF - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module staff-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class StaffNotifications {

    /**
     * Evaluación de desempeño
     * Workflow: staff_evaluation
     */
    static async notifyEvaluation({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'staff',
                workflowKey: 'staff_evaluation',
                recipientType: 'user',
                recipientId,
                title: 'Evaluación de desempeño',
                message: data.message || 'Notificación de evaluación',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'staff_staff',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [STAFF] Notificación enviada: staff_evaluation`);
        } catch (error) {
            console.error(`❌ [STAFF] Error en notifyEvaluation:`, error);
        }
    }

    /**
     * Comunicación interna staff
     * Workflow: staff_internal_communication
     */
    static async notifyInternalCommunication({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'staff',
                workflowKey: 'staff_internal_communication',
                recipientType: 'user',
                recipientId,
                title: 'Comunicación interna staff',
                message: data.message || 'Comunicaciones internas del staff Aponnt',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'staff_staff',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [STAFF] Notificación enviada: staff_internal_communication`);
        } catch (error) {
            console.error(`❌ [STAFF] Error en notifyInternalCommunication:`, error);
        }
    }

    /**
     * Capacitación asignada
     * Workflow: staff_training_assigned
     */
    static async notifyTrainingAssigned({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'staff',
                workflowKey: 'staff_training_assigned',
                recipientType: 'user',
                recipientId,
                title: 'Capacitación asignada',
                message: data.message || 'Notificación de capacitación asignada',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'staff_staff',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [STAFF] Notificación enviada: staff_training_assigned`);
        } catch (error) {
            console.error(`❌ [STAFF] Error en notifyTrainingAssigned:`, error);
        }
    }

}

module.exports = StaffNotifications;
