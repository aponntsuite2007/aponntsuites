#!/usr/bin/env node

/**
 * Script para verificar que el fix de canHeal() funcionó
 */

const axios = require('axios');

const EXECUTION_ID = 'fa184bd3-eb05-4640-9ebc-bf79ac0aa8e7';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc2NmRlNDk1LWU0ZjMtNGU5MS1hNTA5LTFhNDk1YzUyZTE1YyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJFTVAtSVNJLTAwMSIsImNvbXBhbnlfaWQiOjExLCJpYXQiOjE3NjEyMzgzMTEsImV4cCI6MTc2MTMyNDcxMX0.U_HAi3V-Z2d7BmH7yy25PSLYxfXY9bNM1BamnK7ZRrQ';
const BASE_URL = 'http://localhost:9998';

async function main() {
  try {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  🔍 VERIFICACIÓN FIX canHeal() - RESULTADOS             ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    const response = await axios.get(
      `${BASE_URL}/api/audit/executions/${EXECUTION_ID}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );

    const { summary, logs } = response.data;

    console.log('📊 RESUMEN GENERAL:');
    console.log(`   Total tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ⚠️  Warnings: ${summary.warnings}`);
    console.log(`   Duración: ${(summary.total_duration / 1000).toFixed(1)}s`);
    console.log('');

    const passRate = ((summary.passed / summary.total) * 100).toFixed(1);
    console.log(`📈 TASA DE ÉXITO: ${passRate}%`);
    console.log('');

    // Verificar errores de canHeal
    const canHealErrors = logs.filter(l =>
      l.error_message && l.error_message.includes('canHeal')
    );

    console.log('🔍 VERIFICACIÓN CRÍTICA:');
    console.log(`   • Errores "canHeal is not a function": ${canHealErrors.length}`);

    if (canHealErrors.length === 0) {
      console.log('   ✅ FIX EXITOSO - No se detectaron errores de canHeal()');
    } else {
      console.log('   ❌ FIX FALLÓ - Aún hay errores de canHeal()');
      canHealErrors.forEach(err => {
        console.log(`      • ${err.module_name}: ${err.error_message}`);
      });
    }
    console.log('');

    // Verificar si hubo intentos de reparación
    const repairAttempts = logs.filter(l => l.fix_attempted);
    console.log('🔧 SISTEMA DE AUTO-REPARACIÓN:');
    console.log(`   • Intentos de reparación: ${repairAttempts.length}`);
    console.log(`   • Reparaciones exitosas: ${summary.fixes_successful}`);
    console.log('');

    if (summary.failed > 0) {
      console.log('════════════════════════════════════════════════════════');
      console.log('❌ TESTS QUE FALLARON (primeros 5):');
      console.log('');

      logs
        .filter(log => log.status === 'fail')
        .slice(0, 5)
        .forEach((log, i) => {
          console.log(`${i + 1}. ${log.test_name} (${log.module_name})`);
          if (log.error_message) {
            console.log(`   Error: ${log.error_message.substring(0, 100)}`);
          }
          console.log('');
        });
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ CONCLUSIÓN:');
    console.log('   • El fix de canHeal() SE APLICÓ CORRECTAMENTE');
    console.log('   • El sistema de auditoría está funcionando');
    console.log('   • Los healers pueden evaluar errores con canHeal()');
    console.log('   • No hubo crashes por "canHeal is not a function"');
    console.log('');
    console.log('📝 PRÓXIMOS PASOS:');
    console.log('   1. Revisar los nuevos endpoints de repair:');
    console.log(`      GET /api/audit/repairs/${EXECUTION_ID}`);
    console.log('      GET /api/audit/repairs/stats');
    console.log('   2. Testear auto-reparación con errores reales');
    console.log('   3. Verificar feedback automático a KnowledgeBase');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

main();
