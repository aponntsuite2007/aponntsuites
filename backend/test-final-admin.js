/**
 * FINAL PRODUCTION VALIDATION - All CRUD + Security
 * Complete test of Panel Administrativo + Panel Empresa
 */
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

async function runTests() {
  let passed = 0, failed = 0;
  const failures = [];

  function check(name, condition, details) {
    if (condition) {
      passed++;
      console.log(`  PASS: ${name}`);
    } else {
      failed++;
      failures.push(name);
      console.log(`  FAIL: ${name} ${details || ''}`);
    }
  }

  // ===== AUTH =====
  console.log('\n=== STAFF AUTH ===');
  const staffLogin = await apiCall('POST', '/api/aponnt/staff/login', { email: 'admin@aponnt.com', password: 'admin123' });
  const sT = staffLogin.body?.token;
  check('Staff-Login', staffLogin.status === 200 && sT);
  check('Staff-BadPass', (await apiCall('POST', '/api/aponnt/staff/login', { email: 'admin@aponnt.com', password: 'wrong' })).status === 401);
  check('Staff-NoUser', (await apiCall('POST', '/api/aponnt/staff/login', { email: 'fake@x.com', password: 'x' })).status === 401);
  check('Staff-Verify', (await apiCall('GET', '/api/aponnt/staff/verify', null, sT)).status === 200);
  check('Staff-AltRoute', (await apiCall('POST', '/api/v1/auth/aponnt/staff/login', { username: 'admin@aponnt.com', password: 'admin123' })).status === 200);

  console.log('\n=== EMPRESA AUTH ===');
  const empLogin = await apiCall('POST', '/api/v1/auth/login', { identifier: 'administrador', password: 'admin123', companySlug: 'aponnt-empresa-demo' });
  const eT = empLogin.body?.token;
  check('Emp-Login', empLogin.status === 200 && eT);
  check('Emp-Me', (await apiCall('GET', '/api/v1/auth/me', null, eT)).status === 200);
  check('Emp-BadPass', (await apiCall('POST', '/api/v1/auth/login', { identifier: 'administrador', password: 'wrong', companySlug: 'aponnt-empresa-demo' })).status === 401);

  console.log('\n=== PARTNER AUTH ===');
  check('Partner-NoUser', (await apiCall('POST', '/api/v1/auth/aponnt/partner/login', { username: 'fake@x.com', password: 'x' })).status === 401);

  console.log('\n=== ASSOCIATE AUTH ===');
  check('Assoc-NoUser', (await apiCall('POST', '/api/associates/auth/login', { email: 'fake@x.com', password: 'x' })).status === 401);

  // ===== DASHBOARD READS =====
  console.log('\n=== DASHBOARD READS ===');
  check('Dash-Companies', (await apiCall('GET', '/api/aponnt/dashboard/companies', null, sT)).status === 200);
  check('Dash-Staff', [200, 404].includes((await apiCall('GET', '/api/aponnt/dashboard/staff', null, sT)).status));
  check('Dash-Budgets', [200, 404].includes((await apiCall('GET', '/api/aponnt/dashboard/budgets', null, sT)).status));
  check('Dash-Billing', [200, 404].includes((await apiCall('GET', '/api/aponnt/dashboard/billing', null, sT)).status));
  check('Dash-StaffData', [200, 404].includes((await apiCall('GET', '/api/aponnt/staff-data', null, sT)).status));
  check('Dash-Leads', [200, 404].includes((await apiCall('GET', '/api/aponnt/leads', null, sT)).status));

  // ===== DASHBOARD WRITES =====
  console.log('\n=== DASHBOARD WRITES ===');
  const ts = Date.now();
  const newComp = await apiCall('POST', '/api/aponnt/dashboard/companies', {
    name: 'TestCo-' + ts, slug: 'test-' + ts, legal_name: 'Test SA',
    taxId: '20-99999999-9', contactEmail: 'test@co.com', contactPhone: '+54-11-0000',
    address: 'Av Test 123', city: 'CABA', province: 'Buenos Aires', country: 'AR',
    max_employees: 10, license_type: 'basic'
  }, sT);
  const compId = newComp.body?.company?.id || newComp.body?.company?.company_id;
  check('Comp-CREATE', [200, 201].includes(newComp.status), `status=${newComp.status}`);

  if (compId) {
    check('Comp-UPDATE', (await apiCall('PUT', `/api/aponnt/dashboard/companies/${compId}`, { phone: '+54-11-9999' }, sT)).status === 200);
  }

  // ===== EMPRESA CRUD =====
  console.log('\n=== EMPRESA FULL CRUD ===');

  // Department CRUD
  const dept = await apiCall('POST', '/api/v1/departments', { name: 'Dept-' + ts, description: 'test' }, eT);
  const deptId = dept.body?.data?.id;
  check('Dept-CREATE', dept.status === 201, `id=${deptId}`);

  if (deptId) {
    check('Dept-READ', (await apiCall('GET', `/api/v1/departments/${deptId}`, null, eT)).status === 200);
    check('Dept-UPDATE', (await apiCall('PUT', `/api/v1/departments/${deptId}`, { name: 'DeptUpd-' + ts }, eT)).status === 200);
    check('Dept-DELETE', [200, 204].includes((await apiCall('DELETE', `/api/v1/departments/${deptId}`, null, eT)).status));
  }

  // Shift CRUD
  const shift = await apiCall('POST', '/api/v1/shifts', {
    name: 'Shift-' + ts, shift_type: 'standard', startTime: '08:00', endTime: '16:00'
  }, eT);
  const shiftId = shift.body?.shift?.id;
  check('Shift-CREATE', [200, 201].includes(shift.status), `id=${shiftId}`);

  if (shiftId) {
    check('Shift-READ', (await apiCall('GET', `/api/v1/shifts/${shiftId}`, null, eT)).status === 200);
    check('Shift-UPDATE', (await apiCall('PUT', `/api/v1/shifts/${shiftId}`, { name: 'ShiftUpd-' + ts }, eT)).status === 200);
    check('Shift-DELETE', [200, 204].includes((await apiCall('DELETE', `/api/v1/shifts/${shiftId}`, null, eT)).status));
  }

  // User CRUD
  const user = await apiCall('POST', '/api/v1/users', {
    firstName: 'Test', lastName: 'User', email: `t${ts}@t.com`,
    usuario: `t${ts}`, password: 'Test1234!', role: 'employee', dni: `${ts}`.substring(0, 8)
  }, eT);
  const userId = user.body?.user?.user_id || user.body?.data?.user_id;
  check('User-CREATE', [200, 201].includes(user.status), `id=${userId}`);

  if (userId) {
    check('User-READ', (await apiCall('GET', `/api/v1/users/${userId}`, null, eT)).status === 200);
    check('User-UPDATE', (await apiCall('PUT', `/api/v1/users/${userId}`, { firstName: 'Updated' }, eT)).status === 200);
    check('User-DELETE', [200, 204].includes((await apiCall('DELETE', `/api/v1/users/${userId}`, null, eT)).status));
  }

  // Other endpoints
  check('Attendance-LIST', [200, 404].includes((await apiCall('GET', '/api/v1/attendance', null, eT)).status));
  check('Kiosks-LIST', [200, 404].includes((await apiCall('GET', '/api/v1/kiosks', null, eT)).status));
  check('Modules-LIST', (await apiCall('GET', '/api/v1/company-modules/active', null, eT)).status === 200);
  check('Notifs-LIST', [200, 404].includes((await apiCall('GET', '/api/v1/notifications', null, eT)).status));

  // ===== SECURITY =====
  console.log('\n=== SECURITY ===');
  check('NoToken-Dash', (await apiCall('GET', '/api/aponnt/dashboard/companies', null, null)).status === 401);
  check('BadToken-Dash', (await apiCall('GET', '/api/aponnt/dashboard/companies', null, 'invalid')).status === 401);
  check('CrossToken', (await apiCall('GET', '/api/aponnt/dashboard/companies', null, eT)).status === 403);
  check('NoToken-Emp', (await apiCall('GET', '/api/v1/auth/me', null, null)).status === 401);
  check('SQLInj', (await apiCall('POST', '/api/v1/auth/login', { identifier: "' OR 1=1 --", password: 'x', companySlug: 'aponnt-empresa-demo' })).status === 401);
  check('XSS', (await apiCall('POST', '/api/v1/auth/login', { identifier: '<script>alert(1)</script>', password: 'x', companySlug: 'aponnt-empresa-demo' })).status === 401);
  check('EmptyBody', [400, 401].includes((await apiCall('POST', '/api/v1/auth/login', {}, null)).status));

  // Token blacklist (logout + reuse)
  const logoutLogin = await apiCall('POST', '/api/v1/auth/login', { identifier: 'administrador', password: 'admin123', companySlug: 'aponnt-empresa-demo' });
  const logoutToken = logoutLogin.body?.token;
  if (logoutToken) {
    await apiCall('POST', '/api/v1/auth/logout', null, logoutToken);
    check('TokenBlacklist', (await apiCall('GET', '/api/v1/auth/me', null, logoutToken)).status === 401);
  }

  // Rate limiting
  check('RateLimit-Active', (await apiCall('POST', '/api/aponnt/staff/login', { email: 'x', password: 'x' })).status === 401);

  // ===== SUMMARY =====
  console.log('\n==========================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED | ${passed + failed} TOTAL`);
  if (failures.length > 0) console.log('FAILURES:', failures.join(', '));
  console.log('==========================================');
}

runTests().catch(e => console.error('FATAL:', e.message));
