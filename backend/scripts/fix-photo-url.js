// Use the update_biometric_photo function directly
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302',
  port: 5432
});

async function fix() {
  const client = await pool.connect();
  try {
    // Use the SQL function that's designed for this (with explicit type casts)
    const result = await client.query(
      `SELECT * FROM update_biometric_photo($1::uuid, $2::text, NOW()::timestamp)`,
      ['766de495-e4f3-4e91-a509-1a495c52e15c', '/uploads/biometric-photos/11_EMP-ISI-001_1764549655638.jpg']
    );
    console.log('✅ Resultado:', result.rows[0]);

    // Verify
    const check = await client.query('SELECT biometric_photo_url, biometric_photo_date FROM users WHERE user_id = $1', ['766de495-e4f3-4e91-a509-1a495c52e15c']);
    console.log('Photo URL ahora:', check.rows[0]?.biometric_photo_url);
    console.log('Fecha:', check.rows[0]?.biometric_photo_date);
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(console.error);
