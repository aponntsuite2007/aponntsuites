/**
 * e2eAdvancedRoutes.js - API REST UNIFICADA para E2E Advanced Testing
 *
 * ENDPOINTS:
 * - POST   /api/e2e-advanced/run                → Ejecutar tests (alcance flexible)
 * - GET    /api/e2e-advanced/status             → Estado de ejecución actual
 * - GET    /api/e2e-advanced/executions         → Historial de ejecuciones
 * - GET    /api/e2e-advanced/executions/:id     → Detalles de ejecución
 * - GET    /api/e2e-advanced/confidence/:id     → Confidence score
 * - DELETE /api/e2e-advanced/executions/:id     → Cancelar ejecución
 * - GET    /api/e2e-advanced/phases             → Fases disponibles
 * - GET    /api/e2e-advanced/modules            → Módulos disponibles
 *
 * ALCANCE FLEXIBLE:
 * - Full suite: { mode: 'full' }
 * - Por fases: { phases: ['e2e', 'load'] }
 * - Por módulos: { modules: ['users', 'attendance'] }
 * - Mixto: { phases: ['e2e'], modules: ['users'] }
 *
 * @module e2eAdvancedRoutes
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const MasterTestOrchestrator = require('../MasterTestOrchestrator');
const db = require('../../../config/database');
const { auth } = require('../../../middleware/auth');
const { Op } = require('sequelize');

// Modelos
const E2EAdvancedExecution = db.E2EAdvancedExecution;
const TestResultDetailed = db.TestResultDetailed;
const ConfidenceScore = db.ConfidenceScore;

// Instancia única del orchestrator (singleton)
let orchestrator = null;

/**
 * Obtiene o crea instancia del orchestrator
 * @private
 */
function getOrchestrator() {
  if (!orchestrator) {
    orchestrator = new MasterTestOrchestrator();
    console.log('✅ [API] MasterTestOrchestrator inicializado');
  }
  return orchestrator;
}

/**
 * POST /api/e2e-advanced/run
 * Ejecuta tests con alcance flexible
 *
 * Body:
 * {
 *   mode: 'full' | 'phases' | 'modules' | 'custom',  // Modo de ejecución
 *   phases: ['e2e', 'load', 'security'],             // Fases a ejecutar (opcional)
 *   modules: ['users', 'attendance'],                // Módulos a testear (opcional)
 *   parallel: true,                                  // Ejecución paralela (default: true)
 *   headless: true,                                  // Playwright headless (default: true)
 *   companyId: 1                                     // ID de empresa (para logs)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   executionId: 'uuid',
 *   message: 'Ejecución iniciada',
 *   mode: 'full',
 *   phases: ['e2e', 'load', 'security', 'multiTenant', 'database', 'monitoring', 'edgeCases'],
 *   modules: [],
 *   estimatedDuration: '45-60 minutos'
 * }
 */
router.post('/run', auth, async (req, res) => {
  try {
    const {
      mode = 'full',
      phases = [],
      modules = [],
      parallel = true,
      headless = true,
      companyId
    } = req.body;

    console.log(`\n🚀 [API] Solicitud de ejecución E2E Advanced`);
    console.log(`   Mode: ${mode}`);
    console.log(`   Phases: ${phases.length > 0 ? phases.join(', ') : 'TODAS'}`);
    console.log(`   Modules: ${modules.length > 0 ? modules.join(', ') : 'TODOS'}`);
    console.log(`   User: ${req.user.username} (${req.user.role})`);

    // Validar que el usuario tiene permisos
    if (req.user.role !== 'admin' && req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden ejecutar E2E Advanced Testing'
      });
    }

    const orch = getOrchestrator();

    // Determinar método de ejecución según mode
    let result;
    let executionMode;

    switch (mode) {
      case 'full':
        // Suite completo (todas las fases)
        executionMode = 'full';
        result = await orch.runFullSuite({
          modules,
          parallel,
          headless,
          userId: req.user.id,
          companyId
        });
        break;

      case 'phases':
        // Fases específicas
        if (phases.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Debe especificar al menos una fase cuando mode = "phases"'
          });
        }
        executionMode = 'phases';
        result = await orch.run({
          phases,
          modules,
          parallel,
          headless,
          userId: req.user.id,
          companyId
        });
        break;

      case 'modules':
        // Módulos específicos (todas las fases)
        if (modules.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Debe especificar al menos un módulo cuando mode = "modules"'
          });
        }
        executionMode = 'modules';
        result = await orch.runFullSuite({
          modules,
          parallel,
          headless,
          userId: req.user.id,
          companyId
        });
        break;

      case 'custom':
        // Combinación custom de fases y módulos
        executionMode = 'custom';
        result = await orch.run({
          phases: phases.length > 0 ? phases : undefined,  // undefined = todas
          modules,
          parallel,
          headless,
          userId: req.user.id,
          companyId
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Mode inválido: ${mode}. Use: full, phases, modules, custom`
        });
    }

    // Persistir ejecución en BD (async, no blocking)
    persistExecution(result, executionMode, req.user.id, companyId).catch(err => {
      console.error('❌ [API] Error persistiendo ejecución:', err);
    });

    // Respuesta inmediata
    res.json({
      success: true,
      executionId: result.executionId,
      message: 'Ejecución completada exitosamente',
      mode: executionMode,
      phases: result.phasesExecuted || [],
      modules: modules.length > 0 ? modules : 'TODOS',
      summary: {
        totalTests: result.aggregated?.summary?.totalTests || 0,
        testsPassed: result.aggregated?.summary?.testsPassed || 0,
        testsFailed: result.aggregated?.summary?.testsFailed || 0,
        duration: result.duration || 0
      },
      confidenceScore: result.confidenceScore,
      productionReady: result.productionReady
    });

  } catch (error) {
    console.error('❌ [API] Error ejecutando tests:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/e2e-advanced/status
 * Obtiene estado de ejecución actual
 *
 * Response:
 * {
 *   running: true,
 *   executionId: 'uuid',
 *   currentPhase: 'load',
 *   progress: 45,
 *   startedAt: '2025-01-07T10:00:00Z',
 *   estimatedCompletion: '2025-01-07T10:45:00Z'
 * }
 */
router.get('/status', auth, async (req, res) => {
  try {
    const orch = getOrchestrator();
    const status = orch.getStatus();

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('❌ [API] Error obteniendo estado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/e2e-advanced/executions
 * Obtiene historial de ejecuciones
 *
 * Query params:
 * - limit: Número de resultados (default: 20, max: 100)
 * - offset: Offset para paginación (default: 0)
 * - status: Filtrar por status (passed, failed, running)
 * - companyId: Filtrar por empresa
 *
 * Response:
 * {
 *   success: true,
 *   executions: [...],
 *   total: 150,
 *   limit: 20,
 *   offset: 0
 * }
 */
router.get('/executions', auth, async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      status,
      companyId
    } = req.query;

    // Validar límite
    const validLimit = Math.min(Math.max(parseInt(limit), 1), 100);
    const validOffset = Math.max(parseInt(offset), 0);

    // Construir where clause
    const where = {};
    if (status) where.status = status;
    if (companyId) where.company_id = companyId;

    // Query
    const { count, rows } = await E2EAdvancedExecution.findAndCountAll({
      where,
      limit: validLimit,
      offset: validOffset,
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'execution_id',
        'status',
        'mode',
        'phases_executed',
        'modules_tested',
        'total_tests',
        'tests_passed',
        'tests_failed',
        'overall_score',
        'production_ready',
        'duration',
        'created_at',
        'completed_at'
      ]
    });

    res.json({
      success: true,
      executions: rows,
      total: count,
      limit: validLimit,
      offset: validOffset
    });

  } catch (error) {
    console.error('❌ [API] Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/e2e-advanced/executions/:id
 * Obtiene detalles completos de ejecución
 *
 * Response:
 * {
 *   success: true,
 *   execution: { ... },
 *   results: [ ... ],   // Resultados detallados por test
 *   confidence: { ... }  // Confidence score breakdown
 * }
 */
router.get('/executions/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener ejecución
    const execution = await E2EAdvancedExecution.findOne({
      where: {
        [Op.or]: [
          { id: id },
          { execution_id: id }
        ]
      }
    });

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Ejecución no encontrada'
      });
    }

    // Obtener resultados detallados
    const results = await TestResultDetailed.findAll({
      where: { execution_id: execution.execution_id },
      order: [['phase_name', 'ASC'], ['module_name', 'ASC']]
    });

    // Obtener confidence score
    const confidence = await ConfidenceScore.findOne({
      where: { execution_id: execution.execution_id }
    });

    res.json({
      success: true,
      execution,
      results,
      confidence
    });

  } catch (error) {
    console.error('❌ [API] Error obteniendo detalles:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/e2e-advanced/confidence/:id
 * Obtiene confidence score de ejecución
 *
 * Response:
 * {
 *   success: true,
 *   confidence: {
 *     overall: 95.3,
 *     e2e: 98.5,
 *     load: 92.0,
 *     security: 96.0,
 *     multiTenant: 100.0,
 *     database: 94.0,
 *     monitoring: 90.0,
 *     edgeCases: 88.0,
 *     productionReady: true,
 *     level: 'production',
 *     blockers: []
 *   }
 * }
 */
router.get('/confidence/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar execution
    const execution = await E2EAdvancedExecution.findOne({
      where: {
        [Op.or]: [
          { id: id },
          { execution_id: id }
        ]
      }
    });

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Ejecución no encontrada'
      });
    }

    // Obtener confidence score
    const confidence = await ConfidenceScore.findOne({
      where: { execution_id: execution.execution_id }
    });

    if (!confidence) {
      return res.status(404).json({
        success: false,
        error: 'Confidence score no encontrado'
      });
    }

    res.json({
      success: true,
      confidence: {
        overall: confidence.overall_score,
        e2e: confidence.e2e_score,
        load: confidence.load_score,
        security: confidence.security_score,
        multiTenant: confidence.multi_tenant_score,
        database: confidence.database_score,
        monitoring: confidence.monitoring_score,
        edgeCases: confidence.edge_cases_score,
        productionReady: confidence.production_ready,
        level: confidence.confidence_level,
        blockers: confidence.blockers || []
      }
    });

  } catch (error) {
    console.error('❌ [API] Error obteniendo confidence score:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/e2e-advanced/executions/:id
 * Cancela ejecución en curso (si está running)
 *
 * Response:
 * {
 *   success: true,
 *   message: 'Ejecución cancelada'
 * }
 */
router.delete('/executions/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validar permisos
    if (req.user.role !== 'admin' && req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden cancelar ejecuciones'
      });
    }

    const orch = getOrchestrator();
    const status = orch.getStatus();

    // Verificar que la ejecución existe y está running
    if (!status.running || status.executionId !== id) {
      return res.status(400).json({
        success: false,
        error: 'Ejecución no está en curso o ID inválido'
      });
    }

    // Cancelar ejecución
    await orch.cancel();

    res.json({
      success: true,
      message: 'Ejecución cancelada exitosamente'
    });

  } catch (error) {
    console.error('❌ [API] Error cancelando ejecución:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/e2e-advanced/phases
 * Obtiene lista de fases disponibles
 *
 * Response:
 * {
 *   success: true,
 *   phases: [
 *     { name: 'e2e', description: '...', weight: 0.25 },
 *     { name: 'load', description: '...', weight: 0.15 },
 *     ...
 *   ]
 * }
 */
router.get('/phases', auth, async (req, res) => {
  try {
    const orch = getOrchestrator();
    const phases = orch.getAvailablePhases();

    res.json({
      success: true,
      phases
    });

  } catch (error) {
    console.error('❌ [API] Error obteniendo fases:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/e2e-advanced/modules
 * Obtiene lista de módulos disponibles
 *
 * Response:
 * {
 *   success: true,
 *   modules: ['users', 'attendance', 'departments', ...],
 *   total: 72
 * }
 */
router.get('/modules', auth, async (req, res) => {
  try {
    // Leer modules-registry.json
    const path = require('path');
    const registryPath = path.join(__dirname, '../../../auditor/registry/modules-registry.json');
    const registry = require(registryPath);

    const modules = Object.keys(registry.modules || {});

    res.json({
      success: true,
      modules,
      total: modules.length
    });

  } catch (error) {
    console.error('❌ [API] Error obteniendo módulos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Persiste ejecución en base de datos
 * @private
 */
async function persistExecution(result, mode, userId, companyId) {
  try {
    const {
      executionId,
      aggregated,
      confidenceScore,
      productionReady,
      duration,
      phasesExecuted
    } = result;

    // 1. Crear registro de ejecución
    await E2EAdvancedExecution.create({
      execution_id: executionId,
      status: productionReady ? 'passed' : (confidenceScore?.overall >= 70 ? 'warning' : 'failed'),
      mode,
      phases_executed: phasesExecuted || [],
      modules_tested: aggregated?.summary?.modulesToTest || [],
      total_tests: aggregated?.summary?.totalTests || 0,
      tests_passed: aggregated?.summary?.testsPassed || 0,
      tests_failed: aggregated?.summary?.testsFailed || 0,
      tests_skipped: aggregated?.summary?.testsSkipped || 0,
      overall_score: confidenceScore?.overall || 0,
      production_ready: productionReady,
      duration,
      user_id: userId,
      company_id: companyId,
      completed_at: new Date()
    });

    // 2. Crear confidence score
    if (confidenceScore) {
      await ConfidenceScore.create({
        execution_id: executionId,
        overall_score: confidenceScore.overall,
        e2e_score: confidenceScore.e2e,
        load_score: confidenceScore.load,
        security_score: confidenceScore.security,
        multi_tenant_score: confidenceScore.multiTenant,
        database_score: confidenceScore.database,
        monitoring_score: confidenceScore.monitoring,
        edge_cases_score: confidenceScore.edgeCases,
        production_ready: confidenceScore.productionReady,
        confidence_level: confidenceScore.level,
        blockers: confidenceScore.blockers || []
      });
    }

    // 3. Crear resultados detallados (por fase/módulo)
    if (aggregated?.phases) {
      const detailedResults = [];

      for (const [phaseName, phaseData] of Object.entries(aggregated.phases)) {
        // Si hay breakdown por módulo
        if (phaseData.modules) {
          for (const [moduleName, moduleData] of Object.entries(phaseData.modules)) {
            detailedResults.push({
              execution_id: executionId,
              phase_name: phaseName,
              module_name: moduleName,
              status: moduleData.status || 'unknown',
              tests_passed: moduleData.passed || 0,
              tests_failed: moduleData.failed || 0,
              tests_skipped: moduleData.skipped || 0,
              duration: moduleData.duration || 0,
              error_message: moduleData.error || null
            });
          }
        } else {
          // Sin breakdown por módulo
          detailedResults.push({
            execution_id: executionId,
            phase_name: phaseName,
            module_name: null,
            status: phaseData.status || 'unknown',
            tests_passed: phaseData.passed || 0,
            tests_failed: phaseData.failed || 0,
            tests_skipped: phaseData.skipped || 0,
            duration: phaseData.duration || 0,
            error_message: phaseData.error || null
          });
        }
      }

      if (detailedResults.length > 0) {
        await TestResultDetailed.bulkCreate(detailedResults);
      }
    }

    console.log(`✅ [API] Ejecución ${executionId} persistida en BD`);

  } catch (error) {
    console.error('❌ [API] Error persistiendo ejecución:', error);
    throw error;
  }
}

module.exports = router;
