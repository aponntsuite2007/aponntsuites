/**
 * DEBUG - ¿Por qué fallan los endpoints después del login?
 */
const axios = require('axios');
const BASE_URL = 'http://localhost:9998/api';

async function debug() {
  console.log('=== DEBUG: Verificando autenticación ===\n');

  // 1. Login
  console.log('1. Intentando login...');
  try {
    const loginRes = await axios.post(`${BASE_URL}/v1/auth/login`, {
      identifier: 'rrhh2@isi.test',
      password: 'admin123',
      companySlug: 'isi'
    });

    console.log('   Login OK');
    console.log('   Status:', loginRes.status);
    console.log('   Response keys:', Object.keys(loginRes.data));

    const token = loginRes.data.token || loginRes.data.accessToken;
    const user = loginRes.data.user;

    console.log('\n   Token (primeros 50 chars):', token ? token.substring(0, 50) + '...' : 'NULL');
    console.log('   User:', user ? `${user.firstName} ${user.lastName} (${user.email})` : 'NULL');
    console.log('   User ID:', user?.user_id || user?.id);
    console.log('   Company ID:', user?.company_id);
    console.log('   Role:', user?.role);

    if (!token) {
      console.log('\n❌ ERROR: No se recibió token!');
      console.log('   Respuesta completa:', JSON.stringify(loginRes.data, null, 2));
      return;
    }

    // 2. Probar endpoint con token
    console.log('\n2. Probando GET /v1/auth/me con token...');
    try {
      const meRes = await axios.get(`${BASE_URL}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   ✅ /me OK - Status:', meRes.status);
      console.log('   User:', meRes.data.user?.email || meRes.data.email);
    } catch (e) {
      console.log('   ❌ /me FAILED');
      console.log('   Status:', e.response?.status);
      console.log('   Error:', e.response?.data?.error || e.response?.data?.message || e.message);
      console.log('   Full response:', JSON.stringify(e.response?.data, null, 2));
    }

    // 3. Probar otro endpoint
    console.log('\n3. Probando GET /v1/departments...');
    try {
      const deptRes = await axios.get(`${BASE_URL}/v1/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   ✅ /departments OK - Status:', deptRes.status);
      console.log('   Count:', deptRes.data.departments?.length || deptRes.data.length);
    } catch (e) {
      console.log('   ❌ /departments FAILED');
      console.log('   Status:', e.response?.status);
      console.log('   Error:', e.response?.data?.error || e.response?.data?.message || e.message);
    }

    // 4. Probar shifts
    console.log('\n4. Probando GET /v1/shifts...');
    try {
      const shiftRes = await axios.get(`${BASE_URL}/v1/shifts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   ✅ /shifts OK - Status:', shiftRes.status);
    } catch (e) {
      console.log('   ❌ /shifts FAILED');
      console.log('   Status:', e.response?.status);
      console.log('   Error:', e.response?.data?.error || e.response?.data?.message || e.message);
    }

    // 5. Probar attendance
    console.log('\n5. Probando GET /v1/attendance...');
    try {
      const attRes = await axios.get(`${BASE_URL}/v1/attendance?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   ✅ /attendance OK - Status:', attRes.status);
    } catch (e) {
      console.log('   ❌ /attendance FAILED');
      console.log('   Status:', e.response?.status);
      console.log('   Error:', e.response?.data?.error || e.response?.data?.message || e.message);
    }

    // 6. Verificar header format
    console.log('\n6. Verificando formato de Authorization header...');
    console.log('   Header enviado: Bearer ' + token.substring(0, 30) + '...');

    // 7. Probar sin "Bearer" por si acaso
    console.log('\n7. Probando sin prefijo Bearer (solo token)...');
    try {
      const testRes = await axios.get(`${BASE_URL}/v1/auth/me`, {
        headers: { Authorization: token }
      });
      console.log('   ✅ Sin Bearer funciona! Status:', testRes.status);
    } catch (e) {
      console.log('   ❌ Sin Bearer tampoco funciona');
      console.log('   Status:', e.response?.status);
    }

  } catch (e) {
    console.log('❌ Login FAILED');
    console.log('   Status:', e.response?.status);
    console.log('   Error:', e.response?.data?.error || e.response?.data?.message || e.message);
  }
}

debug().catch(console.error);
