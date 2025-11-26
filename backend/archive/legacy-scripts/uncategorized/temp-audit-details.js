const axios = require('axios');

async function getAuditDetails() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc2NmRlNDk1LWU0ZjMtNGU5MS1hNTA5LTFhNDk1YzUyZTE1YyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJFTVAtSVNJLTAwMSIsImNvbXBhbnlfaWQiOjExLCJpYXQiOjE3NjA5Nzg4NDksImV4cCI6MTc2MTA2NTI0OX0.HGLMi4aMSG59ncvtW324eTu9-4exFLYuWwSMdV8a3YE';

  const response = await axios.get(
    'http://localhost:9998/api/audit/executions/6bf02721-9693-4d51-b34b-b80136361c10',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const { logs } = response.data;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔍 DETALLE DE LA AUDITORÍA');
  console.log('═══════════════════════════════════════════════════════════\n');

  logs.forEach((log, i) => {
    console.log(`${i+1}. [${log.status.toUpperCase()}] ${log.test_name}`);
    console.log(`   Módulo: ${log.module_name}`);
    console.log(`   Duración: ${log.duration_ms}ms`);

    if (log.status === 'fail' && log.error_context) {
      const ctx = typeof log.error_context === 'string' ? JSON.parse(log.error_context) : log.error_context;
      if (ctx.errors) {
        console.log('   ❌ Problemas encontrados:');
        ctx.errors.forEach(err => {
          console.log(`      • ${err.test}: ${err.error}`);
          if (err.suggestion) {
            console.log(`        💡 ${err.suggestion}`);
          }
        });
      }
    }

    if (log.suggestions && log.suggestions.length > 0) {
      console.log('   🔧 Sugerencias de reparación:');
      log.suggestions.forEach(sug => {
        console.log(`      • ${sug.solution}`);
      });
    }

    console.log('');
  });
}

getAuditDetails().catch(console.error);
