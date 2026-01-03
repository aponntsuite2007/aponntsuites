/**
 * Procurement Routes
 * API REST completa para el módulo de Compras P2P
 * 50+ endpoints para gestión integral del ciclo Procure-to-Pay
 *
 * Módulo Procurement - Gestión de Compras y Proveedores
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ProcurementService = require('../services/ProcurementService');
const SupplierItemMappingService = require('../services/SupplierItemMappingService');

// Inicializar servicios (se hace con el sequelize instance en cada request)
let procurementService = null;
let itemMappingService = null;

const initServices = (req, res, next) => {
    const sequelize = req.app.get('sequelize');
    if (!procurementService) {
        procurementService = new ProcurementService(sequelize);
    }
    if (!itemMappingService) {
        itemMappingService = new SupplierItemMappingService(sequelize);
    }
    req.procurementService = procurementService;
    req.itemMappingService = itemMappingService;
    next();
};

router.use(auth);
router.use(initServices);

// ============================================
// DASHBOARD Y ESTADÍSTICAS
// ============================================

/**
 * GET /api/procurement/dashboard
 * Obtener estadísticas del dashboard de compras
 */
router.get('/dashboard', async (req, res) => {
    try {
        const stats = await req.procurementService.getDashboardStats(req.user.company_id);
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('❌ [Procurement] Error en dashboard:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/dashboard/pending
 * Obtener items pendientes (aprobaciones, recepciones, pagos)
 */
router.get('/dashboard/pending', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const companyId = req.user.company_id;

        const [pending] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM procurement_requisitions WHERE company_id = :companyId AND status = 'pending_approval') as requisitions_pending,
                (SELECT COUNT(*) FROM procurement_orders WHERE company_id = :companyId AND status = 'pending_approval') as orders_pending,
                (SELECT COUNT(*) FROM procurement_orders WHERE company_id = :companyId AND status = 'approved' AND pending_delivery_qty > 0) as orders_pending_delivery,
                (SELECT COUNT(*) FROM procurement_receipts WHERE company_id = :companyId AND status = 'pending') as receipts_pending,
                (SELECT COUNT(*) FROM procurement_invoices WHERE company_id = :companyId AND status = 'pending_verification') as invoices_pending,
                (SELECT COUNT(*) FROM procurement_invoices WHERE company_id = :companyId AND status = 'verified' AND payment_status = 'pending') as invoices_to_pay
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: pending });
    } catch (error) {
        console.error('❌ [Procurement] Error en pendientes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// REQUISICIONES (SOLICITUDES DE COMPRA)
// ============================================

/**
 * POST /api/procurement/requisitions
 * Crear nueva requisición de compra
 */
router.post('/requisitions', async (req, res) => {
    try {
        const requisition = await req.procurementService.createRequisition({
            ...req.body,
            companyId: req.user.company_id,
            requesterId: req.user.user_id,
            requesterName: req.user.name,
            requesterEmail: req.user.email
        });
        res.status(201).json({ success: true, data: requisition });
    } catch (error) {
        console.error('❌ [Procurement] Error creando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/requisitions
 * Listar requisiciones
 */
router.get('/requisitions', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { status, page = 1, limit = 20, myOnly } = req.query;

        const where = { company_id: req.user.company_id };
        if (status) where.status = status;
        if (myOnly === 'true') where.requester_id = req.user.user_id;

        const { count, rows } = await sequelize.models.ProcurementRequisition.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando requisiciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/requisitions/:id
 * Obtener detalle de requisición
 */
router.get('/requisitions/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const requisition = await sequelize.models.ProcurementRequisition.findOne({
            where: { id: req.params.id, company_id: req.user.company_id },
            include: [{ model: sequelize.models.ProcurementRequisitionItem, as: 'items' }]
        });

        if (!requisition) {
            return res.status(404).json({ success: false, error: 'Requisición no encontrada' });
        }

        res.json({ success: true, data: requisition });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/procurement/requisitions/:id
 * Actualizar requisición (solo en estado draft)
 */
router.put('/requisitions/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const requisition = await sequelize.models.ProcurementRequisition.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!requisition) {
            return res.status(404).json({ success: false, error: 'Requisición no encontrada' });
        }

        if (requisition.status !== 'draft') {
            return res.status(400).json({ success: false, error: 'Solo se pueden editar requisiciones en borrador' });
        }

        await requisition.update(req.body);
        res.json({ success: true, data: requisition });
    } catch (error) {
        console.error('❌ [Procurement] Error actualizando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/requisitions/:id/submit
 * Enviar requisición para aprobación
 */
router.post('/requisitions/:id/submit', async (req, res) => {
    try {
        const result = await req.procurementService.submitRequisition(
            req.params.id,
            req.user.company_id
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error enviando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/requisitions/:id/approve
 * Aprobar requisición
 */
router.post('/requisitions/:id/approve', async (req, res) => {
    try {
        const result = await req.procurementService.approveRequisition(
            req.params.id,
            req.user.company_id,
            req.user.user_id,
            req.user.name,
            req.body.comments
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error aprobando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/requisitions/:id/reject
 * Rechazar requisición
 */
router.post('/requisitions/:id/reject', async (req, res) => {
    try {
        const result = await req.procurementService.rejectRequisition(
            req.params.id,
            req.user.company_id,
            req.user.user_id,
            req.user.name,
            req.body.reason
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error rechazando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/procurement/requisitions/:id
 * Cancelar requisición
 */
router.delete('/requisitions/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const requisition = await sequelize.models.ProcurementRequisition.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!requisition) {
            return res.status(404).json({ success: false, error: 'Requisición no encontrada' });
        }

        if (!['draft', 'rejected'].includes(requisition.status)) {
            return res.status(400).json({ success: false, error: 'No se puede eliminar esta requisición' });
        }

        await requisition.update({ status: 'cancelled' });
        res.json({ success: true, message: 'Requisición cancelada' });
    } catch (error) {
        console.error('❌ [Procurement] Error cancelando requisición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ÓRDENES DE COMPRA
// ============================================

/**
 * POST /api/procurement/orders
 * Crear orden de compra desde requisición aprobada
 */
router.post('/orders', async (req, res) => {
    try {
        const order = await req.procurementService.createOrderFromRequisition(
            req.body.requisitionId,
            req.body.supplierId,
            req.body.items,
            req.user.company_id,
            req.user.user_id
        );
        res.status(201).json({ success: true, data: order });
    } catch (error) {
        console.error('❌ [Procurement] Error creando orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/orders
 * Listar órdenes de compra
 */
router.get('/orders', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { status, supplierId, page = 1, limit = 20 } = req.query;

        const where = { company_id: req.user.company_id };
        if (status) where.status = status;
        if (supplierId) where.supplier_id = supplierId;

        const { count, rows } = await sequelize.models.ProcurementOrder.findAndCountAll({
            where,
            include: [{ model: sequelize.models.ProcurementSupplier, as: 'supplier', attributes: ['id', 'name', 'legal_name'] }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando órdenes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/orders/:id
 * Obtener detalle de orden de compra
 */
router.get('/orders/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const order = await sequelize.models.ProcurementOrder.findOne({
            where: { id: req.params.id, company_id: req.user.company_id },
            include: [
                { model: sequelize.models.ProcurementOrderItem, as: 'items' },
                { model: sequelize.models.ProcurementSupplier, as: 'supplier' },
                { model: sequelize.models.ProcurementReceipt, as: 'receipts' }
            ]
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Orden no encontrada' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/orders/:id/approve
 * Aprobar orden de compra
 */
router.post('/orders/:id/approve', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const order = await sequelize.models.ProcurementOrder.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Orden no encontrada' });
        }

        await order.approve(req.user.user_id, req.user.name, req.body.comments);
        res.json({ success: true, data: order });
    } catch (error) {
        console.error('❌ [Procurement] Error aprobando orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/orders/:id/send
 * Enviar orden al proveedor
 */
router.post('/orders/:id/send', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const order = await sequelize.models.ProcurementOrder.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Orden no encontrada' });
        }

        await order.sendToSupplier(req.user.user_id, req.body.method || 'email');
        res.json({ success: true, data: order, message: 'Orden enviada al proveedor' });
    } catch (error) {
        console.error('❌ [Procurement] Error enviando orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/orders/:id/cancel
 * Cancelar orden de compra
 */
router.post('/orders/:id/cancel', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const order = await sequelize.models.ProcurementOrder.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Orden no encontrada' });
        }

        await order.cancel(req.user.user_id, req.body.reason);
        res.json({ success: true, message: 'Orden cancelada' });
    } catch (error) {
        console.error('❌ [Procurement] Error cancelando orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// RECEPCIÓN DE MERCADERÍA
// ============================================

/**
 * POST /api/procurement/receipts
 * Crear recepción de mercadería
 */
router.post('/receipts', async (req, res) => {
    try {
        const receipt = await req.procurementService.createReceipt({
            ...req.body,
            companyId: req.user.company_id,
            receivedBy: req.user.user_id,
            receivedByName: req.user.name
        });
        res.status(201).json({ success: true, data: receipt });
    } catch (error) {
        console.error('❌ [Procurement] Error creando recepción:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/receipts
 * Listar recepciones
 */
router.get('/receipts', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { orderId, status, page = 1, limit = 20 } = req.query;

        const where = { company_id: req.user.company_id };
        if (orderId) where.order_id = orderId;
        if (status) where.status = status;

        const { count, rows } = await sequelize.models.ProcurementReceipt.findAndCountAll({
            where,
            include: [{ model: sequelize.models.ProcurementOrder, as: 'order', attributes: ['id', 'order_number'] }],
            order: [['receipt_date', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando recepciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/receipts/:id
 * Obtener detalle de recepción
 */
router.get('/receipts/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const receipt = await sequelize.models.ProcurementReceipt.findOne({
            where: { id: req.params.id, company_id: req.user.company_id },
            include: [
                { model: sequelize.models.ProcurementReceiptItem, as: 'items' },
                { model: sequelize.models.ProcurementOrder, as: 'order' }
            ]
        });

        if (!receipt) {
            return res.status(404).json({ success: false, error: 'Recepción no encontrada' });
        }

        res.json({ success: true, data: receipt });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo recepción:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/receipts/:id/confirm
 * Confirmar recepción
 */
router.post('/receipts/:id/confirm', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const receipt = await sequelize.models.ProcurementReceipt.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!receipt) {
            return res.status(404).json({ success: false, error: 'Recepción no encontrada' });
        }

        await receipt.confirm(req.user.user_id, req.body.isComplete);
        res.json({ success: true, data: receipt });
    } catch (error) {
        console.error('❌ [Procurement] Error confirmando recepción:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/receipts/:id/quality
 * Actualizar estado de calidad
 */
router.post('/receipts/:id/quality', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const receipt = await sequelize.models.ProcurementReceipt.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!receipt) {
            return res.status(404).json({ success: false, error: 'Recepción no encontrada' });
        }

        const { status, notes } = req.body;
        if (status === 'approved') {
            await receipt.approveQuality(req.user.user_id, notes);
        } else if (status === 'rejected') {
            await receipt.rejectQuality(req.user.user_id, notes);
        } else if (status === 'conditional') {
            await receipt.conditionalApproval(req.user.user_id, notes);
        }

        res.json({ success: true, data: receipt });
    } catch (error) {
        console.error('❌ [Procurement] Error actualizando calidad:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// REMITOS INTERNOS
// ============================================

/**
 * POST /api/procurement/internal-receipts
 * Crear remito interno (cuando no hay documento del proveedor)
 */
router.post('/internal-receipts', async (req, res) => {
    try {
        const internalReceipt = await req.procurementService.createInternalReceipt({
            ...req.body,
            companyId: req.user.company_id,
            createdBy: req.user.user_id
        });
        res.status(201).json({ success: true, data: internalReceipt });
    } catch (error) {
        console.error('❌ [Procurement] Error creando remito interno:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/internal-receipts
 * Listar remitos internos
 */
router.get('/internal-receipts', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { page = 1, limit = 20 } = req.query;

        const { count, rows } = await sequelize.models.ProcurementInternalReceipt.findAndCountAll({
            where: { company_id: req.user.company_id },
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando remitos internos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// FACTURAS DE COMPRA
// ============================================

/**
 * POST /api/procurement/invoices
 * Registrar factura de compra
 */
router.post('/invoices', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const invoice = await sequelize.models.ProcurementInvoice.create({
            ...req.body,
            company_id: req.user.company_id,
            registered_by: req.user.user_id
        });
        res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        console.error('❌ [Procurement] Error registrando factura:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/invoices
 * Listar facturas de compra
 */
router.get('/invoices', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { status, paymentStatus, supplierId, page = 1, limit = 20 } = req.query;

        const where = { company_id: req.user.company_id };
        if (status) where.status = status;
        if (paymentStatus) where.payment_status = paymentStatus;
        if (supplierId) where.supplier_id = supplierId;

        const { count, rows } = await sequelize.models.ProcurementInvoice.findAndCountAll({
            where,
            include: [{ model: sequelize.models.ProcurementSupplier, as: 'supplier', attributes: ['id', 'name', 'legal_name'] }],
            order: [['invoice_date', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando facturas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/invoices/:id
 * Obtener detalle de factura
 */
router.get('/invoices/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const invoice = await sequelize.models.ProcurementInvoice.findOne({
            where: { id: req.params.id, company_id: req.user.company_id },
            include: [
                { model: sequelize.models.ProcurementSupplier, as: 'supplier' },
                { model: sequelize.models.ProcurementOrder, as: 'order' },
                { model: sequelize.models.ProcurementReceipt, as: 'receipt' }
            ]
        });

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Factura no encontrada' });
        }

        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo factura:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/invoices/:id/three-way-match
 * Ejecutar verificación Three-Way Match: OC ↔ Recepción ↔ Factura
 */
router.get('/invoices/:id/three-way-match', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const companyId = req.user.company_id;
        const invoiceId = req.params.id;

        // Obtener factura con orden y recepción
        const invoice = await sequelize.models.ProcurementInvoice.findOne({
            where: { id: invoiceId, company_id: companyId },
            include: [
                { model: sequelize.models.ProcurementOrder, as: 'order' },
                { model: sequelize.models.ProcurementReceipt, as: 'receipt' }
            ]
        });

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Factura no encontrada' });
        }

        // Tolerancia del 2% por defecto (configurable)
        const tolerance = 0.02;

        // Resultado del Three-Way Match
        const match = {
            order_match: false,
            order_details: '',
            receipt_match: false,
            receipt_details: '',
            price_match: false,
            price_difference: '0%',
            tolerance: `${tolerance * 100}%`,
            overall_status: 'pending'
        };

        // 1. MATCH CON ORDEN DE COMPRA
        if (invoice.order_id && invoice.order) {
            const order = invoice.order;

            // Verificar proveedor
            if (order.supplier_id === invoice.supplier_id) {
                // Verificar monto (con tolerancia)
                const orderAmount = parseFloat(order.total_amount) || 0;
                const invoiceAmount = parseFloat(invoice.total_amount) || 0;
                const orderDiff = Math.abs(orderAmount - invoiceAmount) / orderAmount;

                if (orderDiff <= tolerance) {
                    match.order_match = true;
                    match.order_details = `OC ${order.order_number} - Monto: ${orderAmount.toFixed(2)} (Dif: ${(orderDiff * 100).toFixed(1)}%)`;
                } else {
                    match.order_details = `Diferencia de monto excede tolerancia: OC ${orderAmount.toFixed(2)} vs Fact ${invoiceAmount.toFixed(2)} (${(orderDiff * 100).toFixed(1)}%)`;
                }
            } else {
                match.order_details = 'Proveedor de la factura no coincide con la OC';
            }
        } else {
            match.order_details = 'Factura sin orden de compra asociada';
            match.order_match = true; // Si no hay OC, se considera OK
        }

        // 2. MATCH CON RECEPCIÓN
        if (invoice.order_id) {
            // Buscar recepciones de la orden
            const receipts = await sequelize.models.ProcurementReceipt.findAll({
                where: { order_id: invoice.order_id, status: { [sequelize.Sequelize.Op.ne]: 'cancelled' } }
            });

            if (receipts.length > 0) {
                // Verificar que la recepción está confirmada
                const confirmedReceipts = receipts.filter(r => ['confirmed', 'quality_approved'].includes(r.status));

                if (confirmedReceipts.length > 0) {
                    match.receipt_match = true;
                    match.receipt_details = `${confirmedReceipts.length} recepción(es) confirmada(s)`;

                    // Si hay items, verificar cantidades
                    if (invoice.order) {
                        const [receiptTotals] = await sequelize.query(`
                            SELECT SUM(ri.quantity_received) as total_received
                            FROM procurement_receipt_items ri
                            JOIN procurement_receipts r ON r.id = ri.receipt_id
                            WHERE r.order_id = :orderId AND r.status NOT IN ('cancelled')
                        `, {
                            replacements: { orderId: invoice.order_id },
                            type: sequelize.QueryTypes.SELECT
                        });

                        if (receiptTotals?.total_received) {
                            match.receipt_details += ` - Total recibido: ${receiptTotals.total_received} unidades`;
                        }
                    }
                } else {
                    match.receipt_details = 'Recepciones pendientes de confirmación';
                }
            } else {
                match.receipt_details = 'Sin recepciones registradas para esta orden';
            }
        } else {
            match.receipt_match = true;
            match.receipt_details = 'Factura directa (sin OC) - Recepción no aplicable';
        }

        // 3. MATCH DE PRECIOS (si hay orden)
        if (invoice.order_id && invoice.order) {
            const orderAmount = parseFloat(invoice.order.total_amount) || 0;
            const invoiceAmount = parseFloat(invoice.total_amount) || 0;

            if (orderAmount > 0) {
                const priceDiff = Math.abs(orderAmount - invoiceAmount) / orderAmount;
                match.price_difference = `${(priceDiff * 100).toFixed(2)}%`;
                match.price_match = priceDiff <= tolerance;
            } else {
                match.price_match = true;
                match.price_difference = 'N/A';
            }
        } else {
            match.price_match = true;
            match.price_difference = 'N/A (sin OC)';
        }

        // Status general
        match.overall_status = (match.order_match && match.receipt_match && match.price_match) ? 'passed' : 'failed';

        res.json({ success: true, data: match });
    } catch (error) {
        console.error('❌ [Procurement] Error en Three-Way Match:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/invoices/:id/verify
 * Verificar factura (three-way matching)
 */
router.post('/invoices/:id/verify', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const invoice = await sequelize.models.ProcurementInvoice.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Factura no encontrada' });
        }

        await invoice.verify(req.user.user_id, req.body.notes);
        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error('❌ [Procurement] Error verificando factura:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/invoices/:id/dispute
 * Marcar factura en disputa
 */
router.post('/invoices/:id/dispute', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const invoice = await sequelize.models.ProcurementInvoice.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Factura no encontrada' });
        }

        await invoice.update({
            status: 'disputed',
            dispute_reason: req.body.reason,
            disputed_by: req.user.user_id,
            disputed_at: new Date(),
            audit_trail: [
                ...(invoice.audit_trail || []),
                {
                    action: 'disputed',
                    user_id: req.user.user_id,
                    reason: req.body.reason,
                    timestamp: new Date().toISOString()
                }
            ]
        });

        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error('❌ [Procurement] Error marcando disputa:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/invoices/pending-payment
 * Facturas pendientes de pago
 */
router.get('/invoices/pending-payment', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        const invoices = await sequelize.models.ProcurementInvoice.findAll({
            where: {
                company_id: req.user.company_id,
                status: 'verified',
                payment_status: { [sequelize.Sequelize.Op.in]: ['pending', 'partial'] }
            },
            include: [{ model: sequelize.models.ProcurementSupplier, as: 'supplier', attributes: ['id', 'name', 'legal_name'] }],
            order: [['due_date', 'ASC']]
        });

        res.json({ success: true, data: invoices });
    } catch (error) {
        console.error('❌ [Procurement] Error listando facturas pendientes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PROVEEDORES
// ============================================

/**
 * POST /api/procurement/suppliers
 * Crear proveedor
 */
router.post('/suppliers', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplier = await sequelize.models.ProcurementSupplier.create({
            ...req.body,
            company_id: req.user.company_id
        });
        res.status(201).json({ success: true, data: supplier });
    } catch (error) {
        console.error('❌ [Procurement] Error creando proveedor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/suppliers
 * Listar proveedores
 */
router.get('/suppliers', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { status, search, page = 1, limit = 50 } = req.query;

        const where = { company_id: req.user.company_id };
        if (status) where.status = status;
        if (search) {
            where[sequelize.Sequelize.Op.or] = [
                { name: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
                { legal_name: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
                { tax_id: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows } = await sequelize.models.ProcurementSupplier.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error listando proveedores:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/suppliers/:id
 * Obtener detalle de proveedor
 */
router.get('/suppliers/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        res.json({ success: true, data: supplier });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo proveedor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/procurement/suppliers/:id
 * Actualizar proveedor
 */
router.put('/suppliers/:id', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: req.params.id, company_id: req.user.company_id }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        await supplier.update(req.body);
        res.json({ success: true, data: supplier });
    } catch (error) {
        console.error('❌ [Procurement] Error actualizando proveedor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/suppliers/:id/enable-portal
 * Habilitar acceso al portal de proveedores
 * Crea usuario de portal, genera contraseña temporal y envía email de bienvenida
 */
router.post('/suppliers/:id/enable-portal', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const bcrypt = require('bcrypt');
        const crypto = require('crypto');
        const supplierId = req.params.id;
        const companyId = req.user.company_id;

        // 1. Obtener proveedor
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: supplierId, company_id: companyId }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        if (!supplier.email) {
            return res.status(400).json({
                success: false,
                error: 'El proveedor debe tener un email configurado para habilitar el portal'
            });
        }

        // 2. Verificar si ya existe usuario de portal para este proveedor
        const existingUser = await sequelize.query(
            `SELECT id FROM supplier_portal_users WHERE supplier_id = :supplierId AND is_active = true`,
            { replacements: { supplierId }, type: sequelize.QueryTypes.SELECT }
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Este proveedor ya tiene un usuario de portal activo'
            });
        }

        // 3. Generar contraseña temporal
        const tempPassword = crypto.randomBytes(6).toString('hex'); // 12 caracteres
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // 4. Crear usuario de portal
        const [result] = await sequelize.query(`
            INSERT INTO supplier_portal_users
            (supplier_id, email, password_hash, role, first_name, last_name, is_active,
             email_verified, must_change_password, created_at, updated_at)
            VALUES
            (:supplierId, :email, :passwordHash, 'admin', :firstName, :lastName, true,
             false, true, NOW(), NOW())
            RETURNING id
        `, {
            replacements: {
                supplierId,
                email: supplier.email,
                passwordHash,
                firstName: supplier.contact_name?.split(' ')[0] || 'Usuario',
                lastName: supplier.contact_name?.split(' ').slice(1).join(' ') || 'Proveedor'
            },
            type: sequelize.QueryTypes.INSERT
        });

        // 5. Actualizar proveedor con portal_enabled
        await supplier.update({
            portal_enabled: true,
            portal_activated_at: new Date()
        });

        // 6. Obtener datos de la empresa para el email
        const company = await sequelize.query(
            `SELECT name, slug FROM companies WHERE company_id = :companyId`,
            { replacements: { companyId }, type: sequelize.QueryTypes.SELECT }
        );

        // 7. Enviar email de bienvenida (usando SupplierEmailService)
        try {
            const SupplierEmailService = require('../services/SupplierEmailService');
            const emailService = new SupplierEmailService(sequelize);

            await emailService.sendWelcomeEmail({
                supplier: {
                    id: supplierId,
                    name: supplier.name,
                    email: supplier.email,
                    contact_name: supplier.contact_name
                },
                company: company[0] || { name: 'APONNT' },
                credentials: {
                    email: supplier.email,
                    password: tempPassword,
                    portalUrl: 'https://www.aponnt.com/panel-proveedores.html'
                }
            });
        } catch (emailError) {
            console.error('⚠️ [Procurement] Error enviando email de bienvenida:', emailError.message);
            // No fallamos la operación por el email
        }

        // 8. Respuesta exitosa
        res.json({
            success: true,
            data: {
                supplier_id: supplierId,
                portal_user_email: supplier.email,
                portal_enabled: true,
                message: 'Portal habilitado correctamente. Se enviaron las credenciales al email del proveedor.'
            }
        });

    } catch (error) {
        console.error('❌ [Procurement] Error habilitando portal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/suppliers/:id/disable-portal
 * Deshabilitar acceso al portal de proveedores
 */
router.post('/suppliers/:id/disable-portal', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplierId = req.params.id;
        const companyId = req.user.company_id;

        // 1. Obtener proveedor
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: supplierId, company_id: companyId }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        // 2. Desactivar usuario de portal
        await sequelize.query(
            `UPDATE supplier_portal_users SET is_active = false, updated_at = NOW()
             WHERE supplier_id = :supplierId`,
            { replacements: { supplierId } }
        );

        // 3. Deshabilitar portal en proveedor
        await supplier.update({
            portal_enabled: false
        });

        res.json({
            success: true,
            data: {
                supplier_id: supplierId,
                portal_enabled: false,
                message: 'Acceso al portal deshabilitado'
            }
        });

    } catch (error) {
        console.error('❌ [Procurement] Error deshabilitando portal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/suppliers/:id/reset-portal-password
 * Resetear contraseña del portal de proveedor
 */
router.post('/suppliers/:id/reset-portal-password', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const bcrypt = require('bcrypt');
        const crypto = require('crypto');
        const supplierId = req.params.id;
        const companyId = req.user.company_id;

        // 1. Obtener proveedor
        const supplier = await sequelize.models.ProcurementSupplier.findOne({
            where: { id: supplierId, company_id: companyId }
        });

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        }

        // 2. Verificar que tiene usuario de portal
        const portalUser = await sequelize.query(
            `SELECT id, email FROM supplier_portal_users WHERE supplier_id = :supplierId AND is_active = true`,
            { replacements: { supplierId }, type: sequelize.QueryTypes.SELECT }
        );

        if (portalUser.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Este proveedor no tiene usuario de portal activo'
            });
        }

        // 3. Generar nueva contraseña temporal
        const tempPassword = crypto.randomBytes(6).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // 4. Actualizar contraseña
        await sequelize.query(
            `UPDATE supplier_portal_users
             SET password_hash = :passwordHash, must_change_password = true, updated_at = NOW()
             WHERE id = :userId`,
            { replacements: { passwordHash, userId: portalUser[0].id } }
        );

        // 5. Enviar email con nueva contraseña
        try {
            const SupplierEmailService = require('../services/SupplierEmailService');
            const emailService = new SupplierEmailService(sequelize);

            await emailService.sendPasswordResetEmail({
                supplier: {
                    id: supplierId,
                    name: supplier.name,
                    email: supplier.email,
                    contact_name: supplier.contact_name
                },
                credentials: {
                    email: portalUser[0].email,
                    password: tempPassword,
                    portalUrl: 'https://www.aponnt.com/panel-proveedores.html'
                }
            });
        } catch (emailError) {
            console.error('⚠️ [Procurement] Error enviando email de reset:', emailError.message);
        }

        res.json({
            success: true,
            data: {
                supplier_id: supplierId,
                message: 'Contraseña reseteada. Se enviaron las nuevas credenciales al email del proveedor.'
            }
        });

    } catch (error) {
        console.error('❌ [Procurement] Error reseteando contraseña:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/suppliers/:id/history
 * Historial de compras del proveedor
 */
router.get('/suppliers/:id/history', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const supplierId = req.params.id;
        const companyId = req.user.company_id;

        const [stats] = await sequelize.query(`
            SELECT
                COUNT(po.id) as total_orders,
                SUM(po.total_amount) as total_purchased,
                AVG(po.total_amount) as avg_order_value,
                MIN(po.order_date) as first_order,
                MAX(po.order_date) as last_order,
                COUNT(DISTINCT EXTRACT(YEAR FROM po.order_date)) as years_active
            FROM procurement_orders po
            WHERE po.company_id = :companyId
              AND po.supplier_id = :supplierId
              AND po.status NOT IN ('cancelled', 'draft')
        `, {
            replacements: { companyId, supplierId },
            type: sequelize.QueryTypes.SELECT
        });

        const recentOrders = await sequelize.models.ProcurementOrder.findAll({
            where: {
                company_id: companyId,
                supplier_id: supplierId,
                status: { [sequelize.Sequelize.Op.notIn]: ['cancelled', 'draft'] }
            },
            order: [['order_date', 'DESC']],
            limit: 10
        });

        res.json({
            success: true,
            data: {
                stats: stats || {},
                recentOrders
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo historial:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/suppliers/suggested
 * Proveedores sugeridos para una compra
 */
router.get('/suppliers/suggested', async (req, res) => {
    try {
        const { categoryId, productIds, minAmount } = req.query;
        const suggestions = await req.procurementService.getSuggestedSuppliers(
            req.user.company_id,
            categoryId,
            productIds ? productIds.split(',').map(Number) : [],
            parseFloat(minAmount) || 0
        );
        res.json({ success: true, data: suggestions });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo sugerencias:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// MAPEO DE ARTÍCULOS PROVEEDOR
// ============================================

/**
 * POST /api/procurement/item-mappings
 * Crear mapeo de artículo
 */
router.post('/item-mappings', async (req, res) => {
    try {
        const { mapping, created } = await req.itemMappingService.upsertMapping({
            ...req.body,
            companyId: req.user.company_id
        });
        res.status(created ? 201 : 200).json({ success: true, data: mapping, created });
    } catch (error) {
        console.error('❌ [Procurement] Error creando mapeo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/item-mappings
 * Listar mapeos de un proveedor
 */
router.get('/item-mappings', async (req, res) => {
    try {
        const { supplierId, search, page = 1, limit = 50 } = req.query;

        if (!supplierId) {
            return res.status(400).json({ success: false, error: 'supplierId requerido' });
        }

        const result = await req.itemMappingService.listBySupplier(
            req.user.company_id,
            parseInt(supplierId),
            { page: parseInt(page), limit: parseInt(limit), search }
        );
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('❌ [Procurement] Error listando mapeos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/item-mappings/resolve
 * Resolver código de proveedor a producto interno
 */
router.post('/item-mappings/resolve', async (req, res) => {
    try {
        const { supplierId, supplierCode, supplierDescription } = req.body;

        const result = await req.itemMappingService.resolveSupplierCode(
            req.user.company_id,
            supplierId,
            supplierCode,
            supplierDescription
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error resolviendo código:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/item-mappings/bulk-import
 * Importar mapeos masivamente
 */
router.post('/item-mappings/bulk-import', async (req, res) => {
    try {
        const { supplierId, items } = req.body;

        const result = await req.itemMappingService.bulkImport(
            req.user.company_id,
            supplierId,
            items
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [Procurement] Error en importación:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/item-mappings/stats
 * Estadísticas de mapeos
 */
router.get('/item-mappings/stats', async (req, res) => {
    try {
        const stats = await req.itemMappingService.getStats(req.user.company_id);
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/item-mappings/unmapped/:supplierId
 * Artículos comprados sin mapear
 */
router.get('/item-mappings/unmapped/:supplierId', async (req, res) => {
    try {
        const items = await req.itemMappingService.getUnmappedItems(
            req.user.company_id,
            parseInt(req.params.supplierId)
        );
        res.json({ success: true, data: items });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo sin mapear:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/procurement/item-mappings/:id
 * Desactivar mapeo
 */
router.delete('/item-mappings/:id', async (req, res) => {
    try {
        const result = await req.itemMappingService.deactivateMapping(parseInt(req.params.id));
        res.json({ success: result, message: result ? 'Mapeo desactivado' : 'No se pudo desactivar' });
    } catch (error) {
        console.error('❌ [Procurement] Error desactivando mapeo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CATEGORÍAS
// ============================================

/**
 * GET /api/procurement/categories
 * Listar categorías de compra
 */
router.get('/categories', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const categories = await sequelize.models.ProcurementCategory.findAll({
            where: { company_id: req.user.company_id, is_active: true },
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('❌ [Procurement] Error listando categorías:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/categories
 * Crear categoría
 */
router.post('/categories', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const category = await sequelize.models.ProcurementCategory.create({
            ...req.body,
            company_id: req.user.company_id
        });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('❌ [Procurement] Error creando categoría:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SECTORES
// ============================================

/**
 * GET /api/procurement/sectors
 * Listar sectores organizacionales
 */
router.get('/sectors', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const sectors = await sequelize.models.ProcurementSector.findAll({
            where: { company_id: req.user.company_id, is_active: true },
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: sectors });
    } catch (error) {
        console.error('❌ [Procurement] Error listando sectores:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/sectors
 * Crear sector
 */
router.post('/sectors', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const sector = await sequelize.models.ProcurementSector.create({
            ...req.body,
            company_id: req.user.company_id
        });
        res.status(201).json({ success: true, data: sector });
    } catch (error) {
        console.error('❌ [Procurement] Error creando sector:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CONFIGURACIÓN DE APROBACIONES
// ============================================

/**
 * GET /api/procurement/approval-config
 * Obtener configuración de aprobaciones
 */
router.get('/approval-config', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const configs = await sequelize.models.ProcurementApprovalConfig.findAll({
            where: { company_id: req.user.company_id, is_active: true },
            order: [['document_type', 'ASC'], ['approval_level', 'ASC']]
        });
        res.json({ success: true, data: configs });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo config aprobaciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/approval-config
 * Guardar configuración de aprobación
 */
router.post('/approval-config', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const [config, created] = await sequelize.models.ProcurementApprovalConfig.findOrCreate({
            where: {
                company_id: req.user.company_id,
                document_type: req.body.document_type,
                approval_level: req.body.approval_level
            },
            defaults: { ...req.body, company_id: req.user.company_id }
        });

        if (!created) {
            await config.update(req.body);
        }

        res.json({ success: true, data: config, created });
    } catch (error) {
        console.error('❌ [Procurement] Error guardando config aprobaciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CONFIGURACIÓN CONTABLE
// ============================================

/**
 * GET /api/procurement/accounting-config
 * Obtener configuración contable
 */
router.get('/accounting-config', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const configs = await sequelize.models.ProcurementAccountingConfig.findAll({
            where: { company_id: req.user.company_id, is_active: true },
            order: [['purchase_type', 'ASC']]
        });
        res.json({ success: true, data: configs });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo config contable:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/procurement/accounting-config
 * Guardar configuración contable
 */
router.post('/accounting-config', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const [config, created] = await sequelize.models.ProcurementAccountingConfig.findOrCreate({
            where: {
                company_id: req.user.company_id,
                purchase_type: req.body.purchase_type,
                category_id: req.body.category_id || null
            },
            defaults: { ...req.body, company_id: req.user.company_id }
        });

        if (!created) {
            await config.update(req.body);
        }

        res.json({ success: true, data: config, created });
    } catch (error) {
        console.error('❌ [Procurement] Error guardando config contable:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// INTEGRACIÓN CON FINANCE Y WAREHOUSE
// ============================================

/**
 * GET /api/procurement/finance/cost-centers
 * Obtener centros de costo disponibles
 */
router.get('/finance/cost-centers', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        // Verificar si existe el modelo Finance
        if (!sequelize.models.FinanceCostCenter) {
            return res.json({ success: true, data: [], message: 'Módulo Finance no disponible' });
        }

        const costCenters = await sequelize.models.FinanceCostCenter.findAll({
            where: { company_id: req.user.company_id, is_active: true, allows_posting: true },
            order: [['code', 'ASC']]
        });
        res.json({ success: true, data: costCenters });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo centros de costo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/finance/accounts
 * Obtener cuentas contables disponibles
 */
router.get('/finance/accounts', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        if (!sequelize.models.FinanceChartOfAccounts) {
            return res.json({ success: true, data: [], message: 'Módulo Finance no disponible' });
        }

        const accounts = await sequelize.models.FinanceChartOfAccounts.findAll({
            where: {
                company_id: req.user.company_id,
                is_active: true,
                blocked_for_posting: false,
                is_header: false
            },
            order: [['account_code', 'ASC']]
        });
        res.json({ success: true, data: accounts });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo cuentas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/warehouse/list
 * Obtener depósitos disponibles
 */
router.get('/warehouse/list', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        if (!sequelize.models.WmsWarehouse) {
            return res.json({ success: true, data: [], message: 'Módulo WMS no disponible' });
        }

        const warehouses = await sequelize.models.WmsWarehouse.findAll({
            where: { company_id: req.user.company_id, is_active: true },
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: warehouses });
    } catch (error) {
        console.error('❌ [Procurement] Error obteniendo depósitos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/warehouse/products
 * Buscar productos en el catálogo WMS
 */
router.get('/warehouse/products', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { search, categoryId, page = 1, limit = 50 } = req.query;

        if (!sequelize.models.WmsProduct) {
            return res.json({ success: true, data: [], message: 'Módulo WMS no disponible' });
        }

        const where = { company_id: req.user.company_id, is_active: true };
        if (categoryId) where.category_id = categoryId;
        if (search) {
            where[sequelize.Sequelize.Op.or] = [
                { name: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
                { sku: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
                { barcode: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows } = await sequelize.models.WmsProduct.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('❌ [Procurement] Error buscando productos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// REPORTES
// ============================================

/**
 * GET /api/procurement/reports/by-supplier
 * Reporte de compras por proveedor
 */
router.get('/reports/by-supplier', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { startDate, endDate } = req.query;

        const [report] = await sequelize.query(`
            SELECT
                ps.id as supplier_id,
                ps.name as trade_name,
                ps.legal_name,
                COUNT(po.id) as total_orders,
                SUM(po.total_amount) as total_amount,
                AVG(po.total_amount) as avg_order_value,
                ps.rating_score as overall_score
            FROM wms_suppliers ps
            LEFT JOIN procurement_orders po ON po.supplier_id = ps.id
                AND po.company_id = :companyId
                AND po.status NOT IN ('cancelled', 'draft')
                ${startDate ? "AND po.order_date >= :startDate" : ""}
                ${endDate ? "AND po.order_date <= :endDate" : ""}
            WHERE ps.company_id = :companyId
            GROUP BY ps.id
            ORDER BY total_amount DESC NULLS LAST
        `, {
            replacements: { companyId: req.user.company_id, startDate, endDate },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('❌ [Procurement] Error en reporte:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/reports/by-category
 * Reporte de compras por categoría
 */
router.get('/reports/by-category', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');
        const { startDate, endDate } = req.query;

        const [report] = await sequelize.query(`
            SELECT
                pc.id as category_id,
                pc.name as category_name,
                COUNT(DISTINCT po.id) as total_orders,
                SUM(poi.total_price) as total_amount,
                COUNT(DISTINCT po.supplier_id) as suppliers_count
            FROM procurement_categories pc
            LEFT JOIN procurement_order_items poi ON poi.category_id = pc.id
            LEFT JOIN procurement_orders po ON poi.order_id = po.id
                AND po.company_id = :companyId
                AND po.status NOT IN ('cancelled', 'draft')
                ${startDate ? "AND po.order_date >= :startDate" : ""}
                ${endDate ? "AND po.order_date <= :endDate" : ""}
            WHERE pc.company_id = :companyId
            GROUP BY pc.id
            ORDER BY total_amount DESC NULLS LAST
        `, {
            replacements: { companyId: req.user.company_id, startDate, endDate },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('❌ [Procurement] Error en reporte:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/procurement/reports/pending-deliveries
 * Reporte de entregas pendientes
 */
router.get('/reports/pending-deliveries', async (req, res) => {
    try {
        const sequelize = req.app.get('sequelize');

        const orders = await sequelize.models.ProcurementOrder.findAll({
            where: {
                company_id: req.user.company_id,
                status: { [sequelize.Sequelize.Op.in]: ['approved', 'sent', 'acknowledged'] },
                pending_delivery_qty: { [sequelize.Sequelize.Op.gt]: 0 }
            },
            include: [
                { model: sequelize.models.ProcurementSupplier, as: 'supplier', attributes: ['id', 'name'] },
                { model: sequelize.models.ProcurementOrderItem, as: 'items' }
            ],
            order: [['expected_delivery_date', 'ASC']]
        });

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('❌ [Procurement] Error en reporte:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
