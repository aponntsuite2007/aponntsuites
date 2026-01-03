/**
 * supplierPortalRoutes.js
 * API endpoints para el Portal de Proveedores P2P
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SupplierPortalService = require('../services/SupplierPortalService');

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE DE AUTENTICACIÓN DEL PORTAL
// ═══════════════════════════════════════════════════════════════════════════

const authenticateSupplier = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token de autenticación requerido' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supplier_portal_secret_key');

        if (decoded.type !== 'supplier_portal') {
            return res.status(403).json({ error: 'Token no válido para portal de proveedores' });
        }

        req.supplierUser = decoded;
        req.supplierId = decoded.supplierId;
        req.portalUserId = decoded.userId;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// Login al portal
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const result = await SupplierPortalService.loginPortal(email, password);
        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Login error:', error.message);
        res.status(401).json({ error: error.message });
    }
});

// Registrar usuario del portal (requiere autenticación de admin del proveedor)
router.post('/auth/register', authenticateSupplier, async (req, res) => {
    try {
        if (req.supplierUser.role !== 'admin') {
            return res.status(403).json({ error: 'Solo administradores pueden registrar usuarios' });
        }

        const result = await SupplierPortalService.registerPortalUser(req.supplierId, req.body);
        res.status(201).json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Register error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Verificar token
router.get('/auth/verify', authenticateSupplier, (req, res) => {
    res.json({
        valid: true,
        user: req.supplierUser
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', authenticateSupplier, async (req, res) => {
    try {
        const dashboard = await SupplierPortalService.getSupplierDashboard(req.supplierId);
        res.json(dashboard);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Dashboard error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// RFQ - SOLICITUDES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// Listar RFQs del proveedor
router.get('/rfqs', authenticateSupplier, async (req, res) => {
    try {
        const { status, page, limit } = req.query;
        const rfqs = await SupplierPortalService.getSupplierRfqs(req.supplierId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(rfqs);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get RFQs error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Detalle de RFQ
router.get('/rfqs/:id', authenticateSupplier, async (req, res) => {
    try {
        const rfq = await SupplierPortalService.getRfqDetails(req.params.id, req.supplierId);
        if (!rfq.rfq) {
            return res.status(404).json({ error: 'RFQ no encontrada' });
        }
        res.json(rfq);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get RFQ detail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Enviar cotización
router.post('/rfqs/:id/quote', authenticateSupplier, async (req, res) => {
    try {
        const quotation = await SupplierPortalService.submitQuotation(
            req.supplierId,
            req.params.id,
            req.body,
            req.portalUserId
        );
        res.status(201).json(quotation);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Submit quotation error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Declinar RFQ
router.post('/rfqs/:id/decline', authenticateSupplier, async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await SupplierPortalService.declineRfq(req.supplierId, req.params.id, reason);
        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Decline RFQ error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ÓRDENES DE COMPRA
// ═══════════════════════════════════════════════════════════════════════════

// Listar órdenes
router.get('/orders', authenticateSupplier, async (req, res) => {
    try {
        const { status, dateFrom, dateTo, page, limit } = req.query;
        const orders = await SupplierPortalService.getSupplierOrders(req.supplierId, {
            status,
            dateFrom,
            dateTo,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(orders);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get orders error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Detalle de orden
router.get('/orders/:id', authenticateSupplier, async (req, res) => {
    try {
        const order = await SupplierPortalService.getOrderDetails(req.params.id, req.supplierId);
        if (!order.order) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }
        res.json(order);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get order detail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Confirmar orden
router.post('/orders/:id/confirm', authenticateSupplier, async (req, res) => {
    try {
        const order = await SupplierPortalService.confirmOrder(req.params.id, req.supplierId, req.body);
        res.json(order);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Confirm order error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// FACTURAS
// ═══════════════════════════════════════════════════════════════════════════

// Listar facturas
router.get('/invoices', authenticateSupplier, async (req, res) => {
    try {
        const { status, paymentStatus, page, limit } = req.query;
        const invoices = await SupplierPortalService.getSupplierInvoices(req.supplierId, {
            status,
            paymentStatus,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(invoices);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get invoices error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Detalle de factura
router.get('/invoices/:id', authenticateSupplier, async (req, res) => {
    try {
        const invoice = await SupplierPortalService.getInvoiceDetails(req.params.id, req.supplierId);
        if (!invoice.invoice) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }
        res.json(invoice);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get invoice detail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// RECLAMOS
// ═══════════════════════════════════════════════════════════════════════════

// Listar reclamos
router.get('/claims', authenticateSupplier, async (req, res) => {
    try {
        const { status, page, limit } = req.query;
        const claims = await SupplierPortalService.getSupplierClaims(req.supplierId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(claims);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get claims error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Detalle de reclamo
router.get('/claims/:id', authenticateSupplier, async (req, res) => {
    try {
        const claim = await SupplierPortalService.getClaimDetails(req.params.id, req.supplierId);
        if (!claim.claim) {
            return res.status(404).json({ error: 'Reclamo no encontrado' });
        }
        res.json(claim);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get claim detail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Acusar recibo del reclamo
router.post('/claims/:id/acknowledge', authenticateSupplier, async (req, res) => {
    try {
        const claim = await SupplierPortalService.acknowledgeClaimSupplier(
            req.params.id,
            req.supplierId,
            req.portalUserId
        );
        res.json(claim);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Acknowledge claim error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Responder al reclamo
router.post('/claims/:id/respond', authenticateSupplier, async (req, res) => {
    try {
        const result = await SupplierPortalService.respondToClaim(
            req.params.id,
            req.supplierId,
            req.body,
            req.portalUserId
        );
        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Respond claim error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Enviar nota de crédito
router.post('/claims/:id/credit-note', authenticateSupplier, async (req, res) => {
    try {
        const creditNote = await SupplierPortalService.submitCreditNote(
            req.params.id,
            req.supplierId,
            req.body
        );
        res.status(201).json(creditNote);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Submit credit note error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// PAGOS
// ═══════════════════════════════════════════════════════════════════════════

// Listar pagos
router.get('/payments', authenticateSupplier, async (req, res) => {
    try {
        const { status, page, limit } = req.query;
        const payments = await SupplierPortalService.getSupplierPayments(req.supplierId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(payments);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get payments error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Detalle de pago
router.get('/payments/:id', authenticateSupplier, async (req, res) => {
    try {
        const payment = await SupplierPortalService.getPaymentDetails(req.params.id, req.supplierId);
        if (!payment.payment) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }
        res.json(payment);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get payment detail error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// OFERTAS Y PROMOCIONES
// ═══════════════════════════════════════════════════════════════════════════

// Listar ofertas
router.get('/offers', authenticateSupplier, async (req, res) => {
    try {
        const { status, page, limit } = req.query;
        const offers = await SupplierPortalService.getSupplierOffers(req.supplierId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(offers);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get offers error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Crear oferta
router.post('/offers', authenticateSupplier, async (req, res) => {
    try {
        const offer = await SupplierPortalService.createOffer(req.supplierId, req.body, req.portalUserId);
        res.status(201).json(offer);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Create offer error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Actualizar oferta
router.put('/offers/:id', authenticateSupplier, async (req, res) => {
    try {
        const offer = await SupplierPortalService.updateOffer(req.params.id, req.supplierId, req.body);
        if (!offer) {
            return res.status(404).json({ error: 'Oferta no encontrada o no puede ser modificada' });
        }
        res.json(offer);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Update offer error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Cancelar oferta
router.delete('/offers/:id', authenticateSupplier, async (req, res) => {
    try {
        const offer = await SupplierPortalService.cancelOffer(req.params.id, req.supplierId);
        if (!offer) {
            return res.status(404).json({ error: 'Oferta no encontrada' });
        }
        res.json({ success: true, offer });

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Cancel offer error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/statistics', authenticateSupplier, async (req, res) => {
    try {
        const { period = 'year' } = req.query;
        const statistics = await SupplierPortalService.getSupplierStatistics(req.supplierId, period);
        res.json(statistics);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get statistics error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════════════════

// Listar notificaciones
router.get('/notifications', authenticateSupplier, async (req, res) => {
    try {
        const { unreadOnly, page, limit } = req.query;
        const notifications = await SupplierPortalService.getSupplierNotifications(req.supplierId, {
            unreadOnly: unreadOnly === 'true',
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json(notifications);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Get notifications error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Marcar notificación como leída
router.post('/notifications/:id/read', authenticateSupplier, async (req, res) => {
    try {
        const result = await SupplierPortalService.markNotificationRead(req.params.id, req.supplierId);
        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Mark notification read error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Marcar todas las notificaciones como leídas
router.post('/notifications/read-all', authenticateSupplier, async (req, res) => {
    try {
        const result = await SupplierPortalService.markAllNotificationsRead(req.supplierId);
        res.json(result);

    } catch (error) {
        console.error('❌ [SUPPLIER PORTAL] Mark all notifications read error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
