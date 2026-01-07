/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RUN AUTONOMOUS TEST - Ejecutar Agente Autónomo QA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * USAGE:
 * node backend/scripts/run-autonomous-test.js --module=users
 * node backend/scripts/run-autonomous-test.js --module=users --headless
 *
 * @version 1.0.0
 * @date 2026-01-07
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const RealLearningEngine = require('../src/testing/RealLearningEngine');
const database = require('../src/config/database');
const BrainEscalationService = require('../src/brain/services/BrainEscalationService');
const BrainNervousSystem = require('../src/brain/services/BrainNervousSystem');
const fs = require('fs').promises;

/**
 * PARSEAR ARGUMENTOS
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    module: null,
    headless: false,
    empresa: 'isi',
    usuario: 'RRHH-002',
    password: 'admin123'
  };

  for (const arg of args) {
    if (arg.startsWith('--module=')) {
      options.module = arg.split('=')[1];
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg.startsWith('--empresa=')) {
      options.empresa = arg.split('=')[1];
    } else if (arg.startsWith('--usuario=')) {
      options.usuario = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      options.password = arg.split('=')[1];
    }
  }

  if (!options.module) {
    console.error('\n❌ ERROR: Debes especificar un módulo');
    console.error('   Usage: node run-autonomous-test.js --module=users\n');
    process.exit(1);
  }

  return options;
}

/**
 * ACTUALIZAR SESION-LOG.json
 */
async function updateSessionLog(data) {
  try {
    const logPath = '../../SESION-LOG.json';
    let log = {};

    try {
      const content = await fs.readFile(logPath, 'utf8');
      log = JSON.parse(content);
    } catch (e) {
      // Archivo no existe, crear nuevo
    }

    // Merge data
    Object.assign(log, data);
    log.lastUpdate = new Date().toISOString();

    await fs.writeFile(logPath, JSON.stringify(log, null, 2), 'utf8');
  } catch (error) {
    console.error('⚠️  No se pudo actualizar SESION-LOG.json:', error.message);
  }
}

/**
 * MAIN
 */
async function main() {
  const options = parseArgs();

  console.log('\n' + '═'.repeat(80));
  console.log('🤖 AUTONOMOUS QA AGENT - Iniciando...');
  console.log('═'.repeat(80));
  console.log(`\n⚙️  CONFIGURACIÓN:`);
  console.log(`   Módulo: ${options.module}`);
  console.log(`   Headless: ${options.headless ? 'SÍ' : 'NO (browser visible)'}`);
  console.log(`   Empresa: ${options.empresa}`);
  console.log(`   Usuario: ${options.usuario}`);
  console.log('');

  let agent = null;

  try {
    // 1. Inicializar dependencias
    console.log('📦 Inicializando dependencias...\n');

    // ⭐ FIX: Inicializar Brain Escalation Service (singleton)
    await BrainEscalationService.initialize();
    console.log('   ✅ Brain Escalation Service inicializado');

    const learningEngine = new RealLearningEngine(database, BrainEscalationService);
    console.log('   ✅ Learning Engine listo (PostgreSQL)');

    // BrainNervousSystem ya es singleton
    console.log('   ✅ Brain Nervous System conectado');

    // 2. Crear agente
    agent = new AutonomousQAAgent({
      baseUrl: `http://localhost:${process.env.PORT || 9998}`,
      headless: options.headless,
      slowMo: 100,
      defaultTimeout: 30000,
      database: database,
      brainNervous: BrainNervousSystem,
      learningEngine: learningEngine,
      learningEnabled: true,
      brainIntegration: true
    });

    console.log('   ✅ Agente autónomo creado\n');

    // Actualizar log
    await updateSessionLog({
      'fases.fase4.status': 'in_progress',
      'fases.fase4.progreso': 10,
      'fases.fase4.acciones': [
        {
          timestamp: new Date().toISOString(),
          accion: `Iniciando test autónomo de módulo ${options.module}`,
          resultado: 'in_progress'
        }
      ]
    });

    // 3. Inicializar agente
    await agent.init();

    // 4. Login
    await agent.login({
      empresa: options.empresa,
      usuario: options.usuario,
      password: options.password
    });

    // 5. Testear módulo
    const result = await agent.testModule(options.module);

    // 6. Guardar resultado
    console.log(`\n💾 Guardando resultado...`);

    const reportPath = `../../REPORTE-${options.module.toUpperCase()}.md`;
    await fs.writeFile(reportPath, result.report, 'utf8');

    console.log(`   ✅ Reporte guardado en: ${reportPath}`);

    // Actualizar log
    await updateSessionLog({
      'fases.fase4.status': 'completed',
      'fases.fase4.progreso': 100,
      [`descubrimientosUsers.buttons`]: result.discoveries.buttons.length,
      [`descubrimientosUsers.modals`]: result.discoveries.modals.length,
      [`descubrimientosUsers.tabs`]: result.discoveries.tabs.length,
      'proximoPaso': 'Revisar reporte y continuar con siguientes módulos o fixes necesarios'
    });

    // 7. Resultado final
    console.log('\n' + '═'.repeat(80));
    console.log('✅ TESTING COMPLETO');
    console.log('═'.repeat(80));
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Módulo: ${result.module}`);
    console.log(`   Descubrimientos: ${result.discoveries.buttons.length} botones, ${result.discoveries.modals.length} modales, ${result.discoveries.tabs.length} tabs`);
    console.log(`   Testeados: ${result.tested.length} elementos`);
    console.log(`   Exitosos: ${result.tested.filter(t => t.status === 'success').length}`);
    console.log(`   Errores: ${result.tested.filter(t => t.status === 'error').length}`);
    console.log(`   Timeouts: ${result.tested.filter(t => t.status === 'timeout').length}`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n' + '═'.repeat(80));
    console.error('❌ ERROR FATAL');
    console.error('═'.repeat(80));
    console.error(error.message);
    console.error(error.stack);
    console.error('═'.repeat(80) + '\n');

    // Actualizar log con error
    await updateSessionLog({
      'problemas': [
        {
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack
        }
      ]
    });

    process.exit(1);
  } finally {
    if (agent) {
      await agent.close();
    }
  }
}

// Ejecutar
main();
