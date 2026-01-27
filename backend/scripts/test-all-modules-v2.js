/**
 * TEST EXHAUSTIVO DE CAMPOS V2 - Rutas y wrappers correctos
 *
 * Run: node scripts/test-all-modules-v2.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9998';
let TOKEN = null;

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

// Módulos con endpoints REALES y wrappers correctos
const MODULES = {
  // ============ CORE RRHH ============
  'departments': {
    path: '/api/v1/departments',
    wrapper: 'departments',
    fields: ['id', 'name', 'description', 'is_active', 'company_id', 'gps_lat', 'gps_lng', 'manager_user_id', 'branch_id', 'coverage_radius']
  },
  'users': {
    path: '/api/v1/users',
    wrapper: 'users',
    fields: ['id', 'first_name', 'last_name', 'email', 'role', 'department_id', 'position_id', 'shift_id', 'is_active', 'company_id', 'employee_id']
  },
  'shifts': {
    path: '/api/v1/shifts',
    wrapper: 'shifts',
    fields: ['id', 'name', 'start_time', 'end_time', 'break_duration', 'tolerance_minutes', 'is_active', 'working_days', 'is_night_shift', 'color']
  },
  'kiosks': {
    path: '/api/kiosks',
    wrapper: null, // Array directo
    fields: ['id', 'name', 'device_id', 'location', 'gps_lat', 'gps_lng', 'is_active', 'is_configured', 'has_external_reader', 'ip_address', 'company_id']
  },
  'attendance': {
    path: '/api/v1/attendance',
    wrapper: 'data', // Los datos vienen en res.data.data
    fields: ['id', 'user_id', 'check_in', 'check_out', 'status', 'gps_lat', 'gps_lng', 'worked_hours', 'late_minutes', 'date']
  },
  'branches': {
    path: '/api/v1/branches',
    wrapper: null, // Array directo
    fields: ['id', 'name', 'code', 'address', 'phone', 'is_active', 'company_id', 'is_main']
  },

  // ============ SANCIONES/DISCIPLINARIOS ============
  'sanctions': {
    path: '/api/v1/sanctions',
    wrapper: 'sanctions',
    fields: ['id', 'employee_id', 'sanction_type', 'sanction_date', 'description', 'status', 'created_by']
  },
  'sanction-types': {
    path: '/api/v1/sanctions/types',
    wrapper: 'types',
    fields: ['id', 'name', 'code', 'description', 'severity', 'is_active', 'category']
  },

  // ============ VISITANTES ============
  'visitors': {
    path: '/api/v1/visitors',
    wrapper: 'visitors',
    fields: ['id', 'first_name', 'last_name', 'dni', 'company_from', 'visit_reason', 'authorization_status', 'check_in', 'check_out']
  },

  // ============ NOTIFICACIONES ============
  'notifications': {
    path: '/api/v1/notifications',
    wrapper: 'notifications',
    fields: ['id', 'user_id', 'title', 'message', 'type', 'is_read', 'created_at', 'priority']
  },

  // ============ BIOMÉTRICO ============
  'biometric-consents': {
    path: '/api/v1/biometric/consents',
    wrapper: 'consents',
    fields: ['user_id', 'consent_id', 'consent_type', 'consent_given', 'consent_created_at', 'status', 'has_biometry']
  },

  // ============ LEGAL ============
  'legal-issues': {
    path: '/api/v1/legal/issues',
    wrapper: 'data',
    fields: ['id', 'user_id', 'issue_type', 'description', 'status', 'filed_date']
  },

  // ============ ORGANIZATIONAL ============
  'positions': {
    path: '/api/v1/organizational/positions',
    wrapper: 'data',
    queryParams: '?company_id=1',
    fields: ['id', 'name', 'code', 'department_id', 'level', 'is_active']
  },

  // ============ TRAINING ============
  'training-courses': {
    path: '/api/v1/trainings',
    wrapper: 'trainings',
    fields: ['id', 'name', 'description', 'category', 'duration_hours', 'is_active']
  },

  // ============ JOB POSTINGS ============
  'job-postings': {
    path: '/api/job-postings/offers',
    wrapper: 'offers',
    fields: ['id', 'title', 'description', 'status', 'department_id', 'created_at']
  },

  // ============ SUPPORT ============
  'support-tickets': {
    path: '/api/support/v2/tickets',
    wrapper: 'tickets',
    fields: ['ticket_id', 'subject', 'description', 'status', 'priority', 'created_at']
  },

  // ============ PROCEDURES ============
  'procedures': {
    path: '/api/procedures',
    wrapper: 'procedures',
    fields: ['id', 'title', 'code', 'status']
  }
};

async function login() {
  try {
    log('cyan', '\n🔐 Iniciando sesión...');
    const res = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      identifier: 'administrador',
      password: 'admin123',
      companySlug: 'aponnt-empresa-demo'
    });
    TOKEN = res.data.token;
    log('green', '✅ Login exitoso');
    return true;
  } catch (err) {
    log('red', `❌ Error login: ${err.message}`);
    return false;
  }
}

function auth() {
  return { headers: { Authorization: `Bearer ${TOKEN}` } };
}

function checkFields(sample, expectedFields) {
  const results = { passed: [], failed: [] };

  for (const field of expectedFields) {
    // Buscar el campo directamente o con variantes camelCase/snake_case
    const found = sample.hasOwnProperty(field) ||
      sample.hasOwnProperty(field.replace(/_([a-z])/g, (g) => g[1].toUpperCase())) ||
      sample.hasOwnProperty(field.replace(/([A-Z])/g, '_$1').toLowerCase());

    if (found) {
      results.passed.push(field);
    } else {
      results.failed.push(field);
    }
  }

  return results;
}

async function testModule(name, config) {
  const url = `${BASE_URL}${config.path}${config.queryParams || ''}`;

  try {
    const res = await axios.get(url, auth());
    let data = res.data;

    // Extraer datos del wrapper si existe
    if (config.wrapper && data[config.wrapper]) {
      data = data[config.wrapper];
    }

    // Si es array, tomar primer elemento
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { status: 'empty', message: 'Sin datos para verificar' };
      }
      data = data[0];
    }

    const check = checkFields(data, config.fields);

    return {
      status: check.failed.length === 0 ? 'pass' : 'partial',
      passed: check.passed.length,
      failed: check.failed.length,
      total: config.fields.length,
      failedFields: check.failed
    };
  } catch (err) {
    const status = err.response?.status || 0;
    return {
      status: 'error',
      httpStatus: status,
      message: status === 404 ? 'Endpoint no encontrado' :
               status === 400 ? 'Bad request' :
               status === 500 ? 'Error servidor' : err.message
    };
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  log('bold', '🧪 TEST EXHAUSTIVO DE CAMPOS V2');
  console.log('='.repeat(70));

  if (!await login()) {
    process.exit(1);
  }

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalEmpty = 0;
  let totalErrors = 0;

  console.log('');

  for (const [name, config] of Object.entries(MODULES)) {
    process.stdout.write(`📦 ${name.padEnd(20)}`);

    const result = await testModule(name, config);
    results.push({ name, ...result });

    if (result.status === 'pass') {
      log('green', `✅ ${result.passed}/${result.total} (100%)`);
      totalPassed += result.passed;
    } else if (result.status === 'partial') {
      log('yellow', `⚠️  ${result.passed}/${result.total} (${Math.round(result.passed/result.total*100)}%) - Faltan: ${result.failedFields.join(', ')}`);
      totalPassed += result.passed;
      totalFailed += result.failed;
    } else if (result.status === 'empty') {
      log('cyan', `📭 ${result.message}`);
      totalEmpty++;
    } else {
      log('red', `❌ ${result.message}`);
      totalErrors++;
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(70));
  log('bold', '📊 RESUMEN');
  console.log('='.repeat(70));

  const total = totalPassed + totalFailed;
  const pct = total > 0 ? Math.round(totalPassed / total * 100) : 0;

  log('bold', `\n✅ Campos verificados: ${totalPassed}/${total} (${pct}%)`);
  log('bold', `📭 Módulos sin datos: ${totalEmpty}`);
  log('bold', `❌ Endpoints con error: ${totalErrors}`);

  // Módulos con problemas
  const issues = results.filter(r => r.status === 'partial');
  if (issues.length > 0) {
    console.log('\n⚠️  CAMPOS FALTANTES POR MÓDULO:');
    issues.forEach(r => {
      log('yellow', `   - ${r.name}: ${r.failedFields.join(', ')}`);
    });
  }

  console.log('\n' + '='.repeat(70) + '\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(console.error);
