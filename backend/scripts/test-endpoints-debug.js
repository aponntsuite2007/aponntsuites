/**
 * DEBUG: Ver qué campos devuelve cada endpoint
 */
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
  console.log('✅ Login OK\n');
}

function auth() {
  return { headers: { Authorization: `Bearer ${TOKEN}` } };
}

async function checkEndpoint(name, path) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${name}: ${path}`);
  console.log('='.repeat(60));

  try {
    const res = await axios.get(`${BASE}${path}`, auth());
    let data = res.data;

    // Extraer datos del wrapper si existe
    if (data.data) data = data.data;
    if (data.items) data = data.items;
    if (data.results) data = data.results;
    if (data.records) data = data.records;

    if (Array.isArray(data)) {
      console.log(`📊 Array con ${data.length} elementos`);
      if (data.length > 0) {
        const sample = data[0];
        console.log('📋 Campos del primer elemento:');
        Object.keys(sample).forEach(k => {
          const v = sample[k];
          const type = v === null ? 'null' : typeof v;
          console.log(`   - ${k}: ${type}`);
        });
      }
    } else if (typeof data === 'object' && data !== null) {
      console.log('📋 Campos del objeto:');
      Object.keys(data).forEach(k => {
        const v = data[k];
        const type = v === null ? 'null' : typeof v;
        console.log(`   - ${k}: ${type}`);
      });
    } else {
      console.log('Respuesta:', data);
    }
  } catch (err) {
    const status = err.response?.status || 0;
    console.log(`❌ Error ${status}: ${err.message}`);
  }
}

async function main() {
  await login();

  // Endpoints a verificar
  const endpoints = [
    ['Departments', '/api/v1/departments'],
    ['Users', '/api/v1/users'],
    ['Shifts', '/api/v1/shifts'],
    ['Kiosks', '/api/kiosks'],
    ['Attendance', '/api/v1/attendance'],
    ['Vacations Scales', '/api/v1/vacations/scales'],
    ['Vacations', '/api/v1/vacations'],
    ['Sanctions', '/api/v1/sanctions'],
    ['Sanction Types', '/api/v1/sanctions/types'],
    ['Visitors', '/api/v1/visitors'],
    ['Notifications', '/api/v1/notifications'],
    ['Hour Bank', '/api/v1/hour-bank'],
    ['Hour Bank Balances', '/api/hour-bank/balances'],
    ['Payroll Liquidations', '/api/payroll/liquidations'],
    ['Job Postings', '/api/job-postings'],
    ['Training Courses', '/api/v1/training/courses'],
    ['Medical Exams', '/api/medical-advanced/exams'],
    ['Biometric Templates', '/api/v1/biometric/templates'],
    ['Biometric Consents', '/api/v1/biometric/consents'],
    ['Documents', '/api/v1/documents'],
    ['Contracts', '/api/contracts'],
    ['Legal Issues', '/api/v1/legal/issues'],
    ['Benefits', '/api/v1/benefits'],
    ['Messages', '/api/v1/messages'],
    ['Support Tickets', '/api/v1/support/tickets'],
    ['HSE Incidents', '/api/v1/hse/incidents'],
    ['Positions', '/api/v1/organizational/positions'],
    ['Branches', '/api/v1/branches'],
  ];

  for (const [name, path] of endpoints) {
    await checkEndpoint(name, path);
  }
}

main().catch(console.error);
