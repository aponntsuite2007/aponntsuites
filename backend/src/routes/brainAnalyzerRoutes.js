/**
 * ============================================================================
 * BRAIN ANALYZER ROUTES - API del Analizador Avanzado del Brain
 * ============================================================================
 *
 * Endpoints para análisis avanzado de código:
 * - Dependencias entre módulos
 * - Código muerto
 * - Integración Git
 * - Complejidad ciclomática
 * - Generación de tests
 * - Contract testing
 * - Security scan
 * - Dashboard de salud
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const BrainAdvancedAnalyzer = require('../services/BrainAdvancedAnalyzer');

let analyzer = null;

/**
 * Middleware para inicializar el analizador
 */
router.use((req, res, next) => {
  if (!analyzer) {
    const brainService = req.app.get('brainService');
    if (brainService) {
      analyzer = new BrainAdvancedAnalyzer(brainService);
      console.log('🔬 [BRAIN-ANALYZER] Analizador avanzado inicializado');
    }
  }
  next();
});

/**
 * GET /api/brain-analyzer/status
 * Estado del analizador
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      initialized: !!analyzer,
      brainConnected: !!analyzer?.brainService,
      capabilities: [
        'dependency-analysis',
        'dead-code-detection',
        'git-integration',
        'complexity-analysis',
        'test-generation',
        'contract-testing',
        'security-scan',
        'health-dashboard'
      ],
      version: '1.0.0'
    }
  });
});

// ============================================================================
// 1. ANÁLISIS DE DEPENDENCIAS
// ============================================================================

/**
 * GET /api/brain-analyzer/dependencies
 * Construye el grafo completo de dependencias
 */
router.get('/dependencies', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado - Brain Service no disponible'
      });
    }

    console.log('\n🔗 [API] Construyendo grafo de dependencias...');
    const graph = await analyzer.buildDependencyGraph();

    res.json({
      success: true,
      data: {
        totalFiles: graph.size,
        graph: Object.fromEntries(graph),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`❌ Error en dependencias: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain-analyzer/dependencies/:module
 * Dependencias de un módulo específico
 */
router.get('/dependencies/:module', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    const { module } = req.params;
    console.log(`\n🔗 [API] Analizando dependencias de: ${module}`);

    const deps = await analyzer.getModuleDependencies(module);

    res.json({
      success: true,
      data: deps
    });
  } catch (error) {
    console.error(`❌ Error en dependencias del módulo: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 2. CÓDIGO MUERTO
// ============================================================================

/**
 * GET /api/brain-analyzer/dead-code
 * Detecta archivos y funciones sin uso
 */
router.get('/dead-code', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    console.log('\n💀 [API] Buscando código muerto...');
    const deadCode = await analyzer.findDeadCode();

    res.json({
      success: true,
      data: deadCode
    });
  } catch (error) {
    console.error(`❌ Error detectando código muerto: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 3. INTEGRACIÓN GIT
// ============================================================================

/**
 * GET /api/brain-analyzer/git/changes
 * Cambios recientes en el repositorio
 */
router.get('/git/changes', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    const days = parseInt(req.query.days) || 7;
    console.log(`\n📊 [API] Obteniendo cambios de los últimos ${days} días...`);

    const changes = await analyzer.getRecentChanges(days);

    res.json({
      success: true,
      data: changes
    });
  } catch (error) {
    console.error(`❌ Error obteniendo cambios git: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain-analyzer/git/risk-priority
 * Priorización de testing basada en riesgo (cambios + dependencias)
 */
router.get('/git/risk-priority', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    const days = parseInt(req.query.days) || 7;
    console.log(`\n🎯 [API] Calculando prioridad de testing por riesgo...`);

    const priority = await analyzer.prioritizeTestingByRisk(days);

    res.json({
      success: true,
      data: priority
    });
  } catch (error) {
    console.error(`❌ Error calculando prioridad: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 4. COMPLEJIDAD CICLOMÁTICA
// ============================================================================

/**
 * GET /api/brain-analyzer/complexity
 * Análisis de complejidad de todo el código
 */
router.get('/complexity', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    console.log('\n📐 [API] Analizando complejidad ciclomática...');
    const complexity = await analyzer.analyzeAllComplexity();

    res.json({
      success: true,
      data: complexity
    });
  } catch (error) {
    console.error(`❌ Error analizando complejidad: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain-analyzer/complexity/:filePath
 * Complejidad de un archivo específico
 */
router.get('/complexity/:filePath(*)', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    const { filePath } = req.params;
    console.log(`\n📐 [API] Analizando complejidad de: ${filePath}`);

    const complexity = await analyzer.analyzeComplexity(filePath);

    res.json({
      success: true,
      data: complexity
    });
  } catch (error) {
    console.error(`❌ Error analizando complejidad: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 5. AUTO-GENERACIÓN DE TESTS
// ============================================================================

/**
 * POST /api/brain-analyzer/generate-tests/:module
 * Genera tests automáticos para un módulo
 */
router.post('/generate-tests/:module', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    const { module } = req.params;
    console.log(`\n🧪 [API] Generando tests para: ${module}`);

    const tests = await analyzer.generateTestsFor(module);

    res.json({
      success: true,
      data: tests
    });
  } catch (error) {
    console.error(`❌ Error generando tests: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 6. CONTRACT TESTING
// ============================================================================

/**
 * POST /api/brain-analyzer/contract/snapshot
 * Captura snapshot de contrato de API
 */
router.post('/contract/snapshot', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    const { endpoint, method = 'GET', body = null } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint requerido'
      });
    }

    console.log(`\n📸 [API] Capturando contrato: ${method} ${endpoint}`);

    const snapshot = await analyzer.captureContractSnapshot(endpoint, method, body);

    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    console.error(`❌ Error capturando contrato: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/brain-analyzer/contract/compare
 * Compara respuesta actual con contrato guardado
 */
router.post('/contract/compare', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    const { endpoint, method = 'GET', body = null } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint requerido'
      });
    }

    console.log(`\n🔍 [API] Comparando contrato: ${method} ${endpoint}`);

    const comparison = await analyzer.compareWithContract(endpoint, method, body);

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error(`❌ Error comparando contrato: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain-analyzer/contracts
 * Lista todos los contratos guardados
 */
router.get('/contracts', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    const contracts = analyzer.contractSnapshots || new Map();

    res.json({
      success: true,
      data: {
        total: contracts.size,
        contracts: Object.fromEntries(contracts)
      }
    });
  } catch (error) {
    console.error(`❌ Error listando contratos: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 7. SECURITY SCAN
// ============================================================================

/**
 * GET /api/brain-analyzer/security
 * Ejecuta scan de seguridad completo
 */
router.get('/security', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    console.log('\n🛡️ [API] Ejecutando security scan...');
    const securityReport = await analyzer.runSecurityScan();

    res.json({
      success: true,
      data: securityReport
    });
  } catch (error) {
    console.error(`❌ Error en security scan: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 8. HEALTH DASHBOARD
// ============================================================================

/**
 * GET /api/brain-analyzer/health
 * Dashboard completo de salud del sistema
 */
router.get('/health', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    console.log('\n📊 [API] Generando dashboard de salud...');
    const health = await analyzer.getHealthDashboard();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error(`❌ Error generando dashboard: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain-analyzer/health/quick
 * Check rápido de salud (sin análisis profundo)
 */
router.get('/health/quick', async (req, res) => {
  try {
    const status = {
      analyzer: !!analyzer,
      brainConnected: !!analyzer?.brainService,
      timestamp: new Date().toISOString()
    };

    if (analyzer?.brainService) {
      try {
        const backendFiles = await analyzer.brainService.scanBackendFiles();
        status.backendFilesScanned = backendFiles?.categories ?
          Object.values(backendFiles.categories).reduce((sum, cat) => sum + (cat.files?.length || 0), 0) : 0;
      } catch (e) {
        status.backendFilesScanned = 0;
      }
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ANÁLISIS COMPLETO (COMBINADO)
// ============================================================================

/**
 * GET /api/brain-analyzer/full-analysis
 * Ejecuta TODOS los análisis y devuelve reporte completo
 */
router.get('/full-analysis', async (req, res) => {
  try {
    if (!analyzer) {
      return res.status(503).json({
        success: false,
        error: 'Analizador no inicializado'
      });
    }

    console.log('\n🔬 [API] Ejecutando análisis COMPLETO del sistema...');
    const startTime = Date.now();

    // Ejecutar todos los análisis en paralelo donde sea posible
    // Nota: Algunos métodos son síncronos, los envolvemos en Promise.resolve()
    const safePromise = (fn) => {
      try {
        const result = fn();
        return result instanceof Promise ? result.catch(e => ({ error: e.message })) : Promise.resolve(result);
      } catch (e) {
        return Promise.resolve({ error: e.message });
      }
    };

    const [
      dependencies,
      deadCode,
      gitChanges,
      complexity,
      security,
      health
    ] = await Promise.all([
      safePromise(() => analyzer.buildDependencyGraph()),
      safePromise(() => analyzer.findDeadCode()),
      safePromise(() => analyzer.getRecentChanges(7)),
      safePromise(() => analyzer.analyzeAllComplexity()),
      safePromise(() => analyzer.runSecurityScan()),
      safePromise(() => analyzer.getHealthDashboard())
    ]);

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        summary: {
          analysisTime: `${duration}ms`,
          timestamp: new Date().toISOString(),
          analyzedComponents: 6
        },
        dependencies: dependencies instanceof Map ? {
          totalFiles: dependencies.size,
          graph: Object.fromEntries(dependencies)
        } : dependencies,
        deadCode,
        gitChanges,
        complexity,
        security,
        health
      }
    });
  } catch (error) {
    console.error(`❌ Error en análisis completo: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
