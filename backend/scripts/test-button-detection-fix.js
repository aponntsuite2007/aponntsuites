const Phase4 = require('../src/auditor/core/Phase4TestOrchestrator');
const db = require('../src/config/database');

(async () => {
  const o = new Phase4({headless: false, slowMo: 100}, db.sequelize);
  try {
    await o.start();
    console.log('\n TEST CRUD DINAMICO - USERS (con FIX de deteccion de botones)\n');

    const r = await o.runDynamicCRUDTest('users', 11, 'isi', 'admin', 'admin123');

    console.log('\nRESULTADOS FINALES');
    console.log('==================');
    console.log(`Tests Ejecutados: ${r.tests.length}`);
    console.log(`Tests PASSED:     ${r.passed}`);
    console.log(`Tests FAILED:     ${r.failed}\n`);

    await o.stop();
    process.exit(r.failed === 0 ? 0 : 1);
  } catch (e) {
    console.error('ERROR:', e.message);
    await o.stop();
    process.exit(1);
  }
})();
