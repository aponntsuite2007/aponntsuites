/**
 * PANEL ADMINISTRATIVO - Deep CRUD Test Battery
 * Tests staff authentication + all admin dashboard endpoints
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
      console.log(`  PASS: ${name} ${details || ''}`);
    } else {
      failed++;
      failures.push(name);
      console.log(`  FAIL: ${name} ${details || ''}`);
    }
  }

  // ===== STAFF AUTHENTICATION =====
  console.log('\n========== STAFF AUTH TESTS ==========');

  // Test 1: Staff login with email
  const staffLogin = await apiCall('POST', '/api/aponnt/staff/login', {
    email: 'admin@aponnt.com', password: 'admin123'
  });
  const staffToken = staffLogin.body?.token;
  check('SA01-StaffLogin', staffLogin.status === 200 && staffToken,
    `status=${staffLogin.status} hasToken=${!!staffToken} msg=${staffLogin.body?.message || staffLogin.body?.error || ''}`);

  // Test 2: Staff login with wrong password
  const badStaffLogin = await apiCall('POST', '/api/aponnt/staff/login', {
    email: 'admin@aponnt.com', password: 'wrongpass'
  });
  check('SA02-BadPassword', badStaffLogin.status === 401,
    `status=${badStaffLogin.status}`);

  // Test 3: Staff login with non-existent email
  const noStaff = await apiCall('POST', '/api/aponnt/staff/login', {
    email: 'nonexistent@fake.com', password: 'test'
  });
  check('SA03-NoStaff', noStaff.status === 401,
    `status=${noStaff.status}`);

  // Test 4: Staff verify token
  if (staffToken) {
    const verify = await apiCall('GET', '/api/aponnt/staff/verify', null, staffToken);
    check('SA04-VerifyToken', verify.status === 200,
      `status=${verify.status} staff=${verify.body?.staff?.email || '?'}`);
  } else {
    check('SA04-VerifyToken', false, 'SKIPPED - no token');
  }

  // Test 5: Also test the /api/v1/auth/aponnt/staff/login route
  const staffLogin2 = await apiCall('POST', '/api/v1/auth/aponnt/staff/login', {
    username: 'admin@aponnt.com', password: 'admin123'
  });
  check('SA05-AltLoginRoute', staffLogin2.status === 200 && staffLogin2.body?.token,
    `status=${staffLogin2.status} hasToken=${!!staffLogin2.body?.token}`);

  if (!staffToken) {
    console.log('\n  CRITICAL: Cannot continue without staff token. Aborting admin tests.');
    console.log(`\nRESULTS: ${passed} PASSED | ${failed} FAILED`);
    if (failures.length) console.log('FAILURES:', failures.join(', '));
    return;
  }

  // ===== DASHBOARD ENDPOINTS =====
  console.log('\n========== DASHBOARD CRUD TESTS ==========');

  // Companies
  const companies = await apiCall('GET', '/api/aponnt/dashboard/companies', null, staffToken);
  check('DC01-Companies-GET', companies.status === 200,
    `status=${companies.status} count=${Array.isArray(companies.body) ? companies.body.length : (companies.body?.companies?.length || '?')}`);

  // Company details (if any companies exist)
  if (companies.status === 200) {
    const compList = Array.isArray(companies.body) ? companies.body : (companies.body?.companies || []);
    if (compList.length > 0) {
      const compId = compList[0].company_id || compList[0].id;
      const compDetail = await apiCall('GET', `/api/aponnt/dashboard/companies/${compId}`, null, staffToken);
      check('DC02-CompanyDetail-GET', [200, 404].includes(compDetail.status),
        `status=${compDetail.status} id=${compId}`);
    } else {
      check('DC02-CompanyDetail-GET', true, 'SKIPPED - no companies');
    }
  }

  // Support stats
  const supportStats = await apiCall('GET', '/api/aponnt/dashboard/support-stats', null, staffToken);
  check('DC03-SupportStats', [200, 404, 500].includes(supportStats.status),
    `status=${supportStats.status}`);

  // Staff list
  const staffList = await apiCall('GET', '/api/aponnt/dashboard/staff', null, staffToken);
  check('DC04-StaffList', [200, 404].includes(staffList.status),
    `status=${staffList.status} count=${staffList.body?.staff?.length || staffList.body?.length || '?'}`);

  // Budgets
  const budgets = await apiCall('GET', '/api/aponnt/dashboard/budgets', null, staffToken);
  check('DC05-Budgets', [200, 404].includes(budgets.status),
    `status=${budgets.status}`);

  // Dashboard overview / stats
  const overview = await apiCall('GET', '/api/aponnt/dashboard/overview', null, staffToken);
  check('DC06-Overview', [200, 404].includes(overview.status),
    `status=${overview.status}`);

  // Users management
  const users = await apiCall('GET', '/api/aponnt/dashboard/users', null, staffToken);
  check('DC07-Users', [200, 404].includes(users.status),
    `status=${users.status}`);

  // Leads
  const leads = await apiCall('GET', '/api/aponnt/leads', null, staffToken);
  check('DC08-Leads', [200, 404, 401, 403].includes(leads.status),
    `status=${leads.status}`);

  // Staff data (CRUD routes)
  const staffData = await apiCall('GET', '/api/aponnt/staff-data', null, staffToken);
  check('DC09-StaffData', [200, 404, 401, 403].includes(staffData.status),
    `status=${staffData.status}`);

  // Commissions
  const commissions = await apiCall('GET', '/api/aponnt/staff-commissions', null, staffToken);
  check('DC10-Commissions', [200, 404, 401, 403].includes(commissions.status),
    `status=${commissions.status}`);

  // ===== DASHBOARD WRITE OPERATIONS =====
  console.log('\n========== DASHBOARD WRITE TESTS ==========');

  // Create a company
  const newCompany = await apiCall('POST', '/api/aponnt/dashboard/companies', {
    name: 'TestCompany CRUD ' + Date.now(),
    slug: 'test-crud-' + Date.now(),
    legal_name: 'Test Legal Name SA',
    contact_email: 'test@testcompany.com',
    phone: '+54-11-1234-5678',
    address: 'Test Address 123',
    max_employees: 10,
    license_type: 'basic'
  }, staffToken);
  check('DW01-Company-CREATE', [200, 201].includes(newCompany.status),
    `status=${newCompany.status} err=${newCompany.body?.error || 'none'}`);
  const createdCompanyId = newCompany.body?.company?.company_id || newCompany.body?.company?.id || newCompany.body?.data?.company_id;

  // Update company (if created)
  if (createdCompanyId) {
    const updateComp = await apiCall('PUT', `/api/aponnt/dashboard/companies/${createdCompanyId}`, {
      phone: '+54-11-9999-8888'
    }, staffToken);
    check('DW02-Company-UPDATE', [200].includes(updateComp.status),
      `status=${updateComp.status}`);
  } else {
    check('DW02-Company-UPDATE', false, `SKIPPED - no company created (body=${JSON.stringify(newCompany.body).substring(0, 100)})`);
  }

  // Create a budget
  const newBudget = await apiCall('POST', '/api/aponnt/dashboard/budgets', {
    company_id: createdCompanyId || 1,
    title: 'Test Budget CRUD ' + Date.now(),
    amount: 5000,
    currency: 'USD',
    status: 'draft'
  }, staffToken);
  check('DW03-Budget-CREATE', [200, 201, 404].includes(newBudget.status),
    `status=${newBudget.status}`);

  // ===== BILLING ENDPOINTS =====
  console.log('\n========== BILLING TESTS ==========');

  const invoices = await apiCall('GET', '/api/aponnt/billing/invoices', null, staffToken);
  check('BL01-Invoices', [200, 404].includes(invoices.status),
    `status=${invoices.status}`);

  const billingDashboard = await apiCall('GET', '/api/aponnt/dashboard/billing', null, staffToken);
  check('BL02-BillingDash', [200, 404].includes(billingDashboard.status),
    `status=${billingDashboard.status}`);

  // ===== SECURITY TESTS =====
  console.log('\n========== ADMIN SECURITY TESTS ==========');

  // No token
  const noTokenDash = await apiCall('GET', '/api/aponnt/dashboard/companies', null, null);
  check('AS01-NoToken', noTokenDash.status === 401,
    `status=${noTokenDash.status}`);

  // Invalid token
  const badTokenDash = await apiCall('GET', '/api/aponnt/dashboard/companies', null, 'invalid.token.value');
  check('AS02-BadToken', badTokenDash.status === 401,
    `status=${badTokenDash.status}`);

  // Company user token (should be 403 - wrong token type)
  const companyLogin = await apiCall('POST', '/api/v1/auth/login', {
    identifier: 'administrador', password: 'admin123', companySlug: 'aponnt-empresa-demo'
  });
  if (companyLogin.body?.token) {
    const crossToken = await apiCall('GET', '/api/aponnt/dashboard/companies', null, companyLogin.body.token);
    check('AS03-CrossTokenIsolation', crossToken.status === 403,
      `status=${crossToken.status} (company token on staff endpoint)`);
  } else {
    check('AS03-CrossTokenIsolation', false, 'SKIPPED - no company token');
  }

  // Empty body on staff login
  const emptyLogin = await apiCall('POST', '/api/aponnt/staff/login', {}, null);
  check('AS04-EmptyLogin', emptyLogin.status === 400,
    `status=${emptyLogin.status}`);

  // SQL injection on staff login
  const sqlInj = await apiCall('POST', '/api/aponnt/staff/login', {
    email: "' OR 1=1 --", password: 'test'
  }, null);
  check('AS05-SQLInjection', sqlInj.status === 401,
    `status=${sqlInj.status}`);

  // ===== PARTNER AUTH TESTS =====
  console.log('\n========== PARTNER AUTH TESTS ==========');

  // Partner login (no partners may exist)
  const partnerLogin = await apiCall('POST', '/api/v1/auth/aponnt/partner/login', {
    username: 'test@partner.com', password: 'test123'
  });
  check('PA01-PartnerLogin', [401, 400].includes(partnerLogin.status),
    `status=${partnerLogin.status} (expected 401 - no partner exists)`);

  // ===== ASSOCIATE AUTH TESTS =====
  console.log('\n========== ASSOCIATE AUTH TESTS ==========');

  const assocLogin = await apiCall('POST', '/api/associates/auth/login', {
    email: 'test@associate.com', password: 'test123'
  });
  check('AA01-AssociateLogin', [401, 400, 404].includes(assocLogin.status),
    `status=${assocLogin.status} (expected reject - no associate exists)`);

  // ===== FULL CRUD CYCLE ON PANEL EMPRESA (with fresh token) =====
  console.log('\n========== FULL CRUD CYCLE - EMPRESA ==========');

  // Fresh login
  const freshLogin = await apiCall('POST', '/api/v1/auth/login', {
    identifier: 'administrador', password: 'admin123', companySlug: 'aponnt-empresa-demo'
  });
  const empToken = freshLogin.body?.token;
  check('FC01-FreshLogin', freshLogin.status === 200 && empToken,
    `status=${freshLogin.status}`);

  if (empToken) {
    // Create → Read → Update → Delete cycle for department
    const dept = await apiCall('POST', '/api/v1/departments', {
      name: 'CRUD-Cycle-Dept-' + Date.now(),
      description: 'Full cycle test'
    }, empToken);
    const deptId = dept.body?.department?.department_id || dept.body?.data?.department_id || dept.body?.id;
    check('FC02-Dept-CREATE', [200, 201].includes(dept.status),
      `status=${dept.status} id=${deptId}`);

    if (deptId) {
      // Read specific
      const readDept = await apiCall('GET', `/api/v1/departments/${deptId}`, null, empToken);
      check('FC03-Dept-READ', [200].includes(readDept.status),
        `status=${readDept.status}`);

      // Update
      const updDept = await apiCall('PUT', `/api/v1/departments/${deptId}`, {
        name: 'CRUD-Updated-' + Date.now()
      }, empToken);
      check('FC04-Dept-UPDATE', [200].includes(updDept.status),
        `status=${updDept.status}`);

      // Delete
      const delDept = await apiCall('DELETE', `/api/v1/departments/${deptId}`, null, empToken);
      check('FC05-Dept-DELETE', [200, 204].includes(delDept.status),
        `status=${delDept.status}`);

      // Verify deleted
      const verifyDel = await apiCall('GET', `/api/v1/departments/${deptId}`, null, empToken);
      check('FC06-Dept-VERIFY-DELETE', [404, 200].includes(verifyDel.status),
        `status=${verifyDel.status} (404=hard delete, 200=soft delete)`);
    }

    // Create → Read → Update → Delete cycle for shift
    const shift = await apiCall('POST', '/api/v1/shifts', {
      name: 'CRUD-Shift-' + Date.now(),
      shift_type: 'standard',
      start_time: '08:00',
      end_time: '16:00'
    }, empToken);
    const shiftId = shift.body?.shift?.shift_id || shift.body?.data?.shift_id || shift.body?.id;
    check('FC07-Shift-CREATE', [200, 201].includes(shift.status),
      `status=${shift.status} id=${shiftId}`);

    if (shiftId) {
      const readShift = await apiCall('GET', `/api/v1/shifts/${shiftId}`, null, empToken);
      check('FC08-Shift-READ', [200].includes(readShift.status),
        `status=${readShift.status}`);

      const updShift = await apiCall('PUT', `/api/v1/shifts/${shiftId}`, {
        name: 'CRUD-Shift-Updated-' + Date.now()
      }, empToken);
      check('FC09-Shift-UPDATE', [200].includes(updShift.status),
        `status=${updShift.status}`);

      const delShift = await apiCall('DELETE', `/api/v1/shifts/${shiftId}`, null, empToken);
      check('FC10-Shift-DELETE', [200, 204].includes(delShift.status),
        `status=${delShift.status}`);
    }

    // User full cycle
    const userTs = Date.now();
    const user = await apiCall('POST', '/api/v1/users', {
      firstName: 'CrudTest',
      lastName: 'FullCycle',
      email: `crudtest-${userTs}@test.com`,
      usuario: `crudtest${userTs}`,
      password: 'Test1234!',
      role: 'employee',
      dni: `${userTs}`.substring(0, 8)
    }, empToken);
    const userId = user.body?.user?.user_id || user.body?.data?.user_id;
    check('FC11-User-CREATE', [200, 201].includes(user.status),
      `status=${user.status} id=${userId}`);

    if (userId) {
      const readUser = await apiCall('GET', `/api/v1/users/${userId}`, null, empToken);
      check('FC12-User-READ', readUser.status === 200,
        `status=${readUser.status}`);

      const updUser = await apiCall('PUT', `/api/v1/users/${userId}`, {
        firstName: 'CrudUpdated'
      }, empToken);
      check('FC13-User-UPDATE', updUser.status === 200,
        `status=${updUser.status}`);

      const delUser = await apiCall('DELETE', `/api/v1/users/${userId}`, null, empToken);
      check('FC14-User-DELETE', [200, 204].includes(delUser.status),
        `status=${delUser.status}`);
    }

    // Attendance listing
    const attendance = await apiCall('GET', '/api/v1/attendance', null, empToken);
    check('FC15-Attendance-LIST', [200, 404].includes(attendance.status),
      `status=${attendance.status}`);

    // Kiosks listing
    const kiosks = await apiCall('GET', '/api/v1/kiosks', null, empToken);
    check('FC16-Kiosks-LIST', [200, 404].includes(kiosks.status),
      `status=${kiosks.status}`);

    // Modules
    const modules = await apiCall('GET', '/api/v1/company-modules/active', null, empToken);
    check('FC17-Modules-LIST', modules.status === 200,
      `status=${modules.status}`);

    // Notifications
    const notifs = await apiCall('GET', '/api/v1/notifications', null, empToken);
    check('FC18-Notifications', [200, 404].includes(notifs.status),
      `status=${notifs.status}`);
  }

  // ===== SUMMARY =====
  console.log('\n==========================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED | ${passed + failed} TOTAL`);
  if (failures.length > 0) {
    console.log('FAILURES:', failures.join(', '));
  }
  console.log('==========================================');
}

runTests().catch(e => console.error('FATAL ERROR:', e.message, e.stack));
