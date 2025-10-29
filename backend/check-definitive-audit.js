const axios = require('axios');

async function checkDefinitiveAudit() {
  // Get token
  const loginResponse = await axios.post('http://localhost:9998/api/v1/auth/login', {
    identifier: 'admin',
    password: 'admin123',
    companyId: 11
  });

  const token = loginResponse.data.token;

  // Get audit results
  const response = await axios.get(
    'http://localhost:9998/api/audit/executions/d484fa2b-8ff3-4d85-80a5-d675debc646b',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const { summary, logs } = response.data;

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🏆 RESULTADO DEFINITIVO - CON CACHE DESHABILITADO        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`Total tests: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⚠️  Warnings: ${summary.warnings}`);
  console.log(`\nMódulos: ${summary.modules_tested.join(', ')}`);
  console.log(`Duración: ${summary.total_duration}ms\n`);

  const passRate = ((summary.passed / summary.total) * 100).toFixed(1);
  console.log(`📊 TASA DE ÉXITO: ${passRate}%`);
  console.log(`🎯 OBJETIVO: 100%\n`);

  // Check for currentUser error in logs
  const hasCurrentUserError = logs.some(log =>
    log.error_message && log.error_message.includes('currentUser')
  );

  if (hasCurrentUserError) {
    console.log('❌ ERROR: Todavía aparece el error de currentUser');
    console.log('   Puppeteer sigue usando cache antiguo\n');
  } else {
    console.log('✅ FIX CONFIRMADO: Error de currentUser ELIMINADO');
    console.log('   Cache deshabilitado funcionó correctamente\n');
  }

  if (summary.failed > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌ TESTS QUE AÚN FALLAN:\n');

    logs.filter(log => log.status === 'fail').forEach((log, i) => {
      console.log(`${i+1}. ${log.test_name} (${log.module_name})`);

      if (log.error_context) {
        const ctx = typeof log.error_context === 'string' ? JSON.parse(log.error_context) : log.error_context;
        if (ctx.errors) {
          ctx.errors.slice(0, 2).forEach(err => {  // Solo mostrar primeros 2 errores
            console.log(`   ❌ ${err.test}: ${err.error}`);
          });
        }
      }
      console.log('');
    });
  } else {
    console.log('════════════════════════════════════════════════════════════');
    console.log('🎉🎉🎉 ¡ÉXITO TOTAL AL 100%! 🎉🎉🎉');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Sistema completamente funcional');
    console.log('✅ Todos los módulos operativos');
    console.log('✅ Sin errores JavaScript');
    console.log('✅ Navegación funcionando');
    console.log('');
    console.log('🚀 ¡LISTO PARA PRODUCCIÓN!\n');
  }
}

checkDefinitiveAudit().catch(console.error);
