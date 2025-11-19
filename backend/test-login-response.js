const axios = require('axios');

const BASE_URL = 'http://localhost:9998';

async function testLogin() {
  try {
    console.log('🔐 Testing login endpoint...\n');

    const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      identifier: 'admin',
      password: 'admin123',
      companyId: 11 // ISI
    });

    console.log('✅ Login successful!\n');
    console.log('📦 Full response data:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n📋 Checking user fields:');
    console.log('   response.data.user.id:', response.data.user.id);
    console.log('   response.data.user.user_id:', response.data.user.user_id);
    console.log('   response.data.user.employeeId:', response.data.user.employeeId);

  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

testLogin();
