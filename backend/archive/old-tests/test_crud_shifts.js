const axios = require('axios');

const API_URL = 'http://localhost:9999/api/v1';
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

async function testShiftsCRUD() {
  console.log('======================================');
  console.log('🧪 TESTING CRUD COMPLETO - TURNOS');
  console.log('======================================\n');

  const headers = { Authorization: `Bearer ${token}` };
  let createdShiftId = null;

  try {
    // CREATE
    console.log('1️⃣  CREATE - Crear nuevo turno');
    const timestamp = Date.now();
    const createData = {
      name: `TEST_SHIFT_${timestamp}`,
      description: 'Turno creado automáticamente para testing',
      startTime: '08:00',
      endTime: '17:00',
      workDays: [1, 2, 3, 4, 5], // Lunes a Viernes
      isActive: true
    };

    const createResponse = await axios.post(`${API_URL}/shifts`, createData, { headers });
    createdShiftId = createResponse.data.shift?.id || createResponse.data.data?.id;
    const shift = createResponse.data.shift || createResponse.data.data;
    console.log(`✅ Turno creado con ID: ${createdShiftId}`);
    console.log(`   Nombre: ${shift.name}`);
    console.log(`   Horario: ${shift.startTime} - ${shift.endTime}\n`);

    // READ - List
    console.log('2️⃣  READ - Listar turnos');
    const listResponse = await axios.get(`${API_URL}/shifts`, { headers });
    const found = listResponse.data.shifts.find(s => s.id === createdShiftId);
    if (found) {
      console.log(`✅ Turno encontrado en lista`);
      console.log(`   Total turnos: ${listResponse.data.shifts.length}\n`);
    } else {
      console.log(`❌ Turno NO encontrado en lista\n`);
    }

    // READ - Get by ID
    console.log('3️⃣  READ - Obtener turno por ID');
    const getResponse = await axios.get(`${API_URL}/shifts/${createdShiftId}`, { headers });
    const getShift = getResponse.data.shift || getResponse.data.data;
    console.log(`✅ Turno obtenido`);
    console.log(`   ID: ${getShift.id}`);
    console.log(`   Nombre: ${getShift.name}`);
    console.log(`   Horario: ${getShift.startTime} - ${getShift.endTime}\n`);

    // UPDATE
    console.log('4️⃣  UPDATE - Actualizar turno');
    const updatedName = `TEST_SHIFT_UPDATED_${timestamp}`;
    const updateData = {
      name: updatedName,
      description: 'Descripción actualizada',
      startTime: '09:00',
      endTime: '18:00',
      workDays: [1, 2, 3, 4, 5],
      isActive: true
    };

    const updateResponse = await axios.put(`${API_URL}/shifts/${createdShiftId}`, updateData, { headers });
    const updShift = updateResponse.data.shift || updateResponse.data.data;
    console.log(`✅ Turno actualizado`);
    console.log(`   Nuevo nombre: ${updShift.name}`);
    console.log(`   Nuevo horario: ${updShift.startTime} - ${updShift.endTime}\n`);

    // Verify UPDATE
    console.log('5️⃣  VERIFY UPDATE - Verificar cambios');
    const verifyResponse = await axios.get(`${API_URL}/shifts/${createdShiftId}`, { headers });
    const verified = verifyResponse.data.shift || verifyResponse.data.data;
    if (verified.name === updatedName && verified.startTime.startsWith('09:00')) {
      console.log(`✅ Cambios verificados correctamente\n`);
    } else {
      console.log(`❌ Cambios NO se guardaron\n`);
      console.log(`   Esperado nombre: ${updatedName}, Obtenido: ${verified.name}`);
      console.log(`   Esperado startTime: 09:00, Obtenido: ${verified.startTime}\n`);
    }

    // DELETE
    console.log('6️⃣  DELETE - Eliminar turno');
    await axios.delete(`${API_URL}/shifts/${createdShiftId}`, { headers });
    console.log(`✅ Turno eliminado\n`);

    // Verify DELETE
    console.log('7️⃣  VERIFY DELETE - Verificar eliminación');
    try {
      const deleteVerifyResponse = await axios.get(`${API_URL}/shifts/${createdShiftId}`, { headers });
      const deletedShift = deleteVerifyResponse.data.shift || deleteVerifyResponse.data.data;
      if (deletedShift.isActive === false) {
        console.log(`✅ Turno desactivado correctamente (soft delete)\n`);
      } else {
        console.log(`⚠️ Turno NO fue desactivado (isActive: ${deletedShift.isActive})\n`);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`✅ Turno eliminado completamente (404 - hard delete)\n`);
      } else {
        console.log(`⚠️ Error inesperado: ${error.message}\n`);
      }
    }

    console.log('======================================');
    console.log('✅ TESTING CRUD TURNOS COMPLETADO');
    console.log('======================================\n');

  } catch (error) {
    console.error('❌ Error en testing:', error.response?.data || error.message);

    // Cleanup: intentar eliminar si quedó creado
    if (createdShiftId) {
      try {
        await axios.delete(`${API_URL}/shifts/${createdShiftId}`, { headers });
        console.log('🧹 Cleanup: Turno de testing eliminado');
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
    await testShiftsCRUD();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
}

run();
