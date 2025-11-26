const axios = require('axios');

(async () => {
  console.log('\n🧪 TEST: Guardar sucursal como lo hace el frontend\n');

  // 1. Login
  const loginResp = await axios.post('http://localhost:9999/api/v1/auth/login', {
    identifier: 'admin',
    password: 'admin123',
    companyId: 11
  });
  const token = loginResp.data.token;
  console.log('✅ Login OK\n');

  const userId = '0393c9cd-5ae4-410d-a9d9-9446b7f15bd2';
  const branchId = 'cd0228cb-a01a-4ea6-aa23-e5c05b05554b';

  console.log('📤 ENVIANDO PUT para guardar sucursal...');
  console.log('   userId:', userId);
  console.log('   branchId:', branchId);

  try {
    // 2. Guardar sucursal (exactamente como el frontend)
    const saveResp = await axios.put(`http://localhost:9999/api/v1/users/${userId}`, {
      defaultBranchId: branchId,
      authorizedBranches: []
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ PUT exitoso. Response:', saveResp.data);

    // 3. Verificar inmediatamente con GET
    console.log('\n🔍 Verificando con GET...');
    const getResp = await axios.get(`http://localhost:9999/api/v1/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('\n📋 RESULTADO:');
    console.log('   defaultBranchId:', getResp.data.defaultBranchId);
    console.log('   branchName:', getResp.data.branchName);

    if (getResp.data.defaultBranchId === branchId) {
      console.log('\n✅✅✅ SUCCESS! La sucursal SE GUARDÓ correctamente');
    } else {
      console.log('\n❌❌❌ ERROR! La sucursal NO se guardó');
      console.log('   Esperado:', branchId);
      console.log('   Obtenido:', getResp.data.defaultBranchId);
    }

  } catch (error) {
    console.error('\n❌ ERROR en PUT:', error.response?.data || error.message);
  }
})();
