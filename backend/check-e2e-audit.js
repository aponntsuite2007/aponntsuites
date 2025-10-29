/**
 * Monitor E2E Audit Results
 * Execution ID: ef72e631-09ba-448b-a2d1-3099e3ef6f5e
 */

const axios = require('axios');

const EXECUTION_ID = 'ef72e631-09ba-448b-a2d1-3099e3ef6f5e';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc2NmRlNDk1LWU0ZjMtNGU5MS1hNTA5LTFhNDk1YzUyZTE1YyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJFTVAtSVNJLTAwMSIsImNvbXBhbnlfaWQiOjExLCJpYXQiOjE3NjEwNDc4OTYsImV4cCI6MTc2MTEzNDI5Nn0.5zsgWZSi1KcPOdgbS6xTbIhYYiRGi4N9ZPCDXIrV6rA';

async function checkResults() {
  try {
    console.log('\n🔍 Consultando resultados de auditoría E2E...\n');

    const response = await axios.get(
      `http://localhost:9998/api/audit/executions/${EXECUTION_ID}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    const data = response.data;
    const summary = data.summary;

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  🎭 RESULTADO AUDITORÍA CON E2E COLLECTOR              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log(`Total tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    console.log(`\nMódulos: ${summary.modules_tested.join(', ')}`);
    console.log(`Duración: ${summary.total_duration}ms\n`);

    const passRate = ((summary.passed / summary.total) * 100).toFixed(1);
    console.log(`📊 TASA DE ÉXITO: ${passRate}%`);
    console.log(`🎯 OBJETIVO: 100%\n`);

    // Buscar tests E2E específicamente
    const e2eTests = data.logs.filter(log => log.test_type === 'e2e');

    if (e2eTests.length > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🎭 TESTS E2E EJECUTADOS:\n');

      e2eTests.forEach((test, i) => {
        const icon = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️';
        console.log(`${icon} ${test.test_name}`);
        console.log(`   Módulo: ${test.module_name}`);
        console.log(`   Duración: ${test.duration_ms}ms`);
        if (test.error_message) {
          console.log(`   Error: ${test.error_message}`);
        }
        console.log('');
      });
    } else {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('⚠️  NO SE EJECUTARON TESTS E2E');
      console.log('   Posibles razones:');
      console.log('   - E2ECollector no se registró correctamente');
      console.log('   - No hay módulos con endpoints CRUD');
      console.log('');
    }

    if (summary.failed > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('❌ TESTS QUE FALLAN:\n');

      data.logs
        .filter(log => log.status === 'fail')
        .slice(0, 5)
        .forEach((log, i) => {
          console.log(`${i + 1}. ${log.test_name} (${log.module_name})`);
          if (log.error_message) console.log(`   Error: ${log.error_message}`);
          console.log('');
        });
    } else {
      console.log('════════════════════════════════════════════════════════════');
      console.log('🎉🎉🎉 ¡ÉXITO TOTAL AL 100%! 🎉🎉🎉');
      console.log('════════════════════════════════════════════════════════════\n');
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ Error en respuesta:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

checkResults();
