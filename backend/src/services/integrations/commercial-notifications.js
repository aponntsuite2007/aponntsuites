/**
 * COMMERCIAL - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module commercial-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class CommercialNotifications {

    /**
     * Presupuesto aceptado
     * Workflow: commercial_budget_accepted
     */
    static async notifyBudgetAccepted({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'commercial',
                workflowKey: 'commercial_budget_accepted',
                recipientType: 'user',
                recipientId,
                title: 'Presupuesto aceptado',
                message: data.message || 'Notificación cuando cliente acepta presupuesto',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'commercial_commercial',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [COMMERCIAL] Notificación enviada: commercial_budget_accepted`);
        } catch (error) {
            console.error(`❌ [COMMERCIAL] Error en notifyBudgetAccepted:`, error);
        }
    }

    /**
     * Presupuesto creado
     * Workflow: commercial_budget_created
     */
    static async notifyBudgetCreated({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'commercial',
                workflowKey: 'commercial_budget_created',
                recipientType: 'user',
                recipientId,
                title: 'Presupuesto creado',
                message: data.message || 'Notificación cuando se genera presupuesto',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'commercial_commercial',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [COMMERCIAL] Notificación enviada: commercial_budget_created`);
        } catch (error) {
            console.error(`❌ [COMMERCIAL] Error en notifyBudgetCreated:`, error);
        }
    }

    /**
     * Contrato firmado
     * Workflow: commercial_contract_signed
     */
    static async notifyContractSigned({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'commercial',
                workflowKey: 'commercial_contract_signed',
                recipientType: 'user',
                recipientId,
                title: 'Contrato firmado',
                message: data.message || 'Notificación cuando se firma contrato',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'commercial_commercial',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [COMMERCIAL] Notificación enviada: commercial_contract_signed`);
        } catch (error) {
            console.error(`❌ [COMMERCIAL] Error en notifyContractSigned:`, error);
        }
    }

    /**
     * Nuevo lead asignado
     * Workflow: commercial_lead_assigned
     */
    static async notifyLeadAssigned({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'commercial',
                workflowKey: 'commercial_lead_assigned',
                recipientType: 'user',
                recipientId,
                title: 'Nuevo lead asignado',
                message: data.message || 'Notificación cuando se asigna un lead a vendedor',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'commercial_commercial',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [COMMERCIAL] Notificación enviada: commercial_lead_assigned`);
        } catch (error) {
            console.error(`❌ [COMMERCIAL] Error en notifyLeadAssigned:`, error);
        }
    }

    /**
     * Reunión programada
     * Workflow: commercial_meeting_scheduled
     */
    static async notifyMeetingScheduled({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'commercial',
                workflowKey: 'commercial_meeting_scheduled',
                recipientType: 'user',
                recipientId,
                title: 'Reunión programada',
                message: data.message || 'Notificación de reunión comercial programada',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'commercial_commercial',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [COMMERCIAL] Notificación enviada: commercial_meeting_scheduled`);
        } catch (error) {
            console.error(`❌ [COMMERCIAL] Error en notifyMeetingScheduled:`, error);
        }
    }

}

module.exports = CommercialNotifications;
