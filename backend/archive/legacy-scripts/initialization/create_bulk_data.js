const axios = require('axios');

const API_URL = 'http://localhost:9999/api/v1';
let token = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(icon, message, color = 'reset') {
  console.log(`${colors[color]}${icon} ${message}${colors.reset}`);
}

async function login() {
  log('🔐', 'LOGIN - Autenticando usuario...', 'cyan');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'admin',
      password: '123456',
      companyId: 11
    });
    token = response.data.token;
    log('✅', `Login exitoso - Token obtenido`, 'green');
    return true;
  } catch (error) {
    log('❌', `Login FALLIDO: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function createUsers(count = 100) {
  log('\n👥', `CREANDO ${count} USUARIOS VÍA API...`, 'cyan');
  console.log('='.repeat(70));

  const headers = { Authorization: `Bearer ${token}` };
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const timestamp = Date.now() + i;
      const userData = {
        legajo: `AUTO-${timestamp}`,
        firstName: `Usuario`,
        lastName: `Automatizado ${i + 1}`,
        email: `auto_user_${timestamp}@testing.com`,
        dni: `${30000000 + i}`,
        password: 'testing123',
        role: 'employee',
        department_id: 1
      };

      await axios.post(`${API_URL}/users`, userData, { headers });
      successCount++;

      if ((i + 1) % 10 === 0) {
        log('✅', `Progreso: ${i + 1}/${count} usuarios creados`, 'green');
      }
    } catch (error) {
      failCount++;
      if (failCount <= 5) {
        log('❌', `Usuario ${i + 1}: ${error.response?.data?.error || error.message}`, 'red');
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  log('📊', 'RESUMEN CREACIÓN DE USUARIOS:', 'cyan');
  log('✅', `Exitosos: ${successCount}`, 'green');
  log('❌', `Fallidos: ${failCount}`, 'red');
  log('📈', `Tasa de éxito: ${((successCount/count)*100).toFixed(1)}%`, 'blue');
  console.log('='.repeat(70) + '\n');
}

async function createDepartments(count = 50) {
  log('\n🏢', `CREANDO ${count} DEPARTAMENTOS VÍA API...`, 'cyan');
  console.log('='.repeat(70));

  const headers = { Authorization: `Bearer ${token}` };
  let successCount = 0;
  let failCount = 0;

  // Primero obtener branches disponibles
  try {
    const branchesResp = await axios.get(`${API_URL}/branches`, { headers });
    const branches = branchesResp.data.branches || branchesResp.data.data || branchesResp.data;
    const branchId = (Array.isArray(branches) && branches.length > 0) ? branches[0].id : 1;

    for (let i = 0; i < count; i++) {
      try {
        const timestamp = Date.now() + i;
        const deptData = {
          name: `Departamento Auto ${i + 1}`,
          description: `Departamento creado automáticamente por script`,
          code: `DEPT-AUTO-${timestamp}`,
          branchId: branchId,
          gpsLocation: {
            lat: -25.2637 + (Math.random() * 0.01),
            lng: -57.5759 + (Math.random() * 0.01)
          },
          radius: 100 + Math.floor(Math.random() * 100)
        };

        await axios.post(`${API_URL}/departments`, deptData, { headers });
        successCount++;

        if ((i + 1) % 10 === 0) {
          log('✅', `Progreso: ${i + 1}/${count} departamentos creados`, 'green');
        }
      } catch (error) {
        failCount++;
        if (failCount <= 5) {
          log('❌', `Departamento ${i + 1}: ${error.response?.data?.error || error.message}`, 'red');
        }
      }
    }
  } catch (error) {
    log('❌', `No se pudieron obtener branches: ${error.message}`, 'red');
  }

  console.log('\n' + '='.repeat(70));
  log('📊', 'RESUMEN CREACIÓN DE DEPARTAMENTOS:', 'cyan');
  log('✅', `Exitosos: ${successCount}`, 'green');
  log('❌', `Fallidos: ${failCount}`, 'red');
  log('📈', `Tasa de éxito: ${((successCount/count)*100).toFixed(1)}%`, 'blue');
  console.log('='.repeat(70) + '\n');
}

async function createShifts(count = 30) {
  log('\n⏰', `CREANDO ${count} TURNOS VÍA API...`, 'cyan');
  console.log('='.repeat(70));

  const headers = { Authorization: `Bearer ${token}` };
  let successCount = 0;
  let failCount = 0;

  const shiftTemplates = [
    { name: 'Matutino', start: '06:00', end: '14:00' },
    { name: 'Vespertino', start: '14:00', end: '22:00' },
    { name: 'Nocturno', start: '22:00', end: '06:00' },
    { name: 'Completo', start: '08:00', end: '17:00' },
    { name: 'Extendido', start: '07:00', end: '19:00' }
  ];

  for (let i = 0; i < count; i++) {
    try {
      const template = shiftTemplates[i % shiftTemplates.length];
      const timestamp = Date.now() + i;

      const shiftData = {
        name: `${template.name} Auto ${i + 1}`,
        startTime: template.start,
        endTime: template.end,
        toleranceMinutes: 15,
        description: `Turno creado automáticamente`
      };

      await axios.post(`${API_URL}/shifts`, shiftData, { headers });
      successCount++;

      if ((i + 1) % 10 === 0) {
        log('✅', `Progreso: ${i + 1}/${count} turnos creados`, 'green');
      }
    } catch (error) {
      failCount++;
      if (failCount <= 5) {
        log('❌', `Turno ${i + 1}: ${error.response?.data?.error || error.message}`, 'red');
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  log('📊', 'RESUMEN CREACIÓN DE TURNOS:', 'cyan');
  log('✅', `Exitosos: ${successCount}`, 'green');
  log('❌', `Fallidos: ${failCount}`, 'red');
  log('📈', `Tasa de éxito: ${((successCount/count)*100).toFixed(1)}%`, 'blue');
  console.log('='.repeat(70) + '\n');
}

async function run() {
  console.log('\n' + '='.repeat(70));
  log('🚀', 'INICIANDO CREACIÓN MASIVA DE DATOS', 'cyan');
  console.log('='.repeat(70) + '\n');

  try {
    const loginSuccess = await login();
    if (!loginSuccess) {
      log('❌', 'No se pudo autenticar. Abortando.', 'red');
      process.exit(1);
    }

    // Crear 100 usuarios
    await createUsers(100);

    // Crear 50 departamentos
    await createDepartments(50);

    // Crear 30 turnos
    await createShifts(30);

    console.log('\n' + '='.repeat(70));
    log('🎉', 'CREACIÓN MASIVA COMPLETADA', 'green');
    console.log('='.repeat(70));
    log('📝', 'RESUMEN FINAL:', 'blue');
    log('👥', '100 usuarios creados (o intentados)', 'blue');
    log('🏢', '50 departamentos creados (o intentados)', 'blue');
    log('⏰', '30 turnos creados (o intentados)', 'blue');
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    log('❌', `Error fatal: ${error.message}`, 'red');
    process.exit(1);
  }
}

run();
