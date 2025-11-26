const axios = require('axios');

(async () => {
  console.log('\n🧪 TEST: API con sucursal asignada\n');

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

  console.log('USER DATA FROM API:');
  console.log('   defaultBranchId:', resp.data.defaultBranchId);
  console.log('   branchName:', resp.data.branchName);
  console.log('   departmentId:', resp.data.departmentId);
  console.log('   departmentName:', resp.data.departmentName);

  console.log('\n📝 Campos completos del usuario:');
  console.log(JSON.stringify(resp.data, null, 2));
})();
