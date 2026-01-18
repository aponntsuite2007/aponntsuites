/**
 * Test simple de FIX 50 - Solo verificar cierre de modales y descubrimiento de tabs
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');

async function main() {
  console.log('\n🔍 TEST FIX 50 - Cierre de modales bloqueantes\n');

  const agent = new AutonomousQAAgent({
    headless: false,
    timeout: 30000,
    learningEnabled: false,
    brainIntegration: false
  });

  try {
    // 1. Init
    console.log('📦 Inicializando agent...');
    await agent.init();
    console.log('✅ Agent inicializado\n');

    // 2. Login
    console.log('🔐 Haciendo login...');
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('✅ Login completado\n');

    // 3. Navegar a users
    console.log('🧭 Navegando a módulo users...');
    await agent.navigateToModule('users');
    await agent.page.waitForTimeout(2000);
    console.log('✅ En módulo users\n');

    // 4. Testear tabs (con FIX 50)
    console.log('🔬 Testing tabs del módulo...');
    const results = await agent.testModule('users');

    // 5. Mostrar resultados
    console.log('\n📊 RESULTADOS:\n');
    console.log(`   Tabs descubiertos: ${results.discoveries?.tabs?.length || 0}`);
    console.log(`   Tests ejecutados: ${results.totalTests || 0}`);
    console.log(`   Passed: ${results.passed || 0}`);
    console.log(`   Failed: ${results.failed || 0}`);
    console.log(`   Status: ${results.status}`);

    if (results.crudStats) {
      console.log(`\n   CRUD Stats:`);
      console.log(`      CREATE: ${results.crudStats.createSuccess}/${results.crudStats.tested}`);
      console.log(`      READ: ${results.crudStats.readSuccess}/${results.crudStats.tested}`);
      console.log(`      PERSISTENCE: ${results.crudStats.persistenceSuccess}/${results.crudStats.tested}`);
      console.log(`      UPDATE: ${results.crudStats.updateSuccess}/${results.crudStats.tested}`);
      console.log(`      DELETE: ${results.crudStats.deleteSuccess}/${results.crudStats.tested}`);
    }

    await agent.cleanup?.();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await agent.cleanup?.();
    process.exit(1);
  }
}

main();
