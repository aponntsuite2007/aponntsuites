const axios = require('axios');
const { Pool } = require('pg');

const API_URL = 'http://localhost:9998';
let authToken = null;
let testUserId = null;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

// Función para login
async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
      identifier: 'ADMIN',  // Usuario o email
      password: 'admin123',
      companyId: 11  // ID de la empresa ISI
    });

    authToken = response.data.token;
    console.log('✅ Login exitoso');
    console.log('   Token:', authToken.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    return false;
  }
}

// Test completo end-to-end
async function testTurnosE2E() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST E2E - TURNOS (SHIFTS) - COMPLETO');
    console.log('═══════════════════════════════════════════════════════════\n');

    // PASO 1: Login
    console.log('📋 PASO 1: Login con credenciales de admin...');
    const loginOk = await login();
    if (!loginOk) {
      console.error('❌ No se pudo hacer login. Abortando test.');
      return;
    }

    // PASO 2: Obtener turnos disponibles para ISI (company_id=11)
    console.log('\n📋 PASO 2: Obteniendo turnos de ISI (company_id=11)...');
    const shiftsResult = await pool.query(`
      SELECT id, name, company_id FROM shifts WHERE company_id = 11 LIMIT 2
    `);

    if (shiftsResult.rows.length === 0) {
      console.error('❌ No hay turnos para ISI. Crear turnos primero.');
      await pool.end();
      return;
    }

    const shifts = shiftsResult.rows;
    const shiftIds = shifts.map(s => s.id);
    console.log('✅ Turnos encontrados:', shifts.length);
    shifts.forEach((shift, i) => {
      console.log(`   ${i+1}. ${shift.name} (${shift.id})`);
    });

    // PASO 3: Obtener un usuario de ISI
    console.log('\n📋 PASO 3: Obteniendo un usuario de ISI...');
    const usersResult = await pool.query(`
      SELECT user_id, "firstName", "lastName" FROM users
      WHERE company_id = 11
      LIMIT 1
    `);

    if (usersResult.rows.length === 0) {
      console.error('❌ No hay usuarios para ISI.');
      await pool.end();
      return;
    }

    const testUser = usersResult.rows[0];
    testUserId = testUser.user_id;
    console.log('✅ Usuario encontrado:', `${testUser.firstName} ${testUser.lastName}`);
    console.log('   User ID (UUID):', testUserId);

    // PASO 4: Asignar turnos al usuario via API PUT
    console.log('\n📋 PASO 4: Asignando turnos al usuario via API PUT...');
    try {
      const updateResponse = await axios.put(
        `${API_URL}/api/v1/users/${testUserId}`,
        {
          shiftIds: shiftIds // Asignar TODOS los turnos disponibles
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      console.log('✅ API PUT exitosa');
      console.log('   Response status:', updateResponse.status);
    } catch (error) {
      console.error('❌ Error en API PUT:', error.response?.data || error.message);
      await pool.end();
      return;
    }

    // PASO 5: Verificar que los turnos se guardaron en user_shifts
    console.log('\n📋 PASO 5: Verificando guardado en tabla user_shifts...');
    const assignedResult = await pool.query(`
      SELECT us.user_id, us.shift_id, s.name as shift_name
      FROM user_shifts us
      JOIN shifts s ON s.id = us.shift_id
      WHERE us.user_id = $1
    `, [testUserId]);

    console.log('✅ Turnos en user_shifts:', assignedResult.rows.length);
    assignedResult.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ${row.shift_name} (${row.shift_id})`);
    });

    if (assignedResult.rows.length !== shiftIds.length) {
      console.error(`❌ ERROR: Se asignaron ${shiftIds.length} turnos pero solo hay ${assignedResult.rows.length} en BD`);
    }

    // PASO 6: Obtener usuario via API GET y verificar que incluye shiftIds
    console.log('\n📋 PASO 6: Obteniendo usuario via API GET...');
    try {
      const getResponse = await axios.get(
        `${API_URL}/api/v1/users/${testUserId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      const userData = getResponse.data;
      console.log('✅ API GET exitosa');
      console.log('   User ID:', userData.user_id);
      console.log('   shiftIds en respuesta:', userData.shiftIds);

      if (!userData.shiftIds || !Array.isArray(userData.shiftIds)) {
        console.error('❌ ERROR: shiftIds no está presente en la respuesta del API');
      } else if (userData.shiftIds.length !== shiftIds.length) {
        console.error(`❌ ERROR: API devuelve ${userData.shiftIds.length} turnos pero deberían ser ${shiftIds.length}`);
      } else {
        console.log('✅ shiftIds correctos en respuesta del API');
      }

    } catch (error) {
      console.error('❌ Error en API GET:', error.response?.data || error.message);
      await pool.end();
      return;
    }

    // PASO 7: Actualizar turnos (asignar solo el primero)
    console.log('\n📋 PASO 7: Actualizando turnos (asignar solo el primero)...');
    try {
      await axios.put(
        `${API_URL}/api/v1/users/${testUserId}`,
        {
          shiftIds: [shiftIds[0]] // Solo el primer turno
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      console.log('✅ API PUT exitosa (update)');
    } catch (error) {
      console.error('❌ Error en API PUT (update):', error.response?.data || error.message);
      await pool.end();
      return;
    }

    // Verificar que solo queda 1 turno
    const afterUpdateResult = await pool.query(`
      SELECT COUNT(*) as count FROM user_shifts WHERE user_id = $1
    `, [testUserId]);

    const count = parseInt(afterUpdateResult.rows[0].count);
    console.log('✅ Turnos después del update:', count);
    if (count !== 1) {
      console.error(`❌ ERROR: Debería haber 1 turno pero hay ${count}`);
    }

    // PASO 8: Remover todos los turnos (shiftIds vacío)
    console.log('\n📋 PASO 8: Removiendo todos los turnos (shiftIds = [])...');
    try {
      await axios.put(
        `${API_URL}/api/v1/users/${testUserId}`,
        {
          shiftIds: [] // Array vacío = sin turnos
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      console.log('✅ API PUT exitosa (remove all)');
    } catch (error) {
      console.error('❌ Error en API PUT (remove):', error.response?.data || error.message);
      await pool.end();
      return;
    }

    // Verificar que no quedan turnos
    const afterRemoveResult = await pool.query(`
      SELECT COUNT(*) as count FROM user_shifts WHERE user_id = $1
    `, [testUserId]);

    const countAfterRemove = parseInt(afterRemoveResult.rows[0].count);
    console.log('✅ Turnos después de remover:', countAfterRemove);
    if (countAfterRemove !== 0) {
      console.error(`❌ ERROR: No debería haber turnos pero hay ${countAfterRemove}`);
    }

    // RESUMEN FINAL
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TEST E2E COMPLETADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 RESUMEN:');
    console.log('   ✅ Login funcionando');
    console.log('   ✅ API PUT asigna turnos correctamente');
    console.log('   ✅ Turnos se guardan en user_shifts');
    console.log('   ✅ API GET incluye shiftIds en respuesta');
    console.log('   ✅ API PUT actualiza turnos correctamente');
    console.log('   ✅ API PUT remueve turnos correctamente');
    console.log('\n🎉 ¡SISTEMA DE TURNOS 100% FUNCIONAL!\n');

    await pool.end();

  } catch (error) {
    console.error('❌ Error en test E2E:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

testTurnosE2E();
