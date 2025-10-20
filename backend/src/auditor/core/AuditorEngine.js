/**
 * AUDITOR ENGINE - Motor Principal del Sistema de Auditoría
 *
 * Coordina todos los collectors, analyzers y healers
 * Ejecuta tests en secuencia o paralelo según configuración
 * Genera reportes en tiempo real
 *
 * @version 1.0.0
 * @date 2025-01-19
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class AuditorEngine extends EventEmitter {
  constructor(database, config = {}) {
    super();

    this.database = database;
    this.AuditLog = database.AuditLog;

    // Configuración del motor
    this.config = {
      parallel: config.parallel !== false, // Por defecto paralelo
      stopOnCriticalFailure: config.stopOnCriticalFailure || false,
      autoHeal: config.autoHeal !== false, // Por defecto activado
      maxHealAttempts: config.maxHealAttempts || 3,
      timeout: config.timeout || 300000, // 5 minutos default
      environment: config.environment || 'local',
      company_id: config.company_id || null,
      ...config
    };

    // Collectors (se registran dinámicamente)
    this.collectors = new Map();

    // Analyzers
    this.analyzers = new Map();

    // Healers
    this.healers = new Map();

    // Estado de la ejecución actual
    this.currentExecution = null;
    this.lastExecution = null; // Última ejecución completada
    this.isRunning = false;
  }

  // ═══════════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════════

  registerCollector(name, collector) {
    console.log(`📊 [AUDITOR] Registrando collector: ${name}`);
    this.collectors.set(name, collector);
  }

  registerAnalyzer(name, analyzer) {
    console.log(`🔍 [AUDITOR] Registrando analyzer: ${name}`);
    this.analyzers.set(name, analyzer);
  }

  registerHealer(name, healer) {
    console.log(`🔧 [AUDITOR] Registrando healer: ${name}`);
    this.healers.set(name, healer);
  }

  // ═══════════════════════════════════════════════════════════
  // MAIN EXECUTION
  // ═══════════════════════════════════════════════════════════

  async runFullAudit(options = {}) {
    if (this.isRunning) {
      throw new Error('Ya hay una auditoría en ejecución');
    }

    this.isRunning = true;
    const execution_id = uuidv4();
    const startTime = Date.now();

    this.currentExecution = {
      id: execution_id,
      startTime,
      results: [],
      summary: null
    };

    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  🔍 INICIANDO AUDITORÍA COMPLETA                          ║`);
    console.log(`║  Execution ID: ${execution_id}           ║`);
    console.log(`║  Environment: ${this.config.environment.padEnd(10)}                            ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

    try {
      // FASE 1: RECOLECCIÓN DE DATOS
      this.emit('phase', { phase: 'collection', execution_id });
      const collectionResults = await this._runCollectors(execution_id, options);

      // FASE 2: ANÁLISIS
      this.emit('phase', { phase: 'analysis', execution_id });
      const analysisResults = await this._runAnalyzers(execution_id, collectionResults);

      // FASE 3: AUTO-HEALING (si está activado)
      let healingResults = [];
      if (this.config.autoHeal) {
        this.emit('phase', { phase: 'healing', execution_id });
        healingResults = await this._runHealers(execution_id, analysisResults);
      }

      // FASE 4: REPORTE FINAL
      this.emit('phase', { phase: 'reporting', execution_id });
      const summary = await this._generateSummary(execution_id);

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
      console.log(`║  ✅ AUDITORÍA COMPLETADA                                  ║`);
      console.log(`║  Duración: ${(totalDuration / 1000).toFixed(2)}s                               ║`);
      console.log(`║  Tests ejecutados: ${summary.total}                                  ║`);
      console.log(`║  ✅ Passed: ${summary.passed}  ❌ Failed: ${summary.failed}  ⚠️ Warnings: ${summary.warnings}    ║`);
      console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

      this.currentExecution.summary = summary;
      this.currentExecution.endTime = endTime;
      this.currentExecution.duration = totalDuration;

      this.emit('complete', this.currentExecution);

      return this.currentExecution;

    } catch (error) {
      console.error('❌ [AUDITOR] Error durante la auditoría:', error);

      this.emit('error', { execution_id, error });

      throw error;
    } finally {
      // Guardar última ejecución completada
      if (this.currentExecution) {
        this.lastExecution = { ...this.currentExecution };
      }
      this.isRunning = false;
      this.currentExecution = null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // COLLECTORS EXECUTION
  // ═══════════════════════════════════════════════════════════

  async _runCollectors(execution_id, options) {
    console.log(`📊 [COLLECTION] Ejecutando ${this.collectors.size} collectors...\n`);

    const results = [];

    if (this.config.parallel) {
      // Ejecutar todos los collectors en paralelo
      const promises = [];

      for (const [name, collector] of this.collectors) {
        if (options.only && !options.only.includes(name)) {
          console.log(`⏭️  [COLLECTION] Saltando ${name} (no incluido en 'only')`);
          continue;
        }

        promises.push(
          this._runSingleCollector(name, collector, execution_id)
            .catch(error => {
              console.error(`❌ [COLLECTION] Error en ${name}:`, error.message);
              return { name, error, results: [] };
            })
        );
      }

      const collectorResults = await Promise.allSettled(promises);

      for (const result of collectorResults) {
        if (result.status === 'fulfilled') {
          results.push(...result.value.results);
        }
      }

    } else {
      // Ejecutar collectors secuencialmente
      for (const [name, collector] of this.collectors) {
        if (options.only && !options.only.includes(name)) {
          console.log(`⏭️  [COLLECTION] Saltando ${name}`);
          continue;
        }

        try {
          const collectorResult = await this._runSingleCollector(name, collector, execution_id);
          results.push(...collectorResult.results);

        } catch (error) {
          console.error(`❌ [COLLECTION] Error en ${name}:`, error.message);

          if (this.config.stopOnCriticalFailure) {
            throw error;
          }
        }
      }
    }

    console.log(`✅ [COLLECTION] Completada - ${results.length} tests ejecutados\n`);
    return results;
  }

  async _runSingleCollector(name, collector, execution_id) {
    const startTime = Date.now();
    console.log(`  🔍 Ejecutando collector: ${name}...`);

    this.emit('collector-start', { name, execution_id });

    try {
      const results = await collector.collect(execution_id, this.config);

      const duration = Date.now() - startTime;
      console.log(`  ✅ ${name} completado (${duration}ms) - ${results.length} tests`);

      this.emit('collector-complete', { name, execution_id, results, duration });

      return { name, results, duration };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`  ❌ ${name} falló (${duration}ms):`, error.message);

      this.emit('collector-error', { name, execution_id, error, duration });

      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ANALYZERS EXECUTION
  // ═══════════════════════════════════════════════════════════

  async _runAnalyzers(execution_id, collectionResults) {
    console.log(`🔍 [ANALYSIS] Analizando ${collectionResults.length} resultados...\n`);

    const analysisResults = [];

    for (const [name, analyzer] of this.analyzers) {
      try {
        console.log(`  🔬 Ejecutando analyzer: ${name}...`);

        const analysis = await analyzer.analyze(collectionResults, execution_id);
        analysisResults.push(...analysis);

        console.log(`  ✅ ${name} completado - ${analysis.length} insights`);

      } catch (error) {
        console.error(`  ❌ Error en analyzer ${name}:`, error.message);
      }
    }

    console.log(`✅ [ANALYSIS] Completada - ${analysisResults.length} insights generados\n`);
    return analysisResults;
  }

  // ═══════════════════════════════════════════════════════════
  // HEALERS EXECUTION
  // ═══════════════════════════════════════════════════════════

  async _runHealers(execution_id, analysisResults) {
    const failures = analysisResults.filter(r => r.status === 'fail');

    if (failures.length === 0) {
      console.log(`✅ [HEALING] No hay fallos que reparar\n`);
      return [];
    }

    console.log(`🔧 [HEALING] Intentando reparar ${failures.length} fallos...\n`);

    const healingResults = [];

    for (const failure of failures) {
      let healed = false;

      for (const [name, healer] of this.healers) {
        if (!healer.canHeal(failure)) {
          continue;
        }

        try {
          console.log(`  🔧 ${name} intentando reparar: ${failure.test_name}...`);

          const result = await healer.heal(failure, execution_id);
          healingResults.push(result);

          if (result.success) {
            console.log(`  ✅ ${name} reparó exitosamente`);
            healed = true;
            break; // Ya se reparó, no intentar otros healers
          } else {
            console.log(`  ⚠️  ${name} no pudo reparar`);
          }

        } catch (error) {
          console.error(`  ❌ Error en healer ${name}:`, error.message);
        }
      }

      if (!healed) {
        console.log(`  ❌ No se pudo reparar: ${failure.test_name}`);
      }
    }

    const successfulHeals = healingResults.filter(r => r.success).length;
    console.log(`✅ [HEALING] Completada - ${successfulHeals}/${failures.length} reparados\n`);

    return healingResults;
  }

  // ═══════════════════════════════════════════════════════════
  // SUMMARY GENERATION
  // ═══════════════════════════════════════════════════════════

  async _generateSummary(execution_id) {
    return await this.AuditLog.getExecutionSummary(execution_id);
  }

  // ═══════════════════════════════════════════════════════════
  // SPECIFIC MODULE TEST
  // ═══════════════════════════════════════════════════════════

  async runModuleAudit(moduleName, options = {}) {
    console.log(`\n🔍 [AUDITOR] Ejecutando auditoría del módulo: ${moduleName}\n`);

    // Filtrar collectors relevantes para el módulo
    const relevantOptions = {
      ...options,
      moduleFilter: moduleName
    };

    return await this.runFullAudit(relevantOptions);
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  getStatus() {
    return {
      is_running: this.isRunning,
      current_execution: this.currentExecution,
      last_execution: this.lastExecution, // Última ejecución completada
      collectors: Array.from(this.collectors.keys()),
      analyzers: Array.from(this.analyzers.keys()),
      healers: Array.from(this.healers.keys()),
      config: this.config
    };
  }

  async getRecentAudits(limit = 10) {
    const executions = await this.AuditLog.findAll({
      attributes: ['execution_id', 'started_at', 'completed_at'],
      group: ['execution_id', 'started_at', 'completed_at'],
      order: [['started_at', 'DESC']],
      limit
    });

    const summaries = [];
    for (const exec of executions) {
      const summary = await this.AuditLog.getExecutionSummary(exec.execution_id);
      summaries.push(summary);
    }

    return summaries;
  }
}

module.exports = AuditorEngine;
