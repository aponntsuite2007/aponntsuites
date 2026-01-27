const axios = require('axios');
const BASE = 'http://localhost:9998';
let TOKEN = null;

async function login() {
  const res = await axios.post(`${BASE}/api/v1/auth/login`, {
    identifier: 'administrador',
    password: 'admin123',
    companySlug: 'aponnt-empresa-demo'
  });
  TOKEN = res.data.token;
}

function auth() {
  return { headers: { Authorization: `Bearer ${TOKEN}` } };
}

async function show(name, path, wrapper) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${name}: ${path}`);
  console.log('='.repeat(60));

  try {
    const res = await axios.get(`${BASE}${path}`, auth());
    let data = res.data;
    if (wrapper && data[wrapper]) data = data[wrapper];
    if (Array.isArray(data) && data.length > 0) data = data[0];
    console.log('Campos:', Object.keys(data).join(', '));
    console.log('Muestra:', JSON.stringify(data, null, 2).slice(0, 800));
  } catch (e) {
    console.log('Error:', e.response?.status, e.message);
  }
}

async function main() {
  await login();
  await show('Departments', '/api/v1/departments', 'departments');
  await show('Attendance', '/api/v1/attendance', null);
  await show('Biometric Consents', '/api/v1/biometric/consents', 'consents');
  await show('Positions', '/api/v1/organizational/positions?company_id=1', 'positions');
  await show('Legal Issues', '/api/v1/legal/issues', null);
}

main();
