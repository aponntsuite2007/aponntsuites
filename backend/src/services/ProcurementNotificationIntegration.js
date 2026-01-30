/**
 * ProcurementNotificationIntegration - Integración de Notificaciones con NCE
 *
 * Conecta todo el ciclo P2P con el sistema de notificaciones central:
 * - Notificaciones internas (usuarios, aprobadores)
 * - Notificaciones externas (proveedores via email)
 * - Escalamientos automáticos
 * - Tracking de SLA
 *
 * EVENTOS QUE DISPARAN NOTIFICACIONES:
 * 1. Requisición creada → Notifica aprobadores
 * 2. Requisición aprobada/rechazada → Notifica solicitante
 * 3. Orden creada → Notifica aprobadores OC
 * 4. Orden aprobada → EMAIL AL PROVEEDOR + Notifica comprador
 * 5. Orden enviada → EMAIL AL PROVEEDOR (confirmación envío)
 * 6. Recepción creada → Notifica inspector QC
 * 7. Recepción aprobada → Notifica finanzas para factura
 * 8. Factura con discrepancia → Notifica compras + proveedor
 * 9. Three-way match OK → Notifica tesorería para pago
 * 10. Pago ejecutado → EMAIL AL PROVEEDOR + Notifica contabilidad
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// NCE exporta singleton, no clase
let nceInstance = null;
function getNCE() {
    if (!nceInstance) {
        try {
            const NCEModule = require('./NotificationCentralExchange');
            // Si es clase, instanciar; si es singleton, usar directamente
            nceInstance = (typeof NCEModule === 'function' && NCEModule.prototype)
                ? new NCEModule()
                : NCEModule;
        } catch (e) {
            console.warn('[ProcurementNotif] NCE no disponible:', e.message);
            // Fallback que solo logea
            nceInstance = {
                send: async (params) => {
                    console.log('[ProcurementNotif] Notification (NCE unavailable):', params.title);
                    return { success: true, fallback: true };
                }
            };
        }
    }
    return nceInstance;
}

class ProcurementNotificationIntegration {
    constructor() {
        this.MODULE = 'procurement';
    }

    get nce() {
        return getNCE();
    }

    // ========================================================================
    // REQUISICIONES
    // ========================================================================

    /**
     * Notificar nueva requisición pendiente de aprobación
     */
    async notifyRequisitionPendingApproval(companyId, requisition, creatorUserId) {
        try {
            await this.nce.send({
                companyId,
                module: this.MODULE,
                workflowKey: 'procurement.requisition_approval',
                originType: 'requisition',
                originId: requisition.id.toString(),
                recipientType: 'hierarchy',
                recipientId: 'approver_requisition',
                title: `Nueva Solicitud de Compra requiere aprobación`,
                message: `La solicitud ${requisition.requisition_number} por ${this.formatCurrency(requisition.estimated_total)} requiere su aprobación.`,
                metadata: {
                    requisition_id: requisition.id,
                    requisition_number: requisition.requisition_number,
                    amount: requisition.estimated_total,
                    priority: requisition.priority,
                    required_date: requisition.required_date,
                    requester_name: requisition.requester_name
                },
                priority: requisition.priority === 'urgent' ? 'urgent' : 'high',
                requiresAction: true,
                actionType: 'approval',
                slaHours: this.getApprovalSLA(requisition.priority),
                createdBy: creatorUserId
            });

            console.log(`[ProcurementNotif] Notificación enviada - Requisición ${requisition.requisition_number} pendiente aprobación`);
            return { success: true };
        } catch (error) {
            console.error('[ProcurementNotif] Error notificando requisición:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notificar requisición aprobada
     */
    async notifyRequisitionApproved(companyId, requisition, approverUserId, approverName) {
        try {
            await this.nce.send({
                companyId,
                module: this.MODULE,
                workflowKey: 'procurement.requisition_approved',
                originType: 'requisition',
                originId: requisition.id.toString(),
                recipientType: 'user',
                recipientId: requisition.requester_id,
                title: `Solicitud de Compra aprobada`,
                message: `Su solicitud ${requisition.requisition_number} ha sido aprobada por ${approverName}. Puede proceder con la cotización/orden de compra.`,
                metadata: {
                    requisition_id: requisition.id,
                    requisition_number: requisition.requisition_number,
                    approved_by: approverName,
                    next_step: 'create_rfq_or_po'
                },
                priority: 'normal',
                requiresAction: false,
                createdBy: approverUserId
            });

            return { success: true };
        } catch (error) {
            console.error('[ProcurementNotif] Error notificando aprobación:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notificar requisición rechazada
     */
    async notifyRequisitionRejected(companyId, requisition, approverUserId, approverName, reason) {
        try {
            await this.nce.send({
                companyId,
                module: this.MODULE,
                workflowKey: 'procurement.requisition_rejected',
                originType: 'requisition',
                originId: requisition.id.toString(),
                recipientType: 'user',
                recipientId: requisition.requester_id,
                title: `Solicitud de Compra rechazada`,
                message: `Su solicitud ${requisition.requisition_number} ha sido rechazada por ${approverName}. Motivo: ${reason}`,
                metadata: {
                    requisition_id: requisition.id,
                    requisition_number: requisition.requisition_number,
                    rejected_by: approverName,
                    rejection_reason: reason
                },
                priority: 'high',
                requiresAction: false,
                createdBy: approverUserId
            });

            return { success: true };
        } catch (error) {
            console.error('[ProcurementNotif] Error notificando rechazo:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================================================
    // ÓRDENES DE COMPRA
    // ========================================================================

    /**
     * Notificar orden de compra pendiente de aprobación
     */
    async notifyOrderPendingApproval(companyId, order, creatorUserId) {
        try {
            await this.nce.send({
                companyId,
                module: this.MODULE,
                workflowKey: 'procurement.order_approval',
                originType: 'purchase_order',
                originId: order.id.toString(),
                recipientType: 'hierarchy',
                recipientId: 'approver_purchase_order',
                title: `Nueva Orden de Compra requiere aprobación`,
                message: `La OC ${order.order_number} por ${this.formatCurrency(order.total_amount)} al proveedor ${order.supplier_name || 'N/A'} requiere su aprobación.`,
                metadata: {
                    order_id: order.id,
                    order_number: order.order_number,
                    supplier_id: order.supplier_id,
                    supplier_name: order.supplier_name,
                    amount: order.total_amount,
                    requisition_number: order.requisition_number
                },
                priority: 'high',
                requiresAction: true,
                actionType: 'approval',
                slaHours: 24,
                createdBy: creatorUserId
            });

            return { success: true };
        } catch (error) {
            console.error('[ProcurementNotif] Error notificando OC pendiente:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * EMAIL AL PROVEEDOR - Orden de compra aprobada
     */
    async sendOrderToSupplier(companyId, order) {
        try {
            // Obtener datos del proveedor
            const [supplier] = await sequelize.query(`
                SELECT id, legal_name, trade_name, email, contact_email, contact_name, contact_phone
                FROM procurement_suppliers
                WHERE id = :supplierId
            `, {
                replacements: { supplierId: order.supplier_id },
                type: QueryTypes.SELECT
            });

            if (!supplier || (!supplier.email && !supplier.contact_email)) {
                console.warn(`[ProcurementNotif] Proveedor ${order.supplier_id} sin email configurado`);
                return { success: false, error: 'Proveedor sin email' };
            }

            const recipientEmail = supplier.contact_email || supplier.email;
            const recipientName = supplier.contact_name || supplier.trade_name || supplier.legal_name;

            // Obtener datos de la empresa
            const [company] = await sequelize.query(`
                SELECT name, legal_name, email, phone, address, tax_id
                FROM companies
                WHERE company_id = :companyId
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            // Generar HTML del email
            const emailHtml = this.generateOrderEmailTemplate(order, supplier, company);

            // Encolar email
            await sequelize.query(`
                INSERT INTO email_queue (
                    company_id, to_email, to_name, subject, template, template_data,
                    html_body, priority, status, created_at
                ) VALUES (
                    :companyId, :toEmail, :toName, :subject, 'procurement_order',
                    :templateData, :htmlBody, 'high', 'pending', NOW()
                )
            `, {
                replacements: {
                    companyId,
                    toEmail: recipientEmail,
                    toName: recipientName,
                    subject: `Nueva Orden de Compra ${order.order_number}`,
                    templateData: JSON.stringify({
                        order_number: order.order_number,
                        total_amount: order.total_amount,
                        currency: order.currency,
                        expected_delivery_date: order.expected_delivery_date,
                        company_name: company?.name || 'N/A'
                    }),
                    htmlBody: emailHtml
                },
                type: QueryTypes.INSERT
            });

            console.log(`[ProcurementNotif] Email encolado para proveedor ${recipientEmail} - OC ${order.order_number}`);

            // También notificar internamente
            await this.nce.send({
                companyId,
                module: this.MODULE,
                workflowKey: 'procurement.order_sent_to_supplier',
                originType: 'purchase_order',
                originId: order.id.toString(),
                recipientType: 'role',
                recipientId: 'compras',
                title: `OC enviada al proveedor`,
                message: `La OC ${order.order_number} ha sido enviada a ${recipientName} (${recipientEmail})`,
                metadata: {
                    order_id: order.id,
                    order_number: order.order_number,
                    supplier_email: recipientEmail,
                    supplier_name: recipientName
                },
                priority: 'normal',
                requiresAction: false
            });

            return { success: true, email: recipientEmail };
        } catch (error) {
            console.error('[ProcurementNotif] Error enviando OC al proveedor:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================================================
    // RECEPCIONES
    // ========================================================================

    /**
     * Notificar recepción creada - pendiente de QC
     */
    async notifyReceiptPendingQC(companyId, receipt, creatorUserId) {
        try {
            await this.nce.send({
                companyId,
                module: this.MODULE,
                workflowKey: 'procurement.receipt_qc_pending',
                originType: 'receipt',
                originId: receipt.id.toString(),
                recipientType: 'role',
                recipientId: 'quality_inspector',
                title: `Recepción pendiente de control de calidad`,
                message: `El remito ${receipt.receipt_number} de la OC ${receipt.order_number || 'N/A'} requiere inspección de calidad.`,
                metadata: {
                    receipt_id: receipt.id,
                    receipt_number: receipt.receipt_number,
                    order_id: receipt.order_id,
                    supplier_name: receipt.supplier_name
                },
                priority: 'high',
                requiresAction: true,
                actionType: 'inspection',
                slaHours: 4,
                createdBy: creatorUserId
            });

            return { success: true };
        } catch (error) {
            console.error('[ProcurementNotif] Error notificando recepción QC:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notificar recepción con rechazos
     */
    async notifyReceiptWithRejections(companyId, receipt, rejectedItems) {
        try {
            // Notificar a compras
            await this.nce.send({
                companyId,
                module: this.MODULE,
                workflowKey: 'procurement.receipt_partial_rejection',
                originType: 'receipt',
                originId: receipt.id.toString(),
                recipientType: 'role',
                recipientId: 'compras',
                title: `Recepción con items rechazados`,
                message: `El remito ${receipt.receipt_number} tiene ${rejectedItems.length} items rechazados. Verificar con el proveedor.`,
                metadata: {
                    receipt_id: receipt.id,
                    receipt_number: receipt.receipt_number,
                    rejected_items: rejectedItems,
                    rejection_reasons: rejectedItems.map(i => i.rejection_reason)
                },
                priority: 'high',
                requiresAction: true,
                actionType: 'follow_up'
            });

            // EMAIL AL PROVEEDOR sobre rechazos
            await this.sendRejectionNoticeToSupplier(companyId, receipt, rejectedItems);

            return { success: true };
        } catch (error) {
            console.error('[ProcurementNotif] Error notificando rechazos:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================================================
    // FACTURAS Y PAGOS
    // ========================================================================

    /**
     * Notificar factura lista para three-way match
     */
    async notifyInvoiceReadyForMatching(companyId, invoice) {
        try {
            await this.nce.send({
                companyId,
                module: this.MODULE,
                workflowKey: 'procurement.invoice_matching_pending',
                originType: 'invoice',
                originId: invoice.id.toString(),
                recipientType: 'role',
                recipientId: 'cuentas_pagar',
                title: `Factura pendiente de verificación`,
                message: `La factura ${invoice.invoice_number} del proveedor ${invoice.supplier_name || 'N/A'} por ${this.formatCurrency(invoice.total_amount)} requiere three-way matching.`,
                metadata: {
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    amount: invoice.total_amount,
                    due_date: invoice.due_date
                },
                priority: 'high',
                requiresAction: true,
                actionType: 'verification',
                slaHours: 24
            });

            return { success: true };
        } catch (error) {
            console.error('[ProcurementNotif] Error notificando factura:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notificar discrepancia en matching
     */
    async notifyMatchingDiscrepancy(companyId, invoice, matchResult) {
        try {
            // Notificar a compras
            await this.nce.send({
                companyId,
                module: this.MODULE,
                workflowKey: 'procurement.invoice_discrepancy',
                originType: 'invoice',
                originId: invoice.id.toString(),
                recipientType: 'role',
                recipientId: 'compras',
                title: `Discrepancia en factura ${invoice.invoice_number}`,
                message: `La factura tiene una discrepancia del ${matchResult.variance_percent?.toFixed(1)}%. Requiere revisión antes de aprobar pago.`,
                metadata: {
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    variance_percent: matchResult.variance_percent,
                    expected_amount: matchResult.expected_amount,
                    invoice_amount: matchResult.invoice_amount,
                    discrepancy_details: matchResult.details
                },
                priority: 'urgent',
                requiresAction: true,
                actionType: 'resolution'
            });

            return { success: true };
        } catch (error) {
            console.error('[ProcurementNotif] Error notificando discrepancia:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notificar pago listo para ejecución
     */
    async notifyPaymentReadyForExecution(companyId, payment) {
        try {
            await this.nce.send({
                companyId,
                module: this.MODULE,
                workflowKey: 'procurement.payment_ready',
                originType: 'payment',
                originId: payment.id.toString(),
                recipientType: 'role',
                recipientId: 'tesoreria',
                title: `Orden de Pago lista para ejecución`,
                message: `La OP ${payment.payment_number} por ${this.formatCurrency(payment.total_amount)} al proveedor ${payment.supplier_name || 'N/A'} está lista para ejecutar.`,
                metadata: {
                    payment_id: payment.id,
                    payment_number: payment.payment_number,
                    amount: payment.total_amount,
                    supplier_id: payment.supplier_id,
                    supplier_name: payment.supplier_name,
                    scheduled_date: payment.scheduled_date
                },
                priority: 'high',
                requiresAction: true,
                actionType: 'execution',
                slaHours: 24
            });

            return { success: true };
        } catch (error) {
            console.error('[ProcurementNotif] Error notificando pago:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * EMAIL AL PROVEEDOR - Pago ejecutado
     */
    async sendPaymentConfirmationToSupplier(companyId, payment) {
        try {
            // Obtener datos del proveedor
            const [supplier] = await sequelize.query(`
                SELECT id, legal_name, trade_name, email, contact_email, contact_name
                FROM procurement_suppliers
                WHERE id = :supplierId
            `, {
                replacements: { supplierId: payment.supplier_id },
                type: QueryTypes.SELECT
            });

            if (!supplier || (!supplier.email && !supplier.contact_email)) {
                return { success: false, error: 'Proveedor sin email' };
            }

            const recipientEmail = supplier.contact_email || supplier.email;

            // Generar HTML
            const emailHtml = this.generatePaymentEmailTemplate(payment, supplier);

            // Encolar email
            await sequelize.query(`
                INSERT INTO email_queue (
                    company_id, to_email, to_name, subject, template, template_data,
                    html_body, priority, status, created_at
                ) VALUES (
                    :companyId, :toEmail, :toName, :subject, 'procurement_payment',
                    :templateData, :htmlBody, 'normal', 'pending', NOW()
                )
            `, {
                replacements: {
                    companyId,
                    toEmail: recipientEmail,
                    toName: supplier.contact_name || supplier.trade_name || supplier.legal_name,
                    subject: `Confirmación de Pago - ${payment.payment_number}`,
                    templateData: JSON.stringify({
                        payment_number: payment.payment_number,
                        amount: payment.total_amount,
                        payment_date: payment.payment_date
                    }),
                    htmlBody: emailHtml
                },
                type: QueryTypes.INSERT
            });

            console.log(`[ProcurementNotif] Email de pago encolado para proveedor ${recipientEmail}`);
            return { success: true, email: recipientEmail };
        } catch (error) {
            console.error('[ProcurementNotif] Error enviando confirmación de pago:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================================================
    // RFQ (Request for Quotation)
    // ========================================================================

    /**
     * EMAIL A PROVEEDORES - Invitación a cotizar
     */
    async sendRFQInvitationToSuppliers(companyId, rfq, supplierIds) {
        const results = [];

        for (const supplierId of supplierIds) {
            try {
                const [supplier] = await sequelize.query(`
                    SELECT id, legal_name, trade_name, email, contact_email, contact_name
                    FROM procurement_suppliers
                    WHERE id = :supplierId AND company_id = :companyId
                `, {
                    replacements: { supplierId, companyId },
                    type: QueryTypes.SELECT
                });

                if (!supplier || (!supplier.email && !supplier.contact_email)) {
                    results.push({ supplierId, success: false, error: 'Sin email' });
                    continue;
                }

                const recipientEmail = supplier.contact_email || supplier.email;
                const emailHtml = this.generateRFQEmailTemplate(rfq, supplier);

                await sequelize.query(`
                    INSERT INTO email_queue (
                        company_id, to_email, to_name, subject, template, template_data,
                        html_body, priority, status, created_at
                    ) VALUES (
                        :companyId, :toEmail, :toName, :subject, 'procurement_rfq',
                        :templateData, :htmlBody, 'high', 'pending', NOW()
                    )
                `, {
                    replacements: {
                        companyId,
                        toEmail: recipientEmail,
                        toName: supplier.contact_name || supplier.trade_name,
                        subject: `Invitación a Cotizar - RFQ ${rfq.rfq_number}`,
                        templateData: JSON.stringify({
                            rfq_number: rfq.rfq_number,
                            due_date: rfq.due_date
                        }),
                        htmlBody: emailHtml
                    },
                    type: QueryTypes.INSERT
                });

                results.push({ supplierId, success: true, email: recipientEmail });
            } catch (error) {
                results.push({ supplierId, success: false, error: error.message });
            }
        }

        console.log(`[ProcurementNotif] RFQ ${rfq.rfq_number} enviado a ${results.filter(r => r.success).length}/${supplierIds.length} proveedores`);
        return { success: true, results };
    }

    // ========================================================================
    // EMAIL TEMPLATES
    // ========================================================================

    generateOrderEmailTemplate(order, supplier, company) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .order-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .amount { font-size: 24px; color: #0066cc; font-weight: bold; }
        .footer { background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .btn { display: inline-block; background: #0066cc; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Nueva Orden de Compra</h1>
        <p>N° ${order.order_number}</p>
    </div>
    <div class="content">
        <p>Estimado/a ${supplier.contact_name || supplier.trade_name || supplier.legal_name},</p>

        <p>Le informamos que hemos emitido una nueva orden de compra a su favor:</p>

        <div class="order-info">
            <div class="info-row">
                <span class="label">N° de Orden:</span>
                <span>${order.order_number}</span>
            </div>
            <div class="info-row">
                <span class="label">Fecha de Emisión:</span>
                <span>${new Date(order.order_date).toLocaleDateString('es-AR')}</span>
            </div>
            <div class="info-row">
                <span class="label">Fecha de Entrega Esperada:</span>
                <span>${new Date(order.expected_delivery_date).toLocaleDateString('es-AR')}</span>
            </div>
            <div class="info-row">
                <span class="label">Condición de Pago:</span>
                <span>${order.payment_terms || `${order.payment_days || 30} días`}</span>
            </div>
            <div class="info-row">
                <span class="label">Monto Total:</span>
                <span class="amount">${this.formatCurrency(order.total_amount, order.currency)}</span>
            </div>
        </div>

        ${order.delivery_address ? `
        <p><strong>Dirección de Entrega:</strong><br>${order.delivery_address}</p>
        ` : ''}

        ${order.special_conditions ? `
        <p><strong>Condiciones Especiales:</strong><br>${order.special_conditions}</p>
        ` : ''}

        <p>Por favor, confirme la recepción de esta orden de compra respondiendo a este email o a través de nuestro portal de proveedores.</p>

        <p style="text-align: center;">
            <a href="#" class="btn">Ver Orden Completa</a>
            <a href="#" class="btn" style="background: #28a745;">Confirmar Orden</a>
        </p>
    </div>
    <div class="footer">
        <p><strong>${company?.name || 'Empresa'}</strong></p>
        <p>${company?.address || ''} | ${company?.phone || ''} | ${company?.email || ''}</p>
        <p style="margin-top: 10px; font-size: 10px;">
            Este email fue generado automáticamente. Por favor no responda directamente a esta dirección.
        </p>
    </div>
</body>
</html>
        `;
    }

    generatePaymentEmailTemplate(payment, supplier) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .payment-info { background: #e8f5e9; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745; }
        .amount { font-size: 28px; color: #28a745; font-weight: bold; }
        .footer { background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Confirmación de Pago</h1>
        <p>N° ${payment.payment_number}</p>
    </div>
    <div class="content">
        <p>Estimado/a ${supplier.contact_name || supplier.trade_name || supplier.legal_name},</p>

        <p>Le informamos que hemos realizado el pago correspondiente a las facturas detalladas a continuación:</p>

        <div class="payment-info">
            <p><strong>Número de Pago:</strong> ${payment.payment_number}</p>
            <p><strong>Fecha de Pago:</strong> ${new Date(payment.payment_date || new Date()).toLocaleDateString('es-AR')}</p>
            <p><strong>Método:</strong> ${payment.payment_method || 'Transferencia Bancaria'}</p>
            ${payment.bank_reference ? `<p><strong>Referencia Bancaria:</strong> ${payment.bank_reference}</p>` : ''}
            <p style="margin-top: 15px;"><strong>Monto Total Pagado:</strong></p>
            <p class="amount">${this.formatCurrency(payment.total_amount, payment.currency)}</p>
        </div>

        <p>Si tiene alguna consulta sobre este pago, no dude en contactarnos.</p>

        <p>Agradecemos su colaboración.</p>
    </div>
    <div class="footer">
        <p>Este email fue generado automáticamente como comprobante de pago.</p>
    </div>
</body>
</html>
        `;
    }

    generateRFQEmailTemplate(rfq, supplier) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .rfq-info { background: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ff9800; }
        .deadline { color: #d32f2f; font-weight: bold; font-size: 18px; }
        .btn { display: inline-block; background: #ff9800; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px; }
        .footer { background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Invitación a Cotizar</h1>
        <p>RFQ ${rfq.rfq_number}</p>
    </div>
    <div class="content">
        <p>Estimado/a ${supplier.contact_name || supplier.trade_name || supplier.legal_name},</p>

        <p>Le invitamos a participar en el siguiente proceso de cotización:</p>

        <div class="rfq-info">
            <p><strong>Número de RFQ:</strong> ${rfq.rfq_number}</p>
            <p><strong>Fecha de Emisión:</strong> ${new Date(rfq.issue_date || new Date()).toLocaleDateString('es-AR')}</p>
            <p><strong>Fecha Límite para Cotizar:</strong></p>
            <p class="deadline">${new Date(rfq.due_date).toLocaleDateString('es-AR')}</p>
            ${rfq.valid_until ? `<p><strong>Validez de Cotización:</strong> Hasta ${new Date(rfq.valid_until).toLocaleDateString('es-AR')}</p>` : ''}
        </div>

        ${rfq.payment_terms ? `<p><strong>Condiciones de Pago:</strong> ${rfq.payment_terms}</p>` : ''}
        ${rfq.delivery_terms ? `<p><strong>Condiciones de Entrega:</strong> ${rfq.delivery_terms}</p>` : ''}

        <p>Para ver los items solicitados y enviar su cotización, ingrese a nuestro portal de proveedores:</p>

        <p style="text-align: center;">
            <a href="#" class="btn">Acceder al Portal de Proveedores</a>
        </p>

        <p>Si tiene alguna consulta, no dude en contactarnos.</p>
    </div>
    <div class="footer">
        <p>Este email fue generado automáticamente. Por favor no responda directamente a esta dirección.</p>
    </div>
</body>
</html>
        `;
    }

    async sendRejectionNoticeToSupplier(companyId, receipt, rejectedItems) {
        // Similar implementation to other supplier emails
        console.log(`[ProcurementNotif] Notificación de rechazo pendiente de implementar - Receipt ${receipt.receipt_number}`);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    formatCurrency(amount, currency = 'ARS') {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency
        }).format(num);
    }

    getApprovalSLA(priority) {
        switch (priority) {
            case 'urgent': return 4;
            case 'high': return 12;
            case 'normal':
            case 'medium': return 24;
            case 'low': return 48;
            default: return 24;
        }
    }
}

// Exportar singleton
module.exports = new ProcurementNotificationIntegration();
