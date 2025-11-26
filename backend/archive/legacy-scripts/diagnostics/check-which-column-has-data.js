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
      "departmentId" as dept_camel,
      department_id as dept_snake,
      "defaultBranchId" as branch_camel,
      default_branch_id as branch_snake
    FROM users
    WHERE user_id = $1
  `, [userId]);

  console.log('\n📋 VALORES EN AMBAS COLUMNAS:');
  console.log(result.rows[0]);
  console.log('\n📊 RESUMEN:');
  const row = result.rows[0];
  console.log(`   departmentId (VARCHAR): ${row.dept_camel}`);
  console.log(`   department_id (BIGINT): ${row.dept_snake}`);
  console.log(`   defaultBranchId (UUID): ${row.branch_camel}`);
  console.log(`   default_branch_id (UUID): ${row.branch_snake}`);

  await pool.end();
})();
