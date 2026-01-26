const axios = require('axios');

async function test() {
  try {
    // Login
    const login = await axios.post('http://localhost:9998/api/v1/auth/login', {
      identifier: 'admin@isi.com',
      password: 'admin123',
      companySlug: 'isi'
    });
    const token = login.data.token;
    const h = { Authorization: 'Bearer ' + token };

    console.log('Token OK, testing endpoints...\n');

    // Test roles
    console.log('1. Testing GET /v1/users/roles:');
    try {
      const r = await axios.get('http://localhost:9998/api/v1/users/roles', { headers: h });
      console.log('   SUCCESS:', r.status, JSON.stringify(r.data).slice(0, 200));
    } catch (e) {
      console.log('   FAILED:', e.response?.status);
      console.log('   Error:', e.response?.data);
      console.log('   Message:', e.message);
    }

    // Test companies
    console.log('\n2. Testing GET /v1/companies/isi:');
    try {
      const r = await axios.get('http://localhost:9998/api/v1/companies/isi', { headers: h });
      console.log('   SUCCESS:', r.status, JSON.stringify(r.data).slice(0, 200));
    } catch (e) {
      console.log('   FAILED:', e.response?.status);
      console.log('   Error:', e.response?.data);
      console.log('   Message:', e.message);
    }

    // Test alternative - organizational roles
    console.log('\n3. Testing GET /v1/organizational/roles (alternative):');
    try {
      const r = await axios.get('http://localhost:9998/api/v1/organizational/roles', { headers: h });
      console.log('   SUCCESS:', r.status, JSON.stringify(r.data).slice(0, 200));
    } catch (e) {
      console.log('   FAILED:', e.response?.status);
      console.log('   Error:', e.response?.data);
    }

  } catch (e) {
    console.error('Login failed:', e.response?.data || e.message);
  }
}

test();
