/**
 * API Routes Mapping - Sistema de Asistencia Biometrico
 * =====================================================
 *
 * Este archivo documenta el mapeo de rutas API disponibles en el sistema.
 * Generado automaticamente para diagnosticar inconsistencias en tests E2E.
 *
 * Fecha: 2026-01-25
 *
 * PROBLEMAS DETECTADOS EN TEST E2E:
 * 1. GET /v1/companies/:id - No funciona
 * 2. GET /v1/attendance/today - No funciona
 * 3. GET /v1/shift-assignments - No montado
 * 4. GET /v1/vacations - La ruta correcta es /v1/vacation (sin s)
 * 5. GET /v1/trainings/assignments - No montado
 * 6. GET /v1/notifications/unread - No existe
 * 7. GET /v1/organizational-positions - No montado
 */

const API_ROUTES_MAPPING = {
  // ============================================================================
  // PROBLEMA 1: GET /v1/companies/:id
  // ============================================================================
  companies: {
    mountedAt: '/api/v1/companies',
    routeFile: 'src/routes/companyRoutes.js',
    availableRoutes: [
      { method: 'GET',    path: '/public-list',         description: 'Lista publica de empresas (sin auth)' },
      { method: 'GET',    path: '/',                    description: 'Lista todas las empresas (super_admin)', auth: true },
      { method: 'GET',    path: '/:slug',               description: 'Obtener empresa por SLUG (no por ID)', auth: false },
      { method: 'POST',   path: '/',                    description: 'Crear empresa', auth: 'super_admin' },
      { method: 'PUT',    path: '/:id',                 description: 'Actualizar empresa por ID', auth: 'super_admin|company_admin' },
      { method: 'DELETE', path: '/:id',                 description: 'Eliminar empresa', auth: 'super_admin' },
      { method: 'PATCH',  path: '/:id/toggle-status',   description: 'Toggle estado empresa', auth: 'super_admin' },
      { method: 'GET',    path: '/:slug/stats',         description: 'Estadisticas por SLUG', auth: true },
      { method: 'POST',   path: '/:id/onboarding/activate', description: 'Activar onboarding', auth: false }
    ],
    issue: {
      expected: 'GET /api/v1/companies/:id',
      actual: 'GET /api/v1/companies/:slug',
      note: 'La ruta usa SLUG no ID. Para obtener por ID se debe usar PUT/DELETE',
      solution: 'Usar GET /api/v1/companies/:slug con el slug de la empresa'
    }
  },

  // ============================================================================
  // PROBLEMA 2: GET /v1/attendance/today
  // ============================================================================
  attendance: {
    mountedAt: '/api/v1/attendance',
    routeFile: 'src/routes/attendanceRoutes.js',
    availableRoutes: [
      { method: 'GET',    path: '/',                    description: 'Lista de asistencias', auth: true },
      { method: 'GET',    path: '/stats',               description: 'Estadisticas generales', auth: true },
      { method: 'GET',    path: '/stats/summary',       description: 'Resumen estadistico', auth: true },
      { method: 'GET',    path: '/stats/chart',         description: 'Datos para graficos', auth: true },
      { method: 'GET',    path: '/stats/detailed',      description: 'Estadisticas detalladas', auth: true },
      { method: 'GET',    path: '/stats/overtime-summary', description: 'Resumen horas extra', auth: true },
      { method: 'GET',    path: '/stats/weather-patterns', description: 'Patrones clima', auth: true },
      { method: 'GET',    path: '/stats/year-comparison', description: 'Comparacion anual', auth: true },
      { method: 'GET',    path: '/today/status',        description: 'Estado del dia actual', auth: true },
      { method: 'GET',    path: '/unjustified',         description: 'Asistencias sin justificar', auth: 'supervisorOrAdmin' },
      { method: 'GET',    path: '/headcount',           description: 'Conteo de personal', auth: true },
      { method: 'GET',    path: '/:id',                 description: 'Obtener asistencia por ID', auth: true },
      { method: 'POST',   path: '/',                    description: 'Crear registro asistencia', auth: true },
      { method: 'POST',   path: '/checkin',             description: 'Registrar entrada', auth: true },
      { method: 'POST',   path: '/checkout',            description: 'Registrar salida', auth: true },
      { method: 'POST',   path: '/mobile',              description: 'Registro desde movil', auth: false },
      { method: 'PUT',    path: '/:id',                 description: 'Actualizar asistencia', auth: 'supervisorOrAdmin' },
      { method: 'PUT',    path: '/:id/justify',         description: 'Justificar asistencia', auth: 'supervisorOrAdmin' }
    ],
    issue: {
      expected: 'GET /api/v1/attendance/today',
      actual: 'GET /api/v1/attendance/today/status',
      note: 'La ruta correcta incluye /status al final',
      solution: 'Usar GET /api/v1/attendance/today/status'
    }
  },

  // ============================================================================
  // PROBLEMA 3: GET /v1/shift-assignments
  // ============================================================================
  shiftAssignments: {
    mountedAt: '/api/v1/shifts',
    routeFile: 'src/routes/shiftRoutes.js',
    availableRoutes: [
      { method: 'GET',    path: '/',                    description: 'Lista todos los turnos', auth: true },
      { method: 'GET',    path: '/:id',                 description: 'Obtener turno por ID', auth: true },
      { method: 'GET',    path: '/:id/users',           description: 'Usuarios asignados a turno', auth: 'supervisorOrAdmin' },
      { method: 'POST',   path: '/',                    description: 'Crear turno', auth: 'supervisorOrAdmin' },
      { method: 'POST',   path: '/:id/assign-users',    description: 'Asignar usuarios a turno', auth: 'supervisorOrAdmin' },
      { method: 'POST',   path: '/bulk-assign',         description: 'Asignacion masiva', auth: 'supervisorOrAdmin' },
      { method: 'PUT',    path: '/:id',                 description: 'Actualizar turno', auth: 'supervisorOrAdmin' },
      { method: 'DELETE', path: '/:id',                 description: 'Eliminar turno', auth: 'supervisorOrAdmin' }
    ],
    issue: {
      expected: 'GET /api/v1/shift-assignments',
      actual: 'No existe ruta independiente',
      note: 'Las asignaciones estan en /api/v1/shifts/:id/users',
      solution: 'Usar GET /api/v1/shifts/:shiftId/users para ver usuarios asignados'
    },
    alternativeRoutes: [
      {
        module: 'trainings',
        path: '/api/v1/trainings/my-assignments',
        description: 'Mis asignaciones de capacitacion'
      },
      {
        module: 'payroll',
        path: '/api/payroll/assignments',
        description: 'Asignaciones de plantilla de payroll'
      }
    ]
  },

  // ============================================================================
  // PROBLEMA 4: GET /v1/vacations vs /v1/vacation
  // ============================================================================
  vacation: {
    mountedAt: '/api/v1/vacation',  // <-- SIN S
    routeFile: 'src/routes/vacationRoutes.js',
    availableRoutes: [
      { method: 'GET',    path: '/config',              description: 'Configuracion de vacaciones', auth: false },
      { method: 'GET',    path: '/scales',              description: 'Escalas de vacaciones', auth: false },
      { method: 'GET',    path: '/requests',            description: 'Solicitudes de vacaciones', auth: false },
      { method: 'GET',    path: '/extraordinary-licenses', description: 'Licencias extraordinarias', auth: false },
      { method: 'GET',    path: '/compatibility-matrix', description: 'Matriz de compatibilidad', auth: false },
      { method: 'GET',    path: '/calculate-days/:userId', description: 'Calcular dias disponibles', auth: false },
      { method: 'POST',   path: '/config',              description: 'Crear configuracion', auth: false },
      { method: 'POST',   path: '/scales',              description: 'Crear escala', auth: false },
      { method: 'POST',   path: '/requests',            description: 'Crear solicitud', auth: false },
      { method: 'POST',   path: '/extraordinary-licenses', description: 'Crear licencia', auth: false },
      { method: 'POST',   path: '/compatibility-matrix', description: 'Crear regla matriz', auth: false },
      { method: 'POST',   path: '/generate-schedule',   description: 'Generar cronograma', auth: false },
      { method: 'PUT',    path: '/scales/:id',          description: 'Actualizar escala', auth: false },
      { method: 'PUT',    path: '/extraordinary-licenses/:id', description: 'Actualizar licencia', auth: false },
      { method: 'PUT',    path: '/requests/:id/approval', description: 'Aprobar/rechazar solicitud', auth: false },
      { method: 'PUT',    path: '/compatibility-matrix/:id', description: 'Actualizar regla', auth: false },
      { method: 'DELETE', path: '/compatibility-matrix/:id', description: 'Eliminar regla', auth: false }
    ],
    issue: {
      expected: 'GET /api/v1/vacations',
      actual: 'GET /api/v1/vacation',
      note: 'El modulo usa singular "vacation" no plural "vacations"',
      solution: 'Usar /api/v1/vacation/* (sin s)'
    }
  },

  // ============================================================================
  // PROBLEMA 5: GET /v1/trainings/assignments
  // ============================================================================
  trainings: {
    mountedAt: '/api/v1/trainings',
    routeFile: 'src/routes/trainingRoutes.js',
    availableRoutes: [
      { method: 'GET',    path: '/',                    description: 'Lista capacitaciones', auth: true },
      { method: 'GET',    path: '/:id',                 description: 'Obtener capacitacion', auth: true },
      { method: 'GET',    path: '/:id/assignments',     description: 'Asignaciones de capacitacion especifica', auth: true },
      { method: 'GET',    path: '/my-assignments',      description: 'Mis asignaciones', auth: true },
      { method: 'GET',    path: '/:id/my-progress',     description: 'Mi progreso en capacitacion', auth: true },
      { method: 'GET',    path: '/:id/certificate',     description: 'Obtener certificado', auth: true },
      { method: 'GET',    path: '/stats/dashboard',     description: 'Estadisticas dashboard', auth: true },
      { method: 'POST',   path: '/',                    description: 'Crear capacitacion', auth: true },
      { method: 'POST',   path: '/:id/assign',          description: 'Asignar usuarios', auth: true },
      { method: 'POST',   path: '/:id/progress',        description: 'Actualizar progreso', auth: true },
      { method: 'POST',   path: '/:id/complete',        description: 'Marcar como completada', auth: true },
      { method: 'PUT',    path: '/:id',                 description: 'Actualizar capacitacion', auth: true },
      { method: 'DELETE', path: '/:id',                 description: 'Eliminar capacitacion', auth: true },
      { method: 'DELETE', path: '/:id/unassign/:userId', description: 'Desasignar usuario', auth: true }
    ],
    issue: {
      expected: 'GET /api/v1/trainings/assignments',
      actual: 'GET /api/v1/trainings/my-assignments O GET /api/v1/trainings/:id/assignments',
      note: 'No existe ruta global /assignments. Usar my-assignments o especificar training ID',
      solution: 'Usar GET /api/v1/trainings/my-assignments para asignaciones del usuario actual'
    }
  },

  // ============================================================================
  // PROBLEMA 6: GET /v1/notifications/unread
  // ============================================================================
  notifications: {
    mountedAt: '/api/v1/notifications',
    routeFile: 'src/routes/notificationRoutes.js',
    availableRoutes: [
      { method: 'GET',    path: '/',                    description: 'Lista notificaciones', auth: true },
      { method: 'GET',    path: '/unread-count',        description: 'Conteo de no leidas', auth: true },
      { method: 'GET',    path: '/groups',              description: 'Grupos de notificaciones', auth: true },
      { method: 'GET',    path: '/critical',            description: 'Notificaciones criticas', auth: true },
      { method: 'GET',    path: '/:id',                 description: 'Obtener notificacion', auth: true },
      { method: 'PUT',    path: '/:id/mark-read',       description: 'Marcar como leida', auth: true },
      { method: 'PUT',    path: '/mark-all-read',       description: 'Marcar todas como leidas', auth: true },
      { method: 'POST',   path: '/:id/respond',         description: 'Responder a notificacion', auth: true },
      { method: 'DELETE', path: '/cleanup',             description: 'Limpiar notificaciones', auth: true }
    ],
    issue: {
      expected: 'GET /api/v1/notifications/unread',
      actual: 'GET /api/v1/notifications/unread-count',
      note: 'La ruta es /unread-count que devuelve conteo, no lista',
      solution: 'Usar GET /api/v1/notifications/unread-count para conteo O GET /api/v1/notifications/?unread=true para lista'
    },
    alternativeRoutes: [
      {
        mountedAt: '/api/v1/enterprise/notifications',
        routeFile: 'src/routes/notificationsEnterpriseRoutes.js',
        description: 'Notificaciones enterprise'
      },
      {
        mountedAt: '/api/v2/notifications',
        routeFile: 'src/routes/notificationUnifiedRoutes.js',
        description: 'Sistema unificado v2'
      }
    ]
  },

  // ============================================================================
  // PROBLEMA 7: GET /v1/organizational-positions
  // ============================================================================
  organizationalPositions: {
    mountedAt: '/api/v1/organizational',
    routeFile: 'src/routes/organizationalRoutes.js',
    availableRoutes: [
      // Positions
      { method: 'GET',    path: '/positions',           description: 'Lista posiciones', auth: false },
      { method: 'GET',    path: '/positions/:id',       description: 'Obtener posicion', auth: false },
      { method: 'POST',   path: '/positions',           description: 'Crear posicion', auth: false },
      { method: 'PUT',    path: '/positions/:id',       description: 'Actualizar posicion', auth: false },
      { method: 'DELETE', path: '/positions/:id',       description: 'Eliminar posicion', auth: false },
      // Sectors
      { method: 'GET',    path: '/sectors',             description: 'Lista sectores', auth: false },
      { method: 'POST',   path: '/sectors',             description: 'Crear sector', auth: false },
      { method: 'PUT',    path: '/sectors/:id',         description: 'Actualizar sector', auth: false },
      { method: 'DELETE', path: '/sectors/:id',         description: 'Eliminar sector', auth: false },
      // Agreements
      { method: 'GET',    path: '/agreements',          description: 'Lista convenios', auth: false },
      { method: 'POST',   path: '/agreements',          description: 'Crear convenio', auth: false },
      { method: 'PUT',    path: '/agreements/:id',      description: 'Actualizar convenio', auth: false },
      { method: 'DELETE', path: '/agreements/:id',      description: 'Eliminar convenio', auth: false },
      // Categories
      { method: 'GET',    path: '/categories',          description: 'Lista categorias', auth: false },
      { method: 'POST',   path: '/categories',          description: 'Crear categoria', auth: false },
      { method: 'PUT',    path: '/categories/:id',      description: 'Actualizar categoria', auth: false },
      { method: 'DELETE', path: '/categories/:id',      description: 'Eliminar categoria', auth: false },
      // Roles
      { method: 'GET',    path: '/roles',               description: 'Lista roles', auth: false },
      { method: 'POST',   path: '/roles',               description: 'Crear rol', auth: false },
      { method: 'PUT',    path: '/roles/:id',           description: 'Actualizar rol', auth: false },
      { method: 'DELETE', path: '/roles/:id',           description: 'Eliminar rol', auth: false },
      // Structure
      { method: 'GET',    path: '/structure',           description: 'Estructura completa', auth: false },
      { method: 'GET',    path: '/countries',           description: 'Lista paises', auth: false },
      // Hierarchy
      { method: 'GET',    path: '/hierarchy/tree',      description: 'Arbol jerarquico', auth: false },
      { method: 'GET',    path: '/hierarchy/flat',      description: 'Lista plana', auth: false },
      { method: 'GET',    path: '/hierarchy/flowchart', description: 'Diagrama de flujo', auth: false },
      { method: 'GET',    path: '/hierarchy/stats',     description: 'Estadisticas', auth: false },
      { method: 'GET',    path: '/hierarchy/escalation/:userId', description: 'Ruta de escalamiento', auth: false },
      { method: 'GET',    path: '/hierarchy/supervisor/:userId', description: 'Supervisor del usuario', auth: false },
      { method: 'GET',    path: '/hierarchy/subordinates/:userId', description: 'Subordinados', auth: false },
      { method: 'GET',    path: '/hierarchy/ancestors/:positionId', description: 'Ancestros de posicion', auth: false },
      { method: 'GET',    path: '/hierarchy/descendants/:positionId', description: 'Descendientes', auth: false },
      { method: 'POST',   path: '/hierarchy/can-approve', description: 'Verificar permisos', auth: false },
      { method: 'GET',    path: '/hierarchy/next-approver', description: 'Proximo aprobador', auth: false },
      { method: 'PUT',    path: '/hierarchy/paths',     description: 'Actualizar rutas', auth: false },
      // Employee assignments
      { method: 'PUT',    path: '/employees/:userId/category', description: 'Asignar categoria', auth: false },
      { method: 'PUT',    path: '/employees/:userId/sector', description: 'Asignar sector', auth: false },
      { method: 'PUT',    path: '/employees/:userId/roles', description: 'Asignar roles', auth: false },
      { method: 'PUT',    path: '/employees/:userId/position', description: 'Asignar posicion', auth: false },
      // Shifts holidays
      { method: 'GET',    path: '/shifts/:shiftId/holidays', description: 'Feriados del turno', auth: false },
      { method: 'GET',    path: '/shifts/:shiftId/calendar', description: 'Calendario del turno', auth: false },
      { method: 'PUT',    path: '/shifts/:shiftId/custom-days', description: 'Dias personalizados', auth: false },
      { method: 'PUT',    path: '/shifts/:shiftId/holiday-settings', description: 'Config feriados', auth: false },
      { method: 'GET',    path: '/holidays',            description: 'Lista feriados', auth: false }
    ],
    issue: {
      expected: 'GET /api/v1/organizational-positions',
      actual: 'GET /api/v1/organizational/positions',
      note: 'El modulo se llama "organizational" y positions es un sub-recurso',
      solution: 'Usar GET /api/v1/organizational/positions'
    }
  }
};

// ============================================================================
// RESUMEN DE CORRECCIONES NECESARIAS EN TESTS E2E
// ============================================================================
const E2E_CORRECTIONS = {
  '/api/v1/companies/:id': {
    issue: 'Ruta usa SLUG no ID para GET',
    correctPath: '/api/v1/companies/:slug',
    alternative: 'PUT/DELETE si usan ID'
  },
  '/api/v1/attendance/today': {
    issue: 'Ruta incompleta',
    correctPath: '/api/v1/attendance/today/status'
  },
  '/api/v1/shift-assignments': {
    issue: 'Ruta no existe como independiente',
    correctPath: '/api/v1/shifts/:id/users',
    note: 'Asignaciones estan anidadas en shifts'
  },
  '/api/v1/vacations': {
    issue: 'Plural incorrecto',
    correctPath: '/api/v1/vacation',
    note: 'Usar singular'
  },
  '/api/v1/trainings/assignments': {
    issue: 'Ruta global no existe',
    correctPath: '/api/v1/trainings/my-assignments',
    alternative: '/api/v1/trainings/:id/assignments'
  },
  '/api/v1/notifications/unread': {
    issue: 'Ruta parcial',
    correctPath: '/api/v1/notifications/unread-count',
    note: 'Devuelve conteo, no lista'
  },
  '/api/v1/organizational-positions': {
    issue: 'Formato de URL incorrecto',
    correctPath: '/api/v1/organizational/positions',
    note: 'Es sub-recurso de organizational'
  }
};

// ============================================================================
// RUTAS PRINCIPALES MONTADAS EN SERVER.JS (extracto relevante)
// ============================================================================
const SERVER_MOUNTS = {
  // Auth
  '/api/v1/auth': 'authRoutes',
  '/api/v1/permissions': 'permissionsRoutes',

  // Core multi-tenant
  '/api/v1/companies': 'companyRoutes',
  '/api/v1/users': 'userRoutes',
  '/api/v1/departments': 'departmentRoutes',
  '/api/v1/branches': 'branchRoutes',

  // Attendance
  '/api/v1/attendance': 'attendanceRoutes',
  '/api/v3/attendance': 'fastAttendanceRoutes',
  '/api/v2/biometric-attendance': 'biometricAttendanceRoutes',

  // Shifts
  '/api/v1/shifts': 'shiftRoutes + shiftCalendarRoutes',

  // HR Modules
  '/api/v1/vacation': 'vacationRoutes',
  '/api/v1/absence': 'absenceRoutes',
  '/api/v1/trainings': 'trainingRoutes',
  '/api/v1/sanctions': 'sanctionRoutes',

  // Organizational
  '/api/v1/organizational': 'organizationalRoutes',

  // Notifications
  '/api/v1/notifications': 'notificationRoutes',
  '/api/v1/enterprise/notifications': 'notificationsEnterpriseRoutes',
  '/api/v2/notifications': 'notificationUnifiedRoutes',

  // Kiosks
  '/api/kiosks': 'kiosksRoutes',
  '/api/v1/kiosks': 'kioskRoutes',
  '/api/v2/kiosk-enterprise': 'kioskEnterpriseRoutes',

  // Medical
  '/api/medical-cases': 'medicalCaseRoutes',
  '/api/medical-records': 'medicalRecordsRoutes',

  // Payroll
  '/api/payroll': 'payrollRoutes',
  '/api/salary-advanced': 'salaryAdvancedRoutes'
};

// ============================================================================
// HELPER: Verificar ruta
// ============================================================================
function checkRoute(moduleName) {
  const mapping = API_ROUTES_MAPPING[moduleName];
  if (!mapping) {
    return { error: `Modulo '${moduleName}' no encontrado en mapping` };
  }

  return {
    module: moduleName,
    mountedAt: mapping.mountedAt,
    routeFile: mapping.routeFile,
    routeCount: mapping.availableRoutes.length,
    issue: mapping.issue || null,
    routes: mapping.availableRoutes.map(r => `${r.method} ${mapping.mountedAt}${r.path}`)
  };
}

// ============================================================================
// EXPORTAR
// ============================================================================
module.exports = {
  API_ROUTES_MAPPING,
  E2E_CORRECTIONS,
  SERVER_MOUNTS,
  checkRoute
};

// ============================================================================
// EJECUTAR COMO SCRIPT
// ============================================================================
if (require.main === module) {
  console.log('='.repeat(80));
  console.log('API ROUTES MAPPING - Sistema de Asistencia Biometrico');
  console.log('='.repeat(80));
  console.log('');

  console.log('PROBLEMAS DETECTADOS EN TESTS E2E:');
  console.log('-'.repeat(80));

  Object.entries(E2E_CORRECTIONS).forEach(([path, info]) => {
    console.log(`\n  ${path}`);
    console.log(`    Issue: ${info.issue}`);
    console.log(`    Correct: ${info.correctPath}`);
    if (info.alternative) console.log(`    Alt: ${info.alternative}`);
    if (info.note) console.log(`    Note: ${info.note}`);
  });

  console.log('\n');
  console.log('='.repeat(80));
  console.log('RUTAS DISPONIBLES POR MODULO:');
  console.log('='.repeat(80));

  Object.keys(API_ROUTES_MAPPING).forEach(moduleName => {
    const info = checkRoute(moduleName);
    console.log(`\n${moduleName.toUpperCase()}`);
    console.log(`  Mounted at: ${info.mountedAt}`);
    console.log(`  Route file: ${info.routeFile}`);
    console.log(`  Routes (${info.routeCount}):`);
    info.routes.slice(0, 5).forEach(r => console.log(`    - ${r}`));
    if (info.routes.length > 5) {
      console.log(`    ... y ${info.routes.length - 5} rutas mas`);
    }
  });

  console.log('\n');
  console.log('='.repeat(80));
  console.log('Para usar en tests:');
  console.log('  const { checkRoute, E2E_CORRECTIONS } = require("./api-routes-mapping");');
  console.log('  console.log(checkRoute("companies"));');
  console.log('='.repeat(80));
}
