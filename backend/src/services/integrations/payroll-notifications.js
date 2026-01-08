/**
 * PAYROLL - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module payroll-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class PayrollNotifications {

    /**
     * Error en liquidación
     * Workflow: payroll_error
     */
    static async notifyError({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'payroll',
                workflowKey: 'payroll_error',
                recipientType: 'user',
                recipientId,
                title: 'Error en liquidación',
                message: data.message || 'Notificación de error en liquidación',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'payroll_payroll',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PAYROLL] Notificación enviada: payroll_error`);
        } catch (error) {
            console.error(`❌ [PAYROLL] Error en notifyError:`, error);
        }
    }

    /**
     * Liquidación generada
     * Workflow: payroll_liquidation_generated
     */
    static async notifyLiquidationGenerated({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'payroll',
                workflowKey: 'payroll_liquidation_generated',
                recipientType: 'user',
                recipientId,
                title: 'Liquidación generada',
                message: data.message || 'Notificación de liquidación generada',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'payroll_payroll',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PAYROLL] Notificación enviada: payroll_liquidation_generated`);
        } catch (error) {
            console.error(`❌ [PAYROLL] Error en notifyLiquidationGenerated:`, error);
        }
    }

    /**
     * Reporte ejecutivo nómina
     * Workflow: payroll_monthly_report
     */
    static async notifyMonthlyReport({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'payroll',
                workflowKey: 'payroll_monthly_report',
                recipientType: 'user',
                recipientId,
                title: 'Reporte ejecutivo nómina',
                message: data.message || 'Reporte mensual de nómina para gerencia',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'payroll_payroll',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PAYROLL] Notificación enviada: payroll_monthly_report`);
        } catch (error) {
            console.error(`❌ [PAYROLL] Error en notifyMonthlyReport:`, error);
        }
    }

    /**
     * Recibo de sueldo
     * Workflow: payroll_receipt
     */
    static async notifyReceipt({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'payroll',
                workflowKey: 'payroll_receipt',
                recipientType: 'user',
                recipientId,
                title: 'Recibo de sueldo',
                message: data.message || 'Envío de recibo de sueldo',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'payroll_payroll',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [PAYROLL] Notificación enviada: payroll_receipt`);
        } catch (error) {
            console.error(`❌ [PAYROLL] Error en notifyReceipt:`, error);
        }
    }

}

module.exports = PayrollNotifications;
