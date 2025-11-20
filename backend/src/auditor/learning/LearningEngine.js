const KnowledgeBase = require('../knowledge/KnowledgeBase');

/**
 * LearningEngine - Motor de Aprendizaje Continuo
 *
 * ANALIZA resultados de tests y EXTRAE conocimiento:
 * - Detecta patrones en errores repetidos
 * - Identifica edge cases
 * - Mide performance de módulos
 * - Aprende qué estrategias de reparación funcionan
 *
 * RETROALIMENTACIÓN: Todo conocimiento → KnowledgeBase → Registry/Healer
 * EVOLUCIÓN: Cada ciclo aprende más → Sistema más inteligente
 */
class LearningEngine {
  constructor() {
    this.knowledgeBase = new KnowledgeBase();
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 1: ANÁLISIS DE RESULTADOS DE TESTS
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Analizar resultados completos de una ejecución de tests
   * @param {String} executionId - ID de ejecución de auditoría
   * @param {Object} testResults - Resultados de los tests
   */
  async analyzeTestResults(executionId, testResults) {
    try {
      console.log(`\n🧠 [LEARNING] Analizando resultados de ejecución: ${executionId}`);

      const insights = {
        errors_analyzed: 0,
        patterns_discovered: 0,
        edge_cases_found: 0,
        performance_insights: 0,
        repair_strategies_evaluated: 0
      };

      // ⭐ COMBINAR TODOS LOS ERRORES (console + network + page)
      const allErrors = [
        ...(testResults.errors || []),
        ...(testResults.pageErrors || []),
        ...(testResults.networkErrors || [])
      ];

      console.log(`  📊 [LEARNING] Errores a analizar:`);
      console.log(`     - Console errors: ${(testResults.errors || []).length}`);
      console.log(`     - Page errors: ${(testResults.pageErrors || []).length}`);
      console.log(`     - Network errors: ${(testResults.networkErrors || []).length}`);
      console.log(`     - TOTAL: ${allErrors.length}`);

      // 1. Analizar TODOS los errores detectados
      if (allErrors.length > 0) {
        const errorInsights = await this.detectErrorPatterns(allErrors, executionId);
        insights.errors_analyzed = allErrors.length;
        insights.patterns_discovered = errorInsights.patterns_found;
      }

      // 2. Identificar edge cases desde failures
      if (testResults.failures && testResults.failures.length > 0) {
        console.log(`  📊 [LEARNING] Módulos que fallaron: ${testResults.failures.length}`);
        const edgeCases = await this.identifyEdgeCases(testResults, executionId);
        insights.edge_cases_found = edgeCases.length;
      }

      // 3. Medir performance desde results array
      if (testResults.results && testResults.results.length > 0) {
        console.log(`  📊 [LEARNING] Módulos con métricas: ${testResults.results.length}`);
        const perfInsights = await this.measurePerformance(testResults, executionId);
        insights.performance_insights = perfInsights.insights_count;
      }

      // 4. Evaluar estrategias de reparación aplicadas
      if (testResults.fixes_applied || testResults.healing_results) {
        const strategyInsights = await this.evaluateRepairStrategies(testResults, executionId);
        insights.repair_strategies_evaluated = strategyInsights.evaluated_count;
      }

      // 5. Enriquecer Registry y Healer con conocimiento adquirido
      await this.enrichComponents(executionId, insights);

      console.log(`✅ [LEARNING] Análisis completado:`, insights);

      return insights;
    } catch (error) {
      console.error(`❌ [LEARNING] Error analizando resultados:`, error.message);
      console.error(`    Stack:`, error.stack);
      return null;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 2: DETECCIÓN DE PATRONES DE ERRORES
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Detectar patrones en errores
   * @param {Array} errors - Lista de errores detectados
   * @param {String} executionId - ID de ejecución
   */
  async detectErrorPatterns(errors, executionId) {
    try {
      console.log(`  🔍 [LEARNING] Detectando patrones en ${errors.length} errores...`);

      const patterns = [];
      const errorGroups = this._groupErrorsByType(errors);

      for (const [errorType, errorList] of Object.entries(errorGroups)) {
        // Solo considerar patrones con 2+ ocurrencias
        if (errorList.length >= 2) {
          const pattern = {
            type: errorType,
            category: errorList[0].category || 'unknown',
            occurrences: errorList.length,
            severity: this._determineSeverity(errorList),
            canAutoFix: this._canAutoFix(errorList),
            examples: errorList.slice(0, 3).map(e => ({
              message: e.message,
              file: e.file,
              line: e.line
            }))
          };

          // Registrar en KnowledgeBase
          for (const error of errorList) {
            await this.knowledgeBase.recordErrorPattern(error, {
              execution_id: executionId,
              module: error.module || 'unknown'
            });
          }

          patterns.push(pattern);
        }
      }

      console.log(`  ✨ [LEARNING] ${patterns.length} patrones descubiertos`);

      return { patterns_found: patterns.length, patterns };
    } catch (error) {
      console.error(`  ❌ [LEARNING] Error detectando patrones:`, error.message);
      return { patterns_found: 0, patterns: [] };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 3: IDENTIFICACIÓN DE EDGE CASES
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Identificar edge cases (casos límite) en tests
   * @param {Object} testData - Datos de tests
   * @param {String} executionId - ID de ejecución
   */
  async identifyEdgeCases(testData, executionId) {
    try {
      console.log(`  🔎 [LEARNING] Identificando edge cases...`);

      const edgeCases = [];

      // 1. Buscar módulos que fallaron en condiciones específicas
      if (testData.failures) {
        for (const failure of testData.failures) {
          // Edge case: Módulo falla solo en carga dinámica
          if (failure.reason && (failure.reason.includes('dynamic') || failure.reason.includes('load'))) {
            edgeCases.push({
              type: 'dynamic_loading_failure',
              module: failure.module,
              condition: failure.reason,
              severity: 'medium'
            });

            await this.knowledgeBase.recordErrorPattern({
              type: 'edge_case',
              category: 'dynamic_loading_failure',
              message: failure.reason,
              severity: 'medium',
              canAutoFix: true,
              suggestedFix: 'Ensure loadModuleContent() completes before testing'
            }, {
              execution_id: executionId,
              module: failure.module
            });
          }

          // Edge case: Módulo falla solo en ciertos navegadores
          if (failure.browser_specific) {
            edgeCases.push({
              type: 'browser_compatibility',
              module: failure.module,
              browser: failure.browser,
              severity: 'high'
            });
          }

          // Edge case: Timeout
          if (failure.timeout) {
            edgeCases.push({
              type: 'timeout',
              module: failure.module,
              duration_ms: failure.duration_ms,
              severity: 'high'
            });
          }
        }
      }

      // 2. Buscar inputs inusuales que causan problemas
      if (testData.input_errors) {
        for (const inputError of testData.input_errors) {
          edgeCases.push({
            type: 'invalid_input',
            input: inputError.input,
            expected: inputError.expected,
            actual: inputError.actual,
            severity: 'medium'
          });

          await this.knowledgeBase.recordErrorPattern({
            type: 'edge_case',
            category: 'invalid_input',
            message: `Input "${inputError.input}" caused error`,
            severity: 'medium',
            canAutoFix: false,
            suggestedFix: 'Add input validation'
          }, {
            execution_id: executionId
          });
        }
      }

      console.log(`  ✨ [LEARNING] ${edgeCases.length} edge cases identificados`);

      return edgeCases;
    } catch (error) {
      console.error(`  ❌ [LEARNING] Error identificando edge cases:`, error.message);
      return [];
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 4: MEDICIÓN DE PERFORMANCE
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Medir y analizar performance de módulos
   * @param {Object} testData - Datos de tests
   * @param {String} executionId - ID de ejecución
   */
  async measurePerformance(testData, executionId) {
    try {
      console.log(`  📊 [LEARNING] Midiendo performance...`);

      const insights = [];
      let insights_count = 0;

      // ⭐ EXTRAER MÉTRICAS DESDE testData.results (array de test results)
      if (testData.results && Array.isArray(testData.results)) {
        for (const testResult of testData.results) {
          const moduleId = testResult.module || testResult.name || 'unknown';

          // 1. Analizar duración del test
          if (testResult.duration_ms || testResult.duration) {
            const duration_ms = testResult.duration_ms || testResult.duration;

            // Insight: Test lento (>5s)
            if (duration_ms > 5000) {
              insights.push({
                type: 'slow_module_test',
                module: moduleId,
                duration_ms,
                recommendation: 'Optimize module loading or reduce test complexity'
              });
              insights_count++;
            }

            // Registrar comportamiento en KB
            await this.knowledgeBase.recordModuleBehavior(moduleId, {
              test_duration_ms: duration_ms,
              status: testResult.status,
              execution_id: executionId,
              timestamp: new Date()
            });
          }

          // 2. Analizar errores por módulo (múltiples errores = módulo problemático)
          if (testResult.errors && testResult.errors.length > 5) {
            insights.push({
              type: 'high_error_rate',
              module: moduleId,
              error_count: testResult.errors.length,
              recommendation: 'Review module for critical bugs'
            });
            insights_count++;
          }
        }
      }

      // 3. Analizar tiempos de respuesta de API (si existen)
      if (testData.api_response_times) {
        for (const [endpoint, timing] of Object.entries(testData.api_response_times)) {
          // Insight: API lenta (>500ms)
          if (timing.avg_ms > 500) {
            insights.push({
              type: 'slow_api_endpoint',
              endpoint,
              avg_ms: timing.avg_ms,
              recommendation: 'Add caching or optimize database queries'
            });
            insights_count++;
          }
        }
      }

      console.log(`  ✨ [LEARNING] ${insights_count} performance insights generados`);

      return { insights_count, insights };
    } catch (error) {
      console.error(`  ❌ [LEARNING] Error midiendo performance:`, error.message);
      return { insights_count: 0, insights: [] };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 5: EVALUACIÓN DE ESTRATEGIAS DE REPARACIÓN
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Evaluar efectividad de estrategias de reparación aplicadas
   * @param {Object} testData - Datos de tests
   * @param {String} executionId - ID de ejecución
   */
  async evaluateRepairStrategies(testData, executionId) {
    try {
      console.log(`  🔧 [LEARNING] Evaluando estrategias de reparación...`);

      let evaluated_count = 0;

      if (testData.fixes_applied) {
        for (const fix of testData.fixes_applied) {
          // Registrar resultado de la estrategia
          await this.knowledgeBase.recordRepairStrategy(
            {
              pattern: fix.pattern || fix.strategy_id,
              strategy_id: fix.strategy_id
            },
            {
              success: fix.success || fix.status === 'fixed',
              result: fix.success ? 'success' : 'failure',
              error: fix.error || null,
              execution_id: executionId
            }
          );

          evaluated_count++;

          // Si falló, crear sugerencia para revisión manual
          if (!fix.success && fix.severity === 'critical') {
            await this.knowledgeBase.createSuggestion({
              type: 'failed_repair',
              knowledge_key: `repair_strategy:${fix.pattern}`,
              title: `Failed to fix ${fix.pattern}`,
              description: `Auto-repair strategy failed for critical error: ${fix.error}`,
              code_example: fix.attempted_fix || null,
              priority: 'high'
            });
          }
        }
      }

      console.log(`  ✨ [LEARNING] ${evaluated_count} estrategias evaluadas`);

      return { evaluated_count };
    } catch (error) {
      console.error(`  ❌ [LEARNING] Error evaluando estrategias:`, error.message);
      return { evaluated_count: 0 };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 6: ENRIQUECIMIENTO DE COMPONENTES
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Enriquecer Registry y Healer con conocimiento adquirido
   * @param {String} executionId - ID de ejecución
   * @param {Object} insights - Insights descubiertos
   */
  async enrichComponents(executionId, insights) {
    try {
      console.log(`  🌱 [LEARNING] Enriqueciendo componentes con conocimiento...`);

      // Obtener patrones de alta confianza (>= 0.6)
      const highConfidencePatterns = await this.knowledgeBase.getErrorPatterns({
        minConfidence: 0.6,
        limit: 50
      });

      // Obtener estrategias exitosas (>= 70% success rate)
      const successfulStrategies = await this.knowledgeBase.getRepairStrategies();
      const topStrategies = successfulStrategies.filter(s => (s.success_rate || 0) >= 0.7);

      console.log(`  📚 [LEARNING] Conocimiento de alta confianza:`);
      console.log(`    - ${highConfidencePatterns.length} patrones de error confirmados`);
      console.log(`    - ${topStrategies.length} estrategias de reparación validadas`);

      // TODO: En siguiente fase, actualizar SystemRegistry y HybridHealer con este conocimiento
      // Ver AuditorEnricher.js

      return {
        high_confidence_patterns: highConfidencePatterns.length,
        validated_strategies: topStrategies.length
      };
    } catch (error) {
      console.error(`  ❌ [LEARNING] Error enriqueciendo componentes:`, error.message);
      return null;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 7: MÉTODOS PRIVADOS (HELPERS)
   * ═══════════════════════════════════════════════════════════
   */

  _groupErrorsByType(errors) {
    const groups = {};

    for (const error of errors) {
      const key = error.type || error.category || 'unknown';

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(error);
    }

    return groups;
  }

  _determineSeverity(errorList) {
    const severities = errorList.map(e => e.severity || 'medium');

    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  _canAutoFix(errorList) {
    // Si al menos uno puede auto-repararse, marcamos como true
    return errorList.some(e => e.canAutoFix === true);
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 8: REPORTES Y ESTADÍSTICAS
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Generar reporte de aprendizaje para una ejecución
   * @param {String} executionId - ID de ejecución
   */
  async generateLearningReport(executionId) {
    try {
      const stats = await this.knowledgeBase.getStats();

      const report = {
        execution_id: executionId,
        timestamp: new Date(),
        knowledge_stats: stats,
        recommendations: []
      };

      // Generar recomendaciones basadas en conocimiento
      const patterns = await this.knowledgeBase.getErrorPatterns({ minConfidence: 0.9 });

      for (const pattern of patterns.slice(0, 5)) {
        report.recommendations.push({
          type: 'high_confidence_pattern',
          pattern: pattern.data.type,
          message: pattern.data.message,
          occurrences: pattern.occurrences,
          recommendation: pattern.data.suggestedFix || 'Review and fix manually'
        });
      }

      return report;
    } catch (error) {
      console.error(`❌ [LEARNING] Error generando reporte:`, error.message);
      return null;
    }
  }

  /**
   * Obtener sugerencias de mejora del sistema
   */
  async getImprovementSuggestions() {
    try {
      const suggestions = await this.knowledgeBase.getPendingSuggestions(20);

      console.log(`💡 [LEARNING] ${suggestions.length} sugerencias de mejora disponibles`);

      return suggestions;
    } catch (error) {
      console.error(`❌ [LEARNING] Error obteniendo sugerencias:`, error.message);
      return [];
    }
  }
}

module.exports = LearningEngine;
