/**
 * Script para ejecutar Phase4 Testing en el módulo de Usuarios
 * y supervisar qué hace
 */

const Phase4TestOrchestrator = require('./src/auditor/core/Phase4TestOrchestrator');

async function testUsersModuleWithPhase4() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  EJECUTANDO PHASE4 - MÓDULO USUARIOS (ISI - Company 11)  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const orchestrator = new Phase4TestOrchestrator();

  try {
    // 1. Iniciar el sistema (Playwright, DB, WebSocket, Ollama)
    console.log('🚀 Iniciando Phase4TestOrchestrator (Playwright, DB, WebSocket)...\n');
    await orchestrator.start();

    // 2. Ejecutar testing del módulo de usuarios para empresa ISI (company_id: 11)
    // Parámetros: moduleName, companyId, maxCycles, companySlug, username, password
    console.log('\n🧪 Ejecutando test del módulo USERS...\n');
    const results = await orchestrator.runModuleTest('users', 11, 2, 'isi', null, 'admin123');

    console.log('\n✅ PHASE4 COMPLETADO\n');
    console.log('📊 RESUMEN DE RESULTADOS:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(JSON.stringify(results, null, 2));

    // Mostrar estadísticas
    if (results.summary) {
      console.log('\n📈 ESTADÍSTICAS:');
      console.log(`   Total tests: ${results.summary.total || 0}`);
      console.log(`   ✅ Passed: ${results.summary.passed || 0}`);
      console.log(`   ❌ Failed: ${results.summary.failed || 0}`);
      console.log(`   ⚠️  Warnings: ${results.summary.warnings || 0}`);
    }

    // 3. Detener el sistema (cerrar browser, DB)
    console.log('\n🛑 Cerrando sistema...');
    await orchestrator.stop();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EJECUTANDO PHASE4:');
    console.error(error);

    // Asegurar que el browser se cierre en caso de error
    try {
      await orchestrator.stop();
    } catch (stopError) {
      console.error('Error al cerrar orchestrator:', stopError.message);
    }

    process.exit(1);
  }
}

testUsersModuleWithPhase4();
