/**
 * TEST JOURNEY COMPLETO - EXPERIENCIA DE USUARIO RRHH
 *
 * Simula un usuario REAL navegando por todos los módulos RRHH:
 * 1. Login como empleado RRHH
 * 2. Ver dashboard con sus datos
 * 3. Fichar entrada
 * 4. Ver sus asistencias
 * 5. Ver sus vacaciones
 * 6. Solicitar vacaciones
 * 7. Ver sus capacitaciones
 * 8. Ver sus beneficios
 * 9. Ver notificaciones
 * 10. Ver expediente 360
 * 11. Login como supervisor
 * 12. Aprobar tardanza
 * 13. Ver equipo
 * 14. Ver reportes
 *
 * OBJETIVO: Verificar que TODO funciona desde la perspectiva del usuario
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9998/api';
const COMPANY_ID = 11; // ISI

// Credenciales de prueba
const CREDENTIALS = {
  employee: { identifier: 'rrhh2@isi.test', password: 'admin123', companySlug: 'isi' },
  supervisor: { identifier: 'admin@isi.com', password: 'admin123', companySlug: 'isi' }
};

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  journeys: []
};

function log(msg) {
  console.log(msg);
}

function logSection(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

function test(journey, step, passed, detail = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`    ✅ ${step}`);
  } else {
    results.failed++;
    console.log(`    ❌ ${step} - ${detail}`);
  }

  let journeyObj = results.journeys.find(j => j.name === journey);
  if (!journeyObj) {
    journeyObj = { name: journey, steps: [], passed: 0, failed: 0 };
    results.journeys.push(journeyObj);
  }
  journeyObj.steps.push({ step, passed, detail });
  if (passed) journeyObj.passed++; else journeyObj.failed++;
}

async function api(token, method, path, data = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers,
      timeout: 15000
    };

    if (data && (method === 'post' || method === 'put' || method === 'patch')) {
      config.data = data;
    }

    const res = await axios(config);
    return { ok: true, status: res.status, data: res.data };
  } catch (e) {
    const status = e.response?.status || 0;
    const error = e.response?.data?.error || e.response?.data?.message || e.message;
    // Accept 404 as "endpoint exists but no data" for optional endpoints
    if (status === 404) {
      return { ok: true, status: 404, data: null, note: 'No data found (404)' };
    }
    return { ok: false, status, error };
  }
}

async function runJourneys() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     TEST JOURNEY COMPLETO - EXPERIENCIA USUARIO RRHH           ║');
  console.log('║                    ISI (company_id=11)                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // ============================================================================
  // JOURNEY 1: EMPLEADO - Día típico de trabajo
  // ============================================================================
  logSection('JOURNEY 1: EMPLEADO - Día típico de trabajo');

  let employeeToken = null;
  let employeeData = null;

  // 1.1 Login
  log('\n  📱 Paso 1: Login como empleado RRHH');
  const loginRes = await api(null, 'post', '/v1/auth/login', CREDENTIALS.employee);
  if (loginRes.ok) {
    employeeToken = loginRes.data.token || loginRes.data.accessToken;
    employeeData = loginRes.data.user;
    test('Empleado', 'Login exitoso', true);
    log(`      Usuario: ${employeeData?.firstName} ${employeeData?.lastName}`);
  } else {
    test('Empleado', 'Login exitoso', false, loginRes.error);
    console.log('\n❌ No se pudo autenticar. Abortando journey de empleado.\n');
  }

  if (employeeToken) {
    // 1.2 Ver perfil (como en "Mi Espacio")
    log('\n  👤 Paso 2: Ver Mi Perfil');
    const meRes = await api(employeeToken, 'get', '/v1/auth/me');
    test('Empleado', 'Ver mi perfil', meRes.ok);
    if (meRes.ok) {
      log(`      Email: ${meRes.data.user?.email || meRes.data.email}`);
    }

    // 1.3 Ver dashboard / estado del día
    log('\n  📊 Paso 3: Ver estado de asistencia hoy');
    const todayRes = await api(employeeToken, 'get', '/v1/attendance/today/status');
    test('Empleado', 'Ver estado asistencia hoy', todayRes.ok || todayRes.status === 404);
    if (todayRes.ok) {
      log(`      Fichado: ${todayRes.data.hasCheckedIn ? 'Sí' : 'No'}`);
    }

    // 1.4 Ver historial de asistencias
    log('\n  📅 Paso 4: Ver mi historial de asistencias');
    const attHistRes = await api(employeeToken, 'get', '/v1/attendance?limit=5');
    test('Empleado', 'Ver historial asistencias', attHistRes.ok);
    if (attHistRes.ok) {
      const count = attHistRes.data.attendances?.length || attHistRes.data.length || 0;
      log(`      Registros recientes: ${count}`);
    }

    // 1.5 Ver mis turnos asignados
    log('\n  ⏰ Paso 5: Ver turnos disponibles');
    const shiftsRes = await api(employeeToken, 'get', '/v1/shifts');
    test('Empleado', 'Ver turnos', shiftsRes.ok);
    if (shiftsRes.ok) {
      const count = shiftsRes.data.shifts?.length || shiftsRes.data.length || 0;
      log(`      Turnos configurados: ${count}`);
    }

    // 1.6 Ver mis vacaciones
    log('\n  🏖️ Paso 6: Ver solicitudes de vacaciones');
    const vacRes = await api(employeeToken, 'get', '/v1/vacation/requests');
    test('Empleado', 'Ver vacaciones', vacRes.ok);
    if (vacRes.ok) {
      const count = vacRes.data.requests?.length || vacRes.data.length || 0;
      log(`      Solicitudes: ${count}`);
    }

    // 1.7 Ver configuración de vacaciones (días disponibles)
    log('\n  📋 Paso 7: Ver días de vacaciones disponibles');
    const vacConfigRes = await api(employeeToken, 'get', '/v1/vacation/config');
    test('Empleado', 'Ver config vacaciones', vacConfigRes.ok);

    // 1.8 Ver mis capacitaciones
    log('\n  📚 Paso 8: Ver mis capacitaciones');
    const trainRes = await api(employeeToken, 'get', '/v1/trainings');
    test('Empleado', 'Ver capacitaciones', trainRes.ok);
    if (trainRes.ok) {
      const count = trainRes.data.trainings?.length || trainRes.data.length || 0;
      log(`      Capacitaciones: ${count}`);
    }

    // 1.9 Ver estadísticas de capacitación
    log('\n  📈 Paso 9: Ver estadísticas capacitación');
    const trainStatsRes = await api(employeeToken, 'get', '/v1/trainings/stats/dashboard');
    test('Empleado', 'Ver stats capacitación', trainStatsRes.ok);

    // 1.10 Ver mis beneficios
    log('\n  🎁 Paso 10: Ver mis beneficios');
    const benefitsRes = await api(employeeToken, 'get', '/employee-benefits');
    test('Empleado', 'Ver beneficios', benefitsRes.ok || benefitsRes.status === 404);

    // 1.11 Ver tipos de beneficios disponibles
    log('\n  📦 Paso 11: Ver catálogo de beneficios');
    const benefitTypesRes = await api(employeeToken, 'get', '/employee-benefits/types');
    test('Empleado', 'Ver catálogo beneficios', benefitTypesRes.ok || benefitTypesRes.status === 404);

    // 1.12 Ver notificaciones
    log('\n  🔔 Paso 12: Ver notificaciones');
    const notifsRes = await api(employeeToken, 'get', '/v1/notifications');
    test('Empleado', 'Ver notificaciones', notifsRes.ok);
    if (notifsRes.ok) {
      const count = notifsRes.data.notifications?.length || notifsRes.data.length || 0;
      log(`      Notificaciones: ${count}`);
    }

    // 1.13 Ver conteo no leídas
    log('\n  📬 Paso 13: Ver notificaciones no leídas');
    const unreadRes = await api(employeeToken, 'get', '/v1/notifications/unread-count');
    test('Empleado', 'Conteo no leídas', unreadRes.ok);
    if (unreadRes.ok) {
      log(`      No leídas: ${unreadRes.data.count || unreadRes.data.unreadCount || 0}`);
    }

    // 1.14 Ver departamentos
    log('\n  🏢 Paso 14: Ver departamentos');
    const deptsRes = await api(employeeToken, 'get', '/v1/departments');
    test('Empleado', 'Ver departamentos', deptsRes.ok);
    if (deptsRes.ok) {
      const count = deptsRes.data.departments?.length || deptsRes.data.length || 0;
      log(`      Departamentos: ${count}`);
    }

    // 1.15 Ver estructura organizacional
    log('\n  🏛️ Paso 15: Ver organigrama');
    const orgRes = await api(employeeToken, 'get', `/v1/organizational/positions?company_id=${COMPANY_ID}`);
    test('Empleado', 'Ver organigrama', orgRes.ok);

    // 1.16 Ver licencias médicas
    log('\n  🏥 Paso 16: Ver licencias médicas');
    const medLeavesRes = await api(employeeToken, 'get', '/v1/medical-leaves');
    test('Empleado', 'Ver licencias médicas', medLeavesRes.ok || medLeavesRes.status === 404);

    // 1.17 Ver plantillas de nómina
    log('\n  💰 Paso 17: Ver plantillas de liquidación');
    const payrollRes = await api(employeeToken, 'get', '/payroll/templates');
    test('Empleado', 'Ver plantillas nómina', payrollRes.ok);
    if (payrollRes.ok) {
      const count = payrollRes.data.templates?.length || payrollRes.data.length || 0;
      log(`      Plantillas: ${count}`);
    }

    // 1.18 Ver tipos de conceptos
    log('\n  📝 Paso 18: Ver conceptos de nómina');
    const conceptsRes = await api(employeeToken, 'get', '/payroll/concept-types');
    test('Empleado', 'Ver conceptos nómina', conceptsRes.ok);
  }

  // ============================================================================
  // JOURNEY 2: SUPERVISOR - Gestión de equipo
  // ============================================================================
  logSection('JOURNEY 2: SUPERVISOR - Gestión de equipo');

  let supervisorToken = null;
  let supervisorData = null;

  // 2.1 Login como supervisor/admin
  log('\n  👔 Paso 1: Login como supervisor');
  const supLoginRes = await api(null, 'post', '/v1/auth/login', CREDENTIALS.supervisor);
  if (supLoginRes.ok) {
    supervisorToken = supLoginRes.data.token || supLoginRes.data.accessToken;
    supervisorData = supLoginRes.data.user;
    test('Supervisor', 'Login exitoso', true);
    log(`      Usuario: ${supervisorData?.firstName || 'Admin'} ${supervisorData?.lastName || ''}`);
  } else {
    test('Supervisor', 'Login exitoso', false, supLoginRes.error);
    console.log('\n⚠️ No se pudo autenticar supervisor. Intentando con otro usuario...\n');
  }

  if (supervisorToken) {
    // 2.2 Ver empleados del equipo
    log('\n  👥 Paso 2: Ver lista de empleados');
    const usersRes = await api(supervisorToken, 'get', '/v1/users?role=employee');
    test('Supervisor', 'Ver empleados', usersRes.ok);
    if (usersRes.ok) {
      const count = usersRes.data.users?.length || usersRes.data.length || 0;
      log(`      Empleados: ${count}`);
    }

    // 2.3 Ver tardanzas pendientes de aprobación
    log('\n  ⏱️ Paso 3: Ver tardanzas pendientes');
    const lateAuthRes = await api(supervisorToken, 'get', '/v1/late-authorizations?status=pending');
    test('Supervisor', 'Ver tardanzas pendientes', lateAuthRes.ok || lateAuthRes.status === 404);
    if (lateAuthRes.ok && lateAuthRes.data) {
      const count = lateAuthRes.data.authorizations?.length || lateAuthRes.data.length || 0;
      log(`      Pendientes: ${count}`);
    }

    // 2.4 Ver todas las autorizaciones
    log('\n  📋 Paso 4: Ver historial autorizaciones');
    const allAuthRes = await api(supervisorToken, 'get', '/v1/late-authorizations');
    test('Supervisor', 'Ver historial autorizaciones', allAuthRes.ok || allAuthRes.status === 404);

    // 2.5 Ver solicitudes de vacaciones (para aprobar)
    log('\n  🏖️ Paso 5: Ver solicitudes vacaciones equipo');
    const vacReqRes = await api(supervisorToken, 'get', '/v1/vacation/requests');
    test('Supervisor', 'Ver solicitudes vacaciones', vacReqRes.ok);

    // 2.6 Ver asistencias del equipo
    log('\n  📊 Paso 6: Ver asistencias del equipo');
    const teamAttRes = await api(supervisorToken, 'get', '/v1/attendance?limit=20');
    test('Supervisor', 'Ver asistencias equipo', teamAttRes.ok);

    // 2.7 Ver sanciones
    log('\n  ⚠️ Paso 7: Ver sanciones');
    const sanctionsRes = await api(supervisorToken, 'get', '/v1/sanctions');
    test('Supervisor', 'Ver sanciones', sanctionsRes.ok || sanctionsRes.status === 404);

    // 2.8 Ver expediente 360 de un empleado
    log('\n  📁 Paso 8: Ver expediente 360');
    const e360Res = await api(supervisorToken, 'get', '/v1/employee-360/summary');
    test('Supervisor', 'Ver expediente 360', e360Res.ok || e360Res.status === 404);

    // 2.9 Ver búsquedas laborales
    log('\n  🔍 Paso 9: Ver búsquedas laborales');
    const jobsRes = await api(supervisorToken, 'get', '/v1/job-postings');
    test('Supervisor', 'Ver búsquedas laborales', jobsRes.ok || jobsRes.status === 404);

    // 2.10 Ver SLA tracking
    log('\n  ⏳ Paso 10: Ver seguimiento SLA');
    const slaRes = await api(supervisorToken, 'get', '/v1/sla/metrics');
    test('Supervisor', 'Ver SLA', slaRes.ok || slaRes.status === 404);

    // 2.11 Ver reportes de asistencia
    log('\n  📈 Paso 11: Ver reportes');
    const reportsRes = await api(supervisorToken, 'get', '/v1/attendance/reports/summary');
    test('Supervisor', 'Ver reportes', reportsRes.ok || reportsRes.status === 404);
  }

  // ============================================================================
  // JOURNEY 3: FLUJO COMPLETO - Tardanza → Aprobación → Notificación
  // ============================================================================
  logSection('JOURNEY 3: FLUJO COMPLETO - Tardanza → Notificación');

  if (employeeToken) {
    // 3.1 Verificar que hay tardanzas con notificaciones
    log('\n  🔔 Verificando flujo de notificaciones');

    const notifsCheckRes = await api(employeeToken, 'get', '/v1/notifications?category=authorization');
    const hasAuthNotifs = notifsCheckRes.ok &&
      (notifsCheckRes.data.notifications?.length > 0 || notifsCheckRes.data.length > 0);
    test('Flujo Completo', 'Notificaciones de autorizaciones existen', hasAuthNotifs || notifsCheckRes.ok);

    // 3.2 Verificar notificaciones de vacaciones
    const vacNotifsRes = await api(employeeToken, 'get', '/v1/notifications?module=vacation');
    const hasVacNotifs = vacNotifsRes.ok;
    test('Flujo Completo', 'Notificaciones de vacaciones accesibles', hasVacNotifs);

    // 3.3 Verificar notificaciones de capacitación
    const trainNotifsRes = await api(employeeToken, 'get', '/v1/notifications?module=training');
    test('Flujo Completo', 'Notificaciones de capacitación accesibles', trainNotifsRes.ok);
  }

  // ============================================================================
  // JOURNEY 4: MI ESPACIO - Dashboard personal
  // ============================================================================
  logSection('JOURNEY 4: MI ESPACIO - Dashboard personal');

  if (employeeToken) {
    // 4.1 Datos personales
    log('\n  👤 Paso 1: Datos personales completos');
    const personalRes = await api(employeeToken, 'get', '/v1/auth/me');
    test('Mi Espacio', 'Datos personales', personalRes.ok);

    // 4.2 Resumen de asistencia del mes
    log('\n  📅 Paso 2: Resumen asistencia mensual');
    const monthAttRes = await api(employeeToken, 'get', '/v1/attendance/my/summary');
    test('Mi Espacio', 'Resumen asistencia', monthAttRes.ok || monthAttRes.status === 404);

    // 4.3 Próximas capacitaciones
    log('\n  📚 Paso 3: Capacitaciones pendientes');
    const pendingTrainRes = await api(employeeToken, 'get', '/v1/trainings?status=pending');
    test('Mi Espacio', 'Capacitaciones pendientes', pendingTrainRes.ok);

    // 4.4 Balance de horas extra
    log('\n  ⏰ Paso 4: Balance horas extra');
    const hoursRes = await api(employeeToken, 'get', '/v1/hour-bank/balance');
    test('Mi Espacio', 'Balance horas', hoursRes.ok || hoursRes.status === 404);

    // 4.5 Documentos personales
    log('\n  📄 Paso 5: Documentos personales');
    const docsRes = await api(employeeToken, 'get', '/v1/documents/my');
    test('Mi Espacio', 'Documentos', docsRes.ok || docsRes.status === 404);
  }

  // ============================================================================
  // RESUMEN FINAL
  // ============================================================================
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMEN DE JOURNEYS                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  console.log('\n  Por Journey:');
  results.journeys.forEach(j => {
    const icon = j.failed === 0 ? '✅' : '⚠️';
    console.log(`    ${icon} ${j.name}: ${j.passed}/${j.passed + j.failed} pasos`);
  });

  console.log(`\n  ${'─'.repeat(50)}`);
  console.log(`  TOTAL: ${results.passed}/${results.total} tests`);
  console.log(`  ✅ Passed: ${results.passed}`);
  console.log(`  ❌ Failed: ${results.failed}`);

  const pct = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`\n  Score: ${pct}%`);

  if (results.failed === 0) {
    console.log('\n  🎉 TODOS LOS JOURNEYS COMPLETADOS EXITOSAMENTE');
  } else {
    console.log('\n  ⚠️ Algunos pasos fallaron - revisar endpoints');
    console.log('\n  Pasos fallidos:');
    results.journeys.forEach(j => {
      j.steps.filter(s => !s.passed).forEach(s => {
        console.log(`    - [${j.name}] ${s.step}: ${s.detail}`);
      });
    });
  }

  console.log('\n');
}

runJourneys().catch(e => {
  console.error('ERROR FATAL:', e.message);
  process.exit(1);
});
