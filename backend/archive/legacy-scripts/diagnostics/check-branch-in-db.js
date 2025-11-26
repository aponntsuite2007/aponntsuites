const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
  });

  const result = await pool.query(`
    SELECT default_branch_id
    FROM users
    WHERE user_id = $1
  `, ['0393c9cd-5ae4-410d-a9d9-9446b7f15bd2']);

  console.log('\n📋 default_branch_id en BD:', result.rows[0].default_branch_id);
  console.log('   Tipo:', typeof result.rows[0].default_branch_id);

  if (result.rows[0].default_branch_id) {
    console.log('   ✅ Usuario TIENE sucursal asignada en BD');
  } else {
    console.log('   ❌ Usuario NO tiene sucursal asignada en BD');
  }

  await pool.end();
})();
