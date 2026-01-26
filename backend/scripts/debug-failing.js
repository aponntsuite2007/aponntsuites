const axios = require('axios');
async function test() {
  // Login
  const login = await axios.post('http://localhost:9998/api/v1/auth/login', {
    identifier: 'admin@isi.com', password: 'admin123', companySlug: 'isi'
  });
  const token = login.data.token;
  const h = { Authorization: 'Bearer ' + token };

  // Test 1: checkin
  console.log('1. POST /attendance/checkin:');
  try {
    const r = await axios.post('http://localhost:9998/api/v1/attendance/checkin', { method: 'test' }, { headers: h });
    console.log('   OK:', r.status);
  } catch (e) {
    console.log('   Error:', e.response?.status, e.response?.data?.error || e.response?.data?.message);
    console.log('   Full:', JSON.stringify(e.response?.data, null, 2));
  }

  // Test 2: roles
  console.log('\n2. GET /users/roles:');
  try {
    const r = await axios.get('http://localhost:9998/api/v1/users/roles', { headers: h });
    console.log('   OK:', r.status);
  } catch (e) {
    console.log('   Error:', e.response?.status, e.response?.data?.error || e.response?.data?.message);
  }

  // Test 3: companies/:slug
  console.log('\n3. GET /companies/isi:');
  try {
    const r = await axios.get('http://localhost:9998/api/v1/companies/isi', { headers: h });
    console.log('   OK:', r.status);
  } catch (e) {
    console.log('   Error:', e.response?.status, e.response?.data?.error || e.response?.data?.message);
    console.log('   Full:', JSON.stringify(e.response?.data, null, 2));
  }
}
test().catch(e => console.error(e.response?.data || e.message));
