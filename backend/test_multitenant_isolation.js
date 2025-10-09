const axios = require('axios');

const API_URL = 'http://localhost:9999/api/v1';
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

async function testMultiTenantIsolation() {
  console.log('\n' + '='.repeat(70));
  log('🏢', 'TESTING MULTI-TENANT ISOLATION', 'cyan');
  console.log('='.repeat(70) + '\n');

  let token11 = null;
  let token1 = null;

  try {
    // ====== LOGIN COMPANY 11 ======
    log('1️⃣', 'LOGIN - Empresa 11 (ISI)...', 'yellow');
    const login11 = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'admin',
      password: '123456',
      companyId: 11
    });
    token11 = login11.data.token;
    log('✅', `Login empresa 11 exitoso`, 'green');
    log('📋', `Usuario: ${login11.data.user?.firstName || 'admin'}`, 'blue');
    log('🏢', `Company ID: ${login11.data.user?.company_id || login11.data.user?.companyId}`, 'blue');

    // ====== VERIFICAR USUARIOS DE EMPRESA 11 ======
    log('\n2️⃣', 'LISTAR USUARIOS - Empresa 11...', 'yellow');
    const users11 = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token11}` }
    });

    const usersList11 = users11.data.users || users11.data.data || users11.data;
    log('✅', `Usuarios encontrados: ${usersList11.length}`, 'green');

    // Verificar que todos tienen company_id = 11
    const wrongCompany = usersList11.filter(u => u.company_id !== 11 && u.companyId !== 11);
    if (wrongCompany.length > 0) {
      log('❌', `FILTRADO INCORRECTO: ${wrongCompany.length} usuarios de otras empresas visibles`, 'red');
      wrongCompany.slice(0, 3).forEach(u => {
        log('⚠️', `  Usuario: ${u.firstName} ${u.lastName} - Company: ${u.company_id || u.companyId}`, 'yellow');
      });
    } else {
      log('✅', `AISLAMIENTO CORRECTO: Todos los usuarios pertenecen a empresa 11`, 'green');
    }

    // ====== LOGIN COMPANY 1 (APONNT) ======
    log('\n3️⃣', 'LOGIN - Empresa 1 (APONNT)...', 'yellow');
    try {
      const login1 = await axios.post(`${API_URL}/auth/login`, {
        identifier: 'admin',
        password: 'admin123',
        companyId: 1
      });
      token1 = login1.data.token;
      log('✅', `Login empresa 1 exitoso`, 'green');
      log('📋', `Usuario: ${login1.data.user?.firstName || 'admin'}`, 'blue');
      log('🏢', `Company ID: ${login1.data.user?.company_id || login1.data.user?.companyId}`, 'blue');

      // ====== VERIFICAR USUARIOS DE EMPRESA 1 ======
      log('\n4️⃣', 'LISTAR USUARIOS - Empresa 1...', 'yellow');
      const users1 = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token1}` }
      });

      const usersList1 = users1.data.users || users1.data.data || users1.data;
      log('✅', `Usuarios encontrados: ${usersList1.length}`, 'green');

      // Verificar que todos tienen company_id = 1
      const wrongCompany1 = usersList1.filter(u => u.company_id !== 1 && u.companyId !== 1);
      if (wrongCompany1.length > 0) {
        log('❌', `FILTRADO INCORRECTO: ${wrongCompany1.length} usuarios de otras empresas visibles`, 'red');
      } else {
        log('✅', `AISLAMIENTO CORRECTO: Todos los usuarios pertenecen a empresa 1`, 'green');
      }

    } catch (error) {
      log('⚠️', `No se pudo login a empresa 1: ${error.response?.data?.error || error.message}`, 'yellow');
      log('💡', `Esto es normal si no existe admin para empresa 1`, 'blue');
    }

    // ====== INTENTAR CREAR USUARIO SIN COMPANY_ID EXPLÍCITO ======
    log('\n5️⃣', 'TEST - Crear usuario sin company_id explícito...', 'yellow');
    const timestamp = Date.now();
    try {
      const newUser = await axios.post(`${API_URL}/users`, {
        legajo: `TENANT-TEST-${timestamp}`,
        firstName: 'Test',
        lastName: 'MultiTenant',
        email: `test_tenant_${timestamp}@test.com`,
        dni: `99999999`,
        password: 'test123',
        role: 'employee',
        department_id: 1
        // NO enviamos company_id explícito
      }, {
        headers: { Authorization: `Bearer ${token11}` }
      });

      const createdUser = newUser.data.user || newUser.data.data;
      const userCompanyId = createdUser.company_id || createdUser.companyId;

      log('✅', `Usuario creado - ID: ${createdUser.id || createdUser.user_id}`, 'green');
      log('🏢', `Company ID asignado: ${userCompanyId}`, userCompanyId === 11 ? 'green' : 'red');

      if (userCompanyId === 11) {
        log('✅', `CORRECTO: company_id heredado del token (11)`, 'green');
      } else {
        log('❌', `ERROR: company_id = ${userCompanyId}, esperado 11`, 'red');
      }

      // Cleanup
      await axios.delete(`${API_URL}/users/${createdUser.id || createdUser.user_id}`, {
        headers: { Authorization: `Bearer ${token11}` }
      });
      log('🧹', `Usuario de prueba eliminado`, 'cyan');

    } catch (error) {
      log('❌', `Error creando usuario: ${error.response?.data?.error || error.message}`, 'red');
    }

    // ====== VERIFICAR LOS 100 USUARIOS CREADOS ANTERIORMENTE ======
    log('\n6️⃣', 'VERIFICAR - Los 100 usuarios creados tienen company_id correcto...', 'yellow');
    const allUsers = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token11}` }
    });

    const allUsersList = allUsers.data.users || allUsers.data.data || allUsers.data;
    const autoUsers = allUsersList.filter(u =>
      u.legajo?.startsWith('AUTO-') || u.email?.includes('auto_user_')
    );

    log('📊', `Usuarios automáticos encontrados: ${autoUsers.length}`, 'blue');

    const correctCompany = autoUsers.filter(u => u.company_id === 11 || u.companyId === 11);
    const incorrectCompany = autoUsers.filter(u => u.company_id !== 11 && u.companyId !== 11);

    log('✅', `Con company_id correcto (11): ${correctCompany.length}`, 'green');
    if (incorrectCompany.length > 0) {
      log('❌', `Con company_id incorrecto: ${incorrectCompany.length}`, 'red');
      incorrectCompany.slice(0, 3).forEach(u => {
        log('⚠️', `  ${u.firstName} ${u.lastName} - Company: ${u.company_id || u.companyId}`, 'yellow');
      });
    }

    // ====== INTENTAR ACCESO CROSS-TENANT ======
    log('\n7️⃣', 'TEST - Intentar acceso cross-tenant (seguridad)...', 'yellow');

    // Obtener un usuario de empresa 11
    const testUser = usersList11[0];

    if (token1 && testUser) {
      try {
        // Intentar acceder desde empresa 1 a usuario de empresa 11
        await axios.get(`${API_URL}/users/${testUser.id || testUser.user_id}`, {
          headers: { Authorization: `Bearer ${token1}` }
        });
        log('❌', `VULNERABILIDAD: Empresa 1 puede ver usuario de empresa 11!`, 'red');
      } catch (error) {
        if (error.response?.status === 403 || error.response?.status === 404) {
          log('✅', `SEGURO: Acceso cross-tenant bloqueado (${error.response.status})`, 'green');
        } else {
          log('⚠️', `Error: ${error.response?.status} - ${error.response?.data?.error}`, 'yellow');
        }
      }
    } else {
      log('⏭️', `Test cross-tenant omitido (no hay token empresa 1)`, 'blue');
    }

    // ====== RESUMEN ======
    console.log('\n' + '='.repeat(70));
    log('📊', 'RESUMEN MULTI-TENANT:', 'cyan');
    console.log('='.repeat(70));
    log('🏢', `Empresa 11: ${usersList11.length} usuarios visibles`, 'blue');
    if (token1) {
      log('🏢', `Empresa 1: ${usersList1?.length || 0} usuarios visibles`, 'blue');
    }
    log('📈', `Usuarios automáticos: ${autoUsers.length} (${correctCompany.length} con company_id correcto)`, 'blue');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    log('❌', `Error en testing: ${error.message}`, 'red');
    console.error(error.response?.data || error);
  }
}

testMultiTenantIsolation();
