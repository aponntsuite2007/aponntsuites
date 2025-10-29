/**
 * MOSTRAR RESULTADOS DE AUDITORÍA
 */

const axios = require('axios');

// Puede recibir execution_id por argumento, o buscar la última ejecución
const EXECUTION_ID = process.argv[2] || 'e051be8e-0664-46c1-b32b-65f660a00533';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc2NmRlNDk1LWU0ZjMtNGU5MS1hNTA5LTFhNDk1YzUyZTE1YyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJFTVAtSVNJLTAwMSIsImNvbXBhbnlfaWQiOjExLCJpYXQiOjE3NjExNjcyOTksImV4cCI6MTc2MTI1MzY5OX0.lfRCUfQMqQZqXHYhjxDoRlisO0YBpdBksao1LJt-wfY';

async function showResults() {
  try {
    const response = await axios.get(
      `http://localhost:9998/api/audit/executions/${EXECUTION_ID}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    const data = response.data;
    const s = data.summary;

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  🏆 RESULTADO FINAL - SISTEMA COMPLETO MEJORADO         ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📊 RESUMEN GENERAL:`);
    console.log(`   Total tests: ${s.total}`);
    console.log(`   ✅ Passed: ${s.passed}`);
    console.log(`   ❌ Failed: ${s.failed}`);
    console.log(`   ⚠️  Warnings: ${s.warnings}`);
    console.log(`   ⏱️  Duración: ${(s.total_duration / 1000).toFixed(1)}s`);
    console.log('');

    const passRate = ((s.passed / s.total) * 100).toFixed(1);
    console.log(`📈 TASA DE ÉXITO: ${passRate}%`);
    console.log(`🎯 OBJETIVO: 100%`);
    console.log('');

    // Mostrar errores críticos si los hay
    const failedLogs = data.logs.filter(log => log.status === 'fail');

    if (failedLogs.length > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('❌ TESTS QUE AÚN FALLAN:');
      console.log('');
      failedLogs.forEach((log, i) => {
        console.log(`${i + 1}. ${log.test_name} (${log.module_name})`);
        if (log.error_message) {
          console.log(`   Error: ${log.error_message}`);
        }
        console.log('');
      });
    }

    console.log('🚀 MEJORAS IMPLEMENTADAS EN ESTA VERSIÓN:');
    console.log('');
    console.log('   ✅ E2ECollector con tests comprehensivos:');
    console.log('      • Tests de notificaciones multi-canal');
    console.log('      • Tests de approval flows completos');
    console.log('      • Tests de workflows de negocio');
    console.log('');
    console.log('   ✅ AndroidKioskCollector mejorado:');
    console.log('      • Búsqueda inteligente de APK');
    console.log('      • Mejor manejo de errores móviles');
    console.log('      • Warnings en lugar de fallos para casos esperados');
    console.log('');
    console.log('   ✅ Sistema de reparación autónoma:');
    console.log('      • File watchers para monitoreo en tiempo real');
    console.log('      • Generación automática de reportes');
    console.log('      • Ciclos iterativos con IA (Ollama)');
    console.log('');

    if (passRate >= 95) {
      console.log('════════════════════════════════════════════════════════════');
      console.log('🎉🎉🎉 ¡SISTEMA FUNCIONANDO EXCELENTE! 🎉🎉🎉');
      console.log('════════════════════════════════════════════════════════════');
    } else if (passRate >= 80) {
      console.log('════════════════════════════════════════════════════════════');
      console.log('✅ SISTEMA FUNCIONANDO BIEN - Algunos ajustes menores');
      console.log('════════════════════════════════════════════════════════════');
    }

  } catch (error) {
    console.error('❌ Error obteniendo resultados:', error.message);
  }
}

showResults();
