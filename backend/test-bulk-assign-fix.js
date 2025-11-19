const axios = require('axios');

(async () => {
  console.log('\n🧪 TEST: Verificar persistencia de Departamento\n');

  const loginResp = await axios.post('http://localhost:9999/api/v1/auth/login', {
    identifier: 'admin',
    password: 'admin123',
    companyId: 11
  });
  const token = loginResp.data.token;
  console.log('✅ Login OK\n');

  const userId = '0393c9cd-5ae4-410d-a9d9-9446b7f15bd2';

  console.log('📋 ESTADO ANTES:');
  const beforeResp = await axios.get(`http://localhost:9999/api/v1/users/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('   departmentId:', beforeResp.data.departmentId);

  console.log('\n📝 UPDATE con departmentId=1 (NÚMERO)...');
  await axios.put(`http://localhost:9999/api/v1/users/${userId}`, {
    departmentId: 1
  }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  await new Promise(resolve => setTimeout(resolve, 500));
  const afterResp = await axios.get(`http://localhost:9999/api/v1/users/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('\n📋 ESTADO DESPUÉS:');
  console.log('   departmentId:', afterResp.data.departmentId);

  if (afterResp.data.departmentId === 1) {
    console.log('\n✅ SE GUARDÓ CORRECTAMENTE');
  } else {
    console.log('\n❌ NO SE GUARDÓ');
  }
})();
