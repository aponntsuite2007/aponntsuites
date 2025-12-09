/**
 * TESTS DE PERSISTENCIA Y AISLAMIENTO MULTI-TENANT
 *
 * Verifica:
 * 1. PERSISTENCIA: CRUD completo - crear, leer, actualizar, eliminar y verificar
 * 2. AISLAMIENTO: Empresa A NO puede ver/modificar datos de Empresa B
 */

const http = require('http');

const BASE_URL = process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : 'http://localhost:9998';

// Credenciales de dos empresas diferentes para tests multi-tenant
const COMPANIES = {
  ISI: {
    companyId: 11,
    identifier: 'admin',
    password: 'admin123',
    name: 'ISI'
  },
  // Segunda empresa para tests multi-tenant (se obtiene dinámicamente)
  OTHER: null
};

let tokens = {};
let testResults = {
  persistence: { passed: 0, failed: 0, tests: [] },
  multiTenant: { passed: 0, failed: 0, tests: [] }
};

// Helper para hacer requests HTTP
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Login para una empresa
async function login(company) {
  try {
    console.log(`   🔄 Intentando login: identifier=${company.identifier}, companyId=${company.companyId}`);
    const res = await makeRequest('POST', '/api/v1/auth/login', {
      identifier: company.identifier,
      password: company.password,
      companyId: company.companyId
    });

    console.log(`   📊 Response status: ${res.status}`);

    if (res.status === 200 && res.data.token) {
      return res.data.token;
    }
    throw new Error(`Login failed for ${company.name} (status ${res.status}): ${JSON.stringify(res.data)}`);
  } catch (error) {
    console.log(`   ⚠️ Error details: ${error.message}`);
    throw error;
  }
}

// Generar ID único para tests
function uniqueId() {
  return `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// TESTS DE PERSISTENCIA CRUD
// ============================================================================

async function testUsersPersistence(token) {
  const testName = 'users_crud_persistence';
  const uniqueEmail = `test_${uniqueId()}@test.com`;
  let createdUserId = null;

  try {
    // CREATE
    const createRes = await makeRequest('POST', '/api/v1/users', {
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      password: 'Test1234!',
      role: 'employee',
      employeeId: uniqueId()
    }, token);

    if (createRes.status !== 201 && createRes.status !== 200) {
      throw new Error(`CREATE failed: ${JSON.stringify(createRes.data)}`);
    }

    createdUserId = createRes.data.data?.user_id || createRes.data.user?.user_id || createRes.data.user_id ||
                    createRes.data.data?.id || createRes.data.user?.id || createRes.data.id;
    if (!createdUserId) {
      throw new Error(`No user_id returned: ${JSON.stringify(createRes.data)}`);
    }

    // READ - Verificar que existe
    const readRes = await makeRequest('GET', `/api/v1/users/${createdUserId}`, null, token);
    if (readRes.status !== 200) {
      throw new Error(`READ failed: ${JSON.stringify(readRes.data)}`);
    }

    // UPDATE
    const updateRes = await makeRequest('PUT', `/api/v1/users/${createdUserId}`, {
      firstName: 'Updated',
      lastName: 'TestUser'
    }, token);

    if (updateRes.status !== 200) {
      throw new Error(`UPDATE failed: ${JSON.stringify(updateRes.data)}`);
    }

    // VERIFY UPDATE persisted
    const verifyRes = await makeRequest('GET', `/api/v1/users/${createdUserId}`, null, token);
    const userData = verifyRes.data.data || verifyRes.data.user || verifyRes.data;
    if (userData.firstName !== 'Updated') {
      throw new Error(`UPDATE not persisted: firstName is ${userData.firstName}`);
    }

    // DELETE
    const deleteRes = await makeRequest('DELETE', `/api/v1/users/${createdUserId}`, null, token);
    if (deleteRes.status !== 200 && deleteRes.status !== 204) {
      throw new Error(`DELETE failed: ${JSON.stringify(deleteRes.data)}`);
    }

    // VERIFY DELETE - should not find user
    const verifyDeleteRes = await makeRequest('GET', `/api/v1/users/${createdUserId}`, null, token);
    if (verifyDeleteRes.status === 200 && verifyDeleteRes.data.data && !verifyDeleteRes.data.data.is_deleted) {
      throw new Error('DELETE not persisted: user still exists');
    }

    testResults.persistence.passed++;
    testResults.persistence.tests.push({ name: testName, status: 'PASSED' });
    console.log(`  ✅ ${testName}`);

  } catch (error) {
    testResults.persistence.failed++;
    testResults.persistence.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);

    // Cleanup on failure
    if (createdUserId) {
      try {
        await makeRequest('DELETE', `/api/v1/users/${createdUserId}`, null, token);
      } catch (e) {}
    }
  }
}

async function testDepartmentsPersistence(token) {
  const testName = 'departments_crud_persistence';
  const uniqueName = `Dept_${uniqueId()}`;
  let createdId = null;

  try {
    // CREATE
    const createRes = await makeRequest('POST', '/api/v1/departments', {
      name: uniqueName,
      description: 'Test department',
      is_active: true
    }, token);

    if (createRes.status !== 201 && createRes.status !== 200) {
      throw new Error(`CREATE failed: ${JSON.stringify(createRes.data)}`);
    }

    createdId = createRes.data.data?.department_id || createRes.data.department?.department_id ||
                createRes.data.department_id || createRes.data.data?.id || createRes.data.id;
    if (!createdId) {
      throw new Error(`No department_id returned: ${JSON.stringify(createRes.data)}`);
    }

    // READ
    const readRes = await makeRequest('GET', `/api/v1/departments/${createdId}`, null, token);
    if (readRes.status !== 200) {
      throw new Error(`READ failed: ${JSON.stringify(readRes.data)}`);
    }

    // UPDATE
    const newName = `Updated_${uniqueId()}`;
    const updateRes = await makeRequest('PUT', `/api/v1/departments/${createdId}`, {
      name: newName
    }, token);

    if (updateRes.status !== 200) {
      throw new Error(`UPDATE failed: ${JSON.stringify(updateRes.data)}`);
    }

    // VERIFY UPDATE
    const verifyRes = await makeRequest('GET', `/api/v1/departments/${createdId}`, null, token);
    const deptData = verifyRes.data.data || verifyRes.data.department || verifyRes.data;
    if (deptData.name !== newName) {
      throw new Error(`UPDATE not persisted: name is ${deptData.name}`);
    }

    // DELETE
    const deleteRes = await makeRequest('DELETE', `/api/v1/departments/${createdId}`, null, token);
    if (deleteRes.status !== 200 && deleteRes.status !== 204) {
      throw new Error(`DELETE failed: ${JSON.stringify(deleteRes.data)}`);
    }

    testResults.persistence.passed++;
    testResults.persistence.tests.push({ name: testName, status: 'PASSED' });
    console.log(`  ✅ ${testName}`);

  } catch (error) {
    testResults.persistence.failed++;
    testResults.persistence.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);

    if (createdId) {
      try { await makeRequest('DELETE', `/api/v1/departments/${createdId}`, null, token); } catch (e) {}
    }
  }
}

async function testShiftsPersistence(token) {
  const testName = 'shifts_list_read';

  try {
    // LIST shifts
    const listRes = await makeRequest('GET', '/api/v1/shifts', null, token);
    if (listRes.status !== 200) {
      throw new Error(`LIST failed: ${JSON.stringify(listRes.data)}`);
    }

    const shifts = listRes.data.shifts || listRes.data.data || listRes.data;
    if (!Array.isArray(shifts)) {
      throw new Error(`Expected array of shifts but got: ${typeof shifts}`);
    }

    // Verificar que la lista se obtuvo correctamente (multi-tenant: solo devuelve turnos de esta empresa)
    // Si la empresa no tiene turnos, es válido (0 turnos = OK)

    testResults.persistence.passed++;
    testResults.persistence.tests.push({ name: testName, status: 'PASSED', shiftsCount: shifts.length });
    console.log(`  ✅ ${testName} (${shifts.length} turnos de la empresa)`);

  } catch (error) {
    testResults.persistence.failed++;
    testResults.persistence.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
  }
}

// Tests adicionales de persistencia
async function testBranchesPersistence(token) {
  const testName = 'branches_list_read';

  try {
    const listRes = await makeRequest('GET', '/api/v1/branches', null, token);
    if (listRes.status !== 200) {
      throw new Error(`LIST failed: ${JSON.stringify(listRes.data)}`);
    }

    const branches = listRes.data.data || listRes.data.branches || listRes.data;

    testResults.persistence.passed++;
    testResults.persistence.tests.push({ name: testName, status: 'PASSED', branchesCount: Array.isArray(branches) ? branches.length : 0 });
    console.log(`  ✅ ${testName} (${Array.isArray(branches) ? branches.length : 0} sucursales)`);

  } catch (error) {
    testResults.persistence.failed++;
    testResults.persistence.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
  }
}

async function testAttendancePersistence(token) {
  const testName = 'attendance_list_read';

  try {
    const listRes = await makeRequest('GET', '/api/v1/attendance', null, token);
    if (listRes.status !== 200) {
      throw new Error(`LIST failed: ${JSON.stringify(listRes.data)}`);
    }

    const attendance = listRes.data.data || listRes.data.attendance || listRes.data;

    testResults.persistence.passed++;
    testResults.persistence.tests.push({ name: testName, status: 'PASSED', attendanceCount: Array.isArray(attendance) ? attendance.length : 0 });
    console.log(`  ✅ ${testName} (${Array.isArray(attendance) ? attendance.length : 0} registros)`);

  } catch (error) {
    testResults.persistence.failed++;
    testResults.persistence.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
  }
}

async function testKiosksPersistence(token) {
  const testName = 'kiosks_list_read';

  try {
    const listRes = await makeRequest('GET', '/api/v1/kiosks', null, token);
    if (listRes.status !== 200) {
      throw new Error(`LIST failed: ${JSON.stringify(listRes.data)}`);
    }

    const kiosks = listRes.data.data || listRes.data.kiosks || listRes.data;

    testResults.persistence.passed++;
    testResults.persistence.tests.push({ name: testName, status: 'PASSED', kiosksCount: Array.isArray(kiosks) ? kiosks.length : 0 });
    console.log(`  ✅ ${testName} (${Array.isArray(kiosks) ? kiosks.length : 0} kioscos)`);

  } catch (error) {
    testResults.persistence.failed++;
    testResults.persistence.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
  }
}

async function testVacationConfigPersistence(token) {
  const testName = 'vacation_config_read';

  try {
    // READ current config - test that the endpoint returns data
    const readRes = await makeRequest('GET', '/api/v1/vacation/config', null, token);
    if (readRes.status !== 200) {
      throw new Error(`READ failed: ${JSON.stringify(readRes.data)}`);
    }

    const configData = readRes.data.data || readRes.data;

    // Verify that the config has expected structure
    if (!configData) {
      throw new Error('No config data returned');
    }

    testResults.persistence.passed++;
    testResults.persistence.tests.push({ name: testName, status: 'PASSED' });
    console.log(`  ✅ ${testName}`);

  } catch (error) {
    testResults.persistence.failed++;
    testResults.persistence.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
  }
}

async function testNotificationsPersistence(token) {
  const testName = 'notifications_list_and_read';

  try {
    // LIST notifications
    const listRes = await makeRequest('GET', '/api/v1/enterprise/notifications', null, token);
    if (listRes.status !== 200) {
      throw new Error(`LIST failed: ${JSON.stringify(listRes.data)}`);
    }

    const notifications = listRes.data.data || listRes.data.notifications || listRes.data;
    if (!Array.isArray(notifications)) {
      throw new Error(`Expected array of notifications but got: ${typeof notifications}`);
    }

    // If there are notifications, try to read one by ID
    if (notifications.length > 0) {
      const firstNotif = notifications[0];
      const notifId = firstNotif.id || firstNotif.notification_id;

      const readRes = await makeRequest('GET', `/api/v1/enterprise/notifications/${notifId}`, null, token);
      if (readRes.status !== 200) {
        throw new Error(`READ single notification failed: ${JSON.stringify(readRes.data)}`);
      }
    }

    // Also test stats endpoint
    const statsRes = await makeRequest('GET', '/api/v1/enterprise/notifications/stats', null, token);
    if (statsRes.status !== 200) {
      throw new Error(`STATS failed: ${JSON.stringify(statsRes.data)}`);
    }

    testResults.persistence.passed++;
    testResults.persistence.tests.push({ name: testName, status: 'PASSED', notificationsCount: notifications.length });
    console.log(`  ✅ ${testName} (${notifications.length} notificaciones encontradas)`);

  } catch (error) {
    testResults.persistence.failed++;
    testResults.persistence.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
  }
}

async function testSanctionsPersistence(token) {
  const testName = 'sanctions_list_read';

  try {
    // READ sanctions list
    const listRes = await makeRequest('GET', '/api/v1/sanctions', null, token);
    if (listRes.status !== 200) {
      throw new Error(`READ list failed: ${JSON.stringify(listRes.data)}`);
    }

    // READ sanction types
    const typesRes = await makeRequest('GET', '/api/v1/sanctions/types', null, token);
    if (typesRes.status !== 200) {
      throw new Error(`READ types failed: ${JSON.stringify(typesRes.data)}`);
    }

    testResults.persistence.passed++;
    testResults.persistence.tests.push({ name: testName, status: 'PASSED' });
    console.log(`  ✅ ${testName}`);

  } catch (error) {
    testResults.persistence.failed++;
    testResults.persistence.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
  }
}

// ============================================================================
// TESTS DE AISLAMIENTO MULTI-TENANT
// ============================================================================

async function testUsersIsolation(tokenA, tokenB, companyAName, companyBName) {
  const testName = `users_isolation_${companyAName}_vs_${companyBName}`;
  let createdUserId = null;

  try {
    // Company A creates a user
    const uniqueEmail = `isolation_${uniqueId()}@test.com`;
    const createRes = await makeRequest('POST', '/api/v1/users', {
      firstName: 'Isolation',
      lastName: 'Test',
      email: uniqueEmail,
      password: 'Test1234!',
      role: 'employee',
      employeeId: uniqueId()
    }, tokenA);

    if (createRes.status !== 201 && createRes.status !== 200) {
      throw new Error(`Company A CREATE failed: ${JSON.stringify(createRes.data)}`);
    }

    createdUserId = createRes.data.data?.user_id || createRes.data.user?.user_id || createRes.data.user_id;

    // Company B tries to READ user created by Company A
    const readRes = await makeRequest('GET', `/api/v1/users/${createdUserId}`, null, tokenB);

    // Should either return 403/404 or return null/empty data
    if (readRes.status === 200) {
      const userData = readRes.data.data || readRes.data.user || readRes.data;
      if (userData && userData.user_id === createdUserId && !userData.error) {
        throw new Error(`ISOLATION BREACH: Company ${companyBName} can read user from Company ${companyAName}`);
      }
    }

    // Company B tries to UPDATE user created by Company A
    const updateRes = await makeRequest('PUT', `/api/v1/users/${createdUserId}`, {
      firstName: 'Hacked'
    }, tokenB);

    if (updateRes.status === 200) {
      throw new Error(`ISOLATION BREACH: Company ${companyBName} can update user from Company ${companyAName}`);
    }

    // Company B tries to DELETE user created by Company A
    const deleteRes = await makeRequest('DELETE', `/api/v1/users/${createdUserId}`, null, tokenB);

    if (deleteRes.status === 200 || deleteRes.status === 204) {
      throw new Error(`ISOLATION BREACH: Company ${companyBName} can delete user from Company ${companyAName}`);
    }

    // Cleanup - Company A deletes its own user
    await makeRequest('DELETE', `/api/v1/users/${createdUserId}`, null, tokenA);

    testResults.multiTenant.passed++;
    testResults.multiTenant.tests.push({ name: testName, status: 'PASSED' });
    console.log(`  ✅ ${testName}`);

  } catch (error) {
    testResults.multiTenant.failed++;
    testResults.multiTenant.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);

    // Cleanup
    if (createdUserId) {
      try { await makeRequest('DELETE', `/api/v1/users/${createdUserId}`, null, tokenA); } catch (e) {}
    }
  }
}

async function testDepartmentsIsolation(tokenA, tokenB, companyAName, companyBName) {
  const testName = `departments_isolation_${companyAName}_vs_${companyBName}`;
  let createdId = null;

  try {
    // Company A creates a department
    const createRes = await makeRequest('POST', '/api/departments', {
      name: `Isolated_Dept_${uniqueId()}`,
      description: 'Test isolation',
      is_active: true
    }, tokenA);

    if (createRes.status !== 201 && createRes.status !== 200) {
      throw new Error(`Company A CREATE failed: ${JSON.stringify(createRes.data)}`);
    }

    createdId = createRes.data.data?.department_id || createRes.data.department?.department_id ||
                createRes.data.department_id || createRes.data.data?.id || createRes.data.id;

    // Company B tries to READ
    const readRes = await makeRequest('GET', `/api/departments/${createdId}`, null, tokenB);

    if (readRes.status === 200) {
      const deptData = readRes.data.data || readRes.data.department || readRes.data;
      if (deptData && deptData.department_id === createdId && !deptData.error) {
        throw new Error(`ISOLATION BREACH: Company ${companyBName} can read department from ${companyAName}`);
      }
    }

    // Company B tries to UPDATE
    const updateRes = await makeRequest('PUT', `/api/departments/${createdId}`, {
      name: 'Hacked_Dept'
    }, tokenB);

    if (updateRes.status === 200) {
      throw new Error(`ISOLATION BREACH: Company ${companyBName} can update department from ${companyAName}`);
    }

    // Cleanup
    await makeRequest('DELETE', `/api/departments/${createdId}`, null, tokenA);

    testResults.multiTenant.passed++;
    testResults.multiTenant.tests.push({ name: testName, status: 'PASSED' });
    console.log(`  ✅ ${testName}`);

  } catch (error) {
    testResults.multiTenant.failed++;
    testResults.multiTenant.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);

    if (createdId) {
      try { await makeRequest('DELETE', `/api/departments/${createdId}`, null, tokenA); } catch (e) {}
    }
  }
}

async function testShiftsIsolation(tokenA, tokenB, companyAName, companyBName) {
  const testName = `shifts_isolation_${companyAName}_vs_${companyBName}`;
  let createdId = null;

  try {
    // Company A creates a shift
    const createRes = await makeRequest('POST', '/api/shifts', {
      name: `Isolated_Shift_${uniqueId()}`,
      start_time: '08:00:00',
      end_time: '17:00:00',
      is_active: true
    }, tokenA);

    if (createRes.status !== 201 && createRes.status !== 200) {
      throw new Error(`Company A CREATE failed: ${JSON.stringify(createRes.data)}`);
    }

    createdId = createRes.data.data?.shift_id || createRes.data.shift?.shift_id ||
                createRes.data.shift_id || createRes.data.data?.id || createRes.data.id;

    // Company B tries to READ
    const readRes = await makeRequest('GET', `/api/shifts/${createdId}`, null, tokenB);

    if (readRes.status === 200) {
      const shiftData = readRes.data.data || readRes.data.shift || readRes.data;
      if (shiftData && shiftData.shift_id === createdId && !shiftData.error) {
        throw new Error(`ISOLATION BREACH: Company ${companyBName} can read shift from ${companyAName}`);
      }
    }

    // Cleanup
    await makeRequest('DELETE', `/api/shifts/${createdId}`, null, tokenA);

    testResults.multiTenant.passed++;
    testResults.multiTenant.tests.push({ name: testName, status: 'PASSED' });
    console.log(`  ✅ ${testName}`);

  } catch (error) {
    testResults.multiTenant.failed++;
    testResults.multiTenant.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);

    if (createdId) {
      try { await makeRequest('DELETE', `/api/shifts/${createdId}`, null, tokenA); } catch (e) {}
    }
  }
}

async function testListIsolation(tokenA, tokenB, companyAName, companyBName) {
  const testName = `list_isolation_${companyAName}_vs_${companyBName}`;

  try {
    // Get users list for Company A
    const usersA = await makeRequest('GET', '/api/v1/users', null, tokenA);
    // Get users list for Company B
    const usersB = await makeRequest('GET', '/api/v1/users', null, tokenB);

    if (usersA.status !== 200 || usersB.status !== 200) {
      throw new Error('Failed to get users list');
    }

    const userIdsA = (usersA.data.data || []).map(u => u.user_id);
    const userIdsB = (usersB.data.data || []).map(u => u.user_id);

    // Check for overlapping user IDs (should be none in proper multi-tenant)
    const overlap = userIdsA.filter(id => userIdsB.includes(id));

    if (overlap.length > 0) {
      throw new Error(`ISOLATION BREACH: Found ${overlap.length} overlapping user IDs between companies`);
    }

    // Same for departments
    const deptsA = await makeRequest('GET', '/api/departments', null, tokenA);
    const deptsB = await makeRequest('GET', '/api/departments', null, tokenB);

    const deptIdsA = (deptsA.data.data || deptsA.data || []).map(d => d.department_id || d.id);
    const deptIdsB = (deptsB.data.data || deptsB.data || []).map(d => d.department_id || d.id);

    const deptOverlap = deptIdsA.filter(id => deptIdsB.includes(id));

    if (deptOverlap.length > 0) {
      throw new Error(`ISOLATION BREACH: Found ${deptOverlap.length} overlapping department IDs`);
    }

    testResults.multiTenant.passed++;
    testResults.multiTenant.tests.push({ name: testName, status: 'PASSED' });
    console.log(`  ✅ ${testName}`);

  } catch (error) {
    testResults.multiTenant.failed++;
    testResults.multiTenant.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
  }
}

async function testAttendanceIsolation(tokenA, tokenB, companyAName, companyBName) {
  const testName = `attendance_isolation_${companyAName}_vs_${companyBName}`;

  try {
    // Get attendance for Company A
    const attendanceA = await makeRequest('GET', '/api/attendance?limit=100', null, tokenA);
    // Get attendance for Company B
    const attendanceB = await makeRequest('GET', '/api/attendance?limit=100', null, tokenB);

    if (attendanceA.status !== 200 || attendanceB.status !== 200) {
      throw new Error('Failed to get attendance records');
    }

    const recordsA = attendanceA.data.data || attendanceA.data.records || [];
    const recordsB = attendanceB.data.data || attendanceB.data.records || [];

    // Check for overlapping attendance IDs
    const idsA = recordsA.map(r => r.attendance_id || r.id);
    const idsB = recordsB.map(r => r.attendance_id || r.id);

    const overlap = idsA.filter(id => idsB.includes(id));

    if (overlap.length > 0) {
      throw new Error(`ISOLATION BREACH: Found ${overlap.length} overlapping attendance records`);
    }

    testResults.multiTenant.passed++;
    testResults.multiTenant.tests.push({ name: testName, status: 'PASSED' });
    console.log(`  ✅ ${testName}`);

  } catch (error) {
    testResults.multiTenant.failed++;
    testResults.multiTenant.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   PERSISTENCE & MULTI-TENANT ISOLATION TESTS                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('📅 Inicio:', new Date().toISOString());
  console.log('🌐 Base URL:', BASE_URL);

  // ========== AUTHENTICATION ==========
  console.log('\n🔐 AUTENTICACIÓN\n');

  try {
    tokens.ISI = await login(COMPANIES.ISI);
    console.log(`  ✅ Login ISI exitoso`);
  } catch (error) {
    console.log(`  ❌ Login ISI fallido: ${error.message}`);
  }

  // Intentar obtener otra empresa para tests multi-tenant
  try {
    // Buscar otra empresa diferente de ISI (company_id != 11)
    const companiesRes = await makeRequest('GET', '/api/aponnt/dashboard/companies', null, tokens.ISI);
    if (companiesRes.status === 200 && companiesRes.data.length > 1) {
      const otherCompany = companiesRes.data.find(c => c.id !== 11 && c.is_active);
      if (otherCompany) {
        console.log(`  ℹ️  Empresa alternativa encontrada: ${otherCompany.name} (ID: ${otherCompany.id})`);
        COMPANIES.OTHER = {
          companyId: otherCompany.id,
          identifier: 'admin',
          password: 'admin123',
          name: otherCompany.name
        };
        try {
          tokens.OTHER = await login(COMPANIES.OTHER);
          console.log(`  ✅ Login ${otherCompany.name} exitoso`);
        } catch (e) {
          console.log(`  ⚠️  No se pudo autenticar con ${otherCompany.name}`);
        }
      }
    }
  } catch (e) {
    console.log(`  ⚠️  No se pudieron obtener otras empresas para multi-tenant`);
  }

  if (!tokens.ISI) {
    console.log('\n❌ No se pudo autenticar con ISI. Abortando tests.');
    return;
  }

  // ========== PERSISTENCE TESTS ==========
  console.log('\n📦 TESTS DE PERSISTENCIA CRUD\n');

  await testUsersPersistence(tokens.ISI);
  await testDepartmentsPersistence(tokens.ISI);
  await testShiftsPersistence(tokens.ISI);
  await testBranchesPersistence(tokens.ISI);
  await testAttendancePersistence(tokens.ISI);
  await testKiosksPersistence(tokens.ISI);
  await testVacationConfigPersistence(tokens.ISI);
  await testNotificationsPersistence(tokens.ISI);
  await testSanctionsPersistence(tokens.ISI);

  // ========== MULTI-TENANT TESTS ==========
  if (tokens.ISI && tokens.OTHER && COMPANIES.OTHER) {
    console.log('\n🏢 TESTS DE AISLAMIENTO MULTI-TENANT\n');

    await testUsersIsolation(tokens.ISI, tokens.OTHER, 'ISI', COMPANIES.OTHER.name);
    await testDepartmentsIsolation(tokens.ISI, tokens.OTHER, 'ISI', COMPANIES.OTHER.name);
    await testShiftsIsolation(tokens.ISI, tokens.OTHER, 'ISI', COMPANIES.OTHER.name);
    await testListIsolation(tokens.ISI, tokens.OTHER, 'ISI', COMPANIES.OTHER.name);
    await testAttendanceIsolation(tokens.ISI, tokens.OTHER, 'ISI', COMPANIES.OTHER.name);
  } else {
    console.log('\n⚠️  TESTS MULTI-TENANT OMITIDOS (falta token de segunda empresa)\n');
    console.log('   Para tests multi-tenant, se necesitan 2 empresas con usuarios admin configurados.');
  }

  // ========== RESULTS ==========
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTADOS FINALES                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const totalPersistence = testResults.persistence.passed + testResults.persistence.failed;
  const totalMultiTenant = testResults.multiTenant.passed + testResults.multiTenant.failed;
  const totalTests = totalPersistence + totalMultiTenant;
  const totalPassed = testResults.persistence.passed + testResults.multiTenant.passed;
  const totalFailed = testResults.persistence.failed + testResults.multiTenant.failed;

  console.log('📦 PERSISTENCIA CRUD:');
  console.log(`   ✅ Passed: ${testResults.persistence.passed}/${totalPersistence}`);
  console.log(`   ❌ Failed: ${testResults.persistence.failed}/${totalPersistence}`);

  console.log('\n🏢 AISLAMIENTO MULTI-TENANT:');
  console.log(`   ✅ Passed: ${testResults.multiTenant.passed}/${totalMultiTenant}`);
  console.log(`   ❌ Failed: ${testResults.multiTenant.failed}/${totalMultiTenant}`);

  console.log('\n📊 TOTAL:');
  console.log(`   Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${totalPassed}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`   📈 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

  if (totalFailed > 0) {
    console.log('\n❌ TESTS FALLIDOS:');
    [...testResults.persistence.tests, ...testResults.multiTenant.tests]
      .filter(t => t.status === 'FAILED')
      .forEach(t => {
        console.log(`   • ${t.name}: ${t.error}`);
      });
  }

  console.log('\n📅 Fin:', new Date().toISOString());

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    'test-results-persistence-multitenant.json',
    JSON.stringify(testResults, null, 2)
  );
  console.log('\n📄 Resultados guardados en test-results-persistence-multitenant.json');
}

runAllTests().catch(console.error);
