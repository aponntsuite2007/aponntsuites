const axios = require('axios');

async function checkAudit() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc2NmRlNDk1LWU0ZjMtNGU5MS1hNTA5LTFhNDk1YzUyZTE1YyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJFTVAtSVNJLTAwMSIsImNvbXBhbnlfaWQiOjExLCJpYXQiOjE3NjA5NzkyNTgsImV4cCI6MTc2MTA2NTY1OH0.3GMNsgGgbQhTLpVJg-1t88eeo656XmbNklOoDDdzQcA';

  const response = await axios.get(
    'http://localhost:9998/api/audit/executions/4d16b447-6c99-4a03-947d-071ad2af8429',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const { summary, logs } = response.data;

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  📊 RESULTADO DE LA AUDITORÍA CORREGIDA                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`Total tests: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⚠️  Warnings: ${summary.warnings}`);
  console.log(`\nMódulos testeados: ${summary.modules_tested.join(', ')}`);
  console.log(`Duración total: ${summary.total_duration}ms\n`);

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
    console.log('🎉 ¡ÉXITO! TODOS LOS TESTS PASARON AL 100%\n');
  }
}

checkAudit().catch(console.error);
