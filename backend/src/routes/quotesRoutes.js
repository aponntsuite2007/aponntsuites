/**
 * ROUTES: Quotes (Presupuestos)
 *
 * Endpoints REST para gestión de presupuestos con trials
 */

const express = require('express');
const router = express.Router();
const QuoteManagementService = require('../services/QuoteManagementService');
const { auth: authMiddleware } = require('../middleware/auth');

/**
 * GET /api/quotes/company/:companyId
 * Obtiene todos los presupuestos de una empresa
 */
router.get('/company/:companyId', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status, seller_id } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (seller_id) filters.seller_id = seller_id;

    const quotes = await QuoteManagementService.getCompanyQuotes(companyId, filters);

    res.json({
      success: true,
      quotes,
      count: quotes.length
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error obteniendo presupuestos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/quotes/company/:companyId/active
 * Obtiene el presupuesto activo de una empresa
 */
router.get('/company/:companyId/active', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;

    const quote = await QuoteManagementService.getActiveQuote(companyId);

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'No hay presupuesto activo para esta empresa'
      });
    }

    res.json({
      success: true,
      quote
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error obteniendo presupuesto activo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes
 * Crea un nuevo presupuesto
 *
 * Body:
 * {
 *   company_id: number,
 *   seller_id: number,
 *   modules_data: [{module_key, module_name, price, quantity}],
 *   notes: string (optional),
 *   terms_and_conditions: string (optional),
 *   created_by: number (optional)
 * }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const result = await QuoteManagementService.createQuote(req.body);

    res.status(201).json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error creando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/send
 * Envía un presupuesto al cliente (draft → sent)
 */
router.post('/:id/send', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const result = await QuoteManagementService.sendQuote(id, userId);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error enviando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/accept
 * Cliente acepta el presupuesto (inicia trial o activa directamente)
 */
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const options = req.body || {};

    const result = await QuoteManagementService.acceptQuote(id, options);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error aceptando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/reject
 * Cliente rechaza el presupuesto
 *
 * Body:
 * {
 *   reason: string (optional)
 * }
 */
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await QuoteManagementService.rejectQuote(id, reason);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error rechazando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/activate
 * Activa un presupuesto (post-trial)
 */
router.post('/:id/activate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await QuoteManagementService.activateQuote(id);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error activando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/quotes/seller/:sellerId/stats
 * Obtiene estadísticas de presupuestos por vendedor
 *
 * Query params:
 *   - date_from: YYYY-MM-DD
 *   - date_to: YYYY-MM-DD
 */
router.get('/seller/:sellerId/stats', authMiddleware, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { date_from, date_to } = req.query;

    const dateRange = {};
    if (date_from) dateRange.date_from = date_from;
    if (date_to) dateRange.date_to = date_to;

    const stats = await QuoteManagementService.getSellerStats(sellerId, dateRange);

    res.json({
      success: true,
      seller_id: sellerId,
      stats
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
