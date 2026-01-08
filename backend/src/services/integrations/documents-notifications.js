/**
 * DOCUMENTS - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module documents-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class DocumentsNotifications {

    /**
     * Documento requiere aprobación
     * Workflow: document_approval_required
     */
    static async notifyApprovalRequired({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'documents',
                workflowKey: 'document_approval_required',
                recipientType: 'user',
                recipientId,
                title: 'Documento requiere aprobación',
                message: data.message || 'Notificación de documento que requiere aprobación',
                priority: 'high',
                channels: ["email","push","inbox","websocket"],
                originType: 'documents_document',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: true,
                metadata: data
            });
            console.log(`✅ [DOCUMENTS] Notificación enviada: document_approval_required`);
        } catch (error) {
            console.error(`❌ [DOCUMENTS] Error en notifyApprovalRequired:`, error);
        }
    }

    /**
     * Documento por vencer
     * Workflow: document_expiring
     */
    static async notifyExpiring({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'documents',
                workflowKey: 'document_expiring',
                recipientType: 'user',
                recipientId,
                title: 'Documento por vencer',
                message: data.message || 'Notificación de documento próximo a vencer',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'documents_document',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [DOCUMENTS] Notificación enviada: document_expiring`);
        } catch (error) {
            console.error(`❌ [DOCUMENTS] Error en notifyExpiring:`, error);
        }
    }

    /**
     * Documento compartido
     * Workflow: document_shared
     */
    static async notifyShared({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'documents',
                workflowKey: 'document_shared',
                recipientType: 'user',
                recipientId,
                title: 'Documento compartido',
                message: data.message || 'Notificación de documento compartido',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'documents_document',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [DOCUMENTS] Notificación enviada: document_shared`);
        } catch (error) {
            console.error(`❌ [DOCUMENTS] Error en notifyShared:`, error);
        }
    }

}

module.exports = DocumentsNotifications;
