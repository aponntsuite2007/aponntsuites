/**
 * ConfidenceCalculator - Calcula confidence score del sistema (0-100%)
 *
 * FÓRMULA:
 * overall_score = Σ(phase_score * weight)
 *
 * WEIGHTS (suman 100%):
 * - E2E: 25%
 * - Load: 15%
 * - Security: 20%
 * - Multi-Tenant: 15%
 * - Database: 10%
 * - Monitoring: 5%
 * - Edge Cases: 10%
 *
 * PRODUCTION READY: overall_score >= 95%
 *
 * @module ConfidenceCalculator
 * @version 2.0.0
 */

class ConfidenceCalculator {
  constructor() {
    // Weights de cada fase (deben sumar 1.0)
    this.weights = {
      e2e: 0.25,
      load: 0.15,
      security: 0.20,
      multiTenant: 0.15,
      database: 0.10,
      monitoring: 0.05,
      edgeCases: 0.10
    };

    // Validar que weights suman 1.0
    const totalWeight = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      console.warn(`⚠️  [CONFIDENCE] Weights no suman 1.0 (actual: ${totalWeight})`);
    }
  }

  /**
   * Calcula confidence score basado en resultados agregados
   *
   * @param {Object} aggregated - Resultados agregados de ResultsAggregator
   * @returns {Object} Confidence score con breakdown por fase
   *
   * @example
   * const score = calculator.calculate(aggregatedResults);
   * // {
   * //   overall: 95.3,
   * //   e2e: 98.5,
   * //   load: 92.0,
   * //   security: 96.0,
   * //   ...
   * //   productionReady: true,
   * //   level: 'production'
   * // }
   */
  calculate(aggregated) {
    const { phases } = aggregated;

    // Calcular score de cada fase
    const phaseScores = {};
    let totalWeightedScore = 0;
    let totalWeightUsed = 0;

    Object.keys(this.weights).forEach(phaseName => {
      const phaseData = phases[phaseName];

      if (phaseData) {
        // Phase ejecutada - usar su score
        phaseScores[phaseName] = phaseData.score || 0;
        totalWeightedScore += phaseScores[phaseName] * this.weights[phaseName];
        totalWeightUsed += this.weights[phaseName];
      } else {
        // Phase no ejecutada - score = 0
        phaseScores[phaseName] = null;
      }
    });

    // Calcular overall score (normalizado por weight usado)
    const overallScore = totalWeightUsed > 0
      ? (totalWeightedScore / totalWeightUsed) * (totalWeightUsed / 1.0)
      : 0;

    // Determinar production readiness y level
    const productionReady = overallScore >= 95;
    const level = this._getConfidenceLevel(overallScore);

    return {
      overall: parseFloat(overallScore.toFixed(2)),
      e2e: phaseScores.e2e,
      load: phaseScores.load,
      security: phaseScores.security,
      multiTenant: phaseScores.multiTenant,
      database: phaseScores.database,
      monitoring: phaseScores.monitoring,
      edgeCases: phaseScores.edgeCases,
      productionReady,
      level,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Calcula score de una fase individual basado en tests passed/failed
   *
   * @param {Object} phaseResult - Resultado de fase { passed, failed, total }
   * @returns {number} Score 0-100
   */
  calculatePhaseScore(phaseResult) {
    const { passed = 0, total = 0 } = phaseResult;

    if (total === 0) return 0;

    const baseScore = (passed / total) * 100;

    // Aplicar ajustes basados en severidad de errores (si está disponible)
    if (phaseResult.criticalErrors) {
      // Penalización por errores críticos
      const penalty = Math.min(phaseResult.criticalErrors * 10, 50);  // Max -50%
      return Math.max(baseScore - penalty, 0);
    }

    return baseScore;
  }

  /**
   * Determina nivel de confianza basado en score
   * @private
   */
  _getConfidenceLevel(score) {
    if (score >= 95) return 'production';
    if (score >= 85) return 'high';
    if (score >= 70) return 'medium';
    return 'low';
  }

  /**
   * Obtiene los weights configurados
   *
   * @returns {Object} Weights por fase
   */
  getWeights() {
    return { ...this.weights };
  }

  /**
   * Actualiza weights (útil para tunear fórmula)
   *
   * @param {Object} newWeights - Nuevos weights
   * @throws {Error} Si weights no suman 1.0
   */
  setWeights(newWeights) {
    const totalWeight = Object.values(newWeights).reduce((a, b) => a + b, 0);

    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error(`Weights deben sumar 1.0 (actual: ${totalWeight})`);
    }

    this.weights = { ...newWeights };
  }

  /**
   * Genera breakdown detallado del cálculo de score
   *
   * @param {Object} aggregated - Resultados agregados
   * @returns {Object} Breakdown detallado
   */
  generateBreakdown(aggregated) {
    const { phases } = aggregated;

    const breakdown = {
      formula: 'overall = Σ(phase_score * weight)',
      weights: this.weights,
      phases: {},
      totalWeightedScore: 0
    };

    Object.keys(this.weights).forEach(phaseName => {
      const phaseData = phases[phaseName];
      const weight = this.weights[phaseName];

      if (phaseData) {
        const score = phaseData.score || 0;
        const weightedScore = score * weight;

        breakdown.phases[phaseName] = {
          score,
          weight,
          weightedScore: parseFloat(weightedScore.toFixed(2)),
          contribution: `${(weight * 100).toFixed(0)}%`
        };

        breakdown.totalWeightedScore += weightedScore;
      } else {
        breakdown.phases[phaseName] = {
          score: null,
          weight,
          weightedScore: 0,
          contribution: `${(weight * 100).toFixed(0)}%`,
          note: 'Phase not executed'
        };
      }
    });

    breakdown.overall = parseFloat(breakdown.totalWeightedScore.toFixed(2));

    return breakdown;
  }

  /**
   * Verifica si se cumplen los thresholds mínimos para production
   *
   * @param {Object} confidenceScore - Resultado de calculate()
   * @returns {Object} { ready: boolean, blockers: [] }
   */
  checkProductionReadiness(confidenceScore) {
    const blockers = [];

    // Overall score >= 95%
    if (confidenceScore.overall < 95) {
      blockers.push({
        type: 'overall',
        message: `Overall score ${confidenceScore.overall}% < 95% requerido`,
        severity: 'critical'
      });
    }

    // E2E score >= 98%
    if (confidenceScore.e2e !== null && confidenceScore.e2e < 98) {
      blockers.push({
        type: 'e2e',
        message: `E2E score ${confidenceScore.e2e}% < 98% requerido`,
        severity: 'critical'
      });
    }

    // Security score >= 96%
    if (confidenceScore.security !== null && confidenceScore.security < 96) {
      blockers.push({
        type: 'security',
        message: `Security score ${confidenceScore.security}% < 96% requerido`,
        severity: 'critical'
      });
    }

    // Multi-Tenant score >= 100% (data leakage = 0)
    if (confidenceScore.multiTenant !== null && confidenceScore.multiTenant < 100) {
      blockers.push({
        type: 'multiTenant',
        message: `Multi-Tenant score ${confidenceScore.multiTenant}% < 100% requerido (data leakage detectado)`,
        severity: 'critical'
      });
    }

    // Load score >= 92%
    if (confidenceScore.load !== null && confidenceScore.load < 92) {
      blockers.push({
        type: 'load',
        message: `Load score ${confidenceScore.load}% < 92% requerido`,
        severity: 'high'
      });
    }

    // Database score >= 94%
    if (confidenceScore.database !== null && confidenceScore.database < 94) {
      blockers.push({
        type: 'database',
        message: `Database score ${confidenceScore.database}% < 94% requerido`,
        severity: 'high'
      });
    }

    return {
      ready: blockers.length === 0,
      blockers,
      criticalBlockers: blockers.filter(b => b.severity === 'critical').length,
      highBlockers: blockers.filter(b => b.severity === 'high').length
    };
  }
}

module.exports = ConfidenceCalculator;
