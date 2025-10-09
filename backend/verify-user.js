/**
 * Script para verificar usuario admin en Render
 */

const { Sequelize } = require('sequelize');

async function verifyUser() {
  console.log('🔍 Verificando usuario admin en Render...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL no está definida');
    process.exit(1);
  }

  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a Render PostgreSQL\n');

    // Buscar usuario admin@test.com
    const [users] = await sequelize.query(`
      SELECT user_id, email, usuario, company_id, role, is_active,
             "firstName", "lastName", password
      FROM users
      WHERE email = 'admin@test.com'
      LIMIT 1
    `);

    if (users.length === 0) {
      console.log('❌ No se encontró usuario con email admin@test.com\n');
      return;
    }

    const user = users[0];
    console.log('✅ Usuario encontrado:');
    console.log('  Email:', user.email);
    console.log('  Usuario:', user.usuario);
    console.log('  Company ID:', user.company_id);
    console.log('  Role:', user.role);
    console.log('  Is Active:', user.is_active);
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Password hash:', user.password.substring(0, 20) + '...');
    console.log('');

    // Verificar empresa
    const [companies] = await sequelize.query(`
      SELECT company_id, name, is_active
      FROM companies
      WHERE company_id = ?
    `, {
      replacements: [user.company_id]
    });

    if (companies.length > 0) {
      console.log('✅ Empresa asociada:');
      console.log('  ID:', companies[0].company_id);
      console.log('  Name:', companies[0].name);
      console.log('  Active:', companies[0].is_active);
    } else {
      console.log('❌ Empresa no encontrada para company_id:', user.company_id);
    }

    console.log('\n📋 Para hacer login usa:');
    console.log('  identifier: admin@test.com (o "admin")');
    console.log('  password: admin123');
    console.log('  companyId:', user.company_id);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

verifyUser().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
