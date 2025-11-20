const { Sequelize, Op } = require('sequelize');
const db = require('../../config/database');

/**
 * KnowledgeBase - Cerebro del sistema auto-evolutivo
 *
 * Almacena TODO el conocimiento adquirido de los tests:
 * - Patrones de errores
 * - Comportamientos de módulos
 * - Estrategias de reparación
 * - Edge cases
 * - Performance metrics
 *
 * PERSISTENCIA: PostgreSQL (nunca se pierde conocimiento)
 * CONFIANZA: Sistema graduado (0.0 → 1.0) basado en ocurrencias
 * EVOLUCIÓN: Cada test enriquece el conocimiento
 */
class KnowledgeBase {
  constructor() {
    this.db = db;
    this.sequelize = db.sequelize; // FIX: Obtener instancia de Sequelize para raw queries
    this.TABLE = 'auditor_knowledge_base';
    this.HISTORY_TABLE = 'auditor_learning_history';
    this.SUGGESTIONS_TABLE = 'auditor_suggestions';
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 1: ALMACENAMIENTO DE CONOCIMIENTO
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Registrar patrón de error descubierto
   * @param {Object} pattern - Patrón de error
   * @param {Object} context - Contexto donde ocurrió
   */
  async recordErrorPattern(pattern, context = {}) {
    try {
      const key = `error_pattern:${pattern.type || pattern.category}:${this._hashMessage(pattern.message)}`;

      const existing = await this._getByKey(key);

      if (existing) {
        // Ya existe → Incrementar occurrences y actualizar confidence
        await this._updateKnowledge(key, {
          occurrences: existing.occurrences + 1,
          confidence_score: this._calculateConfidence(existing.occurrences + 1),
          last_updated: new Date()
        });

        console.log(`📚 [KB] Patrón actualizado: ${key} (${existing.occurrences + 1} ocurrencias)`);
      } else {
        // Nuevo patrón → Crear
        await this._createKnowledge({
          knowledge_type: 'error_pattern',
          key,
          data: {
            type: pattern.type,
            category: pattern.category,
            message: pattern.message,
            file: pattern.file,
            line: pattern.line,
            severity: pattern.severity,
            canAutoFix: pattern.canAutoFix,
            suggestedFix: pattern.suggestedFix,
            context
          },
          confidence_score: 0.3, // Baja confianza inicial
          occurrences: 1,
          tags: [pattern.category, pattern.severity, context.module || 'unknown'],
          priority: this._mapSeverityToPriority(pattern.severity),
          status: 'active'
        });

        console.log(`✨ [KB] Nuevo patrón registrado: ${key}`);
      }

      // Registrar en historial
      await this._logHistory({
        action: 'record_error_pattern',
        knowledge_key: key,
        details: { pattern, context }
      });

      return { success: true, key };
    } catch (error) {
      console.error(`❌ [KB] Error registrando patrón:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Registrar comportamiento de módulo
   * @param {String} moduleId - ID del módulo
   * @param {Object} metrics - Métricas del módulo
   */
  async recordModuleBehavior(moduleId, metrics) {
    try {
      const key = `module_behavior:${moduleId}`;

      const existing = await this._getByKey(key);

      const newData = {
        module_id: moduleId,
        last_metrics: metrics,
        timestamp: new Date(),
        ...(existing ? { history: [...(existing.data.history || []), metrics] } : { history: [metrics] })
      };

      if (existing) {
        await this._updateKnowledge(key, {
          data: newData,
          occurrences: existing.occurrences + 1,
          confidence_score: this._calculateConfidence(existing.occurrences + 1),
          last_updated: new Date()
        });
      } else {
        await this._createKnowledge({
          knowledge_type: 'module_behavior',
          key,
          data: newData,
          confidence_score: 0.3,
          occurrences: 1,
          tags: [moduleId, 'behavior'],
          priority: 'medium',
          status: 'active'
        });
      }

      console.log(`📊 [KB] Comportamiento registrado: ${moduleId}`);

      await this._logHistory({
        action: 'record_module_behavior',
        knowledge_key: key,
        details: { moduleId, metrics }
      });

      return { success: true, key };
    } catch (error) {
      console.error(`❌ [KB] Error registrando comportamiento:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Registrar estrategia de reparación y su resultado
   * @param {Object} strategy - Estrategia aplicada
   * @param {Object} result - Resultado de aplicar la estrategia
   */
  async recordRepairStrategy(strategy, result) {
    try {
      const key = `repair_strategy:${strategy.pattern || strategy.strategy_id}`;

      const existing = await this._getByKey(key);

      const success = result.success || result.result === 'success';
      const total_attempts = (existing?.data?.total_attempts || 0) + 1;
      const successes = (existing?.data?.successes || 0) + (success ? 1 : 0);
      const success_rate = successes / total_attempts;

      const newData = {
        strategy: strategy.pattern || strategy.strategy_id,
        total_attempts,
        successes,
        failures: total_attempts - successes,
        success_rate,
        last_result: result,
        last_attempt: new Date()
      };

      if (existing) {
        await this._updateKnowledge(key, {
          data: newData,
          success_rate,
          confidence_score: this._calculateConfidence(total_attempts),
          occurrences: total_attempts,
          last_updated: new Date()
        });
      } else {
        await this._createKnowledge({
          knowledge_type: 'repair_strategy',
          key,
          data: newData,
          success_rate,
          confidence_score: 0.3,
          occurrences: 1,
          tags: [strategy.pattern || 'unknown', 'repair'],
          priority: success ? 'high' : 'low',
          status: 'active'
        });
      }

      console.log(`🔧 [KB] Estrategia registrada: ${key} (éxito: ${success}, rate: ${(success_rate * 100).toFixed(1)}%)`);

      await this._logHistory({
        action: 'record_repair_strategy',
        knowledge_key: key,
        details: { strategy, result }
      });

      return { success: true, key, success_rate };
    } catch (error) {
      console.error(`❌ [KB] Error registrando estrategia:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 2: CONSULTA DE CONOCIMIENTO
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Obtener patrones de error por confianza mínima
   * @param {Number} minConfidence - Confianza mínima (0.0 a 1.0)
   */
  async getErrorPatterns(filters = {}) {
    try {
      const { minConfidence = 0.5, category, severity, canAutoFix, limit = 100 } = filters;

      const query = `
        SELECT * FROM ${this.TABLE}
        WHERE knowledge_type = 'error_pattern'
          AND confidence_score >= $1
          AND status = 'active'
          ${category ? `AND data->>'category' = $2` : ''}
          ${severity ? `AND data->>'severity' = $3` : ''}
          ${canAutoFix !== undefined ? `AND (data->>'canAutoFix')::boolean = $4` : ''}
        ORDER BY confidence_score DESC, occurrences DESC
        LIMIT $5
      `;

      const params = [minConfidence];
      if (category) params.push(category);
      if (severity) params.push(severity);
      if (canAutoFix !== undefined) params.push(canAutoFix);
      params.push(limit);

      const [results] = await this.sequelize.query(query, { bind: params });

      console.log(`🔍 [KB] Encontrados ${results.length} patrones de error (confidence >= ${minConfidence})`);
      return results;
    } catch (error) {
      console.error(`❌ [KB] Error obteniendo patrones:`, error.message);
      return [];
    }
  }

  /**
   * Obtener estrategias de reparación ordenadas por tasa de éxito
   * @param {String} errorType - Tipo de error (opcional)
   */
  async getRepairStrategies(errorType = null) {
    try {
      const query = `
        SELECT * FROM ${this.TABLE}
        WHERE knowledge_type = 'repair_strategy'
          AND status = 'active'
          ${errorType ? `AND key LIKE $1` : ''}
        ORDER BY success_rate DESC, confidence_score DESC
        LIMIT 50
      `;

      const params = errorType ? [`repair_strategy:${errorType}%`] : [];

      const [results] = await this.sequelize.query(query, { bind: params });

      console.log(`🔧 [KB] Encontradas ${results.length} estrategias de reparación${errorType ? ` para ${errorType}` : ''}`);
      return results;
    } catch (error) {
      console.error(`❌ [KB] Error obteniendo estrategias:`, error.message);
      return [];
    }
  }

  /**
   * Obtener comportamiento de módulo
   * @param {String} moduleId - ID del módulo
   */
  async getModuleBehavior(moduleId) {
    try {
      const key = `module_behavior:${moduleId}`;
      const result = await this._getByKey(key);

      if (result) {
        console.log(`📊 [KB] Comportamiento encontrado: ${moduleId} (${result.occurrences} ejecuciones)`);
      }

      return result;
    } catch (error) {
      console.error(`❌ [KB] Error obteniendo comportamiento:`, error.message);
      return null;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 3: ACTUALIZACIÓN DE CONFIANZA
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Actualizar score de confianza basado en resultado
   * @param {String} key - Clave del conocimiento
   * @param {Boolean} wasSuccessful - Si la aplicación fue exitosa
   */
  async updateConfidence(key, wasSuccessful) {
    try {
      const existing = await this._getByKey(key);

      if (!existing) {
        console.warn(`⚠️ [KB] No existe conocimiento con key: ${key}`);
        return { success: false, error: 'not_found' };
      }

      const newOccurrences = existing.occurrences + 1;
      const newConfidence = wasSuccessful
        ? Math.min(existing.confidence_score + 0.1, 1.0) // Aumentar en éxito
        : Math.max(existing.confidence_score - 0.05, 0.0); // Reducir en fallo

      await this._updateKnowledge(key, {
        occurrences: newOccurrences,
        confidence_score: newConfidence,
        last_updated: new Date()
      });

      console.log(`📈 [KB] Confianza actualizada: ${key} → ${(newConfidence * 100).toFixed(1)}% (${wasSuccessful ? '✅ éxito' : '❌ fallo'})`);

      await this._logHistory({
        action: 'update_confidence',
        knowledge_key: key,
        details: { wasSuccessful, old_confidence: existing.confidence_score, new_confidence: newConfidence }
      });

      return { success: true, new_confidence: newConfidence };
    } catch (error) {
      console.error(`❌ [KB] Error actualizando confianza:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 4: SUGERENCIAS
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Crear sugerencia para revisión manual
   * @param {Object} suggestion - Sugerencia a crear
   */
  async createSuggestion(suggestion) {
    try {
      const query = `
        INSERT INTO ${this.SUGGESTIONS_TABLE}
        (suggestion_type, knowledge_key, title, description, code_example, priority, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;

      const params = [
        suggestion.type || 'improvement',
        suggestion.knowledge_key || null,
        suggestion.title,
        suggestion.description,
        JSON.stringify(suggestion.code_example || null),
        suggestion.priority || 'medium'
      ];

      const [result] = await this.sequelize.query(query, { bind: params });

      console.log(`💡 [KB] Sugerencia creada: ${suggestion.title}`);
      return result[0];
    } catch (error) {
      console.error(`❌ [KB] Error creando sugerencia:`, error.message);
      return null;
    }
  }

  /**
   * Obtener sugerencias pendientes
   */
  async getPendingSuggestions(limit = 20) {
    try {
      const query = `
        SELECT * FROM ${this.SUGGESTIONS_TABLE}
        WHERE status = 'pending'
        ORDER BY priority DESC, created_at DESC
        LIMIT $1
      `;

      const [results] = await this.sequelize.query(query, { bind: [limit] });

      console.log(`💡 [KB] ${results.length} sugerencias pendientes`);
      return results;
    } catch (error) {
      console.error(`❌ [KB] Error obteniendo sugerencias:`, error.message);
      return [];
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 5: ESTADÍSTICAS Y ANÁLISIS
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Obtener estadísticas generales del conocimiento
   */
  async getStats() {
    try {
      const query = `
        SELECT
          knowledge_type,
          COUNT(*) as count,
          AVG(confidence_score) as avg_confidence,
          SUM(occurrences) as total_occurrences
        FROM ${this.TABLE}
        WHERE status = 'active'
        GROUP BY knowledge_type
      `;

      const [results] = await this.sequelize.query(query);

      console.log(`📊 [KB] Estadísticas generadas`);
      return results;
    } catch (error) {
      console.error(`❌ [KB] Error obteniendo estadísticas:`, error.message);
      return [];
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 6: MÉTODOS PRIVADOS (HELPERS)
   * ═══════════════════════════════════════════════════════════
   */

  async _getByKey(key) {
    try {
      const query = `SELECT * FROM ${this.TABLE} WHERE key = $1 LIMIT 1`;
      const [results] = await this.sequelize.query(query, { bind: [key] });
      return results[0] || null;
    } catch (error) {
      console.error(`❌ [KB] Error en _getByKey:`, error.message);
      return null;
    }
  }

  async _createKnowledge(data) {
    try {
      const query = `
        INSERT INTO ${this.TABLE}
        (knowledge_type, key, data, confidence_score, occurrences, success_rate,
         first_discovered, last_updated, tags, priority, status)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), $7, $8, $9)
        RETURNING *
      `;

      const params = [
        data.knowledge_type,
        data.key,
        JSON.stringify(data.data),
        data.confidence_score || 0.3,
        data.occurrences || 1,
        data.success_rate || null,
        data.tags || [],
        data.priority || 'medium',
        data.status || 'active'
      ];

      const [result] = await this.sequelize.query(query, { bind: params });
      return result[0];
    } catch (error) {
      console.error(`❌ [KB] Error en _createKnowledge:`, error.message);
      throw error;
    }
  }

  async _updateKnowledge(key, updates) {
    try {
      const setClauses = [];
      const params = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(field => {
        if (field === 'data') {
          setClauses.push(`${field} = $${paramIndex}::jsonb`);
          params.push(JSON.stringify(updates[field]));
        } else if (field === 'tags') {
          setClauses.push(`${field} = $${paramIndex}::text[]`);
          params.push(updates[field]);
        } else {
          setClauses.push(`${field} = $${paramIndex}`);
          params.push(updates[field]);
        }
        paramIndex++;
      });

      params.push(key);

      const query = `
        UPDATE ${this.TABLE}
        SET ${setClauses.join(', ')}
        WHERE key = $${paramIndex}
        RETURNING *
      `;

      const [result] = await this.sequelize.query(query, { bind: params });
      return result[0];
    } catch (error) {
      console.error(`❌ [KB] Error en _updateKnowledge:`, error.message);
      throw error;
    }
  }

  async _logHistory(entry) {
    try {
      const query = `
        INSERT INTO ${this.HISTORY_TABLE}
        (action, knowledge_key, details, created_at)
        VALUES ($1, $2, $3, NOW())
      `;

      await this.sequelize.query(query, {
        bind: [entry.action, entry.knowledge_key || null, JSON.stringify(entry.details || {})]
      });
    } catch (error) {
      console.error(`❌ [KB] Error registrando historial:`, error.message);
    }
  }

  _calculateConfidence(occurrences) {
    // Confianza graduada: 1 ocurrencia = 0.3, 3+ = 0.6, 5+ = 0.9
    if (occurrences >= 5) return 0.9;
    if (occurrences >= 3) return 0.6;
    return 0.3;
  }

  _hashMessage(message) {
    // Simple hash para crear key única
    return message.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_');
  }

  _mapSeverityToPriority(severity) {
    const map = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return map[severity] || 'medium';
  }
}

module.exports = KnowledgeBase;
