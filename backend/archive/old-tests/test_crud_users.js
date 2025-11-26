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

async function testUsersCRUD() {
  console.log('======================================');
  console.log('🧪 TESTING CRUD COMPLETO - USUARIOS');
  console.log('======================================\n');

  const headers = { Authorization: `Bearer ${token}` };
  let createdUserId = null;

  try {
    // CREATE
    console.log('1️⃣  CREATE - Crear nuevo usuario');
    const timestamp = Date.now();
    const createData = {
      firstName: `Test`,
      lastName: `User_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      phone: '1234567890',
      dni: `DNI${timestamp}`,
      role: 'employee',
      password: 'test123456',
      departmentId: null,
      isActive: true
    };

    const createResponse = await axios.post(`${API_URL}/users`, createData, { headers });
    createdUserId = createResponse.data.user?.id || createResponse.data.data?.id;
    console.log(`✅ Usuario creado con ID: ${createdUserId}`);
    console.log(`   Nombre: ${createResponse.data.user?.firstName || createResponse.data.data?.firstName} ${createResponse.data.user?.lastName || createResponse.data.data?.lastName}`);
    console.log(`   Email: ${createResponse.data.user?.email || createResponse.data.data?.email}\n`);

    // READ - List
    console.log('2️⃣  READ - Listar usuarios');
    const listResponse = await axios.get(`${API_URL}/users`, { headers });
    const found = listResponse.data.users.find(u => u.id === createdUserId);
    if (found) {
      console.log(`✅ Usuario encontrado en lista`);
      console.log(`   Total usuarios: ${listResponse.data.users.length}\n`);
    } else {
      console.log(`❌ Usuario NO encontrado en lista\n`);
    }

    // READ - Get by ID
    console.log('3️⃣  READ - Obtener usuario por ID');
    const getResponse = await axios.get(`${API_URL}/users/${createdUserId}`, { headers });
    console.log(`✅ Usuario obtenido`);
    console.log(`   ID: ${getResponse.data.user?.id || getResponse.data.data?.id}`);
    console.log(`   Nombre: ${getResponse.data.user?.firstName || getResponse.data.data?.firstName} ${getResponse.data.user?.lastName || getResponse.data.data?.lastName}`);
    console.log(`   Email: ${getResponse.data.user?.email || getResponse.data.data?.email}\n`);

    // UPDATE
    console.log('4️⃣  UPDATE - Actualizar usuario');
    const updatedLastName = `UserUpdated_${timestamp}`;
    const updatedPhone = '9876543210';
    const updateData = {
      firstName: 'Test',
      lastName: updatedLastName,
      email: `test_${timestamp}@example.com`,
      phone: updatedPhone,
      isActive: true
    };

    const updateResponse = await axios.put(`${API_URL}/users/${createdUserId}`, updateData, { headers });
    console.log(`✅ Usuario actualizado`);
    console.log(`   Nuevo apellido: ${updateResponse.data.user?.lastName || updateResponse.data.data?.lastName}`);
    console.log(`   Nuevo teléfono: ${updateResponse.data.user?.phone || updateResponse.data.data?.phone}\n`);

    // Verify UPDATE
    console.log('5️⃣  VERIFY UPDATE - Verificar cambios');
    const verifyResponse = await axios.get(`${API_URL}/users/${createdUserId}`, { headers });
    const verifiedUser = verifyResponse.data.user || verifyResponse.data.data;
    if (verifiedUser.lastName === updatedLastName && verifiedUser.phone === updatedPhone) {
      console.log(`✅ Cambios verificados correctamente\n`);
    } else {
      console.log(`❌ Cambios NO se guardaron\n`);
      console.log(`   Esperado lastName: ${updatedLastName}, Obtenido: ${verifiedUser.lastName}`);
      console.log(`   Esperado phone: ${updatedPhone}, Obtenido: ${verifiedUser.phone}\n`);
    }

    // DELETE
    console.log('6️⃣  DELETE - Eliminar usuario');
    await axios.delete(`${API_URL}/users/${createdUserId}`, { headers });
    console.log(`✅ Usuario eliminado\n`);

    // Verify DELETE
    console.log('7️⃣  VERIFY DELETE - Verificar eliminación');
    try {
      await axios.get(`${API_URL}/users/${createdUserId}`, { headers });
      console.log(`⚠️ Usuario AÚN existe después de eliminar (soft delete)\n`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`✅ Usuario eliminado correctamente (404)\n`);
      } else {
        console.log(`⚠️ Error inesperado: ${error.message}\n`);
      }
    }

    console.log('======================================');
    console.log('✅ TESTING CRUD USUARIOS COMPLETADO');
    console.log('======================================\n');

  } catch (error) {
    console.error('❌ Error en testing:', error.response?.data || error.message);

    // Cleanup: intentar eliminar si quedó creado
    if (createdUserId) {
      try {
        await axios.delete(`${API_URL}/users/${createdUserId}`, { headers });
        console.log('🧹 Cleanup: Usuario de testing eliminado');
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
    await testUsersCRUD();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
}

run();
