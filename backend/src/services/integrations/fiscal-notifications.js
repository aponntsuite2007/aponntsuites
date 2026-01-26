/**
 * FISCAL - Integraciones de Notificaciones
 * Retenciones, IVA, impuestos, auditoría fiscal multi-país
 *
 * Workflows:
 * - fiscal_retention_applied: Cuando se aplican retenciones en un pago
 * - fiscal_high_retention: Cuando retención > 5% del monto (requiere atención)
 * - fiscal_supplier_payment: Notifica al proveedor de pago con retenciones
 * - fiscal_country_stub: Cuando se usa strategy de país no implementado
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class FiscalNotifications {

    /**
     * Notificar cuando se aplican retenciones en un pago
     * Destinatario: Usuario que crea la orden de pago + Finance team
     */
    static async notifyRetentionApplied({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'fiscal',
                workflowKey: 'fiscal_retention_applied',
                recipientType: 'user',
                recipientId,
                title: `Retenciones aplicadas: ${data.supplierName || 'Proveedor'}`,
                message: `Se aplicaron retenciones por $${(data.totalRetentions || 0).toLocaleString('es-AR')} en orden de pago #${data.paymentOrderId}. Breakdown: ${data.breakdownSummary || 'Ver detalle'}`,
                priority: 'medium',
                channels: ['inbox', 'websocket'],
                originType: 'payment_order',
                originId: data.paymentOrderId?.toString() || 'unknown',
                requiresAction: false,
                metadata: {
                    payment_order_id: data.paymentOrderId,
                    supplier_id: data.supplierId,
                    supplier_name: data.supplierName,
                    supplier_cuit: data.supplierCuit,
                    country_code: data.countryCode,
                    gross_amount: data.grossAmount,
                    total_retentions: data.totalRetentions,
                    net_amount: data.netAmount,
                    retention_breakdown: data.breakdown,
                    breakdown_summary: data.breakdownSummary
                }
            });
            console.log(`[FISCAL] Notificación enviada: fiscal_retention_applied (OC #${data.paymentOrderId})`);
        } catch (error) {
            console.error(`[FISCAL] Error en notifyRetentionApplied:`, error.message);
        }
    }

    /**
     * Alerta cuando retención es alta (> umbral, por defecto 5%)
     * Destinatario: Finance Manager / Contador
     */
    static async notifyHighRetention({ companyId, recipientId, data = {} }) {
        const retentionPercent = ((data.totalRetentions || 0) / (data.grossAmount || 1) * 100).toFixed(1);

        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'fiscal',
                workflowKey: 'fiscal_high_retention',
                recipientType: recipientId ? 'user' : 'role',
                recipientId: recipientId || 'finance_manager',
                title: `Retención alta: ${retentionPercent}% en pago a ${data.supplierName}`,
                message: `La retención total ($${(data.totalRetentions || 0).toLocaleString('es-AR')}) representa ${retentionPercent}% del monto bruto. Revisar antes de aprobar.`,
                priority: 'high',
                channels: ['email', 'inbox', 'websocket'],
                originType: 'payment_order',
                originId: data.paymentOrderId?.toString() || 'unknown',
                requiresAction: true,
                actionType: 'approve_reject',
                actionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
                metadata: {
                    payment_order_id: data.paymentOrderId,
                    supplier_id: data.supplierId,
                    supplier_name: data.supplierName,
                    country_code: data.countryCode,
                    gross_amount: data.grossAmount,
                    total_retentions: data.totalRetentions,
                    retention_percent: parseFloat(retentionPercent),
                    net_amount: data.netAmount,
                    retention_breakdown: data.breakdown,
                    threshold_exceeded: true
                }
            });
            console.log(`[FISCAL] ALERTA: Retención alta ${retentionPercent}% en OC #${data.paymentOrderId}`);
        } catch (error) {
            console.error(`[FISCAL] Error en notifyHighRetention:`, error.message);
        }
    }

    /**
     * Notificar al proveedor que recibirá pago con retenciones
     * Destinatario: Email del proveedor (si está registrado)
     */
    static async notifySupplierPayment({ companyId, supplierEmail, data = {} }) {
        if (!supplierEmail) {
            console.log(`[FISCAL] Proveedor sin email, no se envía notificación externa`);
            return;
        }

        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'fiscal',
                workflowKey: 'fiscal_supplier_payment',
                recipientType: 'email',
                recipientId: supplierEmail,
                title: `Pago programado con retenciones`,
                message: `Se ha programado un pago a su favor por $${(data.netAmount || 0).toLocaleString('es-AR')} (neto). Monto bruto: $${(data.grossAmount || 0).toLocaleString('es-AR')}, Retenciones: $${(data.totalRetentions || 0).toLocaleString('es-AR')}. Detalle: ${data.breakdownSummary}`,
                priority: 'medium',
                channels: ['email'],
                originType: 'payment_order',
                originId: data.paymentOrderId?.toString() || 'unknown',
                requiresAction: false,
                metadata: {
                    payment_order_id: data.paymentOrderId,
                    supplier_name: data.supplierName,
                    supplier_cuit: data.supplierCuit,
                    gross_amount: data.grossAmount,
                    total_retentions: data.totalRetentions,
                    net_amount: data.netAmount,
                    retention_breakdown: data.breakdown,
                    expected_payment_date: data.expectedPaymentDate,
                    company_name: data.companyName
                }
            });
            console.log(`[FISCAL] Email enviado a proveedor: ${supplierEmail}`);
        } catch (error) {
            console.error(`[FISCAL] Error en notifySupplierPayment:`, error.message);
        }
    }

    /**
     * Advertencia cuando se usa fiscal strategy de país stub
     * Destinatario: Admin / Finance
     */
    static async notifyCountryStub({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'fiscal',
                workflowKey: 'fiscal_country_stub',
                recipientType: 'user',
                recipientId,
                title: `Régimen fiscal ${data.countryCode} no implementado`,
                message: `El pago a ${data.supplierName} usa régimen fiscal de ${data.countryName} que está en modo STUB. Los cálculos de retención son aproximados.`,
                priority: 'medium',
                channels: ['inbox', 'websocket'],
                originType: 'payment_order',
                originId: data.paymentOrderId?.toString() || 'unknown',
                requiresAction: false,
                metadata: {
                    country_code: data.countryCode,
                    country_name: data.countryName,
                    payment_order_id: data.paymentOrderId,
                    supplier_id: data.supplierId,
                    is_stub: true
                }
            });
            console.log(`[FISCAL] Advertencia: País ${data.countryCode} es stub`);
        } catch (error) {
            console.error(`[FISCAL] Error en notifyCountryStub:`, error.message);
        }
    }

    /**
     * Helper: Generar resumen de breakdown para mensajes cortos
     */
    static formatBreakdownSummary(breakdown) {
        if (!breakdown || !Array.isArray(breakdown) || breakdown.length === 0) {
            return 'Sin retenciones';
        }
        return breakdown
            .filter(r => r.amount > 0)
            .map(r => `${r.type}: ${r.percent}%`)
            .join(', ');
    }

    /**
     * Punto de entrada unificado: evalúa y envía notificaciones según contexto
     * Llamar después de calcular retenciones en createPaymentOrderFromInvoices
     */
    static async notifyPaymentRetentions({ companyId, userId, paymentOrder, retentionResult, supplier, strategy }) {
        const { totalRetentions, breakdown, netAmount } = retentionResult;
        const grossAmount = paymentOrder.total_amount || (netAmount + totalRetentions);
        const retentionPercent = (totalRetentions / grossAmount) * 100;
        const HIGH_RETENTION_THRESHOLD = 5; // 5%

        const baseData = {
            paymentOrderId: paymentOrder.id,
            supplierId: supplier?.id,
            supplierName: supplier?.name || paymentOrder.supplier_name,
            supplierCuit: supplier?.tax_id,
            countryCode: strategy?.countryCode || 'AR',
            countryName: strategy?.getCountryName?.() || 'Argentina',
            grossAmount,
            totalRetentions,
            netAmount,
            breakdown,
            breakdownSummary: this.formatBreakdownSummary(breakdown)
        };

        // 1. Siempre notificar al creador si hay retenciones
        if (totalRetentions > 0) {
            await this.notifyRetentionApplied({ companyId, recipientId: userId, data: baseData });
        }

        // 2. Si retención es alta, alertar a finance
        if (retentionPercent > HIGH_RETENTION_THRESHOLD) {
            await this.notifyHighRetention({ companyId, data: baseData });
        }

        // 3. Si es país stub, advertir
        if (strategy?.isStub?.()) {
            await this.notifyCountryStub({ companyId, recipientId: userId, data: baseData });
        }

        // 4. Notificar al proveedor si tiene email
        if (supplier?.email && totalRetentions > 0) {
            await this.notifySupplierPayment({
                companyId,
                supplierEmail: supplier.email,
                data: {
                    ...baseData,
                    expectedPaymentDate: paymentOrder.due_date,
                    companyName: paymentOrder.company_name
                }
            });
        }
    }
}

module.exports = FiscalNotifications;
