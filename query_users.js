const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'attendance_system',
  password: 'Aedr15150302',
  port: 5432,
});

async function queryUsers() {
  try {
    console.log('🔍 Consultando usuarios admin en company_id 11...\n');

    const result = await pool.query(`
      SELECT id, email, "employeeId", role, company_id, "firstName", "lastName"
      FROM users
      WHERE company_id = 11
      ORDER BY role, id
      LIMIT 20
    `);

    console.log(`✅ Encontrados ${result.rows.length} usuarios:\n`);
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email || 'NULL'}`);
      console.log(`EmployeeId: ${user.employeeId || 'NULL'}`);
      console.log(`Nombre: ${user.firstName || ''} ${user.lastName || ''}`);
      console.log(`Role: ${user.role}`);
      console.log(`Company: ${user.company_id}`);
      console.log('---');
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

queryUsers();
