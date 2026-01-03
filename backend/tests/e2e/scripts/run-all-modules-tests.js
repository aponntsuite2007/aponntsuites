/**
 * EJECUTOR BATCH DE TESTS E2E
 *
 * Ejecuta el test universal para TODOS los módulos CORE en secuencia
 * y consolida los resultados en un reporte final.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuración
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Aedr15150302'
});

const RESULTS_FILE = path.join(__dirname, '../results/batch-test-results.json');
const TIMEOUT_PER_MODULE = 15 * 60 * 1000; // 15 minutos por módulo - MEJORA #7: Reducido de 25 min
const HARD_TIMEOUT_BUFFER = 2 * 60 * 1000; // 2 min extra para logs/cleanup - MEJORA #7

// Resultados globales
const globalResults = {
  startTime: new Date().toISOString(),
  modules: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: 0
  }
};

/**
 * Ejecutar test para un módulo específico
 */
function runModuleTest(moduleKey) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 TESTING: ${moduleKey}`);
    console.log(`${'='.repeat(70)}\n`);

    const startTime = Date.now();
    const command = `npx playwright test tests/e2e/modules/universal-modal-advanced.e2e.spec.js --project=chromium`;

    const child = exec(command, {
      cwd: path.join(__dirname, '../../..'), // Ejecutar desde backend/
      timeout: TIMEOUT_PER_MODULE,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      env: { ...process.env, MODULE_TO_TEST: moduleKey }
    });

    let stdout = '';
    let stderr = '';
    let killed = false; // MEJORA #7: Track si fue matado por timeout HARD

    // MEJORA #7: Timeout HARD - matar proceso si excede 15 min
    const hardTimeoutHandle = setTimeout(() => {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`\n🔴 [MEJORA #7] HARD TIMEOUT después de ${elapsed} min`);
      console.log(`   Matando proceso de ${moduleKey} con SIGKILL...`);

      killed = true;
      child.kill('SIGKILL'); // FORCE KILL - no se puede ignorar

      // El evento 'close' se disparará automáticamente
    }, TIMEOUT_PER_MODULE + HARD_TIMEOUT_BUFFER);

    child.stdout.on('data', (data) => {
      stdout += data;
      process.stdout.write(data); // Log en tiempo real
    });

    child.stderr.on('data', (data) => {
      stderr += data;
      process.stderr.write(data); // Log en tiempo real
    });

    child.on('close', (code) => {
      clearTimeout(hardTimeoutHandle); // MEJORA #7: Cancelar timeout si terminó antes

      const duration = Date.now() - startTime;
      const durationMin = (duration / 1000 / 60).toFixed(1);

      // Analizar resultados del output
      const result = analyzeTestOutput(stdout, stderr, code);

      const moduleResult = {
        moduleKey,
        duration: duration,
        durationMin: `${durationMin} min`,
        exitCode: killed ? 'HARD_TIMEOUT' : code, // MEJORA #7: Marcar si fue timeout hard
        status: killed ? 'FAILED' : (code === 0 ? 'PASSED' : 'FAILED'),
        killedByHardTimeout: killed, // MEJORA #7: NUEVO campo
        ...result,
        timestamp: new Date().toISOString()
      };

      globalResults.modules.push(moduleResult);
      updateSummary(moduleResult);

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`📊 RESULTADO: ${moduleKey}`);
      console.log(`   Status: ${moduleResult.status}`);
      if (killed) {
        console.log(`   ⚠️  Matado por HARD TIMEOUT (${durationMin} min)`);
      }
      console.log(`   Tests Passing: ${result.passing}/${result.total}`);
      console.log(`   Duration: ${durationMin} min`);
      console.log(`${'─'.repeat(70)}\n`);

      // Guardar resultados intermedios
      saveResults();

      resolve(moduleResult);
    });

    child.on('error', (error) => {
      clearTimeout(hardTimeoutHandle); // MEJORA #7: Cancelar timeout
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
 * Analizar output del test para extraer resultados
 */
function analyzeTestOutput(stdout, stderr, exitCode) {
  const result = {
    total: 0,
    passing: 0,
    failing: 0,
    skipped: 0,
    brainErrors: 0,
    chaosTimeout: false
  };

  // Buscar "X passed" en el output
  const passedMatch = stdout.match(/(\d+)\s+passed/);
  if (passedMatch) {
    result.passing = parseInt(passedMatch[1]);
  }

  // Buscar "X failed"
  const failedMatch = stdout.match(/(\d+)\s+failed/);
  if (failedMatch) {
    result.failing = parseInt(failedMatch[1]);
  }

  // Buscar "X skipped"
  const skippedMatch = stdout.match(/(\d+)\s+skipped/);
  if (skippedMatch) {
    result.skipped = parseInt(skippedMatch[1]);
  }

  result.total = result.passing + result.failing + result.skipped;

  // Detectar errores de Brain
  const brainErrorMatches = stdout.match(/Error enviando al Brain/g);
  result.brainErrors = brainErrorMatches ? brainErrorMatches.length : 0;

  // Detectar timeout de CHAOS
  result.chaosTimeout = stdout.includes('CHAOS TESTING') && stdout.includes('Test timeout');

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
 * Guardar resultados en archivo JSON
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
  console.log('📊 REPORTE FINAL - BATCH TESTING E2E');
  console.log('═'.repeat(70));
  console.log(`\n⏱️  Inicio: ${globalResults.startTime}`);
  console.log(`⏱️  Fin: ${new Date().toISOString()}\n`);

  console.log('📈 RESUMEN GLOBAL:');
  console.log(`   Total módulos: ${globalResults.summary.total}`);
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
  console.log('🚀 [BATCH-RUNNER] Iniciando ejecución batch de tests E2E\n');
  console.log('🌍 [ENTERPRISE] Testing TODOS los módulos (CORE + NO-CORE)\n');

  try {
    // Obtener TODOS los módulos activos (CORE + NO-CORE)
    const result = await pool.query(`
      SELECT module_key
      FROM system_modules
      WHERE is_active = true
      ORDER BY is_core DESC, module_key
    `);

    const modules = result.rows.map(r => r.module_key);
    console.log(`📊 [BATCH-RUNNER] ${modules.length} módulos para testear (ENTERPRISE MODE)\n`);

    // Ejecutar tests en secuencia
    for (let i = 0; i < modules.length; i++) {
      const moduleKey = modules[i];
      console.log(`\n[${i + 1}/${modules.length}] Procesando: ${moduleKey}...`);

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
  } finally {
    await pool.end();
  }
}

// Ejecutar
main();
