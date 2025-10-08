/**
 * Script para crear usuario de prueba en producción Render
 * Ejecutar: DATABASE_URL="..." node create-test-user-render.js
 */

const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  console.log('🔧 [CREATE-USER] Conectando a Render PostgreSQL...\n');

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

    // Verificar si ya existe la empresa
    const [companies] = await sequelize.query(`
      SELECT company_id FROM companies WHERE slug = 'test-company' LIMIT 1
    `);

    let companyId;
    if (companies.length === 0) {
      console.log('📦 Creando empresa de prueba...');
      const [result] = await sequelize.query(`
        INSERT INTO companies (name, slug, email, is_active, max_employees, contracted_employees, license_type, created_at, updated_at)
        VALUES ('Test Company', 'test-company', 'test@test.com', true, 100, 10, 'premium', NOW(), NOW())
        RETURNING company_id
      `);
      companyId = result[0].company_id;
      console.log(`✅ Empresa creada con ID: ${companyId}\n`);
    } else {
      companyId = companies[0].company_id;
      console.log(`✅ Empresa existente con ID: ${companyId}\n`);
    }

    // Verificar si ya existe el usuario admin
    const [existingUsers] = await sequelize.query(`
      SELECT user_id, email FROM users WHERE email = 'admin@test.com' LIMIT 1
    `);

    if (existingUsers.length > 0) {
      console.log('⚠️  Usuario admin@test.com ya existe\n');
      console.log('Usuario:', existingUsers[0]);
      console.log('\n✅ Puedes usar estas credenciales:');
      console.log('  Email: admin@test.com');
      console.log('  Password: admin123\n');
      return;
    }

    // Crear usuario admin
    console.log('👤 Creando usuario admin...');
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
        'ADMIN001',
        'admin',
        'Admin',
        'Test',
        'admin@test.com',
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

    console.log('✅ Usuario admin creado exitosamente\n');
    console.log('═══════════════════════════════════════');
    console.log('📋 CREDENCIALES DE PRUEBA:');
    console.log('═══════════════════════════════════════');
    console.log('  Email:    admin@test.com');
    console.log('  Password: admin123');
    console.log('  Company:  Test Company (ID:', companyId, ')');
    console.log('  Role:     admin');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createTestUser().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
