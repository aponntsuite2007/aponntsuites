/**
 * Monitor LIVE del batch con reporte de fallos para reparación inmediata
 */
const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(__dirname, 'tests/e2e/results/batch-test-results.json');
const LOG_FILE = '/tmp/batch-NEW-RUN.log';

let lastModuleCount = 0;

function monitor() {
  if (!fs.existsSync(RESULTS_FILE)) {
    console.log('⏳ Esperando resultados...');
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    const currentCount = data.modules.length;

    // Solo reportar si hay nuevos módulos
    if (currentCount > lastModuleCount) {
      console.log('\n' + '='.repeat(70));
      console.log(`📊 PROGRESO: ${currentCount}/63 módulos completados`);
      console.log('='.repeat(70));

      const passed = data.modules.filter(m => m.status === 'PASSED').length;
      const failed = data.modules.filter(m => m.status === 'FAILED').length;
      const passRate = Math.round((passed / currentCount) * 100);

      console.log(`\n✅ PASSED: ${passed} (${passRate}%)`);
      console.log(`❌ FAILED: ${failed} (${100 - passRate}%)`);

      // Nuevos módulos desde último reporte
      const newModules = data.modules.slice(lastModuleCount);
      console.log(`\n📋 Últimos ${newModules.length} módulos completados:`);
      newModules.forEach(m => {
        const icon = m.status === 'PASSED' ? '✅' : '❌';
        const tests = m.total > 0 ? `${m.passing}/${m.total}` : 'N/A';
        console.log(`   ${icon} ${m.moduleKey.padEnd(35)} ${tests.padEnd(8)} (${m.durationMin})`);
      });

      // Detectar módulos que necesitan reparación
      const failedNow = newModules.filter(m => m.status === 'FAILED');
      if (failedNow.length > 0) {
        console.log(`\n🔧 REQUIEREN REPARACIÓN INMEDIATA:`);
        failedNow.forEach(m => {
          console.log(`   ❌ ${m.moduleKey}`);
          console.log(`      Tests: ${m.passing}/${m.total} passing`);
          console.log(`      Failing: ${m.failing}, Skipped: ${m.skipped}`);
        });
      }

      lastModuleCount = currentCount;
      console.log('\n' + '='.repeat(70) + '\n');
    }

  } catch (e) {
    // JSON corrupto durante escritura
  }
}

// Ejecutar
monitor();
