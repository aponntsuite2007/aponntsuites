/**
 * ResultsAggregator - Agrega y consolida resultados de todas las fases
 *
 * RESPONSABILIDADES:
 * - Consolidar resultados de múltiples fases en un formato uniforme
 * - Calcular métricas agregadas (passed, failed, skipped)
 * - Generar resúmenes por fase y global
 *
 * @module ResultsAggregator
 * @version 2.0.0
 */

class ResultsAggregator {
  /**
   * Agrega resultados de todas las fases ejecutadas
   *
   * @param {Object} results - Resultados por fase { phaseName: phaseResult }
   * @returns {Object} Resultados agregados
   *
   * @example
   * const aggregated = aggregator.aggregate({
   *   e2e: { passed: 100, failed: 5, total: 105, duration: 60000 },
   *   load: { passed: 45, failed: 5, total: 50, duration: 30000 }
   * });
   */
  aggregate(results) {
    const aggregated = {
      summary: {
        totalPhases: Object.keys(results).length,
        phasesExecuted: 0,
        phasesPassed: 0,
        phasesFailed: 0,
        totalTests: 0,
        testsPassed: 0,
        testsFailed: 0,
        testsSkipped: 0,
        totalDuration: 0
      },
      phases: {},
      timestamps: {
        aggregatedAt: new Date().toISOString()
      }
    };

    // Agregar resultados de cada fase
    Object.entries(results).forEach(([phaseName, phaseResult]) => {
      if (!phaseResult) return;

      aggregated.summary.phasesExecuted++;

      // Determinar si la fase passed o failed
      const phasePassed = phaseResult.status !== 'failed' && phaseResult.score >= 70;

      if (phasePassed) {
        aggregated.summary.phasesPassed++;
      } else {
        aggregated.summary.phasesFailed++;
      }

      // Agregar métricas de la fase
      aggregated.summary.totalTests += (phaseResult.total || 0);
      aggregated.summary.testsPassed += (phaseResult.passed || 0);
      aggregated.summary.testsFailed += (phaseResult.failed || 0);
      aggregated.summary.testsSkipped += (phaseResult.skipped || 0);
      aggregated.summary.totalDuration += (phaseResult.duration || 0);

      // Guardar detalles de la fase
      aggregated.phases[phaseName] = {
        status: phaseResult.status || 'unknown',
        score: phaseResult.score || 0,
        passed: phaseResult.passed || 0,
        failed: phaseResult.failed || 0,
        skipped: phaseResult.skipped || 0,
        total: phaseResult.total || 0,
        duration: phaseResult.duration || 0,
        metrics: phaseResult.metrics || {},
        error: phaseResult.error || null
      };
    });

    // Calcular métricas agregadas adicionales
    aggregated.summary.passRate = aggregated.summary.totalTests > 0
      ? ((aggregated.summary.testsPassed / aggregated.summary.totalTests) * 100).toFixed(2)
      : 0;

    aggregated.summary.failRate = aggregated.summary.totalTests > 0
      ? ((aggregated.summary.testsFailed / aggregated.summary.totalTests) * 100).toFixed(2)
      : 0;

    aggregated.summary.totalDurationFormatted = this._formatDuration(aggregated.summary.totalDuration);

    return aggregated;
  }

  /**
   * Genera resumen en formato markdown
   *
   * @param {Object} aggregated - Resultados agregados
   * @returns {string} Markdown string
   */
  generateMarkdownSummary(aggregated) {
    const { summary, phases } = aggregated;

    let md = '# Resumen de Ejecución E2E Advanced\n\n';

    md += '## 📊 Resumen Global\n\n';
    md += `- **Fases Ejecutadas**: ${summary.phasesExecuted}/${summary.totalPhases}\n`;
    md += `- **Fases Passed**: ${summary.phasesPassed} ✅\n`;
    md += `- **Fases Failed**: ${summary.phasesFailed} ❌\n`;
    md += `- **Total Tests**: ${summary.totalTests}\n`;
    md += `- **Tests Passed**: ${summary.testsPassed} (${summary.passRate}%)\n`;
    md += `- **Tests Failed**: ${summary.testsFailed} (${summary.failRate}%)\n`;
    md += `- **Tests Skipped**: ${summary.testsSkipped}\n`;
    md += `- **Duración Total**: ${summary.totalDurationFormatted}\n\n`;

    md += '## 🔍 Detalle por Fase\n\n';

    Object.entries(phases).forEach(([phaseName, phaseData]) => {
      const statusIcon = phaseData.status === 'failed' ? '❌' : '✅';
      md += `### ${statusIcon} ${phaseName.toUpperCase()}\n\n`;
      md += `- **Status**: ${phaseData.status}\n`;
      md += `- **Score**: ${phaseData.score}%\n`;
      md += `- **Passed**: ${phaseData.passed}/${phaseData.total}\n`;
      md += `- **Failed**: ${phaseData.failed}\n`;
      md += `- **Duración**: ${this._formatDuration(phaseData.duration)}\n`;

      if (phaseData.error) {
        md += `- **Error**: \`${phaseData.error}\`\n`;
      }

      md += '\n';
    });

    return md;
  }

  /**
   * Genera resumen en formato JSON compacto
   *
   * @param {Object} aggregated - Resultados agregados
   * @returns {Object} JSON compacto
   */
  generateCompactSummary(aggregated) {
    return {
      phases: aggregated.summary.phasesExecuted,
      passed: aggregated.summary.testsPassed,
      failed: aggregated.summary.testsFailed,
      passRate: parseFloat(aggregated.summary.passRate),
      duration: aggregated.summary.totalDuration
    };
  }

  /**
   * Formatea duración en ms a formato legible
   * @private
   */
  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}min`;
    return `${(ms / 3600000).toFixed(2)}h`;
  }

  /**
   * Compara dos ejecuciones para detectar regresiones
   *
   * @param {Object} current - Resultados actuales
   * @param {Object} baseline - Resultados baseline
   * @returns {Object} Análisis de regresión
   */
  compareExecutions(current, baseline) {
    const regressions = [];
    const improvements = [];

    Object.keys(current.phases).forEach(phaseName => {
      const currentPhase = current.phases[phaseName];
      const baselinePhase = baseline.phases?.[phaseName];

      if (!baselinePhase) return;

      // Comparar scores
      const scoreDiff = currentPhase.score - baselinePhase.score;

      if (scoreDiff < -5) {  // Regresión: score cayó más de 5%
        regressions.push({
          phase: phaseName,
          metric: 'score',
          baseline: baselinePhase.score,
          current: currentPhase.score,
          diff: scoreDiff
        });
      } else if (scoreDiff > 5) {  // Mejora: score subió más de 5%
        improvements.push({
          phase: phaseName,
          metric: 'score',
          baseline: baselinePhase.score,
          current: currentPhase.score,
          diff: scoreDiff
        });
      }

      // Comparar duración
      const durationDiff = currentPhase.duration - baselinePhase.duration;
      const durationIncrease = (durationDiff / baselinePhase.duration) * 100;

      if (durationIncrease > 20) {  // Performance degradation >20%
        regressions.push({
          phase: phaseName,
          metric: 'duration',
          baseline: baselinePhase.duration,
          current: currentPhase.duration,
          diff: durationIncrease.toFixed(2) + '%'
        });
      }
    });

    return {
      hasRegressions: regressions.length > 0,
      regressions,
      improvements,
      summary: {
        totalRegressions: regressions.length,
        totalImprovements: improvements.length
      }
    };
  }
}

module.exports = ResultsAggregator;
