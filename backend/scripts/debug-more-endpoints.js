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

async function check(name, path) {
  try {
    const res = await axios.get(`${BASE}${path}`, auth());
    let data = res.data;
    const keys = Object.keys(data);
    console.log(`✅ ${name.padEnd(30)} → ${keys.slice(0,5).join(', ')}${keys.length > 5 ? '...' : ''}`);
  } catch (e) {
    console.log(`❌ ${name.padEnd(30)} → ${e.response?.status || 'ERR'}`);
  }
}

async function main() {
  await login();
  console.log('\\nVerificando endpoints adicionales:\\n');

  // Nómina/Payroll
  await check('Payroll Concepts', '/api/payroll/concepts');
  await check('Payroll Templates', '/api/payroll/templates');
  await check('Payroll Liquidations', '/api/payroll/liquidations');

  // Hour Bank
  await check('Hour Bank Summary', '/api/v1/hour-bank/summary');
  await check('Hour Bank Movements', '/api/v1/hour-bank/movements');

  // Training
  await check('Training Courses', '/api/v1/training/courses');
  await check('Training List', '/api/training/courses');

  // Job Postings
  await check('Job Postings', '/api/job-postings');
  await check('Job Postings List', '/api/job-postings/list');

  // Medical
  await check('Medical Exams', '/api/medical-advanced/exams');
  await check('Medical Anthropometric', '/api/medical-advanced/anthropometric');

  // Documents
  await check('DMS Documents', '/api/v1/dms/documents');
  await check('DMS Folders', '/api/v1/dms/folders');

  // Messages
  await check('Messages Inbox', '/api/v1/messages/inbox');
  await check('Messages', '/api/messages');

  // Support
  await check('Support Tickets', '/api/v1/support/tickets');
  await check('Support V2 Tickets', '/api/support/v2/tickets');

  // HSE
  await check('HSE Incidents', '/api/v1/hse/incidents');
  await check('HSE Dashboard', '/api/v1/hse/dashboard');

  // Benefits
  await check('Benefits', '/api/v1/benefits');
  await check('Benefits List', '/api/benefits');

  // Equipment
  await check('Equipment', '/api/v1/equipment');
  await check('Uniforms', '/api/v1/uniforms');

  // Calendar
  await check('Calendario', '/api/calendario/eventos');
  await check('Holidays', '/api/v1/holidays-api/country/AR');

  // Finance
  await check('Finance Accounts', '/api/finance/accounts');
  await check('Finance Budget', '/api/finance/budget');
  await check('Finance Reports', '/api/finance/reports');

  // CRM
  await check('CRM Leads', '/api/aponnt/leads');
  await check('Quotes', '/api/quotes');

  // Contracts
  await check('Contracts', '/api/contracts');
  await check('Contract Templates', '/api/contracts/templates');
}

main();
