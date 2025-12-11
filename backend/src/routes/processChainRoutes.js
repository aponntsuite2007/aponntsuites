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
const { authenticateToken } = require('../middleware/auth');
const { database } = require('../config/database');
const ProcessChainGenerator = require('../services/ProcessChainGenerator');
const ContextValidatorService = require('../services/ContextValidatorService');

// Inicializar servicios (brainService se inyecta dinámicamente)
let processChainGenerator = null;
let contextValidator = null;

/**
 * Inyectar dependencias (llamado desde server.js)
 */
function initializeServices(sequelize, brainService = null) {
  processChainGenerator = new ProcessChainGenerator(sequelize, brainService);
  contextValidator = new ContextValidatorService(sequelize, brainService);
  console.log('🔗 [PROCESS CHAIN ROUTES] Servicios inicializados');
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
router.post('/generate', authenticateToken, async (req, res) => {
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
router.get('/available/:userId', authenticateToken, async (req, res) => {
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
router.post('/validate', authenticateToken, async (req, res) => {
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
router.get('/actions', authenticateToken, async (req, res) => {
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
 * GET /api/process-chains/health
 * Health check del servicio
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    services: {
      processChainGenerator: !!processChainGenerator,
      contextValidator: !!contextValidator
    },
    actionsRegistered: contextValidator ? Object.keys(contextValidator.actionPrerequisites).length : 0,
    timestamp: new Date().toISOString()
  });
});

// Exportar router y función de inicialización
module.exports = { router, initializeServices };
