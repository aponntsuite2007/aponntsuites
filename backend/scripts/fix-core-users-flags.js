/**
 * Script para corregir flags de usuarios core existentes
 * y actualizar password a admin123
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

async function fixCoreUsersFlags() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    const hashedPassword = await bcrypt.hash('admin123', 12);
    console.log('🔐 Password hasheado');

    // 1. Actualizar ADM_1 como usuario core visible (sin tocar is_core_user por trigger)
    const [adminResult] = await sequelize.query(`
      UPDATE users SET
        is_system_user = false,
        is_visible = true,
        force_password_change = true,
        password = $1,
        "updatedAt" = NOW()
      WHERE company_id = 1 AND "employeeId" = 'ADM_1'
      RETURNING "employeeId", email
    `, { bind: [hashedPassword] });

    if (adminResult.length > 0) {
      console.log('✅ ADM_1 actualizado: password=admin123, is_visible=true');
    } else {
      console.log('⚠️ ADM_1 no encontrado');
    }

    // 2. Actualizar SOPORTE_1 como usuario de sistema invisible
    const [soporteResult] = await sequelize.query(`
      UPDATE users SET
        is_system_user = true,
        is_visible = false,
        force_password_change = false,
        password = $1,
        "updatedAt" = NOW()
      WHERE company_id = 1 AND "employeeId" = 'SOPORTE_1'
      RETURNING "employeeId", email
    `, { bind: [hashedPassword] });

    if (soporteResult.length > 0) {
      console.log('✅ SOPORTE_1 actualizado: is_system_user=true, is_visible=false, password=admin123');
    } else {
      console.log('⚠️ SOPORTE_1 no encontrado');
    }

    // 3. Verificar resultado
    const [finalUsers] = await sequelize.query(`
      SELECT "employeeId", email, role, is_core_user, is_system_user, is_visible
      FROM users
      WHERE company_id = 1 AND "employeeId" IN ('ADM_1', 'SOPORTE_1')
    `);

    console.log('\n📊 USUARIOS CORE CONFIGURADOS:');
    console.log('═'.repeat(80));
    finalUsers.forEach(u => {
      const visibility = u.is_visible ? '👁️ Visible (aparece en listados)' : '🔒 Invisible (oculto de listados)';
      const type = u.is_system_user ? '🤖 Sistema (para tests automáticos)' : '👤 Normal (para uso humano)';
      console.log(`  ${u.employeeId.padEnd(12)} | ${u.email.padEnd(35)} | ${visibility}`);
      console.log(`               | ${type}`);
    });
    console.log('═'.repeat(80));

    console.log('\n🎉 Configuración completada');
    console.log('\n📝 CREDENCIALES DE ACCESO:');
    console.log('   EMPRESA: aponnt-empresa-demo');
    console.log('   USUARIO: ADM_1');
    console.log('   PASSWORD: admin123');
    console.log('\n   (Usuario SOPORTE_1 es invisible para la empresa,');
    console.log('   solo se usa para tests automáticos del sistema)');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixCoreUsersFlags();
