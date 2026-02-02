/**
 * Script para crear usuarios core (administrador + soporte) para empresa demo
 * Ejecutar: node scripts/create-core-users.js
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function createCoreUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    // 1. Buscar empresa demo
    const [companies] = await sequelize.query(`
      SELECT company_id as id, name, slug, is_active
      FROM companies
      WHERE slug = 'aponnt-empresa-demo' OR name ILIKE '%demo%'
      LIMIT 1
    `);

    if (companies.length === 0) {
      console.log('❌ No se encontró empresa demo');
      process.exit(1);
    }

    const company = companies[0];
    console.log(`📌 Empresa encontrada: ${company.name} (ID: ${company.id})`);

    // 2. Hashear password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    console.log('🔐 Password hasheado');

    // 3. Verificar si existen los usuarios
    const [existingUsers] = await sequelize.query(`
      SELECT user_id, "employeeId", email, role, is_system_user, is_visible
      FROM users
      WHERE company_id = ${company.id}
      AND ("employeeId" IN ('administrador', 'soporte') OR email LIKE '%soporte%')
    `);

    console.log(`📋 Usuarios existentes: ${existingUsers.length}`);

    // 4. Crear usuario ADMINISTRADOR si no existe
    const adminExists = existingUsers.find(u => u.employeeId === 'administrador');
    if (!adminExists) {
      await sequelize.query(`
        INSERT INTO users (
          user_id, "employeeId", email, password, role, company_id,
          "firstName", "lastName", dni,
          is_core_user, is_active,
          force_password_change, is_system_user, is_visible,
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          'administrador',
          'admin@${company.slug}.com',
          '${hashedPassword}',
          'admin',
          ${company.id},
          'Administrador',
          'Principal',
          'ADMIN-${company.id}',
          true,
          true,
          true,
          false,
          true,
          NOW(),
          NOW()
        )
      `);
      console.log('✅ Usuario ADMINISTRADOR creado');
    } else {
      console.log('⚠️ Usuario administrador ya existe');
    }

    // 5. Crear usuario SOPORTE (invisible) si no existe
    const soporteExists = existingUsers.find(u => u.employeeId === 'soporte' || (u.email && u.email.includes('soporte')));
    if (!soporteExists) {
      await sequelize.query(`
        INSERT INTO users (
          user_id, "employeeId", email, password, role, company_id,
          "firstName", "lastName", dni,
          is_core_user, is_active,
          force_password_change, is_system_user, is_visible,
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          'soporte',
          'soporte+${company.slug}@aponnt.com',
          '${hashedPassword}',
          'admin',
          ${company.id},
          'Soporte',
          'Sistema',
          'SOPORTE-${company.id}',
          true,
          true,
          false,
          true,
          false,
          NOW(),
          NOW()
        )
      `);
      console.log('✅ Usuario SOPORTE (invisible) creado');
    } else {
      console.log('⚠️ Usuario soporte ya existe');
    }

    // 6. Verificar creación
    const [finalUsers] = await sequelize.query(`
      SELECT "employeeId", email, role, is_system_user, is_visible
      FROM users
      WHERE company_id = ${company.id}
      AND "employeeId" IN ('administrador', 'soporte')
    `);

    console.log('\n📊 USUARIOS CORE CREADOS:');
    console.log('═'.repeat(60));
    finalUsers.forEach(u => {
      const visibility = u.is_visible ? '👁️ Visible' : '🔒 Invisible';
      const type = u.is_system_user ? '🤖 Sistema' : '👤 Normal';
      console.log(`  ${u.employeeId}: ${u.email} | ${u.role} | ${visibility} | ${type}`);
    });
    console.log('═'.repeat(60));

    console.log('\n🎉 Proceso completado exitosamente');
    console.log('\n📝 CREDENCIALES DE ACCESO:');
    console.log('   EMPRESA: ' + company.slug);
    console.log('   USUARIO: administrador');
    console.log('   PASSWORD: admin123');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.parent) {
      console.error('   Detalle:', error.parent.message);
    }
    process.exit(1);
  }
}

createCoreUsers();
