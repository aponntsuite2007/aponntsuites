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

async function testDepartmentsCRUD() {
  console.log('======================================');
  console.log('🧪 TESTING CRUD COMPLETO - DEPARTAMENTOS');
  console.log('======================================\n');

  const headers = { Authorization: `Bearer ${token}` };
  let createdDeptId = null;

  try {
    // CREATE
    console.log('1️⃣  CREATE - Crear nuevo departamento');
    const timestamp = Date.now();
    const createData = {
      name: `TEST_DEPT_${timestamp}`,
      description: 'Departamento creado automáticamente para testing',
      gpsLocation: {
        lat: -25.2637,
        lng: -57.5759
      },
      coverageRadius: 100,
      branchId: '14a6221f-a488-4a63-9723-cd58f82d14ff', // Casa Central
      isActive: true
    };

    const createResponse = await axios.post(`${API_URL}/departments`, createData, { headers });
    createdDeptId = createResponse.data.department?.id || createResponse.data.data?.id;
    const dept = createResponse.data.department || createResponse.data.data;
    console.log(`✅ Departamento creado con ID: ${createdDeptId}`);
    console.log(`   Nombre: ${dept.name}`);
    console.log(`   GPS: ${dept.gpsLocation?.lat}, ${dept.gpsLocation?.lng}\n`);

    // READ - List
    console.log('2️⃣  READ - Listar departamentos');
    const listResponse = await axios.get(`${API_URL}/departments`, { headers });
    const found = listResponse.data.departments.find(d => d.id === createdDeptId);
    if (found) {
      console.log(`✅ Departamento encontrado en lista`);
      console.log(`   Total departamentos: ${listResponse.data.departments.length}\n`);
    } else {
      console.log(`❌ Departamento NO encontrado en lista\n`);
    }

    // READ - Get by ID
    console.log('3️⃣  READ - Obtener departamento por ID');
    const getResponse = await axios.get(`${API_URL}/departments/${createdDeptId}`, { headers });
    const getDept = getResponse.data.department || getResponse.data.data;
    console.log(`✅ Departamento obtenido`);
    console.log(`   ID: ${getDept.id}`);
    console.log(`   Nombre: ${getDept.name}`);
    console.log(`   GPS: ${getDept.gpsLocation?.lat}, ${getDept.gpsLocation?.lng}\n`);

    // UPDATE
    console.log('4️⃣  UPDATE - Actualizar departamento');
    const updatedName = `TEST_DEPT_UPDATED_${timestamp}`;
    const updateData = {
      name: updatedName,
      description: 'Descripción actualizada',
      gpsLocation: {
        lat: -25.3000,
        lng: -57.6000
      },
      coverageRadius: 150,
      branchId: '14a6221f-a488-4a63-9723-cd58f82d14ff',
      isActive: true
    };

    const updateResponse = await axios.put(`${API_URL}/departments/${createdDeptId}`, updateData, { headers });
    const updDept = updateResponse.data.department || updateResponse.data.data;
    console.log(`✅ Departamento actualizado`);
    console.log(`   Nuevo nombre: ${updDept.name}`);
    console.log(`   Nuevo GPS: ${updDept.gpsLocation?.lat}, ${updDept.gpsLocation?.lng}\n`);

    // Verify UPDATE
    console.log('5️⃣  VERIFY UPDATE - Verificar cambios');
    const verifyResponse = await axios.get(`${API_URL}/departments/${createdDeptId}`, { headers });
    const verified = verifyResponse.data.department || verifyResponse.data.data;
    if (verified.name === updatedName && verified.gpsLocation?.lat === -25.3000) {
      console.log(`✅ Cambios verificados correctamente\n`);
    } else {
      console.log(`❌ Cambios NO se guardaron\n`);
      console.log(`   Esperado nombre: ${updatedName}, Obtenido: ${verified.name}`);
      console.log(`   Esperado gpsLocation.lat: -25.3000, Obtenido: ${verified.gpsLocation?.lat}\n`);
    }

    // DELETE
    console.log('6️⃣  DELETE - Eliminar departamento');
    await axios.delete(`${API_URL}/departments/${createdDeptId}`, { headers });
    console.log(`✅ Departamento eliminado\n`);

    // Verify DELETE
    console.log('7️⃣  VERIFY DELETE - Verificar eliminación');
    try {
      await axios.get(`${API_URL}/departments/${createdDeptId}`, { headers });
      console.log(`⚠️ Departamento AÚN existe después de eliminar (soft delete)\n`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`✅ Departamento eliminado correctamente (404)\n`);
      } else {
        console.log(`⚠️ Error inesperado: ${error.message}\n`);
      }
    }

    console.log('======================================');
    console.log('✅ TESTING CRUD DEPARTAMENTOS COMPLETADO');
    console.log('======================================\n');

  } catch (error) {
    console.error('❌ Error en testing:', error.response?.data || error.message);

    // Cleanup: intentar eliminar si quedó creado
    if (createdDeptId) {
      try {
        await axios.delete(`${API_URL}/departments/${createdDeptId}`, { headers });
        console.log('🧹 Cleanup: Departamento de testing eliminado');
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
    await testDepartmentsCRUD();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
}

run();
