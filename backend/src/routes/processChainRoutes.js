/**
 * ============================================================================
 * PROCESS CHAIN ROUTES - API REST para Cadenas de Procesos
 * ============================================================================
 *
 * Endpoints para generar y consultar cadenas de procesos dinámicas.
 *
 * Rutas:
 * - POST /api/process-chains/generate - Generar cadena para una acción
 * - GET /api/process-chains/available/:userId - Acciones disponibles para usuario
 * - POST /api/process-chains/validate - Validar contexto del usuario
 * - GET /api/process-chains/actions - Listar todas las acciones registradas
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { auth: auth } = require('../middleware/auth');
const { database } = require('../config/database');
const ProcessChainGenerator = require('../services/ProcessChainGenerator');
const ContextValidatorService = require('../services/ContextValidatorService');
const ProcessChainAnalyticsService = require('../services/ProcessChainAnalyticsService');

// Inicializar servicios (brainService se inyecta dinámicamente)
let processChainGenerator = null;
let contextValidator = null;
let analyticsService = null;

/**
 * Inyectar dependencias (llamado desde server.js)
 */
function initializeServices(sequelize, brainService = null) {
  processChainGenerator = new ProcessChainGenerator(sequelize, brainService);
  contextValidator = new ContextValidatorService(sequelize, brainService);
  analyticsService = new ProcessChainAnalyticsService(sequelize);
  console.log('🔗 [PROCESS CHAIN ROUTES] Servicios inicializados (incluye Analytics)');
}

/**
 * POST /api/process-chains/generate
 * Genera una cadena de procesos para una acción específica
 *
 * Body:
 * {
 *   "actionKey": "vacation-request",
 *   "userId": "user-uuid",
 *   "companyId": 1
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "chain": { action, userContext, processSteps, prerequisiteSteps, ... }
 * }
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const { actionKey, userId, companyId } = req.body;

    // Validación de parámetros
    if (!actionKey || !userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: actionKey, userId, companyId'
      });
    }

    if (!processChainGenerator) {
      return res.status(503).json({
        success: false,
        error: 'ProcessChainGenerator no disponible'
      });
    }

    console.log(`\n🔗 [API] Generando cadena: ${actionKey} para usuario ${userId}`);

    // Generar cadena
    const chain = await processChainGenerator.generateProcessChain(userId, companyId, actionKey);

    if (!chain || chain.error) {
      return res.status(400).json({
        success: false,
        error: chain.error || 'Error generando cadena'
      });
    }

    res.json({
      success: true,
      chain,
      metadata: {
        actionKey,
        userId,
        companyId,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [API] Error en /generate:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process-chains/available/:userId
 * Lista todas las acciones disponibles para un usuario
 *
 * Query params:
 * - companyId: ID de la empresa
 *
 * Response:
 * {
 *   "success": true,
 *   "actions": [
 *     { key: "vacation-request", name: "Solicitud de Vacaciones", available: true, missingCount: 0 },
 *     { key: "shift-swap", name: "Cambio de Turno", available: false, missingCount: 2 }
 *   ]
 * }
 */
router.get('/available/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId } = req.query;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: userId, companyId'
      });
    }

    if (!contextValidator) {
      return res.status(503).json({
        success: false,
        error: 'ContextValidator no disponible'
      });
    }

    console.log(`\n🔍 [API] Acciones disponibles para usuario ${userId} (empresa ${companyId})`);

    // Obtener acciones disponibles
    const availableActions = await contextValidator.getUserAvailableActions(userId, companyId);

    res.json({
      success: true,
      userId,
      companyId,
      actions: availableActions,
      total: availableActions.length,
      available: availableActions.filter(a => a.available).length,
      unavailable: availableActions.filter(a => !a.available).length
    });

  } catch (error) {
    console.error('❌ [API] Error en /available:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/process-chains/validate
 * Valida el contexto de un usuario para una acción específica
 *
 * Body:
 * {
 *   "actionKey": "vacation-request",
 *   "userId": "user-uuid",
 *   "companyId": 1
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "validation": {
 *     "valid": true,
 *     "action": "Solicitud de Vacaciones",
 *     "missingPrerequisites": [],
 *     "fulfilledPrerequisites": [...],
 *     "missingModules": [],
 *     "availableAlternatives": null
 *   }
 * }
 */
router.post('/validate', auth, async (req, res) => {
  try {
    const { actionKey, userId, companyId } = req.body;

    if (!actionKey || !userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: actionKey, userId, companyId'
      });
    }

    if (!contextValidator) {
      return res.status(503).json({
        success: false,
        error: 'ContextValidator no disponible'
      });
    }

    console.log(`\n🔍 [API] Validando contexto: ${actionKey} para usuario ${userId}`);

    // Validar contexto
    const validation = await contextValidator.validateUserContext(userId, companyId, actionKey);

    res.json({
      success: true,
      validation,
      metadata: {
        actionKey,
        userId,
        companyId,
        validatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [API] Error en /validate:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process-chains/actions
 * Lista todas las acciones registradas en el sistema (108 acciones)
 *
 * Response:
 * {
 *   "success": true,
 *   "actions": [
 *     { key: "vacation-request", name: "Solicitud de Vacaciones", requiredModules: [...] },
 *     ...
 *   ],
 *   "total": 108
 * }
 */
router.get('/actions', auth, async (req, res) => {
  try {
    if (!contextValidator) {
      return res.status(503).json({
        success: false,
        error: 'ContextValidator no disponible'
      });
    }

    // Obtener todas las acciones del registry
    const allActions = contextValidator.actionPrerequisites;

    const actionList = Object.keys(allActions).map(key => ({
      key,
      name: allActions[key].name,
      requiredModules: allActions[key].requiredModules || [],
      alternativeModules: allActions[key].alternativeModules || null,
      prerequisitesCount: allActions[key].requiredChain?.length || 0
    }));

    res.json({
      success: true,
      actions: actionList,
      total: actionList.length
    });

  } catch (error) {
    console.error('❌ [API] Error en /actions:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ========================================================================
 * ANALYTICS ENDPOINTS - Tracking y métricas de process chains
 * ========================================================================
 */

/**
 * POST /api/process-chains/analytics/track
 * Track generation de un process chain (llamado automáticamente por /generate)
 */
router.post('/analytics/track', auth, async (req, res) => {
  try {
    const {
      companyId,
      userId,
      actionKey,
      actionName,
      moduleName,
      processChain,
      userAgent,
      ipAddress,
      referrerModule
    } = req.body;

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        error: 'Analytics service no disponible'
      });
    }

    const record = await analyticsService.trackGeneration({
      companyId,
      userId,
      actionKey,
      actionName,
      moduleName,
      processChain,
      userAgent,
      ipAddress,
      referrerModule
    });

    res.json({
      success: true,
      analyticsId: record.id,
      message: 'Analytics tracked successfully'
    });

  } catch (error) {
    console.error('❌ [API] Error en /analytics/track:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/process-chains/analytics/:id/start
 * Track cuando usuario EMPIEZA un process chain
 */
router.patch('/analytics/:id/start', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        error: 'Analytics service no disponible'
      });
    }

    await analyticsService.trackStart(parseInt(id));

    res.json({
      success: true,
      message: 'Start tracked successfully'
    });

  } catch (error) {
    console.error('❌ [API] Error en /analytics/start:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/process-chains/analytics/:id/complete
 * Track cuando usuario COMPLETA un process chain
 */
router.patch('/analytics/:id/complete', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        error: 'Analytics service no disponible'
      });
    }

    await analyticsService.trackCompletion(parseInt(id));

    res.json({
      success: true,
      message: 'Completion tracked successfully'
    });

  } catch (error) {
    console.error('❌ [API] Error en /analytics/complete:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/process-chains/analytics/:id/abandon
 * Track cuando usuario ABANDONA un process chain
 */
router.patch('/analytics/:id/abandon', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        error: 'Analytics service no disponible'
      });
    }

    await analyticsService.trackAbandonment(parseInt(id));

    res.json({
      success: true,
      message: 'Abandonment tracked successfully'
    });

  } catch (error) {
    console.error('❌ [API] Error en /analytics/abandon:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/process-chains/analytics/:id/feedback
 * Submit user feedback (rating + comment)
 */
router.post('/analytics/:id/feedback', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating debe ser entre 1 y 5'
      });
    }

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        error: 'Analytics service no disponible'
      });
    }

    await analyticsService.submitFeedback(parseInt(id), rating, comment);

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('❌ [API] Error en /analytics/feedback:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process-chains/analytics/dashboard
 * Obtiene TODA la data del dashboard de analytics
 * Query params: days (default: 30)
 */
router.get('/analytics/dashboard', auth, async (req, res) => {
  try {
    const companyId = parseInt(req.query.companyId);
    const days = parseInt(req.query.days) || 30;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId es requerido'
      });
    }

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        error: 'Analytics service no disponible'
      });
    }

    const dashboardData = await analyticsService.getDashboardData(companyId, { days });

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ [API] Error en /analytics/dashboard:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process-chains/analytics/top-actions
 * Top N acciones más solicitadas
 * Query params: companyId, limit (default: 10), days (default: 30)
 */
router.get('/analytics/top-actions', auth, async (req, res) => {
  try {
    const companyId = parseInt(req.query.companyId);
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 30;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId es requerido'
      });
    }

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        error: 'Analytics service no disponible'
      });
    }

    const topActions = await analyticsService.getTopRequestedActions(companyId, { limit, days });

    res.json({
      success: true,
      data: topActions,
      metadata: {
        companyId,
        limit,
        days
      }
    });

  } catch (error) {
    console.error('❌ [API] Error en /analytics/top-actions:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process-chains/analytics/module-stats
 * Estadísticas por módulo
 * Query params: companyId, days (default: 30)
 */
router.get('/analytics/module-stats', auth, async (req, res) => {
  try {
    const companyId = parseInt(req.query.companyId);
    const days = parseInt(req.query.days) || 30;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId es requerido'
      });
    }

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        error: 'Analytics service no disponible'
      });
    }

    const moduleStats = await analyticsService.getModuleUsageStats(companyId, { days });

    res.json({
      success: true,
      data: moduleStats,
      metadata: {
        companyId,
        days
      }
    });

  } catch (error) {
    console.error('❌ [API] Error en /analytics/module-stats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process-chains/analytics/bottlenecks
 * Identifica bottlenecks (acciones problemáticas)
 * Query params: companyId, minRequests (default: 5), days (default: 30)
 */
router.get('/analytics/bottlenecks', auth, async (req, res) => {
  try {
    const companyId = parseInt(req.query.companyId);
    const minRequests = parseInt(req.query.minRequests) || 5;
    const days = parseInt(req.query.days) || 30;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId es requerido'
      });
    }

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        error: 'Analytics service no disponible'
      });
    }

    const bottlenecks = await analyticsService.identifyBottlenecks(companyId, { minRequests, days });

    res.json({
      success: true,
      data: bottlenecks,
      metadata: {
        companyId,
        minRequests,
        days
      }
    });

  } catch (error) {
    console.error('❌ [API] Error en /analytics/bottlenecks:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process-chains/analytics/trends
 * Tendencias temporales (por día)
 * Query params: companyId, days (default: 30)
 */
router.get('/analytics/trends', auth, async (req, res) => {
  try {
    const companyId = parseInt(req.query.companyId);
    const days = parseInt(req.query.days) || 30;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId es requerido'
      });
    }

    if (!analyticsService) {
      return res.status(503).json({
        success: false,
        error: 'Analytics service no disponible'
      });
    }

    const trends = await analyticsService.getTimeTrends(companyId, { days });

    res.json({
      success: true,
      data: trends,
      metadata: {
        companyId,
        days
      }
    });

  } catch (error) {
    console.error('❌ [API] Error en /analytics/trends:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process-chains/health
 * Health check del servicio
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    services: {
      processChainGenerator: !!processChainGenerator,
      contextValidator: !!contextValidator,
      analyticsService: !!analyticsService
    },
    actionsRegistered: contextValidator ? Object.keys(contextValidator.actionPrerequisites).length : 0,
    timestamp: new Date().toISOString()
  });
});

// Exportar router y función de inicialización
module.exports = { router, initializeServices };
