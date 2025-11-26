const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
  });

  const userId = '0393c9cd-5ae4-410d-a9d9-9446b7f15bd2';

  // 1. Ver qué hay en la BD
  const result = await pool.query(`
    SELECT
      user_id,
      "firstName",
      "lastName",
      department_id,
      default_branch_id
    FROM users
    WHERE user_id = $1
  `, [userId]);

  console.log('\n📋 USUARIO EN BASE DE DATOS:');
  console.log(JSON.stringify(result.rows[0], null, 2));

  // 2. Ver qué departamento es ese ID
  if (result.rows[0].department_id) {
    const deptResult = await pool.query(`
      SELECT id, name FROM departments WHERE id = $1
    `, [result.rows[0].department_id]);

    console.log('\n🏢 DEPARTAMENTO:');
    console.log(deptResult.rows[0]);
  }

  // 3. Ver los turnos
  const shiftsResult = await pool.query(`
    SELECT
      us.shift_id,
      s.name as shift_name
    FROM user_shifts us
    LEFT JOIN shifts s ON us.shift_id = s.id
    WHERE us.user_id = $1
  `, [userId]);

  console.log('\n📋 TURNOS ASIGNADOS:');
  console.log('   Cantidad:', shiftsResult.rows.length);
  if (shiftsResult.rows.length > 0) {
    shiftsResult.rows.forEach(row => {
      console.log(`   - ${row.shift_name} (ID: ${row.shift_id})`);
    });
  }

  await pool.end();
})();
