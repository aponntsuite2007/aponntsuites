const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function checkSchema() {
  try {
    // Verificar columnas id, UserId, user_id
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendances'
      AND column_name IN ('id', 'UserId', 'user_id')
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estructura de attendances (id, UserId, user_id):');
    console.table(columns.rows);

    // Verificar secuencia de id
    const sequence = await pool.query(`
      SELECT pg_get_serial_sequence('attendances', 'id') as sequence_name
    `);

    console.log('\n🔢 Secuencia de auto-increment:');
    console.table(sequence.rows);

    // Probar INSERT sin id
    console.log('\n🧪 Probando INSERT sin especificar id...');
    const testDate = new Date().toISOString().split('T')[0];

    const insert = await pool.query(`
      INSERT INTO attendances (
        "UserId", company_id, date, "checkInTime", "checkOutTime",
        status, origin_type, "createdAt", "updatedAt"
      )
      VALUES (
        (SELECT user_id FROM users WHERE company_id = 1 AND is_active = true LIMIT 1),
        1, $1, $2::timestamp, $3::timestamp, 'present', 'kiosk', NOW(), NOW()
      )
      RETURNING id, "UserId"
    `, [testDate, `${testDate} 08:00:00`, `${testDate} 17:00:00`]);

    console.log('✅ INSERT exitoso:', insert.rows[0]);

    // Limpiar el registro de prueba
    await pool.query('DELETE FROM attendances WHERE id = $1', [insert.rows[0].id]);
    console.log('🧹 Registro de prueba eliminado');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkSchema();
