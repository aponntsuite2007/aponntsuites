/**
 * SupplierEmailService.js
 * Servicio de notificaciones por email para proveedores
 *
 * Integrado con el sistema P2P para enviar:
 * - Invitaciones a RFQ
 * - Confirmaciones de órdenes
 * - Alertas de reclamos
 * - Notificaciones de pagos programados
 *
 * 🔥 MIGRADO A NCE (Notification Central Exchange)
 */

const nodemailer = require('nodemailer');
const { Pool } = require('pg');
// 🔥 NCE: Central Telefónica de Notificaciones (elimina bypass)
const NCE = require('./NotificationCentralExchange');

class SupplierEmailService {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'Aedr15150302',
            database: process.env.DB_NAME || 'attendance_system'
        });

        this.transporter = this.createTransporter();
        this.fromEmail = process.env.EMAIL_FROM || 'notificaciones@aponnt.com';
        this.portalUrl = process.env.SUPPLIER_PORTAL_URL || 'http://localhost:9998/panel-proveedores.html';
    }

    createTransporter() {
        // Usar configuración de ambiente o fallback a ethereal para desarrollo
        if (process.env.SMTP_HOST) {
            return nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        }

        // Configuración de desarrollo (sin envío real)
        return {
            sendMail: async (options) => {
                console.log('📧 [SUPPLIER EMAIL] Simulando envío (desarrollo):');
                console.log(`   To: ${options.to}`);
                console.log(`   Subject: ${options.subject}`);
                return { messageId: `dev-${Date.now()}` };
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEMPLATES DE EMAIL
    // ═══════════════════════════════════════════════════════════════════════════

    getBaseTemplate(content, title = 'Portal de Proveedores') {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #0d1117;
            margin: 0;
            padding: 20px;
            color: #e6edf3;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #161b22;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #30363d;
        }
        .header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: white;
            font-size: 24px;
        }
        .header p {
            margin: 10px 0 0;
            color: rgba(255,255,255,0.9);
            font-size: 14px;
        }
        .content {
            padding: 30px;
        }
        .content h2 {
            color: #e6edf3;
            margin-top: 0;
        }
        .content p {
            color: #8b949e;
            line-height: 1.6;
        }
        .info-box {
            background-color: #21262d;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #58a6ff;
        }
        .info-box h3 {
            margin: 0 0 10px;
            color: #58a6ff;
            font-size: 16px;
        }
        .info-box p {
            margin: 5px 0;
            color: #e6edf3;
        }
        .btn {
            display: inline-block;
            padding: 14px 28px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
        }
        .btn:hover {
            opacity: 0.9;
        }
        .footer {
            padding: 20px 30px;
            border-top: 1px solid #30363d;
            text-align: center;
            color: #6e7681;
            font-size: 12px;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        .badge-urgent {
            background-color: rgba(248, 81, 73, 0.2);
            color: #f85149;
        }
        .badge-success {
            background-color: rgba(63, 185, 80, 0.2);
            color: #3fb950;
        }
        .badge-info {
            background-color: rgba(88, 166, 255, 0.2);
            color: #58a6ff;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #30363d;
        }
        th {
            color: #8b949e;
            font-weight: 500;
            font-size: 12px;
            text-transform: uppercase;
        }
        td {
            color: #e6edf3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏭 Portal de Proveedores</h1>
            <p>Aponnt - Sistema de Gestión Empresarial</p>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>Este es un mensaje automático del Portal de Proveedores de Aponnt.</p>
            <p>Si no reconoce esta notificación, por favor ignórela.</p>
            <p>&copy; ${new Date().getFullYear()} Aponnt. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENVÍO DE NOTIFICACIONES
    // ═══════════════════════════════════════════════════════════════════════════

    async sendRfqInvitation(dataOrRfqId, supplierId = null) {
        try {
            // Detectar si se llamó con objeto completo o con IDs
            let rfq, supplier, companyName, email, deadline;

            if (typeof dataOrRfqId === 'object') {
                // Nuevo formato: objeto completo
                rfq = dataOrRfqId.rfq;
                supplier = dataOrRfqId.supplier;
                companyName = dataOrRfqId.company?.name || 'APONNT';
                email = supplier.email;

                deadline = new Date(rfq.quotationDeadline).toLocaleDateString('es-AR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                // Formato antiguo: IDs separados
                const rfqId = dataOrRfqId;

                // Obtener datos del RFQ y proveedor
                const [rfqData, supplierData, items] = await Promise.all([
                    this.pool.query(`
                        SELECT rfq.*, c.name as company_name
                        FROM request_for_quotations rfq
                        JOIN companies c ON rfq.company_id = c.company_id
                        WHERE rfq.id = $1
                    `, [rfqId]),

                    this.pool.query(`
                        SELECT ws.*, spu.email as portal_email, spu.first_name
                        FROM wms_suppliers ws
                        LEFT JOIN supplier_portal_users spu ON spu.supplier_id = ws.id AND spu.is_active = true
                        WHERE ws.id = $1
                    `, [supplierId]),

                    this.pool.query(`
                        SELECT * FROM rfq_items WHERE rfq_id = $1
                    `, [rfqId])
                ]);

                if (!rfqData.rows[0] || !supplierData.rows[0]) {
                    console.log('📧 [SUPPLIER EMAIL] Datos no encontrados para envío');
                    return null;
                }

                rfq = rfqData.rows[0];
                supplier = supplierData.rows[0];
                companyName = rfq.company_name;
                email = supplier.portal_email || supplier.email;

                deadline = new Date(rfq.submission_deadline).toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            }

            if (!email) {
                console.log('📧 [SUPPLIER EMAIL] Proveedor sin email configurado');
                return null;
            }

            // Para el nuevo formato, no necesitamos items HTML ya que se verá en el portal
            const itemsHtml = typeof dataOrRfqId === 'object'
                ? '<p>Consulte los detalles completos en el portal</p>'
                : items.rows.map(item => `
                    <tr>
                        <td>${item.product_name}</td>
                        <td>${item.product_code || '-'}</td>
                        <td>${item.quantity} ${item.unit_of_measure || 'und'}</td>
                    </tr>
                `).join('');

            const rfqNumber = typeof dataOrRfqId === 'object' ? rfq.rfqNumber : rfq.rfq_number;
            const rfqTitle = rfq.title;
            const rfqDescription = rfq.description;
            const supplierName = supplier.first_name || supplier.name;

            const content = `
                <h2>Nueva Solicitud de Cotización</h2>
                <p>Estimado/a ${supplierName},</p>
                <p><strong>${companyName}</strong> le invita a presentar cotización para la siguiente solicitud:</p>

                <div class="info-box">
                    <h3>📋 ${rfqNumber} - ${rfqTitle}</h3>
                    <p><strong>Fecha límite:</strong> <span class="badge badge-urgent">${deadline}</span></p>
                    ${rfqDescription ? `<p>${rfqDescription}</p>` : ''}
                </div>

                ${typeof dataOrRfqId === 'object' ? '' : `
                <h3>Productos Solicitados:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Código</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                `}

                <p style="text-align: center;">
                    <a href="${this.portalUrl}" class="btn">Ver Solicitud y Cotizar</a>
                </p>

                <p style="color: #6e7681; font-size: 13px;">
                    Por favor, ingrese al portal de proveedores para ver los detalles completos y enviar su cotización antes de la fecha límite.
                </p>
            `;

            // 🔥 REEMPLAZO: Email directo → NCE (Central Telefónica)
            const companyId = rfq.company_id;
            const rfqId = typeof dataOrRfqId === 'object' ? rfq.id : dataOrRfqId;

            const result = await NCE.send({
                // CONTEXTO
                companyId: companyId,
                module: 'suppliers',
                originType: 'rfq_invitation',
                originId: rfqId,

                // WORKFLOW
                workflowKey: 'suppliers.rfq_invitation',

                // DESTINATARIO (associate = proveedor)
                recipientType: 'associate',
                recipientId: supplier.id,
                recipientEmail: email,

                // CONTENIDO
                title: `[RFQ] Nueva solicitud de cotización: ${rfqNumber}`,
                message: `${companyName} le invita a presentar cotización para: ${rfqTitle}`,
                metadata: {
                    rfqId,
                    rfqNumber,
                    rfqTitle,
                    rfqDescription,
                    supplierName,
                    companyName,
                    deadline,
                    portalUrl: this.portalUrl
                },

                // COMPORTAMIENTO
                priority: 'high',
                requiresAction: true,
                actionType: 'response',
                slaHours: 72,  // 72 horas para responder RFQ (típico)

                // CANALES
                channels: ['email'],
            });

            // Solo actualizar BD si se llamó con el formato antiguo
            if (typeof dataOrRfqId !== 'object') {
                const rfqId = dataOrRfqId;

                // Actualizar invitación con fecha de envío
                await this.pool.query(`
                    UPDATE rfq_invitations
                    SET invitation_sent_at = NOW()
                    WHERE rfq_id = $1 AND supplier_id = $2
                `, [rfqId, supplierId]);

                // Registrar notificación
                await this.pool.query(`
                    UPDATE supplier_notifications
                    SET email_sent = true, email_sent_at = NOW()
                    WHERE reference_type = 'rfq' AND reference_id = $1 AND supplier_id = $2
                `, [rfqId, supplierId]);
            }

            console.log(`📧 [SUPPLIER EMAIL] RFQ invitation sent to ${email}`);
            return result;

        } catch (error) {
            console.error('❌ [SUPPLIER EMAIL] Error sending RFQ invitation:', error.message);
            throw error;
        }
    }

    async sendPurchaseOrderNotification(poId, supplierId) {
        try {
            const [poData, supplierData, items] = await Promise.all([
                this.pool.query(`
                    SELECT po.*, c.name as company_name
                    FROM purchase_orders po
                    JOIN companies c ON po.company_id = c.company_id
                    WHERE po.id = $1
                `, [poId]),

                this.pool.query(`
                    SELECT ws.*, spu.email as portal_email, spu.first_name
                    FROM wms_suppliers ws
                    LEFT JOIN supplier_portal_users spu ON spu.supplier_id = ws.id AND spu.is_active = true
                    WHERE ws.id = $1
                `, [supplierId]),

                this.pool.query(`
                    SELECT * FROM purchase_order_items WHERE purchase_order_id = $1
                `, [poId])
            ]);

            if (!poData.rows[0] || !supplierData.rows[0]) return null;

            const po = poData.rows[0];
            const supplier = supplierData.rows[0];
            const email = supplier.portal_email || supplier.email;

            if (!email) return null;

            const deliveryDate = po.expected_delivery ?
                new Date(po.expected_delivery).toLocaleDateString('es-AR') : 'A confirmar';

            const itemsHtml = items.rows.map(item => `
                <tr>
                    <td>${item.product_name}</td>
                    <td>${item.quantity_ordered}</td>
                    <td>$${parseFloat(item.unit_price).toLocaleString()}</td>
                    <td>$${parseFloat(item.line_total || 0).toLocaleString()}</td>
                </tr>
            `).join('');

            const content = `
                <h2>Nueva Orden de Compra</h2>
                <p>Estimado/a ${supplier.first_name || supplier.name},</p>
                <p>Ha recibido una nueva orden de compra de <strong>${po.company_name}</strong>.</p>

                <div class="info-box">
                    <h3>📦 ${po.po_number}</h3>
                    <p><strong>Total:</strong> <span class="badge badge-success">$${parseFloat(po.total).toLocaleString()}</span></p>
                    <p><strong>Entrega esperada:</strong> ${deliveryDate}</p>
                </div>

                <h3>Detalle de Productos:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <p style="text-align: center;">
                    <a href="${this.portalUrl}" class="btn">Ver y Confirmar Orden</a>
                </p>

                <p style="color: #6e7681; font-size: 13px;">
                    Por favor, ingrese al portal para confirmar la orden y proporcionar la fecha de entrega estimada.
                </p>
            `;

            // 🔥 REEMPLAZO: Email directo → NCE (Central Telefónica)
            const result = await NCE.send({
                companyId: po.company_id,
                module: 'suppliers',
                originType: 'purchase_order',
                originId: poId,

                workflowKey: 'suppliers.purchase_order_notification',

                recipientType: 'associate',
                recipientId: supplierId,
                recipientEmail: email,

                title: `[OC] Nueva orden de compra: ${po.po_number}`,
                message: `Nueva orden de compra de ${po.company_name} por $${parseFloat(po.total).toLocaleString()}`,
                metadata: {
                    poId,
                    poNumber: po.po_number,
                    total: po.total,
                    deliveryDate,
                    companyName: po.company_name,
                    portalUrl: this.portalUrl
                },

                priority: 'high',
                requiresAction: false,

                channels: ['email'],
            });

            console.log(`📧 [NCE] PO notification sent to ${email}`);
            return result;

        } catch (error) {
            console.error('❌ [SUPPLIER EMAIL] Error sending PO notification:', error.message);
            throw error;
        }
    }

    async sendClaimNotification(claimId, supplierId) {
        try {
            const [claimData, supplierData, items] = await Promise.all([
                this.pool.query(`
                    SELECT sc.*, c.name as company_name, po.po_number
                    FROM supplier_claims sc
                    JOIN companies c ON sc.company_id = c.company_id
                    LEFT JOIN purchase_orders po ON sc.purchase_order_id = po.id
                    WHERE sc.id = $1
                `, [claimId]),

                this.pool.query(`
                    SELECT ws.*, spu.email as portal_email, spu.first_name
                    FROM wms_suppliers ws
                    LEFT JOIN supplier_portal_users spu ON spu.supplier_id = ws.id AND spu.is_active = true
                    WHERE ws.id = $1
                `, [supplierId]),

                this.pool.query(`
                    SELECT * FROM supplier_claim_items WHERE claim_id = $1
                `, [claimId])
            ]);

            if (!claimData.rows[0] || !supplierData.rows[0]) return null;

            const claim = claimData.rows[0];
            const supplier = supplierData.rows[0];
            const email = supplier.portal_email || supplier.email;

            if (!email) return null;

            const claimTypes = {
                defective_product: 'Producto Defectuoso',
                wrong_product: 'Producto Incorrecto',
                missing_quantity: 'Faltante de Cantidad',
                damaged: 'Producto Dañado'
            };

            const itemsHtml = items.rows.map(item => `
                <tr>
                    <td>${item.product_name}</td>
                    <td>${item.quantity_affected}</td>
                    <td>${item.defect_description}</td>
                </tr>
            `).join('');

            const content = `
                <h2>⚠️ Nuevo Reclamo Recibido</h2>
                <p>Estimado/a ${supplier.first_name || supplier.name},</p>
                <p><strong>${claim.company_name}</strong> ha registrado un reclamo que requiere su atención.</p>

                <div class="info-box" style="border-left-color: #f85149;">
                    <h3 style="color: #f85149;">🔴 ${claim.claim_number}</h3>
                    <p><strong>Tipo:</strong> <span class="badge badge-urgent">${claimTypes[claim.claim_type] || claim.claim_type}</span></p>
                    <p><strong>OC Relacionada:</strong> ${claim.po_number || 'N/A'}</p>
                    <p><strong>Resolución Solicitada:</strong> ${claim.requested_resolution === 'replacement' ? 'Reemplazo' : 'Nota de Crédito'}</p>
                </div>

                <h3>Descripción:</h3>
                <p>${claim.description}</p>

                <h3>Productos Afectados:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Problema</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <p style="text-align: center;">
                    <a href="${this.portalUrl}" class="btn" style="background: linear-gradient(135deg, #f85149 0%, #da3633 100%);">
                        Ver Reclamo y Responder
                    </a>
                </p>

                <p style="color: #f85149; font-size: 13px; text-align: center;">
                    <strong>IMPORTANTE:</strong> Las órdenes de pago relacionadas están bloqueadas hasta que se resuelva este reclamo.
                </p>
            `;

            // 🔥 REEMPLAZO: Email directo → NCE (Central Telefónica)
            const result = await NCE.send({
                companyId: claim.company_id,
                module: 'suppliers',
                originType: 'supplier_claim',
                originId: claimId,

                workflowKey: 'suppliers.claim_notification',

                recipientType: 'associate',
                recipientId: supplierId,
                recipientEmail: email,

                title: `[URGENTE] Reclamo recibido: ${claim.claim_number}`,
                message: `${claim.company_name} ha registrado un reclamo que requiere su atención inmediata`,
                metadata: {
                    claimId,
                    claimNumber: claim.claim_number,
                    claimType: claim.claim_type,
                    poNumber: claim.po_number,
                    requestedResolution: claim.requested_resolution,
                    description: claim.description,
                    companyName: claim.company_name,
                    portalUrl: this.portalUrl
                },

                priority: 'critical',
                requiresAction: true,
                actionType: 'response',
                slaHours: 48,

                channels: ['email'],
            });

            console.log(`📧 [NCE] Claim notification sent to ${email}`);
            return result;

        } catch (error) {
            console.error('❌ [SUPPLIER EMAIL] Error sending claim notification:', error.message);
            throw error;
        }
    }

    async sendPaymentScheduledNotification(paymentId, supplierId) {
        try {
            const [paymentData, supplierData, invoices] = await Promise.all([
                this.pool.query(`
                    SELECT payord.*, c.name as company_name
                    FROM payment_orders payord
                    JOIN companies c ON payord.company_id = c.company_id
                    WHERE payord.id = $1
                `, [paymentId]),

                this.pool.query(`
                    SELECT ws.*, spu.email as portal_email, spu.first_name
                    FROM wms_suppliers ws
                    LEFT JOIN supplier_portal_users spu ON spu.supplier_id = ws.id AND spu.is_active = true
                    WHERE ws.id = $1
                `, [supplierId]),

                this.pool.query(`
                    SELECT poi.*, si.invoice_number
                    FROM payment_order_invoices poi
                    JOIN supplier_invoices si ON poi.invoice_id = si.id
                    WHERE poi.payment_order_id = $1
                `, [paymentId])
            ]);

            if (!paymentData.rows[0] || !supplierData.rows[0]) return null;

            const payment = paymentData.rows[0];
            const supplier = supplierData.rows[0];
            const email = supplier.portal_email || supplier.email;

            if (!email) return null;

            const scheduledDate = new Date(payment.scheduled_date).toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const invoicesHtml = invoices.rows.map(inv => `
                <tr>
                    <td>${inv.invoice_number}</td>
                    <td>$${parseFloat(inv.amount_to_pay).toLocaleString()}</td>
                    <td>$${parseFloat(inv.total_retentions || 0).toLocaleString()}</td>
                    <td>$${parseFloat(inv.net_amount || inv.amount_to_pay).toLocaleString()}</td>
                </tr>
            `).join('');

            const paymentMethods = {
                transfer: 'Transferencia Bancaria',
                check: 'Cheque',
                cash: 'Efectivo',
                credit_card: 'Tarjeta de Crédito'
            };

            const content = `
                <h2>💳 Pago Programado</h2>
                <p>Estimado/a ${supplier.first_name || supplier.name},</p>
                <p><strong>${payment.company_name}</strong> ha programado un pago a su favor.</p>

                <div class="info-box" style="border-left-color: #3fb950;">
                    <h3 style="color: #3fb950;">✅ ${payment.payment_order_number}</h3>
                    <p><strong>Monto Neto:</strong> <span class="badge badge-success">$${parseFloat(payment.net_amount).toLocaleString()}</span></p>
                    <p><strong>Fecha de Pago:</strong> ${scheduledDate}</p>
                    <p><strong>Método:</strong> ${paymentMethods[payment.payment_method] || payment.payment_method || 'A definir'}</p>
                </div>

                <h3>Facturas Incluidas:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Factura</th>
                            <th>Monto</th>
                            <th>Retenciones</th>
                            <th>Neto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoicesHtml}
                    </tbody>
                </table>

                <p style="text-align: center;">
                    <a href="${this.portalUrl}" class="btn" style="background: linear-gradient(135deg, #3fb950 0%, #238636 100%);">
                        Ver Detalle del Pago
                    </a>
                </p>
            `;

            // 🔥 REEMPLAZO: Email directo → NCE (Central Telefónica)
            const result = await NCE.send({
                companyId: payment.company_id,
                module: 'suppliers',
                originType: 'payment_order',
                originId: paymentId,

                workflowKey: 'suppliers.payment_scheduled',

                recipientType: 'associate',
                recipientId: supplierId,
                recipientEmail: email,

                title: `[PAGO] Pago programado: ${payment.payment_order_number}`,
                message: `${payment.company_name} ha programado un pago a su favor por $${parseFloat(payment.net_amount).toLocaleString()}`,
                metadata: {
                    paymentId,
                    paymentOrderNumber: payment.payment_order_number,
                    netAmount: payment.net_amount,
                    scheduledDate,
                    paymentMethod: payment.payment_method,
                    companyName: payment.company_name,
                    portalUrl: this.portalUrl
                },

                priority: 'medium',
                requiresAction: false,

                channels: ['email'],
            });

            console.log(`📧 [NCE] Payment notification sent to ${email}`);
            return result;

        } catch (error) {
            console.error('❌ [SUPPLIER EMAIL] Error sending payment notification:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENVÍO MASIVO (para RFQs a múltiples proveedores)
    // ═══════════════════════════════════════════════════════════════════════════

    async sendRfqToAllInvitedSuppliers(rfqId) {
        try {
            const invitations = await this.pool.query(`
                SELECT supplier_id FROM rfq_invitations WHERE rfq_id = $1
            `, [rfqId]);

            const results = [];
            for (const inv of invitations.rows) {
                try {
                    const result = await this.sendRfqInvitation(rfqId, inv.supplier_id);
                    results.push({ supplierId: inv.supplier_id, success: true, result });
                } catch (error) {
                    results.push({ supplierId: inv.supplier_id, success: false, error: error.message });
                }
            }

            return results;

        } catch (error) {
            console.error('❌ [SUPPLIER EMAIL] Error in bulk RFQ send:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAILS DE BIENVENIDA Y CREDENCIALES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Envía email de bienvenida con credenciales de acceso al portal
     * @param {Object} data - { supplier, company, credentials }
     */
    async sendWelcomeEmail(data) {
        try {
            const { supplier, company, credentials } = data;

            if (!supplier.email) {
                console.log('📧 [SUPPLIER EMAIL] No email configured for welcome');
                return null;
            }

            const content = `
                <h2>🎉 ¡Bienvenido al Portal de Proveedores!</h2>
                <p>Estimado/a ${supplier.contact_name || supplier.name},</p>
                <p><strong>${company.name}</strong> le ha habilitado acceso al Portal de Proveedores de APONNT.</p>

                <div class="info-box" style="border-left-color: #3fb950;">
                    <h3 style="color: #3fb950;">🔐 Sus Credenciales de Acceso</h3>
                    <p><strong>URL del Portal:</strong></p>
                    <p style="background: #21262d; padding: 10px; border-radius: 4px; font-family: monospace;">
                        <a href="${credentials.portalUrl}" style="color: #58a6ff;">${credentials.portalUrl}</a>
                    </p>
                    <p><strong>Email:</strong> ${credentials.email}</p>
                    <p><strong>Contraseña temporal:</strong></p>
                    <p style="background: #21262d; padding: 10px; border-radius: 4px; font-family: monospace; color: #f0883e;">
                        ${credentials.password}
                    </p>
                </div>

                <div style="background: rgba(240, 136, 62, 0.1); border: 1px solid #f0883e; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #f0883e; margin: 0;">
                        <strong>⚠️ IMPORTANTE:</strong> Por seguridad, deberá cambiar su contraseña en el primer inicio de sesión.
                    </p>
                </div>

                <h3>¿Qué puede hacer en el Portal?</h3>
                <ul style="color: #8b949e;">
                    <li>📋 Ver y responder a solicitudes de cotización (RFQ)</li>
                    <li>📦 Consultar sus órdenes de compra</li>
                    <li>📄 Cargar facturas y documentos</li>
                    <li>💳 Consultar pagos programados y realizados</li>
                    <li>⚠️ Gestionar reclamos</li>
                    <li>📊 Ver estadísticas de su relación comercial</li>
                    <li>📢 Publicar ofertas y promociones</li>
                </ul>

                <p style="text-align: center;">
                    <a href="${credentials.portalUrl}" class="btn">Acceder al Portal</a>
                </p>

                <p style="color: #6e7681; font-size: 13px;">
                    Si tiene alguna duda, puede contactar a su comprador asignado en ${company.name}.
                </p>

                <div style="background: rgba(88, 166, 255, 0.1); border: 1px solid #58a6ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #58a6ff; margin: 0; font-size: 13px;">
                        <strong>💡 Consejo:</strong> Guarde este email hasta que haya cambiado su contraseña y verificado que puede acceder correctamente.
                    </p>
                </div>
            `;

            // 🔥 REEMPLAZO: Email directo → NCE (Central Telefónica)
            const result = await NCE.send({
                companyId: company.company_id,
                module: 'suppliers',
                originType: 'supplier_welcome',
                originId: supplier.id,

                workflowKey: 'suppliers.welcome_email',

                recipientType: 'associate',
                recipientId: supplier.id,
                recipientEmail: supplier.email,

                title: '[APONNT] ¡Bienvenido al Portal de Proveedores!',
                message: `${company.name} le ha habilitado acceso al Portal de Proveedores de APONNT`,
                metadata: {
                    supplierId: supplier.id,
                    supplierName: supplier.contact_name || supplier.name,
                    companyName: company.name,
                    credentialsEmail: credentials.email,
                    credentialsPassword: credentials.password,  // ⚠️ Solo en metadata, no en logs
                    portalUrl: credentials.portalUrl
                },

                priority: 'high',
                requiresAction: false,

                channels: ['email'],
            });

            console.log(`📧 [NCE] Welcome email sent to ${supplier.email}`);
            return result;

        } catch (error) {
            console.error('❌ [SUPPLIER EMAIL] Error sending welcome email:', error.message);
            throw error;
        }
    }

    /**
     * Envía email con nueva contraseña temporal (reset)
     * @param {Object} data - { supplier, credentials }
     */
    async sendPasswordResetEmail(data) {
        try {
            const { supplier, credentials } = data;

            if (!supplier.email) {
                console.log('📧 [SUPPLIER EMAIL] No email configured for password reset');
                return null;
            }

            const content = `
                <h2>🔑 Restablecimiento de Contraseña</h2>
                <p>Estimado/a ${supplier.contact_name || supplier.name},</p>
                <p>Se ha restablecido la contraseña de su cuenta en el Portal de Proveedores de APONNT.</p>

                <div class="info-box" style="border-left-color: #f0883e;">
                    <h3 style="color: #f0883e;">🔐 Nuevas Credenciales</h3>
                    <p><strong>URL del Portal:</strong></p>
                    <p style="background: #21262d; padding: 10px; border-radius: 4px; font-family: monospace;">
                        <a href="${credentials.portalUrl}" style="color: #58a6ff;">${credentials.portalUrl}</a>
                    </p>
                    <p><strong>Email:</strong> ${credentials.email}</p>
                    <p><strong>Nueva contraseña temporal:</strong></p>
                    <p style="background: #21262d; padding: 10px; border-radius: 4px; font-family: monospace; color: #f0883e; font-size: 16px;">
                        ${credentials.password}
                    </p>
                </div>

                <div style="background: rgba(240, 136, 62, 0.1); border: 1px solid #f0883e; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #f0883e; margin: 0;">
                        <strong>⚠️ IMPORTANTE:</strong> Esta contraseña es temporal. Por seguridad, deberá cambiarla en el próximo inicio de sesión.
                    </p>
                </div>

                <p style="text-align: center;">
                    <a href="${credentials.portalUrl}" class="btn" style="background: linear-gradient(135deg, #f0883e 0%, #d87a30 100%);">
                        Acceder y Cambiar Contraseña
                    </a>
                </p>

                <p style="color: #6e7681; font-size: 13px;">
                    Si usted no solicitó este restablecimiento de contraseña, por favor contacte inmediatamente a su comprador asignado.
                </p>
            `;

            // 🔥 REEMPLAZO: Email directo → NCE (Central Telefónica)
            const result = await NCE.send({
                companyId: supplier.company_id || null,  // Puede ser null si es global
                module: 'suppliers',
                originType: 'supplier_password_reset',
                originId: supplier.id,

                workflowKey: 'suppliers.password_reset',

                recipientType: 'associate',
                recipientId: supplier.id,
                recipientEmail: supplier.email,

                title: '[APONNT] Restablecimiento de Contraseña',
                message: 'Se ha restablecido la contraseña de su cuenta en el Portal de Proveedores',
                metadata: {
                    supplierId: supplier.id,
                    supplierName: supplier.contact_name || supplier.name,
                    credentialsEmail: credentials.email,
                    credentialsPassword: credentials.password,  // ⚠️ Solo en metadata, no en logs
                    portalUrl: credentials.portalUrl
                },

                priority: 'high',
                requiresAction: false,

                channels: ['email'],
            });

            console.log(`📧 [NCE] Password reset email sent to ${supplier.email}`);
            return result;

        } catch (error) {
            console.error('❌ [SUPPLIER EMAIL] Error sending password reset email:', error.message);
            throw error;
        }
    }
}

module.exports = new SupplierEmailService();
