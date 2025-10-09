const axios = require('axios');

const API_URL = 'http://localhost:9999/api/v1';
let token = null;
let testDepartmentId = null;

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

async function testDepartmentsCRUD_RealDatabase() {
  console.log('\n' + '='.repeat(70));
  log('🗄️', 'TESTING REAL DATABASE - DEPARTAMENTOS (PostgreSQL)', 'cyan');
  console.log('='.repeat(70) + '\n');

  const headers = { Authorization: `Bearer ${token}` };
  const timestamp = Date.now();

  try {
    // ====== GET BRANCH ID - Obtener sucursal para empresa multi-branch ======
    log('0️⃣', 'Obteniendo sucursal disponible...', 'cyan');
    const branchesResponse = await axios.get(`${API_URL}/branches`, { headers });
    const branches = branchesResponse.data.branches || branchesResponse.data.data || branchesResponse.data;

    if (!Array.isArray(branches) || branches.length === 0) {
      throw new Error('No hay sucursales disponibles para testing');
    }

    const branchId = branches[0].id;
    log('✅', `Sucursal seleccionada: ID ${branchId} - ${branches[0].name || 'Sin nombre'}`, 'green');

    // ====== CREATE - Escribir a base de datos REAL ======
    log('\n1️⃣', 'CREATE - Insertando departamento en PostgreSQL...', 'yellow');
    const createData = {
      name: `DEPT_REAL_TEST_${timestamp}`,
      description: 'Departamento de testing con datos reales en PostgreSQL',
      code: `DEPT-${timestamp}`,
      branchId: branchId,
      gpsLocation: {
        lat: -25.2637,
        lng: -57.5759
      },
      radius: 100
    };

    log('📝', `Datos a insertar: ${createData.name}`, 'blue');
    log('🏢', `Sucursal: ${branchId}`, 'blue');
    const createResponse = await axios.post(`${API_URL}/departments`, createData, { headers });

    testDepartmentId = createResponse.data.department?.id ||
                       createResponse.data.data?.id ||
                       createResponse.data.id;

    if (!testDepartmentId) {
      log('❌', 'CREATE FALLIDO - No se recibió ID del departamento creado', 'red');
      log('📄', `Response: ${JSON.stringify(createResponse.data)}`, 'yellow');
      throw new Error('No se pudo crear el departamento');
    }

    log('✅', `Departamento creado en DB - ID: ${testDepartmentId}`, 'green');
    log('📍', `GPS: ${createData.gpsLocation.lat}, ${createData.gpsLocation.lng}`, 'blue');
    log('📏', `Radio: ${createData.radius}m`, 'blue');

    // ====== READ LIST - Leer de base de datos REAL ======
    log('\n2️⃣', 'READ LIST - Leyendo todos los departamentos de PostgreSQL...', 'yellow');
    const listResponse = await axios.get(`${API_URL}/departments`, { headers });

    const departments = listResponse.data.departments ||
                       listResponse.data.data ||
                       listResponse.data;

    if (!Array.isArray(departments)) {
      log('❌', 'READ LIST FALLIDO - No se recibió array de departments', 'red');
      log('📄', `Response: ${JSON.stringify(listResponse.data).substring(0, 200)}`, 'yellow');
      throw new Error('Estructura de respuesta incorrecta');
    }

    const foundInList = departments.find(d => d.id === testDepartmentId);

    if (foundInList) {
      log('✅', `Departamento encontrado en lista (${departments.length} total)`, 'green');
      log('📋', `Nombre: ${foundInList.name}`, 'blue');
    } else {
      log('❌', `Departamento NO encontrado en lista de ${departments.length} departamentos`, 'red');
      throw new Error('Departamento no aparece en lista después de crearlo');
    }

    // ====== READ BY ID - Leer registro específico ======
    log('\n3️⃣', 'READ BY ID - Obteniendo departamento específico de PostgreSQL...', 'yellow');
    const getResponse = await axios.get(`${API_URL}/departments/${testDepartmentId}`, { headers });

    const deptData = getResponse.data.department || getResponse.data.data || getResponse.data;

    if (!deptData) {
      log('❌', 'READ BY ID FALLIDO - No se recibieron datos', 'red');
      throw new Error('No se pudo obtener departamento por ID');
    }

    log('✅', `Departamento obtenido - ID: ${deptData.id}`, 'green');
    log('📋', `Nombre: ${deptData.name}`, 'blue');
    log('📝', `Código: ${deptData.code || 'N/A'}`, 'blue');
    log('📍', `GPS: ${deptData.gpsLocation?.lat || 'N/A'}, ${deptData.gpsLocation?.lng || 'N/A'}`, 'blue');
    log('📏', `Radio: ${deptData.radius || 'N/A'}m`, 'blue');

    // Verificar datos
    if (deptData.name !== createData.name) {
      log('❌', `Nombre incorrecto: esperado "${createData.name}", obtenido "${deptData.name}"`, 'red');
    }

    // ====== UPDATE - Modificar datos en base de datos REAL ======
    log('\n4️⃣', 'UPDATE - Modificando datos en PostgreSQL...', 'yellow');
    const updateData = {
      name: `DEPT_ACTUALIZADO_${timestamp}`,
      description: 'Descripción actualizada - Testing real DB',
      code: `DEPT-UPD-${timestamp}`,
      gpsLocation: {
        lat: -25.2700,
        lng: -57.5800
      },
      radius: 150
    };

    log('📝', `Nuevo nombre: ${updateData.name}`, 'blue');
    const updateResponse = await axios.put(`${API_URL}/departments/${testDepartmentId}`, updateData, { headers });

    if (!updateResponse.data.success && !updateResponse.data.department && !updateResponse.data.data) {
      log('❌', 'UPDATE FALLIDO', 'red');
      log('📄', `Response: ${JSON.stringify(updateResponse.data)}`, 'yellow');
      throw new Error('No se pudo actualizar el departamento');
    }

    log('✅', 'Departamento actualizado en DB', 'green');

    // ====== VERIFY UPDATE - Verificar persistencia en DB ======
    log('\n5️⃣', 'VERIFY UPDATE - Verificando persistencia en PostgreSQL...', 'yellow');
    const verifyResponse = await axios.get(`${API_URL}/departments/${testDepartmentId}`, { headers });
    const updated = verifyResponse.data.department || verifyResponse.data.data || verifyResponse.data;

    let updateErrors = 0;

    if (updated.name !== updateData.name) {
      log('❌', `Nombre NO persistió: esperado "${updateData.name}", obtenido "${updated.name}"`, 'red');
      updateErrors++;
    } else {
      log('✅', `Nombre persistió correctamente: ${updated.name}`, 'green');
    }

    if (updated.code !== updateData.code) {
      log('❌', `Código NO persistió: esperado "${updateData.code}", obtenido "${updated.code}"`, 'red');
      updateErrors++;
    } else {
      log('✅', `Código persistió correctamente: ${updated.code}`, 'green');
    }

    // Verificar GPS
    if (updated.gpsLocation) {
      if (Math.abs(updated.gpsLocation.lat - updateData.gpsLocation.lat) > 0.0001) {
        log('❌', `GPS LAT NO persistió: esperado ${updateData.gpsLocation.lat}, obtenido ${updated.gpsLocation.lat}`, 'red');
        updateErrors++;
      } else {
        log('✅', `GPS LAT persistió correctamente: ${updated.gpsLocation.lat}`, 'green');
      }
    }

    if (updateErrors > 0) {
      log('⚠️', `${updateErrors} errores de persistencia detectados`, 'yellow');
    } else {
      log('🎉', 'Todos los cambios persistieron correctamente en PostgreSQL', 'green');
    }

    // ====== DELETE - Eliminar de base de datos REAL ======
    log('\n6️⃣', 'DELETE - Eliminando departamento de PostgreSQL...', 'yellow');
    await axios.delete(`${API_URL}/departments/${testDepartmentId}`, { headers });
    log('✅', 'DELETE ejecutado', 'green');

    // ====== VERIFY DELETE - Verificar eliminación ======
    log('\n7️⃣', 'VERIFY DELETE - Verificando eliminación en PostgreSQL...', 'yellow');
    try {
      const deletedResponse = await axios.get(`${API_URL}/departments/${testDepartmentId}`, { headers });
      log('⚠️', 'Departamento AÚN accesible (posible soft delete)', 'yellow');

      const deleted = deletedResponse.data.department || deletedResponse.data.data;
      if (deleted.isActive === false || deleted.is_active === false) {
        log('✅', 'Departamento marcado como inactivo (soft delete correcto)', 'green');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        log('✅', 'Departamento eliminado completamente (404 - hard delete)', 'green');
      } else {
        log('⚠️', `Error inesperado: ${error.message}`, 'yellow');
      }
    }

    console.log('\n' + '='.repeat(70));
    log('🎉', 'TESTING REAL DATABASE COMPLETADO - DEPARTAMENTOS', 'green');
    console.log('='.repeat(70) + '\n');

    return true;

  } catch (error) {
    console.log('\n' + '='.repeat(70));
    log('❌', 'ERROR EN TESTING REAL DATABASE - DEPARTAMENTOS', 'red');
    console.log('='.repeat(70));
    log('📄', `Error: ${error.message}`, 'red');

    if (error.response) {
      log('🔍', `Status: ${error.response.status}`, 'yellow');
      log('🔍', `Data: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }

    // Cleanup
    if (testDepartmentId) {
      try {
        await axios.delete(`${API_URL}/departments/${testDepartmentId}`, { headers });
        log('🧹', 'Cleanup: Departamento de testing eliminado', 'cyan');
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
    const success = await testDepartmentsCRUD_RealDatabase();

    process.exit(success ? 0 : 1);
  } catch (error) {
    log('❌', `Error fatal: ${error.message}`, 'red');
    process.exit(1);
  }
}

run();
