const axios = require('axios');

const API_URL = 'http://localhost:9999/api/v1';
let token = null;
let testKioskId = null;

// Configuración de colores para output
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
    log('👤', `Usuario: ${response.data.user?.email || 'admin'}`, 'blue');
    log('🏢', `Empresa ID: ${response.data.user?.company_id || 11}`, 'blue');
    return true;
  } catch (error) {
    log('❌', `Login FALLIDO: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testKioskCRUD_RealDatabase() {
  console.log('\n' + '='.repeat(70));
  log('🗄️', 'TESTING REAL DATABASE - KIOSCOS (PostgreSQL)', 'cyan');
  console.log('='.repeat(70) + '\n');

  const headers = { Authorization: `Bearer ${token}` };
  const timestamp = Date.now();

  try {
    // ====== CREATE - Escribir a base de datos REAL ======
    log('1️⃣', 'CREATE - Insertando kiosko en PostgreSQL...', 'yellow');
    const createData = {
      name: `KIOSKO_REAL_TEST_${timestamp}`,
      description: 'Kiosko de testing con datos reales en PostgreSQL',
      location: 'Planta Principal - Entrada',
      deviceId: `DEV-${timestamp}`,
      gpsLocation: {
        lat: -25.2637,
        lng: -57.5759
      }
    };

    log('📝', `Datos a insertar: ${createData.name}`, 'blue');
    const createResponse = await axios.post(`${API_URL}/kiosks`, createData, { headers });

    testKioskId = createResponse.data.data?.id;

    if (!testKioskId) {
      log('❌', 'CREATE FALLIDO - No se recibió ID del kiosko creado', 'red');
      log('📄', `Response: ${JSON.stringify(createResponse.data)}`, 'yellow');
      throw new Error('No se pudo crear el kiosko');
    }

    log('✅', `Kiosko creado en DB - ID: ${testKioskId}`, 'green');
    log('📍', `GPS: ${createData.gpsLocation.lat}, ${createData.gpsLocation.lng}`, 'blue');

    // Verificar respuesta
    if (createResponse.data.data.name !== createData.name) {
      log('⚠️', 'Nombre en respuesta no coincide', 'yellow');
    }

    // ====== READ LIST - Leer de base de datos REAL ======
    log('\n2️⃣', 'READ LIST - Leyendo todos los kioscos de PostgreSQL...', 'yellow');
    const listResponse = await axios.get(`${API_URL}/kiosks`, { headers });

    if (!listResponse.data.kiosks) {
      log('❌', 'READ LIST FALLIDO - No se recibió array de kiosks', 'red');
      log('📄', `Response: ${JSON.stringify(listResponse.data)}`, 'yellow');
      throw new Error('Estructura de respuesta incorrecta');
    }

    const foundInList = listResponse.data.kiosks.find(k => k.id === testKioskId);

    if (foundInList) {
      log('✅', `Kiosko encontrado en lista (${listResponse.data.count} total)`, 'green');
      log('📋', `Nombre: ${foundInList.name}`, 'blue');
    } else {
      log('❌', `Kiosko NO encontrado en lista de ${listResponse.data.count} kioscos`, 'red');
      throw new Error('Kiosko no aparece en lista después de crearlo');
    }

    // ====== READ BY ID - Leer registro específico ======
    log('\n3️⃣', 'READ BY ID - Obteniendo kiosko específico de PostgreSQL...', 'yellow');
    const getResponse = await axios.get(`${API_URL}/kiosks/${testKioskId}`, { headers });

    if (!getResponse.data.data) {
      log('❌', 'READ BY ID FALLIDO - No se recibieron datos', 'red');
      throw new Error('No se pudo obtener kiosko por ID');
    }

    const kioskData = getResponse.data.data;
    log('✅', `Kiosko obtenido - ID: ${kioskData.id}`, 'green');
    log('📋', `Nombre: ${kioskData.name}`, 'blue');
    log('📍', `Ubicación: ${kioskData.location}`, 'blue');
    log('📍', `GPS: ${kioskData.gpsLocation?.lat}, ${kioskData.gpsLocation?.lng}`, 'blue');
    log('🏷️', `Device ID: ${kioskData.deviceId}`, 'blue');

    // Verificar todos los datos
    if (kioskData.name !== createData.name) {
      log('❌', `Nombre incorrecto: esperado "${createData.name}", obtenido "${kioskData.name}"`, 'red');
    }
    if (kioskData.location !== createData.location) {
      log('❌', `Location incorrecta: esperada "${createData.location}", obtenida "${kioskData.location}"`, 'red');
    }

    // ====== UPDATE - Modificar datos en base de datos REAL ======
    log('\n4️⃣', 'UPDATE - Modificando datos en PostgreSQL...', 'yellow');
    const updateData = {
      name: `KIOSKO_ACTUALIZADO_${timestamp}`,
      description: 'Descripción actualizada - Testing real DB',
      location: 'Planta Principal - Recepción (ACTUALIZADO)',
      gpsLocation: {
        lat: -25.2700,
        lng: -57.5800
      }
    };

    log('📝', `Nuevo nombre: ${updateData.name}`, 'blue');
    const updateResponse = await axios.put(`${API_URL}/kiosks/${testKioskId}`, updateData, { headers });

    if (!updateResponse.data.success) {
      log('❌', 'UPDATE FALLIDO', 'red');
      throw new Error('No se pudo actualizar el kiosko');
    }

    log('✅', 'Kiosko actualizado en DB', 'green');
    log('📋', `Nuevo nombre: ${updateResponse.data.data.name}`, 'blue');

    // ====== VERIFY UPDATE - Verificar persistencia en DB ======
    log('\n5️⃣', 'VERIFY UPDATE - Verificando persistencia en PostgreSQL...', 'yellow');
    const verifyResponse = await axios.get(`${API_URL}/kiosks/${testKioskId}`, { headers });
    const updated = verifyResponse.data.data;

    let updateErrors = 0;

    if (updated.name !== updateData.name) {
      log('❌', `Nombre NO persistió: esperado "${updateData.name}", obtenido "${updated.name}"`, 'red');
      updateErrors++;
    } else {
      log('✅', `Nombre persistió correctamente: ${updated.name}`, 'green');
    }

    if (updated.location !== updateData.location) {
      log('❌', `Location NO persistió: esperada "${updateData.location}", obtenida "${updated.location}"`, 'red');
      updateErrors++;
    } else {
      log('✅', `Location persistió correctamente`, 'green');
    }

    if (Math.abs(updated.gpsLocation.lat - updateData.gpsLocation.lat) > 0.0001) {
      log('❌', `GPS LAT NO persistió: esperado ${updateData.gpsLocation.lat}, obtenido ${updated.gpsLocation.lat}`, 'red');
      updateErrors++;
    } else {
      log('✅', `GPS persistió correctamente`, 'green');
    }

    if (updateErrors > 0) {
      log('⚠️', `${updateErrors} errores de persistencia detectados`, 'yellow');
    } else {
      log('🎉', 'Todos los cambios persistieron correctamente en PostgreSQL', 'green');
    }

    // ====== DELETE - Eliminar de base de datos REAL (soft delete) ======
    log('\n6️⃣', 'DELETE - Eliminando kiosko de PostgreSQL (soft delete)...', 'yellow');
    await axios.delete(`${API_URL}/kiosks/${testKioskId}`, { headers });
    log('✅', 'DELETE ejecutado', 'green');

    // ====== VERIFY DELETE - Verificar soft delete ======
    log('\n7️⃣', 'VERIFY DELETE - Verificando soft delete en PostgreSQL...', 'yellow');
    const afterDeleteList = await axios.get(`${API_URL}/kiosks`, { headers });
    const stillInList = afterDeleteList.data.kiosks.find(k => k.id === testKioskId);

    if (stillInList) {
      log('❌', 'Kiosko AÚN aparece en lista (soft delete no filtra correctamente)', 'red');
      log('⚠️', `isActive: ${stillInList.isActive}`, 'yellow');
    } else {
      log('✅', 'Kiosko NO aparece en lista (soft delete funciona correctamente)', 'green');
    }

    // Intentar obtener directamente por ID (algunos sistemas permiten ver registros soft-deleted)
    try {
      const deletedResponse = await axios.get(`${API_URL}/kiosks/${testKioskId}`, { headers });
      if (deletedResponse.data.data.isActive === false) {
        log('✅', 'Kiosko marcado como inactivo (isActive: false)', 'green');
      } else {
        log('⚠️', `Kiosko NO está inactivo (isActive: ${deletedResponse.data.data.isActive})`, 'yellow');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        log('✅', 'Kiosko no accesible por ID (404 - filtrado por soft delete)', 'green');
      }
    }

    console.log('\n' + '='.repeat(70));
    log('🎉', 'TESTING REAL DATABASE COMPLETADO - KIOSCOS', 'green');
    console.log('='.repeat(70) + '\n');

    return true;

  } catch (error) {
    console.log('\n' + '='.repeat(70));
    log('❌', 'ERROR EN TESTING REAL DATABASE', 'red');
    console.log('='.repeat(70));
    log('📄', `Error: ${error.message}`, 'red');

    if (error.response) {
      log('🔍', `Status: ${error.response.status}`, 'yellow');
      log('🔍', `Data: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }

    // Cleanup: intentar eliminar kiosko de testing si quedó creado
    if (testKioskId) {
      try {
        await axios.delete(`${API_URL}/kiosks/${testKioskId}`, { headers });
        log('🧹', 'Cleanup: Kiosko de testing eliminado', 'cyan');
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
    const success = await testKioskCRUD_RealDatabase();

    process.exit(success ? 0 : 1);
  } catch (error) {
    log('❌', `Error fatal: ${error.message}`, 'red');
    process.exit(1);
  }
}

run();
