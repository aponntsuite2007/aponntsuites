/**
 * INVOICE ROUTES - API REST
 *
 * Endpoints para gestión de facturación mensual automática.
 * Expone operaciones del InvoicingService.
 *
 * BASE URL: /api/invoices/*
 *
 * AUTH: JWT required
 */

const express = require('express');
const router = express.Router();
const InvoicingService = require('../services/InvoicingService');
const { authenticateJWT, requireRole } = require('../middleware/auth');

/**
 * POST /api/invoices
 * Generar factura manualmente
 *
 * Body: {
 *   company_id, billing_period_month, billing_period_year,
 *   amount_usd, currency, notes, trace_id
 * }
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const invoiceData = req.body;

    const invoice = await InvoicingService.generate(invoiceData);

    return res.status(201).json({
      success: true,
      invoice
    });

  } catch (error) {
    console.error('❌ [INVOICE API] Error en POST /:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/invoices/generate-monthly
 * Generar facturas mensuales para TODOS los contratos activos (cron job)
 *
 * AUTH: Solo admin
 */
router.post('/generate-monthly', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const result = await InvoicingService.generateMonthlyInvoices();

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ [INVOICE API] Error en POST /generate-monthly:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/invoices/company/:company_id
 * Listar facturas de una empresa
 *
 * Query: ?limit=50
 */
router.get('/company/:company_id', authenticateJWT, async (req, res) => {
  try {
    const { company_id } = req.params;
    const { limit } = req.query;

    const invoices = await InvoicingService.findByCompany(company_id, {
      limit: parseInt(limit) || 50
    });

    return res.status(200).json({
      success: true,
      invoices
    });

  } catch (error) {
    console.error('❌ [INVOICE API] Error en GET /company/:company_id:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/invoices/stats/overview
 * Estadísticas de facturación
 *
 * Query: ?company_id=X&status=Y&billing_period_year=YYYY
 */
router.get('/stats/overview', authenticateJWT, async (req, res) => {
  try {
    const filters = {
      company_id: req.query.company_id,
      status: req.query.status,
      billing_period_year: req.query.billing_period_year
    };

    const stats = await InvoicingService.getStats(filters);

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ [INVOICE API] Error en GET /stats/overview:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/invoices/:id
 * Obtener factura por ID (MUST be after all static GET routes)
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await InvoicingService.findById(id);

    return res.status(200).json({
      success: true,
      invoice
    });

  } catch (error) {
    console.error('❌ [INVOICE API] Error en GET /:id:', error);
    return res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/invoices/:id/approve
 * Aprobar factura (si requiere_supervision_factura)
 *
 * Body: { approved_by_user_id: "xxx" }
 */
router.put('/:id/approve', authenticateJWT, requireRole(['admin', 'finance']), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by_user_id } = req.body;

    const invoice = await InvoicingService.approve(id, approved_by_user_id);

    return res.status(200).json({
      success: true,
      invoice
    });

  } catch (error) {
    console.error('❌ [INVOICE API] Error en PUT /:id/approve:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/invoices/:id/send
 * Enviar factura al cliente
 */
router.put('/:id/send', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await InvoicingService.send(id);

    return res.status(200).json({
      success: true,
      invoice
    });

  } catch (error) {
    console.error('❌ [INVOICE API] Error en PUT /:id/send:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/invoices/:id/mark-paid
 * Registrar pago de factura
 *
 * Body: { paid_at, payment_method, payment_proof_url, amount }
 */
router.put('/:id/mark-paid', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = req.body;

    const invoice = await InvoicingService.markAsPaid(id, paymentData);

    return res.status(200).json({
      success: true,
      invoice,
      message: 'Pago registrado. Liquidando comisiones...'
    });

  } catch (error) {
    console.error('❌ [INVOICE API] Error en PUT /:id/mark-paid:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/invoices/:id/cancel
 * Cancelar factura
 *
 * Body: { reason: "..." }
 */
router.put('/:id/cancel', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await InvoicingService.cancel(id, reason);

    return res.status(200).json({
      success: true,
      invoice
    });

  } catch (error) {
    console.error('❌ [INVOICE API] Error en PUT /:id/cancel:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/invoices/check-overdue
 * Marcar facturas vencidas como overdue (cron job)
 *
 * AUTH: Solo admin
 */
router.post('/check-overdue', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const result = await InvoicingService.checkOverdueInvoices();

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ [INVOICE API] Error en POST /check-overdue:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/invoices/:id/pdf
 * Generar PDF de factura
 */
router.post('/:id/pdf', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await InvoicingService.generatePDF(id);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [INVOICE API] Error en POST /:id/pdf:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
