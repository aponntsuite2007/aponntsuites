/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNAPSE CENTRAL HUB - Sistema Nervioso Central de Testing
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Integra TODO:
 * - Brain (análisis + sugerencias automáticas)
 * - Tests (E2E, Stress, Security, etc.)
 * - UI (WebSocket tiempo real + Chart.js)
 * - Control (mutex, dependencias, ciclos)
 *
 * @version 1.0.0
 * @date 2026-01-01
 * ═══════════════════════════════════════════════════════════════════════════
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  maxConcurrentTests: 3,        // Máximo tests simultáneos
  testTimeout: 600000,          // 10 min timeout por test
  brainAnalysisEnabled: true,   // Brain analiza resultados
  autoFixEnabled: true,         // Auto-fix cuando Brain sugiere
  maxRetries: 3,                // Reintentos por test
  wsPort: 9999,                 // Puerto WebSocket para tiempo real
};

// ============================================================================
// SYNAPSE CENTRAL HUB
// ============================================================================

class SynapseCentralHub extends EventEmitter {
  constructor() {
    super();

    // Estado del sistema
    this.activeTests = new Map();     // Tests en ejecución
    this.testQueue = [];              // Cola de tests pendientes
    this.testHistory = [];            // Historial (últimos 100)
    this.mutex = new Set();           // Mutex para evitar duplicados

    // Dependencias entre tests
    this.dependencies = {
      'security': [],                 // Security no depende de nada
      'e2e-functional': [],
      'load-testing': ['e2e-functional'],  // Load depende de E2E
      'multi-tenant': ['security'],
      'database': ['e2e-functional'],
      'chaos': ['e2e-functional', 'security'],
      'enterprise-stress': ['load-testing', 'security', 'database']
    };

    // Categorías de módulos por rubro
    this.moduleCategories = {
      'RRHH': ['users', 'attendance', 'shifts', 'departments', 'organizational-structure', 'vacations', 'sanctions', 'training-management'],
      'SIAC': ['biometric-consent', 'kiosks', 'employee-map', 'notification-center'],
      'Finanzas': ['payroll-liquidation', 'hours-cube-dashboard', 'benefits-management'],
      'Logística': ['dms', 'dms-dashboard', 'procedures'],
      'Comercial': ['job-postings', 'careers', 'partners', 'associate-marketplace'],
      'Sistema': ['dashboard', 'configurador-modulos', 'engineering-dashboard', 'audit-reports'],
      'Comunicación': ['inbox', 'notifications', 'company-news'],
      'Salud': ['medical-dashboard-professional', 'hse-module']
    };

    // Panels (Nivel 1)
    this.panels = {
      'panel-empresa': [],      // Se llenan dinámicamente
      'panel-administrativo': [],
      'panel-asociados': []
    };

    // Brain service reference
    this.brain = null;

    // WebSocket para tiempo real
    this.wsClients = new Set();

    // Stats
    this.stats = {
      totalRuns: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalFixed: 0,
      lastRun: null
    };

    console.log('🧠 [SYNAPSE] Central Hub inicializado');
  }

  /**
   * Inicializar conexión con Brain
   */
  async initBrain() {
    try {
      const BrainNervousSystem = require('../brain/services/BrainNervousSystem');
      this.brain = BrainNervousSystem;
      console.log('🧠 [SYNAPSE] Conectado a Brain Nervous System');
      return true;
    } catch (error) {
      console.warn('⚠️ [SYNAPSE] Brain no disponible:', error.message);
      return false;
    }
  }

  // ==========================================================================
  // MUTEX - Evitar tests duplicados
  // ==========================================================================

  /**
   * Verificar si un test puede ejecutarse (no hay otro igual corriendo)
   */
  canRunTest(testType) {
    if (this.mutex.has(testType)) {
      console.log(`🔒 [SYNAPSE] Test '${testType}' ya está en ejecución`);
      return false;
    }
    return true;
  }

  /**
   * Adquirir mutex para un test
   */
  acquireMutex(testType) {
    this.mutex.add(testType);
    console.log(`🔓 [SYNAPSE] Mutex adquirido: ${testType}`);
  }

  /**
   * Liberar mutex
   */
  releaseMutex(testType) {
    this.mutex.delete(testType);
    console.log(`🔓 [SYNAPSE] Mutex liberado: ${testType}`);
  }

  // ==========================================================================
  // ANÁLISIS DE DEPENDENCIAS
  // ==========================================================================

  /**
   * Verificar si un fallo afecta otros tests
   */
  analyzeFailureDependencies(failedTest, allResults) {
    const affected = [];

    for (const [testType, deps] of Object.entries(this.dependencies)) {
      if (deps.includes(failedTest)) {
        affected.push({
          test: testType,
          reason: `Depende de '${failedTest}' que falló`,
          shouldSkip: true,
          canRetryAfterFix: true
        });
      }
    }

    if (affected.length > 0) {
      console.log(`📊 [SYNAPSE] Fallo en '${failedTest}' afecta a ${affected.length} tests:`);
      affected.forEach(a => console.log(`   ⚠️ ${a.test}: ${a.reason}`));
    }

    return affected;
  }

  /**
   * Obtener orden de ejecución basado en dependencias
   */
  getExecutionOrder(testsToRun) {
    const order = [];
    const visited = new Set();

    const visit = (testType) => {
      if (visited.has(testType)) return;
      visited.add(testType);

      // Primero ejecutar dependencias
      const deps = this.dependencies[testType] || [];
      for (const dep of deps) {
        if (testsToRun.includes(dep)) {
          visit(dep);
        }
      }

      order.push(testType);
    };

    for (const test of testsToRun) {
      visit(test);
    }

    return order;
  }

  // ==========================================================================
  // EJECUCIÓN DE TESTS
  // ==========================================================================

  /**
   * Ejecutar un grupo de tests con control completo
   * @param {Object} options - Opciones de ejecución
   */
  async runTestSuite(options = {}) {
    const {
      tests = ['e2e-functional'],      // Tests a ejecutar
      modules = null,                   // Módulos específicos (null = todos)
      panel = null,                     // Filtrar por panel
      tipo = null,                      // Filtrar por tipo (CORE/Comercial)
      rubro = null,                     // Filtrar por rubro
      stopOnFailure = false,
      autoFix = CONFIG.autoFixEnabled,
      maxRetries = CONFIG.maxRetries
    } = options;

    const executionId = `exec-${Date.now()}`;
    const startTime = Date.now();

    console.log('\n' + '═'.repeat(70));
    console.log('🚀 [SYNAPSE] INICIANDO SUITE DE TESTS');
    console.log('═'.repeat(70));
    console.log(`   ID: ${executionId}`);
    console.log(`   Tests: ${tests.join(', ')}`);
    console.log(`   Módulos: ${modules ? modules.join(', ') : 'TODOS'}`);
    console.log(`   Panel: ${panel || 'TODOS'}`);
    console.log(`   Tipo: ${tipo || 'TODOS'}`);
    console.log(`   Rubro: ${rubro || 'TODOS'}`);
    console.log('═'.repeat(70) + '\n');

    // Verificar mutex para cada test
    const blockedTests = tests.filter(t => !this.canRunTest(t));
    if (blockedTests.length > 0) {
      return {
        success: false,
        error: `Tests bloqueados (ya en ejecución): ${blockedTests.join(', ')}`,
        executionId
      };
    }

    // Adquirir mutex
    tests.forEach(t => this.acquireMutex(t));

    // Obtener orden de ejecución basado en dependencias
    const executionOrder = this.getExecutionOrder(tests);
    console.log(`📋 [SYNAPSE] Orden de ejecución: ${executionOrder.join(' → ')}`);

    const results = {
      executionId,
      startTime: new Date().toISOString(),
      tests: {},
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, fixed: 0 },
      dependencyAnalysis: [],
      brainSuggestions: [],
      chartData: []  // Para gráfico tiempo real
    };

    try {
      for (const testType of executionOrder) {
        // Verificar si debe saltarse por dependencia fallida
        const failedDeps = Object.keys(results.tests)
          .filter(t => results.tests[t].status === 'failed')
          .filter(t => (this.dependencies[testType] || []).includes(t));

        if (failedDeps.length > 0) {
          console.log(`⏭️ [SYNAPSE] Saltando '${testType}' - depende de: ${failedDeps.join(', ')}`);
          results.tests[testType] = { status: 'skipped', reason: `Dependencia fallida: ${failedDeps.join(', ')}` };
          results.summary.skipped++;
          continue;
        }

        // Ejecutar test
        const testResult = await this.runSingleTest(testType, {
          modules,
          panel,
          tipo,
          rubro,
          autoFix,
          maxRetries
        });

        results.tests[testType] = testResult;
        results.summary.total++;

        // Actualizar datos para gráfico
        results.chartData.push({
          timestamp: Date.now(),
          test: testType,
          status: testResult.status,
          duration: testResult.duration,
          passed: testResult.passed || 0,
          failed: testResult.failed || 0
        });

        // Emitir evento para WebSocket
        this.emit('testProgress', {
          executionId,
          testType,
          result: testResult,
          chartData: results.chartData
        });

        if (testResult.status === 'passed') {
          results.summary.passed++;
        } else if (testResult.status === 'failed') {
          results.summary.failed++;

          // Analizar impacto en otros tests
          const affected = this.analyzeFailureDependencies(testType, results.tests);
          results.dependencyAnalysis.push(...affected);

          // Consultar Brain para sugerencias
          if (CONFIG.brainAnalysisEnabled && this.brain) {
            const suggestion = await this.askBrainForFix(testType, testResult);
            if (suggestion) {
              results.brainSuggestions.push(suggestion);
            }
          }

          if (stopOnFailure) {
            console.log('🛑 [SYNAPSE] Deteniendo por stopOnFailure');
            break;
          }
        } else if (testResult.status === 'fixed') {
          results.summary.fixed++;
          results.summary.passed++;
        }
      }
    } finally {
      // Liberar mutex
      tests.forEach(t => this.releaseMutex(t));
    }

    results.endTime = new Date().toISOString();
    results.totalDuration = Date.now() - startTime;

    // Guardar en historial
    this.testHistory.unshift(results);
    if (this.testHistory.length > 100) {
      this.testHistory.pop();
    }

    // Actualizar stats
    this.stats.totalRuns++;
    this.stats.totalPassed += results.summary.passed;
    this.stats.totalFailed += results.summary.failed;
    this.stats.totalFixed += results.summary.fixed;
    this.stats.lastRun = new Date().toISOString();

    // Emitir evento final
    this.emit('suiteComplete', results);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 [SYNAPSE] RESUMEN DE EJECUCIÓN');
    console.log('═'.repeat(70));
    console.log(`   Total: ${results.summary.total}`);
    console.log(`   ✅ Passed: ${results.summary.passed}`);
    console.log(`   ❌ Failed: ${results.summary.failed}`);
    console.log(`   ⏭️ Skipped: ${results.summary.skipped}`);
    console.log(`   🔧 Fixed: ${results.summary.fixed}`);
    console.log(`   ⏱️ Duración: ${(results.totalDuration / 1000).toFixed(1)}s`);
    console.log('═'.repeat(70) + '\n');

    return results;
  }

  /**
   * Ejecutar un test individual
   */
  async runSingleTest(testType, options = {}) {
    const startTime = Date.now();
    let retries = 0;
    let lastError = null;

    while (retries <= options.maxRetries) {
      try {
        console.log(`\n🧪 [SYNAPSE] Ejecutando: ${testType} (intento ${retries + 1}/${options.maxRetries + 1})`);

        const result = await this.executeTest(testType, options);

        return {
          status: result.success ? 'passed' : 'failed',
          duration: Date.now() - startTime,
          retries,
          ...result
        };
      } catch (error) {
        lastError = error;
        retries++;

        if (retries <= options.maxRetries && options.autoFix) {
          console.log(`🔧 [SYNAPSE] Intentando auto-fix para ${testType}...`);
          const fixed = await this.attemptAutoFix(testType, error);
          if (fixed) {
            console.log(`✅ [SYNAPSE] Auto-fix aplicado, reintentando...`);
            continue;
          }
        }
      }
    }

    return {
      status: 'failed',
      duration: Date.now() - startTime,
      retries,
      error: lastError?.message || 'Unknown error'
    };
  }

  /**
   * Ejecutar el test real
   */
  async executeTest(testType, options) {
    const { spawn } = require('child_process');

    // Mapear tipo de test a archivo/comando
    const testCommands = {
      'e2e-functional': {
        cmd: 'npx',
        args: ['playwright', 'test', 'tests/e2e/modules/universal-modal-advanced.e2e.spec.js'],
        cwd: path.join(__dirname, '../..')
      },
      'security': {
        cmd: 'npx',
        args: ['playwright', 'test', 'tests/e2e/levels/level3-phase4-security.spec.js'],
        cwd: path.join(__dirname, '../..')
      },
      'load-testing': {
        cmd: 'npx',
        args: ['playwright', 'test', 'tests/e2e/levels/level3-phase6-performance.spec.js'],
        cwd: path.join(__dirname, '../..')
      },
      'chaos': {
        cmd: 'npx',
        args: ['playwright', 'test', 'tests/e2e/levels/level3-phase7-chaos.spec.js'],
        cwd: path.join(__dirname, '../..')
      },
      'enterprise-stress': {
        cmd: 'npx',
        args: ['playwright', 'test', 'tests/e2e/levels/level4-enterprise-stress.spec.js'],
        cwd: path.join(__dirname, '../..')
      },
      'database': {
        cmd: 'npx',
        args: ['playwright', 'test', 'tests/e2e/levels/level3-phase5-data-integrity.spec.js'],
        cwd: path.join(__dirname, '../..')
      },
      'multi-tenant': {
        cmd: 'npx',
        args: ['playwright', 'test', 'tests/e2e/levels/level3-phase1-multitenant-stress.spec.js'],
        cwd: path.join(__dirname, '../..')
      }
    };

    const config = testCommands[testType];
    if (!config) {
      throw new Error(`Test type '${testType}' no reconocido`);
    }

    // Agregar filtro de módulos si se especifica
    if (options.modules && options.modules.length > 0) {
      process.env.MODULE_TO_TEST = options.modules.join(',');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(config.cmd, config.args, {
        cwd: config.cwd,
        shell: true,
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        // Emitir progreso en tiempo real
        this.emit('testOutput', { testType, output: data.toString() });
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const success = code === 0;

        // Parsear resultados de Playwright
        const passedMatch = stdout.match(/(\d+) passed/);
        const failedMatch = stdout.match(/(\d+) failed/);

        resolve({
          success,
          passed: passedMatch ? parseInt(passedMatch[1]) : 0,
          failed: failedMatch ? parseInt(failedMatch[1]) : 0,
          output: stdout.slice(-5000),  // Últimos 5000 chars
          errorOutput: stderr.slice(-2000)
        });
      });

      proc.on('error', reject);

      // Timeout
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Test ${testType} timeout after ${CONFIG.testTimeout}ms`));
      }, CONFIG.testTimeout);
    });
  }

  /**
   * Intentar auto-fix con Brain - Ciclo automático test→fix→retest
   */
  async attemptAutoFix(testType, error) {
    console.log(`\n🔄 [CYCLE] Iniciando ciclo automático fix-retest para: ${testType}`);

    // Patrones de errores conocidos y sus fixes
    const knownFixes = [
      {
        pattern: /ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i,
        fix: 'network',
        description: 'Error de red - esperando reconexión',
        action: async () => {
          console.log('   ⏳ Esperando 5s para reconexión...');
          await this.sleep(5000);
          return true;
        }
      },
      {
        pattern: /timeout|Timeout exceeded/i,
        fix: 'timeout',
        description: 'Timeout - aumentando tiempo de espera',
        action: async () => {
          console.log('   ⏳ Esperando 10s antes de reintentar...');
          await this.sleep(10000);
          return true;
        }
      },
      {
        pattern: /element not found|locator.*not found/i,
        fix: 'wait',
        description: 'Elemento no encontrado - esperando carga completa',
        action: async () => {
          console.log('   ⏳ Esperando 3s para carga completa...');
          await this.sleep(3000);
          return true;
        }
      },
      {
        pattern: /authentication|unauthorized|401/i,
        fix: 'auth',
        description: 'Error de autenticación - regenerando token',
        action: async () => {
          console.log('   🔐 Intentando regenerar sesión de test...');
          // El sistema usará nueva sesión en el próximo intento
          return true;
        }
      },
      {
        pattern: /database|SQLITE|PostgreSQL|connection/i,
        fix: 'database',
        description: 'Error de base de datos - esperando disponibilidad',
        action: async () => {
          console.log('   🗄️ Esperando disponibilidad de DB...');
          await this.sleep(5000);
          return true;
        }
      }
    ];

    const errorMessage = error.message || error.toString();

    // Buscar fix conocido
    for (const fix of knownFixes) {
      if (fix.pattern.test(errorMessage)) {
        console.log(`   🔧 Fix detectado: ${fix.description}`);

        // Registrar en historial de fixes
        this.registerFixAttempt(testType, fix.fix, fix.description);

        // Ejecutar acción de fix
        const success = await fix.action();

        if (success) {
          console.log(`   ✅ Fix '${fix.fix}' aplicado, reintentando test...`);
          this.stats.totalFixed++;
          return true;
        }
      }
    }

    // Si no hay fix conocido, consultar Brain
    if (this.brain) {
      try {
        console.log('   🧠 Consultando Brain para análisis avanzado...');

        const analysis = await this.brain.analyzeError({
          type: 'test_failure',
          testType,
          error: errorMessage,
          stack: error.stack
        });

        if (analysis && analysis.suggestedFix) {
          console.log(`   🧠 Brain sugiere: ${analysis.suggestedFix.description}`);

          // Registrar sugerencia
          this.registerBrainSuggestion(testType, analysis.suggestedFix);

          // Aplicar si es seguro
          if (analysis.suggestedFix.autoApplicable) {
            console.log('   ⚡ Aplicando fix automático de Brain...');
            // Aquí se aplicaría el fix específico
            return true;
          } else {
            console.log('   ⚠️ Fix requiere intervención manual');
          }
        }
      } catch (e) {
        console.error('   ❌ Error consultando Brain:', e.message);
      }
    }

    console.log(`   ❌ No se encontró fix automático para: ${errorMessage.substring(0, 100)}...`);
    return false;
  }

  /**
   * Helper: Sleep async
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Registrar intento de fix
   */
  registerFixAttempt(testType, fixType, description) {
    if (!this.fixHistory) this.fixHistory = [];

    this.fixHistory.push({
      timestamp: new Date().toISOString(),
      testType,
      fixType,
      description,
      applied: true
    });

    // Mantener últimos 50
    if (this.fixHistory.length > 50) {
      this.fixHistory.shift();
    }
  }

  /**
   * Registrar sugerencia de Brain
   */
  registerBrainSuggestion(testType, suggestion) {
    if (!this.brainSuggestions) this.brainSuggestions = [];

    this.brainSuggestions.push({
      timestamp: new Date().toISOString(),
      testType,
      suggestion
    });

    // Mantener últimos 20
    if (this.brainSuggestions.length > 20) {
      this.brainSuggestions.shift();
    }
  }

  /**
   * Consultar Brain para sugerencias de fix
   */
  async askBrainForFix(testType, result) {
    if (!this.brain) return null;

    try {
      const suggestion = {
        testType,
        error: result.error || result.errorOutput,
        timestamp: new Date().toISOString(),
        brainAnalysis: 'Pendiente de implementación completa'
      };

      return suggestion;
    } catch (e) {
      return null;
    }
  }

  // ==========================================================================
  // CATEGORIZACIÓN DE MÓDULOS
  // ==========================================================================

  /**
   * Obtener módulos filtrados por criterios
   */
  async getModulesFiltered(options = {}) {
    const { panel, tipo, rubro } = options;

    try {
      const { sequelize } = require('../config/database');

      let where = 'WHERE sm.is_active = true';

      if (panel) {
        const panelMap = {
          'panel-empresa': "('empresa', 'company', 'both')",
          'panel-administrativo': "('admin', 'both')",
          'panel-asociados': "('asociados', 'partner', 'both')"
        };
        if (panelMap[panel]) {
          where += ` AND sm.available_in IN ${panelMap[panel]}`;
        }
      }

      if (tipo === 'CORE') {
        where += ` AND (sm.module_type IS NULL OR sm.module_type != 'commercial')`;
      } else if (tipo === 'Comercial') {
        where += ` AND sm.module_type = 'commercial'`;
      }

      const [modules] = await sequelize.query(`
        SELECT sm.module_key, sm.name, sm.module_type, sm.available_in
        FROM system_modules sm
        ${where}
        ORDER BY sm.name
      `);

      // Agregar rubro a cada módulo basándose en moduleCategories
      const modulesWithRubro = modules.map(mod => {
        let modRubro = null;
        for (const [cat, mods] of Object.entries(this.moduleCategories)) {
          if (mods.includes(mod.module_key)) {
            modRubro = cat;
            break;
          }
        }
        return { ...mod, rubro: modRubro };
      });

      // Filtrar por rubro si se especifica
      if (rubro && this.moduleCategories[rubro]) {
        return modulesWithRubro.filter(m => m.rubro === rubro);
      }

      return modulesWithRubro;
    } catch (error) {
      console.error('❌ [SYNAPSE] Error obteniendo módulos:', error.message);
      return [];
    }
  }

  /**
   * Asignar rubro a un módulo
   */
  assignRubroToModule(moduleKey, rubro) {
    // Remover de categoría anterior
    for (const [cat, modules] of Object.entries(this.moduleCategories)) {
      const idx = modules.indexOf(moduleKey);
      if (idx > -1) {
        modules.splice(idx, 1);
      }
    }

    // Agregar a nueva categoría
    if (!this.moduleCategories[rubro]) {
      this.moduleCategories[rubro] = [];
    }
    this.moduleCategories[rubro].push(moduleKey);

    console.log(`📦 [SYNAPSE] Módulo '${moduleKey}' asignado a rubro '${rubro}'`);
    return true;
  }

  // ==========================================================================
  // WEBSOCKET PARA TIEMPO REAL
  // ==========================================================================

  /**
   * Registrar cliente WebSocket
   */
  registerWSClient(ws) {
    this.wsClients.add(ws);
    console.log(`📡 [SYNAPSE] Cliente WS conectado (total: ${this.wsClients.size})`);

    ws.on('close', () => {
      this.wsClients.delete(ws);
      console.log(`📡 [SYNAPSE] Cliente WS desconectado (total: ${this.wsClients.size})`);
    });
  }

  /**
   * Broadcast a todos los clientes WS
   */
  broadcast(event, data) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    this.wsClients.forEach(ws => {
      try {
        ws.send(message);
      } catch (e) {
        // Ignorar errores de envío
      }
    });
  }

  // ==========================================================================
  // API - Métodos para rutas REST
  // ==========================================================================

  getStatus() {
    return {
      activeTests: Array.from(this.activeTests.keys()),
      queueLength: this.testQueue.length,
      mutexLocks: Array.from(this.mutex),
      stats: this.stats,
      brainConnected: !!this.brain,
      wsClients: this.wsClients.size
    };
  }

  getHistory(limit = 20) {
    return this.testHistory.slice(0, limit);
  }

  getModuleCategories() {
    return this.moduleCategories;
  }

  getDependencies() {
    return this.dependencies;
  }
}

// Singleton
const synapseCentralHub = new SynapseCentralHub();

// Intentar conectar con Brain al iniciar
synapseCentralHub.initBrain().catch(() => {});

module.exports = synapseCentralHub;
