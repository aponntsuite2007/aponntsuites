/**
 * MonitoringPhase - Fase de Monitoring & Observability Testing
 *
 * ESTADO: STUB - Implementación pendiente
 *
 * OBJETIVO:
 * - APM: New Relic / Elastic APM
 * - Logs: Winston (structured JSON)
 * - Traces: OpenTelemetry + Jaeger
 * - Alerts: 25 alerting rules
 *
 * TESTS:
 * - APM capturando 100% requests
 * - Logs estructurados funcionando
 * - Traces conectan request → DB
 * - Alertas se disparan correctamente
 * - Dashboards operativos
 *
 * THRESHOLDS:
 * - APM captura 100% endpoints
 * - Logs en JSON válido
 * - monitoring_score > 85%
 *
 * @module MonitoringPhase
 * @version 2.0.0 (STUB)
 */

const PhaseInterface = require('./PhaseInterface');

class MonitoringPhase extends PhaseInterface {
  getName() {
    return 'monitoring';
  }

  async execute(modules, options) {
    const { onProgress } = options;

    this.reportProgress(onProgress, 0, 'MonitoringPhase: Stub implementation (not implemented yet)');

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
        message: 'MonitoringPhase implementation pending - APM and OpenTelemetry setup required'
      },
      error: null
    });
  }

  calculateScore(result) {
    // STUB: Score 0 hasta que se implemente
    return 0;
  }
}

module.exports = MonitoringPhase;
