/**
 * BUDGET ROUTES - API REST
 *
 * Endpoints para gestión de presupuestos (quotations) del circuito comercial.
 * Expone operaciones del BudgetService.
 *
 * BASE URL: /api/budgets/*
 *
 * AUTH: JWT required (aponnt_staff)
 */

const express = require('express');
const router = express.Router();
const BudgetService = require('../services/BudgetService');
const { authenticateJWT, requireRole } = require('../middleware/auth');

/**
 * POST /api/budgets
 * Crear nuevo presupuesto
 *
 * Body: {
 *   trace_id, company_id, vendor_id, selected_modules,
 *   contracted_employees, total_monthly, discount_percentage,
 *   discount_reason, payment_terms, currency, notes
 * }
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const budgetData = req.body;

    const budget = await BudgetService.create(budgetData);

    return res.status(201).json({
      success: true,
      budget
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en POST /:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/budgets/:id
 * Obtener presupuesto por ID
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await BudgetService.findById(id);

    return res.status(200).json({
      success: true,
      budget
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en GET /:id:', error);
    return res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/budgets/trace/:trace_id
 * Obtener presupuesto por trace_id
 */
router.get('/trace/:trace_id', async (req, res) => {
  try {
    const { trace_id } = req.params;

    const budget = await BudgetService.findByTraceId(trace_id);

    return res.status(200).json({
      success: true,
      budget
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en GET /trace/:trace_id:', error);
    return res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/budgets/company/:company_id
 * Listar presupuestos de una empresa
 *
 * Query: ?limit=50
 */
router.get('/company/:company_id', authenticateJWT, async (req, res) => {
  try {
    const { company_id } = req.params;
    const { limit } = req.query;

    const budgets = await BudgetService.findByCompany(company_id, {
      limit: parseInt(limit) || 50
    });

    return res.status(200).json({
      success: true,
      budgets
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en GET /company/:company_id:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/budgets
 * Listar presupuestos con filtros
 *
 * Query: ?status=PENDING&vendor_id=xxx&from_date=YYYY-MM-DD&limit=100
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      vendor_id: req.query.vendor_id,
      from_date: req.query.from_date,
      limit: parseInt(req.query.limit) || 100
    };

    const budgets = await BudgetService.listAll(filters);

    return res.status(200).json({
      success: true,
      budgets
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en GET /:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/budgets/:id/send
 * Marcar presupuesto como enviado
 */
router.put('/:id/send', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await BudgetService.markAsSent(id);

    return res.status(200).json({
      success: true,
      budget
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en PUT /:id/send:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/budgets/:id/view
 * Marcar presupuesto como visto
 */
router.put('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await BudgetService.markAsViewed(id);

    return res.status(200).json({
      success: true,
      budget
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en PUT /:id/view:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/budgets/:id/accept
 * Cliente acepta presupuesto
 *
 * Body: { notes: "..." }
 */
router.put('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const acceptanceData = req.body;

    const budget = await BudgetService.accept(id, acceptanceData);

    return res.status(200).json({
      success: true,
      budget,
      message: 'Presupuesto aceptado. Generando contrato...'
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en PUT /:id/accept:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/budgets/:id/reject
 * Cliente rechaza presupuesto
 *
 * Body: { reason: "..." }
 */
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'reason es requerido'
      });
    }

    const budget = await BudgetService.reject(id, { reason });

    return res.status(200).json({
      success: true,
      budget
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en PUT /:id/reject:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/budgets/:id/request-modification
 * Cliente solicita modificaciones
 *
 * Body: {
 *   requested_by: "email",
 *   changes: { modules: [...], employees: X },
 *   reason: "..."
 * }
 */
router.put('/:id/request-modification', async (req, res) => {
  try {
    const { id } = req.params;
    const modificationRequest = req.body;

    if (!modificationRequest.changes) {
      return res.status(400).json({
        success: false,
        error: 'changes es requerido'
      });
    }

    const budget = await BudgetService.requestModification(id, modificationRequest);

    return res.status(200).json({
      success: true,
      budget
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en PUT /:id/request-modification:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/budgets/stats/overview
 * Estadísticas de presupuestos
 *
 * Query: ?vendor_id=xxx (opcional)
 */
router.get('/stats/overview', authenticateJWT, async (req, res) => {
  try {
    const { vendor_id } = req.query;

    const stats = await BudgetService.getStats(vendor_id || null);

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en GET /stats/overview:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/budgets/:id/pdf
 * Generar PDF del presupuesto
 */
router.post('/:id/pdf', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await BudgetService.generatePDF(id);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [BUDGET API] Error en POST /:id/pdf:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/budgets/expire-old
 * Expirar presupuestos vencidos (cron job endpoint)
 *
 * AUTH: Solo admin
 */
router.post('/expire-old', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const result = await BudgetService.expireOldBudgets();

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ [BUDGET API] Error en POST /expire-old:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
