/**
 * AUDITOR KNOWLEDGE BASE - Sistema de aprendizaje del auditor
 *
 * Almacena:
 * - Errores recurrentes y sus soluciones exitosas
 * - Patrones de error detectados
 * - Fixes aplicados con tasa de éxito
 * - Recomendaciones mejoradas con feedback
 *
 * @version 1.0.0
 * @date 2025-01-21
 */

class AuditorKnowledgeBase {
  constructor(database) {
    this.database = database;
    this.AuditLog = database.AuditLog;

    // Cache en memoria para acceso rápido
    this.errorPatterns = new Map(); // error_type → count, solutions
    this.successfulFixes = new Map(); // fix_strategy → success_rate
    this.moduleHealth = new Map(); // module_name → health_trend
  }

  /**
   * Inicializar knowledge base desde BD
   */
  async initialize() {
    console.log('🧠 [KB] Inicializando Knowledge Base...');

    await this._loadErrorPatterns();
    await this._loadSuccessfulFixes();
    await this._loadModuleHealth();

    console.log('✅ [KB] Knowledge Base inicializada');
    console.log(`   📚 Patrones de error: ${this.errorPatterns.size}`);
    console.log(`   🔧 Fixes exitosos: ${this.successfulFixes.size}`);
    console.log(`   📊 Módulos monitoreados: ${this.moduleHealth.size}`);
  }

  /**
   * Cargar patrones de error recurrentes desde audit_logs
   */
  async _loadErrorPatterns() {
    try {
      const logs = await this.AuditLog.findAll({
        where: {
          status: ['fail', 'warning'],
          error_type: { [require('sequelize').Op.ne]: null }
        },
        attributes: [
          'error_type',
          'error_message',
          'fix_strategy',
          'fix_applied',
          [require('sequelize').fn('COUNT', require('sequelize').col('*')), 'count']
        ],
        group: ['error_type', 'error_message', 'fix_strategy', 'fix_applied']
      });

      for (const log of logs) {
        const key = log.error_type;
        const existing = this.errorPatterns.get(key) || { count: 0, messages: [], solutions: [] };

        existing.count += parseInt(log.dataValues.count);

        if (!existing.messages.includes(log.error_message)) {
          existing.messages.push(log.error_message);
        }

        if (log.fix_strategy && log.fix_applied) {
          if (!existing.solutions.find(s => s.strategy === log.fix_strategy)) {
            existing.solutions.push({
              strategy: log.fix_strategy,
              applied: log.fix_applied,
              count: parseInt(log.dataValues.count)
            });
          }
        }

        this.errorPatterns.set(key, existing);
      }

    } catch (error) {
      console.error('   ⚠️  Error cargando error patterns:', error.message);
    }
  }

  /**
   * Cargar fixes exitosos con tasa de éxito
   */
  async _loadSuccessfulFixes() {
    try {
      const { sequelize } = this.database;

      const [fixes] = await sequelize.query(`
        SELECT
          fix_strategy,
          COUNT(*) as total_applied,
          SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as successes
        FROM audit_logs
        WHERE fix_applied = 'true'
          AND fix_strategy IS NOT NULL
        GROUP BY fix_strategy
        ORDER BY successes DESC
      `);

      for (const fix of fixes) {
        const successRate = parseInt(fix.successes) / parseInt(fix.total_applied);

        this.successfulFixes.set(fix.fix_strategy, {
          total: parseInt(fix.total_applied),
          successes: parseInt(fix.successes),
          successRate: successRate,
          confidence: successRate > 0.8 ? 'high' : successRate > 0.5 ? 'medium' : 'low'
        });
      }

    } catch (error) {
      console.error('   ⚠️  Error cargando successful fixes:', error.message);
    }
  }

  /**
   * Cargar health trend de módulos (últimos 30 días)
   */
  async _loadModuleHealth() {
    try {
      const { sequelize } = this.database;

      const [trends] = await sequelize.query(`
        SELECT
          module_name,
          COUNT(*) as total_tests,
          SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failed,
          AVG(duration_ms) as avg_duration
        FROM audit_logs
        WHERE completed_at > NOW() - INTERVAL '30 days'
          AND module_name IS NOT NULL
        GROUP BY module_name
        ORDER BY module_name
      `);

      for (const trend of trends) {
        const successRate = parseInt(trend.passed) / parseInt(trend.total_tests);

        this.moduleHealth.set(trend.module_name, {
          total: parseInt(trend.total_tests),
          passed: parseInt(trend.passed),
          failed: parseInt(trend.failed),
          successRate: successRate,
          avgDuration: parseFloat(trend.avg_duration),
          health: successRate > 0.9 ? 'good' : successRate > 0.7 ? 'fair' : 'poor'
        });
      }

    } catch (error) {
      console.error('   ⚠️  Error cargando module health:', error.message);
    }
  }

  /**
   * Obtener recomendación inteligente para un error
   */
  getSuggestionForError(errorType, errorMessage, moduleName) {
    // 1. Buscar en patrones de error conocidos
    const pattern = this.errorPatterns.get(errorType);

    if (pattern && pattern.solutions.length > 0) {
      // Ordenar soluciones por count (las más usadas primero)
      const sortedSolutions = pattern.solutions.sort((a, b) => b.count - a.count);

      const topSolution = sortedSolutions[0];

      // Verificar tasa de éxito de esta estrategia
      const fixData = this.successfulFixes.get(topSolution.strategy);

      return {
        strategy: topSolution.strategy,
        confidence: fixData ? fixData.confidence : 'medium',
        successRate: fixData ? fixData.successRate : 0.5,
        reason: `Esta estrategia ha sido aplicada ${topSolution.count} veces para ${errorType}`,
        source: 'knowledge-base'
      };
    }

    // 2. Buscar similitud con mensajes de error anteriores
    for (const [type, data] of this.errorPatterns.entries()) {
      for (const msg of data.messages) {
        if (this._isSimilar(errorMessage, msg)) {
          if (data.solutions.length > 0) {
            return {
              strategy: data.solutions[0].strategy,
              confidence: 'medium',
              successRate: 0.6,
              reason: `Error similar encontrado: ${type}`,
              source: 'similarity-match'
            };
          }
        }
      }
    }

    // 3. Revisar health del módulo para contexto
    const moduleHealthData = this.moduleHealth.get(moduleName);

    if (moduleHealthData && moduleHealthData.health === 'poor') {
      return {
        strategy: 'module-needs-refactor',
        confidence: 'low',
        successRate: 0.3,
        reason: `Módulo ${moduleName} tiene health: ${moduleHealthData.health} (${(moduleHealthData.successRate * 100).toFixed(1)}% success rate)`,
        source: 'module-health-analysis'
      };
    }

    // 4. No hay información suficiente
    return {
      strategy: 'manual-review',
      confidence: 'low',
      successRate: 0,
      reason: 'Error nuevo, sin patrones previos en knowledge base',
      source: 'fallback'
    };
  }

  /**
   * Registrar nuevo fix aplicado (para aprendizaje)
   */
  async recordFix(errorType, fixStrategy, success, executionId) {
    console.log(`🧠 [KB] Registrando fix: ${fixStrategy} → ${success ? '✅' : '❌'}`);

    // Actualizar en BD (ya está en audit_logs)

    // Actualizar cache en memoria
    const existingFix = this.successfulFixes.get(fixStrategy) || {
      total: 0,
      successes: 0,
      successRate: 0
    };

    existingFix.total += 1;
    if (success) {
      existingFix.successes += 1;
    }
    existingFix.successRate = existingFix.successes / existingFix.total;
    existingFix.confidence = existingFix.successRate > 0.8 ? 'high' : existingFix.successRate > 0.5 ? 'medium' : 'low';

    this.successfulFixes.set(fixStrategy, existingFix);
  }

  /**
   * Obtener estadísticas de la knowledge base
   */
  getStats() {
    const topErrors = Array.from(this.errorPatterns.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([type, data]) => ({
        type,
        count: data.count,
        hasSolutions: data.solutions.length > 0
      }));

    const topFixes = Array.from(this.successfulFixes.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([strategy, data]) => ({
        strategy,
        ...data
      }));

    const modulesByHealth = Array.from(this.moduleHealth.entries())
      .sort((a, b) => b[1].successRate - a[1].successRate)
      .map(([module, data]) => ({
        module,
        ...data
      }));

    return {
      totalErrorPatterns: this.errorPatterns.size,
      totalFixStrategies: this.successfulFixes.size,
      totalModulesMonitored: this.moduleHealth.size,
      topErrors,
      topFixes,
      modulesByHealth
    };
  }

  /**
   * Comparar similitud entre dos strings (simple Levenshtein distance)
   */
  _isSimilar(str1, str2, threshold = 0.7) {
    if (!str1 || !str2) return false;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return true;

    const distance = this._levenshtein(longer.toLowerCase(), shorter.toLowerCase());
    const similarity = (longer.length - distance) / longer.length;

    return similarity >= threshold;
  }

  /**
   * Levenshtein distance (distancia de edición)
   */
  _levenshtein(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

module.exports = AuditorKnowledgeBase;
