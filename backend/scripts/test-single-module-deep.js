/**
 * TEST PROFUNDO DE UN SOLO MÓDULO
 * ================================
 * Prueba exhaustiva de CRUD real con llenado de formularios
 *
 * USO:
 * node scripts/test-single-module-deep.js users
 */

require('dotenv').config();
const MasterTestingOrchestrator = require('../src/testing/MasterTestingOrchestrator');

async function main() {
  const moduleName = process.argv[2] || 'users';

  console.log('\n' + '═'.repeat(80));
  console.log(`🎯 TESTING PROFUNDO - Módulo: ${moduleName}`);
  console.log('═'.repeat(80));
  console.log('\n⚙️ CONFIGURACIÓN:');
  console.log(`   Empresa: ISI (datos reales)`);
  console.log(`   Usuario: RRHH-002`);
  console.log(`   Browser: VISIBLE`);
  console.log(`   Auto-healing: DESACTIVADO (para ver errores reales)`);
  console.log('\n' + '═'.repeat(80) + '\n');

  try {
    // 1. Crear orchestrator con ISI
    const orchestrator = new MasterTestingOrchestrator({
      playwright: {
        headless: false,  // Browser visible
        slowMo: 300,      // Más lento para ver qué hace
        timeout: 60000
      },
      autoHealing: {
        enabled: false,   // Desactivado para debugging
        maxRetries: 0
      }
    });

    // 2. Inicializar
    console.log('🔧 Inicializando ecosistema...\n');
    await orchestrator.initialize();

    // 3. Testear UN solo módulo
    console.log(`🧪 Testeando módulo: ${moduleName}\n`);
    const result = await orchestrator.runFullTesting({
      modules: [moduleName]
    });

    // 4. Mostrar resultado
    console.log('\n' + '═'.repeat(80));
    console.log('📊 RESULTADO');
    console.log('═'.repeat(80));
    console.log(`   Módulo: ${moduleName}`);
    console.log(`   Status: ${result.stats.passed > 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Passed: ${result.stats.passed}`);
    console.log(`   Failed: ${result.stats.failed}`);
    console.log('═'.repeat(80) + '\n');

    // 5. Exit code
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

main();
