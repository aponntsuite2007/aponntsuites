/**
 * ═══════════════════════════════════════════════════════════
 * E2E ADVANCED ROUTES - API REST Unificada
 * ═══════════════════════════════════════════════════════════
 *
 * API REST para el Master Test Orchestrator - 7 Layers Testing
 *
 * @routes
 *   POST   /api/e2e-advanced/run
 *   POST   /api/e2e-advanced/run/:layer
 *   GET    /api/e2e-advanced/status/:executionId
 *   GET    /api/e2e-advanced/results/:executionId
 *   GET    /api/e2e-advanced/layers
 *   GET    /api/e2e-advanced/executions
 *   DELETE /api/e2e-advanced/executions/:executionId
 *
 * @version 2.0.0
 * @date 2025-12-25
 * @description Sistema completo de testing con MasterTestOrchestrator
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const MasterTestOrchestrator = require('../../tests/e2e-advanced/MasterTestOrchestrator');

// Store de ejecuciones en memoria (temporal - mover a BD en FASE 2)
const activeExecutions = new Map();

/**
 * POST /api/e2e-advanced/run
 * Ejecuta todos los layers o un subset específico
 *
 * Body:
 *   - mode: 'sequential' | 'parallel' (default: 'sequential')
 *   - stopOnFailure: boolean (default: false)
 *   - autoHeal: boolean (default: true)
 *   - layersToRun: number[] (optional - ejecutar layers específicos)
 */
router.post('/run', async (req, res) => {
  try {
    const {
      mode = 'sequential',
      stopOnFailure = false,
      autoHeal = true,
      layersToRun = null
    } = req.body;

    const orchestrator = new MasterTestOrchestrator();
    const executionId = `exec-${Date.now()}`;

    // Validar layers si se especifican
    if (layersToRun && !Array.isArray(layersToRun)) {
      return res.status(400).json({
        error: 'layersToRun must be an array of layer IDs'
      });
    }

    if (layersToRun && layersToRun.some(id => id < 1 || id > 7)) {
      return res.status(400).json({
        error: 'Invalid layer ID. Must be between 1 and 7'
      });
    }

    // Ejecutar en background
    const execution = {
      id: executionId,
      status: 'running',
      startTime: new Date(),
      mode,
      stopOnFailure,
      autoHeal,
      layersToRun: layersToRun || [1, 2, 3, 4, 5, 6, 7],
      progress: 0,
      result: null
    };

    activeExecutions.set(executionId, execution);

    // Ejecutar async
    orchestrator.runAll({ mode, stopOnFailure, autoHeal, layersToRun })
      .then(result => {
        execution.status = 'completed';
        execution.endTime = new Date();
        execution.result = result;
        execution.progress = 100;
      })
      .catch(error => {
        execution.status = 'failed';
        execution.endTime = new Date();
        execution.error = error.message;
        execution.progress = 0;
      });

    // Retornar inmediatamente
    res.json({
      executionId,
      status: 'running',
      message: 'Execution started successfully',
      estimatedDuration: calculateEstimatedDuration(layersToRun || [1, 2, 3, 4, 5, 6, 7]),
      layers: execution.layersToRun.map(id => ({
        id,
        status: 'pending'
      }))
    });

  } catch (error) {
    console.error('Error starting execution:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/e2e-advanced/run/:layer
 * Ejecuta un layer específico de forma síncrona
 */
router.post('/run/:layer', async (req, res) => {
  try {
    const layerId = parseInt(req.params.layer);

    if (isNaN(layerId) || layerId < 1 || layerId > 7) {
      return res.status(400).json({
        error: 'Invalid layer ID. Must be between 1 and 7'
      });
    }

    const orchestrator = new MasterTestOrchestrator();

    console.log(`\n🚀 Ejecutando Layer ${layerId} vía API...`);

    const result = await orchestrator.runLayer(layerId);

    res.json({
      layer: layerId,
      status: 'passed',
      result
    });

  } catch (error) {
    console.error(`Error executing layer ${req.params.layer}:`, error);

    res.status(500).json({
      layer: parseInt(req.params.layer),
      status: 'failed',
      error: error.message
    });
  }
});

/**
 * GET /api/e2e-advanced/status/:executionId
 * Obtiene el estado actual de una ejecución
 */
router.get('/status/:executionId', (req, res) => {
  const { executionId } = req.params;

  const execution = activeExecutions.get(executionId);

  if (!execution) {
    // Buscar en archivos de resultados
    const resultsPath = path.join(__dirname, '../../tests/e2e-advanced/results', `${executionId}.json`);

    if (fs.existsSync(resultsPath)) {
      const result = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

      return res.json({
        executionId,
        status: 'completed',
        startTime: result.startTime,
        endTime: result.endTime,
        duration: result.totalDuration,
        progress: 100,
        passed: result.passed,
        failed: result.failed,
        totalLayers: result.totalLayers
      });
    }

    return res.status(404).json({
      error: 'Execution not found'
    });
  }

  res.json({
    executionId: execution.id,
    status: execution.status,
    startTime: execution.startTime,
    endTime: execution.endTime,
    duration: execution.endTime ? execution.endTime - execution.startTime : Date.now() - execution.startTime,
    progress: execution.progress,
    mode: execution.mode,
    layersToRun: execution.layersToRun,
    error: execution.error
  });
});

/**
 * GET /api/e2e-advanced/results/:executionId
 * Obtiene los resultados completos de una ejecución
 */
router.get('/results/:executionId', (req, res) => {
  const { executionId } = req.params;

  // Buscar primero en memoria
  const execution = activeExecutions.get(executionId);

  if (execution && execution.result) {
    return res.json(execution.result);
  }

  // Buscar en archivos
  const resultsPath = path.join(__dirname, '../../tests/e2e-advanced/results', `${executionId}.json`);

  if (!fs.existsSync(resultsPath)) {
    return res.status(404).json({
      error: 'Results not found'
    });
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  res.json(results);
});

/**
 * GET /api/e2e-advanced/layers
 * Lista todos los layers disponibles
 */
router.get('/layers', (req, res) => {
  const orchestrator = new MasterTestOrchestrator();

  res.json({
    totalLayers: orchestrator.layers.length,
    layers: orchestrator.layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      description: layer.description,
      status: layer.status,
      estimatedDuration: layer.estimatedDuration,
      estimatedDurationMin: (layer.estimatedDuration / 60000).toFixed(1),
      criticalForProduction: layer.criticalForProduction
    }))
  });
});

/**
 * GET /api/e2e-advanced/executions
 * Lista todas las ejecuciones (en memoria y archivos)
 */
router.get('/executions', (req, res) => {
  const executions = [];

  // Ejecuciones en memoria
  activeExecutions.forEach((execution, id) => {
    executions.push({
      executionId: id,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      mode: execution.mode,
      layersToRun: execution.layersToRun
    });
  });

  // Ejecuciones en archivos
  const resultsDir = path.join(__dirname, '../../tests/e2e-advanced/results');

  if (fs.existsSync(resultsDir)) {
    const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));

    files.forEach(file => {
      const executionId = file.replace('.json', '');

      // Skip si ya está en memoria
      if (activeExecutions.has(executionId)) return;

      const resultsPath = path.join(resultsDir, file);
      const result = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

      executions.push({
        executionId: result.executionId,
        status: 'completed',
        startTime: result.startTime,
        endTime: result.endTime,
        mode: result.mode,
        passed: result.passed,
        failed: result.failed
      });
    });
  }

  // Ordenar por fecha (más reciente primero)
  executions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  res.json({
    total: executions.length,
    executions: executions.slice(0, 20) // Últimas 20
  });
});

/**
 * DELETE /api/e2e-advanced/executions/:executionId
 * Elimina una ejecución (solo de memoria, no de archivos)
 */
router.delete('/executions/:executionId', (req, res) => {
  const { executionId } = req.params;

  if (activeExecutions.has(executionId)) {
    const execution = activeExecutions.get(executionId);

    if (execution.status === 'running') {
      return res.status(400).json({
        error: 'Cannot delete running execution'
      });
    }

    activeExecutions.delete(executionId);

    res.json({
      message: 'Execution deleted from memory',
      executionId
    });
  } else {
    res.status(404).json({
      error: 'Execution not found in active executions'
    });
  }
});

/**
 * Helper: Calcula duración estimada total
 */
function calculateEstimatedDuration(layerIds) {
  const orchestrator = new MasterTestOrchestrator();

  const total = layerIds.reduce((sum, id) => {
    const layer = orchestrator.layers.find(l => l.id === id);
    return sum + (layer ? layer.estimatedDuration : 0);
  }, 0);

  return {
    milliseconds: total,
    minutes: (total / 60000).toFixed(1),
    hours: (total / 3600000).toFixed(2)
  };
}

module.exports = router;
