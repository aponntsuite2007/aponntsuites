/**
 * ONBOARDING - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module onboarding-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class OnboardingNotifications {

    /**
     * Empresa activada
     * Workflow: onboarding_company_activated
     */
    static async notifyCompanyActivated({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'onboarding',
                workflowKey: 'onboarding_company_activated',
                recipientType: 'user',
                recipientId,
                title: 'Empresa activada',
                message: data.message || 'Email de bienvenida con credenciales',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'onboarding_onboarding',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ONBOARDING] Notificación enviada: onboarding_company_activated`);
        } catch (error) {
            console.error(`❌ [ONBOARDING] Error en notifyCompanyActivated:`, error);
        }
    }

    /**
     * Email de bienvenida
     * Workflow: onboarding_welcome
     */
    static async notifyWelcome({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'onboarding',
                workflowKey: 'onboarding_welcome',
                recipientType: 'user',
                recipientId,
                title: 'Email de bienvenida',
                message: data.message || 'Email inicial de bienvenida a la plataforma',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'onboarding_onboarding',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ONBOARDING] Notificación enviada: onboarding_welcome`);
        } catch (error) {
            console.error(`❌ [ONBOARDING] Error en notifyWelcome:`, error);
        }
    }

}

module.exports = OnboardingNotifications;
