/**
 * Script para verificar usuario y probar login
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

async function verifyUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL\n');

    const [users] = await sequelize.query(`
      SELECT "employeeId", email, password, email_verified, account_status, is_active
      FROM users
      WHERE "employeeId" = 'ADM_1' AND company_id = 1
    `);

    if (users.length === 0) {
      console.log('❌ Usuario ADM_1 no encontrado');
      process.exit(1);
    }

    const u = users[0];
    console.log('📋 DATOS DEL USUARIO ADM_1:');
    console.log('  employeeId:', u.employeeId);
    console.log('  email:', u.email);
    console.log('  email_verified:', u.email_verified);
    console.log('  account_status:', u.account_status);
    console.log('  is_active:', u.is_active);
    console.log('  password hash (primeros 20 chars):', u.password ? u.password.substring(0, 20) + '...' : 'NULL');

    // Test password
    if (u.password) {
      const isMatch = await bcrypt.compare('admin123', u.password);
      console.log('\n🔐 Password "admin123" match:', isMatch ? '✅ CORRECTO' : '❌ INCORRECTO');
    }

    // Si email_verified es false o account_status no es valid, corregir
    if (!u.email_verified || u.account_status !== 'active') {
      console.log('\n⚠️ Corrigiendo email_verified y account_status...');
      await sequelize.query(`
        UPDATE users SET
          email_verified = true,
          account_status = 'active',
          "updatedAt" = NOW()
        WHERE "employeeId" = 'ADM_1' AND company_id = 1
      `);
      console.log('✅ Usuario actualizado: email_verified=true, account_status=active');
    } else {
      console.log('\n✅ Usuario listo para login');
    }

    console.log('\n📝 CREDENCIALES:');
    console.log('   EMPRESA: aponnt-empresa-demo');
    console.log('   USUARIO: ADM_1');
    console.log('   PASSWORD: admin123');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyUser();
