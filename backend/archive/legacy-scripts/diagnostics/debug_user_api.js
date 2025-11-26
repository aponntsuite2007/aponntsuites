const axios = require('axios');

async function debugUserAPI() {
  try {
    console.log('🔍 DEBUG DETALLADO DE RESPUESTA USUARIOS API');
    console.log('==============================================\n');

    // Login
    console.log('📝 Login...');
    const loginResponse = await axios.post('http://localhost:9998/api/v1/auth/login', {
      identifier: 'admin',
      password: '123456',
      companyId: 11
    });

    const token = loginResponse.data.token;
    console.log('✅ Login OK\n');

    // Get users
    console.log('📋 Obteniendo usuarios...');
    const usersResponse = await axios.get('http://localhost:9998/api/v1/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const firstUser = usersResponse.data.users[0];

    console.log('\n📊 RESPUESTA COMPLETA (primer usuario):');
    console.log(JSON.stringify(firstUser, null, 2));

    console.log('\n🔍 Campos específicos del primer usuario:');
    console.log(`  - canUseMobileApp: ${firstUser.canUseMobileApp}`);
    console.log(`  - canUseKiosk: ${firstUser.canUseKiosk}`);
    console.log(`  - can_use_mobile_app: ${firstUser.can_use_mobile_app}`);
    console.log(`  - can_use_kiosk: ${firstUser.can_use_kiosk}`);

    console.log('\n📋 TODOS los campos devueltos:');
    console.log(Object.keys(firstUser).sort().join('\n'));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

debugUserAPI();
