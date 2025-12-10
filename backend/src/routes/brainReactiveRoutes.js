/**
 * ============================================================================
 * BRAIN REACTIVE ROUTES - API del Sistema Reactivo
 * ============================================================================
 *
 * Endpoints para controlar y monitorear el sistema reactivo del Brain
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const BrainReactiveService = require('../services/BrainReactiveService');

let reactiveService = null;
let changeLog = []; // Log de cambios recientes
const MAX_CHANGELOG_SIZE = 100;

/**
 * Inicializar servicio reactivo
 */
function initReactiveService(brainService, database) {
  if (!reactiveService) {
    reactiveService = new BrainReactiveService(brainService, database);

    // Configurar listeners para log de cambios
    reactiveService.on('file:changed', (data) => {
      addToChangeLog('file:changed', data);
    });

    reactiveService.on('task:completed', (data) => {
      addToChangeLog('task:completed', data);
      // Aquí podríamos actualizar ecosystem_tasks en la BD
      console.log(`🎯 [BRAIN-REACTIVE] Tarea completada detectada: ${data.name}`);
    });

    reactiveService.on('workflow:detected', (data) => {
      addToChangeLog('workflow:detected', data);
    });

    reactiveService.on('route:changed', (data) => {
      addToChangeLog('route:changed', {
        file: data.relativePath,
        endpoints: data.endpoints?.length || 0,
        tasks: data.completedTasks?.length || 0
      });
    });

    reactiveService.on('service:changed', (data) => {
      addToChangeLog('service:changed', {
        file: data.relativePath,
        workflows: data.workflows?.length || 0,
        stateMachines: data.stateMachines?.length || 0
      });
    });

    console.log('🧠 [BRAIN-REACTIVE-API] Servicio reactivo inicializado');
  }
  return reactiveService;
}

/**
 * Agregar entrada al log de cambios
 */
function addToChangeLog(event, data) {
  changeLog.unshift({
    event,
    data,
    timestamp: new Date().toISOString()
  });

  // Mantener solo los últimos N cambios
  if (changeLog.length > MAX_CHANGELOG_SIZE) {
    changeLog = changeLog.slice(0, MAX_CHANGELOG_SIZE);
  }
}

// Middleware para inicializar
router.use((req, res, next) => {
  if (!reactiveService) {
    const brainService = req.app.get('brainService');
    const database = req.app.get('database');
    if (brainService && database) {
      initReactiveService(brainService, database);
    }
  }
  next();
});

/**
 * GET /api/brain-reactive/status
 * Estado del servicio reactivo
 */
router.get('/status', (req, res) => {
  if (!reactiveService) {
    return res.json({
      success: true,
      data: {
        status: 'not_initialized',
        message: 'El servicio reactivo no está inicializado aún'
      }
    });
  }

  res.json({
    success: true,
    data: {
      status: reactiveService.isWatching ? 'watching' : 'stopped',
      ...reactiveService.getStatus(),
      recentChanges: changeLog.length,
      lastChange: changeLog[0] || null
    }
  });
});

/**
 * POST /api/brain-reactive/start
 * Iniciar observación de archivos
 */
router.post('/start', (req, res) => {
  if (!reactiveService) {
    const brainService = req.app.get('brainService');
    const database = req.app.get('database');
    if (!brainService || !database) {
      return res.status(400).json({
        success: false,
        error: 'Brain Service o Database no disponibles'
      });
    }
    initReactiveService(brainService, database);
  }

  try {
    reactiveService.startWatching();
    res.json({
      success: true,
      message: 'Observación iniciada - Cerebro reactivo ACTIVADO',
      status: reactiveService.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/brain-reactive/stop
 * Detener observación de archivos
 */
router.post('/stop', (req, res) => {
  if (!reactiveService) {
    return res.status(400).json({
      success: false,
      error: 'Servicio no inicializado'
    });
  }

  reactiveService.stopWatching();
  res.json({
    success: true,
    message: 'Observación detenida'
  });
});

/**
 * GET /api/brain-reactive/changes
 * Log de cambios recientes
 */
router.get('/changes', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const eventType = req.query.event;

  let filteredLog = changeLog;
  if (eventType) {
    filteredLog = changeLog.filter(c => c.event === eventType);
  }

  res.json({
    success: true,
    data: {
      total: filteredLog.length,
      changes: filteredLog.slice(0, limit)
    }
  });
});

/**
 * GET /api/brain-reactive/tasks
 * Tareas detectadas automáticamente
 */
router.get('/tasks', (req, res) => {
  const taskChanges = changeLog.filter(c => c.event === 'task:completed');

  res.json({
    success: true,
    data: {
      total: taskChanges.length,
      tasks: taskChanges.map(c => c.data)
    }
  });
});

/**
 * GET /api/brain-reactive/workflows
 * Workflows detectados automáticamente
 */
router.get('/workflows', (req, res) => {
  const workflowChanges = changeLog.filter(c => c.event === 'workflow:detected');

  res.json({
    success: true,
    data: {
      total: workflowChanges.length,
      workflows: workflowChanges.flatMap(c => c.data.workflows || [])
    }
  });
});

/**
 * POST /api/brain-reactive/clear-log
 * Limpiar log de cambios
 */
router.post('/clear-log', (req, res) => {
  changeLog = [];
  res.json({
    success: true,
    message: 'Log de cambios limpiado'
  });
});

/**
 * GET /api/brain-reactive/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    service: 'BrainReactiveService',
    timestamp: new Date().toISOString(),
    watching: reactiveService?.isWatching || false
  });
});

module.exports = router;
module.exports.initReactiveService = initReactiveService;
