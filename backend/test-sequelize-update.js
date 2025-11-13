/**
 * Test directo de Sequelize UPDATE para entender por qué no actualiza
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function testSequelizeUpdate() {
  try {
    console.log('🔍 TEST SEQUELIZE UPDATE\n');

    const testUserId = '7aaf3e72-512c-44a8-9385-b6d1da946fde';

    // 1. Ver estado actual
    console.log('📊 PASO 1: Estado actual del usuario');
    const [userBefore] = await sequelize.query(
      `SELECT user_id, "firstName", "lastName", role, is_active, allow_outside_radius
       FROM users WHERE user_id = :userId`,
      { replacements: { userId: testUserId }, type: QueryTypes.SELECT }
    );
    console.log('ANTES:', JSON.stringify(userBefore, null, 2));

    // 2. Intentar UPDATE con SQL raw
    console.log('\n📝 PASO 2: UPDATE con SQL RAW');
    const [updateResult] = await sequelize.query(
      `UPDATE users
       SET is_active = false,
           allow_outside_radius = true,
           updated_at = NOW()
       WHERE user_id = :userId
       RETURNING user_id, is_active, allow_outside_radius`,
      { replacements: { userId: testUserId }, type: QueryTypes.UPDATE }
    );
    console.log('RESULTADO UPDATE:', JSON.stringify(updateResult, null, 2));

    // 3. Ver estado después
    console.log('\n📊 PASO 3: Estado después del UPDATE');
    const [userAfter] = await sequelize.query(
      `SELECT user_id, "firstName", "lastName", role, is_active, allow_outside_radius
       FROM users WHERE user_id = :userId`,
      { replacements: { userId: testUserId }, type: QueryTypes.SELECT }
    );
    console.log('DESPUÉS:', JSON.stringify(userAfter, null, 2));

    // 4. Comparar
    console.log('\n✅ COMPARACIÓN:');
    console.log(`   is_active:            ${userBefore.is_active} → ${userAfter.is_active} ${userBefore.is_active !== userAfter.is_active ? '✅ CAMBIÓ' : '❌ NO CAMBIÓ'}`);
    console.log(`   allow_outside_radius: ${userBefore.allow_outside_radius} → ${userAfter.allow_outside_radius} ${userBefore.allow_outside_radius !== userAfter.allow_outside_radius ? '✅ CAMBIÓ' : '❌ NO CAMBIÓ'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSequelizeUpdate();
