// TEST SIMPLE - Verificar que TAB 1 CRUD funcione

require('dotenv').config();
const axios = require('axios');

const API = 'http://localhost:9998/api/v1';

async function testSimpleTab1() {
  try {
    console.log('🧪 TEST SIMPLE - TAB 1 CRUD\n');

    // 1. LOGIN como admin ISI
    console.log('1️⃣ Login...');
    const loginResponse = await axios.post(`${API}/auth/login`, {
      identifier: 'admin',
      password: 'admin123',
      companyId: 11  // ISI company_id
    });
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;  // FIX: Login returns 'id', not 'user_id'
    console.log(`   ✅ Login OK - userId: ${userId}\n`);

    // 2. GET usuario INICIAL
    console.log('2️⃣ GET usuario (estado INICIAL)...');
    const getResponse1 = await axios.get(`${API}/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userBefore = getResponse1.data.user || getResponse1.data;  // FIX: Handle wrapper
    console.log(`   👤 Usuario: ${userBefore.firstName} ${userBefore.lastName}`);
    console.log(`   📊 Role: ${userBefore.role}`);
    console.log(`   🔄 isActive: ${userBefore.isActive}`);
    console.log(`   📍 allowOutsideRadius: ${userBefore.allowOutsideRadius}`);
    console.log(`   🗺️  gpsEnabled: ${userBefore.gpsEnabled}\n`);

    // 3. UPDATE - Cambiar role
    console.log('3️⃣ PUT - Cambiar role a "supervisor"...');
    const putResponse1 = await axios.put(`${API}/users/${userId}`, {
      role: 'supervisor'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   ✅ PUT OK - ${putResponse1.data.message}\n`);

    // 4. GET usuario DESPUÉS del cambio de role
    console.log('4️⃣ GET usuario (después de cambiar role)...');
    const getResponse2 = await axios.get(`${API}/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userAfterRole = getResponse2.data.user || getResponse2.data;  // FIX: Handle wrapper
    console.log(`   📊 Role NUEVO: ${userAfterRole.role}`);
    console.log(`   ${userAfterRole.role === 'supervisor' ? '✅ PERSISTIÓ' : '❌ NO CAMBIÓ'}\n`);

    // 5. UPDATE - Cambiar isActive
    console.log('5️⃣ PUT - Cambiar isActive a false...');
    const putResponse2 = await axios.put(`${API}/users/${userId}`, {
      isActive: false
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   ✅ PUT OK - ${putResponse2.data.message}\n`);

    // 6. GET usuario DESPUÉS del cambio de isActive
    console.log('6️⃣ GET usuario (después de cambiar isActive)...');
    const getResponse3 = await axios.get(`${API}/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userAfterActive = getResponse3.data.user || getResponse3.data;  // FIX: Handle wrapper
    console.log(`   🔄 isActive NUEVO: ${userAfterActive.isActive}`);
    console.log(`   ${userAfterActive.isActive === false ? '✅ PERSISTIÓ' : '❌ NO CAMBIÓ'}\n`);

    // 7. UPDATE - Cambiar allowOutsideRadius (GPS)
    console.log('7️⃣ PUT - Cambiar allowOutsideRadius a true...');
    const putResponse3 = await axios.put(`${API}/users/${userId}`, {
      allowOutsideRadius: true
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   ✅ PUT OK - ${putResponse3.data.message}\n`);

    // 8. GET usuario DESPUÉS del cambio de GPS
    console.log('8️⃣ GET usuario (después de cambiar GPS)...');
    const getResponse4 = await axios.get(`${API}/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userAfterGPS = getResponse4.data.user || getResponse4.data;  // FIX: Handle wrapper
    console.log(`   📍 allowOutsideRadius NUEVO: ${userAfterGPS.allowOutsideRadius}`);
    console.log(`   🗺️  gpsEnabled (en BD): ${userAfterGPS.gpsEnabled}`);
    console.log(`   ${userAfterGPS.allowOutsideRadius === true ? '✅ PERSISTIÓ' : '❌ NO CAMBIÓ'}\n`);

    // 9. RESULTADOS FINALES
    console.log('═══════════════════════════════════════════════');
    console.log('📋 RESULTADOS FINALES:');
    console.log('═══════════════════════════════════════════════');
    console.log(`${userAfterRole.role === 'supervisor' ? '✅' : '❌'} Cambio de ROL`);
    console.log(`${userAfterActive.isActive === false ? '✅' : '❌'} Cambio de ESTADO (isActive)`);
    console.log(`${userAfterGPS.allowOutsideRadius === true ? '✅' : '❌'} Cambio de GPS (allowOutsideRadius)`);
    console.log('═══════════════════════════════════════════════\n');

    // 10. RESTAURAR valores originales
    console.log('🔄 Restaurando valores originales...');
    await axios.put(`${API}/users/${userId}`, {
      role: 'admin',
      isActive: true,
      allowOutsideRadius: false
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Valores restaurados\n');

    console.log('🎉 TEST COMPLETADO');

  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSimpleTab1();
