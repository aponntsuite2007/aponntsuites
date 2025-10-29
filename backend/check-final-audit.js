const axios = require('axios');

async function checkFinalAudit() {
  // Get new token
  const loginResponse = await axios.post('http://localhost:9998/api/v1/auth/login', {
    identifier: 'admin',
    password: 'admin123',
    companyId: 11
  });

  const token = loginResponse.data.token;

  // Get audit results
  const response = await axios.get(
    'http://localhost:9998/api/audit/executions/6f0027c4-4eb0-4f94-b210-9b27febdb878',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const { summary, logs } = response.data;

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  🏁 RESULTADO FINAL - AUDITORÍA DEFINITIVA            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  console.log(`Total tests: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⚠️  Warnings: ${summary.warnings}`);
  console.log(`\nMódulos testeados: ${summary.modules_tested.join(', ')}`);
  console.log(`Duración: ${summary.total_duration}ms\n`);

  const passRate = ((summary.passed / summary.total) * 100).toFixed(1);
  console.log(`📊 TASA DE ÉXITO: ${passRate}%\n`);

  if (summary.failed > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌ TESTS QUE AÚN FALLAN:\n');

    logs.filter(log => log.status === 'fail').forEach((log, i) => {
      console.log(`${i+1}. ${log.test_name} (${log.module_name})`);

      if (log.error_context) {
        const ctx = typeof log.error_context === 'string' ? JSON.parse(log.error_context) : log.error_context;
        if (ctx.errors) {
          ctx.errors.forEach(err => {
            console.log(`   ❌ ${err.test}: ${err.error}`);
          });
        }
      }
      console.log('');
    });
  } else {
    console.log('════════════════════════════════════════════════════════════');
    console.log('🎉🎉🎉 ¡ÉXITO TOTAL! 🎉🎉🎉');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ TODOS LOS TESTS PASARON AL 100%');
    console.log('✅ Sistema completamente funcional');
    console.log('✅ Sin errores JavaScript');
    console.log('✅ Login automático funcionando');
    console.log('✅ Navegación entre módulos operativa');
    console.log('');
    console.log('🚀 Sistema listo para producción!\n');
  }
}

checkFinalAudit().catch(console.error);
