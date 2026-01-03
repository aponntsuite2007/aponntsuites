/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNAPSE CENTRAL ROUTES - API REST para el Sistema Nervioso Central
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Endpoints:
 *   GET  /api/synapse/status           - Estado del sistema
 *   GET  /api/synapse/history          - Historial de ejecuciones
 *   GET  /api/synapse/modules          - Módulos filtrados
 *   GET  /api/synapse/categories       - Categorías por rubro
 *   GET  /api/synapse/dependencies     - Dependencias entre tests
 *   POST /api/synapse/run              - Ejecutar suite de tests
 *   POST /api/synapse/assign-rubro     - Asignar rubro a módulo
 *   GET  /api/synapse/chart-data/:id   - Datos para gráfico tiempo real
 *
 * @version 1.0.0
 * @date 2026-01-01
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const synapseCentralHub = require('../synapse/SynapseCentralHub');

// ============================================================================
// GET /api/synapse/status
// Estado general del sistema SYNAPSE
// ============================================================================
router.get('/status', (req, res) => {
  try {
    const status = synapseCentralHub.getStatus();
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/synapse/history
// Historial de ejecuciones
// ============================================================================
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = synapseCentralHub.getHistory(limit);
    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/synapse/modules
// Módulos filtrados por panel, tipo, rubro
// ============================================================================
router.get('/modules', async (req, res) => {
  try {
    const { panel, tipo, rubro } = req.query;
    const modules = await synapseCentralHub.getModulesFiltered({ panel, tipo, rubro });
    res.json({
      success: true,
      filters: { panel, tipo, rubro },
      count: modules.length,
      modules
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/synapse/categories
// Categorías de módulos por rubro
// ============================================================================
router.get('/categories', (req, res) => {
  try {
    const categories = synapseCentralHub.getModuleCategories();
    res.json({
      success: true,
      categories,
      rubros: Object.keys(categories)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/synapse/dependencies
// Dependencias entre tests
// ============================================================================
router.get('/dependencies', (req, res) => {
  try {
    const dependencies = synapseCentralHub.getDependencies();
    res.json({
      success: true,
      dependencies
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/synapse/run
// Ejecutar suite de tests
// ============================================================================
router.post('/run', async (req, res) => {
  try {
    const {
      tests = ['e2e-functional'],
      modules = null,
      panel = null,
      tipo = null,
      rubro = null,
      stopOnFailure = false,
      autoFix = true,
      maxRetries = 3
    } = req.body;

    // Validar tests
    const validTests = ['e2e-functional', 'security', 'load-testing', 'chaos', 'enterprise-stress', 'database', 'multi-tenant'];
    const invalidTests = tests.filter(t => !validTests.includes(t));
    if (invalidTests.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Tests inválidos: ${invalidTests.join(', ')}`,
        validTests
      });
    }

    // Ejecutar en background
    const executionId = `exec-${Date.now()}`;

    // Responder inmediatamente con el ID
    res.json({
      success: true,
      message: 'Suite de tests iniciada',
      executionId,
      tests,
      filters: { modules, panel, tipo, rubro }
    });

    // Ejecutar async
    synapseCentralHub.runTestSuite({
      tests,
      modules,
      panel,
      tipo,
      rubro,
      stopOnFailure,
      autoFix,
      maxRetries
    }).then(result => {
      console.log(`✅ [SYNAPSE] Suite ${executionId} completada`);
    }).catch(error => {
      console.error(`❌ [SYNAPSE] Suite ${executionId} falló:`, error.message);
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/synapse/assign-rubro
// Asignar rubro a un módulo
// ============================================================================
router.post('/assign-rubro', (req, res) => {
  try {
    const { moduleKey, rubro } = req.body;

    if (!moduleKey || !rubro) {
      return res.status(400).json({
        success: false,
        error: 'moduleKey y rubro son requeridos'
      });
    }

    const result = synapseCentralHub.assignRubroToModule(moduleKey, rubro);
    res.json({
      success: true,
      message: `Módulo '${moduleKey}' asignado a rubro '${rubro}'`,
      categories: synapseCentralHub.getModuleCategories()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/synapse/chart-data/:id
// Datos para gráfico tiempo real de una ejecución
// ============================================================================
router.get('/chart-data/:id', (req, res) => {
  try {
    const { id } = req.params;
    const history = synapseCentralHub.getHistory(100);
    const execution = history.find(h => h.executionId === id);

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: `Ejecución ${id} no encontrada`
      });
    }

    res.json({
      success: true,
      executionId: id,
      chartData: execution.chartData || [],
      summary: execution.summary
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/synapse/test-types
// Tipos de tests disponibles
// ============================================================================
router.get('/test-types', (req, res) => {
  res.json({
    success: true,
    testTypes: [
      { id: 'e2e-functional', name: 'E2E Functional', description: 'Tests funcionales de módulos', status: 'implemented' },
      { id: 'security', name: 'Security Testing', description: 'OWASP Top 10, inyección, XSS', status: 'implemented' },
      { id: 'load-testing', name: 'Load Testing', description: 'Pruebas de carga y rendimiento', status: 'implemented' },
      { id: 'chaos', name: 'Chaos Testing', description: 'Pruebas de caos y resiliencia', status: 'implemented' },
      { id: 'enterprise-stress', name: 'Enterprise Stress', description: 'Stress test para 100k+ usuarios', status: 'implemented' },
      { id: 'database', name: 'Database Integrity', description: 'Integridad de datos y FK', status: 'implemented' },
      { id: 'multi-tenant', name: 'Multi-Tenant Isolation', description: 'Aislamiento entre empresas', status: 'implemented' }
    ]
  });
});

// ============================================================================
// GET /api/synapse/panels
// Paneles disponibles (Nivel 1 de filtrado)
// ============================================================================
router.get('/panels', (req, res) => {
  res.json({
    success: true,
    panels: [
      { id: 'panel-empresa', name: 'Panel Empresa', description: 'Módulos para empresas' },
      { id: 'panel-administrativo', name: 'Panel Administrativo', description: 'Módulos de administración APONNT' },
      { id: 'panel-asociados', name: 'Panel Asociados', description: 'Módulos para partners/asociados' }
    ]
  });
});

// ============================================================================
// GET /api/synapse/tipos
// Tipos de módulos (Nivel 2 de filtrado)
// ============================================================================
router.get('/tipos', (req, res) => {
  res.json({
    success: true,
    tipos: [
      { id: 'CORE', name: 'CORE', description: 'Módulos esenciales incluidos en licencia base' },
      { id: 'Comercial', name: 'Comercial', description: 'Módulos adicionales de pago' }
    ]
  });
});

// ============================================================================
// GET /api/synapse/rubros
// Rubros disponibles (Nivel 3 de filtrado)
// ============================================================================
router.get('/rubros', (req, res) => {
  const categories = synapseCentralHub.getModuleCategories();
  const rubros = Object.entries(categories).map(([rubro, modules]) => ({
    id: rubro,
    name: rubro,
    moduleCount: modules.length,
    modules
  }));

  res.json({
    success: true,
    rubros
  });
});

module.exports = router;
