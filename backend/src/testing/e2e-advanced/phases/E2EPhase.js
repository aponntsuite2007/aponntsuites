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
const AutonomousQAAgent = require('../AutonomousQAAgent');
const path = require('path');
const fs = require('fs');

class E2EPhase extends PhaseInterface {
  constructor() {
    super();

    this.agent = null;
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
      brainIntegration: true
    };

    try {
      this.agent = new AutonomousQAAgent(config);
      await this.agent.init();

      console.log('✅ [E2E] AutonomousQAAgent inicializado');
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
      console.log(`   Duración: ${this.formatDuration(duration)}`);

      return this.createResult({
        status,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        total: this.results.totalTests,
        duration,
        metrics: {
          modulesT ested: modulesToTest.length,
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
        await this.agent.cleanup();
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
      const registryPath = path.join(__dirname, '../../auditor/registry/modules-registry.json');
      const registry = require(registryPath);

      return Object.keys(registry.modules || {});
    } catch (error) {
      console.error('⚠️  [E2E] No se pudo cargar modules-registry, usando lista manual');

      // Fallback: lista manual de módulos core
      return [
        'users',
        'attendance',
        'departments',
        'shifts',
        'reports',
        'notifications',
        'kiosks'
      ];
    }
  }
}

module.exports = E2EPhase;
