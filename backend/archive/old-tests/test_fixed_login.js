const axios = require('axios');

async function testFixedLogin() {
  console.log('🎯 TESTING FIXED LOGIN (email lookup)...\n');

  // Esperamos un momento que el servidor 8002 se inicie
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const response = await axios.post('http://localhost:8002/api/v1/auth/login', {
      identifier: 'admin@isi.com',
      password: '123',
      companyId: 11
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && response.data.token) {
      console.log('🎉 ¡LOGIN EXITOSO CON EMAIL!');
      console.log(`✅ Token: ${response.data.token.substring(0, 50)}...`);
      console.log(`👤 Usuario: ${response.data.user.firstName} ${response.data.user.lastName}`);
      console.log(`📧 Email: ${response.data.user.email}`);
      console.log(`🏢 Company: ${response.data.user.companyName}`);

      // Probar el token con módulos
      const modulesResponse = await axios.get(`http://localhost:8002/api/v1/company-modules/my-modules?company_id=11`, {
        headers: {
          'Authorization': `Bearer ${response.data.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`🎯 JWT funciona: ${modulesResponse.data.totalModules} módulos, ${modulesResponse.data.contractedModules} contratados`);
      console.log('\n🎊 PROBLEMA SOLUCIONADO COMPLETAMENTE!');
    }

  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.error || error.message}`);
    console.log('❌ El problema persiste');
  }
}

testFixedLogin();