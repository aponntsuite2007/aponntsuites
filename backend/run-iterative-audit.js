/**
 * EJECUTAR CICLOS ITERATIVOS DE AUTO-REPARACIÓN
 *
 * Script standalone para ejecutar ciclos iterativos con:
 * - Navegador VISIBLE en tiempo real
 * - Logs detallados en consola
 * - Auto-aprendizaje y documentación
 * - Parada segura con Ctrl+C
 *
 * USO:
 * ```bash
 * # Ejecutar 10 ciclos
 * PORT=9999 node run-iterative-audit.js
 *
 * # Ejecutar 500 ciclos hasta alcanzar 100%
 * PORT=9999 MAX_CYCLES=500 TARGET=100 node run-iterative-audit.js
 *
 * # Parar de forma segura: Ctrl+C
 * ```
 *
 * @version 1.0.0
 */

require('dotenv').config();
const database = require('./src/config/database');

const PORT = process.env.PORT || 9999;
const MAX_CYCLES = parseInt(process.env.MAX_CYCLES || '10');
const TARGET_SUCCESS_RATE = parseInt(process.env.TARGET || '100');
const COMPANY_ID = parseInt(process.env.COMPANY_ID || '11');

let iterator = null;

/**
 * HANDLER DE PARADA SEGURA (Ctrl+C)
 */
function setupGracefulShutdown() {
  process.on('SIGINT', async () => {
    console.log('\n');
    console.log('🛑 Ctrl+C detectado - Deteniendo de forma segura...');
    console.log('   El ciclo actual se completará antes de salir');
    console.log('');

    if (iterator) {
      iterator.stop();

      // Esperar a que termine el ciclo actual (máximo 2 minutos)
      let waitTime = 0;
      const maxWait = 120000; // 2 minutos
      while (iterator.isRunning && waitTime < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitTime += 1000;
      }

      if (iterator.isRunning) {
        console.log('⚠️  Timeout esperando fin del ciclo - Saliendo forzadamente');
      } else {
        console.log('✅ Ciclos detenidos de forma segura');
      }
    }

    await database.sequelize.close();
    process.exit(0);
  });
}

/**
 * MAIN
 */
async function main() {
  console.clear();

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🔁 AUDITOR ITERATIVO - CICLOS DE AUTO-REPARACIÓN             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📋 CONFIGURACIÓN:');
  console.log(`   • Puerto:                 ${PORT}`);
  console.log(`   • Ciclos máximos:         ${MAX_CYCLES}`);
  console.log(`   • Objetivo de éxito:      ${TARGET_SUCCESS_RATE}%`);
  console.log(`   • Empresa ID:             ${COMPANY_ID}`);
  console.log('');
  console.log('🔧 CARACTERÍSTICAS:');
  console.log('   ✅ Navegador VISIBLE (headless: false)');
  console.log('   ✅ Logs en tiempo real en consola');
  console.log('   ✅ Auto-reparación con Healers');
  console.log('   ✅ Auto-aprendizaje con ProductionErrorMonitor');
  console.log('   ✅ Documentación en Knowledge Base');
  console.log('   ✅ Mejora incremental en cada ciclo');
  console.log('');
  console.log('🛑 PARA DETENER: Presiona Ctrl+C (parada segura)');
  console.log('');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('');

  try {
    // Conectar a base de datos
    console.log('🔌 Conectando a base de datos PostgreSQL...');
    await database.sequelize.authenticate();
    console.log('✅ Conectado a base de datos');
    console.log('');

    // Configurar parada segura
    setupGracefulShutdown();

    // Inicializar componentes
    console.log('🔧 Inicializando componentes...');

    const AuditorEngine = require('./src/auditor/core/AuditorEngine');
    const SystemRegistry = require('./src/auditor/registry/SystemRegistry');
    const EndpointCollector = require('./src/auditor/collectors/EndpointCollector');
    const DatabaseCollector = require('./src/auditor/collectors/DatabaseCollector');
    const FrontendCollector = require('./src/auditor/collectors/FrontendCollector');
    const IntegrationCollector = require('./src/auditor/collectors/IntegrationCollector');
    const HybridHealer = require('./src/auditor/healers/HybridHealer');
    const AdvancedHealer = require('./src/auditor/healers/AdvancedHealer');
    const IterativeAuditor = require('./src/auditor/core/IterativeAuditor');

    // Inicializar SystemRegistry
    const systemRegistry = new SystemRegistry(database);
    await systemRegistry.initialize();
    console.log('✅ SystemRegistry inicializado');

    // Inicializar AuditorEngine
    const auditorEngine = new AuditorEngine(database, {
      environment: process.env.NODE_ENV || 'local',
      autoHeal: true,
      parallel: false // Secuencial para mejor visibilidad
    });

    // Registrar collectors
    auditorEngine.registerCollector('endpoints', new EndpointCollector(database, systemRegistry));
    auditorEngine.registerCollector('database', new DatabaseCollector(database, systemRegistry));
    auditorEngine.registerCollector('frontend', new FrontendCollector(database, systemRegistry));
    auditorEngine.registerCollector('integration', new IntegrationCollector(database, systemRegistry));
    console.log('✅ Collectors registrados');

    // Registrar healers
    auditorEngine.registerHealer('advanced', new AdvancedHealer(database, systemRegistry));
    auditorEngine.registerHealer('hybrid', new HybridHealer(database, systemRegistry));
    console.log('✅ Healers registrados');

    // Intentar cargar AssistantService (opcional)
    let assistantService = null;
    try {
      const AssistantService = require('./src/services/AssistantService');
      assistantService = new AssistantService(database);
      console.log('✅ AssistantService cargado (auto-aprendizaje activo)');
    } catch (err) {
      console.log('⚠️  AssistantService no disponible (auto-aprendizaje desactivado)');
    }

    console.log('');

    // Crear IterativeAuditor
    iterator = new IterativeAuditor(
      database,
      auditorEngine,
      systemRegistry,
      assistantService
    );

    // Escuchar eventos de progreso
    iterator.on('cycle-complete', (cycleDetail) => {
      // El IterativeAuditor ya muestra el resumen, aquí podríamos agregar lógica adicional si necesario
    });

    iterator.on('completed', (metrics) => {
      console.log('');
      console.log('🎉 ¡Ciclos iterativos completados!');
      console.log('');
      process.exit(0);
    });

    // INICIAR CICLOS
    await iterator.start({
      maxCycles: MAX_CYCLES,
      targetSuccessRate: TARGET_SUCCESS_RATE,
      companyId: COMPANY_ID
    });

  } catch (error) {
    console.error('');
    console.error('❌ ERROR FATAL:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    console.error('');
    process.exit(1);
  }
}

main();
