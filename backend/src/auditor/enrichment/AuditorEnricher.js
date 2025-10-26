const fs = require('fs').promises;
const path = require('path');
const KnowledgeBase = require('../knowledge/KnowledgeBase');

/**
 * AuditorEnricher - Actualizador de Componentes del Sistema
 *
 * RETROALIMENTA el conocimiento aprendido hacia:
 * - SystemRegistry: Agrega nuevos tipos de error, dependencias, flows
 * - HybridHealer: Agrega patrones de reparación validados
 * - Collectors: Agrega edge case tests
 *
 * INTEGRACIÓN: Toma conocimiento de alta confianza (>=0.9) de KnowledgeBase
 * PERSISTENCIA: Actualiza archivos .js y .json para que los cambios perduren
 * EVOLUCIÓN: Cada ciclo, el sistema aprende y se auto-mejora
 */
class AuditorEnricher {
  constructor() {
    this.knowledgeBase = new KnowledgeBase();
    this.REGISTRY_PATH = path.join(__dirname, '../registry/modules-registry.json');
    this.HEALER_PATH = path.join(__dirname, '../healers/HybridHealer.js');
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 1: ENRIQUECIMIENTO DEL REGISTRY
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Agregar nuevo tipo de error al Registry
   * @param {String} errorType - Tipo de error
   * @param {Object} metadata - Metadata del error
   */
  async addErrorType(errorType, metadata = {}) {
    try {
      console.log(`📚 [ENRICHER] Agregando tipo de error al Registry: ${errorType}`);

      // Leer Registry actual
      const registry = await this._readRegistry();

      // Buscar módulos afectados por este error
      const affectedModules = metadata.modules || [];

      for (const moduleKey of affectedModules) {
        const module = registry.modules[moduleKey];

        if (module) {
          // Agregar error type a commonIssues si no existe
          if (!module.help) module.help = {};
          if (!module.help.commonIssues) module.help.commonIssues = [];

          const issueExists = module.help.commonIssues.some(issue =>
            issue.includes(errorType) || issue.includes(metadata.message)
          );

          if (!issueExists) {
            module.help.commonIssues.push(
              `${errorType}: ${metadata.message || 'Unknown error'} - ${metadata.suggestedFix || 'Review and fix manually'}`
            );

            console.log(`  ✅ [ENRICHER] Error agregado a módulo ${moduleKey}`);
          }
        }
      }

      // Guardar Registry actualizado
      await this._writeRegistry(registry);

      return { success: true, affected_modules: affectedModules.length };
    } catch (error) {
      console.error(`❌ [ENRICHER] Error agregando error type:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar dependencias de módulo basado en comportamiento observado
   * @param {String} moduleId - ID del módulo
   * @param {Array} newDependencies - Nuevas dependencias descubiertas
   */
  async updateModuleDependencies(moduleId, newDependencies) {
    try {
      console.log(`🔗 [ENRICHER] Actualizando dependencias de ${moduleId}`);

      const registry = await this._readRegistry();
      const module = registry.modules[moduleId];

      if (!module) {
        console.warn(`  ⚠️ [ENRICHER] Módulo ${moduleId} no existe en Registry`);
        return { success: false, error: 'module_not_found' };
      }

      // Inicializar dependencies si no existe
      if (!module.dependencies) {
        module.dependencies = {
          required: [],
          optional: [],
          integrates_with: [],
          provides_to: []
        };
      }

      // Agregar nuevas dependencias (evitar duplicados)
      let added = 0;

      for (const dep of newDependencies) {
        const depType = dep.type || 'optional'; // required, optional, integrates_with, provides_to
        const depModule = dep.module;

        if (!module.dependencies[depType].includes(depModule)) {
          module.dependencies[depType].push(depModule);
          added++;
          console.log(`  ✅ [ENRICHER] Dependencia agregada: ${moduleId} -[${depType}]-> ${depModule}`);
        }
      }

      if (added > 0) {
        await this._writeRegistry(registry);
      }

      return { success: true, dependencies_added: added };
    } catch (error) {
      console.error(`❌ [ENRICHER] Error actualizando dependencias:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Agregar business flow descubierto
   * @param {String} moduleId - ID del módulo
   * @param {Object} flow - Flow a agregar
   */
  async addBusinessFlow(moduleId, flow) {
    try {
      console.log(`🔄 [ENRICHER] Agregando business flow a ${moduleId}`);

      const registry = await this._readRegistry();
      const module = registry.modules[moduleId];

      if (!module) {
        return { success: false, error: 'module_not_found' };
      }

      if (!module.business_flows) module.business_flows = [];

      // Verificar si el flow ya existe (por nombre)
      const flowExists = module.business_flows.some(f => f.name === flow.name);

      if (!flowExists) {
        module.business_flows.push(flow);
        await this._writeRegistry(registry);
        console.log(`  ✅ [ENRICHER] Business flow agregado: ${flow.name}`);
        return { success: true };
      }

      return { success: false, error: 'flow_already_exists' };
    } catch (error) {
      console.error(`❌ [ENRICHER] Error agregando business flow:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 2: ENRIQUECIMIENTO DEL HEALER
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Agregar patrón de reparación validado al Healer
   * @param {Object} pattern - Patrón de reparación
   */
  async addRepairPattern(pattern) {
    try {
      console.log(`🔧 [ENRICHER] Agregando patrón de reparación: ${pattern.name}`);

      // Verificar que el patrón tenga alta confianza
      const strategy = await this.knowledgeBase.getRepairStrategies(pattern.error_type);
      const validatedStrategy = strategy.find(s =>
        s.key.includes(pattern.name) && s.success_rate >= 0.7 && s.confidence_score >= 0.9
      );

      if (!validatedStrategy) {
        console.warn(`  ⚠️ [ENRICHER] Patrón no validado (baja confianza o success_rate < 70%)`);
        return { success: false, error: 'not_validated' };
      }

      // Leer archivo HybridHealer
      const healerCode = await fs.readFile(this.HEALER_PATH, 'utf-8');

      // Verificar si el patrón ya existe
      if (healerCode.includes(`name: '${pattern.name}'`)) {
        console.log(`  ℹ️ [ENRICHER] Patrón ya existe en HybridHealer`);
        return { success: false, error: 'pattern_exists' };
      }

      // Crear código del nuevo patrón
      const newPatternCode = this._generatePatternCode(pattern);

      // Insertar en sección safe o critical
      const section = pattern.safety === 'safe' ? 'SAFE PATTERNS' : 'CRITICAL PATTERNS';
      const insertMarker = section === 'SAFE PATTERNS'
        ? '// ═══ SAFE PATTERNS ═══'
        : '// ═══ CRITICAL PATTERNS (suggest only) ═══';

      const insertIndex = healerCode.indexOf(insertMarker);

      if (insertIndex === -1) {
        console.warn(`  ⚠️ [ENRICHER] No se encontró sección ${section} en HybridHealer`);
        return { success: false, error: 'section_not_found' };
      }

      // Insertar después del marker
      const updatedCode = [
        healerCode.slice(0, insertIndex + insertMarker.length),
        `\n\n      // ⭐ AUTO-LEARNED PATTERN (added by AuditorEnricher)\n`,
        newPatternCode,
        healerCode.slice(insertIndex + insertMarker.length)
      ].join('');

      // Guardar archivo actualizado
      await fs.writeFile(this.HEALER_PATH, updatedCode, 'utf-8');

      console.log(`  ✅ [ENRICHER] Patrón agregado a HybridHealer`);

      return { success: true };
    } catch (error) {
      console.error(`❌ [ENRICHER] Error agregando patrón:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mejorar estrategia existente basado en resultados
   * @param {String} strategyId - ID de la estrategia
   * @param {Object} improvements - Mejoras a aplicar
   */
  async improveStrategy(strategyId, improvements) {
    try {
      console.log(`🔼 [ENRICHER] Mejorando estrategia: ${strategyId}`);

      // Obtener estrategia actual de KB
      const strategies = await this.knowledgeBase.getRepairStrategies(strategyId);

      if (strategies.length === 0) {
        return { success: false, error: 'strategy_not_found' };
      }

      const strategy = strategies[0];

      // Solo mejorar si success_rate >= 0.8 (validada)
      if (strategy.success_rate < 0.8) {
        console.warn(`  ⚠️ [ENRICHER] Estrategia no validada (success_rate < 80%)`);
        return { success: false, error: 'not_validated' };
      }

      // TODO: Actualizar código de HybridHealer.js con mejoras
      // Por ahora, solo registramos la mejora en KB como sugerencia

      await this.knowledgeBase.createSuggestion({
        type: 'strategy_improvement',
        knowledge_key: strategy.key,
        title: `Improve strategy ${strategyId}`,
        description: `Strategy has ${(strategy.success_rate * 100).toFixed(1)}% success rate. Suggested improvements: ${JSON.stringify(improvements)}`,
        code_example: improvements.code || null,
        priority: 'medium'
      });

      console.log(`  ✅ [ENRICHER] Sugerencia de mejora creada`);

      return { success: true };
    } catch (error) {
      console.error(`❌ [ENRICHER] Error mejorando estrategia:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 3: ENRIQUECIMIENTO DE COLLECTORS
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Agregar edge case test a un Collector
   * @param {String} moduleId - ID del módulo
   * @param {Object} edgeCase - Edge case a testear
   */
  async addEdgeCaseTest(moduleId, edgeCase) {
    try {
      console.log(`🧪 [ENRICHER] Agregando edge case test para ${moduleId}`);

      // Crear sugerencia (implementación manual requerida)
      await this.knowledgeBase.createSuggestion({
        type: 'edge_case_test',
        knowledge_key: `module_behavior:${moduleId}`,
        title: `Add edge case test for ${moduleId}`,
        description: `Edge case discovered: ${edgeCase.description || edgeCase.type}`,
        code_example: {
          test_name: `test_${edgeCase.type}_${moduleId}`,
          test_code: `
async testEdgeCase_${edgeCase.type}() {
  // Test: ${edgeCase.description}
  // Input: ${JSON.stringify(edgeCase.input)}
  // Expected: ${edgeCase.expected}

  const result = await this.testModule('${moduleId}', ${JSON.stringify(edgeCase.input)});

  // Assert expected behavior
  assert(result.matches(${edgeCase.expected}));
}
          `.trim()
        },
        priority: 'high'
      });

      console.log(`  ✅ [ENRICHER] Sugerencia de edge case test creada`);

      return { success: true };
    } catch (error) {
      console.error(`❌ [ENRICHER] Error agregando edge case test:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 4: ENRIQUECIMIENTO AUTOMÁTICO COMPLETO
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * Ejecutar enriquecimiento completo basado en conocimiento de alta confianza
   */
  async runAutoEnrichment() {
    try {
      console.log(`\n🌱 [ENRICHER] ══════════════════════════════════════════════`);
      console.log(`🌱 [ENRICHER] INICIANDO AUTO-ENRIQUECIMIENTO DEL SISTEMA`);
      console.log(`🌱 [ENRICHER] ══════════════════════════════════════════════\n`);

      const results = {
        timestamp: new Date(),
        registry_updates: 0,
        healer_updates: 0,
        collector_updates: 0,
        total_changes: 0
      };

      // 1. Obtener conocimiento de alta confianza (>= 0.9)
      const highConfidencePatterns = await this.knowledgeBase.getErrorPatterns({
        minConfidence: 0.9,
        limit: 100
      });

      console.log(`📚 [ENRICHER] ${highConfidencePatterns.length} patrones de alta confianza encontrados\n`);

      // 2. Actualizar Registry con nuevos errores comunes
      for (const pattern of highConfidencePatterns.slice(0, 20)) {
        const patternData = typeof pattern.data === 'string' ? JSON.parse(pattern.data) : pattern.data;

        const result = await this.addErrorType(patternData.type || patternData.category, {
          message: patternData.message,
          suggestedFix: patternData.suggestedFix,
          modules: pattern.tags || []
        });

        if (result.success) {
          results.registry_updates++;
          results.total_changes++;
        }
      }

      // 3. Obtener estrategias validadas (>= 70% success, >= 0.9 confidence)
      const validatedStrategies = await this.knowledgeBase.getRepairStrategies();
      const topStrategies = validatedStrategies.filter(s =>
        s.success_rate >= 0.7 && s.confidence_score >= 0.9
      );

      console.log(`🔧 [ENRICHER] ${topStrategies.length} estrategias validadas encontradas\n`);

      // 4. Agregar estrategias al Healer (máximo 5 por ciclo)
      for (const strategy of topStrategies.slice(0, 5)) {
        const strategyData = typeof strategy.data === 'string' ? JSON.parse(strategy.data) : strategy.data;

        const result = await this.addRepairPattern({
          name: strategyData.strategy || strategy.key.split(':')[1],
          error_type: strategy.key.split(':')[1],
          pattern: strategyData.strategy,
          fix_template: strategyData.last_result?.fix || 'Auto-generated fix',
          safety: 'safe' // Por defecto safe, luego se puede ajustar manualmente
        });

        if (result.success) {
          results.healer_updates++;
          results.total_changes++;
        }
      }

      // 5. Generar sugerencias de edge case tests
      const moduleBehaviors = await this._getModuleBehaviors();

      for (const [moduleId, behavior] of Object.entries(moduleBehaviors).slice(0, 10)) {
        if (behavior.occurrences >= 5) { // Solo módulos con suficientes datos
          const result = await this.addEdgeCaseTest(moduleId, {
            type: 'high_occurrence',
            description: `Module tested ${behavior.occurrences} times with varying results`,
            input: behavior.data?.last_metrics || {},
            expected: 'consistent behavior'
          });

          if (result.success) {
            results.collector_updates++;
            results.total_changes++;
          }
        }
      }

      console.log(`\n🌱 [ENRICHER] ══════════════════════════════════════════════`);
      console.log(`🌱 [ENRICHER] AUTO-ENRIQUECIMIENTO COMPLETADO`);
      console.log(`🌱 [ENRICHER] ══════════════════════════════════════════════`);
      console.log(`📊 [ENRICHER] Registry actualizaciones: ${results.registry_updates}`);
      console.log(`📊 [ENRICHER] Healer actualizaciones: ${results.healer_updates}`);
      console.log(`📊 [ENRICHER] Collector sugerencias: ${results.collector_updates}`);
      console.log(`📊 [ENRICHER] TOTAL CAMBIOS: ${results.total_changes}\n`);

      return results;
    } catch (error) {
      console.error(`❌ [ENRICHER] Error en auto-enriquecimiento:`, error.message);
      return null;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * SECCIÓN 5: MÉTODOS PRIVADOS (HELPERS)
   * ═══════════════════════════════════════════════════════════
   */

  async _readRegistry() {
    try {
      const content = await fs.readFile(this.REGISTRY_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ [ENRICHER] Error leyendo Registry:`, error.message);
      throw error;
    }
  }

  async _writeRegistry(registry) {
    try {
      await fs.writeFile(
        this.REGISTRY_PATH,
        JSON.stringify(registry, null, 2),
        'utf-8'
      );
      console.log(`  💾 [ENRICHER] Registry actualizado`);
    } catch (error) {
      console.error(`❌ [ENRICHER] Error escribiendo Registry:`, error.message);
      throw error;
    }
  }

  async _getModuleBehaviors() {
    try {
      const behaviors = {};

      // Query directo a la tabla auditor_knowledge_base
      const query = `
        SELECT key, data, occurrences
        FROM auditor_knowledge_base
        WHERE knowledge_type = 'module_behavior'
          AND status = 'active'
        ORDER BY occurrences DESC
        LIMIT 50
      `;

      const [results] = await this.knowledgeBase.db.query(query);

      for (const row of results) {
        const moduleId = row.key.replace('module_behavior:', '');
        behaviors[moduleId] = {
          occurrences: row.occurrences,
          data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
        };
      }

      return behaviors;
    } catch (error) {
      console.error(`❌ [ENRICHER] Error obteniendo comportamientos:`, error.message);
      return {};
    }
  }

  _generatePatternCode(pattern) {
    return `      {
        name: '${pattern.name}',
        detect: (error) => {
          return error.message && error.message.includes('${pattern.error_type}');
        },
        fix: async (error, context) => {
          ${pattern.fix_template || `// Auto-generated fix for ${pattern.name}`}
          return {
            success: true,
            changes: [{
              file: context.file,
              fix: 'Applied auto-learned fix',
              pattern: '${pattern.name}'
            }]
          };
        }
      },`;
  }
}

module.exports = AuditorEnricher;
