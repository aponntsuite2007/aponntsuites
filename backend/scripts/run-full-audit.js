const axios = require('axios');

const API_URL = 'http://localhost:9998';

async function runFullAudit() {
  try {
    console.log('🔐 [1/3] Obteniendo token JWT...\n');

    // 1. Login (ISI company_id = 11)
    const loginResponse = await axios.post(`${API_URL}/api/v1/auth/login`, {
      identifier: 'admin',
      password: 'admin123',
      companyId: 11
    });

    const token = loginResponse.data.token;
    console.log('✅ Token obtenido\n');

    console.log('🔍 [2/3] Ejecutando diagnóstico completo del sistema...\n');
    console.log('⏳ Esto puede tomar 30-60 segundos...\n');

    // 2. Run full audit
    const auditResponse = await axios.post(
      `${API_URL}/api/audit/run`,
      { fullAudit: true },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Role': 'admin'
        },
        timeout: 120000 // 2 minutos de timeout
      }
    );

    console.log('\n✅ [3/3] Diagnóstico completado!\n');
    console.log('═══════════════════════════════════════════════════════\n');

    const result = auditResponse.data;

    console.log('📊 RESUMEN DE RESULTADOS:\n');
    console.log(`   Execution ID: ${result.data.execution_id}`);
    console.log(`   Tests ejecutados: ${result.data.tests_run}`);
    console.log(`   ✅ Tests aprobados: ${result.data.tests_passed}`);
    console.log(`   ❌ Tests fallidos: ${result.data.tests_failed}`);
    console.log(`   ⚠️  Advertencias: ${result.data.tests_warning}`);
    console.log(`   Duración: ${result.data.duration_ms}ms\n`);

    if (result.data.errors && result.data.errors.length > 0) {
      console.log('🔴 ERRORES DETECTADOS:\n');
      result.data.errors.forEach((error, i) => {
        console.log(`${i+1}. ${error.type}: ${error.message}`);
        if (error.file) console.log(`   Archivo: ${error.file}:${error.line}`);
        console.log('');
      });
    }

    if (result.data.warnings && result.data.warnings.length > 0) {
      console.log('⚠️  ADVERTENCIAS:\n');
      result.data.warnings.forEach((warning, i) => {
        console.log(`${i+1}. ${warning.message}`);
        console.log('');
      });
    }

    if (result.data.tests_failed === 0 && result.data.tests_warning === 0) {
      console.log('🎉 ¡SISTEMA ÓPTIMO! Todos los tests aprobados.\n');
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📍 Ver detalles completos en: http://localhost:9998/panel-empresa.html');
    console.log('   Módulos del Sistema > Auditoría y Auto-Diagnóstico\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

// Ejecutar
console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║   AUDITORÍA COMPLETA DEL SISTEMA                       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

runFullAudit();
