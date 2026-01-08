/**
 * ENGINEERING - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module engineering-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class EngineeringNotifications {

    /**
     * Test fallido en CI/CD
     * Workflow: engineering_ci_failed
     */
    static async notifyCiFailed({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'engineering',
                workflowKey: 'engineering_ci_failed',
                recipientType: 'user',
                recipientId,
                title: 'Test fallido en CI/CD',
                message: data.message || 'Notificación de test fallido',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'engineering_engineering',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ENGINEERING] Notificación enviada: engineering_ci_failed`);
        } catch (error) {
            console.error(`❌ [ENGINEERING] Error en notifyCiFailed:`, error);
        }
    }

    /**
     * Deploy realizado
     * Workflow: engineering_deploy
     */
    static async notifyDeploy({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'engineering',
                workflowKey: 'engineering_deploy',
                recipientType: 'user',
                recipientId,
                title: 'Deploy realizado',
                message: data.message || 'Notificación de deploy a producción',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'engineering_engineering',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ENGINEERING] Notificación enviada: engineering_deploy`);
        } catch (error) {
            console.error(`❌ [ENGINEERING] Error en notifyDeploy:`, error);
        }
    }

    /**
     * Error en producción
     * Workflow: engineering_error_production
     */
    static async notifyErrorProduction({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'engineering',
                workflowKey: 'engineering_error_production',
                recipientType: 'user',
                recipientId,
                title: 'Error en producción',
                message: data.message || 'Alerta de error en producción',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'engineering_engineering',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ENGINEERING] Notificación enviada: engineering_error_production`);
        } catch (error) {
            console.error(`❌ [ENGINEERING] Error en notifyErrorProduction:`, error);
        }
    }

    /**
     * PR para revisión
     * Workflow: engineering_pr_review
     */
    static async notifyPrReview({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'engineering',
                workflowKey: 'engineering_pr_review',
                recipientType: 'user',
                recipientId,
                title: 'PR para revisión',
                message: data.message || 'Notificación de Pull Request',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'engineering_engineering',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ENGINEERING] Notificación enviada: engineering_pr_review`);
        } catch (error) {
            console.error(`❌ [ENGINEERING] Error en notifyPrReview:`, error);
        }
    }

}

module.exports = EngineeringNotifications;
