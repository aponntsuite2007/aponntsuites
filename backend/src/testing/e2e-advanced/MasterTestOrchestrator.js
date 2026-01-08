/**
 * MasterTestOrchestrator - Sistema Unificado de Testing de Excelencia
 *
 * CEREBRO ÚNICO que coordina TODAS las fases de testing:
 * - E2E Functional (Playwright + AutonomousQA)
 * - Load Testing (k6)
 * - Security Testing (OWASP ZAP)
 * - Multi-Tenant Isolation
 * - Database Integrity
 * - Monitoring & Observability
 * - Edge Cases & Boundaries
 *
 * ARQUITECTURA:
 * - Un solo punto de entrada para TODO
 * - Gestión automática de dependencias entre fases
 * - Streaming WebSocket en tiempo real
 * - Cálculo de confidence score agregado (0-100%)
 * - Persistencia en PostgreSQL
 *
 * USO:
 * ```javascript
 * const orchestrator = new MasterTestOrchestrator();
 *
 * // Ejecutar suite completo
 * await orchestrator.runFullSuite({ modules: ['users', 'attendance'] });
 *
 * // Ejecutar fase específica
 * await orchestrator.runPhase('security', { modules: ['users'] });
 *
 * // Ejecutar con selección de alcance
 * await orchestrator.run({
 *   phases: ['e2e', 'load', 'security'],
 *   modules: ['users'],
 *   parallel: true
 * });
 * ```
 *
 * @module MasterTestOrchestrator
 * @version 2.0.0 - Clean Architecture
 * @author Claude Code Assistant
 * @date 2026-01-07
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const db = require('../../config/database');

// Core components
const DependencyManager = require('./core/DependencyManager');
const ResultsAggregator = require('./core/ResultsAggregator');
const ConfidenceCalculator = require('./core/ConfidenceCalculator');
const WebSocketManager = require('./core/WebSocketManager');

// Phases
const E2EPhase = require('./phases/E2EPhase');
const LoadPhase = require('./phases/LoadPhase');
const SecurityPhase = require('./phases/SecurityPhase');
const MultiTenantPhase = require('./phases/MultiTenantPhase');
const DatabasePhase = require('./phases/DatabasePhase');
const MonitoringPhase = require('./phases/MonitoringPhase');
const EdgeCasesPhase = require('./phases/EdgeCasesPhase');

class MasterTestOrchestrator extends EventEmitter {
  constructor(database = null, options = {}) {
    super();

    // Opciones configurables
    this.options = {
      baseURL: options.baseURL || 'http://localhost:9998',
      saveResults: options.saveResults !== undefined ? options.saveResults : true,
      onProgress: options.onProgress || null,
      modules: options.modules || null
    };

    // Database (opcional, para testing)
    this.db = database || require('../../config/database');

    // Phases registradas (Map para O(1) lookup)
    this.phases = new Map();

    // Core components
    this.dependencyManager = new DependencyManager();
    this.resultsAggregator = new ResultsAggregator();
    this.confidenceCalculator = new ConfidenceCalculator();

    // Usar WebSocketManager global si existe (inicializado en server.js)
    // Si no, crear uno nuevo (modo standalone)
    this.wsManager = global.e2eAdvancedWsManager || new WebSocketManager();

    // Estado actual
    this.currentExecution = null;
    this.isRunning = false;

    // Registrar phases
    this._registerPhases();

    // Configurar event handlers
    this._setupEventHandlers();
  }

  /**
   * Registra las 7 phases del sistema
   * @private
   */
  _registerPhases() {
    console.log('🔧 [ORCHESTRATOR] Registrando phases...');

    this.phases.set('e2e', new E2EPhase());
    this.phases.set('load', new LoadPhase());
    this.phases.set('security', new SecurityPhase());
    this.phases.set('multiTenant', new MultiTenantPhase());
    this.phases.set('database', new DatabasePhase());
    this.phases.set('monitoring', new MonitoringPhase());
    this.phases.set('edgeCases', new EdgeCasesPhase());

    console.log(`✅ [ORCHESTRATOR] ${this.phases.size} phases registradas`);

    // Definir dependencias entre phases
    this.dependencyManager.setDependencies({
      'e2e': { requires: null },  // Independiente
      'load': { requires: 'e2e', minScore: 90 },
      'security': { requires: null },  // Independiente
      'multiTenant': { requires: 'e2e', minScore: 80 },
      'database': { requires: null },  // Independiente
      'monitoring': { requires: ['e2e', 'load'], minScore: 85 },
      'edgeCases': { requires: 'e2e', minScore: 90 }
    });

    console.log('✅ [ORCHESTRATOR] Dependencias configuradas');
  }

  /**
   * Configura event handlers para logging y debugging
   * @private
   */
  _setupEventHandlers() {
    this.on('execution:started', (data) => {
      console.log(`\n🚀 [ORCHESTRATOR] Ejecución iniciada: ${data.executionId}`);
    });

    this.on('execution:completed', (data) => {
      console.log(`\n✅ [ORCHESTRATOR] Ejecución completada: ${data.executionId}`);
      console.log(`   Confidence: ${data.confidenceScore.overall}%`);
    });

    this.on('execution:failed', (data) => {
      console.error(`\n❌ [ORCHESTRATOR] Ejecución fallida: ${data.executionId}`);
      console.error(`   Error: ${data.error}`);
    });
  }

  /**
   * Ejecuta suite completo con TODAS las fases
   *
   * @param {Object} options - Opciones de ejecución
   * @param {string[]} options.modules - Módulos a testear (default: todos)
   * @param {boolean} options.parallel - Ejecutar fases en paralelo cuando sea posible (default: true)
   * @returns {Promise<ExecutionResult>}
   */
  async runFullSuite(options = {}) {
    const { modules = [], parallel = true } = options;

    if (this.isRunning) {
      throw new Error('Ya hay una ejecución en curso. Espera a que termine o cancélala.');
    }

    this.isRunning = true;
    const executionId = uuidv4();
    this.currentExecution = executionId;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 [MASTER] INICIANDO SUITE COMPLETO - ID: ${executionId}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Módulos: ${modules.length > 0 ? modules.join(', ') : 'TODOS'}`);
    console.log(`   Parallel: ${parallel ? 'SÍ' : 'NO'}`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      // Crear registro en BD
      await this._createExecution(executionId, 'full', modules);

      // Emitir evento de inicio
      this.emit('execution:started', { executionId, modules });
      this.wsManager.broadcast('execution:started', { executionId, modules });

      // Determinar orden de ejecución basado en dependencias
      const allPhases = Array.from(this.phases.keys());
      const executionPlan = this.dependencyManager.buildExecutionPlan(allPhases);

      console.log(`📋 [MASTER] Plan de ejecución (${executionPlan.length} stages):`);
      executionPlan.forEach((stage, idx) => {
        console.log(`   Stage ${idx + 1}: ${stage.join(', ')}`);
      });
      console.log('');

      const results = {};
      let shouldContinue = true;

      // Ejecutar fases por stages
      for (const [stageIdx, stagePhases] of executionPlan.entries()) {
        if (!shouldContinue) break;

        console.log(`\n🎯 [MASTER] Ejecutando Stage ${stageIdx + 1}/${executionPlan.length}`);

        const stagePromises = stagePhases.map(phaseName =>
          this._runPhaseInternal(phaseName, modules, executionId)
        );

        const stageResults = parallel
          ? await Promise.allSettled(stagePromises)
          : await this._runSequential(stagePromises);

        // Agregar resultados (handle both fulfilled and rejected)
        stagePhases.forEach((phaseName, idx) => {
          const promiseResult = stageResults[idx];
          results[phaseName] = promiseResult.status === 'fulfilled'
            ? promiseResult.value
            : { status: 'failed', error: promiseResult.reason?.message };
        });

        // Validar dependencias para próximo stage
        const nextStage = executionPlan[stageIdx + 1];
        if (nextStage && !this.dependencyManager.canProceed(results, nextStage)) {
          console.log(`\n⚠️  [MASTER] Deteniendo ejecución - dependencias no cumplidas para stage ${stageIdx + 2}`);
          shouldContinue = false;
        }
      }

      // Agregar resultados
      const aggregatedResults = this.resultsAggregator.aggregate(results);

      // Calcular confidence score
      const confidenceScore = this.confidenceCalculator.calculate(aggregatedResults);

      // Guardar en BD
      await this._saveResults(executionId, aggregatedResults, confidenceScore);

      // Emitir evento de fin
      this.emit('execution:completed', {
        executionId,
        results: aggregatedResults,
        confidenceScore
      });

      this.wsManager.broadcast('execution:completed', {
        executionId,
        results: aggregatedResults,
        confidenceScore
      });

      console.log(`\n${'='.repeat(80)}`);
      console.log(`✅ [MASTER] SUITE COMPLETADO`);
      console.log(`   Confidence: ${confidenceScore.overall}%`);
      console.log(`   Production Ready: ${confidenceScore.productionReady ? 'YES ✅' : 'NO ❌'}`);
      console.log(`${'='.repeat(80)}\n`);

      return {
        executionId,
        results: aggregatedResults,
        confidenceScore,
        productionReady: confidenceScore.overall >= 95
      };

    } catch (error) {
      console.error(`\n❌ [MASTER] Error ejecutando suite:`, error);

      await db.E2EAdvancedExecution.update(
        { status: 'failed', error: error.message },
        { where: { execution_id: executionId } }
      );

      this.emit('execution:failed', { executionId, error: error.message });

      throw error;

    } finally {
      this.isRunning = false;
      this.currentExecution = null;
    }
  }

  /**
   * Ejecuta una fase específica
   *
   * @param {string} phaseName - Nombre de la fase ('e2e', 'load', 'security', etc.)
   * @param {Object} options - Opciones de ejecución
   * @param {string[]} options.modules - Módulos a testear
   * @returns {Promise<PhaseResult>}
   */
  async runPhase(phaseName, options = {}) {
    const { modules = [] } = options;

    if (!this.phases.has(phaseName)) {
      throw new Error(`Phase '${phaseName}' no existe. Phases disponibles: ${Array.from(this.phases.keys()).join(', ')}`);
    }

    const executionId = uuidv4();

    console.log(`\n🎯 [MASTER] Ejecutando fase: ${phaseName}`);

    try {
      await this._createExecution(executionId, 'single_phase', modules, { phase: phaseName });

      const result = await this._runPhaseInternal(phaseName, modules, executionId);

      await this._saveResults(executionId, { [phaseName]: result });

      return { executionId, result };

    } catch (error) {
      console.error(`❌ [MASTER] Error ejecutando fase ${phaseName}:`, error);
      throw error;
    }
  }

  /**
   * Ejecuta fases con selección de alcance personalizada
   *
   * @param {Object} options - Opciones de ejecución
   * @param {string[]} options.phases - Fases a ejecutar
   * @param {string[]} options.modules - Módulos a testear
   * @param {boolean} options.parallel - Ejecutar en paralelo
   * @returns {Promise<ExecutionResult>}
   */
  async run(options = {}) {
    const {
      phases = Array.from(this.phases.keys()),
      modules = [],
      parallel = true
    } = options;

    // Validar que todas las phases existan
    for (const phaseName of phases) {
      if (!this.phases.has(phaseName)) {
        throw new Error(`Phase '${phaseName}' no existe`);
      }
    }

    const executionId = uuidv4();

    console.log(`\n🎯 [MASTER] Ejecutando fases seleccionadas: ${phases.join(', ')}`);

    try {
      await this._createExecution(executionId, 'custom', modules, { phases });

      // Construir plan de ejecución solo con fases seleccionadas
      const executionPlan = this.dependencyManager.buildExecutionPlan(phases);

      const results = {};

      for (const stagePhases of executionPlan) {
        const stagePromises = stagePhases.map(phaseName =>
          this._runPhaseInternal(phaseName, modules, executionId)
        );

        const stageResults = parallel
          ? await Promise.allSettled(stagePromises)
          : await this._runSequential(stagePromises);

        stagePhases.forEach((phaseName, idx) => {
          const promiseResult = stageResults[idx];
          results[phaseName] = promiseResult.status === 'fulfilled'
            ? promiseResult.value
            : { status: 'failed', error: promiseResult.reason?.message };
        });
      }

      const aggregatedResults = this.resultsAggregator.aggregate(results);
      const confidenceScore = this.confidenceCalculator.calculate(aggregatedResults);

      await this._saveResults(executionId, aggregatedResults, confidenceScore);

      return {
        executionId,
        results: aggregatedResults,
        confidenceScore
      };

    } catch (error) {
      console.error(`❌ [MASTER] Error ejecutando custom run:`, error);
      throw error;
    }
  }

  /**
   * Ejecuta una fase interna (método privado)
   * @private
   */
  async _runPhaseInternal(phaseName, modules, executionId) {
    const phase = this.phases.get(phaseName);

    console.log(`\n   ⚙️  [${phaseName.toUpperCase()}] Iniciando...`);

    this.emit('phase:started', { executionId, phase: phaseName });
    this.wsManager.broadcast('phase:started', { executionId, phase: phaseName });

    const startTime = Date.now();

    try {
      const result = await phase.execute(modules, {
        executionId,
        onProgress: (progress) => {
          this.emit('phase:progress', { executionId, phase: phaseName, progress });
          this.wsManager.broadcast('phase:progress', {
            executionId,
            phase: phaseName,
            progress
          });
        }
      });

      const duration = Date.now() - startTime;

      console.log(`   ✅ [${phaseName.toUpperCase()}] Completado en ${(duration / 1000).toFixed(2)}s`);

      this.emit('phase:completed', { executionId, phase: phaseName, result });
      this.wsManager.broadcast('phase:completed', {
        executionId,
        phase: phaseName,
        result
      });

      return { ...result, duration };

    } catch (error) {
      console.error(`   ❌ [${phaseName.toUpperCase()}] Error:`, error.message);

      this.emit('phase:failed', { executionId, phase: phaseName, error: error.message });
      this.wsManager.broadcast('phase:failed', {
        executionId,
        phase: phaseName,
        error: error.message
      });

      return {
        status: 'failed',
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Ejecuta promesas secuencialmente (no en paralelo)
   * @private
   */
  async _runSequential(promises) {
    const results = [];
    for (const promise of promises) {
      try {
        const result = await promise;
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }
    }
    return results;
  }

  /**
   * Crea registro de ejecución en BD
   * @private
   */
  async _createExecution(executionId, type, modules, metadata = {}) {
    await db.E2EAdvancedExecution.create({
      execution_id: executionId,
      mode: type,
      modules_tested: modules,
      status: 'running',
      created_at: new Date(),
      metadata: metadata
    });
  }

  /**
   * Guarda resultados en BD
   * @private
   */
  async _saveResults(executionId, results, confidenceScore = null) {
    // Si options.saveResults es false, no persistir
    if (this.options && this.options.saveResults === false) {
      return;
    }

    // Determinar status final basado en results
    let finalStatus = 'passed';
    if (results.errors && results.errors.length > 0) {
      finalStatus = 'failed';
    } else if (results.summary && results.summary.failed > 0) {
      finalStatus = results.summary.failed > results.summary.passed ? 'failed' : 'warning';
    }

    await db.E2EAdvancedExecution.update(
      {
        status: finalStatus,
        completed_at: new Date(),
        duration: Date.now() - new Date().getTime()
      },
      { where: { execution_id: executionId } }
    );

    if (confidenceScore) {
      await db.ConfidenceScore.create({
        execution_id: executionId,
        overall_score: confidenceScore.overall,
        e2e_score: confidenceScore.e2e || null,
        load_score: confidenceScore.load || null,
        security_score: confidenceScore.security || null,
        multi_tenant_score: confidenceScore.multiTenant || null,
        database_score: confidenceScore.database || null,
        monitoring_score: confidenceScore.monitoring || null,
        edge_cases_score: confidenceScore.edgeCases || null,
        production_ready: confidenceScore.overall >= 95,
        confidence_level: this._getConfidenceLevel(confidenceScore.overall)
      });
    }
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
   * Obtiene estado actual de ejecución
   * @returns {Object|null}
   */
  getStatus() {
    if (!this.isRunning) {
      return { status: 'idle', message: 'No hay ejecuciones activas' };
    }

    return {
      status: 'running',
      executionId: this.currentExecution,
      message: 'Ejecución en curso'
    };
  }

  /**
   * Cancela ejecución actual (si es posible)
   * @returns {Promise<void>}
   */
  async cancel() {
    if (!this.isRunning) {
      throw new Error('No hay ejecución activa para cancelar');
    }

    // TODO: Implementar cancelación (AbortController)
    console.log('⚠️  [ORCHESTRATOR] Cancelación solicitada - funcionalidad pendiente');
  }
}

module.exports = MasterTestOrchestrator;
