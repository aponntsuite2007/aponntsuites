const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function checkTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Companies Table Structure:\n');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(30)} ${row.data_type}`);
    });
    console.log('');

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkTable();
