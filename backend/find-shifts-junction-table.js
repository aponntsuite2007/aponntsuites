const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function findJunctionTable() {
  try {
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE '%shift%'
      ORDER BY table_name
    `);

    console.log('📋 Tablas relacionadas con shifts:');
    tables.rows.forEach(row => console.log('  -', row.table_name));

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

findJunctionTable();
