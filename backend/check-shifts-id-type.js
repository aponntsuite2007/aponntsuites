const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function checkShiftsIdType() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'shifts' AND column_name = 'id'
    `);

    console.log('shifts.id type:', result.rows[0]);

    const sampleShift = await pool.query(`SELECT id FROM shifts LIMIT 1`);
    console.log('Sample shift ID:', sampleShift.rows[0]);

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkShiftsIdType();
