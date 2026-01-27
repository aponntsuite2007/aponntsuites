/**
 * TEST EXHAUSTIVO DE CAMPOS DE TODOS LOS MÓDULOS
 * Verifica que cada endpoint devuelva TODOS los campos esperados
 *
 * Run: node scripts/test-all-modules-fields.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9998/api/v1';
let TOKEN = null;
let COMPANY_ID = null;
let USER_ID = null;

// Colores para consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, ...args) {
  console.log(colors[color] + args.join(' ') + colors.reset);
}

// Definición de TODOS los módulos con sus endpoints y campos esperados
const ALL_MODULES = {
  // ========== LOTE 1: YA TESTEADOS (100%) ==========
  'estructura-org': {
    endpoints: [
      { method: 'GET', path: '/departments', fields: ['id', 'name', 'code', 'parent_id', 'manager_id', 'description', 'is_active', 'company_id'] },
      { method: 'GET', path: '/positions', fields: ['id', 'name', 'code', 'department_id', 'level', 'salary_range_min', 'salary_range_max', 'is_active'] },
      { method: 'GET', path: '/branches', fields: ['id', 'name', 'code', 'address', 'phone', 'is_main', 'is_active'] }
    ]
  },
  'usuarios': {
    endpoints: [
      { method: 'GET', path: '/users', fields: ['id', 'first_name', 'last_name', 'email', 'role', 'department_id', 'position_id', 'shift_id', 'is_active', 'company_id'] }
    ]
  },
  'asistencia': {
    endpoints: [
      { method: 'GET', path: '/attendance', fields: ['id', 'user_id', 'check_in', 'check_out', 'status', 'gps_lat', 'gps_lng', 'worked_hours', 'late_minutes'] }
    ]
  },
  'turnos': {
    endpoints: [
      { method: 'GET', path: '/shifts', fields: ['id', 'name', 'start_time', 'end_time', 'break_duration', 'tolerance_minutes', 'is_active', 'working_days', 'is_night_shift'] }
    ]
  },
  'kiosks': {
    endpoints: [
      { method: 'GET', path: '/kiosks', fields: ['id', 'name', 'device_id', 'location', 'gps_lat', 'gps_lng', 'is_active', 'is_configured', 'has_external_reader', 'ip_address', 'last_seen'] }
    ]
  },
  'vacaciones': {
    endpoints: [
      { method: 'GET', path: '/vacations/scales', fields: ['id', 'name', 'years_from', 'years_to', 'days_entitled', 'is_active'] },
      { method: 'GET', path: '/vacations/requests', fields: ['id', 'user_id', 'start_date', 'end_date', 'days_requested', 'status', 'approved_by', 'approved_at'] }
    ]
  },
  'sanciones': {
    endpoints: [
      { method: 'GET', path: '/sanctions', fields: ['id', 'user_id', 'type_id', 'date', 'description', 'status', 'issued_by'] },
      { method: 'GET', path: '/sanctions/types', fields: ['id', 'name', 'code', 'description', 'severity', 'is_active'] }
    ]
  },
  'visitantes': {
    endpoints: [
      { method: 'GET', path: '/visitors', fields: ['id', 'name', 'document_number', 'document_type', 'company_from', 'contact_person', 'reason', 'status', 'check_in', 'check_out'] }
    ]
  },

  // ========== LOTE 2: NÓMINA Y FINANZAS ==========
  'liquidaciones': {
    endpoints: [
      { method: 'GET', path: '/payroll/liquidations', fields: ['id', 'user_id', 'period', 'gross_salary', 'net_salary', 'deductions', 'status', 'created_at'] },
      { method: 'GET', path: '/payroll/concepts', fields: ['id', 'name', 'code', 'type', 'is_taxable', 'is_active'] }
    ]
  },
  'banco-horas': {
    endpoints: [
      { method: 'GET', path: '/hour-bank/balances', fields: ['id', 'user_id', 'balance_hours', 'balance_minutes', 'last_updated'] },
      { method: 'GET', path: '/hour-bank/movements', fields: ['id', 'user_id', 'type', 'hours', 'minutes', 'reason', 'created_at'] }
    ]
  },
  'anticipos': {
    endpoints: [
      { method: 'GET', path: '/advances', fields: ['id', 'user_id', 'amount', 'status', 'requested_at', 'approved_by', 'approved_at'] }
    ]
  },
  'finanzas-cuentas': {
    endpoints: [
      { method: 'GET', path: '/finance/accounts', fields: ['id', 'name', 'code', 'type', 'balance', 'currency', 'is_active'] }
    ]
  },
  'finanzas-presupuesto': {
    endpoints: [
      { method: 'GET', path: '/finance/budgets', fields: ['id', 'name', 'period', 'amount', 'spent', 'remaining', 'status'] }
    ]
  },

  // ========== LOTE 3: RECLUTAMIENTO Y ONBOARDING ==========
  'ofertas-laborales': {
    endpoints: [
      { method: 'GET', path: '/job-postings', fields: ['id', 'title', 'department_id', 'position_id', 'description', 'requirements', 'status', 'deadline', 'created_at'] }
    ]
  },
  'candidatos': {
    endpoints: [
      { method: 'GET', path: '/candidates', fields: ['id', 'first_name', 'last_name', 'email', 'phone', 'job_posting_id', 'status', 'cv_url', 'applied_at'] }
    ]
  },
  'onboarding': {
    endpoints: [
      { method: 'GET', path: '/onboarding/tasks', fields: ['id', 'name', 'description', 'category', 'order', 'is_required', 'is_active'] },
      { method: 'GET', path: '/onboarding/user-progress', fields: ['id', 'user_id', 'task_id', 'status', 'completed_at'] }
    ]
  },

  // ========== LOTE 4: MEDICAL ==========
  'medical-examenes': {
    endpoints: [
      { method: 'GET', path: '/medical/exams', fields: ['id', 'user_id', 'exam_type', 'date', 'result', 'next_exam_date', 'doctor_id', 'notes'] }
    ]
  },
  'medical-apt': {
    endpoints: [
      { method: 'GET', path: '/medical/apt-certificates', fields: ['id', 'user_id', 'issue_date', 'expiry_date', 'apt_type', 'restrictions', 'status'] }
    ]
  },
  'medical-cirugias': {
    endpoints: [
      { method: 'GET', path: '/medical/surgeries', fields: ['id', 'user_id', 'surgery_type', 'date', 'hospital', 'doctor', 'recovery_days', 'status'] }
    ]
  },

  // ========== LOTE 5: CAPACITACIÓN ==========
  'capacitacion-cursos': {
    endpoints: [
      { method: 'GET', path: '/training/courses', fields: ['id', 'name', 'description', 'category', 'duration_hours', 'is_mandatory', 'is_active'] }
    ]
  },
  'capacitacion-inscripciones': {
    endpoints: [
      { method: 'GET', path: '/training/enrollments', fields: ['id', 'user_id', 'course_id', 'status', 'enrolled_at', 'completed_at', 'score'] }
    ]
  },

  // ========== LOTE 6: DOCUMENTOS ==========
  'documentos': {
    endpoints: [
      { method: 'GET', path: '/documents', fields: ['id', 'name', 'type', 'category', 'file_url', 'uploaded_by', 'created_at', 'expiry_date'] }
    ]
  },
  'procedimientos': {
    endpoints: [
      { method: 'GET', path: '/procedures', fields: ['id', 'title', 'code', 'version', 'category', 'status', 'effective_date', 'created_by'] }
    ]
  },

  // ========== LOTE 7: LEGAL/COMPLIANCE ==========
  'legal-contratos': {
    endpoints: [
      { method: 'GET', path: '/contracts', fields: ['id', 'user_id', 'contract_type', 'start_date', 'end_date', 'salary', 'status'] }
    ]
  },
  'legal-issues': {
    endpoints: [
      { method: 'GET', path: '/legal/issues', fields: ['id', 'user_id', 'issue_type', 'description', 'status', 'filed_date', 'resolution_date'] }
    ]
  },
  'art-siniestros': {
    endpoints: [
      { method: 'GET', path: '/art/claims', fields: ['id', 'user_id', 'incident_date', 'incident_type', 'description', 'status', 'claim_number'] }
    ]
  },

  // ========== LOTE 8: NOTIFICACIONES ==========
  'notificaciones': {
    endpoints: [
      { method: 'GET', path: '/notifications', fields: ['id', 'user_id', 'title', 'message', 'type', 'is_read', 'created_at'] }
    ]
  },
  'mensajes': {
    endpoints: [
      { method: 'GET', path: '/messages', fields: ['id', 'from_user_id', 'to_user_id', 'subject', 'body', 'is_read', 'created_at'] }
    ]
  },

  // ========== LOTE 9: SOPORTE ==========
  'tickets-soporte': {
    endpoints: [
      { method: 'GET', path: '/support/tickets', fields: ['id', 'user_id', 'subject', 'description', 'priority', 'status', 'assigned_to', 'created_at'] }
    ]
  },

  // ========== LOTE 10: BIOMÉTRICO AVANZADO ==========
  'biometrico-templates': {
    endpoints: [
      { method: 'GET', path: '/biometric/templates', fields: ['id', 'user_id', 'finger_index', 'quality_score', 'created_at', 'is_active'] }
    ]
  },
  'biometrico-consent': {
    endpoints: [
      { method: 'GET', path: '/biometric/consents', fields: ['id', 'user_id', 'consent_type', 'accepted', 'accepted_at', 'ip_address'] }
    ]
  },

  // ========== LOTE 11: PERMISOS/AUSENCIAS ==========
  'permisos': {
    endpoints: [
      { method: 'GET', path: '/permissions/requests', fields: ['id', 'user_id', 'permission_type', 'start_date', 'end_date', 'reason', 'status', 'approved_by'] }
    ]
  },
  'ausencias': {
    endpoints: [
      { method: 'GET', path: '/absences', fields: ['id', 'user_id', 'absence_type', 'start_date', 'end_date', 'reason', 'status', 'documented'] }
    ]
  },

  // ========== LOTE 12: BENEFICIOS ==========
  'beneficios': {
    endpoints: [
      { method: 'GET', path: '/benefits', fields: ['id', 'name', 'description', 'type', 'value', 'is_active'] },
      { method: 'GET', path: '/benefits/assignments', fields: ['id', 'user_id', 'benefit_id', 'start_date', 'end_date', 'status'] }
    ]
  },

  // ========== LOTE 13: EQUIPAMIENTO/ACTIVOS ==========
  'equipamiento': {
    endpoints: [
      { method: 'GET', path: '/equipment', fields: ['id', 'name', 'code', 'category', 'status', 'assigned_to', 'purchase_date', 'warranty_expiry'] }
    ]
  },
  'uniformes': {
    endpoints: [
      { method: 'GET', path: '/uniforms', fields: ['id', 'user_id', 'item_type', 'size', 'quantity', 'delivered_at', 'status'] }
    ]
  },

  // ========== LOTE 14: HSE (Higiene y Seguridad) ==========
  'hse-incidentes': {
    endpoints: [
      { method: 'GET', path: '/hse/incidents', fields: ['id', 'reporter_id', 'incident_type', 'severity', 'date', 'location', 'description', 'status'] }
    ]
  },
  'hse-epp': {
    endpoints: [
      { method: 'GET', path: '/hse/ppe', fields: ['id', 'user_id', 'ppe_type', 'delivered_at', 'expiry_date', 'status'] }
    ]
  },

  // ========== LOTE 15: CRM (si aplica) ==========
  'crm-leads': {
    endpoints: [
      { method: 'GET', path: '/crm/leads', fields: ['id', 'company_name', 'contact_name', 'email', 'phone', 'source', 'status', 'assigned_to'] }
    ]
  },
  'crm-quotes': {
    endpoints: [
      { method: 'GET', path: '/quotes', fields: ['id', 'lead_id', 'company_id', 'total_amount', 'status', 'valid_until', 'created_at'] }
    ]
  }
};

// Función para hacer login
async function login() {
  try {
    log('cyan', '\n🔐 Iniciando sesión...');
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'administrador',
      password: 'admin123',
      companySlug: 'aponnt-empresa-demo'
    });

    TOKEN = res.data.token;
    COMPANY_ID = res.data.user.company_id || res.data.user.companyId;
    USER_ID = res.data.user.id || res.data.user.user_id || res.data.user.userId;

    log('green', `✅ Login exitoso - Company ID: ${COMPANY_ID}, User ID: ${USER_ID}`);
    return true;
  } catch (err) {
    log('red', `❌ Error de login: ${err.message}`);
    return false;
  }
}

// Headers con autenticación
function authHeaders() {
  return {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
}

// Verificar campos en respuesta
function checkFields(data, expectedFields, moduleName, endpointPath) {
  const results = { passed: [], failed: [], warnings: [] };

  // Si no hay datos, reportar warning
  if (!data || (Array.isArray(data) && data.length === 0)) {
    results.warnings.push('No hay datos para verificar campos');
    return results;
  }

  // Tomar primer elemento si es array
  const sample = Array.isArray(data) ? data[0] : data;

  if (!sample || typeof sample !== 'object') {
    results.warnings.push('Formato de respuesta inesperado');
    return results;
  }

  // Verificar cada campo esperado
  for (const field of expectedFields) {
    if (sample.hasOwnProperty(field)) {
      results.passed.push(field);
    } else {
      // Buscar alternativas comunes (camelCase vs snake_case)
      const camelCase = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();

      if (sample.hasOwnProperty(camelCase)) {
        results.passed.push(`${field} (como ${camelCase})`);
      } else if (sample.hasOwnProperty(snakeCase)) {
        results.passed.push(`${field} (como ${snakeCase})`);
      } else {
        results.failed.push(field);
      }
    }
  }

  return results;
}

// Testear un endpoint
async function testEndpoint(moduleName, endpoint) {
  const fullPath = `${BASE_URL}${endpoint.path}`;

  try {
    const res = await axios.get(fullPath, authHeaders());

    // Extraer datos de la respuesta
    let data = res.data;
    if (data.data) data = data.data;
    if (data.items) data = data.items;
    if (data.results) data = data.results;
    if (data.records) data = data.records;
    if (data[moduleName]) data = data[moduleName];

    const fieldCheck = checkFields(data, endpoint.fields, moduleName, endpoint.path);

    return {
      endpoint: endpoint.path,
      status: res.status,
      success: true,
      fieldsChecked: endpoint.fields.length,
      fieldsPassed: fieldCheck.passed.length,
      fieldsFailed: fieldCheck.failed.length,
      failedFields: fieldCheck.failed,
      warnings: fieldCheck.warnings
    };
  } catch (err) {
    const status = err.response?.status || 0;

    // 404 o 501 significa que el endpoint no existe - no es un error crítico
    if (status === 404 || status === 501 || status === 400) {
      return {
        endpoint: endpoint.path,
        status: status,
        success: false,
        skipped: true,
        reason: status === 404 ? 'Endpoint no encontrado' : status === 501 ? 'No implementado' : 'Bad request'
      };
    }

    return {
      endpoint: endpoint.path,
      status: status,
      success: false,
      error: err.message
    };
  }
}

// Testear un módulo completo
async function testModule(moduleName, moduleConfig) {
  log('blue', `\n📦 Testeando: ${moduleName}`);

  const results = {
    module: moduleName,
    endpoints: [],
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  for (const endpoint of moduleConfig.endpoints) {
    const result = await testEndpoint(moduleName, endpoint);
    results.endpoints.push(result);
    results.totalTests += endpoint.fields.length;

    if (result.skipped) {
      results.skipped++;
      log('yellow', `   ⏭️  ${endpoint.path}: ${result.reason}`);
    } else if (result.success) {
      results.passed += result.fieldsPassed;
      results.failed += result.fieldsFailed;

      if (result.fieldsFailed === 0) {
        log('green', `   ✅ ${endpoint.path}: ${result.fieldsPassed}/${result.fieldsChecked} campos OK`);
      } else {
        log('yellow', `   ⚠️  ${endpoint.path}: ${result.fieldsPassed}/${result.fieldsChecked} campos (faltan: ${result.failedFields.join(', ')})`);
      }

      if (result.warnings.length > 0) {
        log('yellow', `      ⚠️  ${result.warnings.join(', ')}`);
      }
    } else {
      log('red', `   ❌ ${endpoint.path}: ${result.error || 'Error desconocido'}`);
    }
  }

  return results;
}

// Función principal
async function main() {
  console.log('\n' + '='.repeat(80));
  log('bold', '🧪 TEST EXHAUSTIVO DE CAMPOS - TODOS LOS MÓDULOS');
  console.log('='.repeat(80));

  // Login
  const loginOk = await login();
  if (!loginOk) {
    log('red', '\n❌ No se pudo iniciar sesión. Abortando.');
    process.exit(1);
  }

  const allResults = [];
  const moduleNames = Object.keys(ALL_MODULES);

  log('cyan', `\n📋 Testeando ${moduleNames.length} módulos...\n`);

  // Testear cada módulo
  for (const moduleName of moduleNames) {
    const result = await testModule(moduleName, ALL_MODULES[moduleName]);
    allResults.push(result);
  }

  // Resumen final
  console.log('\n' + '='.repeat(80));
  log('bold', '📊 RESUMEN FINAL');
  console.log('='.repeat(80));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let modulesWithIssues = [];

  for (const result of allResults) {
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalSkipped += result.skipped;

    const pct = result.totalTests > 0 ? Math.round((result.passed / (result.passed + result.failed)) * 100) : 100;
    const status = result.failed === 0 ? '✅' : '⚠️';

    if (result.skipped === result.endpoints.length) {
      log('yellow', `⏭️  ${result.module}: No implementado/disponible`);
    } else {
      log(result.failed === 0 ? 'green' : 'yellow', `${status} ${result.module}: ${result.passed}/${result.passed + result.failed} (${pct}%)`);

      if (result.failed > 0) {
        modulesWithIssues.push({
          module: result.module,
          failedFields: result.endpoints.flatMap(e => e.failedFields || [])
        });
      }
    }
  }

  console.log('\n' + '-'.repeat(80));
  const totalTests = totalPassed + totalFailed;
  const overallPct = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  log('bold', `\n✅ Tests pasados: ${totalPassed}`);
  log('bold', `❌ Tests fallidos: ${totalFailed}`);
  log('bold', `⏭️  Endpoints omitidos: ${totalSkipped}`);
  log('bold', `📈 Porcentaje: ${overallPct}%`);

  if (modulesWithIssues.length > 0) {
    console.log('\n' + '-'.repeat(80));
    log('yellow', '\n⚠️  MÓDULOS CON CAMPOS FALTANTES:');
    for (const issue of modulesWithIssues) {
      log('yellow', `   - ${issue.module}: ${issue.failedFields.join(', ')}`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  log('red', `\n❌ Error fatal: ${err.message}`);
  process.exit(1);
});
