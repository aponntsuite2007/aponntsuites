/**
 * LoadPhase - Fase de Load Testing con k6
 *
 * ESTADO: STUB - Implementación pendiente
 *
 * OBJETIVO:
 * - Login masivo (100 users concurrentes)
 * - CRUD operations (80 req/s por módulo)
 * - Dashboard load (heavy queries)
 * - Reportes PDF (stress test)
 * - Multi-tenant stress (50 empresas simultáneas)
 *
 * THRESHOLDS:
 * - P95 latency < 1s
 * - P99 latency < 3s
 * - Error rate < 1%
 * - Throughput > 100 req/s
 *
 * @module LoadPhase
 * @version 2.0.0 (STUB)
 */

const PhaseInterface = require('./PhaseInterface');

class LoadPhase extends PhaseInterface {
  getName() {
    return 'load';
  }

  async execute(modules, options) {
    const { onProgress } = options;

    this.reportProgress(onProgress, 0, 'LoadPhase: Stub implementation (not implemented yet)');

    // STUB: Retornar resultado vacío indicando que no está implementado
    return this.createResult({
      status: 'warning',
      passed: 0,
      failed: 0,
      skipped: 1,
      total: 1,
      duration: 0,
      metrics: {
        stub: true,
        message: 'LoadPhase implementation pending - k6 setup required'
      },
      error: null
    });
  }

  calculateScore(result) {
    // STUB: Score 0 hasta que se implemente
    return 0;
  }
}

module.exports = LoadPhase;
