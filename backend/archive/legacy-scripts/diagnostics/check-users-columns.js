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
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
      AND column_name IN ('departmentId', 'department_id', 'defaultBranchId', 'default_branch_id')
    ORDER BY column_name
  `);

  console.log('\n📋 COLUMNAS DE LA TABLA USERS:');
  result.rows.forEach(row => {
    console.log(`   ${row.column_name}: ${row.data_type}`);
  });

  await pool.end();
})();
