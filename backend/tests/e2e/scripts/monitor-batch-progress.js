/**
 * MONITOR DE PROGRESO DEL BATCH E2E
 *
 * Script para monitorear el progreso del batch testing en tiempo real.
 * Muestra estadísticas actualizadas cada N segundos.
 */

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(__dirname, '../results/batch-test-results.json');
const ORIGINAL_FILE = path.join(__dirname, '../results/batch-test-results-ORIGINAL.json');
const INTERVAL_SECONDS = 30; // Verificar cada 30 segundos

console.log('🔍 [MONITOR] Iniciando monitoreo del batch E2E...\n');

let lastTotal = 0;
let startTime = Date.now();

function readResults(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function displayProgress() {
  const currentResults = readResults(RESULTS_FILE);
  const originalResults = readResults(ORIGINAL_FILE);

  if (!currentResults) {
    console.log('⏳ Esperando que comience el batch...');
    return;
  }

  const { summary, modules } = currentResults;
  const total = summary.total;
  const passed = summary.passed;
  const failed = summary.failed;

  // Detectar progreso
  if (total > lastTotal) {
    console.log(`\n📊 [PROGRESO] ${total}/29 módulos completados`);
    lastTotal = total;
  }

  // Estadísticas actuales
  console.clear();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 MONITOR DE BATCH E2E - CON FIX APLICADO');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`📊 PROGRESO: ${total}/29 módulos (${Math.round(total/29*100)}%)`);
  console.log(`⏱️  TIEMPO TRANSCURRIDO: ${formatDuration(Date.now() - startTime)}\n`);

  console.log('─────────────────────────────────────────────────────────');
  console.log('RESULTADOS ACTUALES (CON FIX):');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`✅ PASSED:  ${passed.toString().padStart(2)} módulos (${total > 0 ? Math.round(passed/total*100) : 0}%)`);
  console.log(`❌ FAILED:  ${failed.toString().padStart(2)} módulos (${total > 0 ? Math.round(failed/total*100) : 0}%)`);

  // Comparación con resultados originales
  if (originalResults && originalResults.summary.total > 0) {
    console.log('\n─────────────────────────────────────────────────────────');
    console.log('COMPARACIÓN CON BATCH ORIGINAL (SIN FIX):');
    console.log('─────────────────────────────────────────────────────────');
    const origPassed = originalResults.summary.passed;
    const origFailed = originalResults.summary.failed;
    const origTotal = originalResults.summary.total;

    console.log(`✅ PASSED:  ${origPassed.toString().padStart(2)} módulos (${Math.round(origPassed/origTotal*100)}%)`);
    console.log(`❌ FAILED:  ${origFailed.toString().padStart(2)} módulos (${Math.round(origFailed/origTotal*100)}%)`);

    if (total >= 5) { // Solo comparar si hay suficientes datos
      const improvement = ((passed/total) - (origPassed/origTotal)) * 100;
      const improvementSign = improvement > 0 ? '+' : '';
      console.log(`\n🎯 MEJORA: ${improvementSign}${improvement.toFixed(1)}%`);
    }
  }

  // Último módulo procesado
  if (modules.length > 0) {
    const lastModule = modules[modules.length - 1];
    console.log('\n─────────────────────────────────────────────────────────');
    console.log('ÚLTIMO MÓDULO PROCESADO:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`📦 ${lastModule.moduleKey}`);
    console.log(`   Status: ${lastModule.status}`);
    console.log(`   Tests:  ${lastModule.passing}/${lastModule.total} pasando`);
    console.log(`   Tiempo: ${lastModule.durationMin}`);
  }

  // Estimación de tiempo restante
  if (total > 0 && total < 29) {
    const avgTimePerModule = (Date.now() - startTime) / total;
    const remaining = 29 - total;
    const estimatedRemaining = avgTimePerModule * remaining;

    console.log('\n─────────────────────────────────────────────────────────');
    console.log(`⏱️  TIEMPO RESTANTE ESTIMADO: ${formatDuration(estimatedRemaining)}`);
    console.log('─────────────────────────────────────────────────────────');
  }

  // Verificar si terminó
  if (total === 29) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ BATCH COMPLETADO!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`📊 RESULTADO FINAL:`);
    console.log(`   ✅ PASSED: ${passed}/29 (${Math.round(passed/29*100)}%)`);
    console.log(`   ❌ FAILED: ${failed}/29 (${Math.round(failed/29*100)}%)`);
    console.log(`   ⏱️  DURACIÓN TOTAL: ${formatDuration(Date.now() - startTime)}\n`);

    if (originalResults) {
      const origPassed = originalResults.summary.passed;
      const origTotal = originalResults.summary.total;
      const improvement = ((passed/29) - (origPassed/origTotal)) * 100;
      const improvementSign = improvement > 0 ? '+' : '';

      console.log(`🎯 MEJORA vs ORIGINAL: ${improvementSign}${improvement.toFixed(1)}%`);

      if (passed >= 17) { // 60% de 29 = 17.4
        console.log('\n✅ OBJETIVO ALCANZADO: >= 60% de módulos pasando');
        console.log('   Sistema LISTO PARA PRODUCCIÓN ✨');
      } else if (passed >= 10) {
        console.log('\n⚠️  MEJORA PARCIAL: Entre 35-60% de módulos pasando');
        console.log('   Requiere revisión adicional de configs');
      } else {
        console.log('\n❌ MEJORA INSUFICIENTE: < 35% de módulos pasando');
        console.log('   Requiere análisis adicional del fix');
      }
    }

    process.exit(0);
  }
}

// Iniciar monitoreo
displayProgress();
const interval = setInterval(displayProgress, INTERVAL_SECONDS * 1000);

// Manejo de señales para terminar limpiamente
process.on('SIGINT', () => {
  console.log('\n\n🛑 Monitoreo detenido por el usuario');
  clearInterval(interval);
  process.exit(0);
});
