/**
 * Verificar company_id de los usuarios
 */

const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function checkUsers() {
  console.log('🔧 Conectando a PostgreSQL...\n');

  try {
    await sequelize.authenticate();

    const [users] = await sequelize.query(`
      SELECT user_id, "firstName", "lastName", email, company_id, is_active
      FROM users
      WHERE is_active = true
      ORDER BY company_id, user_id
      LIMIT 20
    `);

    console.log('📋 Usuarios activos:\n');
    users.forEach(u => {
      console.log(`  • ${u.firstName} ${u.lastName} (${u.email})`);
      console.log(`    user_id: ${u.user_id}`);
      console.log(`    company_id: ${u.company_id}\n`);
    });

    const [companies] = await sequelize.query(`
      SELECT id, name FROM companies WHERE is_active = true ORDER BY id
    `);

    console.log('\n📋 Empresas activas:\n');
    companies.forEach(c => {
      console.log(`  • ID: ${c.id} - ${c.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkUsers();
