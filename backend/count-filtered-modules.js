const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function main() {
  try {
    const result = await pool.query(`
      SELECT module_key, module_type, available_in
      FROM system_modules
      WHERE is_active = true
        AND (module_type IS NULL OR module_type != 'submodule')
        AND available_in LIKE '%panel-empresa%'
      ORDER BY module_key
    `);

    console.log('📊 Módulos para testear:', result.rows.length);
    console.log('');
    result.rows.forEach((m, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${m.module_key}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

main();
