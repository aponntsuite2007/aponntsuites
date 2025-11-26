const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function queryUsers() {
  try {
    console.log('🔍 Consultando usuarios en company_id 11...\n');

    const [results] = await sequelize.query(`
      SELECT user_id, email, "employeeId", usuario, role, company_id, "firstName", "lastName"
      FROM users
      WHERE company_id = 11
      ORDER BY role, user_id
      LIMIT 20
    `);

    console.log(`✅ Encontrados ${results.length} usuarios:\n`);
    results.forEach(user => {
      console.log(`ID: ${user.user_id}`);
      console.log(`Usuario: ${user.usuario || 'NULL'}`);
      console.log(`Email: ${user.email || 'NULL'}`);
      console.log(`EmployeeId: ${user.employeeId || 'NULL'}`);
      console.log(`Nombre: ${user.firstName || ''} ${user.lastName || ''}`);
      console.log(`Role: ${user.role}`);
      console.log(`Company: ${user.company_id}`);
      console.log('---');
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

queryUsers();
