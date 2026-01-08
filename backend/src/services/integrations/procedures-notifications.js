/**
 * PROCEDURES - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module procedures-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class ProceduresNotifications {

    /**
     * Acuse requerido
     * Workflow: procedure_acknowledgment_required
     */
    static async notifyAcknowledgmentRequired({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'procedures',
                workflowKey: 'procedure_acknowledgment_required',
                recipientType: 'user',
                recipientId,
                title: 'Acuse requerido',
                message: data.message || 'Notificación de acuse de recibo de procedimiento requerido',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'procedures_procedure',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PROCEDURES] Notificación enviada: procedure_acknowledgment_required`);
        } catch (error) {
            console.error(`❌ [PROCEDURES] Error en notifyAcknowledgmentRequired:`, error);
        }
    }

    /**
     * Nueva versión de procedimiento
     * Workflow: procedure_new_version
     */
    static async notifyNewVersion({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'procedures',
                workflowKey: 'procedure_new_version',
                recipientType: 'user',
                recipientId,
                title: 'Nueva versión de procedimiento',
                message: data.message || 'Notificación de nueva versión de procedimiento disponible',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'procedures_procedure',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PROCEDURES] Notificación enviada: procedure_new_version`);
        } catch (error) {
            console.error(`❌ [PROCEDURES] Error en notifyNewVersion:`, error);
        }
    }

}

module.exports = ProceduresNotifications;
