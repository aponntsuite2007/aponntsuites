/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RUN MASTER TESTING - Entry point principal para testing completo E2E
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ejecuta el ecosistema completo de testing:
 * - SYNAPSE Central Hub
 * - Phase4 Test Orchestrator
 * - Frontend Collector V2
 * - Brain Nervous System
 * - SYNAPSE Configs (60 configs)
 * - SystemRegistry (Single Source of Truth)
 *
 * USO:
 * node backend/scripts/run-master-testing.js [options]
 *
 * OPTIONS:
 * --module=users                    Testear solo un módulo específico
 * --modules=users,attendance        Testear varios módulos
 * --quick                           Test rápido (5 módulos)
 * --full                            Test completo (51 módulos) [DEFAULT]
 * --no-healing                      Deshabilitar auto-healing
 * --headless                        Browser headless (sin ver)
 *
 * EJEMPLOS:
 * node backend/scripts/run-master-testing.js --module=users
 * node backend/scripts/run-master-testing.js --quick
 * node backend/scripts/run-master-testing.js --full
 *
 * @version 1.0.0
 * @date 2026-01-06
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const MasterTestingOrchestrator = require('../src/testing/MasterTestingOrchestrator');

// ═══════════════════════════════════════════════════════════════════════════
// PARSEAR ARGUMENTOS
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    modules: null,
    quick: false,
    full: true,
    healing: true,
    headless: false
  };

  for (const arg of args) {
    if (arg === '--quick') {
      options.quick = true;
      options.full = false;
    } else if (arg === '--full') {
      options.full = true;
      options.quick = false;
    } else if (arg === '--no-healing') {
      options.healing = false;
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg.startsWith('--module=')) {
      const module = arg.split('=')[1];
      options.modules = [module];
      options.full = false;
    } else if (arg.startsWith('--modules=')) {
      const modules = arg.split('=')[1].split(',');
      options.modules = modules;
      options.full = false;
    }
  }

  return options;
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULOS RÁPIDOS (5 módulos representativos)
// ═══════════════════════════════════════════════════════════════════════════

const QUICK_MODULES = [
  'users',           // Gestión básica
  'attendance',      // CRUD completo
  'departments',     // Simple
  'dashboard',       // Solo vista
  'roles-permissions' // Complejo
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const options = parseArgs();

  console.log('\n' + '═'.repeat(80));
  console.log('🚀 MASTER TESTING ORCHESTRATOR - Starting...');
  console.log('═'.repeat(80));
  console.log('\n⚙️ CONFIGURACIÓN:');
  console.log(`   Modo: ${options.quick ? 'QUICK (5 módulos)' : options.full ? 'FULL (51 módulos)' : `ESPECÍFICO (${options.modules.length} módulos)`}`);
  console.log(`   Auto-healing: ${options.healing ? 'ACTIVADO' : 'DESACTIVADO'}`);
  console.log(`   Browser: ${options.headless ? 'Headless (sin ver)' : 'Visible'}`);

  if (options.modules) {
    console.log(`   Módulos: ${options.modules.join(', ')}`);
  }

  console.log('\n' + '═'.repeat(80) + '\n');

  try {
    // 1. Crear orchestrator
    const orchestrator = new MasterTestingOrchestrator({
      playwright: {
        headless: options.headless,
        slowMo: 100,
        timeout: 60000
      },
      autoHealing: {
        enabled: options.healing,
        maxRetries: 3,
        retryDelay: 5000
      }
    });

    // 2. Inicializar
    console.log('🔧 Inicializando ecosistema...\n');
    await orchestrator.initialize();

    // 3. Determinar módulos a testear
    let modulesToTest = options.modules;

    if (options.quick) {
      modulesToTest = QUICK_MODULES;
      console.log('⚡ Modo QUICK - Testeando 5 módulos representativos');
    } else if (!modulesToTest) {
      modulesToTest = null; // Testear todos (filtrados inteligentemente)
      console.log('🎯 Modo FULL - Testeando TODOS los módulos comerciales');
    }

    // 4. Ejecutar testing
    console.log('');
    const result = await orchestrator.runFullTesting({
      modules: modulesToTest
    });

    // 5. Mostrar resultado final
    console.log('\n' + '═'.repeat(80));
    console.log('📊 RESULTADO FINAL');
    console.log('═'.repeat(80));
    console.log(`   ✅ Success: ${result.success ? 'SÍ' : 'NO'}`);
    console.log(`   📄 Reporte: ${result.reportPath}`);
    console.log('\n📈 ESTADÍSTICAS:');
    console.log(`   Total: ${result.stats.totalModules}`);
    console.log(`   ✅ Passed: ${result.stats.passed}`);
    console.log(`   ❌ Failed: ${result.stats.failed}`);
    console.log(`   🔧 Fixed: ${result.stats.fixed}`);
    console.log(`   ⏭️ Skipped: ${result.stats.skipped}`);
    console.log('═'.repeat(80) + '\n');

    // 6. Exit code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('\n' + '═'.repeat(80));
    console.error('❌ ERROR FATAL');
    console.error('═'.repeat(80));
    console.error(error.message);
    console.error(error.stack);
    console.error('═'.repeat(80) + '\n');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL HANDLERS - Graceful shutdown
// ═══════════════════════════════════════════════════════════════════════════

process.on('SIGINT', () => {
  console.log('\n\n⚠️ SIGINT recibido - Deteniendo testing...\n');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️ SIGTERM recibido - Deteniendo testing...\n');
  process.exit(143);
});

// ═══════════════════════════════════════════════════════════════════════════
// EJECUTAR
// ═══════════════════════════════════════════════════════════════════════════

main();
