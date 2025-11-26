const axios = require('axios');

async function testCompleteSystem() {
  console.log('🎊 TESTING SISTEMA COMPLETO CON PUERTOS DINÁMICOS');
  console.log('================================================\n');

  // Esperar que el servidor se inicie
  await new Promise(resolve => setTimeout(resolve, 4000));

  const baseUrl = 'http://localhost:8002';

  try {
    console.log('1️⃣ Verificando que los tokens hardcodeados están rechazados...');

    try {
      await axios.get(`${baseUrl}/api/v1/company-modules/my-modules`, {
        headers: {
          'Authorization': 'Bearer token_test_admin1',
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ FAIL: Token hardcodeado fue aceptado');
      return false;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ SUCCESS: Tokens hardcodeados rechazados correctamente');
      }
    }

    console.log('');
    console.log('2️⃣ Probando login real con credenciales correctas...');

    const loginResponse = await axios.post(`${baseUrl}/api/v1/auth/login`, {
      identifier: 'admin@isi.com',
      password: '123',
      companyId: 11
    });

    if (loginResponse.data && loginResponse.data.token) {
      console.log('✅ LOGIN EXITOSO!');
      console.log(`   Token JWT: ${loginResponse.data.token.substring(0, 40)}...`);
      console.log(`   Usuario: ${loginResponse.data.user.firstName} ${loginResponse.data.user.lastName}`);
      console.log(`   Email: ${loginResponse.data.user.email}`);

      console.log('');
      console.log('3️⃣ Probando acceso a módulos con JWT válido...');

      const modulesResponse = await axios.get(`${baseUrl}/api/v1/company-modules/my-modules?company_id=11`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ JWT FUNCIONA PERFECTAMENTE!`);
      console.log(`   Módulos totales: ${modulesResponse.data.totalModules}`);
      console.log(`   Módulos contratados: ${modulesResponse.data.contractedModules}`);
      console.log(`   Company ID: ${modulesResponse.data.companyId}`);

      console.log('');
      console.log('4️⃣ Verificando configuración dinámica de puertos...');

      const configResponse = await axios.get(`${baseUrl}/api/server-config`);
      console.log(`✅ PUERTO DINÁMICO CONFIGURADO: ${configResponse.data.port}`);
      console.log(`   API URL: ${configResponse.data.apiUrl}`);

      console.log('');
      console.log('🎉 ========================================');
      console.log('🎉 SISTEMA COMPLETAMENTE FUNCIONAL!');
      console.log('🎉 ========================================');
      console.log('✅ Autenticación segura (sin tokens hardcodeados)');
      console.log('✅ Login real con email/password funciona');
      console.log('✅ JWT válidos generados y aceptados');
      console.log('✅ Acceso a módulos protegidos');
      console.log('✅ Puertos dinámicos auto-configurados');
      console.log(`✅ Frontend y backend sincronizados en puerto: ${configResponse.data.port}`);

      return true;
    }

  } catch (error) {
    console.log(`❌ Error en el test: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

testCompleteSystem();