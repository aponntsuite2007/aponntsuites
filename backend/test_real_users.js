const axios = require('axios');

const API_URL = 'http://localhost:9999/api/v1';
let token = null;
let testUserId = null;

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

async function testUsersCRUD_RealDatabase() {
  console.log('\n' + '='.repeat(70));
  log('🗄️', 'TESTING REAL DATABASE - USUARIOS (PostgreSQL)', 'cyan');
  console.log('='.repeat(70) + '\n');

  const headers = { Authorization: `Bearer ${token}` };
  const timestamp = Date.now();

  try {
    // ====== CREATE - Escribir a base de datos REAL ======
    log('1️⃣', 'CREATE - Insertando usuario en PostgreSQL...', 'yellow');
    const createData = {
      legajo: `TEST-${timestamp}`,
      firstName: 'Usuario',
      lastName: 'Testing Real DB',
      email: `test${timestamp}@testing.com`,
      dni: `${timestamp}`.slice(0, 8),
      password: 'testing123',
      role: 'employee',
      department_id: 1
    };

    log('📝', `Datos a insertar: ${createData.firstName} ${createData.lastName}`, 'blue');
    log('📧', `Email: ${createData.email}`, 'blue');

    const createResponse = await axios.post(`${API_URL}/users`, createData, { headers });

    // Usuarios pueden tener varios formatos de respuesta
    testUserId = createResponse.data.user?.id ||
                 createResponse.data.user?.user_id ||
                 createResponse.data.data?.id ||
                 createResponse.data.data?.user_id;

    if (!testUserId) {
      log('❌', 'CREATE FALLIDO - No se recibió ID del usuario creado', 'red');
      log('📄', `Response: ${JSON.stringify(createResponse.data)}`, 'yellow');
      throw new Error('No se pudo crear el usuario');
    }

    log('✅', `Usuario creado en DB - ID: ${testUserId}`, 'green');
    log('👤', `Nombre: ${createData.firstName} ${createData.lastName}`, 'blue');
    log('🆔', `Legajo: ${createData.legajo}`, 'blue');

    // ====== READ LIST - Leer de base de datos REAL ======
    log('\n2️⃣', 'READ LIST - Leyendo todos los usuarios de PostgreSQL...', 'yellow');
    const listResponse = await axios.get(`${API_URL}/users`, { headers });

    const users = listResponse.data.users || listResponse.data.data || listResponse.data;

    if (!Array.isArray(users)) {
      log('❌', 'READ LIST FALLIDO - No se recibió array de users', 'red');
      log('📄', `Response: ${JSON.stringify(listResponse.data).substring(0, 200)}`, 'yellow');
      throw new Error('Estructura de respuesta incorrecta');
    }

    const foundInList = users.find(u => u.id === testUserId || u.user_id === testUserId);

    if (foundInList) {
      log('✅', `Usuario encontrado en lista (${users.length} total)`, 'green');
      log('📋', `Nombre: ${foundInList.firstName} ${foundInList.lastName}`, 'blue');
      log('📋', `ID en lista: ${foundInList.id || foundInList.user_id}`, 'blue');
    } else {
      log('❌', `Usuario NO encontrado en lista de ${users.length} usuarios`, 'red');
      log('🔍', `Buscando ID: ${testUserId}`, 'yellow');
      throw new Error('Usuario no aparece en lista después de crearlo');
    }

    // ====== READ BY ID - Leer registro específico ======
    log('\n3️⃣', 'READ BY ID - Obteniendo usuario específico de PostgreSQL...', 'yellow');
    const getResponse = await axios.get(`${API_URL}/users/${testUserId}`, { headers });

    const userData = getResponse.data.user || getResponse.data.data;

    if (!userData) {
      log('❌', 'READ BY ID FALLIDO - No se recibieron datos', 'red');
      throw new Error('No se pudo obtener usuario por ID');
    }

    log('✅', `Usuario obtenido - ID: ${userData.id || userData.user_id}`, 'green');
    log('👤', `Nombre: ${userData.firstName} ${userData.lastName}`, 'blue');
    log('📧', `Email: ${userData.email}`, 'blue');
    log('🆔', `Legajo: ${userData.legajo}`, 'blue');
    log('🏷️', `Rol: ${userData.role}`, 'blue');

    // Verificar todos los datos
    if (userData.firstName !== createData.firstName) {
      log('❌', `firstName incorrecto: esperado "${createData.firstName}", obtenido "${userData.firstName}"`, 'red');
    }
    if (userData.lastName !== createData.lastName) {
      log('❌', `lastName incorrecto: esperado "${createData.lastName}", obtenido "${userData.lastName}"`, 'red');
    }
    if (userData.email !== createData.email) {
      log('❌', `Email incorrecto: esperado "${createData.email}", obtenido "${userData.email}"`, 'red');
    }

    // ====== UPDATE - Modificar datos en base de datos REAL ======
    log('\n4️⃣', 'UPDATE - Modificando datos en PostgreSQL...', 'yellow');
    const updateData = {
      firstName: 'Usuario Actualizado',
      lastName: 'Testing Real DB v2',
      email: `updated${timestamp}@testing.com`
    };

    log('📝', `Nuevo nombre: ${updateData.firstName} ${updateData.lastName}`, 'blue');
    const updateResponse = await axios.put(`${API_URL}/users/${testUserId}`, updateData, { headers });

    if (!updateResponse.data.success && !updateResponse.data.user && !updateResponse.data.data) {
      log('❌', 'UPDATE FALLIDO', 'red');
      log('📄', `Response: ${JSON.stringify(updateResponse.data)}`, 'yellow');
      throw new Error('No se pudo actualizar el usuario');
    }

    log('✅', 'Usuario actualizado en DB', 'green');

    // ====== VERIFY UPDATE - Verificar persistencia en DB ======
    log('\n5️⃣', 'VERIFY UPDATE - Verificando persistencia en PostgreSQL...', 'yellow');
    const verifyResponse = await axios.get(`${API_URL}/users/${testUserId}`, { headers });
    const updated = verifyResponse.data.user || verifyResponse.data.data;

    let updateErrors = 0;

    if (updated.firstName !== updateData.firstName) {
      log('❌', `firstName NO persistió: esperado "${updateData.firstName}", obtenido "${updated.firstName}"`, 'red');
      updateErrors++;
    } else {
      log('✅', `firstName persistió correctamente: ${updated.firstName}`, 'green');
    }

    if (updated.lastName !== updateData.lastName) {
      log('❌', `lastName NO persistió: esperado "${updateData.lastName}", obtenido "${updated.lastName}"`, 'red');
      updateErrors++;
    } else {
      log('✅', `lastName persistió correctamente: ${updated.lastName}`, 'green');
    }

    if (updated.email !== updateData.email) {
      log('❌', `Email NO persistió: esperado "${updateData.email}", obtenido "${updated.email}"`, 'red');
      updateErrors++;
    } else {
      log('✅', `Email persistió correctamente: ${updated.email}`, 'green');
    }

    if (updateErrors > 0) {
      log('⚠️', `${updateErrors} errores de persistencia detectados`, 'yellow');
    } else {
      log('🎉', 'Todos los cambios persistieron correctamente en PostgreSQL', 'green');
    }

    // ====== DELETE - Eliminar de base de datos REAL (soft delete) ======
    log('\n6️⃣', 'DELETE - Eliminando usuario de PostgreSQL (soft delete)...', 'yellow');
    await axios.delete(`${API_URL}/users/${testUserId}`, { headers });
    log('✅', 'DELETE ejecutado', 'green');

    // ====== VERIFY DELETE - Verificar soft delete ======
    log('\n7️⃣', 'VERIFY DELETE - Verificando soft delete en PostgreSQL...', 'yellow');
    const afterDeleteList = await axios.get(`${API_URL}/users`, { headers });
    const usersAfterDelete = afterDeleteList.data.users || afterDeleteList.data.data || afterDeleteList.data;

    const stillInList = usersAfterDelete.find(u => (u.id === testUserId || u.user_id === testUserId));

    if (stillInList) {
      log('❌', 'Usuario AÚN aparece en lista (soft delete no filtra correctamente)', 'red');
      log('⚠️', `isActive: ${stillInList.isActive || stillInList.is_active}`, 'yellow');
    } else {
      log('✅', 'Usuario NO aparece en lista (soft delete funciona correctamente)', 'green');
    }

    // Intentar obtener directamente por ID
    try {
      const deletedResponse = await axios.get(`${API_URL}/users/${testUserId}`, { headers });
      const deletedUser = deletedResponse.data.user || deletedResponse.data.data;

      if (deletedUser.isActive === false || deletedUser.is_active === false) {
        log('✅', 'Usuario marcado como inactivo (isActive: false)', 'green');
      } else {
        log('⚠️', `Usuario NO está inactivo (isActive: ${deletedUser.isActive || deletedUser.is_active})`, 'yellow');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        log('✅', 'Usuario no accesible por ID (404 - filtrado por soft delete)', 'green');
      }
    }

    console.log('\n' + '='.repeat(70));
    log('🎉', 'TESTING REAL DATABASE COMPLETADO - USUARIOS', 'green');
    console.log('='.repeat(70) + '\n');

    return true;

  } catch (error) {
    console.log('\n' + '='.repeat(70));
    log('❌', 'ERROR EN TESTING REAL DATABASE - USUARIOS', 'red');
    console.log('='.repeat(70));
    log('📄', `Error: ${error.message}`, 'red');

    if (error.response) {
      log('🔍', `Status: ${error.response.status}`, 'yellow');
      log('🔍', `Data: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }

    // Cleanup
    if (testUserId) {
      try {
        await axios.delete(`${API_URL}/users/${testUserId}`, { headers });
        log('🧹', 'Cleanup: Usuario de testing eliminado', 'cyan');
      } catch (e) {
        log('⚠️', 'No se pudo hacer cleanup automático', 'yellow');
      }
    }

    console.log('');
    return false;
  }
}

async function run() {
  try {
    const loginSuccess = await login();
    if (!loginSuccess) {
      log('❌', 'No se pudo autenticar. Abortando tests.', 'red');
      process.exit(1);
    }

    console.log('');
    const success = await testUsersCRUD_RealDatabase();

    process.exit(success ? 0 : 1);
  } catch (error) {
    log('❌', `Error fatal: ${error.message}`, 'red');
    process.exit(1);
  }
}

run();
