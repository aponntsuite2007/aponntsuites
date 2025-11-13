require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/biometric_system'
});

async function testDirectUpdate() {
  try {
    const userId = '766de495-e4f3-4e91-a509-1a495c52e15c';

    console.log('\n🧪 TEST DIRECTO SQL - TAB 1 FIELDS\n');

    // 1. Ver valores INICIALES
    console.log('1️⃣ VALORES INICIALES:');
    let result = await pool.query(`
      SELECT role, is_active, "isActive", gps_enabled
      FROM users
      WHERE user_id = $1
    `, [userId]);
    console.log('   BD:', result.rows[0]);
    console.log('');

    // 2. UPDATE con SQL directo - cambiar role
    console.log('2️⃣ UPDATE DIRECTO SQL - cambiar role a supervisor:');
    await pool.query(`
      UPDATE users
      SET role = 'supervisor'
      WHERE user_id = $1
    `, [userId]);
    console.log('   ✅ UPDATE ejecutado');
    console.log('');

    // 3. Verificar si cambió
    console.log('3️⃣ VERIFICAR si role cambió:');
    result = await pool.query(`
      SELECT role, is_active, "isActive", gps_enabled
      FROM users
      WHERE user_id = $1
    `, [userId]);
    console.log('   BD:', result.rows[0]);
    console.log(`   ${result.rows[0].role === 'supervisor' ? '✅ SÍ CAMBIÓ' : '❌ NO CAMBIÓ'}`);
    console.log('');

    // 4. UPDATE con SQL directo - cambiar is_active
    console.log('4️⃣ UPDATE DIRECTO SQL - cambiar is_active a false:');
    await pool.query(`
      UPDATE users
      SET is_active = false
      WHERE user_id = $1
    `, [userId]);
    console.log('   ✅ UPDATE ejecutado');
    console.log('');

    // 5. Verificar si cambió
    console.log('5️⃣ VERIFICAR si is_active cambió:');
    result = await pool.query(`
      SELECT role, is_active, "isActive", gps_enabled
      FROM users
      WHERE user_id = $1
    `, [userId]);
    console.log('   BD:', result.rows[0]);
    console.log(`   ${result.rows[0].is_active === false ? '✅ SÍ CAMBIÓ' : '❌ NO CAMBIÓ'}`);
    console.log('');

    // 6. Restaurar valores
    console.log('6️⃣ RESTAURAR valores originales:');
    await pool.query(`
      UPDATE users
      SET role = 'admin', is_active = true
      WHERE user_id = $1
    `, [userId]);
    console.log('   ✅ Restaurado');
    console.log('');

    await pool.end();
    console.log('🎉 TEST COMPLETADO\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
    await pool.end();
  }
}

testDirectUpdate();
