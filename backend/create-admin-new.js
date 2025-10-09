/**
 * Script para crear usuario admin con email único
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  console.log('🔧 Creando usuario admin con email único...\n');

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

    // Verificar usuario existente con usuario='admin'
    const [existingByUsername] = await sequelize.query(`
      SELECT user_id, email, usuario, company_id FROM users WHERE usuario = 'admin' LIMIT 1
    `);

    if (existingByUsername.length > 0) {
      console.log('⚠️ Ya existe usuario con usuario="admin":');
      console.log('  Email:', existingByUsername[0].email);
      console.log('  Company ID:', existingByUsername[0].company_id);
      console.log('\n💡 Usa ese usuario para login\n');

      // Verificar si la contraseña es admin123
      const user = existingByUsername[0];
      const [userWithPassword] = await sequelize.query(`
        SELECT password FROM users WHERE user_id = ?
      `, {
        replacements: [user.user_id]
      });

      const isAdmin123 = await bcrypt.compare('admin123', userWithPassword[0].password);

      console.log('📋 Credenciales para login:');
      console.log('  identifier:', user.email, '(o "admin")');
      console.log('  password: admin123 -', isAdmin123 ? '✅ FUNCIONA' : '❌ NO ES ESTA');
      console.log('  companyId:', user.company_id);

      return;
    }

    // Si no existe, crear nuevo usuario admin
    const [companies] = await sequelize.query(`
      SELECT company_id FROM companies WHERE slug = 'test-company' LIMIT 1
    `);

    let companyId;
    if (companies.length === 0) {
      console.log('❌ No se encontró empresa test-company');
      return;
    } else {
      companyId = companies[0].company_id;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    await sequelize.query(`
      INSERT INTO users (
        "employeeId",
        usuario,
        "firstName",
        "lastName",
        email,
        password,
        role,
        company_id,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        'ADMIN002',
        'admintest',
        'Admin',
        'Testing',
        'admintest@test.com',
        :password,
        'admin',
        :companyId,
        true,
        NOW(),
        NOW()
      )
    `, {
      replacements: {
        password: hashedPassword,
        companyId: companyId
      }
    });

    console.log('✅ Usuario creado exitosamente\n');
    console.log('📋 Credenciales:');
    console.log('  identifier: admintest@test.com (o "admintest")');
    console.log('  password: admin123');
    console.log('  companyId:', companyId);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

createAdmin().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
