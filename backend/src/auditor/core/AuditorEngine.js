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
const { sendAuditError, sendAuditFix, sendAuditProgress, sendAuditSummary } = require('../../config/websocket');
const OllamaAnalyzer = require('./OllamaAnalyzer');

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

    // Componentes del sistema (pasados desde configuración)
    this.systemRegistry = config.systemRegistry;
    this.knowledgeBase = config.knowledgeBase;
    this.moduleScanner = config.moduleScanner;

    // 🤖 Sistema de diagnóstico híbrido (Ollama/OpenAI/Patterns)
    this.ollamaAnalyzer = new OllamaAnalyzer();

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

      // FASE 3: DIAGNOSTICS WITH HYBRID AI (Ollama/OpenAI/Patterns)
      this.emit('phase', { phase: 'diagnostics', execution_id });
      const diagnosticResults = await this._runDiagnostics(execution_id, collectionResults);

      // FASE 4: AUTO-HEALING (si está activado)
      let healingResults = [];
      if (this.config.autoHeal) {
        this.emit('phase', { phase: 'healing', execution_id });
        healingResults = await this._runHealers(execution_id, diagnosticResults);
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
    const io = options.io;  // Socket.IO instance
    const currentCycle = options.currentCycle || 1;

    if (this.config.parallel) {
      // Ejecutar todos los collectors en paralelo
      const promises = [];

      for (const [name, collector] of this.collectors) {
        if (options.only && !options.only.includes(name)) {
          console.log(`⏭️  [COLLECTION] Saltando ${name} (no incluido en 'only')`);
          continue;
        }

        // 🔌 Emitir inicio de collector
        if (io) {
          io.to('auditor-updates').emit('test-progress', {
            cycle: currentCycle,
            phase: 'collection',
            collector: name,
            message: `Ejecutando collector: ${name}...`,
            timestamp: new Date()
          });
        }

        promises.push(
          this._runSingleCollector(name, collector, execution_id, options) // ✅ Pasar options aquí
            .then(result => {
              // 🔌 Emitir fin de collector
              if (io) {
                io.to('auditor-updates').emit('test-progress', {
                  cycle: currentCycle,
                  phase: 'collection',
                  collector: name,
                  message: `✅ ${name} completado - ${result.results.length} tests`,
                  timestamp: new Date()
                });
              }
              return result;
            })
            .catch(error => {
              console.error(`❌ [COLLECTION] Error en ${name}:`, error.message);
              // 🔌 Emitir error de collector
              if (io) {
                io.to('auditor-updates').emit('test-progress', {
                  cycle: currentCycle,
                  phase: 'collection',
                  collector: name,
                  message: `❌ Error en ${name}: ${error.message}`,
                  timestamp: new Date()
                });
              }
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

        // 🔌 Emitir inicio de collector
        if (io) {
          io.to('auditor-updates').emit('test-progress', {
            cycle: currentCycle,
            phase: 'collection',
            collector: name,
            message: `Ejecutando collector: ${name}...`,
            timestamp: new Date()
          });
        }

        try {
          const collectorResult = await this._runSingleCollector(name, collector, execution_id, options);
          results.push(...collectorResult.results);

          // 🔌 Emitir fin de collector
          if (io) {
            io.to('auditor-updates').emit('test-progress', {
              cycle: currentCycle,
              phase: 'collection',
              collector: name,
              message: `✅ ${name} completado - ${collectorResult.results.length} tests`,
              timestamp: new Date()
            });
          }

        } catch (error) {
          console.error(`❌ [COLLECTION] Error en ${name}:`, error.message);

          // 🔌 Emitir error de collector
          if (io) {
            io.to('auditor-updates').emit('test-progress', {
              cycle: currentCycle,
              phase: 'collection',
              collector: name,
              message: `❌ Error en ${name}: ${error.message}`,
              timestamp: new Date()
            });
          }

          if (this.config.stopOnCriticalFailure) {
            throw error;
          }
        }
      }
    }

    console.log(`✅ [COLLECTION] Completada - ${results.length} tests ejecutados\n`);
    return results;
  }

  async _runSingleCollector(name, collector, execution_id, options = {}) {
    const startTime = Date.now();
    console.log(`  🔍 Ejecutando collector: ${name}...`);

    this.emit('collector-start', { name, execution_id });

    try {
      // ✅ Merge config base con options de ejecución actual
      const collectorConfig = {
        ...this.config,
        ...options // company_id, authToken, etc. vienen aquí
      };

      const results = await collector.collect(execution_id, collectorConfig);

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
  // DIAGNOSTICS WITH HYBRID AI (Ollama/OpenAI/Patterns)
  // ═══════════════════════════════════════════════════════════

  async _runDiagnostics(execution_id, analysisResults) {
    const failures = analysisResults.filter(r => r.status === 'fail');

    if (failures.length === 0) {
      console.log(`✅ [DIAGNOSTICS] No hay fallos que diagnosticar\n`);
      return analysisResults;
    }

    console.log(`🤖 [DIAGNOSTICS] Diagnosticando ${failures.length} errores con sistema híbrido...\n`);

    const diagnosticResults = [];

    for (const failure of failures) {
      try {
        console.log(`  🔍 Diagnosticando: ${failure.test_name}...`);

        // Diagnosticar con sistema híbrido (Ollama → OpenAI → Patterns)
        const diagnosis = await this.ollamaAnalyzer.analyzeError({
          error_message: failure.error_message || failure.test_name,
          error_stack: failure.error_stack,
          module_name: failure.module_name,
          test_type: failure.test_type,
          context: {
            endpoint: failure.endpoint,
            test_name: failure.test_name,
            expected: failure.expected,
            actual: failure.actual
          }
        });

        // Guardar métricas de diagnóstico en audit_logs
        await this.AuditLog.update(
          {
            diagnosis_source: diagnosis.source,
            diagnosis_model: diagnosis.model,
            diagnosis_level: diagnosis.level,
            diagnosis_confidence: diagnosis.confidence,
            diagnosis_specificity: diagnosis.specificity,
            diagnosis_actionable: diagnosis.actionable,
            diagnosis_duration_ms: diagnosis.durationMs,
            diagnosis_timestamp: new Date(),
            error_type: diagnosis.error_type || failure.error_type,
            suggested_fix: diagnosis.solution
          },
          {
            where: {
              execution_id,
              module_name: failure.module_name,
              test_name: failure.test_name,
              status: 'fail'
            }
          }
        );

        // Agregar diagnosis al failure para que los healers lo usen
        failure.aiDiagnosis = diagnosis;

        console.log(`  ✅ Diagnosticado con ${diagnosis.source} (confidence: ${diagnosis.confidence.toFixed(2)})`);

        diagnosticResults.push({
          test_name: failure.test_name,
          diagnosis
        });

      } catch (error) {
        console.error(`  ❌ Error diagnosticando ${failure.test_name}:`, error.message);
      }
    }

    const avgConfidence = (diagnosticResults.reduce((sum, d) => sum + d.diagnosis.confidence, 0) / diagnosticResults.length).toFixed(2);
    console.log(`✅ [DIAGNOSTICS] Completada - ${diagnosticResults.length}/${failures.length} diagnosticados (avg confidence: ${avgConfidence})\n`);

    return analysisResults; // Retornamos analysisResults con diagnosis agregados
  }

  // ═══════════════════════════════════════════════════════════
  // HEALERS EXECUTION
  // ═══════════════════════════════════════════════════════════

  /**
   * ═══════════════════════════════════════════════════════════
   * RETEST SINGLE FAILURE - Validar fix aplicado
   * ═══════════════════════════════════════════════════════════
   *
   * Re-ejecutar un test específico después de aplicar un fix
   * para validar que el fix realmente funciona.
   *
   * @param {Object} failure - Test que falló originalmente
   * @param {string} execution_id - ID de ejecución
   * @returns {Promise<Object>} - { passed, results }
   */
  async _retestSingleFailure(failure, execution_id) {
    console.log(`  🔄 [RETEST] Validando fix de ${failure.test_name}...`);

    // Identificar collector apropiado
    const collectorName = failure.test_type; // 'endpoint', 'database', 'frontend', etc.
    const collector = this.collectors.get(collectorName);

    if (!collector) {
      console.log(`  ⚠️  No se encontró collector para ${failure.test_type}`);
      return {
        passed: false,
        reason: 'collector-not-found'
      };
    }

    // Re-ejecutar SOLO ese test específico
    let results;
    try {
      // Verificar si el collector tiene el método runSingleTest
      if (typeof collector.runSingleTest !== 'function') {
        console.log(`  ⚠️  Collector ${collectorName} no implementa runSingleTest()`);
        return {
          passed: false,
          reason: 'method-not-implemented'
        };
      }

      results = await collector.runSingleTest(failure.test_name, execution_id);
    } catch (error) {
      console.log(`  ❌ [RETEST] Error ejecutando test: ${error.message}`);
      return {
        passed: false,
        reason: 'execution-error',
        error: error.message
      };
    }

    const passed = results.status === 'passed' || results.status === 'pass';

    if (passed) {
      console.log(`  ✅ [RETEST] Fix validado: ${failure.test_name}`);
    } else {
      console.log(`  ❌ [RETEST] Fix falló: ${failure.test_name}`);
    }

    return { passed, results };
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * ROLLBACK FIX - Revertir fix que falló en retest
   * ═══════════════════════════════════════════════════════════
   *
   * Restaurar archivo desde backup si el fix no funcionó.
   *
   * @param {Object} healResult - Resultado del heal con backupPath
   */
  async _rollbackFix(healResult) {
    if (!healResult.backupPath) {
      console.log(`  ⚠️  No hay backup para revertir`);
      return;
    }

    const fs = require('fs').promises;
    try {
      await fs.copyFile(healResult.backupPath, healResult.filePath);
      console.log(`  ✅ Rollback exitoso: ${healResult.filePath}`);
    } catch (error) {
      console.error(`  ❌ Error en rollback: ${error.message}`);
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * HEALING - Aplicar fixes y validar con retest
   * ═══════════════════════════════════════════════════════════
   */
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
      let healResult = null;

      for (const [name, healer] of this.healers) {
        if (!healer.canHeal(failure)) {
          continue;
        }

        try {
          console.log(`  🔧 ${name} intentando reparar: ${failure.test_name}...`);

          const result = await healer.heal(failure, execution_id);
          healingResults.push(result);
          healResult = result;

          if (result.success) {
            console.log(`  ✅ ${name} reparó exitosamente`);

            // ⭐ NUEVO: RETEST INMEDIATO para validar fix
            const retestResult = await this._retestSingleFailure(failure, execution_id);

            if (retestResult.passed) {
              // Fix CONFIRMADO
              console.log(`  🎉 [HEALING] Fix VERIFICADO exitosamente`);
              healed = true;

              // 🔄 RETROALIMENTACIÓN AUTOMÁTICA: Registrar repair exitoso en KnowledgeBase
              try {
                if (failure.aiDiagnosis && this.knowledgeBase) {
                  await this.knowledgeBase.recordRepairSuccess(
                    failure.error_message || failure.test_name,
                    failure.aiDiagnosis.solution,
                    failure.module_name,
                    result.appliedFix || result.strategy
                  );
                  console.log(`  💾 Repair exitoso registrado en Knowledge Base`);
                }
              } catch (kbError) {
                console.error(`  ⚠️  Error guardando en KB:`, kbError.message);
              }

              // Marcar resultado como verificado
              result.verified = true;
              result.retestResult = retestResult;

              break; // Ya se reparó y verificó, no intentar otros healers
            } else {
              // Fix NO funcionó, ROLLBACK
              console.log(`  ⚠️  [HEALING] Fix NO funcionó, revirtiendo...`);

              await this._rollbackFix(result);

              // 🔄 RETROALIMENTACIÓN AUTOMÁTICA: Registrar repair fallido en KnowledgeBase
              try {
                if (failure.aiDiagnosis && this.knowledgeBase) {
                  await this.knowledgeBase.recordRepairFailure(
                    failure.error_message || failure.test_name,
                    failure.aiDiagnosis.solution,
                    failure.module_name,
                    retestResult.error || 'Retest falló después de aplicar fix'
                  );
                  console.log(`  📝 Repair fallido registrado en Knowledge Base para aprender`);
                }
              } catch (kbError) {
                console.error(`  ⚠️  Error guardando fallo en KB:`, kbError.message);
              }

              // Marcar resultado como no verificado
              result.verified = false;
              result.retestResult = retestResult;

              // Continuar intentando con otros healers
            }
          } else {
            console.log(`  ⚠️  ${name} no pudo reparar`);
          }

        } catch (error) {
          console.error(`  ❌ Error en healer ${name}:`, error.message);
        }
      }

      // 🔄 RETROALIMENTACIÓN AUTOMÁTICA: Registrar repair fallido
      if (!healed && failure.aiDiagnosis && this.knowledgeBase) {
        try {
          await this.knowledgeBase.recordRepairFailure(
            failure.error_message || failure.test_name,
            failure.aiDiagnosis.solution,
            failure.module_name,
            healResult?.error || 'No se pudo aplicar el fix'
          );
          console.log(`  📝 Repair fallido registrado en Knowledge Base para mejorar`);
        } catch (kbError) {
          console.error(`  ⚠️  Error guardando fallo en KB:`, kbError.message);
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
    const summary = await this.AuditLog.getExecutionSummary(execution_id);

    // Obtener logs de errores para enviar al dashboard
    const errorLogs = await this.AuditLog.findAll({
      where: {
        execution_id,
        status: ['fail', 'warning']
      },
      attributes: ['module_name', 'test_name', 'error_message', 'severity', 'status', 'test_type'],
      order: [['severity', 'DESC'], ['createdAt', 'ASC']]
    });

    // Enviar cada error al dashboard
    errorLogs.forEach((log, index) => {
      sendAuditError({
        cycle: 1,
        module: log.module_name,
        type: log.test_type,
        error: log.error_message || log.test_name,
        severity: log.severity || 'medium',
        status: log.status === 'fail' ? 'Error' : 'Warning'
      });
    });

    // Enviar resumen final
    sendAuditSummary({
      execution_id,
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      warnings: summary.warnings,
      successRate: ((summary.passed / summary.total) * 100).toFixed(1),
      duration: summary.total_duration,
      errorsDetected: errorLogs.length,
      criticalErrors: errorLogs.filter(log => log.severity === 'critical').length,
      modulesAffected: [...new Set(errorLogs.map(log => log.module_name))].length
    });

    // 📊 GENERAR REPORTE TÉCNICO DE ARQUITECTURA Y EFICACIA
    await this._generateTechnicalArchitectureReport(execution_id, summary);

    // 📄 GENERAR/ACTUALIZAR MARKETING PAPER DINÁMICO
    await this._generateMarketingPaper(execution_id, summary);

    return summary;
  }

  // ═══════════════════════════════════════════════════════════
  // TECHNICAL ARCHITECTURE REPORTING
  // ═══════════════════════════════════════════════════════════

  async _generateTechnicalArchitectureReport(execution_id, summary) {
    try {
      // Lazy-load del reporter
      if (!this.technicalReporter) {
        const TechnicalArchitectureReporter = require('../reporters/TechnicalArchitectureReporter');
        this.technicalReporter = new TechnicalArchitectureReporter(
          this.database,
          this.systemRegistry || {},
          this
        );
      }

      const report = await this.technicalReporter.generateArchitectureReport(execution_id, summary);

      // 🖨️ MOSTRAR REPORTE EN CONSOLA
      this._displayTechnicalReport(report);

      // 📁 GUARDAR REPORTE EN ARCHIVO (opcional)
      await this._saveTechnicalReport(execution_id, report);

      return report;
    } catch (error) {
      console.error('⚠️  [REPORTER] Error generando reporte técnico:', error.message);
      return null;
    }
  }

  _displayTechnicalReport(report) {
    const separator = '═'.repeat(70);

    console.log(`\n${separator}`);
    console.log(`${report.title}`);
    console.log(`${report.subtitle}`);
    console.log(`${separator}\n`);

    // RESUMEN EJECUTIVO
    const executive = report.sections["📊 RESUMEN EJECUTIVO"];
    console.log('📊 RESUMEN EJECUTIVO:');
    console.log(`   🏗️  Arquitectura: ${executive.architecture_type}`);
    console.log(`   📈 Estado: ${executive.system_status}`);
    console.log(`   💚 Salud General: ${executive.overall_health}`);
    console.log(`   🤖 IA: ${executive.ai_status}`);
    console.log(`   ⚡ Performance: ${executive.current_performance.success_rate} en ${executive.current_performance.duration_seconds}s`);
    console.log('');

    // ARQUITECTURA
    const arch = report.sections["🔧 ARQUITECTURA COMPLETA"];
    console.log('🔧 ARQUITECTURA COMPLETA:');
    console.log(`   📦 Collectors: ${arch.components.collectors.total} especializados`);
    console.log(`   🔧 Healers: ${arch.components.healers.total} híbridos`);
    console.log(`   📋 Módulos: ${arch.components.modules_monitored} monitoreados`);
    console.log('   🏗️  Stack: Node.js + PostgreSQL + Ollama + Puppeteer');
    console.log('');

    // EFICACIA
    const efficacy = report.sections["📈 EFICACIA DEMOSTRADA"];
    console.log('📈 EFICACIA DEMOSTRADA:');
    console.log(`   🎯 Tests: ${efficacy.current_metrics.passed}/${efficacy.current_metrics.total} (${efficacy.current_metrics.success_rate})`);
    console.log(`   ⚡ Velocidad: ${efficacy.efficiency.tests_per_second} tests/segundo`);
    console.log(`   📊 Mejora histórica: ${efficacy.historical_improvement.baseline} → ${efficacy.current_metrics.success_rate}`);
    console.log(`   🔧 Auto-fixes: ${efficacy.historical_improvement.auto_fixes_applied}`);
    console.log('');

    // IA INTEGRATION
    const ai = report.sections["🤖 INTEGRACIÓN DE IA"];
    console.log('🤖 INTEGRACIÓN DE IA:');
    console.log(`   🧠 Modelo: ${ai.primary_ai.model}`);
    console.log(`   📍 Estado: ${ai.primary_ai.status}`);
    console.log(`   📚 Knowledge Base: ${ai.knowledge_base.status}`);
    console.log(`   🔧 Auto-healing: ${ai.auto_healing.status}`);
    console.log('');

    // CONCLUSIONES
    const conclusions = report.sections["🎯 CONCLUSIONES Y RECOMENDACIONES"];
    console.log('🎯 CONCLUSIONES Y RECOMENDACIONES:');
    console.log(`   📊 Estado del Sistema: ${conclusions.system_status}`);
    console.log(`   🏭 Listo para Producción: ${conclusions.production_readiness}`);
    console.log(`   🎯 Madurez: ${conclusions.architecture_maturity}`);
    console.log(`   🤖 IA Ready: ${conclusions.ai_readiness}`);

    if (conclusions.recommendations.length > 0) {
      console.log('   💡 Recomendaciones:');
      conclusions.recommendations.forEach(rec => {
        console.log(`      • ${rec}`);
      });
    }

    if (conclusions.next_steps.length > 0) {
      console.log('   🚀 Próximos Pasos:');
      conclusions.next_steps.forEach(step => {
        console.log(`      • ${step}`);
      });
    }

    console.log(`\n${separator}`);
    console.log(`📄 ${report.footer.disclaimer}`);
    console.log(`⚡ ${report.footer.technology}`);
    console.log(`${separator}\n`);
  }

  async _saveTechnicalReport(execution_id, report) {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      // Crear directorio de reportes si no existe
      const reportsDir = path.join(__dirname, '../../reports');
      try {
        await fs.mkdir(reportsDir, { recursive: true });
      } catch (error) {
        // Directory already exists
      }

      // Generar nombre de archivo con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `technical-report_${execution_id}_${timestamp}.json`;
      const filepath = path.join(reportsDir, filename);

      // Guardar reporte como JSON
      await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf8');

      console.log(`📁 [REPORTER] Reporte guardado: ${filename}`);
    } catch (error) {
      console.log(`⚠️  [REPORTER] No se pudo guardar reporte: ${error.message}`);
    }
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

  // ═══════════════════════════════════════════════════════════
  // MARKETING PAPER GENERATION (DYNAMIC)
  // ═══════════════════════════════════════════════════════════

  async _generateMarketingPaper(execution_id, summary) {
    try {
      console.log('📄 [MARKETING] Actualizando Paper Dinámico de Marketing...');

      // Lazy-load del marketing reporter
      if (!this.marketingReporter) {
        const MarketingDynamicReporter = require('../reporters/MarketingDynamicReporter');
        this.marketingReporter = new MarketingDynamicReporter(
          this.database,
          this.systemRegistry || {},
          this
        );
      }

      // Generar paper completo con métricas actualizadas
      const paper = await this.marketingReporter.generateMarketingPaper();

      console.log('✅ [MARKETING] Paper dinámico actualizado exitosamente');
      console.log('   📊 Métricas actualizadas desde auditorías');
      console.log('   🎯 Accesible desde Asistente IA');
      console.log('   💼 Listo para envío a clientes potenciales');

      return paper;

    } catch (error) {
      console.error('⚠️  [MARKETING] Error generando paper dinámico:', error.message);
      return null;
    }
  }
}

module.exports = AuditorEngine;
