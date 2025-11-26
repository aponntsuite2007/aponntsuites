/**
 * AUTO-FIX LOOP - Sistema autónomo de auditoría y reparación
 *
 * Ejecuta ciclos continuos de:
 * 1. Auditoría completa
 * 2. Análisis de errores
 * 3. Aplicación de fixes
 * 4. Re-auditoría
 *
 * Se detiene cuando alcanza 100% de éxito o después de N ciclos
 */

const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:9998';
const MAX_CYCLES = 10;
const TARGET_SUCCESS_RATE = 100;
const WAIT_BETWEEN_CYCLES = 5000; // 5 segundos

let authToken = null;

async function login() {
  console.log('\n🔐 Iniciando sesión...');

  const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
    identifier: 'admin',
    password: 'admin123',
    companyId: 11
  });

  authToken = response.data.token;
  console.log('✅ Sesión iniciada');
  return authToken;
}

async function runAudit() {
  console.log('\n🔍 Ejecutando auditoría completa...');

  const response = await axios.post(
    `${BASE_URL}/api/audit/run`,
    { parallel: true, autoHeal: true },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  return response.data;
}

async function getAuditStatus() {
  const response = await axios.get(
    `${BASE_URL}/api/audit/status`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  return response.data;
}

async function waitForAuditCompletion(executionId) {
  console.log(`⏳ Esperando finalización de auditoría ${executionId}...`);

  let attempts = 0;
  const maxAttempts = 120; // 10 minutos máximo

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos

    try {
      const status = await getAuditStatus();

      if (!status.isRunning) {
        console.log('✅ Auditoría completada');
        return status.lastExecution;
      }

      console.log(`   ⏳ Auditoría en progreso... (${attempts * 5}s)`);

    } catch (error) {
      console.log(`   ⚠️  Error verificando status: ${error.message}`);
    }

    attempts++;
  }

  throw new Error('Timeout esperando finalización de auditoría');
}

async function getExecutionDetails(executionId) {
  const response = await axios.get(
    `${BASE_URL}/api/audit/executions/${executionId}`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  return response.data;
}

async function runCycle(cycleNumber) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`║  🔄 CICLO #${cycleNumber}                                        ║`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Ejecutar auditoría
  const auditResponse = await runAudit();
  const executionId = auditResponse.execution_id;

  console.log(`   📊 Execution ID: ${executionId}`);
  console.log(`   🏃 Status: ${auditResponse.status}`);

  // 2. Esperar a que termine
  const lastExecution = await waitForAuditCompletion(executionId);

  // 3. Obtener detalles
  const details = await getExecutionDetails(executionId);

  const summary = details.summary || lastExecution.summary;

  console.log('\n📊 RESULTADOS:');
  console.log(`   Total: ${summary.total}`);
  console.log(`   ✅ Passed: ${summary.passed}`);
  console.log(`   ❌ Failed: ${summary.failed}`);
  console.log(`   ⚠️  Warnings: ${summary.warnings}`);
  console.log(`   📈 Success Rate: ${summary.successRate.toFixed(2)}%`);
  console.log(`   ⏱️  Duration: ${(summary.duration / 1000).toFixed(2)}s`);

  return {
    cycle: cycleNumber,
    executionId,
    summary
  };
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🤖 AUTO-FIX LOOP - Sistema Autónomo                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`   🎯 Objetivo: ${TARGET_SUCCESS_RATE}% success rate`);
  console.log(`   🔁 Max ciclos: ${MAX_CYCLES}`);
  console.log('');

  try {
    // Login
    await login();

    // Ejecutar ciclos
    const results = [];
    let currentCycle = 1;
    let lastSuccessRate = 0;

    while (currentCycle <= MAX_CYCLES) {
      const result = await runCycle(currentCycle);
      results.push(result);

      lastSuccessRate = result.summary.successRate;

      // ¿Alcanzamos el objetivo?
      if (lastSuccessRate >= TARGET_SUCCESS_RATE) {
        console.log('\n🎉🎉🎉 ¡OBJETIVO ALCANZADO! 🎉🎉🎉');
        console.log(`   ✅ Success rate: ${lastSuccessRate.toFixed(2)}%`);
        console.log(`   🔁 Ciclos ejecutados: ${currentCycle}`);
        break;
      }

      // ¿No hubo mejora en los últimos 2 ciclos?
      if (results.length >= 3) {
        const lastThree = results.slice(-3);
        const rates = lastThree.map(r => r.summary.successRate);

        if (rates[0] === rates[1] && rates[1] === rates[2]) {
          console.log('\n⚠️  ESTANCAMIENTO DETECTADO');
          console.log(`   📊 Success rate estable en ${rates[2].toFixed(2)}% durante 3 ciclos`);
          console.log('   ❌ No se pueden aplicar más fixes automáticos');
          break;
        }
      }

      // Esperar entre ciclos
      if (currentCycle < MAX_CYCLES) {
        console.log(`\n⏳ Esperando ${WAIT_BETWEEN_CYCLES / 1000}s antes del siguiente ciclo...`);
        await new Promise(resolve => setTimeout(resolve, WAIT_BETWEEN_CYCLES));
      }

      currentCycle++;
    }

    // Resumen final
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📊 RESUMEN FINAL                                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`   🔁 Ciclos ejecutados: ${results.length}`);
    console.log(`   📈 Progreso:`);

    results.forEach((r, i) => {
      const symbol = i === 0 ? '├' : i === results.length - 1 ? '└' : '├';
      console.log(`      ${symbol}─ Ciclo ${r.cycle}: ${r.summary.successRate.toFixed(2)}% (${r.summary.passed}/${r.summary.total})`);
    });

    const firstRate = results[0].summary.successRate;
    const lastRate = results[results.length - 1].summary.successRate;
    const improvement = lastRate - firstRate;

    console.log(`\n   📊 Mejora total: ${improvement >= 0 ? '+' : ''}${improvement.toFixed(2)}%`);
    console.log(`   🎯 Objetivo: ${lastRate >= TARGET_SUCCESS_RATE ? '✅' : '❌'} (${lastRate.toFixed(2)}% / ${TARGET_SUCCESS_RATE}%)`);

    if (lastRate >= TARGET_SUCCESS_RATE) {
      console.log('\n   🏆 SISTEMA AL 100% - TODOS LOS TESTS PASANDO');
    } else if (lastRate >= 90) {
      console.log('\n   🥈 EXCELENTE - Sistema casi perfecto');
    } else if (lastRate >= 75) {
      console.log('\n   🥉 BIEN - Sistema funcional con mejoras menores');
    } else {
      console.log('\n   ⚠️  REQUIERE REVISIÓN - Errores manuales necesarios');
    }

    console.log('\n✅ Auto-Fix Loop completado\n');

  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
