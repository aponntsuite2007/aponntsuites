#!/usr/bin/env node

/**
 * MONITOR DE PROGRESO - SYNAPSE REPAIR BATCH
 *
 * Monitorea el progreso del batch con sistema de repair
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'SYNAPSE-INTELLIGENT.md');

function parseLog() {
  if (!fs.existsSync(LOG_FILE)) {
    return {
      started: false,
      modules: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      current: null,
      discoveries: 0,
      configs: 0,
      fixes: 0,
      repairs: 0
    };
  }

  const content = fs.readFileSync(LOG_FILE, 'utf8');
  const lines = content.split('\n');

  let modules = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let current = null;
  let discoveries = 0;
  let configs = 0;
  let fixes = 0;
  let repairs = 0;

  // Contar módulos procesados
  const moduleMatches = content.match(/## \d+\. /g);
  modules = moduleMatches ? moduleMatches.length : 0;

  // Contar por status
  for (const line of lines) {
    if (line.includes('**Status**: PASSED')) passed++;
    if (line.includes('**Status**: FAILED')) failed++;
    if (line.includes('**Status**: SKIPPED')) skipped++;

    // Contar repairs (líneas con "⚠️ Skipped")
    if (line.includes('**⚠️ Skipped**')) repairs++;
  }

  // Stats del sistema
  const discoveriesMatch = content.match(/\*\*🔍 Discoveries ejecutados\*\*: (\d+)/);
  const configsMatch = content.match(/\*\*⚙️ Configs auto-generados\*\*: (\d+)/);
  const fixesMatch = content.match(/\*\*🔧 Fixes aplicados\*\*: (\d+)/);

  if (discoveriesMatch) discoveries = parseInt(discoveriesMatch[1]);
  if (configsMatch) configs = parseInt(configsMatch[1]);
  if (fixesMatch) fixes = parseInt(fixesMatch[1]);

  // Módulo actual
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/## \d+\. (.+?) \(Intento \d+\)/);
    if (match) {
      current = match[1];
      break;
    }
  }

  const total = passed + failed + skipped;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return {
    started: true,
    modules,
    passed,
    failed,
    skipped,
    current,
    passRate,
    discoveries,
    configs,
    fixes,
    repairs
  };
}

function printProgress() {
  const stats = parseLog();

  console.clear();
  console.log('═'.repeat(70));
  console.log('🔧 SYNAPSE REPAIR SYSTEM - BATCH EN PROGRESO');
  console.log('═'.repeat(70));

  if (!stats.started) {
    console.log('\n⏳ Esperando inicio de ejecución...');
    console.log('\n   Log: SYNAPSE-INTELLIGENT.md');
    console.log('═'.repeat(70));
    return;
  }

  console.log('\n📊 RESULTADOS:');
  console.log(`   Módulos procesados: ${stats.modules} / 63`);
  console.log(`   ✅ PASSED: ${stats.passed} (${stats.passRate}%)`);
  console.log(`   ❌ FAILED: ${stats.failed}`);
  console.log(`   ⏭️  SKIPPED: ${stats.skipped}`);

  if (stats.current) {
    console.log(`\n🔧 Módulo actual: ${stats.current}`);
  }

  console.log('\n🔬 ACTIVIDAD DEL SISTEMA:');
  console.log(`   🔍 Discoveries ejecutados: ${stats.discoveries}`);
  console.log(`   ⚙️  Configs auto-generados: ${stats.configs}`);
  console.log(`   🔧 Fixes aplicados: ${stats.fixes}`);
  console.log(`   🛠️  Repairs ejecutados: ${stats.repairs}`);

  // Progress bar
  const total = stats.passed + stats.failed + stats.skipped;
  if (total > 0) {
    const barLength = 50;
    const passedBars = Math.round((stats.passed / total) * barLength);
    const failedBars = Math.round((stats.failed / total) * barLength);
    const skippedBars = barLength - passedBars - failedBars;

    console.log('\n📈 PROGRESO:');
    console.log('   [' +
      '█'.repeat(passedBars) +
      '▓'.repeat(failedBars) +
      '░'.repeat(skippedBars > 0 ? skippedBars : 0) +
      ']'
    );
  }

  // Estimación de tiempo
  const avgTimePerModule = 5.5; // minutos
  const remaining = 63 - stats.modules;
  const estimatedMin = Math.round(remaining * avgTimePerModule);
  const estimatedHours = Math.floor(estimatedMin / 60);
  const estimatedMinRemainder = estimatedMin % 60;

  console.log('\n⏱️  TIEMPO ESTIMADO:');
  if (estimatedHours > 0) {
    console.log(`   Restante: ~${estimatedHours}h ${estimatedMinRemainder}min`);
  } else {
    console.log(`   Restante: ~${estimatedMin} min`);
  }

  console.log('\n═'.repeat(70));
  console.log(`⏰ Última actualización: ${new Date().toLocaleTimeString()}`);
  console.log('═'.repeat(70));
}

// Monitoreo continuo
console.log('🚀 Iniciando monitor de SYNAPSE REPAIR BATCH...\n');
console.log('   Presiona Ctrl+C para salir\n');

printProgress();

const interval = setInterval(() => {
  printProgress();
}, 10000); // Actualizar cada 10 segundos

// Cleanup al salir
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n\n👋 Monitor detenido');
  process.exit(0);
});
