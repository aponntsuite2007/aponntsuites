/**
 * ONBOARDING ROUTES - API REST
 *
 * Endpoints para el workflow completo de Alta de Empresa (6 fases).
 * Orchestrator principal que coordina Budget, Contract, Invoice, Commission services.
 *
 * BASE URL: /api/onboarding/*
 *
 * FASES DEL WORKFLOW:
 * 1. PRESUPUESTO → POST /initiate
 * 2. CONTRATO EULA → POST /:trace_id/contract/generate
 * 3. FACTURACIÓN → POST /:trace_id/invoice/generate
 * 4. ALTA DEFINITIVA → POST /:trace_id/activate
 * 5. COMISIONES → POST /:trace_id/commissions/liquidate
 * 6. BIENVENIDA → POST /:trace_id/welcome
 *
 * AUTH: JWT required (aponnt_staff o company admin)
 */

const express = require('express');
const router = express.Router();
const OnboardingService = require('../services/OnboardingService');
const { auth, authorize } = require('../middleware/auth');

// Integración NCE - Notificaciones
const OnboardingNotifications = require('../services/integrations/onboarding-notifications');

/**
 * ============================================
 * FASE 1: PRESUPUESTO
 * ============================================
 */

/**
 * POST /api/onboarding/initiate
 * Iniciar onboarding completo (crear presupuesto y enviar al cliente)
 *
 * Body: {
 *   companyData: { name, contact_email, modules, contractedEmployees, ... },
 *   vendorId: "uuid"
 * }
 *
 * Returns: { success, trace_id, budget_id, status }
 */
router.post('/initiate', auth, async (req, res) => {
  try {
    const { companyData, vendorId } = req.body;

    if (!companyData || !vendorId) {
      return res.status(400).json({
        success: false,
        error: 'companyData y vendorId son requeridos'
      });
    }

    const result = await OnboardingService.initiateOnboarding(companyData, vendorId);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /initiate:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/onboarding/:trace_id/budget/respond
 * Cliente responde al presupuesto (aceptar/rechazar/modificar)
 *
 * Body: {
 *   action: "accept" | "reject" | "request_modification",
 *   userData: { email, name, ... },
 *   modification: { changes, reason } (opcional)
 * }
 *
 * Returns: { success, status, next_phase }
 */
router.post('/:trace_id/budget/respond', async (req, res) => {
  try {
    const { trace_id } = req.params;
    const { action, userData, modification } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'action es requerido (accept/reject/request_modification)'
      });
    }

    // TODO: Implementar handleBudgetResponse en OnboardingService
    const result = await OnboardingService.handleBudgetResponse(
      trace_id,
      action,
      userData,
      modification
    );

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /budget/respond:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * FASE 2: CONTRATO DIGITAL (EULA)
 * ============================================
 */

/**
 * POST /api/onboarding/:trace_id/contract/generate
 * Generar contrato digital tras presupuesto aceptado
 *
 * Returns: { success, contract_id, contract_number, status }
 */
router.post('/:trace_id/contract/generate', auth, async (req, res) => {
  try {
    const { trace_id } = req.params;

    // TODO: Implementar generateContract en OnboardingService
    const result = await OnboardingService.generateContractByTrace(trace_id);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /contract/generate:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/onboarding/:trace_id/contract/sign
 * Cliente firma contrato (EULA digital)
 *
 * Body: {
 *   action: "sign" | "reject",
 *   signatureData: { signed_ip, signed_user_agent, signed_by_user_id }
 * }
 *
 * Returns: { success, status, next_phase }
 */
router.post('/:trace_id/contract/sign', async (req, res) => {
  try {
    const { trace_id } = req.params;
    const { action, signatureData } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'action es requerido (sign/reject)'
      });
    }

    // TODO: Implementar handleContractSignature en OnboardingService
    const result = await OnboardingService.handleContractSignatureByTrace(
      trace_id,
      action,
      signatureData
    );

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /contract/sign:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * FASE 3: FACTURACIÓN
 * ============================================
 */

/**
 * POST /api/onboarding/:trace_id/invoice/generate
 * Generar factura inicial tras firma de contrato
 *
 * Returns: { success, invoice_id, invoice_number, status }
 */
router.post('/:trace_id/invoice/generate', auth, async (req, res) => {
  try {
    const { trace_id } = req.params;

    // TODO: Implementar generateInvoiceByTrace en OnboardingService
    const result = await OnboardingService.generateInvoiceByTrace(trace_id);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /invoice/generate:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/onboarding/:trace_id/invoice/confirm-payment
 * Confirmar pago de factura
 *
 * Body: {
 *   paymentData: { paid_at, payment_proof_url, payment_method, amount }
 * }
 *
 * Returns: { success, status, next_phase }
 */
router.post('/:trace_id/invoice/confirm-payment', auth, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { trace_id } = req.params;
    const { paymentData } = req.body;

    if (!paymentData) {
      return res.status(400).json({
        success: false,
        error: 'paymentData es requerido'
      });
    }

    // TODO: Implementar confirmInvoicePaymentByTrace en OnboardingService
    const result = await OnboardingService.confirmInvoicePaymentByTrace(
      trace_id,
      paymentData
    );

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /invoice/confirm-payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * FASE 4: ALTA DEFINITIVA
 * ============================================
 */

/**
 * POST /api/onboarding/:trace_id/activate
 * Activar empresa definitivamente (tras pago confirmado)
 *
 * Returns: { success, company_id, admin_user_id, status }
 */
router.post('/:trace_id/activate', auth, authorize(['admin']), async (req, res) => {
  try {
    const { trace_id } = req.params;

    // TODO: Implementar activateCompanyByTrace en OnboardingService
    const result = await OnboardingService.activateCompanyByTrace(trace_id);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /activate:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * FASE 4B: ALTA PARA TRIAL (sin factura)
 * ============================================
 */

/**
 * POST /api/onboarding/activate-trial/:quoteId
 * Activar empresa cuando tiene período de prueba (trial).
 * No requiere factura pagada - la empresa se activa inmediatamente
 * con los módulos bonificados durante el trial.
 *
 * Returns: { success, company_id, admin_user, trial_info }
 */
router.post('/activate-trial/:quoteId', auth, async (req, res) => {
  try {
    const { quoteId } = req.params;

    if (!quoteId) {
      return res.status(400).json({
        success: false,
        error: 'quoteId es requerido'
      });
    }

    const result = await OnboardingService.activateCompanyForTrial(parseInt(quoteId));

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /activate-trial:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/onboarding/pending-activations
 * Lista quotes en estado 'in_trial' que necesitan activación de empresa.
 * Útil para el panel administrativo.
 */
router.get('/pending-activations', auth, async (req, res) => {
  try {
    const result = await OnboardingService.getPendingTrialActivations();
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /pending-activations:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * FASE 5: LIQUIDACIÓN DE COMISIONES
 * ============================================
 */

/**
 * POST /api/onboarding/:trace_id/commissions/liquidate
 * Liquidar comisiones inmediatas (tras pago confirmado)
 *
 * Returns: { success, liquidation_id, total_commission_amount }
 */
router.post('/:trace_id/commissions/liquidate', auth, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { trace_id } = req.params;

    // TODO: Implementar liquidateCommissionsByTrace en OnboardingService
    const result = await OnboardingService.liquidateCommissionsByTrace(trace_id);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /commissions/liquidate:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * FASE 6: BIENVENIDA
 * ============================================
 */

/**
 * POST /api/onboarding/:trace_id/welcome
 * Enviar email de bienvenida al cliente
 *
 * Returns: { success, status }
 */
router.post('/:trace_id/welcome', auth, async (req, res) => {
  try {
    const { trace_id } = req.params;

    // TODO: Implementar sendWelcomeEmailByTrace en OnboardingService
    const result = await OnboardingService.sendWelcomeEmailByTrace(trace_id);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /welcome:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * TRACKING & STATUS
 * ============================================
 */

/**
 * GET /api/onboarding/:trace_id/status
 * Obtener estado actual del onboarding
 *
 * Returns: {
 *   trace_id,
 *   current_phase,
 *   status,
 *   budget: { ... },
 *   contract: { ... },
 *   invoice: { ... },
 *   commission: { ... }
 * }
 */
router.get('/:trace_id/status', async (req, res) => {
  try {
    const { trace_id } = req.params;

    // TODO: Implementar getOnboardingStatus en OnboardingService
    const status = await OnboardingService.getOnboardingStatus(trace_id);

    return res.status(200).json(status);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /status:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/onboarding/list
 * Listar todos los onboardings
 *
 * Query params: ?status=X&vendor_id=Y&limit=50
 *
 * Returns: { success, onboardings: [...] }
 */
router.get('/list', auth, async (req, res) => {
  try {
    const { status, vendor_id, limit } = req.query;

    // TODO: Implementar listOnboardings en OnboardingService
    const onboardings = await OnboardingService.listOnboardings({
      status,
      vendor_id,
      limit: parseInt(limit) || 50
    });

    return res.status(200).json({
      success: true,
      onboardings
    });

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /list:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * ADMINISTRATIVE
 * ============================================
 */

/**
 * POST /api/onboarding/:trace_id/cancel
 * Cancelar onboarding en cualquier fase
 *
 * Body: { reason: "..." }
 */
router.post('/:trace_id/cancel', auth, authorize(['admin']), async (req, res) => {
  try {
    const { trace_id } = req.params;
    const { reason } = req.body;

    // TODO: Implementar cancelOnboarding en OnboardingService
    const result = await OnboardingService.cancelOnboarding(trace_id, reason);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /cancel:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/onboarding/stats
 * Estadísticas globales de onboarding
 *
 * Returns: { total, by_phase, by_status, conversion_rate, ... }
 */
router.get('/stats', auth, authorize(['admin']), async (req, res) => {
  try {
    // TODO: Implementar getOnboardingStats en OnboardingService
    const stats = await OnboardingService.getOnboardingStats();

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ [ONBOARDING API] Error en /stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
