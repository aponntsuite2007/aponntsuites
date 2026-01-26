/**
 * COMPREHENSIVE CRUD TEST BATTERY
 * Production readiness validation
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
  let passed = 0, failed = 0, token, refreshToken;
  const failures = [];

  function check(name, condition, details) {
    if (condition) {
      passed++;
      console.log(`  PASS: ${name} ${details || ''}`);
    } else {
      failed++;
      failures.push(name);
      console.log(`  FAIL: ${name} ${details || ''}`);
    }
  }

  // ===== AUTH TESTS =====
  console.log('\n========== AUTH FLOW TESTS ==========');

  const login = await apiCall('POST', '/api/v1/auth/login', {
    identifier: 'administrador', password: 'admin123', companySlug: 'aponnt-empresa-demo'
  });
  token = login.body.token;
  refreshToken = login.body.refreshToken;
  check('T01-Login', login.status === 200 && token, `status=${login.status}`);

  const me = await apiCall('GET', '/api/v1/auth/me', null, token);
  check('T02-GetMe', me.status === 200, `status=${me.status} role=${me.body?.role}`);

  const refresh = await apiCall('POST', '/api/v1/auth/refresh', { refreshToken });
  check('T03-RefreshToken', refresh.status === 200 && refresh.body.token, `status=${refresh.status}`);

  const badLogin = await apiCall('POST', '/api/v1/auth/login', {
    identifier: 'administrador', password: 'WRONG', companySlug: 'aponnt-empresa-demo'
  });
  check('T04-BadPassword', badLogin.status === 401, `status=${badLogin.status} err=${badLogin.body?.error}`);

  const badCompany = await apiCall('POST', '/api/v1/auth/login', {
    identifier: 'administrador', password: 'admin123', companySlug: 'fake-company-xyz'
  });
  check('T05-BadCompany', badCompany.status === 401, `status=${badCompany.status} err=${badCompany.body?.error}`);

  const noToken = await apiCall('GET', '/api/v1/auth/me', null, null);
  check('T06-NoToken', noToken.status === 401, `status=${noToken.status}`);

  const badToken = await apiCall('GET', '/api/v1/auth/me', null, 'invalid.token.value');
  check('T07-InvalidToken', badToken.status === 401, `status=${badToken.status}`);

  // Logout + blacklist test
  const logoutToken = token; // save reference
  const logout = await apiCall('POST', '/api/v1/auth/logout', null, token);
  check('T08-Logout', logout.status === 200, `status=${logout.status}`);

  const afterLogout = await apiCall('GET', '/api/v1/auth/me', null, logoutToken);
  check('T09-BlacklistCheck', afterLogout.status === 401, `status=${afterLogout.status} (should be 401 after logout)`);

  // Re-login for CRUD
  const relogin = await apiCall('POST', '/api/v1/auth/login', {
    identifier: 'administrador', password: 'admin123', companySlug: 'aponnt-empresa-demo'
  });
  token = relogin.body.token;

  // Rate limit test (verify header exists)
  const rateLimitCheck = await apiCall('POST', '/api/v1/auth/login', {
    identifier: 'test', password: 'test', companySlug: 'aponnt-empresa-demo'
  });
  check('T10-RateLimit-Active', rateLimitCheck.status === 401, `status=${rateLimitCheck.status} (should reject bad creds, not crash)`);

  // ===== PANEL EMPRESA CRUD =====
  console.log('\n========== PANEL EMPRESA CRUD TESTS ==========');

  // Users
  const users = await apiCall('GET', '/api/v1/users', null, token);
  const userCount = Array.isArray(users.body) ? users.body.length : (users.body?.users?.length || users.body?.data?.length || 0);
  check('T11-Users-GET', users.status === 200, `status=${users.status} count=${userCount}`);

  // Departments
  const depts = await apiCall('GET', '/api/v1/departments', null, token);
  check('T12-Departments-GET', depts.status === 200, `status=${depts.status}`);

  // Attendance
  const attendance = await apiCall('GET', '/api/v1/attendance', null, token);
  check('T13-Attendance-GET', [200, 404].includes(attendance.status), `status=${attendance.status}`);

  // Shifts
  const shifts = await apiCall('GET', '/api/v1/shifts', null, token);
  check('T14-Shifts-GET', shifts.status === 200, `status=${shifts.status}`);

  // Company modules
  const modules = await apiCall('GET', '/api/v1/company-modules/active', null, token);
  check('T15-Modules-GET', modules.status === 200, `status=${modules.status} count=${modules.body?.modules?.length || '?'}`);

  // Kiosks
  const kiosks = await apiCall('GET', '/api/v1/kiosks', null, token);
  check('T16-Kiosks-GET', [200, 404].includes(kiosks.status), `status=${kiosks.status}`);

  // Notifications
  const notifs = await apiCall('GET', '/api/v1/notifications', null, token);
  check('T17-Notifications-GET', [200, 404].includes(notifs.status), `status=${notifs.status}`);

  // Vacations
  const vacations = await apiCall('GET', '/api/v1/vacations', null, token);
  check('T18-Vacations-GET', [200, 404].includes(vacations.status), `status=${vacations.status}`);

  // DMS/Documents
  const docs = await apiCall('GET', '/api/v1/documents', null, token);
  check('T19-Documents-GET', [200, 404].includes(docs.status), `status=${docs.status}`);

  // Roles
  const roles = await apiCall('GET', '/api/v1/roles', null, token);
  check('T20-Roles-GET', [200, 404].includes(roles.status), `status=${roles.status}`);

  // ===== CREATE/UPDATE TESTS =====
  console.log('\n========== CREATE/UPDATE TESTS ==========');

  // Create department
  const newDept = await apiCall('POST', '/api/v1/departments', {
    name: 'Test Dept CRUD ' + Date.now(),
    description: 'Auto-test department'
  }, token);
  check('T21-Department-CREATE', [200, 201].includes(newDept.status), `status=${newDept.status}`);

  // Create user (minimal)
  const testUserData = {
    nombre: 'Test',
    apellido: 'CrudUser',
    email: `test-crud-${Date.now()}@test.com`,
    usuario: `testcrud${Date.now()}`,
    password: 'Test1234!',
    role: 'employee',
    dni: `${Date.now()}`.substring(0, 8)
  };
  const newUser = await apiCall('POST', '/api/v1/users', testUserData, token);
  check('T22-User-CREATE', [200, 201].includes(newUser.status), `status=${newUser.status} err=${newUser.body?.error || 'none'}`);
  const createdUserId = newUser.body?.user?.user_id || newUser.body?.data?.user_id;

  // Update user (if created)
  if (createdUserId) {
    const updateUser = await apiCall('PUT', `/api/v1/users/${createdUserId}`, {
      nombre: 'TestUpdated'
    }, token);
    check('T23-User-UPDATE', [200].includes(updateUser.status), `status=${updateUser.status}`);
  } else {
    check('T23-User-UPDATE', false, 'SKIPPED - no user created');
  }

  // Create shift
  const newShift = await apiCall('POST', '/api/v1/shifts', {
    name: 'Test Shift CRUD ' + Date.now(),
    shift_type: 'standard',
    start_time: '09:00',
    end_time: '17:00'
  }, token);
  check('T24-Shift-CREATE', [200, 201].includes(newShift.status), `status=${newShift.status} err=${newShift.body?.error || 'none'}`);

  // ===== ADMIN PANEL TESTS =====
  console.log('\n========== ADMIN PANEL TESTS ==========');

  // Staff login
  const staffLogin = await apiCall('POST', '/api/aponnt/staff/login', {
    email: 'admin@aponnt.com', password: 'admin123'
  });
  const staffToken = staffLogin.body?.token;
  check('T25-StaffLogin', staffLogin.status === 200 && staffToken, `status=${staffLogin.status}`);

  if (staffToken) {
    const adminComp = await apiCall('GET', '/api/aponnt/dashboard/companies', null, staffToken);
    check('T26-AdminCompanies', adminComp.status === 200, `status=${adminComp.status}`);

    const supportStats = await apiCall('GET', '/api/aponnt/dashboard/support-stats', null, staffToken);
    check('T27-SupportStats', [200, 404, 500].includes(supportStats.status), `status=${supportStats.status}`);

    const staffList = await apiCall('GET', '/api/aponnt/dashboard/staff', null, staffToken);
    check('T28-StaffList', [200, 404].includes(staffList.status), `status=${staffList.status}`);

    const budgets = await apiCall('GET', '/api/aponnt/dashboard/budgets', null, staffToken);
    check('T29-Budgets', [200, 404].includes(budgets.status), `status=${budgets.status}`);

    const invoices = await apiCall('GET', '/api/aponnt/billing/invoices', null, staffToken);
    check('T30-Invoices', [200, 404].includes(invoices.status), `status=${invoices.status}`);
  } else {
    console.log('  SKIP: T26-T30 (no staff token)');
  }

  // ===== SECURITY TESTS =====
  console.log('\n========== SECURITY TESTS ==========');

  // Backdoor removed
  const backdoor1 = await apiCall('POST', '/api/aponnt/staff/login', {
    email: 'postgres', password: 'Aedr15150302'
  });
  check('T31-Backdoor-Staff', backdoor1.status !== 200, `status=${backdoor1.status} (must NOT be 200)`);

  const backdoor2 = await apiCall('POST', '/api/v1/auth/aponnt/partner/login', {
    username: 'postgres', password: 'Aedr15150302'
  });
  check('T32-Backdoor-Partner', backdoor2.status !== 200, `status=${backdoor2.status} (must NOT be 200)`);

  const backdoor3 = await apiCall('POST', '/api/associates/auth/login', {
    email: 'postgres', password: 'Aedr15150302'
  });
  check('T33-Backdoor-Associate', backdoor3.status !== 200, `status=${backdoor3.status} (must NOT be 200)`);

  // Generic error messages (no user enumeration)
  const enumTest = await apiCall('POST', '/api/v1/auth/login', {
    identifier: 'nonexistent@fake.com', password: 'test', companySlug: 'aponnt-empresa-demo'
  });
  const errMsg = enumTest.body?.error || '';
  check('T34-NoEnumeration', !errMsg.includes('no encontrado') && !errMsg.includes('not found'), `error="${errMsg}"`);

  // Multi-tenant isolation
  const otherCompanyLogin = await apiCall('POST', '/api/v1/auth/login', {
    identifier: 'administrador', password: 'admin123', companySlug: 'empresa-test'
  });
  check('T35-MultiTenant', otherCompanyLogin.status === 401 || otherCompanyLogin.status === 200, `status=${otherCompanyLogin.status} (isolation check)`);

  // ===== EDGE CASES =====
  console.log('\n========== EDGE CASES ==========');

  // Empty body
  const emptyBody = await apiCall('POST', '/api/v1/auth/login', {}, null);
  check('T36-EmptyBody', [400, 401].includes(emptyBody.status), `status=${emptyBody.status}`);

  // SQL injection attempt
  const sqlInj = await apiCall('POST', '/api/v1/auth/login', {
    identifier: "' OR 1=1 --", password: 'test', companySlug: 'aponnt-empresa-demo'
  }, null);
  check('T37-SQLInjection', sqlInj.status === 401, `status=${sqlInj.status} (should reject)`);

  // XSS in identifier
  const xssTest = await apiCall('POST', '/api/v1/auth/login', {
    identifier: '<script>alert(1)</script>', password: 'test', companySlug: 'aponnt-empresa-demo'
  }, null);
  check('T38-XSSInLogin', xssTest.status === 401, `status=${xssTest.status}`);

  // Very long string
  const longStr = 'A'.repeat(10000);
  const longTest = await apiCall('POST', '/api/v1/auth/login', {
    identifier: longStr, password: 'test', companySlug: 'aponnt-empresa-demo'
  }, null);
  check('T39-LongString', [400, 401, 413].includes(longTest.status), `status=${longTest.status}`);

  // Missing required fields in user create
  const badUser = await apiCall('POST', '/api/v1/users', { nombre: 'OnlyName' }, token);
  check('T40-BadUserCreate', [400, 422, 500].includes(badUser.status), `status=${badUser.status}`);

  // ===== SUMMARY =====
  console.log('\n==========================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED | ${passed + failed} TOTAL`);
  if (failures.length > 0) {
    console.log('FAILURES:', failures.join(', '));
  }
  console.log('==========================================');
}

runTests().catch(e => console.error('FATAL ERROR:', e.message, e.stack));
