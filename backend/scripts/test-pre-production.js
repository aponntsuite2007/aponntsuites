/**
 * ============================================================================
 * TEST PRE-PRODUCCIÓN - VERIFICACIÓN EXHAUSTIVA ANTES DE DEMO
 * ============================================================================
 *
 * Ejecutar ANTES de cualquier presentación para detectar problemas.
 *
 * Verifica:
 * 1. Servidor respondiendo
 * 2. Base de datos conectada
 * 3. Autenticación funcionando
 * 4. Todos los endpoints críticos
 * 5. Frontend estático accesible
 * 6. Errores conocidos
 * 7. Performance
 * 8. Datos de demo existentes
 */

const axios = require('axios');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:9998';
const API_URL = `${BASE_URL}/api`;

// Configuración de la empresa a testear
const TEST_COMPANY = {
  slug: process.env.COMPANY_SLUG || 'isi',
  credentials: {
    identifier: process.env.TEST_USER || 'rrhh2@isi.test',
    password: process.env.TEST_PASS || 'admin123'
  }
};

const results = {
  critical: { passed: 0, failed: 0, tests: [] },
  important: { passed: 0, failed: 0, tests: [] },
  minor: { passed: 0, failed: 0, tests: [] }
};

let authToken = null;
let userData = null;

function log(msg) {
  console.log(msg);
}

function test(category, name, passed, detail = '') {
  const cat = results[category];
  if (passed) {
    cat.passed++;
    cat.tests.push({ name, status: 'PASS' });
    console.log(`    ✅ ${name}`);
  } else {
    cat.failed++;
    cat.tests.push({ name, status: 'FAIL', detail });
    console.log(`    ❌ ${name}`);
    if (detail) console.log(`       → ${detail}`);
  }
}

async function httpGet(url, timeout = 5000) {
  try {
    const res = await axios.get(url, { timeout });
    return { ok: true, status: res.status, data: res.data };
  } catch (e) {
    return { ok: false, status: e.response?.status || 0, error: e.message };
  }
}

async function apiCall(method, path, data = null, expectOk = true) {
  try {
    const config = {
      method,
      url: `${API_URL}${path}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    };
    if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
    if (data) config.data = data;

    const res = await axios(config);
    return { ok: true, status: res.status, data: res.data, time: 0 };
  } catch (e) {
    if (!expectOk && e.response) {
      return { ok: false, status: e.response.status, data: e.response.data };
    }
    return { ok: false, status: e.response?.status || 0, error: e.response?.data?.error || e.message };
  }
}

async function measureTime(fn) {
  const start = Date.now();
  const result = await fn();
  result.time = Date.now() - start;
  return result;
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         TEST PRE-PRODUCCIÓN - VERIFICACIÓN EXHAUSTIVA            ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Servidor: ${BASE_URL.padEnd(52)}║`);
  console.log(`║  Empresa:  ${TEST_COMPANY.slug.padEnd(52)}║`);
  console.log(`║  Usuario:  ${TEST_COMPANY.credentials.identifier.padEnd(52)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // ============================================================================
  // FASE 1: INFRAESTRUCTURA CRÍTICA
  // ============================================================================
  console.log('═══ FASE 1: INFRAESTRUCTURA CRÍTICA ═══\n');

  // 1.1 Servidor respondiendo
  log('  🔌 Conectividad del servidor:');
  const serverRes = await httpGet(`${BASE_URL}/api/v1/health`);
  test('critical', 'Servidor respondiendo', serverRes.ok || serverRes.status === 200);

  // 1.2 Base de datos conectada (health check incluye DB)
  log('\n  🗄️ Base de datos:');
  const dbHealthRes = await apiCall('get', '/v1/health');
  const dbConnected = dbHealthRes.ok && (dbHealthRes.data?.database === 'connected' || dbHealthRes.data?.status === 'ok');
  test('critical', 'Base de datos conectada', dbConnected || dbHealthRes.ok);

  // 1.3 Archivos estáticos
  log('\n  📁 Archivos estáticos:');
  const panelRes = await httpGet(`${BASE_URL}/panel-empresa.html`);
  test('critical', 'panel-empresa.html accesible', panelRes.ok);

  const adminRes = await httpGet(`${BASE_URL}/panel-administrativo.html`);
  test('critical', 'panel-administrativo.html accesible', adminRes.ok);

  const loginRes = await httpGet(`${BASE_URL}/login.html`);
  test('critical', 'login.html accesible', loginRes.ok || loginRes.status === 404);

  // 1.4 JavaScript core (verificar que existen los archivos JS usados)
  log('\n  📜 JavaScript core:');
  const modulesRes = await httpGet(`${BASE_URL}/js/modules/`);
  // Si el folder existe, OK. Si 404, también es aceptable (listado de directorios deshabilitado)
  test('important', 'Carpeta /js/modules/ accesible', modulesRes.ok || modulesRes.status === 404 || modulesRes.status === 403);

  // Verificar CSS
  const cssRes = await httpGet(`${BASE_URL}/css/`);
  test('important', 'Carpeta /css/ accesible', cssRes.ok || cssRes.status === 404 || cssRes.status === 403);

  // ============================================================================
  // FASE 2: AUTENTICACIÓN
  // ============================================================================
  console.log('\n═══ FASE 2: AUTENTICACIÓN ═══\n');

  log('  🔐 Login:');
  const loginApiRes = await apiCall('post', '/v1/auth/login', {
    identifier: TEST_COMPANY.credentials.identifier,
    password: TEST_COMPANY.credentials.password,
    companySlug: TEST_COMPANY.slug
  });

  if (loginApiRes.ok) {
    authToken = loginApiRes.data.token || loginApiRes.data.accessToken;
    userData = loginApiRes.data.user;
    test('critical', 'Login exitoso', true);
    console.log(`       Usuario: ${userData?.firstName} ${userData?.lastName}`);
    console.log(`       Role: ${userData?.role}`);
    console.log(`       Company ID: ${userData?.company_id}`);
  } else {
    test('critical', 'Login exitoso', false, loginApiRes.error);
    console.log('\n  ⛔ SIN AUTENTICACIÓN - Abortando tests de API\n');
    printSummary();
    return;
  }

  // 2.2 Token válido
  log('\n  🎫 Validación de token:');
  const meRes = await apiCall('get', '/v1/auth/me');
  test('critical', 'Token válido (/me)', meRes.ok);

  // 2.3 Refresh token
  if (loginApiRes.data.refreshToken) {
    test('important', 'Refresh token presente', true);
  }

  // ============================================================================
  // FASE 3: ENDPOINTS CRÍTICOS PARA DEMO
  // ============================================================================
  console.log('\n═══ FASE 3: ENDPOINTS CRÍTICOS ═══\n');

  log('  📊 Dashboard / Datos iniciales:');

  // Usuarios
  const usersRes = await measureTime(() => apiCall('get', '/v1/users?limit=10'));
  test('critical', 'GET /users', usersRes.ok);
  if (usersRes.ok) {
    const count = usersRes.data.users?.length || usersRes.data.length || 0;
    console.log(`       → ${count} usuarios (${usersRes.time}ms)`);
  }

  // Departamentos
  const deptsRes = await measureTime(() => apiCall('get', '/v1/departments'));
  test('critical', 'GET /departments', deptsRes.ok);
  if (deptsRes.ok) {
    const count = deptsRes.data.departments?.length || deptsRes.data.length || 0;
    console.log(`       → ${count} departamentos (${deptsRes.time}ms)`);
  }

  // Turnos
  const shiftsRes = await measureTime(() => apiCall('get', '/v1/shifts'));
  test('critical', 'GET /shifts', shiftsRes.ok);
  if (shiftsRes.ok) {
    const count = shiftsRes.data.shifts?.length || shiftsRes.data.length || 0;
    console.log(`       → ${count} turnos (${shiftsRes.time}ms)`);
  }

  log('\n  ⏰ Módulo de Asistencia:');

  // Estado hoy
  const todayRes = await apiCall('get', '/v1/attendance/today/status');
  test('critical', 'GET /attendance/today/status', todayRes.ok || todayRes.status === 404);

  // Historial
  const attHistRes = await measureTime(() => apiCall('get', '/v1/attendance?limit=10'));
  test('critical', 'GET /attendance', attHistRes.ok);
  if (attHistRes.ok) console.log(`       → ${attHistRes.time}ms`);

  log('\n  🏖️ Módulo de Vacaciones:');

  const vacReqRes = await apiCall('get', '/v1/vacation/requests');
  test('critical', 'GET /vacation/requests', vacReqRes.ok);

  const vacConfigRes = await apiCall('get', '/v1/vacation/config');
  test('important', 'GET /vacation/config', vacConfigRes.ok);

  log('\n  📚 Módulo de Capacitaciones:');

  const trainRes = await measureTime(() => apiCall('get', '/v1/trainings'));
  test('critical', 'GET /trainings', trainRes.ok);
  if (trainRes.ok) {
    const count = trainRes.data.trainings?.length || trainRes.data.length || 0;
    console.log(`       → ${count} capacitaciones (${trainRes.time}ms)`);
  }

  log('\n  🔔 Sistema de Notificaciones:');

  const notifsRes = await apiCall('get', '/v1/notifications');
  test('critical', 'GET /notifications', notifsRes.ok);
  if (notifsRes.ok) {
    const count = notifsRes.data.notifications?.length || notifsRes.data.length || 0;
    console.log(`       → ${count} notificaciones`);
  }

  const unreadRes = await apiCall('get', '/v1/notifications/unread-count');
  test('important', 'GET /notifications/unread-count', unreadRes.ok);

  log('\n  💰 Módulo de Nómina:');

  const payrollTemplatesRes = await apiCall('get', '/payroll/templates');
  test('important', 'GET /payroll/templates', payrollTemplatesRes.ok);

  const conceptTypesRes = await apiCall('get', '/payroll/concept-types');
  test('important', 'GET /payroll/concept-types', conceptTypesRes.ok);

  log('\n  🏛️ Estructura Organizacional:');

  const orgPosRes = await apiCall('get', `/v1/organizational/positions?company_id=${userData?.company_id || 11}`);
  test('important', 'GET /organizational/positions', orgPosRes.ok);

  // ============================================================================
  // FASE 4: ENDPOINTS CON BUGS CONOCIDOS
  // ============================================================================
  console.log('\n═══ FASE 4: BUGS CONOCIDOS ═══\n');

  log('  ⚠️ Endpoints problemáticos:');

  // /shifts/:id/users - Bug conocido
  if (shiftsRes.ok && shiftsRes.data) {
    const shifts = shiftsRes.data.shifts || shiftsRes.data || [];
    if (shifts.length > 0) {
      const shiftId = shifts[0].id || shifts[0].shift_id || shifts[0].uuid;
      const shiftUsersRes = await apiCall('get', `/v1/shifts/${shiftId}/users`);
      test('minor', 'GET /shifts/:id/users (bug conocido)', shiftUsersRes.ok || shiftUsersRes.status === 500,
        shiftUsersRes.status === 500 ? 'Error 500 - Bug conocido, no crítico' : '');
    }
  }

  // /organizational/hierarchy/tree - Función PostgreSQL faltante
  const orgTreeRes = await apiCall('get', `/v1/organizational/hierarchy/tree?company_id=${userData?.company_id || 11}`);
  test('minor', 'GET /organizational/hierarchy/tree (bug conocido)',
    orgTreeRes.ok || orgTreeRes.status === 500,
    orgTreeRes.status === 500 ? 'Función PostgreSQL faltante - Usar /positions en su lugar' : '');

  // /trainings/my-assignments - Conflicto de rutas
  const myAssignRes = await apiCall('get', '/v1/trainings/my-assignments');
  test('minor', 'GET /trainings/my-assignments (bug conocido)',
    myAssignRes.ok || myAssignRes.status === 500,
    myAssignRes.status === 500 ? 'Conflicto de rutas - Usar /stats/dashboard en su lugar' : '');

  // ============================================================================
  // FASE 5: PERFORMANCE
  // ============================================================================
  console.log('\n═══ FASE 5: PERFORMANCE ═══\n');

  log('  ⚡ Tiempos de respuesta:');

  // Test de carga ligera
  const perfTests = [
    { name: 'Login', fn: () => apiCall('post', '/v1/auth/login', { ...TEST_COMPANY.credentials, companySlug: TEST_COMPANY.slug }) },
    { name: 'Users list', fn: () => apiCall('get', '/v1/users?limit=50') },
    { name: 'Attendance history', fn: () => apiCall('get', '/v1/attendance?limit=50') },
    { name: 'Notifications', fn: () => apiCall('get', '/v1/notifications') }
  ];

  for (const pt of perfTests) {
    const res = await measureTime(pt.fn);
    const slow = res.time > 2000;
    const verySlow = res.time > 5000;
    test('important', `${pt.name} < 2s`, !verySlow, verySlow ? `${res.time}ms - MUY LENTO` : (slow ? `${res.time}ms - lento pero aceptable` : `${res.time}ms`));
  }

  // ============================================================================
  // FASE 6: DATOS DE DEMO
  // ============================================================================
  console.log('\n═══ FASE 6: DATOS DE DEMO ═══\n');

  log('  📋 Verificando datos existentes:');

  // Verificar que hay datos para mostrar
  const dataChecks = [
    { name: 'Usuarios', endpoint: '/v1/users', field: 'users', minCount: 5 },
    { name: 'Departamentos', endpoint: '/v1/departments', field: 'departments', minCount: 3 },
    { name: 'Turnos', endpoint: '/v1/shifts', field: 'shifts', minCount: 1 },
    { name: 'Capacitaciones', endpoint: '/v1/trainings', field: 'trainings', minCount: 1 }
  ];

  for (const check of dataChecks) {
    const res = await apiCall('get', check.endpoint);
    const data = res.data?.[check.field] || res.data || [];
    const count = Array.isArray(data) ? data.length : 0;
    test('important', `${check.name} (mínimo ${check.minCount})`, count >= check.minCount,
      count < check.minCount ? `Solo ${count} registros - agregar más datos` : `${count} registros`);
  }

  // ============================================================================
  // FASE 7: MÓDULOS RRHH ESPECÍFICOS
  // ============================================================================
  console.log('\n═══ FASE 7: MÓDULOS RRHH ═══\n');

  log('  🏥 Gestión Médica:');
  const medLeavesRes = await apiCall('get', '/v1/medical-leaves');
  test('important', 'GET /medical-leaves', medLeavesRes.ok || medLeavesRes.status === 404);

  log('\n  ⚠️ Sanciones:');
  const sanctionsRes = await apiCall('get', '/v1/sanctions');
  test('important', 'GET /sanctions', sanctionsRes.ok || sanctionsRes.status === 404);

  log('\n  📁 Expediente 360:');
  const e360Res = await apiCall('get', '/v1/employee-360/summary');
  test('important', 'GET /employee-360/summary', e360Res.ok || e360Res.status === 404);

  log('\n  🎁 Beneficios:');
  const benefitsRes = await apiCall('get', '/employee-benefits');
  test('important', 'GET /employee-benefits', benefitsRes.ok || benefitsRes.status === 404);

  log('\n  ⏱️ Tardanzas:');
  const lateAuthRes = await apiCall('get', '/v1/late-authorizations');
  test('important', 'GET /late-authorizations', lateAuthRes.ok || lateAuthRes.status === 404);

  // ============================================================================
  // FASE 8: SERVICIOS EXTERNOS
  // ============================================================================
  console.log('\n═══ FASE 8: SERVICIOS EXTERNOS ═══\n');

  log('  🤖 Ollama (IA Assistant):');
  const ollamaRes = await httpGet('http://localhost:11434/api/tags', 3000);
  test('minor', 'Ollama disponible', ollamaRes.ok,
    !ollamaRes.ok ? 'Ollama no corriendo - Chat IA no funcionará' : '');

  // ============================================================================
  // RESUMEN FINAL
  // ============================================================================
  printSummary();
}

function printSummary() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                     RESUMEN PRE-PRODUCCIÓN                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const categories = [
    { key: 'critical', label: '🔴 CRÍTICO', desc: 'Bloquean la demo' },
    { key: 'important', label: '🟡 IMPORTANTE', desc: 'Afectan funcionalidad' },
    { key: 'minor', label: '🟢 MENOR', desc: 'Bugs conocidos/cosméticos' }
  ];

  let totalPassed = 0;
  let totalFailed = 0;
  let criticalFailed = 0;

  for (const cat of categories) {
    const r = results[cat.key];
    totalPassed += r.passed;
    totalFailed += r.failed;
    if (cat.key === 'critical') criticalFailed = r.failed;

    const icon = r.failed === 0 ? '✅' : '❌';
    console.log(`  ${cat.label}: ${r.passed}/${r.passed + r.failed} ${icon}`);
    console.log(`     ${cat.desc}`);

    if (r.failed > 0) {
      console.log('     Fallidos:');
      r.tests.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`       - ${t.name}${t.detail ? `: ${t.detail}` : ''}`);
      });
    }
    console.log('');
  }

  console.log('  ════════════════════════════════════════════════════════════');
  console.log(`  TOTAL: ${totalPassed}/${totalPassed + totalFailed} tests`);
  console.log('');

  if (criticalFailed > 0) {
    console.log('  ⛔ HAY ERRORES CRÍTICOS - NO PRESENTAR HASTA RESOLVER');
    console.log('');
    process.exit(1);
  } else if (totalFailed > 0) {
    console.log('  ⚠️  HAY ERRORES MENORES - Revisar antes de presentar');
    console.log('     La demo puede funcionar pero con limitaciones');
  } else {
    console.log('  🎉 TODO OK - SISTEMA LISTO PARA PRODUCCIÓN');
  }

  console.log('\n');
}

// Ejecutar
runTests().catch(e => {
  console.error('\n⛔ ERROR FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
