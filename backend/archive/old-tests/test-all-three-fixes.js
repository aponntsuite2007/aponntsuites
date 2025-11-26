const axios = require('axios');

(async () => {
  console.log('\n🧪 TEST COMPLETO: Verificar Departamento + Sucursal + Turnos\n');

  const loginResp = await axios.post('http://localhost:9999/api/v1/auth/login', {
    identifier: 'admin',
    password: 'admin123',
    companyId: 11
  });
  const token = loginResp.data.token;
  console.log('✅ Login OK\n');

  const userId = '0393c9cd-5ae4-410d-a9d9-9446b7f15bd2';

  console.log('📋 RESPUESTA COMPLETA DEL API:\n');
  const resp = await axios.get(`http://localhost:9999/api/v1/users/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('1️⃣ DEPARTAMENTO:');
  console.log('   departmentId:', resp.data.departmentId);
  console.log('   departmentName:', resp.data.departmentName);
  if (resp.data.departmentName) {
    console.log('   ✅ FUNCIONANDO - Se retorna el nombre del departamento\n');
  } else {
    console.log('   ❌ ERROR - No se retorna departmentName\n');
  }

  console.log('2️⃣ SUCURSAL (BRANCH):');
  console.log('   defaultBranchId:', resp.data.defaultBranchId);
  console.log('   branchName:', resp.data.branchName);
  if (resp.data.branchName) {
    console.log('   ✅ FUNCIONANDO - Se retorna el nombre de la sucursal\n');
  } else if (resp.data.defaultBranchId) {
    console.log('   ⚠️ ADVERTENCIA - Tiene branchId pero NO se retorna branchName\n');
  } else {
    console.log('   ℹ️ INFO - Usuario no tiene sucursal asignada\n');
  }

  console.log('3️⃣ TURNOS (SHIFTS):');
  console.log('   shiftIds:', resp.data.shiftIds);
  console.log('   shiftNames:', resp.data.shiftNames);
  if (resp.data.shiftNames && resp.data.shiftNames.length > 0) {
    console.log('   ✅ FUNCIONANDO - Se retornan los nombres de los turnos');
    console.log('   📋 Turnos:', resp.data.shiftNames.join(', '));
  } else {
    console.log('   ❌ ERROR - No se retornan shiftNames');
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  const allWorking = resp.data.departmentName && resp.data.shiftNames && resp.data.shiftNames.length > 0;

  if (allWorking) {
    console.log('✅✅✅ TODOS LOS FIXES FUNCIONAN CORRECTAMENTE ✅✅✅');
  } else {
    console.log('⚠️ Algunos campos todavía no están funcionando correctamente');
  }
  console.log('═══════════════════════════════════════════════════════════\n');
})();
