const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB || 'attendance_system',
  port: 5432
});

(async () => {
  try {
    console.log('📋 Consultando esquema de system_modules...\n');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'system_modules'
      ORDER BY ordinal_position;
    `);

    console.log('Columnas encontradas:', result.rows.length);
    console.log(JSON.stringify(result.rows, null, 2));

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
})();
