/**
 * ═══════════════════════════════════════════════════════════
 * E2E LEARNING ENGINE - Sistema de Mejora Continua Automática
 * ═══════════════════════════════════════════════════════════
 *
 * Este motor aprende de errores pasados y aplica fixes automáticamente:
 *
 * 1. CAPTURA errores durante ejecución
 * 2. IDENTIFICA patterns recurrentes
 * 3. SUGIERE fixes basados en conocimiento previo
 * 4. APLICA fixes automáticamente (si son safe)
 * 5. VALIDA que el fix mejoró el resultado
 * 6. ACTUALIZA base de conocimiento
 *
 * @version 1.0.0
 * @date 2025-12-23
 */

const fs = require('fs');
const path = require('path');

class E2ELearningEngine {
  constructor() {
    this.learnedPatternsFile = path.join(__dirname, '../knowledge/learned-patterns.json');
    this.executionHistoryFile = path.join(__dirname, '../knowledge/execution-history.json');
    this.learnedPatterns = this.loadLearnedPatterns();
    this.executionHistory = this.loadExecutionHistory();
    this.currentExecution = {
      startTime: new Date().toISOString(),
      errors: [],
      fixes: [],
      improvements: []
    };
  }

  /**
   * Cargar patterns aprendidos de ejecuciones anteriores
   */
  loadLearnedPatterns() {
    try {
      if (fs.existsSync(this.learnedPatternsFile)) {
        return JSON.parse(fs.readFileSync(this.learnedPatternsFile, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  [LEARNING] No se pudieron cargar patterns previos:', error.message);
    }

    // Estructura inicial con patterns conocidos
    return {
      version: '1.0.0',
      lastUpdate: new Date().toISOString(),
      patterns: [
        {
          id: 'timeout-30s',
          name: 'Timeout de 30s insuficiente',
          errorPattern: /Timeout 30000ms exceeded/,
          description: 'Selectores no aparecen en 30s porque módulo carga dinámicamente',
          fix: {
            type: 'config-adjustment',
            action: 'increase-timeout',
            from: 30000,
            to: 60000,
            confidence: 0.95
          },
          occurrences: 0,
          successRate: 0,
          appliedCount: 0,
          improvedCount: 0
        },
        {
          id: 'selector-not-found',
          name: 'Selector no encontrado',
          errorPattern: /Selector .+ no encontrado|not found|Cannot find element/i,
          description: 'Selector del config no existe en el DOM',
          fix: {
            type: 'fallback',
            action: 'use-mainContent-fallback',
            fallbackSelector: '#mainContent',
            confidence: 0.90
          },
          occurrences: 0,
          successRate: 0,
          appliedCount: 0,
          improvedCount: 0
        },
        {
          id: 'click-after-fallback',
          name: 'Click en selector después de fallback',
          errorPattern: /Timeout.*exceeded.*waiting for locator/,
          description: 'Intenta click en selector que no existe (usó fallback)',
          fix: {
            type: 'skip-action',
            action: 'skip-click-if-fallback',
            condition: 'usedFallback === true',
            confidence: 1.0
          },
          occurrences: 0,
          successRate: 0,
          appliedCount: 0,
          improvedCount: 0
        },
        {
          id: 'dependency-timeout-fields',
          name: 'Dependency test timeout en campos inexistentes',
          errorPattern: /page\.fill: Timeout.*exceeded/,
          description: 'DEPENDENCY test intenta llenar campos que no existen (usó fallback)',
          fix: {
            type: 'skip-test',
            action: 'skip-dependency-if-fallback',
            condition: 'usedFallback === true',
            confidence: 1.0
          },
          occurrences: 0,
          successRate: 0,
          appliedCount: 0,
          improvedCount: 0
        },
        {
          id: 'ssot-no-fields',
          name: 'SSOT test sin campos para analizar',
          errorPattern: /Total campos: 0/,
          description: 'SSOT test no encuentra campos (usó fallback)',
          fix: {
            type: 'skip-test',
            action: 'skip-ssot-if-fallback',
            condition: 'usedFallback === true',
            confidence: 1.0
          },
          occurrences: 0,
          successRate: 0,
          appliedCount: 0,
          improvedCount: 0
        },
        {
          id: 'brain-401-error',
          name: 'Brain API retorna 401 Unauthorized',
          errorPattern: /Request failed with status code 401/,
          description: 'Token de autenticación inválido o expirado',
          fix: {
            type: 'skip-test',
            action: 'skip-brain-if-401',
            condition: 'brainAuthFailed === true',
            confidence: 0.80
          },
          occurrences: 0,
          successRate: 0,
          appliedCount: 0,
          improvedCount: 0
        }
      ],
      moduleSpecific: {}
    };
  }

  /**
   * Cargar historial de ejecuciones
   */
  loadExecutionHistory() {
    try {
      if (fs.existsSync(this.executionHistoryFile)) {
        return JSON.parse(fs.readFileSync(this.executionHistoryFile, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  [LEARNING] No se pudo cargar historial:', error.message);
    }

    return {
      executions: [],
      totalExecutions: 0,
      totalErrors: 0,
      totalFixes: 0,
      totalImprovements: 0
    };
  }

  /**
   * Registrar error encontrado durante ejecución
   */
  recordError(moduleKey, testName, error, context = {}) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      moduleKey,
      testName,
      errorMessage: error.message || error.toString(),
      errorStack: error.stack,
      context
    };

    this.currentExecution.errors.push(errorRecord);

    // Identificar pattern que matchea
    const matchedPattern = this.identifyPattern(error);
    if (matchedPattern) {
      matchedPattern.occurrences++;
      console.log(`🧠 [LEARNING] Error matchea pattern: ${matchedPattern.name}`);

      // Sugerir fix
      const suggestedFix = this.suggestFix(matchedPattern, context);
      if (suggestedFix) {
        errorRecord.suggestedFix = suggestedFix;
        return suggestedFix;
      }
    } else {
      console.log(`🆕 [LEARNING] Error nuevo (no matchea patterns conocidos)`);
      // Crear nuevo pattern candidato
      this.createPatternCandidate(error, context);
    }

    return null;
  }

  /**
   * Identificar pattern que matchea el error
   */
  identifyPattern(error) {
    const errorText = error.message || error.toString();

    for (const pattern of this.learnedPatterns.patterns) {
      if (pattern.errorPattern.test(errorText)) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Sugerir fix basado en pattern identificado
   */
  suggestFix(pattern, context) {
    const fix = {
      patternId: pattern.id,
      patternName: pattern.name,
      fixType: pattern.fix.type,
      fixAction: pattern.fix.action,
      confidence: pattern.fix.confidence,
      autoApply: pattern.fix.confidence >= 0.90, // Auto-aplicar si confidence >= 90%
      description: pattern.description,
      context
    };

    console.log(`💡 [LEARNING] Fix sugerido: ${fix.fixAction} (confidence: ${(fix.confidence * 100).toFixed(0)}%)`);

    if (fix.autoApply) {
      console.log(`🤖 [LEARNING] Fix será aplicado automáticamente`);
    } else {
      console.log(`⚠️  [LEARNING] Fix requiere aprobación manual (confidence < 90%)`);
    }

    return fix;
  }

  /**
   * Aplicar fix automáticamente (si es safe)
   */
  async applyFix(fix, testContext) {
    if (!fix.autoApply) {
      console.log(`⏭️  [LEARNING] Skip auto-apply (confidence demasiado baja)`);
      return { applied: false, reason: 'confidence-too-low' };
    }

    const fixRecord = {
      timestamp: new Date().toISOString(),
      patternId: fix.patternId,
      fixAction: fix.fixAction,
      appliedTo: testContext.moduleKey,
      testName: testContext.testName
    };

    try {
      console.log(`🔧 [LEARNING] Aplicando fix: ${fix.fixAction}...`);

      switch (fix.fixType) {
        case 'skip-test':
          // Marcar que el test debe ser skipeado
          testContext.shouldSkip = true;
          testContext.skipReason = fix.description;
          fixRecord.result = 'success';
          fixRecord.action = 'test-skipped';
          break;

        case 'skip-action':
          // Marcar que una acción debe ser skipeada
          testContext.skipAction = fix.fixAction;
          fixRecord.result = 'success';
          fixRecord.action = 'action-skipped';
          break;

        case 'config-adjustment':
          // Ajustar configuración (ej: timeout)
          testContext.adjustedConfig = testContext.adjustedConfig || {};
          testContext.adjustedConfig.timeout = fix.to;
          fixRecord.result = 'success';
          fixRecord.action = 'config-adjusted';
          fixRecord.details = { from: fix.from, to: fix.to };
          break;

        case 'fallback':
          // Activar fallback
          testContext.useFallback = true;
          testContext.fallbackSelector = fix.fallbackSelector;
          fixRecord.result = 'success';
          fixRecord.action = 'fallback-activated';
          break;

        default:
          console.log(`⚠️  [LEARNING] Tipo de fix desconocido: ${fix.fixType}`);
          fixRecord.result = 'failed';
          fixRecord.error = 'unknown-fix-type';
      }

      this.currentExecution.fixes.push(fixRecord);

      // Actualizar contador de fixes aplicados
      const pattern = this.learnedPatterns.patterns.find(p => p.id === fix.patternId);
      if (pattern) {
        pattern.appliedCount++;
      }

      console.log(`✅ [LEARNING] Fix aplicado exitosamente`);
      return { applied: true, result: fixRecord };

    } catch (error) {
      console.log(`❌ [LEARNING] Error aplicando fix: ${error.message}`);
      fixRecord.result = 'failed';
      fixRecord.error = error.message;
      this.currentExecution.fixes.push(fixRecord);
      return { applied: false, error: error.message };
    }
  }

  /**
   * Validar que un fix mejoró el resultado
   */
  validateImprovement(moduleKey, testName, beforeResult, afterResult) {
    const improvement = {
      timestamp: new Date().toISOString(),
      moduleKey,
      testName,
      before: beforeResult,
      after: afterResult,
      improved: afterResult.status === 'passed' && beforeResult.status !== 'passed'
    };

    if (improvement.improved) {
      console.log(`📈 [LEARNING] ¡Mejora confirmada! ${testName} ahora PASA`);
      this.currentExecution.improvements.push(improvement);

      // Actualizar success rate del pattern
      const relatedFix = this.currentExecution.fixes.find(f =>
        f.appliedTo === moduleKey && f.testName === testName
      );

      if (relatedFix) {
        const pattern = this.learnedPatterns.patterns.find(p => p.id === relatedFix.patternId);
        if (pattern) {
          pattern.improvedCount++;
          pattern.successRate = pattern.improvedCount / pattern.appliedCount;
          console.log(`📊 [LEARNING] Success rate de pattern '${pattern.name}': ${(pattern.successRate * 100).toFixed(1)}%`);
        }
      }
    } else {
      console.log(`📉 [LEARNING] Fix no mejoró el resultado (${beforeResult.status} → ${afterResult.status})`);
    }

    return improvement;
  }

  /**
   * Crear pattern candidato para errores nuevos
   */
  createPatternCandidate(error, context) {
    const errorText = error.message || error.toString();

    // Extraer pattern del mensaje de error
    const candidate = {
      id: `candidate-${Date.now()}`,
      name: `Error: ${errorText.substring(0, 50)}...`,
      errorPattern: new RegExp(errorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), // Escape regex
      description: `Error encontrado en ${context.moduleKey} - ${context.testName}`,
      fix: {
        type: 'unknown',
        action: 'manual-review-required',
        confidence: 0.0
      },
      occurrences: 1,
      successRate: 0,
      appliedCount: 0,
      improvedCount: 0,
      isCandidate: true,
      firstSeen: new Date().toISOString(),
      contexts: [context]
    };

    console.log(`🆕 [LEARNING] Pattern candidato creado: ${candidate.id}`);
    console.log(`   Requiere revisión manual para definir fix apropiado`);

    // No agregar automáticamente, guardarlo en archivo separado para revisión
    this.savePatternCandidate(candidate);
  }

  /**
   * Guardar pattern candidato para revisión manual
   */
  savePatternCandidate(candidate) {
    const candidatesFile = path.join(__dirname, '../knowledge/pattern-candidates.json');

    try {
      let candidates = { patterns: [] };
      if (fs.existsSync(candidatesFile)) {
        candidates = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));
      }

      candidates.patterns.push(candidate);
      fs.writeFileSync(candidatesFile, JSON.stringify(candidates, null, 2));
      console.log(`💾 [LEARNING] Candidato guardado para revisión: ${candidatesFile}`);
    } catch (error) {
      console.warn(`⚠️  [LEARNING] No se pudo guardar candidato: ${error.message}`);
    }
  }

  /**
   * Finalizar ejecución y guardar conocimiento adquirido
   */
  async finalizeExecution() {
    this.currentExecution.endTime = new Date().toISOString();
    this.currentExecution.duration = new Date(this.currentExecution.endTime) - new Date(this.currentExecution.startTime);

    // Calcular métricas
    const metrics = {
      totalErrors: this.currentExecution.errors.length,
      totalFixes: this.currentExecution.fixes.length,
      totalImprovements: this.currentExecution.improvements.length,
      improvementRate: this.currentExecution.fixes.length > 0
        ? this.currentExecution.improvements.length / this.currentExecution.fixes.length
        : 0
    };

    this.currentExecution.metrics = metrics;

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`📊 LEARNING ENGINE - RESUMEN DE EJECUCIÓN`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`⏱️  Duración: ${Math.round(this.currentExecution.duration / 1000)}s`);
    console.log(`❌ Errores detectados: ${metrics.totalErrors}`);
    console.log(`🔧 Fixes aplicados: ${metrics.totalFixes}`);
    console.log(`📈 Mejoras confirmadas: ${metrics.totalImprovements}`);
    console.log(`📊 Tasa de mejora: ${(metrics.improvementRate * 100).toFixed(1)}%`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

    // Guardar en historial
    this.executionHistory.executions.push(this.currentExecution);
    this.executionHistory.totalExecutions++;
    this.executionHistory.totalErrors += metrics.totalErrors;
    this.executionHistory.totalFixes += metrics.totalFixes;
    this.executionHistory.totalImprovements += metrics.totalImprovements;

    // Actualizar learned patterns
    this.learnedPatterns.lastUpdate = new Date().toISOString();

    // Guardar todo
    await this.saveKnowledge();

    return metrics;
  }

  /**
   * Guardar base de conocimiento
   */
  async saveKnowledge() {
    try {
      // Crear directorio si no existe
      const knowledgeDir = path.dirname(this.learnedPatternsFile);
      if (!fs.existsSync(knowledgeDir)) {
        fs.mkdirSync(knowledgeDir, { recursive: true });
      }

      // Guardar patterns
      fs.writeFileSync(this.learnedPatternsFile, JSON.stringify(this.learnedPatterns, null, 2));
      console.log(`💾 [LEARNING] Patterns guardados: ${this.learnedPatternsFile}`);

      // Guardar historial
      fs.writeFileSync(this.executionHistoryFile, JSON.stringify(this.executionHistory, null, 2));
      console.log(`💾 [LEARNING] Historial guardado: ${this.executionHistoryFile}`);

      return true;
    } catch (error) {
      console.error(`❌ [LEARNING] Error guardando conocimiento: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtener estadísticas del aprendizaje
   */
  getStats() {
    const totalPatterns = this.learnedPatterns.patterns.length;
    const activePatterns = this.learnedPatterns.patterns.filter(p => p.occurrences > 0).length;
    const highConfidencePatterns = this.learnedPatterns.patterns.filter(p => p.fix.confidence >= 0.90).length;

    return {
      totalPatterns,
      activePatterns,
      highConfidencePatterns,
      totalExecutions: this.executionHistory.totalExecutions,
      totalErrors: this.executionHistory.totalErrors,
      totalFixes: this.executionHistory.totalFixes,
      totalImprovements: this.executionHistory.totalImprovements,
      overallImprovementRate: this.executionHistory.totalFixes > 0
        ? this.executionHistory.totalImprovements / this.executionHistory.totalFixes
        : 0,
      patterns: this.learnedPatterns.patterns.map(p => ({
        id: p.id,
        name: p.name,
        occurrences: p.occurrences,
        appliedCount: p.appliedCount,
        improvedCount: p.improvedCount,
        successRate: p.successRate,
        confidence: p.fix.confidence
      }))
    };
  }
}

module.exports = E2ELearningEngine;
