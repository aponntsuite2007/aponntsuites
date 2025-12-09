/**
 * CONTRACT ROUTES - API REST
 *
 * Endpoints para gestión de contratos digitales (EULA).
 * Expone operaciones del ContractService.
 *
 * BASE URL: /api/contracts/*
 *
 * AUTH: JWT required
 */

const express = require('express');
const router = express.Router();
const ContractService = require('../services/ContractService');
const { authenticateJWT, requireRole } = require('../middleware/auth');

/**
 * POST /api/contracts
 * Generar contrato desde presupuesto aceptado
 *
 * Body: { trace_id, budget_id, start_date, end_date, payment_day, ... }
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const contractData = req.body;

    const contract = await ContractService.generate(contractData);

    return res.status(201).json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en POST /:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/:id
 * Obtener contrato por ID
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await ContractService.findById(id);

    return res.status(200).json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en GET /:id:', error);
    return res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/company/:company_id
 * Listar contratos de una empresa (historial)
 */
router.get('/company/:company_id', authenticateJWT, async (req, res) => {
  try {
    const { company_id } = req.params;
    const { limit } = req.query;

    const contracts = await ContractService.findByCompany(company_id, {
      limit: parseInt(limit) || 50
    });

    return res.status(200).json({
      success: true,
      contracts
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en GET /company/:company_id:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/company/:company_id/active
 * Obtener contrato activo de una empresa
 */
router.get('/company/:company_id/active', authenticateJWT, async (req, res) => {
  try {
    const { company_id } = req.params;

    const contract = await ContractService.getActiveContract(company_id);

    return res.status(200).json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en GET /company/:company_id/active:', error);
    return res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/contracts/:id/sign
 * Cliente firma contrato (EULA digital)
 *
 * Body: { signed_ip, signed_user_agent, signed_by_user_id }
 */
router.put('/:id/sign', async (req, res) => {
  try {
    const { id } = req.params;
    const signatureData = req.body;

    const contract = await ContractService.sign(id, signatureData);

    return res.status(200).json({
      success: true,
      contract,
      message: 'Contrato firmado exitosamente'
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en PUT /:id/sign:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/contracts/:id/modules
 * Modificar módulos contratados (upgrade/downgrade)
 *
 * Body: {
 *   new_modules: [{module_key, module_name, price, quantity}, ...],
 *   modified_by: "user_id",
 *   reason: "..."
 * }
 */
router.put('/:id/modules', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_modules, modified_by, reason } = req.body;

    if (!new_modules) {
      return res.status(400).json({
        success: false,
        error: 'new_modules es requerido'
      });
    }

    const contract = await ContractService.updateModules(id, new_modules, {
      modified_by,
      reason
    });

    return res.status(200).json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en PUT /:id/modules:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/contracts/:id/suspend
 * Suspender contrato
 *
 * Body: { reason: "..." }
 */
router.put('/:id/suspend', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await ContractService.suspend(id, reason || 'Falta de pago');

    return res.status(200).json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en PUT /:id/suspend:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/contracts/:id/reactivate
 * Reactivar contrato suspendido
 *
 * Body: { notes: "..." }
 */
router.put('/:id/reactivate', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const contract = await ContractService.reactivate(id, notes || 'Pago recibido');

    return res.status(200).json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en PUT /:id/reactivate:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/contracts/:id/terminate
 * Terminar contrato
 *
 * Body: { reason: "..." }
 */
router.put('/:id/terminate', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await ContractService.terminate(id, reason || 'Fin de vigencia');

    return res.status(200).json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en PUT /:id/terminate:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/contracts/:id/cancel
 * Cancelar contrato
 *
 * Body: { reason: "..." }
 */
router.put('/:id/cancel', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await ContractService.cancel(id, reason || 'Cliente solicitó cancelación');

    return res.status(200).json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en PUT /:id/cancel:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/stats/overview
 * Estadísticas globales de contratos
 */
router.get('/stats/overview', authenticateJWT, async (req, res) => {
  try {
    const stats = await ContractService.getStats();

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en GET /stats/overview:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/stats/seller/:seller_id
 * Estadísticas por vendedor
 */
router.get('/stats/seller/:seller_id', authenticateJWT, async (req, res) => {
  try {
    const { seller_id } = req.params;
    const { start_date, end_date } = req.query;

    const stats = await ContractService.getSellerStats(seller_id, {
      startDate: start_date,
      endDate: end_date
    });

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en GET /stats/seller/:seller_id:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/contracts/check-expiring
 * Verificar contratos próximos a vencer (cron job)
 *
 * Query: ?days_threshold=30
 */
router.post('/check-expiring', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const { days_threshold } = req.query;

    const result = await ContractService.checkExpiringContracts(
      parseInt(days_threshold) || 30
    );

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en POST /check-expiring:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/contracts/:id/pdf
 * Generar PDF del contrato
 */
router.post('/:id/pdf', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await ContractService.generatePDF(id);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [CONTRACT API] Error en POST /:id/pdf:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
