#!/usr/bin/env node

/**
 * 🔄 MODO INTERACTIVO: OLLAMA DIAGNOSTICA → CLAUDE CODE REPARA → RE-TEST
 *
 * Flujo:
 * 1. Ollama detecta errores (gratis)
 * 2. Genera reporte JSON detallado
 * 3. PAUSA → Claude Code (tú) reparas
 * 4. Continúa con re-test
 * 5. Repite hasta target alcanzado
 *
 * Costo: $0 (todo local/manual)
 * Eficiencia: 90%+ (Claude Code es excelente reparando)
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 9998;
const BASE_URL = `http://localhost:${PORT}`;
const MAX_CYCLES = parseInt(process.env.MAX_CYCLES || '20');
const TARGET_SUCCESS_RATE = parseInt(process.env.TARGET || '95');
const COMPANY_ID = parseInt(process.env.COMPANY_ID || '11');

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
    console.log('🔍 Ejecutando auditoría con Ollama...');

    const response = await axios.post(
      `${BASE_URL}/api/audit/run`,
      {
        parallel: true,
        autoHeal: true, // Usa healers actuales (Ollama)
        company_id: COMPANY_ID
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const execution_id = response.data.execution_id;
    console.log(`   Execution ID: ${execution_id}`);
    console.log('   Esperando resultados... (2 minutos)');

    await new Promise(resolve => setTimeout(resolve, 120000));

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

async function generateErrorReport(cycle, execution_id, errors) {
  const reportDir = path.join(__dirname, 'audit-reports');
  await fs.mkdir(reportDir, { recursive: true });

  const reportFile = path.join(reportDir, `cycle-${cycle}-errors.json`);

  // Generar reporte detallado para Claude Code
  const report = {
    cycle,
    execution_id,
    timestamp: new Date().toISOString(),
    total_errors: errors.length,
    errors: errors.map(err => ({
      id: err.id,
      module: err.module_name,
      test: err.test_name,
      file: err.file || 'N/A',
      line: err.line || 'N/A',
      error_type: err.error_type,
      error_message: err.error_message,
      error_stack: err.error_stack ? err.error_stack.substring(0, 500) : 'N/A',
      diagnosis: err.diagnosis || 'N/A',
      suggested_fix: err.suggested_fix || 'N/A',
      priority: err.severity || 'medium'
    }))
  };

  await fs.writeFile(reportFile, JSON.stringify(report, null, 2), 'utf8');

  return reportFile;
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
  console.log(`  🔧 Fixes:       ${summary.fixes_attempted || 0} intentados, ${summary.fixes_successful || 0} exitosos`);
  console.log(`  Duración:       ${(summary.total_duration / 1000).toFixed(1)}s`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  return parseFloat(passRate);
}

function displayErrorsByPriority(errors) {
  const critical = errors.filter(e => e.error_type === 'critical' || e.severity === 'high');
  const moderate = errors.filter(e => e.error_type === 'error' || e.severity === 'medium');
  const minor = errors.filter(e => e.error_type === 'warning' || e.severity === 'low');

  console.log('📊 ERRORES POR PRIORIDAD:');
  console.log('');

  if (critical.length > 0) {
    console.log(`  🔴 CRÍTICOS (${critical.length}):`);
    critical.slice(0, 5).forEach((err, i) => {
      console.log(`     ${i + 1}. ${err.module_name}: ${err.test_name}`);
      console.log(`        ${err.error_message.substring(0, 80)}...`);
    });
    console.log('');
  }

  if (moderate.length > 0) {
    console.log(`  🟡 MODERADOS (${moderate.length}):`);
    moderate.slice(0, 3).forEach((err, i) => {
      console.log(`     ${i + 1}. ${err.module_name}: ${err.test_name}`);
    });
    console.log('');
  }

  if (minor.length > 0) {
    console.log(`  ⚪ MENORES (${minor.length})`);
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🔄 MODO INTERACTIVO: OLLAMA + CLAUDE CODE              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⚙️  FLUJO:');
  console.log('   1. Ollama diagnostica errores (gratis)');
  console.log('   2. Genera reporte JSON detallado');
  console.log('   3. PAUSA → Claude Code repara');
  console.log('   4. Re-test automático');
  console.log('   5. Repite hasta alcanzar target');
  console.log('');
  console.log(`⚙️  CONFIGURACIÓN:`);
  console.log(`   • Max Cycles:        ${MAX_CYCLES}`);
  console.log(`   • Target Success:    ${TARGET_SUCCESS_RATE}%`);
  console.log(`   • Company ID:        ${COMPANY_ID}`);
  console.log(`   • Costo:             $0 USD (todo gratis)`);
  console.log('');

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
    // PASO 1: EJECUTAR AUDITORÍA CON OLLAMA
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
    // PASO 3: FILTRAR ERRORES Y GENERAR REPORTE
    // ═══════════════════════════════════════════════════════════

    const errors = logs.filter(l => l.status === 'fail');

    if (errors.length === 0) {
      console.log('✅ No hay errores - STOP');
      console.log('');
      break;
    }

    console.log(`🔴 Errores detectados: ${errors.length}`);
    console.log('');

    // Mostrar errores por prioridad
    displayErrorsByPriority(errors);

    // Generar reporte JSON
    const reportFile = await generateErrorReport(cycle, execution_id, errors);

    console.log('📄 REPORTE GENERADO:');
    console.log(`   ${reportFile}`);
    console.log('');

    // ═══════════════════════════════════════════════════════════
    // PASO 4: PAUSA PARA QUE CLAUDE CODE REPARE
    // ═══════════════════════════════════════════════════════════

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ⏸️  PAUSA: ESPERANDO REPARACIONES DE CLAUDE CODE       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('👤 ACCIÓN REQUERIDA:');
    console.log('');
    console.log(`   1. Abrir reporte: ${reportFile}`);
    console.log('   2. Decirme a Claude Code: "repara los errores del ciclo ' + cycle + '"');
    console.log('   3. Yo reparo todos los errores uno por uno');
    console.log('   4. Cuando termine, decime: "continuar ciclo"');
    console.log('');
    console.log('💡 TIP: Puedo reparar múltiples archivos en paralelo');
    console.log('');
    console.log('⏳ Script en PAUSA - Esperando que termines...');
    console.log('');
    console.log('─────────────────────────────────────────────────────────');
    console.log('Para continuar, ejecuta:');
    console.log(`   node run-interactive-repair.js --continue ${cycle}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log('');

    // Guardar estado del ciclo
    const stateFile = path.join(__dirname, 'audit-reports', 'cycle-state.json');
    await fs.writeFile(stateFile, JSON.stringify({
      cycle,
      execution_id,
      success_rate: currentSuccessRate,
      errors_count: errors.length,
      timestamp: new Date().toISOString()
    }, null, 2), 'utf8');

    // STOP aquí - esperando que Claude Code repare
    process.exit(0);
  }

  // ═══════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════════

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  📊 RESUMEN FINAL DEL CICLO INTERACTIVO                 ║');
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
    console.log('🎉 ¡ÉXITO! Objetivo alcanzado con $0 USD gastados');
  } else {
    console.log(`⚠️  Objetivo no alcanzado (target: ${TARGET_SUCCESS_RATE}%)`);
  }

  console.log('');
  console.log('📁 Reportes guardados en: backend/audit-reports/cycle-*.json');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════
// COMANDO PARA CONTINUAR CICLO
// ═══════════════════════════════════════════════════════════════

async function continueCycle(cycleNumber) {
  console.log('');
  console.log('🔄 Continuando ciclo después de reparaciones...');
  console.log('');

  // Leer estado guardado
  const stateFile = path.join(__dirname, 'audit-reports', 'cycle-state.json');
  const stateData = await fs.readFile(stateFile, 'utf8');
  const state = JSON.parse(stateData);

  console.log(`✅ Reparaciones del ciclo ${state.cycle} completadas`);
  console.log(`   Errores originales: ${state.errors_count}`);
  console.log('');
  console.log('⏳ Esperando 5 segundos antes de re-test...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Re-ejecutar el script para el siguiente ciclo
  main();
}

// ═══════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

if (args[0] === '--continue' && args[1]) {
  const cycleNumber = parseInt(args[1]);
  continueCycle(cycleNumber);
} else {
  main().catch(error => {
    console.error('');
    console.error('❌ ERROR FATAL:', error.message);
    console.error('');
    console.error(error.stack);
    process.exit(1);
  });
}
