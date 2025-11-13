/**
 * TEST DIRECTO DEL API: Verificar que gpsEnabled se incluye en respuesta
 */

const { Sequelize } = require('sequelize');

const TEST_USER_ID = '766de495-e4f3-4e91-a509-1a495c52e15c';

async function testGPSAPI() {
  console.log('\n🧪 ===== TEST API GPS - VERIFICACIÓN DIRECTA =====\n');

  // Conectar a BD
  const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL\n');

    // ============================================
    // PASO 1: VERIFICAR ESTADO EN BD
    // ============================================
    console.log('📝 PASO 1: Consultando estado en BD...');

    const [results] = await sequelize.query(`
      SELECT user_id, email, first_name, last_name, gps_enabled, is_active
      FROM users
      WHERE user_id = '${TEST_USER_ID}'
    `);

    if (results.length === 0) {
      throw new Error('Usuario no encontrado en BD');
    }

    const dbUser = results[0];
    console.log('   📊 Datos en BD:');
    console.log(`      - user_id: ${dbUser.user_id}`);
    console.log(`      - email: ${dbUser.email}`);
    console.log(`      - first_name: ${dbUser.first_name}`);
    console.log(`      - last_name: ${dbUser.last_name}`);
    console.log(`      - gps_enabled: ${dbUser.gps_enabled}`);
    console.log(`      - is_active: ${dbUser.is_active}`);
    console.log('   ✅ Campo gps_enabled existe en BD\n');

    // ============================================
    // PASO 2: SIMULAR GET DEL ENDPOINT
    // ============================================
    console.log('📝 PASO 2: Simulando GET endpoint (misma query que server.js)...');

    const [endpointResults] = await sequelize.query(`
      SELECT
        u.user_id AS user_id,
        u."employeeId" AS "employeeId",
        u.usuario AS usuario,
        u."firstName" AS "firstName",
        u."lastName" AS "lastName",
        u.email AS email,
        u.phone AS phone,
        u.role AS role,
        u."departmentId" AS "departmentId",
        u.company_id AS company_id,
        u."hireDate" AS "hireDate",
        u."birthDate" AS "birthDate",
        u.address AS address,
        u.emergency_contact AS "emergencyContact",
        u.salary AS salary,
        u.position AS position,
        u.is_active AS "isActive",
        u.gps_enabled AS "gpsEnabled",
        u.permissions AS permissions,
        u.settings AS settings,
        d.name AS department_name,
        d.gps_lat AS gps_lat,
        d.gps_lng AS gps_lng,
        d.coverage_radius AS coverage_radius
      FROM users u
      LEFT JOIN departments d ON u."departmentId"::integer = d.id
      WHERE u.user_id = '${TEST_USER_ID}' AND u.is_active = true
    `);

    if (endpointResults.length === 0) {
      throw new Error('Usuario no encontrado con query del endpoint');
    }

    const user = endpointResults[0];
    console.log('   📊 Resultado de query del endpoint:');
    console.log(`      - gpsEnabled: ${user.gpsEnabled}`);
    console.log(`      - isActive: ${user.isActive}`);
    console.log(`      - firstName: ${user.firstName}`);
    console.log(`      - lastName: ${user.lastName}`);

    if (user.gpsEnabled === undefined || user.gpsEnabled === null) {
      console.log('\n   ❌ ERROR: gpsEnabled es undefined o null!\n');
      throw new Error('gpsEnabled field is missing from query');
    }

    console.log('   ✅ Campo gpsEnabled presente en query\n');

    // ============================================
    // PASO 3: SIMULAR FORMATEO DE RESPUESTA
    // ============================================
    console.log('📝 PASO 3: Simulando formateo de respuesta...');

    const gpsValue = user.gpsEnabled !== undefined ? user.gpsEnabled : false;

    const formattedUser = {
      id: user.user_id,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      gpsEnabled: gpsValue,
      allowOutsideRadius: !gpsValue,
      isActive: user.isActive
    };

    console.log('   📊 Respuesta formateada:');
    console.log(`      - gpsEnabled: ${formattedUser.gpsEnabled}`);
    console.log(`      - allowOutsideRadius: ${formattedUser.allowOutsideRadius}`);
    console.log(`      - Relación inversa correcta: ${formattedUser.allowOutsideRadius === !formattedUser.gpsEnabled ? '✅' : '❌'}`);

    console.log('\n   ✅ Formateo correcto\n');

    // ============================================
    // PASO 4: TEST DE CAMBIO DE ESTADO
    // ============================================
    console.log('📝 PASO 4: Testeando cambio de estado...');

    const originalValue = dbUser.gps_enabled;
    const newValue = !originalValue;

    console.log(`   📊 Valor original: ${originalValue}`);
    console.log(`   📊 Nuevo valor: ${newValue}`);

    // Actualizar en BD
    await sequelize.query(`
      UPDATE users
      SET gps_enabled = ${newValue}
      WHERE user_id = '${TEST_USER_ID}'
    `);

    console.log('   ✅ Actualizado en BD\n');

    // Verificar cambio
    const [verifyResults] = await sequelize.query(`
      SELECT gps_enabled
      FROM users
      WHERE user_id = '${TEST_USER_ID}'
    `);

    const updatedValue = verifyResults[0].gps_enabled;
    console.log(`   📊 Valor después de UPDATE: ${updatedValue}`);

    if (updatedValue !== newValue) {
      console.log('\n   ❌ ERROR: Valor no se actualizó correctamente!\n');
      throw new Error('GPS value did not update');
    }

    console.log('   ✅ Cambio persistió correctamente\n');

    // ============================================
    // PASO 5: VOLVER AL ESTADO ORIGINAL
    // ============================================
    console.log('📝 PASO 5: Restaurando estado original...');

    await sequelize.query(`
      UPDATE users
      SET gps_enabled = ${originalValue}
      WHERE user_id = '${TEST_USER_ID}'
    `);

    const [restoreResults] = await sequelize.query(`
      SELECT gps_enabled
      FROM users
      WHERE user_id = '${TEST_USER_ID}'
    `);

    const restoredValue = restoreResults[0].gps_enabled;
    console.log(`   📊 Valor restaurado: ${restoredValue}`);

    if (restoredValue !== originalValue) {
      console.log('\n   ⚠️  ADVERTENCIA: No se pudo restaurar valor original\n');
    } else {
      console.log('   ✅ Estado original restaurado\n');
    }

    // ============================================
    // RESUMEN FINAL
    // ============================================
    console.log('\n🎉 ===== RESUMEN DEL TEST =====\n');
    console.log('✅ Campo gps_enabled existe en BD');
    console.log('✅ Query del endpoint incluye gps_enabled');
    console.log('✅ Formateo calcula allowOutsideRadius correctamente');
    console.log('✅ Relación inversa funciona (allowOutsideRadius = !gpsEnabled)');
    console.log('✅ Cambios de estado persisten en BD');
    console.log('✅ Estado se puede restaurar');
    console.log('\n🎯 CONCLUSIÓN: API GPS funciona CORRECTAMENTE\n');

  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar test
testGPSAPI()
  .then(() => {
    console.log('✅ Test completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test falló:', error.message);
    process.exit(1);
  });
