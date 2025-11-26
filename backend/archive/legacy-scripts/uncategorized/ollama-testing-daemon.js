/**
 * OLLAMA TESTING DAEMON - Testing exhaustivo 24/7
 *
 * Este daemon ejecuta tests PROFUNDOS simulando un usuario real
 * que prueba CADA función 500 veces con datos aleatorios.
 *
 * CARACTERÍSTICAS:
 * - Simula usuario real (clicks, navegación, escritura)
 * - Genera datos aleatorios con Faker
 * - Prueba condiciones extremas (campos vacíos, spam, etc.)
 * - Detecta TODOS los errores (consola, HTTP, network, JS)
 * - Crea tickets automáticamente
 * - Actualiza .claude-notifications/latest-report.json
 *
 * USO:
 *   node ollama-testing-daemon.js
 *
 * Para que corra indefinidamente (24/7):
 *   pm2 start ollama-testing-daemon.js --name "ollama-tester"
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

require('dotenv').config();
const database = require('./src/config/database');
const AuditorEngine = require('./src/auditor/core/AuditorEngine');
const SystemRegistry = require('./src/auditor/registry/SystemRegistry');
const FrontendCollector = require('./src/auditor/collectors/FrontendCollector');
const AdvancedUserSimulationCollector = require('./src/auditor/collectors/AdvancedUserSimulationCollector');
const OllamaTicketReporter = require('./src/auditor/reporters/OllamaTicketReporter');

class OllamaTestingDaemon {
  constructor() {
    this.isRunning = false;
    this.cycleCount = 0;
    this.totalErrors = 0;
    this.totalTickets = 0;

    // Configuración
    this.config = {
      testInterval: 30 * 60 * 1000, // 30 minutos entre ciclos
      repetitionsPerModule: 500, // Probar cada módulo 500 veces
      companyId: 11, // ISI Technologies
      enableTickets: true
    };
  }

  async start() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🤖 OLLAMA TESTING DAEMON - INICIANDO                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`⚙️  Configuración:`);
    console.log(`   Intervalo entre ciclos: ${this.config.testInterval / 60000} minutos`);
    console.log(`   Repeticiones por módulo: ${this.config.testInterval}x`);
    console.log(`   Empresa: ${this.config.companyId}`);
    console.log(`   Sistema de tickets: ${this.config.enableTickets ? 'ACTIVO' : 'DESACTIVADO'}`);
    console.log('');

    try {
      await database.sequelize.authenticate();
      console.log('✅ Conectado a BD');

      this.systemRegistry = new SystemRegistry();
      this.auditorEngine = new AuditorEngine(database, this.systemRegistry);
      this.ticketReporter = new OllamaTicketReporter(database);

      this.isRunning = true;

      console.log('\n🚀 Daemon iniciado - Ejecutando primer ciclo...\n');

      // Ejecutar primer ciclo inmediatamente
      await this.runCycle();

      // Programar ciclos futuros
      this.scheduleNext();
    } catch (error) {
      console.error('\n❌ ERROR FATAL:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async runCycle() {
    this.cycleCount++;

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║  🔄 CICLO #${this.cycleCount} - TESTING EXHAUSTIVO INICIADO           ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`⏰ Inicio: ${new Date().toLocaleString()}`);
    console.log('');

    const startTime = Date.now();

    try {
      // ═══════════════════════════════════════════════════════════
      // FASE 1: ADVANCED USER SIMULATION (500x por módulo)
      // ═══════════════════════════════════════════════════════════

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('FASE 1: Simulación de usuario real (500 repeticiones/módulo)');
      console.log('═══════════════════════════════════════════════════════════════\n');

      const userSimulation = new AdvancedUserSimulationCollector(
        database,
        this.systemRegistry
      );

      const userSimResults = await userSimulation.collect({
        company_id: this.config.companyId,
        repetitions: this.config.repetitionsPerModule,
        randomActions: true,
        stressTest: true // Probar condiciones extremas
      });

      console.log(`\n✅ Simulación completada:`);
      console.log(`   Actions ejecutadas: ${userSimResults.totalActions}`);
      console.log(`   Errores detectados: ${userSimResults.errors.length}`);

      // ═══════════════════════════════════════════════════════════
      // FASE 2: FRONTEND TESTS (CRUD + navegación)
      // ═══════════════════════════════════════════════════════════

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('FASE 2: Tests de frontend (CRUD completo)');
      console.log('═══════════════════════════════════════════════════════════════\n');

      const frontendCollector = new FrontendCollector(
        database,
        this.systemRegistry
      );

      const frontendResults = await frontendCollector.collect({
        company_id: this.config.companyId,
        headless: true, // Sin abrir navegador
        timeout: 30000
      });

      console.log(`\n✅ Frontend tests completados:`);
      console.log(`   Módulos testeados: ${frontendResults.modules.length}`);
      console.log(`   Tests passed: ${frontendResults.passed}`);
      console.log(`   Tests failed: ${frontendResults.failed}`);

      // ═══════════════════════════════════════════════════════════
      // FASE 3: CONSOLIDAR ERRORES
      // ═══════════════════════════════════════════════════════════

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('FASE 3: Consolidando errores detectados');
      console.log('═══════════════════════════════════════════════════════════════\n');

      const allErrors = [
        ...userSimResults.errors,
        ...frontendResults.failures
      ];

      console.log(`📊 Total de errores detectados: ${allErrors.length}`);

      // Agrupar por módulo
      const errorsByModule = {};
      allErrors.forEach(error => {
        const module = error.module || error.moduleName || 'unknown';
        if (!errorsByModule[module]) {
          errorsByModule[module] = [];
        }
        errorsByModule[module].push(error);
      });

      console.log('\n📋 Errores por módulo:');
      Object.keys(errorsByModule).forEach(module => {
        console.log(`   ${module}: ${errorsByModule[module].length} errores`);
      });

      this.totalErrors += allErrors.length;

      // ═══════════════════════════════════════════════════════════
      // FASE 4: CREAR TICKETS (si está habilitado)
      // ═══════════════════════════════════════════════════════════

      if (this.config.enableTickets && allErrors.length > 0) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FASE 4: Creando tickets para Claude Code');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const ticketResult = await this.ticketReporter.processTestResults({
          failures: allErrors,
          stats: {
            total: userSimResults.totalActions + frontendResults.total,
            passed: userSimResults.totalActions - userSimResults.errors.length + frontendResults.passed,
            failed: allErrors.length
          }
        });

        console.log(`\n✅ Tickets creados: ${ticketResult.ticketsCreated}`);
        this.totalTickets += ticketResult.ticketsCreated;
      }

      // ═══════════════════════════════════════════════════════════
      // FASE 5: RESUMEN DEL CICLO
      // ═══════════════════════════════════════════════════════════

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log(`║  ✅ CICLO #${this.cycleCount} COMPLETADO                               ║`);
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`⏱️  Duración: ${duration}s`);
      console.log(`🔍 Errores encontrados: ${allErrors.length}`);
      console.log(`🎫 Tickets creados: ${this.config.enableTickets ? this.ticketReporter.ticketsCreated || 0 : 'N/A'}`);
      console.log('');
      console.log('📊 ESTADÍSTICAS GLOBALES:');
      console.log(`   Ciclos ejecutados: ${this.cycleCount}`);
      console.log(`   Total errores detectados: ${this.totalErrors}`);
      console.log(`   Total tickets creados: ${this.totalTickets}`);
      console.log('');

    } catch (error) {
      console.error('\n❌ ERROR EN CICLO:', error.message);
      console.error(error.stack);
    }

    console.log(`⏰ Fin: ${new Date().toLocaleString()}`);
    console.log(`⏭️  Próximo ciclo en ${this.config.testInterval / 60000} minutos\n`);
  }

  scheduleNext() {
    setTimeout(() => {
      if (this.isRunning) {
        this.runCycle().then(() => {
          this.scheduleNext();
        });
      }
    }, this.config.testInterval);
  }

  stop() {
    console.log('\n🛑 Deteniendo daemon...');
    this.isRunning = false;
    console.log('✅ Daemon detenido');
  }
}

// ═══════════════════════════════════════════════════════════════
// INICIAR DAEMON
// ═══════════════════════════════════════════════════════════════

const daemon = new OllamaTestingDaemon();

// Manejar señales de terminación
process.on('SIGINT', () => {
  daemon.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  daemon.stop();
  process.exit(0);
});

// Iniciar
daemon.start();
