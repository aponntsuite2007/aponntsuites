/**
 * SCRIPT DE MONITOREO DE BATCH E2E
 *
 * Muestra el progreso actual del batch en ejecución
 */

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(__dirname, '../tests/e2e/results/batch-test-results.json');

function formatDuration(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}min`;
}

function monitorBatch() {
  console.log('\n📊 BATCH E2E - MONITOR\n');
  console.log('='.repeat(70) + '\n');

  if (!fs.existsSync(RESULTS_FILE)) {
    console.log('⚠️  Batch no iniciado aún (archivo de resultados no existe)\n');
    return;
  }

  const data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

  const total = data.modules.length;
  const passed = data.modules.filter(m => m.status === 'PASSED').length;
  const failed = data.modules.filter(m => m.status === 'FAILED').length;
  const percentage = Math.round((total / 63) * 100);

  const startTime = new Date(data.startTime);
  const lastModule = data.modules[data.modules.length - 1];
  const lastTime = new Date(lastModule.timestamp);
  const elapsed = lastTime - startTime;

  // Estimar tiempo restante
  const avgTimePerModule = elapsed / total;
  const remaining = 63 - total;
  const etaMs = avgTimePerModule * remaining;

  console.log('📈 PROGRESO GENERAL\n');
  console.log(`  Total testeados:     ${total} / 63 (${percentage}%)`);
  console.log(`  ✅ PASSED:           ${passed} (${Math.round(passed/total*100)}%)`);
  console.log(`  ❌ FAILED:           ${failed} (${Math.round(failed/total*100)}%)`);
  console.log('');

  console.log('⏱️  TIEMPOS\n');
  console.log(`  Inicio:              ${startTime.toLocaleString()}`);
  console.log(`  Transcurrido:        ${formatDuration(elapsed)}`);
  console.log(`  Promedio/módulo:     ${(elapsed/total/1000/60).toFixed(1)} min`);
  console.log(`  ETA restante:        ${formatDuration(etaMs)}`);
  console.log(`  Finalización est.:   ${new Date(Date.now() + etaMs).toLocaleString()}`);
  console.log('');

  console.log('📋 ÚLTIMOS 5 MÓDULOS\n');
  const last5 = data.modules.slice(-5);
  last5.forEach((m, i) => {
    const icon = m.status === 'PASSED' ? '✅' : '❌';
    const num = total - 4 + i;
    console.log(`  ${num}. ${icon} ${m.moduleKey.padEnd(30)} ${m.passing}/${m.total} (${m.durationMin})`);
  });

  console.log('\n' + '='.repeat(70));
  console.log(`\n💡 Siguiente módulo esperado: #${total + 1}/63\n`);
}

// Ejecutar
monitorBatch();
