#!/usr/bin/env node

/**
 * CICLO ITERATIVO DE AUTO-REPARACIÓN CON CLAUDE API
 *
 * Flujo:
 * 1. Ejecuta auditoría completa → Detecta errores
 * 2. Claude API genera fixes → Documenta en JSON
 * 3. Aplica fixes automáticamente → Backup de archivos
 * 4. Re-ejecuta auditoría → Verifica reparaciones
 * 5. Repite hasta alcanzar target o max cycles
 *
 * Variables de entorno:
 * - PORT: Puerto del servidor (default: 9998)
 * - MAX_CYCLES: Máximo de ciclos (default: 50)
 * - TARGET: % de éxito objetivo (default: 95)
 * - COMPANY_ID: ID de empresa a auditar (default: 11)
 * - ANTHROPIC_API_KEY: API key de Claude (REQUERIDO)
 */

require('dotenv').config();
const axios = require('axios');
const ClaudeHealer = require('./src/auditor/core/ClaudeHealer');

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 9998;
const BASE_URL = `http://localhost:${PORT}`;
const MAX_CYCLES = parseInt(process.env.MAX_CYCLES || '50');
const TARGET_SUCCESS_RATE = parseInt(process.env.TARGET || '95');
const COMPANY_ID = parseInt(process.env.COMPANY_ID || '11');

// ═══════════════════════════════════════════════════════════════
// CREDENCIALES (hardcoded para testing)
// ═══════════════════════════════════════════════════════════════

const LOGIN_CREDENTIALS = {
  identifier: 'admin',
  password: 'admin123',
  companyId: COMPANY_ID
};

// ═══════════════════════════════════════════════════════════════
// FUNCIONES HELPER
// ═══════════════════════════════════════════════════════════════

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, LOGIN_CREDENTIALS);
    return response.data.token;
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    process.exit(1);
  }
}

async function runAudit(token) {
  try {
    console.log('🔍 Ejecutando auditoría...');

    const response = await axios.post(
      `${BASE_URL}/api/audit/run`,
      {
        parallel: true,
        autoHeal: false, // Desactivar healers antiguos
        company_id: COMPANY_ID
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const execution_id = response.data.execution_id;

    // Esperar a que termine la auditoría
    console.log(`   Execution ID: ${execution_id}`);
    console.log('   Esperando resultados...');

    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutos

    return execution_id;

  } catch (error) {
    console.error('❌ Error ejecutando auditoría:', error.message);
    throw error;
  }
}

async function getAuditResults(token, execution_id) {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/audit/executions/${execution_id}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo resultados:', error.message);
    throw error;
  }
}

function displaySummary(summary, cycle) {
  const passRate = ((summary.passed / summary.total) * 100).toFixed(1);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  CICLO ${cycle} - RESUMEN`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total tests:    ${summary.total}`);
  console.log(`  ✅ Passed:      ${summary.passed} (${passRate}%)`);
  console.log(`  ❌ Failed:      ${summary.failed}`);
  console.log(`  ⚠️  Warnings:    ${summary.warnings}`);
  console.log(`  Duración:       ${(summary.total_duration / 1000).toFixed(1)}s`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  return parseFloat(passRate);
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🔄 CICLO ITERATIVO DE AUTO-REPARACIÓN CON CLAUDE       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`⚙️  CONFIGURACIÓN:`);
  console.log(`   • Max Cycles:        ${MAX_CYCLES}`);
  console.log(`   • Target Success:    ${TARGET_SUCCESS_RATE}%`);
  console.log(`   • Company ID:        ${COMPANY_ID}`);
  console.log(`   • Base URL:          ${BASE_URL}`);
  console.log('');

  // Verificar API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('');
    console.error('❌ ERROR: ANTHROPIC_API_KEY no está configurada');
    console.error('');
    console.error('Configura tu API key en .env:');
    console.error('  ANTHROPIC_API_KEY=sk-ant-api03-xxxxx');
    console.error('');
    console.error('Ver guía: backend/GUIA-CONTRATAR-CLAUDE-API.md');
    console.error('');
    process.exit(1);
  }

  // Inicializar ClaudeHealer
  const claudeHealer = new ClaudeHealer();

  // Login
  console.log('🔐 Iniciando sesión...');
  const token = await login();
  console.log('   ✅ Login exitoso');
  console.log('');

  // Variables de loop
  let cycle = 0;
  let currentSuccessRate = 0;
  let previousSuccessRate = 0;

  const cycleResults = [];

  // ═══════════════════════════════════════════════════════════════
  // LOOP PRINCIPAL
  // ═══════════════════════════════════════════════════════════════

  while (cycle < MAX_CYCLES && currentSuccessRate < TARGET_SUCCESS_RATE) {
    cycle++;

    console.log('');
    console.log('┌────────────────────────────────────────────────────────┐');
    console.log(`│  CICLO ${cycle}/${MAX_CYCLES}                                        │`);
    console.log('└────────────────────────────────────────────────────────┘');
    console.log('');

    // ═══════════════════════════════════════════════════════════
    // PASO 1: EJECUTAR AUDITORÍA
    // ═══════════════════════════════════════════════════════════

    const execution_id = await runAudit(token);

    // ═══════════════════════════════════════════════════════════
    // PASO 2: OBTENER RESULTADOS
    // ═══════════════════════════════════════════════════════════

    const results = await getAuditResults(token, execution_id);
    const { summary, logs } = results;

    currentSuccessRate = displaySummary(summary, cycle);

    // Guardar resultado del ciclo
    cycleResults.push({
      cycle,
      execution_id,
      success_rate: currentSuccessRate,
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      duration: summary.total_duration
    });

    // ═══════════════════════════════════════════════════════════
    // VERIFICAR SI ALCANZAMOS TARGET
    // ═══════════════════════════════════════════════════════════

    if (currentSuccessRate >= TARGET_SUCCESS_RATE) {
      console.log('');
      console.log('🎉🎉🎉 ¡OBJETIVO ALCANZADO! 🎉🎉🎉');
      console.log(`   Success rate: ${currentSuccessRate}% >= ${TARGET_SUCCESS_RATE}%`);
      console.log('');
      break;
    }

    // ═══════════════════════════════════════════════════════════
    // VERIFICAR SI NO HAY MEJORA (EARLY STOP)
    // ═══════════════════════════════════════════════════════════

    if (cycle > 1 && currentSuccessRate <= previousSuccessRate) {
      console.log('');
      console.log('⚠️  WARNING: No hay mejora en este ciclo');
      console.log(`   Anterior: ${previousSuccessRate}%`);
      console.log(`   Actual:   ${currentSuccessRate}%`);
      console.log('');

      // Si no mejora en 3 ciclos consecutivos → STOP
      const lastThree = cycleResults.slice(-3);
      if (lastThree.length === 3) {
        const rates = lastThree.map(r => r.success_rate);
        const noImprovement = rates[0] >= rates[1] && rates[1] >= rates[2];

        if (noImprovement) {
          console.log('❌ Sin mejora en 3 ciclos consecutivos - STOP');
          console.log('');
          break;
        }
      }
    }

    previousSuccessRate = currentSuccessRate;

    // ═══════════════════════════════════════════════════════════
    // PASO 3: FILTRAR ERRORES
    // ═══════════════════════════════════════════════════════════

    const errors = logs.filter(l => l.status === 'fail');

    console.log(`🔴 Errores detectados: ${errors.length}`);
    console.log('');

    if (errors.length === 0) {
      console.log('✅ No hay errores - STOP');
      console.log('');
      break;
    }

    // ═══════════════════════════════════════════════════════════
    // PASO 4: GENERAR FIXES CON CLAUDE
    // ═══════════════════════════════════════════════════════════

    console.log('🤖 Claude generando fixes...');
    const fixes = await claudeHealer.generateFixes(errors, execution_id);

    if (fixes.length === 0) {
      console.log('');
      console.log('⚠️  Claude no pudo generar fixes - STOP');
      console.log('');
      break;
    }

    console.log(`   ${fixes.length} fixes generados`);
    console.log('');

    // ═══════════════════════════════════════════════════════════
    // PASO 5: APLICAR FIXES
    // ═══════════════════════════════════════════════════════════

    console.log('🔧 Aplicando fixes...');

    let appliedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < fixes.length; i++) {
      const fix = fixes[i];
      console.log(`   ${i + 1}/${fixes.length} - ${fix.module_name}`);

      const result = await claudeHealer.applyFix(fix);

      if (result.success) {
        appliedCount++;
      } else {
        failedCount++;
      }
    }

    console.log('');
    console.log(`✅ Fixes aplicados: ${appliedCount}`);
    console.log(`❌ Fixes fallidos:  ${failedCount}`);
    console.log('');

    // ═══════════════════════════════════════════════════════════
    // PASO 6: ESPERAR ANTES DE RE-TEST
    // ═══════════════════════════════════════════════════════════

    console.log('⏳ Esperando 5 segundos antes de re-test...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════════

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  📊 RESUMEN FINAL DEL CICLO ITERATIVO                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  console.log(`Total de ciclos ejecutados: ${cycle}`);
  console.log('');

  console.log('Evolución del success rate:');
  cycleResults.forEach(r => {
    const arrow = r.cycle > 1 && r.success_rate > cycleResults[r.cycle - 2].success_rate ? '📈' : '📉';
    console.log(`  Ciclo ${r.cycle}: ${r.success_rate}% ${arrow} (${r.passed}/${r.total} tests)`);
  });
  console.log('');

  const initialRate = cycleResults[0].success_rate;
  const finalRate = cycleResults[cycleResults.length - 1].success_rate;
  const improvement = (finalRate - initialRate).toFixed(1);

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Tasa inicial:     ${initialRate}%`);
  console.log(`  Tasa final:       ${finalRate}%`);
  console.log(`  Mejora:           ${improvement > 0 ? '+' : ''}${improvement}%`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  if (finalRate >= TARGET_SUCCESS_RATE) {
    console.log('🎉 ¡ÉXITO! Objetivo alcanzado');
  } else {
    console.log(`⚠️  Objetivo no alcanzado (target: ${TARGET_SUCCESS_RATE}%)`);
  }

  console.log('');
  console.log('📁 Fixes guardados en: backend/audit-reports/fixes-*.json');
  console.log('📦 Backups en: backend/**/*.backup');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════

main().catch(error => {
  console.error('');
  console.error('❌ ERROR FATAL:', error.message);
  console.error('');
  console.error(error.stack);
  process.exit(1);
});
