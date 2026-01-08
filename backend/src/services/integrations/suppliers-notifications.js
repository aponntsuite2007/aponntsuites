/**
 * SUPPLIERS - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module suppliers-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class SuppliersNotifications {

    /**
     * Reclamo de Empresa a Proveedor
     * Workflow: suppliers.claim_notification
     */
    static async notifyNotification({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'suppliers',
                workflowKey: 'suppliers.claim_notification',
                recipientType: 'user',
                recipientId,
                title: 'Reclamo de Empresa a Proveedor',
                message: data.message || 'Reclamo de empresa a proveedor (producto defectuoso, etc.)',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'suppliers_suppliers.claim',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [SUPPLIERS] Notificación enviada: suppliers.claim_notification`);
        } catch (error) {
            console.error(`❌ [SUPPLIERS] Error en notifyNotification:`, error);
        }
    }

    /**
     * Restablecimiento de Contraseña - Proveedor
     * Workflow: suppliers.password_reset
     */
    static async notifyReset({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'suppliers',
                workflowKey: 'suppliers.password_reset',
                recipientType: 'user',
                recipientId,
                title: 'Restablecimiento de Contraseña - Proveedor',
                message: data.message || 'Restablecimiento de contraseña',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'suppliers_suppliers.password',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [SUPPLIERS] Notificación enviada: suppliers.password_reset`);
        } catch (error) {
            console.error(`❌ [SUPPLIERS] Error en notifyReset:`, error);
        }
    }

    /**
     * Pago Programado a Proveedor
     * Workflow: suppliers.payment_scheduled
     */
    static async notifyScheduled({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'suppliers',
                workflowKey: 'suppliers.payment_scheduled',
                recipientType: 'user',
                recipientId,
                title: 'Pago Programado a Proveedor',
                message: data.message || 'Pago programado a proveedor',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'suppliers_suppliers.payment',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [SUPPLIERS] Notificación enviada: suppliers.payment_scheduled`);
        } catch (error) {
            console.error(`❌ [SUPPLIERS] Error en notifyScheduled:`, error);
        }
    }

    /**
     * Nueva Orden de Compra a Proveedor
     * Workflow: suppliers.purchase_order_notification
     */
    static async notifyOrderNotification({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'suppliers',
                workflowKey: 'suppliers.purchase_order_notification',
                recipientType: 'user',
                recipientId,
                title: 'Nueva Orden de Compra a Proveedor',
                message: data.message || 'Nueva orden de compra enviada a proveedor',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'suppliers_suppliers.purchase',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [SUPPLIERS] Notificación enviada: suppliers.purchase_order_notification`);
        } catch (error) {
            console.error(`❌ [SUPPLIERS] Error en notifyOrderNotification:`, error);
        }
    }

    /**
     * Invitación a Proveedor para Cotizar RFQ
     * Workflow: suppliers.rfq_invitation
     */
    static async notifyInvitation({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'suppliers',
                workflowKey: 'suppliers.rfq_invitation',
                recipientType: 'user',
                recipientId,
                title: 'Invitación a Proveedor para Cotizar RFQ',
                message: data.message || 'Invitación a proveedor para cotizar RFQ',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'suppliers_suppliers.rfq',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [SUPPLIERS] Notificación enviada: suppliers.rfq_invitation`);
        } catch (error) {
            console.error(`❌ [SUPPLIERS] Error en notifyInvitation:`, error);
        }
    }

    /**
     * Bienvenida a Portal de Proveedores
     * Workflow: suppliers.welcome_email
     */
    static async notifyEmail({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'suppliers',
                workflowKey: 'suppliers.welcome_email',
                recipientType: 'user',
                recipientId,
                title: 'Bienvenida a Portal de Proveedores',
                message: data.message || 'Bienvenida a portal de proveedores + credenciales',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'suppliers_suppliers.welcome',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [SUPPLIERS] Notificación enviada: suppliers.welcome_email`);
        } catch (error) {
            console.error(`❌ [SUPPLIERS] Error en notifyEmail:`, error);
        }
    }

}

module.exports = SuppliersNotifications;
