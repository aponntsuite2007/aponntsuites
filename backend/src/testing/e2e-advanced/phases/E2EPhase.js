/**
 * E2EPhase - Wrapper del AutonomousQAAgent existente
 *
 * RESPONSABILIDADES:
 * - Integrar AutonomousQAAgent en sistema E2E Advanced
 * - Ejecutar tests funcionales (discovery + CRUD)
 * - Calcular score basado en éxito de tests
 *
 * HERRAMIENTAS:
 * - Playwright
 * - AutonomousQAAgent (sistema SYNAPSE existente)
 * - FrontendCollector V2
 *
 * @module E2EPhase
 * @version 2.0.0
 */

const PhaseInterface = require('./PhaseInterface');
const AutonomousQAAgent = require('../../AutonomousQAAgent');
const IterativeTestOrchestrator = require('../IterativeTestOrchestrator'); // ⭐ NUEVO
const path = require('path');
const fs = require('fs');

class E2EPhase extends PhaseInterface {
  constructor() {
    super();

    this.agent = null;
    this.iterativeOrchestrator = null; // ⭐ NUEVO: Orchestrator para modo iterativo
    this.results = {
      modules: {},
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }

  getName() {
    return 'e2e';
  }

  /**
   * Valida pre-requisitos para ejecutar E2E tests
   */
  async validate() {
    const errors = [];

    // Verificar que AutonomousQAAgent existe
    try {
      require('../AutonomousQAAgent');
    } catch (error) {
      errors.push('AutonomousQAAgent no encontrado - verificar backend/src/testing/AutonomousQAAgent.js');
    }

    // Verificar configs de módulos
    const configDir = path.join(__dirname, '../../tests/e2e/configs');
    if (!fs.existsSync(configDir)) {
      errors.push(`Directorio de configs no existe: ${configDir}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Setup antes de ejecutar tests
   */
  async setup(options) {
    console.log('🧪 [E2E] Inicializando AutonomousQAAgent...');

    // Configuración del agent
    const config = {
      headless: true,  // Ejecutar en modo headless para performance
      timeout: 60000,
      slowMo: 0,
      learningEnabled: true,
      brainIntegration: true,
      // ⭐ NUEVO: Inyectar dependencias para Brain integration
      systemRegistry: options.systemRegistry || null,
      brainService: options.brainService || null
    };

    try {
      this.agent = new AutonomousQAAgent(config);
      await this.agent.init();

      console.log('✅ [E2E] AutonomousQAAgent inicializado');

      // IMPORTANTE: Hacer login antes de ejecutar tests
      await this.agent.login({
        empresa: 'isi',
        usuario: 'admin',
        password: 'admin123'
      });

      console.log('✅ [E2E] Login completado exitosamente');

      // ⭐ NUEVO: Crear IterativeTestOrchestrator si modo iterativo está activo
      if (options.iterative && options.auditorEngine) {
        console.log('🔄 [E2E] Inicializando IterativeTestOrchestrator...');

        this.iterativeOrchestrator = new IterativeTestOrchestrator({
          agent: this.agent,
          auditorEngine: options.auditorEngine,
          systemRegistry: options.systemRegistry,
          brainService: options.brainService,
          maxCycles: options.maxIterations || 10,
          targetSuccessRate: options.targetSuccessRate || 100
        });

        console.log(`✅ [E2E] IterativeTestOrchestrator configurado (max ${options.maxIterations || 10} ciclos, target ${options.targetSuccessRate || 100}%)`);
      }

    } catch (error) {
      console.error('❌ [E2E] Error inicializando agent:', error);
      throw error;
    }
  }

  /**
   * Ejecuta tests E2E funcionales
   *
   * @param {string[]} modules - Módulos a testear
   * @param {Object} options - Opciones
   * @returns {Promise<PhaseResult>}
   */
  async execute(modules, options = {}) {
    // ⭐ ROUTER: Delegar según modo (iterativo vs normal)
    if (options.iterative) {
      console.log('🔄 [E2E] Modo ITERATIVO activado (loop test-fix-retest hasta 100%)');
      return await this._executeIterative(modules, options);
    } else {
      console.log('🧪 [E2E] Modo NORMAL (single-pass testing)');
      return await this._executeNormal(modules, options);
    }
  }

  /**
   * Ejecuta tests E2E en MODO ITERATIVO (loop test-fix-retest hasta 100%)
   *
   * Cada módulo se ejecuta en ciclos iterativos:
   * 1️⃣ TEST → 2️⃣ FIX → 3️⃣ RETEST → 4️⃣ ROLLBACK (si falla) → 5️⃣ LEARN
   *
   * @private
   */
  async _executeIterative(modules, options = {}) {
    const { executionId, onProgress } = options;

    console.log(`\n🔄 [E2E] Ejecutando tests en MODO ITERATIVO...`);
    console.log(`   Target: ${options.targetSuccessRate || 100}% success rate por módulo`);
    console.log(`   Max iterations: ${options.maxIterations || 10}`);

    const startTime = Date.now();

    try {
      // Setup agent y orchestrator
      await this.setup(options);

      if (!this.iterativeOrchestrator) {
        throw new Error('IterativeTestOrchestrator no inicializado. Verificar que options.auditorEngine esté presente.');
      }

      // Si no se especifican módulos, obtener TODOS de modules-registry
      const modulesToTest = modules.length > 0
        ? modules
        : await this._getAllModules();

      console.log(`   Testing ${modulesToTest.length} módulos...`);

      // Reportar progreso inicial
      this.reportProgress(onProgress, 0, 'Iniciando tests E2E iterativos', {
        totalModules: modulesToTest.length,
        mode: 'iterative'
      });

      // ⭐ EJECUTAR LOOP ITERATIVO POR CADA MÓDULO
      const iterativeResults = {};
      let totalSuccessful = 0;

      for (let i = 0; i < modulesToTest.length; i++) {
        const moduleId = modulesToTest[i];

        console.log(`\n${'='.repeat(80)}`);
        console.log(`📦 [${i+1}/${modulesToTest.length}] MÓDULO: ${moduleId}`);
        console.log(`${'='.repeat(80)}`);

        // Ejecutar loop iterativo hasta 100% o max cycles
        const iterativeResult = await this.iterativeOrchestrator.runUntilSuccess(moduleId, {
          agent: this.agent,
          companyId: options.companyId
        });

        iterativeResults[moduleId] = iterativeResult;

        if (iterativeResult.success) {
          console.log(`✅ [E2E] ${moduleId} alcanzó 100% en ${iterativeResult.cycles} ciclo(s)`);
          totalSuccessful++;

          // Acumular stats del último resultado
          if (iterativeResult.results) {
            this.results.totalTests += iterativeResult.results.totalTests || 0;
            this.results.passed += iterativeResult.results.passed || 0;
            this.results.failed += iterativeResult.results.failed || 0;
            this.results.skipped += iterativeResult.results.skipped || 0;
          }
        } else {
          console.log(`⚠️  [E2E] ${moduleId} no alcanzó 100% (quedó en ${iterativeResult.finalSuccessRate.toFixed(1)}%)`);

          // Acumular stats del último resultado
          if (iterativeResult.results) {
            this.results.totalTests += iterativeResult.results.totalTests || 0;
            this.results.passed += iterativeResult.results.passed || 0;
            this.results.failed += iterativeResult.results.failed || 0;
            this.results.skipped += iterativeResult.results.skipped || 0;
          }
        }

        // Reportar progreso
        const percentage = ((i + 1) / modulesToTest.length) * 100;
        this.reportProgress(onProgress, percentage, `Completado: ${moduleId}`, {
          module: moduleId,
          result: iterativeResult
        });
      }

      const duration = Date.now() - startTime;

      // Calcular score global
      const successRate = modulesToTest.length > 0
        ? (totalSuccessful / modulesToTest.length) * 100
        : 0;

      const status = successRate === 100 ? 'passed' : (successRate >= 70 ? 'warning' : 'failed');

      console.log(`\n${'='.repeat(80)}`);
      console.log(`🎯 [E2E] RESULTADOS FINALES (MODO ITERATIVO)`);
      console.log(`${'='.repeat(80)}`);
      console.log(`   Módulos con 100%: ${totalSuccessful}/${modulesToTest.length} (${successRate.toFixed(1)}%)`);
      console.log(`   Tests totales: ${this.results.passed}/${this.results.totalTests}`);
      console.log(`   Duración: ${this.formatDuration(duration)}`);
      console.log(`${'='.repeat(80)}\n`);

      return this.createResult({
        status,
        passed: totalSuccessful,
        failed: modulesToTest.length - totalSuccessful,
        skipped: 0,
        total: modulesToTest.length,
        duration,
        metrics: {
          mode: 'iterative',
          modulesTested: modulesToTest.length,
          modulesAt100: totalSuccessful,
          averageCycles: Object.values(iterativeResults).reduce((sum, r) => sum + r.cycles, 0) / modulesToTest.length,
          totalTests: this.results.totalTests,
          testsPassed: this.results.passed,
          testsFailed: this.results.failed,
          testsSkipped: this.results.skipped
        },
        iterativeResults // Incluir resultados detallados por módulo
      });

    } catch (error) {
      console.error('❌ [E2E] Error en ejecución iterativa:', error);

      const duration = Date.now() - startTime;

      return this.createResult({
        status: 'failed',
        passed: 0,
        failed: 1,
        skipped: 0,
        total: 1,
        duration,
        metrics: { mode: 'iterative' },
        error: error.message
      });

    } finally {
      await this.cleanup();
    }
  }

  /**
   * Ejecuta tests E2E en MODO NORMAL (single-pass)
   * @private
   */
  async _executeNormal(modules, options = {}) {
    const { executionId, onProgress } = options;

    console.log(`\n🧪 [E2E] Ejecutando tests funcionales...`);
    console.log(`   Módulos: ${modules.length > 0 ? modules.join(', ') : 'TODOS'}`);

    const startTime = Date.now();

    try {
      // Setup agent
      await this.setup(options);

      // Si no se especifican módulos, obtener TODOS de modules-registry
      const modulesToTest = modules.length > 0
        ? modules
        : await this._getAllModules();

      console.log(`   Testing ${modulesToTest.length} módulos...`);

      // Reportar progreso inicial
      this.reportProgress(onProgress, 0, 'Iniciando tests E2E', {
        totalModules: modulesToTest.length
      });

      // Ejecutar tests por módulo
      for (let i = 0; i < modulesToTest.length; i++) {
        const moduleName = modulesToTest[i];

        console.log(`\n   [${i + 1}/${modulesToTest.length}] Testeando módulo: ${moduleName}`);

        try {
          const moduleResult = await this.agent.testModule(moduleName);

          this.results.modules[moduleName] = moduleResult;
          this.results.totalTests += moduleResult.totalTests || 0;
          this.results.passed += moduleResult.passed || 0;
          this.results.failed += moduleResult.failed || 0;
          this.results.skipped += moduleResult.skipped || 0;

          // Reportar progreso
          const percentage = ((i + 1) / modulesToTest.length) * 100;
          this.reportProgress(onProgress, percentage, `Testeado: ${moduleName}`, {
            module: moduleName,
            result: moduleResult
          });

        } catch (error) {
          console.error(`   ❌ Error testeando ${moduleName}:`, error.message);

          this.results.modules[moduleName] = {
            status: 'failed',
            error: error.message,
            totalTests: 0,
            passed: 0,
            failed: 1,
            skipped: 0
          };

          this.results.failed++;
        }
      }

      const duration = Date.now() - startTime;

      // Calcular score
      const score = this.calculateScore({
        passed: this.results.passed,
        failed: this.results.failed,
        total: this.results.totalTests
      });

      // Determinar status
      const status = this.results.failed === 0 ? 'passed' : (score >= 70 ? 'warning' : 'failed');

      console.log(`\n✅ [E2E] Tests completados`);
      console.log(`   Passed: ${this.results.passed}/${this.results.totalTests}`);
      console.log(`   Score: ${score.toFixed(2)}%`);

      // ⭐ NUEVO: Mostrar CRUD stats si están disponibles
      const crudModules = Object.values(this.results.modules).filter(m => m.crudStats);
      if (crudModules.length > 0) {
        const totalCrud = crudModules.reduce((sum, m) => sum + m.crudStats.tested, 0);
        const crudSuccess = crudModules.reduce((sum, m) => {
          const stats = m.crudStats;
          return sum + stats.createSuccess + stats.readSuccess +
                 stats.persistenceSuccess + stats.updateSuccess + stats.deleteSuccess;
        }, 0);
        const crudTotal = totalCrud * 5; // 5 operaciones por test CRUD

        console.log(`\n   📊 CRUD Statistics:`);
        console.log(`      Modules with CRUD tested: ${crudModules.length}`);
        console.log(`      CRUD operations: ${crudSuccess}/${crudTotal} (${(crudSuccess/crudTotal*100).toFixed(1)}%)`);
        console.log(`      - CREATE: ${crudModules.reduce((s,m) => s + m.crudStats.createSuccess, 0)}/${totalCrud}`);
        console.log(`      - READ: ${crudModules.reduce((s,m) => s + m.crudStats.readSuccess, 0)}/${totalCrud}`);
        console.log(`      - PERSISTENCE: ${crudModules.reduce((s,m) => s + m.crudStats.persistenceSuccess, 0)}/${totalCrud}`);
        console.log(`      - UPDATE: ${crudModules.reduce((s,m) => s + m.crudStats.updateSuccess, 0)}/${totalCrud}`);
        console.log(`      - DELETE: ${crudModules.reduce((s,m) => s + m.crudStats.deleteSuccess, 0)}/${totalCrud}`);
      }

      console.log(`   Duración: ${this.formatDuration(duration)}`);

      return this.createResult({
        status,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        total: this.results.totalTests,
        duration,
        metrics: {
          modulesTested: modulesToTest.length,
          modulesPassed: Object.values(this.results.modules).filter(m => m.status !== 'failed').length,
          modulesFailed: Object.values(this.results.modules).filter(m => m.status === 'failed').length,
          averageTestsPerModule: modulesToTest.length > 0
            ? (this.results.totalTests / modulesToTest.length).toFixed(2)
            : 0
        }
      });

    } catch (error) {
      console.error('❌ [E2E] Error en ejecución:', error);

      const duration = Date.now() - startTime;

      return this.createResult({
        status: 'failed',
        passed: this.results.passed,
        failed: this.results.failed + 1,
        skipped: this.results.skipped,
        total: this.results.totalTests,
        duration,
        metrics: {},
        error: error.message
      });

    } finally {
      await this.cleanup();
    }
  }

  /**
   * Calcula score de E2E phase
   */
  calculateScore(result) {
    const { passed = 0, total = 0 } = result;

    if (total === 0) return 0;

    // Score base
    const baseScore = (passed / total) * 100;

    // Penalización por crashes (si los hay en metrics)
    // TODO: Agregar penalización basada en crashes reportados

    return baseScore;
  }

  /**
   * Cleanup después de tests
   */
  async cleanup(result) {
    if (this.agent) {
      try {
        // AutonomousQAAgent maneja cleanup internamente (cierra browser en su destructor)
        // No tiene método cleanup() explícito
        if (typeof this.agent.cleanup === 'function') {
          await this.agent.cleanup();
        }
        console.log('✅ [E2E] AutonomousQAAgent limpiado');
      } catch (error) {
        console.error('⚠️  [E2E] Error en cleanup:', error.message);
      }

      this.agent = null;
    }
  }

  /**
   * Obtiene lista de TODOS los módulos del sistema
   * @private
   */
  async _getAllModules() {
    try {
      const registryPath = path.join(__dirname, '../../../auditor/registry/modules-registry.json');

      // Limpiar cache de require para siempre obtener versión actualizada
      delete require.cache[require.resolve(registryPath)];

      const registry = require(registryPath);

      // El registry tiene modules como ARRAY
      if (Array.isArray(registry.modules)) {
        // TESTEAR SOLO módulos de panel-empresa (available_for === 'company')
        // Los submódulos se testearán DENTRO de su módulo padre
        const mainModules = registry.modules
          .filter(m => !m.parent_module && m.available_for === 'company')  // Solo panel-empresa
          .map(m => m.id)
          .filter(id => id);

        const adminModules = registry.modules.filter(m => !m.parent_module && m.available_for === 'aponnt').length;
        const submodules = registry.modules.filter(m => m.parent_module).length;

        console.log(`✅ [E2E] Autodescubiertos ${mainModules.length} MÓDULOS PRINCIPALES de PANEL-EMPRESA (available_for="company")`);
        console.log(`   (${adminModules} módulos de panel-administrativo EXCLUIDOS - available_for="aponnt")`);
        console.log(`   (${submodules} submódulos se testearán dentro de sus padres)`);

        return mainModules;
      } else if (typeof registry.modules === 'object') {
        // Fallback si algún día cambia a objeto
        return Object.keys(registry.modules);
      } else {
        throw new Error('registry.modules no es array ni objeto');
      }
    } catch (error) {
      console.error('⚠️  [E2E] No se pudo cargar modules-registry, usando lista manual');
      console.error('⚠️  [E2E] Error:', error.message);

      // Fallback: lista manual de módulos PRINCIPALES
      return [
        'users',
        'attendance',
        'organizational-structure',  // departments, shifts están DENTRO
        'kiosks',
        'finance-dashboard'  // finance-* están DENTRO
      ];
    }
  }
}

module.exports = E2EPhase;
