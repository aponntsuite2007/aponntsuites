/**
 * Monitor batch test en tiempo real y reportar módulos fallidos
 */
const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(__dirname, 'tests/e2e/results/batch-test-results.json');

function checkProgress() {
  if (!fs.existsSync(RESULTS_FILE)) {
    console.log('⏳ Esperando que el batch genere resultados...');
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

    console.log('\n' + '='.repeat(70));
    console.log('📊 PROGRESO DEL BATCH E2E');
    console.log('='.repeat(70));

    const total = data.modules.length;
    const passed = data.modules.filter(m => m.status === 'PASSED').length;
    const failed = data.modules.filter(m => m.status === 'FAILED').length;

    console.log(`\n✅ Completados: ${total} / 63 módulos`);
    console.log(`✅ PASSED: ${passed} (${Math.round(passed/total*100)}%)`);
    console.log(`❌ FAILED: ${failed} (${Math.round(failed/total*100)}%)`);

    // Últimos 5 módulos
    console.log('\n📋 Últimos 5 módulos testeados:');
    data.modules.slice(-5).forEach(m => {
      const icon = m.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${icon} ${m.moduleKey.padEnd(35)} ${m.status.padEnd(8)} (${m.durationMin})`);
    });

    // Módulos fallidos para reparar
    const failedModules = data.modules.filter(m => m.status === 'FAILED');

    if (failedModules.length > 0) {
      console.log('\n🔧 MÓDULOS QUE REQUIEREN REPARACIÓN:');
      failedModules.forEach(m => {
        const tests = `${m.passing}/${m.total} passing`;
        console.log(`   ❌ ${m.moduleKey.padEnd(35)} ${tests.padEnd(15)} (${m.failing} failing, ${m.skipped} skipped)`);
      });
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (e) {
    console.log('⚠️  JSON aún no válido (batch escribiendo...)');
  }
}

// Ejecutar una vez
checkProgress();
