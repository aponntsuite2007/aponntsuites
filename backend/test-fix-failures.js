const http = require('http');

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 9998,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function investigateFailures() {
  // Login staff
  const staffLogin = await apiCall('POST', '/api/aponnt/staff/login', {
    email: 'admin@aponnt.com', password: 'admin123'
  });
  const staffToken = staffLogin.body.token;

  // Login empresa
  const empLogin = await apiCall('POST', '/api/v1/auth/login', {
    identifier: 'administrador', password: 'admin123', companySlug: 'aponnt-empresa-demo'
  });
  const empToken = empLogin.body.token;

  console.log('=== INVESTIGATING FAILURES ===\n');

  // 1. Company CREATE - need full validation details
  console.log('--- DW01: Company CREATE validation ---');
  const compFull = await apiCall('POST', '/api/aponnt/dashboard/companies', {
    name: 'TestCompany CRUD ' + Date.now(),
    slug: 'test-crud-' + Date.now(),
    legal_name: 'Test Legal Name SA',
    contact_email: 'test@testcompany.com',
    contactEmail: 'test@testcompany.com',
    phone: '+54-11-1234-5678',
    address: 'Test Address 123',
    max_employees: 10,
    license_type: 'basic',
    taxId: '20-12345678-9',
    tax_id: '20-12345678-9',
    city: 'Buenos Aires',
    province: 'Buenos Aires',
    country: 'AR'
  }, staffToken);
  console.log('Status:', compFull.status);
  console.log('Body:', JSON.stringify(compFull.body, null, 2).substring(0, 500));

  // 2. Shift CREATE - need full validation details
  console.log('\n--- FC07: Shift CREATE validation ---');
  const shiftFull = await apiCall('POST', '/api/v1/shifts', {
    name: 'Test Shift ' + Date.now(),
    shift_type: 'standard',
    start_time: '08:00',
    end_time: '16:00',
    startTime: '08:00',
    endTime: '16:00',
    type: 'standard'
  }, empToken);
  console.log('Status:', shiftFull.status);
  console.log('Body:', JSON.stringify(shiftFull.body, null, 2).substring(0, 500));

  // 3. Associate login 500 error
  console.log('\n--- AA01: Associate login 500 error ---');
  const assocLogin = await apiCall('POST', '/api/associates/auth/login', {
    email: 'test@associate.com', password: 'test123'
  });
  console.log('Status:', assocLogin.status);
  console.log('Body:', JSON.stringify(assocLogin.body, null, 2).substring(0, 500));

  // Also test with different field structure
  const assocLogin2 = await apiCall('POST', '/api/v1/associates/auth/login', {
    email: 'test@associate.com', password: 'test123'
  });
  console.log('Alt route status:', assocLogin2.status);
  console.log('Alt route body:', JSON.stringify(assocLogin2.body, null, 2).substring(0, 300));

  // 4. Budget CREATE
  console.log('\n--- DW03: Budget CREATE ---');
  const budget = await apiCall('POST', '/api/aponnt/dashboard/budgets', {
    company_id: 1,
    title: 'Test Budget ' + Date.now(),
    amount: 5000,
    modules: ['users', 'attendance'],
    period: 'monthly',
    currency: 'USD'
  }, staffToken);
  console.log('Status:', budget.status);
  console.log('Body:', JSON.stringify(budget.body, null, 2).substring(0, 500));

  // 5. Department CREATE - check returned ID structure
  console.log('\n--- FC02: Department CREATE - ID structure ---');
  const dept = await apiCall('POST', '/api/v1/departments', {
    name: 'CRUD-Test-IDCheck-' + Date.now(),
    description: 'Check ID structure'
  }, empToken);
  console.log('Status:', dept.status);
  console.log('Full body:', JSON.stringify(dept.body, null, 2).substring(0, 500));
}

investigateFailures().catch(e => console.error('ERROR:', e.message));
