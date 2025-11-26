const { sequelize } = require('./src/config/database');

async function checkUsersAndCompanies() {
  try {
    console.log('👥 USUARIOS EN EL SISTEMA:');
    console.log('=' .repeat(80));

    const [users] = await sequelize.query(`
      SELECT u.id, u.username, u.company_id, c.name as company_name, u.role, u.is_active
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      ORDER BY u.company_id, u.username
    `);

    users.forEach(u => {
      console.log(`ID: ${u.id} | User: ${u.username} | Company: ${u.company_id} (${u.company_name || 'N/A'}) | Role: ${u.role} | Active: ${u.is_active}`);
    });

    console.log('\n🏢 EMPRESAS EN EL SISTEMA:');
    console.log('=' .repeat(80));

    const [companies] = await sequelize.query(`
      SELECT id, name, is_active
      FROM companies
      ORDER BY id
    `);

    companies.forEach(c => {
      console.log(`ID: ${c.id} | Name: ${c.name} | Active: ${c.is_active}`);
    });

    console.log('\n🔍 VERIFICACIÓN ESPECÍFICA ISI:');
    console.log('=' .repeat(80));

    const isiUsers = users.filter(u => u.company_id === 11);
    console.log(`ISI (company_id = 11) tiene ${isiUsers.length} usuarios:`);
    isiUsers.forEach(u => {
      console.log(`  → ${u.username} (${u.role}) - Activo: ${u.is_active}`);
    });

    const admin1 = users.find(u => u.username === 'admin1');
    if (admin1) {
      console.log(`\n👤 ADMIN1: Company ${admin1.company_id} (${admin1.company_name}) - Role: ${admin1.role}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsersAndCompanies();