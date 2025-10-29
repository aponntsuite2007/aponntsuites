/**
 * ITERATIVE AUDITOR - Ciclos de Auto-Reparación Iterativos
 *
 * Sistema que ejecuta múltiples ciclos de auditoría y reparación hasta alcanzar 100% de funcionalidad
 *
 * CARACTERÍSTICAS:
 * - Ciclos parametrizables (1 a 500+)
 * - Parada segura en cualquier momento
 * - Navegador visible en tiempo real (headless: false)
 * - Logs detallados en consola
 * - Auto-aprendizaje con ProductionErrorMonitor
 * - Mejora incremental en cada ciclo
 *
 * USO:
 * ```javascript
 * const iterator = new IterativeAuditor(database, auditorEngine, systemRegistry, assistantService);
 *
 * // Iniciar 500 ciclos
 * await iterator.start({
 *   maxCycles: 500,
 *   targetSuccessRate: 100, // % de tests que deben pasar
 *   companyId: 11
 * });
 *
 * // Parar de forma segura
 * iterator.stop();
 *
 * // Ver estado en tiempo real
 * iterator.getStatus();
 * ```
 *
 * @version 1.0.0
 * @date 2025-10-20
 */

const EventEmitter = require('events');
const ProductionErrorMonitor = require('./ProductionErrorMonitor');
const AuditReportGenerator = require('../reporters/AuditReportGenerator');
const OllamaTicketReporter = require('../reporters/OllamaTicketReporter'); // ✅ FIX 4: Sistema de tickets

class IterativeAuditor extends EventEmitter {
  constructor(database, auditorEngine, systemRegistry, assistantService = null, io = null) {
    super();
    this.database = database;
    this.auditorEngine = auditorEngine;
    this.systemRegistry = systemRegistry;
    this.assistantService = assistantService;
    this.io = io; // Socket.IO instance for real-time updates

    // ProductionErrorMonitor para auto-aprendizaje
    this.productionMonitor = new ProductionErrorMonitor(
      database,
      auditorEngine,
      systemRegistry,
      assistantService
    );

    // AuditReportGenerator para reportes híbridos
    this.reportGenerator = new AuditReportGenerator(assistantService);

    // ✅ FIX 4: OllamaTicketReporter para sistema de tickets automáticos
    this.ticketReporter = new OllamaTicketReporter(database, io);

    // Estado del iterador
    this.isRunning = false;
    this.shouldStop = false; // Flag para parada segura
    this.currentCycle = 0;
    this.maxCycles = 100;
    this.targetSuccessRate = 100; // % de tests que deben pasar
    this.companyId = null;

    // Métricas acumulativas
    this.metrics = {
      totalCycles: 0,
      totalErrors: 0,
      totalRepairs: 0,
      successRateHistory: [], // Array de % de éxito por ciclo
      currentSuccessRate: 0,
      startTime: null,
      endTime: null,
      cycleDetails: [] // Detalle de cada ciclo
    };

    console.log('🔁 [ITERATIVE-AUDITOR] Inicializado');
  }

  /**
   * INICIAR CICLOS ITERATIVOS
   */
  async start(config = {}) {
    if (this.isRunning) {
      throw new Error('El auditor iterativo ya está corriendo');
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.currentCycle = 0;
    this.maxCycles = config.maxCycles || 100;
    this.targetSuccessRate = config.targetSuccessRate || 100;
    this.companyId = config.companyId || 11;
    this.authToken = config.authToken; // Guardar el token para pasarlo al auditor

    this.metrics = {
      totalCycles: 0,
      totalErrors: 0,
      totalRepairs: 0,
      successRateHistory: [],
      currentSuccessRate: 0,
      startTime: new Date(),
      endTime: null,
      cycleDetails: []
    };

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  🔁 AUDITOR ITERATIVO - INICIO DE CICLOS                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📋 Configuración:`);
    console.log(`   • Ciclos máximos: ${this.maxCycles}`);
    console.log(`   • Objetivo de éxito: ${this.targetSuccessRate}%`);
    console.log(`   • Empresa: ${this.companyId}`);
    console.log(`   • Navegador: VISIBLE (headless: false)`);
    console.log('');
    console.log('🛑 Para DETENER de forma segura: iterator.stop()');
    console.log('');

    try {
      await this.runCycles();
    } catch (error) {
      console.error('❌ [ITERATIVE-AUDITOR] Error durante ciclos:', error.message);
      this.isRunning = false;
    }
  }

  /**
   * EJECUTAR CICLOS
   */
  async runCycles() {
    while (this.currentCycle < this.maxCycles && !this.shouldStop) {
      this.currentCycle++;

      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`🔄 CICLO ${this.currentCycle}/${this.maxCycles}`);
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');

      // 🔌 Emitir inicio de ciclo via WebSocket
      if (this.io) {
        this.io.to('auditor-updates').emit('cycle-start', {
          cycle: this.currentCycle,
          maxCycles: this.maxCycles,
          timestamp: new Date()
        });
      }

      const cycleStartTime = Date.now();

      // PASO 1: Ejecutar auditoría completa
      console.log(`  1️⃣ Ejecutando auditoría completa...`);

      // 🔌 Emitir inicio de fase de auditoría
      if (this.io) {
        this.io.to('auditor-updates').emit('test-progress', {
          cycle: this.currentCycle,
          phase: 'audit',
          message: 'Ejecutando auditoría completa...',
          timestamp: new Date()
        });
      }

      const auditResult = await this.auditorEngine.runFullAudit({
        company_id: this.companyId,
        parallel: false, // Secuencial para ver mejor en consola
        autoHeal: true,  // Auto-reparar durante auditoría
        authToken: this.authToken,  // Pasar el token del usuario logueado
        io: this.io,  // Pasar Socket.IO para emitir eventos en tiempo real
        currentCycle: this.currentCycle  // Pasar el ciclo actual
      });

      // PASO 2: Analizar resultados
      console.log(`  2️⃣ Analizando resultados...`);

      // 🔌 Emitir progreso de análisis
      if (this.io) {
        this.io.to('auditor-updates').emit('test-progress', {
          cycle: this.currentCycle,
          phase: 'analysis',
          message: 'Analizando resultados de tests...',
          timestamp: new Date()
        });
      }

      const analysis = await this.analyzeResults(auditResult);

      // PASO 3: Intentar reparaciones adicionales de errores detectados
      console.log(`  3️⃣ Reparando errores detectados...`);

      // 🔌 Emitir progreso de reparación
      if (this.io) {
        this.io.to('auditor-updates').emit('test-progress', {
          cycle: this.currentCycle,
          phase: 'repair',
          message: `Reparando ${analysis.errors.length} errores detectados...`,
          timestamp: new Date()
        });
      }

      const repairResult = await this.repairDetectedErrors(analysis.errors);

      // PASO 4: Documentar aprendizaje en Knowledge Base
      console.log(`  4️⃣ Documentando aprendizaje...`);

      // 🔌 Emitir progreso de documentación
      if (this.io) {
        this.io.to('auditor-updates').emit('test-progress', {
          cycle: this.currentCycle,
          phase: 'learning',
          message: 'Documentando aprendizajes en Knowledge Base...',
          timestamp: new Date()
        });
      }

      await this.documentCycleLearning(analysis, repairResult);

      // PASO 5: Calcular métricas del ciclo
      const cycleDuration = Date.now() - cycleStartTime;
      const successRate = analysis.total > 0 ?
        ((analysis.passed / analysis.total) * 100).toFixed(1) : 0;

      this.metrics.totalCycles++;
      this.metrics.totalErrors += analysis.failed;
      this.metrics.totalRepairs += repairResult.repaired;
      this.metrics.successRateHistory.push(parseFloat(successRate));
      this.metrics.currentSuccessRate = parseFloat(successRate);

      const cycleDetail = {
        cycle: this.currentCycle,
        timestamp: new Date(),
        duration: cycleDuration,
        total: analysis.total,
        passed: analysis.passed,
        failed: analysis.failed,
        successRate: parseFloat(successRate),
        errorsRepaired: repairResult.repaired,
        knowledgeEntriesCreated: repairResult.knowledgeEntries
      };

      this.metrics.cycleDetails.push(cycleDetail);

      // 🔌 Emitir resultados del ciclo via WebSocket
      if (this.io) {
        this.io.to('auditor-updates').emit('cycle-complete', {
          ...cycleDetail,
          metrics: this.metrics
        });
      }

      // PASO 6: Mostrar resumen del ciclo
      this.displayCycleSummary(cycleDetail);

      // PASO 7: Verificar si alcanzamos el objetivo
      if (parseFloat(successRate) >= this.targetSuccessRate) {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║  🎉 ¡OBJETIVO ALCANZADO!                                      ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`✅ Tasa de éxito: ${successRate}% (objetivo: ${this.targetSuccessRate}%)`);
        console.log(`🔁 Ciclos completados: ${this.currentCycle}/${this.maxCycles}`);
        console.log('');
        break;
      }

      // PASO 8: Emitir evento de progreso
      this.emit('cycle-complete', cycleDetail);

      // Pequeña pausa entre ciclos para no saturar
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Finalizar
    this.metrics.endTime = new Date();
    this.isRunning = false;

    if (this.shouldStop) {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║  🛑 DETENIDO POR USUARIO                                      ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('');
    }

    this.displayFinalSummary();
    this.emit('completed', this.metrics);
  }

  /**
   * ANALIZAR RESULTADOS DE AUDITORÍA
   */
  async analyzeResults(auditResult) {
    const { AuditLog } = this.database;

    // FIX: auditResult.id es el execution_id, NO auditResult.execution_id
    const execution_id = auditResult.id;

    const logs = await AuditLog.findAll({
      where: { execution_id },
      order: [['id', 'DESC']]  // FIX: usar 'id' en vez de 'created_at' que no existe
    });

    const total = logs.length;
    const passed = logs.filter(log => log.status === 'pass').length;
    const failed = logs.filter(log => log.status === 'fail').length;
    const warnings = logs.filter(log => log.status === 'warning').length;

    // Extraer TODOS los errores (cualquier test con status 'fail')
    const realErrors = logs.filter(log =>
      log.status === 'fail' &&
      log.error_message  // Solo requiere que tenga error_message
    );

    return {
      execution_id,
      total,
      passed,
      failed,
      warnings,
      errors: realErrors.map(log => ({
        module: log.module_name,
        test: log.test_name,
        error: log.error_message,
        context: log.error_context,
        logId: log.id
      }))
    };
  }

  /**
   * REPARAR ERRORES DETECTADOS CON SISTEMA DE TICKETS
   * ✅ FIX 4: Ahora usa OllamaTicketReporter → WebSocket → Claude Code
   */
  async repairDetectedErrors(errors) {
    console.log(`      🎫 Creando tickets para ${errors.length} errores...`);

    // Convertir errores a formato esperado por OllamaTicketReporter
    const failures = errors.map(error => ({
      module: error.module,
      moduleName: error.module,
      error_message: error.error,
      errorMessage: error.error,
      message: error.error,
      test_name: error.test,
      testName: error.test,
      test_type: 'frontend',
      testType: 'frontend',
      context: error.context || {},
      details: {
        logId: error.logId,
        cycle: this.currentCycle,
        companyId: this.companyId
      }
    }));

    try {
      // Crear tickets usando OllamaTicketReporter
      const result = await this.ticketReporter.processTestResults({
        failures,
        stats: {
          total: errors.length,
          failed: errors.length,
          cycle: this.currentCycle
        }
      });

      console.log(`      ✅ ${result.ticketsCreated} tickets creados`);
      console.log(`      📡 WebSocket notificará a Claude Code...`);
      console.log(`      🔄 claude-code-websocket-client procesará automáticamente`);

      return {
        repaired: 0, // Los tickets aún no están reparados
        knowledgeEntries: 0,
        ticketsCreated: result.ticketsCreated,
        tickets: result.tickets
      };
    } catch (err) {
      console.error(`      ❌ Error creando tickets: ${err.message}`);
      return {
        repaired: 0,
        knowledgeEntries: 0,
        ticketsCreated: 0,
        tickets: []
      };
    }
  }

  /**
   * DOCUMENTAR APRENDIZAJE DEL CICLO
   */
  async documentCycleLearning(analysis, repairResult) {
    // El aprendizaje ya se documentó en ProductionErrorMonitor.reportError()
    // Aquí solo guardamos resumen del ciclo si es necesario
    console.log(`      📚 Aprendizaje documentado: ${repairResult.knowledgeEntries} entradas`);

    // GENERAR REPORTE DETALLADO PARA CLAUDE CODE
    console.log(`      📝 Generando reporte híbrido (Ollama + Claude Code)...`);

    try {
      const reportInfo = await this.reportGenerator.generateReport(
        analysis.execution_id,
        analysis.errors,
        {
          total: analysis.total,
          passed: analysis.passed,
          failed: analysis.failed,
          warnings: analysis.warnings,
          success_rate: analysis.total > 0 ? (analysis.passed / analysis.total) * 100 : 0,
          total_duration_ms: Date.now() - this.metrics.startTime
        },
        this.companyId
      );

      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║  📄 REPORTE GENERADO PARA CLAUDE CODE                        ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`📁 Ubicación: ${reportInfo.reportDir}`);
      console.log('');
      console.log('📋 PRÓXIMOS PASOS PARA CLAUDE CODE:');
      console.log('');
      console.log(`1. Leer: ${reportInfo.files.markdown}`);
      console.log(`2. Priorizar errores CRÍTICOS primero`);
      console.log(`3. Aplicar fixes sistemáticamente`);
      console.log(`4. Volver a ejecutar auditoría`);
      console.log('');

      // Guardar info del reporte en las métricas del ciclo
      this.metrics.lastReport = reportInfo;

    } catch (error) {
      console.error(`      ❌ Error generando reporte: ${error.message}`);
    }
  }

  /**
   * MOSTRAR RESUMEN DEL CICLO
   */
  displayCycleSummary(cycleDetail) {
    console.log('');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(`📊 RESUMEN DEL CICLO ${cycleDetail.cycle}`);
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(`   Tests totales:       ${cycleDetail.total}`);
    console.log(`   ✅ Pasados:          ${cycleDetail.passed}`);
    console.log(`   ❌ Fallidos:         ${cycleDetail.failed}`);
    console.log(`   🔧 Reparados:        ${cycleDetail.errorsRepaired}`);
    console.log(`   📚 KB Entries:       ${cycleDetail.knowledgeEntriesCreated}`);
    console.log(`   📈 Tasa de éxito:    ${cycleDetail.successRate}%`);
    console.log(`   ⏱️  Duración:         ${(cycleDetail.duration / 1000).toFixed(1)}s`);
    console.log('─────────────────────────────────────────────────────────────────');
  }

  /**
   * MOSTRAR RESUMEN FINAL
   */
  displayFinalSummary() {
    const duration = this.metrics.endTime - this.metrics.startTime;
    const avgSuccessRate = this.metrics.successRateHistory.length > 0 ?
      (this.metrics.successRateHistory.reduce((a, b) => a + b, 0) / this.metrics.successRateHistory.length).toFixed(1) : 0;

    const improvement = this.metrics.successRateHistory.length >= 2 ?
      (this.metrics.successRateHistory[this.metrics.successRateHistory.length - 1] -
       this.metrics.successRateHistory[0]).toFixed(1) : 0;

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  📊 RESUMEN FINAL - AUDITOR ITERATIVO                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🔁 Ciclos completados:           ${this.metrics.totalCycles}/${this.maxCycles}`);
    console.log(`❌ Total de errores detectados:  ${this.metrics.totalErrors}`);
    console.log(`🔧 Total de reparaciones:        ${this.metrics.totalRepairs}`);
    console.log(`📚 Entradas en Knowledge Base:   ${this.productionMonitor.getMetrics().knowledgeEntriesCreated}`);
    console.log('');
    console.log(`📈 Tasa de éxito inicial:        ${this.metrics.successRateHistory[0] || 0}%`);
    console.log(`📈 Tasa de éxito final:          ${this.metrics.currentSuccessRate}%`);
    console.log(`📈 Tasa de éxito promedio:       ${avgSuccessRate}%`);
    console.log(`📈 Mejora total:                 ${improvement > 0 ? '+' : ''}${improvement}%`);
    console.log('');
    console.log(`⏱️  Duración total:               ${(duration / 1000 / 60).toFixed(1)} minutos`);
    console.log(`⏱️  Tiempo promedio por ciclo:   ${(duration / this.metrics.totalCycles / 1000).toFixed(1)} segundos`);
    console.log('');

    // Gráfico ASCII de progreso
    if (this.metrics.successRateHistory.length > 0) {
      console.log('📊 PROGRESO POR CICLO:');
      console.log('');
      this.displayProgressChart();
    }

    console.log('');
  }

  /**
   * MOSTRAR GRÁFICO ASCII DE PROGRESO
   */
  displayProgressChart() {
    const maxBars = 50;
    const history = this.metrics.successRateHistory.slice(0, maxBars); // Max 50 ciclos en gráfico

    for (let i = 0; i < history.length; i++) {
      const rate = history[i];
      const bars = Math.round((rate / 100) * 30); // 30 caracteres de ancho
      const bar = '█'.repeat(bars) + '░'.repeat(30 - bars);
      const cycleNum = `${i + 1}`.padStart(3, ' ');
      const rateStr = `${rate.toFixed(1)}%`.padStart(6, ' ');

      console.log(`   Ciclo ${cycleNum}: ${bar} ${rateStr}`);
    }

    if (this.metrics.successRateHistory.length > maxBars) {
      console.log(`   ... (${this.metrics.successRateHistory.length - maxBars} ciclos más)`);
    }
  }

  /**
   * PARAR DE FORMA SEGURA
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  [ITERATIVE-AUDITOR] No hay ciclos en ejecución');
      return;
    }

    console.log('');
    console.log('🛑 [ITERATIVE-AUDITOR] Señal de parada recibida...');
    console.log('   El ciclo actual se completará antes de detenerse');
    console.log('');

    this.shouldStop = true;
  }

  /**
   * OBTENER ESTADO ACTUAL
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentCycle: this.currentCycle,
      maxCycles: this.maxCycles,
      targetSuccessRate: this.targetSuccessRate,
      currentSuccessRate: this.metrics.currentSuccessRate,
      totalErrors: this.metrics.totalErrors,
      totalRepairs: this.metrics.totalRepairs,
      successRateHistory: this.metrics.successRateHistory,
      startTime: this.metrics.startTime,
      cycleDetails: this.metrics.cycleDetails.slice(-10) // Últimos 10 ciclos
    };
  }

  /**
   * OBTENER MÉTRICAS COMPLETAS
   */
  getMetrics() {
    return this.metrics;
  }
}

module.exports = IterativeAuditor;
