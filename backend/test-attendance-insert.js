const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function testInsert() {
  try {
    const companyId = 1;
    const testDate = new Date().toISOString().split('T')[0];
    const checkInTimestamp = `${testDate} 08:00:00`;
    const checkOutTimestamp = `${testDate} 17:00:00`;

    // Obtener userId
    const userResult = await pool.query(`
      SELECT user_id FROM users
      WHERE company_id = $1 AND is_active = true
      LIMIT 1
    `, [companyId]);

    if (userResult.rows.length === 0) {
      throw new Error('No hay usuarios activos');
    }

    const userId = userResult.rows[0].user_id;

    console.log('🧪 Probando INSERT con gen_random_uuid()...');

    // MEJORA #18: Generar UUID explícitamente
    const insertResult = await pool.query(`
      INSERT INTO attendances (
        id, "UserId", company_id, date, "checkInTime", "checkOutTime",
        status, origin_type, "createdAt", "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4::timestamp, $5::timestamp, $6, $7, NOW(), NOW())
      RETURNING id, "UserId"
    `, [userId, companyId, testDate, checkInTimestamp, checkOutTimestamp, 'present', 'kiosk']);

    console.log('✅ INSERT EXITOSO:');
    console.log('   - id:', insertResult.rows[0].id);
    console.log('   - UserId:', insertResult.rows[0].UserId);

    // Limpiar
    await pool.query('DELETE FROM attendances WHERE id = $1', [insertResult.rows[0].id]);
    console.log('🧹 Registro de prueba eliminado');
    console.log('\n✅ MEJORA #18 FUNCIONA CORRECTAMENTE');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testInsert();
