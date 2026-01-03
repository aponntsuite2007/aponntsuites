/**
 * BATCH RUNNER - SOLO MÓDULOS VÁLIDOS (32 configs completos)
 *
 * Ejecuta tests E2E únicamente para módulos con configs completos (9-10/10 puntos)
 * para obtener resultados limpios sin falsos positivos
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lista de 32 módulos con configs COMPLETOS (validado 2025-12-27)
const VALID_MODULES = [
  'associate-marketplace',
  'attendance',
  'audit-reports',
  'auto-healing-dashboard',
  'biometric-consent',
  'company-email-process',
  'dashboard',
  'dms-dashboard',
  'emotional-analysis',
  'employee-360',
  'employee-map',
  'hour-bank',
  'hse-management',
  'inbox',
  'job-postings',
  'kiosks',
  'legal-dashboard',
  'my-procedures',
  'organizational-structure',
  'payroll-liquidation',
  'positions-management',
  'predictive-workforce-dashboard',
  'procedures-manual',
  'roles-permissions',
  'sanctions-management',
  'siac-commercial-dashboard',
  'sla-tracking',
  'training-management',
  'users',
  'vacation-management',
  'visitors',
  'voice-platform'
];

const RESULTS_FILE = path.join(__dirname, '../results/batch-valid-modules-results.json');
const TIMEOUT_PER_MODULE = 15 * 60 * 1000; // 15 minutos por módulo

// Resultados globales
const globalResults = {
  startTime: new Date().toISOString(),
  validModulesOnly: true,
  totalValidModules: VALID_MODULES.length,
  modules: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: 0
  }
};

/**
 * Ejecutar test para un módulo específico
 */
function runModuleTest(moduleKey) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 TESTING [${globalResults.summary.total + 1}/${VALID_MODULES.length}]: ${moduleKey}`);
    console.log(`${'='.repeat(70)}\n`);

    const startTime = Date.now();
    const command = `npx playwright test tests/e2e/modules/universal-modal-advanced.e2e.spec.js --project=chromium`;

    const child = exec(command, {
      cwd: path.join(__dirname, '../../..'),
      timeout: TIMEOUT_PER_MODULE,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, MODULE_TO_TEST: moduleKey }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data;
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderr += data;
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const durationMin = (duration / 1000 / 60).toFixed(1);

      // Analizar resultados
      const result = analyzeTestOutput(stdout, stderr, code);

      const moduleResult = {
        moduleKey,
        duration: duration,
        durationMin: `${durationMin} min`,
        exitCode: code,
        status: code === 0 ? 'PASSED' : 'FAILED',
        ...result,
        timestamp: new Date().toISOString()
      };

      globalResults.modules.push(moduleResult);
      updateSummary(moduleResult);

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`📊 RESULTADO: ${moduleKey}`);
      console.log(`   Status: ${moduleResult.status}`);
      console.log(`   Tests Passing: ${result.passing}/${result.total}`);
      console.log(`   Duration: ${durationMin} min`);
      console.log(`${'─'.repeat(70)}\n`);

      // Guardar resultados intermedios
      saveResults();

      resolve(moduleResult);
    });

    child.on('error', (error) => {
      console.error(`❌ ERROR ejecutando ${moduleKey}:`, error.message);

      const moduleResult = {
        moduleKey,
        duration: Date.now() - startTime,
        status: 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      };

      globalResults.modules.push(moduleResult);
      globalResults.summary.errors++;
      saveResults();

      resolve(moduleResult);
    });
  });
}

/**
 * Analizar output del test
 */
function analyzeTestOutput(stdout, stderr, exitCode) {
  const result = {
    total: 0,
    passing: 0,
    failing: 0,
    skipped: 0
  };

  const passedMatch = stdout.match(/(\d+)\s+passed/);
  if (passedMatch) result.passing = parseInt(passedMatch[1]);

  const failedMatch = stdout.match(/(\d+)\s+failed/);
  if (failedMatch) result.failing = parseInt(failedMatch[1]);

  const skippedMatch = stdout.match(/(\d+)\s+skipped/);
  if (skippedMatch) result.skipped = parseInt(skippedMatch[1]);

  result.total = result.passing + result.failing + result.skipped;

  return result;
}

/**
 * Actualizar resumen global
 */
function updateSummary(moduleResult) {
  globalResults.summary.total++;

  if (moduleResult.status === 'PASSED') {
    globalResults.summary.passed++;
  } else if (moduleResult.status === 'FAILED') {
    globalResults.summary.failed++;
  } else if (moduleResult.status === 'ERROR') {
    globalResults.summary.errors++;
  }
}

/**
 * Guardar resultados
 */
function saveResults() {
  const resultsDir = path.dirname(RESULTS_FILE);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(
    RESULTS_FILE,
    JSON.stringify(globalResults, null, 2),
    'utf8'
  );
}

/**
 * Generar reporte final
 */
function generateFinalReport() {
  console.log('\n\n');
  console.log('═'.repeat(70));
  console.log('📊 REPORTE FINAL - BATCH TESTING (MÓDULOS VÁLIDOS)');
  console.log('═'.repeat(70));
  console.log(`\n⏱️  Inicio: ${globalResults.startTime}`);
  console.log(`⏱️  Fin: ${globalResults.endTime}\n`);

  console.log('📈 RESUMEN GLOBAL:');
  console.log(`   Total módulos: ${globalResults.summary.total}/${VALID_MODULES.length}`);
  console.log(`   ✅ Passed: ${globalResults.summary.passed}`);
  console.log(`   ❌ Failed: ${globalResults.summary.failed}`);
  console.log(`   ⚠️  Errors: ${globalResults.summary.errors}\n`);

  const successRate = ((globalResults.summary.passed / globalResults.summary.total) * 100).toFixed(1);
  console.log(`📊 Success Rate: ${successRate}%\n`);

  console.log('📋 RESULTADOS POR MÓDULO:\n');
  globalResults.modules.forEach((mod, idx) => {
    const icon = mod.status === 'PASSED' ? '✅' : mod.status === 'FAILED' ? '❌' : '⚠️';
    const passingInfo = mod.passing !== undefined ? ` (${mod.passing}/${mod.total})` : '';
    console.log(`   ${idx + 1}. ${icon} ${mod.moduleKey}${passingInfo} - ${mod.durationMin || 'N/A'}`);
  });

  console.log('\n' + '═'.repeat(70));
  console.log(`\n💾 Resultados guardados en: ${RESULTS_FILE}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 [BATCH-RUNNER] Iniciando batch de tests E2E (SOLO MÓDULOS VÁLIDOS)\n');
  console.log(`📊 Total módulos válidos: ${VALID_MODULES.length}/59\n`);
  console.log('🎯 Configs completos: 9-10/10 puntos\n');

  try {
    // Ejecutar tests en secuencia
    for (let i = 0; i < VALID_MODULES.length; i++) {
      const moduleKey = VALID_MODULES[i];
      console.log(`\n[${i + 1}/${VALID_MODULES.length}] Procesando: ${moduleKey}...`);

      await runModuleTest(moduleKey);

      // Pequeña pausa entre tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generar reporte final
    globalResults.endTime = new Date().toISOString();
    saveResults();
    generateFinalReport();

  } catch (error) {
    console.error('❌ Error fatal en batch runner:', error.message);
    process.exit(1);
  }
}

// Ejecutar
main();
