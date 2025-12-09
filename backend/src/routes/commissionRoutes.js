/**
 * COMMISSION ROUTES - API REST
 *
 * Endpoints para gestión de liquidaciones y pagos de comisiones piramidales.
 * Expone operaciones del CommissionService.
 *
 * BASE URL: /api/commissions/*
 *
 * AUTH: JWT required
 */

const express = require('express');
const router = express.Router();
const CommissionService = require('../services/CommissionService');
const { authenticateJWT, requireRole } = require('../middleware/auth');

/**
 * ============================================
 * LIQUIDATIONS
 * ============================================
 */

/**
 * POST /api/commissions/liquidations
 * Crear liquidación de comisiones desde factura pagada
 *
 * Body: {
 *   trace_id, invoice_id, vendor_id,
 *   liquidation_type: "ONBOARDING_IMMEDIATE" | "MONTHLY",
 *   period_start, period_end
 * }
 */
router.post('/liquidations', authenticateJWT, requireRole(['admin', 'finance']), async (req, res) => {
  try {
    const liquidationData = req.body;

    const liquidation = await CommissionService.liquidate(liquidationData);

    return res.status(201).json({
      success: true,
      liquidation
    });

  } catch (error) {
    console.error('❌ [COMMISSION API] Error en POST /liquidations:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/commissions/liquidations/:id/approve
 * Aprobar liquidación
 *
 * Body: { approved_by_user_id: "xxx" }
 */
router.put('/liquidations/:id/approve', authenticateJWT, requireRole(['admin', 'finance']), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by_user_id } = req.body;

    const liquidation = await CommissionService.approve(id, approved_by_user_id);

    return res.status(200).json({
      success: true,
      liquidation
    });

  } catch (error) {
    console.error('❌ [COMMISSION API] Error en PUT /liquidations/:id/approve:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/commissions/liquidations/:id/reject
 * Rechazar liquidación
 *
 * Body: { rejection_reason: "...", rejected_by_user_id: "xxx" }
 */
router.put('/liquidations/:id/reject', authenticateJWT, requireRole(['admin', 'finance']), async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason, rejected_by_user_id } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({
        success: false,
        error: 'rejection_reason es requerido'
      });
    }

    const liquidation = await CommissionService.reject(id, rejection_reason, rejected_by_user_id);

    return res.status(200).json({
      success: true,
      liquidation
    });

  } catch (error) {
    console.error('❌ [COMMISSION API] Error en PUT /liquidations/:id/reject:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/commissions/liquidations/:id/create-payments
 * Crear pagos individuales para una liquidación aprobada
 */
router.post('/liquidations/:id/create-payments', authenticateJWT, requireRole(['admin', 'finance']), async (req, res) => {
  try {
    const { id } = req.params;

    const payments = await CommissionService.createPayments(id);

    return res.status(200).json({
      success: true,
      payments,
      count: payments.length
    });

  } catch (error) {
    console.error('❌ [COMMISSION API] Error en POST /liquidations/:id/create-payments:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commissions/liquidations
 * Listar todas las liquidaciones con filtros
 *
 * Query: ?status=X&liquidation_type=Y&limit=100
 */
router.get('/liquidations', authenticateJWT, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      liquidation_type: req.query.liquidation_type,
      limit: parseInt(req.query.limit) || 100
    };

    const liquidations = await CommissionService.listLiquidations(filters);

    return res.status(200).json({
      success: true,
      liquidations,
      count: liquidations.length
    });

  } catch (error) {
    console.error('❌ [COMMISSION API] Error en GET /liquidations:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commissions/liquidations/stats
 * Estadísticas de liquidaciones
 *
 * Query: ?status=X&liquidation_type=Y
 */
router.get('/liquidations/stats', authenticateJWT, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      liquidation_type: req.query.liquidation_type
    };

    const stats = await CommissionService.getStats(filters);

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ [COMMISSION API] Error en GET /liquidations/stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * PAYMENTS
 * ============================================
 */

/**
 * PUT /api/commissions/payments/:id/execute
 * Ejecutar pago de comisión
 *
 * Body: { confirmation_code, transaction_id, notes }
 */
router.put('/payments/:id/execute', authenticateJWT, requireRole(['admin', 'finance']), async (req, res) => {
  try {
    const { id } = req.params;
    const executionData = req.body;

    const payment = await CommissionService.executePayment(id, executionData);

    return res.status(200).json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('❌ [COMMISSION API] Error en PUT /payments/:id/execute:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/commissions/payments/:id/reconcile
 * Reconciliar pago con banco
 *
 * Body: { reconciled_by_user_id, reconciled_data }
 */
router.put('/payments/:id/reconcile', authenticateJWT, requireRole(['admin', 'finance']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reconciled_by_user_id, reconciled_data } = req.body;

    const payment = await CommissionService.reconcilePayment(
      id,
      reconciled_by_user_id,
      reconciled_data || {}
    );

    return res.status(200).json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('❌ [COMMISSION API] Error en PUT /payments/:id/reconcile:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commissions/payments/vendor/:vendor_id/stats
 * Estadísticas de pagos por vendedor
 *
 * Query: ?from_date=YYYY-MM-DD
 */
router.get('/payments/vendor/:vendor_id/stats', authenticateJWT, async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const { from_date } = req.query;

    const stats = await CommissionService.getVendorStats(vendor_id, {
      from_date
    });

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ [COMMISSION API] Error en GET /payments/vendor/:vendor_id/stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
