/**
 * ROUTES: Module Trials
 *
 * Endpoints REST para gestión de trials de módulos
 */

const express = require('express');
const router = express.Router();
const ModuleTrialService = require('../services/ModuleTrialService');
const { auth: authMiddleware } = require('../middleware/auth');

/**
 * GET /api/trials/company/:companyId
 * Obtiene trials activos de una empresa
 */
router.get('/company/:companyId', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;

    const trials = await ModuleTrialService.getActiveTrials(companyId);

    res.json({
      success: true,
      trials,
      count: trials.length
    });

  } catch (error) {
    console.error('❌ [TRIALS API] Error obteniendo trials:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trials/reminders/:reminderType
 * Obtiene trials que necesitan reminder
 *
 * Params:
 *   - reminderType: '7days' | '3days' | '1day' | 'final'
 */
router.get('/reminders/:reminderType', authMiddleware, async (req, res) => {
  try {
    const { reminderType } = req.params;

    const validTypes = ['7days', '3days', '1day', 'final'];
    if (!validTypes.includes(reminderType)) {
      return res.status(400).json({
        success: false,
        error: `Tipo de reminder inválido. Debe ser uno de: ${validTypes.join(', ')}`
      });
    }

    const trialsData = await ModuleTrialService.getTrialsNeedingReminder(reminderType);

    res.json({
      success: true,
      reminder_type: reminderType,
      trials: trialsData,
      count: trialsData.length
    });

  } catch (error) {
    console.error('❌ [TRIALS API] Error obteniendo trials para reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trials/reminders/:reminderType/send
 * Envía reminders a trials próximos a vencer
 */
router.post('/reminders/:reminderType/send', authMiddleware, async (req, res) => {
  try {
    const { reminderType } = req.params;

    const result = await ModuleTrialService.sendTrialReminders(reminderType);

    res.json(result);

  } catch (error) {
    console.error('❌ [TRIALS API] Error enviando reminders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trials/:id/accept
 * Cliente acepta el módulo en trial (activación inmediata)
 */
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const options = req.body || {};

    const result = await ModuleTrialService.acceptTrial(id, options);

    res.json(result);

  } catch (error) {
    console.error('❌ [TRIALS API] Error aceptando trial:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trials/:id/reject
 * Cliente rechaza el módulo en trial
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

    const result = await ModuleTrialService.rejectTrial(id, reason);

    res.json(result);

  } catch (error) {
    console.error('❌ [TRIALS API] Error rechazando trial:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trials/company/:companyId/bulk-accept
 * Acepta múltiples trials de una empresa (bulk operation)
 *
 * Body:
 * {
 *   trial_ids: [1, 2, 3, ...]
 * }
 */
router.post('/company/:companyId/bulk-accept', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { trial_ids } = req.body;

    if (!Array.isArray(trial_ids) || trial_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'trial_ids debe ser un array no vacío'
      });
    }

    const result = await ModuleTrialService.bulkAcceptTrials(companyId, trial_ids);

    res.json(result);

  } catch (error) {
    console.error('❌ [TRIALS API] Error en bulk accept:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trials/process-expired
 * Procesa trials expirados sin decisión (auto-terminación)
 */
router.post('/process-expired', authMiddleware, async (req, res) => {
  try {
    const result = await ModuleTrialService.processExpiredTrials();

    res.json(result);

  } catch (error) {
    console.error('❌ [TRIALS API] Error procesando trials expirados:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trials/stats
 * Obtiene estadísticas de trials
 *
 * Query params:
 *   - status: active|completed|accepted|rejected|expired
 *   - date_from: YYYY-MM-DD
 *   - date_to: YYYY-MM-DD
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const filters = {};

    if (req.query.status) filters.status = req.query.status;
    if (req.query.date_from) filters.date_from = req.query.date_from;
    if (req.query.date_to) filters.date_to = req.query.date_to;

    const result = await ModuleTrialService.getStats(filters);

    res.json(result);

  } catch (error) {
    console.error('❌ [TRIALS API] Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
