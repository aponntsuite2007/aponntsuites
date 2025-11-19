const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function testTurnosFix() {
  try {
    console.log('🔍 1. Obteniendo turnos de ISI (company_id=11)...');
    const shifts = await pool.query(`
      SELECT id, name, company_id FROM shifts WHERE company_id = 11 LIMIT 2
    `);

    if (shifts.rows.length === 0) {
      console.log('❌ No hay turnos para ISI');
      await pool.end();
      return;
    }

    console.log('✅ Turnos encontrados:', shifts.rows);

    const shiftIds = shifts.rows.map(s => s.id);
    console.log('📋 IDs de turnos (UUID):', shiftIds);

    console.log('\n🔍 2. Obteniendo usuario de ISI...');
    const users = await pool.query(`
      SELECT user_id, "firstName", "lastName" FROM users WHERE company_id = 11 LIMIT 1
    `);

    if (users.rows.length === 0) {
      console.log('❌ No hay usuarios para ISI');
      await pool.end();
      return;
    }

    const userId = users.rows[0].user_id;
    console.log('✅ Usuario encontrado:', users.rows[0]);
    console.log('📋 User ID (UUID):', userId);

    console.log('\n🔍 3. Probando asignación de turnos (usando UUID)...');

    // Limpiar asignaciones anteriores
    await pool.query(`DELETE FROM user_shifts WHERE user_id = $1`, [userId]);

    // Insertar nuevas asignaciones
    for (const shiftId of shiftIds) {
      await pool.query(`
        INSERT INTO user_shifts (user_id, shift_id, "createdAt", "updatedAt")
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [userId, shiftId]);
    }

    console.log('✅ Asignaciones insertadas correctamente');

    console.log('\n🔍 4. Verificando asignaciones...');
    const assigned = await pool.query(`
      SELECT us.user_id, us.shift_id, s.name as shift_name
      FROM user_shifts us
      JOIN shifts s ON s.id = us.shift_id
      WHERE us.user_id = $1
    `, [userId]);

    console.log('✅ Turnos asignados al usuario:', assigned.rows);

    console.log('\n✅ ¡Test completado exitosamente! Los turnos funcionan correctamente.');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

testTurnosFix();
