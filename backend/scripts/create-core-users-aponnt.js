/**
 * Script para crear usuarios core específicamente para aponnt-empresa-demo
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
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

async function createCoreUsersForAponnt() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    const companyId = 1;
    const slug = 'aponnt-empresa-demo';
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Usar employeeIds únicos ya que hay constraint global
    const adminEmployeeId = 'admin_aponnt';
    const soporteEmployeeId = 'soporte_aponnt';

    // Verificar que no existan
    const [existing] = await sequelize.query(
      `SELECT "employeeId" FROM users WHERE company_id = 1 AND "employeeId" IN ('${adminEmployeeId}', '${soporteEmployeeId}')`
    );

    if (existing.length > 0) {
      console.log('⚠️ Ya existen usuarios core:', existing.map(u => u.employeeId).join(', '));
      process.exit(0);
    }

    // Crear administrador
    await sequelize.query(`
      INSERT INTO users (
        user_id, "employeeId", email, password, role, company_id,
        "firstName", "lastName", dni,
        is_core_user, is_active,
        force_password_change, is_system_user, is_visible,
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        '${adminEmployeeId}',
        'admin@aponnt-empresa-demo.com',
        $1,
        'admin',
        1,
        'Administrador',
        'Principal',
        'ADMIN-1',
        true,
        true,
        true,
        false,
        true,
        NOW(),
        NOW()
      )
    `, { bind: [hashedPassword] });
    console.log('✅ Usuario ADMINISTRADOR creado (employeeId: ' + adminEmployeeId + ')');

    // Crear soporte
    await sequelize.query(`
      INSERT INTO users (
        user_id, "employeeId", email, password, role, company_id,
        "firstName", "lastName", dni,
        is_core_user, is_active,
        force_password_change, is_system_user, is_visible,
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        '${soporteEmployeeId}',
        'soporte+aponnt-empresa-demo@aponnt.com',
        $1,
        'admin',
        1,
        'Soporte',
        'Sistema',
        'SOPORTE-1',
        true,
        true,
        false,
        true,
        false,
        NOW(),
        NOW()
      )
    `, { bind: [hashedPassword] });
    console.log('✅ Usuario SOPORTE (invisible) creado (employeeId: ' + soporteEmployeeId + ')');

    // Verificar
    const [finalUsers] = await sequelize.query(`
      SELECT "employeeId", email, role, is_system_user, is_visible
      FROM users
      WHERE company_id = 1 AND "employeeId" IN ('${adminEmployeeId}', '${soporteEmployeeId}')
    `);

    console.log('\n📊 USUARIOS CORE CREADOS PARA aponnt-empresa-demo:');
    console.log('═'.repeat(70));
    finalUsers.forEach(u => {
      const visibility = u.is_visible ? '👁️ Visible' : '🔒 Invisible';
      const type = u.is_system_user ? '🤖 Sistema' : '👤 Normal';
      console.log(`  ${u.employeeId.padEnd(15)} | ${u.email.padEnd(40)} | ${visibility} | ${type}`);
    });
    console.log('═'.repeat(70));

    console.log('\n🎉 Proceso completado');
    console.log('\n📝 CREDENCIALES DE ACCESO:');
    console.log('   EMPRESA: aponnt-empresa-demo');
    console.log('   USUARIO: administrador');
    console.log('   PASSWORD: admin123');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createCoreUsersForAponnt();
