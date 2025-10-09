const axios = require('axios');

const API_URL = 'http://localhost:9998/api/v1';
let token = null;

async function login() {
  console.log('📝 Login...');
  const response = await axios.post(`${API_URL}/auth/login`, {
    identifier: 'admin',
    password: '123456',
    companyId: 11
  });
  token = response.data.token;
  console.log('✅ Login OK\n');
}

async function testKiosksCRUD() {
  console.log('======================================');
  console.log('🧪 TESTING CRUD COMPLETO - KIOSCOS');
  console.log('======================================\n');

  const headers = { Authorization: `Bearer ${token}` };
  let createdKioskId = null;

  try {
    // CREATE
    console.log('1️⃣  CREATE - Crear nuevo kiosko');
    const timestamp = Date.now();
    const createData = {
      name: `TEST_AUTO_${timestamp}`,
      location: 'Piso 3 - Testing',
      description: 'Kiosko creado automáticamente para testing',
      isActive: true
    };

    const createResponse = await axios.post(`${API_URL}/kiosks`, createData, { headers });
    createdKioskId = createResponse.data.data.id;
    console.log(`✅ Kiosko creado con ID: ${createdKioskId}`);
    console.log(`   Nombre: ${createResponse.data.data.name}`);
    console.log(`   Location: ${createResponse.data.data.location}\n`);

    // READ - List
    console.log('2️⃣  READ - Listar kioscos');
    const listResponse = await axios.get(`${API_URL}/kiosks`, { headers });
    const found = listResponse.data.kiosks.find(k => k.id === createdKioskId);
    if (found) {
      console.log(`✅ Kiosko encontrado en lista`);
      console.log(`   Total kioscos: ${listResponse.data.kiosks.length}\n`);
    } else {
      console.log(`❌ Kiosko NO encontrado en lista\n`);
    }

    // READ - Get by ID
    console.log('3️⃣  READ - Obtener kiosko por ID');
    const getResponse = await axios.get(`${API_URL}/kiosks/${createdKioskId}`, { headers });
    console.log(`✅ Kiosko obtenido`);
    console.log(`   ID: ${getResponse.data.data.id}`);
    console.log(`   Nombre: ${getResponse.data.data.name}`);
    console.log(`   Location: ${getResponse.data.data.location}\n`);

    // UPDATE
    console.log('4️⃣  UPDATE - Actualizar kiosko');
    const updatedName = `TEST_AUTO_UPDATED_${timestamp}`;
    const updateData = {
      name: updatedName,
      location: 'Piso 4 - Testing Actualizado',
      description: 'Descripción actualizada',
      isActive: true
    };

    const updateResponse = await axios.put(`${API_URL}/kiosks/${createdKioskId}`, updateData, { headers });
    console.log(`✅ Kiosko actualizado`);
    console.log(`   Nuevo nombre: ${updateResponse.data.data.name}`);
    console.log(`   Nueva location: ${updateResponse.data.data.location}\n`);

    // Verify UPDATE
    console.log('5️⃣  VERIFY UPDATE - Verificar cambios');
    const verifyResponse = await axios.get(`${API_URL}/kiosks/${createdKioskId}`, { headers });
    if (verifyResponse.data.data.name === updatedName) {
      console.log(`✅ Cambios verificados correctamente\n`);
    } else {
      console.log(`❌ Cambios NO se guardaron\n`);
    }

    // DELETE
    console.log('6️⃣  DELETE - Eliminar kiosko');
    await axios.delete(`${API_URL}/kiosks/${createdKioskId}`, { headers });
    console.log(`✅ Kiosko eliminado\n`);

    // Verify DELETE
    console.log('7️⃣  VERIFY DELETE - Verificar eliminación');
    try {
      await axios.get(`${API_URL}/kiosks/${createdKioskId}`, { headers });
      console.log(`❌ Kiosko AÚN existe después de eliminar\n`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`✅ Kiosko eliminado correctamente (404)\n`);
      } else {
        console.log(`⚠️ Error inesperado: ${error.message}\n`);
      }
    }

    console.log('======================================');
    console.log('✅ TESTING CRUD KIOSCOS COMPLETADO');
    console.log('======================================\n');

  } catch (error) {
    console.error('❌ Error en testing:', error.response?.data || error.message);

    // Cleanup: intentar eliminar si quedó creado
    if (createdKioskId) {
      try {
        await axios.delete(`${API_URL}/kiosks/${createdKioskId}`, { headers });
        console.log('🧹 Cleanup: Kiosko de testing eliminado');
      } catch (e) {
        // Ignorar error de cleanup
      }
    }

    process.exit(1);
  }
}

async function run() {
  try {
    await login();
    await testKiosksCRUD();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
}

run();
