/**
 * PhaseInterface - Contrato base que TODAS las phases deben implementar
 *
 * ARQUITECTURA:
 * Cada phase (E2E, Load, Security, etc.) DEBE heredar de esta clase
 * e implementar los métodos abstractos.
 *
 * BENEFICIOS:
 * - Interfaz uniforme para el MasterTestOrchestrator
 * - Garantiza que todas las phases tienen los mismos métodos
 * - Facilita agregar nuevas phases sin modificar orchestrator
 *
 * MÉTODOS OBLIGATORIOS:
 * - execute(modules, options) → Ejecuta los tests de la fase
 * - getName() → Retorna nombre de la fase
 * - calculateScore(result) → Calcula score 0-100 basado en resultado
 *
 * @module PhaseInterface
 * @version 2.0.0
 */

class PhaseInterface {
  constructor() {
    // Validar que no se instancia directamente
    if (this.constructor === PhaseInterface) {
      throw new Error('PhaseInterface es abstracta - no se puede instanciar directamente');
    }

    // Validar que métodos obligatorios están implementados
    this._validateImplementation();
  }

  /**
   * Ejecuta tests de la fase
   *
   * @param {string[]} modules - Módulos a testear (ej: ['users', 'attendance'])
   * @param {Object} options - Opciones de ejecución
   * @param {string} options.executionId - ID de la ejecución
   * @param {Function} options.onProgress - Callback para reportar progreso
   * @returns {Promise<PhaseResult>}
   *
   * PhaseResult debe tener esta estructura:
   * {
   *   status: 'passed' | 'failed' | 'warning',
   *   score: number,           // 0-100
   *   passed: number,          // Tests passed
   *   failed: number,          // Tests failed
   *   skipped: number,         // Tests skipped
   *   total: number,           // Total tests
   *   duration: number,        // Duración en ms
   *   metrics: object,         // Métricas específicas de la fase
   *   error: string | null     // Error message si falló
   * }
   */
  async execute(modules, options) {
    throw new Error(`${this.constructor.name} debe implementar execute()`);
  }

  /**
   * Retorna nombre de la fase
   *
   * @returns {string} Nombre (ej: 'e2e', 'load', 'security')
   */
  getName() {
    throw new Error(`${this.constructor.name} debe implementar getName()`);
  }

  /**
   * Calcula score de la fase (0-100) basado en resultado
   *
   * @param {Object} result - Resultado parcial { passed, failed, total, ... }
   * @returns {number} Score 0-100
   */
  calculateScore(result) {
    throw new Error(`${this.constructor.name} debe implementar calculateScore()`);
  }

  /**
   * Valida que la implementación tiene todos los métodos obligatorios
   * @private
   */
  _validateImplementation() {
    const requiredMethods = ['execute', 'getName', 'calculateScore'];

    requiredMethods.forEach(method => {
      if (this[method] === PhaseInterface.prototype[method]) {
        throw new Error(`${this.constructor.name} debe implementar ${method}()`);
      }
    });
  }

  /**
   * Hook opcional: setup antes de ejecutar tests
   * @param {Object} options - Opciones de ejecución
   * @returns {Promise<void>}
   */
  async setup(options) {
    // Implementación opcional - no lanza error si no se implementa
  }

  /**
   * Hook opcional: cleanup después de ejecutar tests
   * @param {Object} result - Resultado de la ejecución
   * @returns {Promise<void>}
   */
  async cleanup(result) {
    // Implementación opcional
  }

  /**
   * Hook opcional: validación antes de ejecutar
   * Útil para verificar pre-requisitos (ej: herramientas instaladas)
   *
   * @returns {Promise<{valid: boolean, errors: string[]}>}
   */
  async validate() {
    return { valid: true, errors: [] };
  }

  /**
   * Reporta progreso de la fase (helper method)
   *
   * @param {Function} onProgress - Callback opcional
   * @param {number} percentage - Porcentaje completado (0-100)
   * @param {string} message - Mensaje descriptivo
   * @param {Object} data - Datos adicionales
   */
  reportProgress(onProgress, percentage, message, data = {}) {
    if (typeof onProgress === 'function') {
      onProgress({
        percentage: Math.min(Math.max(percentage, 0), 100),  // Clamp 0-100
        message,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Calcula score base (helper method usado por muchas phases)
   *
   * @param {Object} result - { passed, failed, total }
   * @returns {number} Score 0-100
   */
  calculateBaseScore(result) {
    const { passed = 0, total = 0 } = result;

    if (total === 0) return 0;

    return (passed / total) * 100;
  }

  /**
   * Formatea duración en formato legible (helper method)
   *
   * @param {number} ms - Duración en milisegundos
   * @returns {string} Formato legible
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}min`;
    return `${(ms / 3600000).toFixed(2)}h`;
  }

  /**
   * Crea resultado estándar de fase (helper method)
   *
   * @param {Object} options - Datos del resultado
   * @returns {Object} PhaseResult estandarizado
   */
  createResult(options) {
    const {
      status = 'passed',
      passed = 0,
      failed = 0,
      skipped = 0,
      total = 0,
      duration = 0,
      metrics = {},
      error = null
    } = options;

    return {
      status,
      score: this.calculateScore({ passed, failed, total }),
      passed,
      failed,
      skipped,
      total,
      duration,
      metrics,
      error
    };
  }

  /**
   * Obtiene información de la phase (para debugging)
   *
   * @returns {Object} Metadata de la phase
   */
  getInfo() {
    return {
      name: this.getName(),
      className: this.constructor.name,
      hasSetup: this.setup !== PhaseInterface.prototype.setup,
      hasCleanup: this.cleanup !== PhaseInterface.prototype.cleanup,
      hasValidate: this.validate !== PhaseInterface.prototype.validate
    };
  }
}

module.exports = PhaseInterface;
