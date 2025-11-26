const axios = require('axios');

(async () => {
  console.log('\n🧪 TEST: Verificar que el API retorna departmentName\n');

  const loginResp = await axios.post('http://localhost:9999/api/v1/auth/login', {
    identifier: 'admin',
    password: 'admin123',
    companyId: 11
  });
  const token = loginResp.data.token;
  console.log('✅ Login OK\n');

  const userId = '0393c9cd-5ae4-410d-a9d9-9446b7f15bd2';

  console.log('📋 RESPUESTA COMPLETA DEL API:');
  const resp = await axios.get(`http://localhost:9999/api/v1/users/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('   departmentId:', resp.data.departmentId);
  console.log('   departmentName:', resp.data.departmentName);
  console.log('   shiftIds:', resp.data.shiftIds);
  console.log('   shiftNames:', resp.data.shiftNames);

  if (resp.data.departmentName) {
    console.log('\n✅ EL FIX FUNCIONÓ - departmentName se está retornando');
    console.log(`   Departamento: ${resp.data.departmentName}`);
  } else {
    console.log('\n❌ departmentName NO se está retornando');
  }
})();
