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

  const result = await pool.query(`
    SELECT 
      user_id,
      "firstName",
      "lastName",
      "departmentId" as department_id,
      default_branch_id
    FROM users
    WHERE user_id = $1
  `, [userId]);

  console.log('\n📋 USUARIO EN BASE DE DATOS:');
  console.log(JSON.stringify(result.rows[0], null, 2));

  // Ver los turnos
  const shiftsResult = await pool.query(`
    SELECT shift_id FROM user_shifts WHERE user_id = $1
  `, [userId]);

  console.log('\n📋 TURNOS ASIGNADOS:');
  console.log('   Cantidad:', shiftsResult.rows.length);
  console.log('   IDs:', shiftsResult.rows.map(r => r.shift_id));

  await pool.end();
})();
