/**
 * Script para resetear contraseña de un usuario en Render
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
      console.error('❌ DATABASE_URL no configurado');
      console.log('Uso: DATABASE_URL="postgresql://..." node reset-admin-password.js');
      process.exit(1);
    }

    console.log('🔄 Conectando a Render PostgreSQL...');

    const sequelize = new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Conectado');

    // Buscar usuario admin de empresa ISI (company_id = 11)
    const [users] = await sequelize.query(`
      SELECT user_id, usuario, email, "firstName", "lastName", company_id
      FROM users
      WHERE company_id = 11 AND usuario = 'admin'
    `);

    if (users.length === 0) {
      console.log('❌ No se encontró usuario admin en empresa ID 11');
      console.log('');
      console.log('Usuarios encontrados en empresa 11:');
      const [allUsers] = await sequelize.query(`
        SELECT usuario, email, "firstName", "lastName"
        FROM users
        WHERE company_id = 11
        ORDER BY usuario
      `);
      console.table(allUsers);
      process.exit(1);
    }

    const user = users[0];
    console.log('');
    console.log('👤 Usuario encontrado:');
    console.log(`   ID: ${user.user_id}`);
    console.log(`   Usuario: ${user.usuario}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
    console.log('');

    // Nueva contraseña: admin123
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log('🔐 Reseteando contraseña a: admin123');

    await sequelize.query(`
      UPDATE users
      SET password = ?
      WHERE user_id = ?
    `, {
      replacements: [hashedPassword, user.user_id]
    });

    console.log('✅ Contraseña actualizada exitosamente');
    console.log('');
    console.log('📋 Credenciales de login:');
    console.log(`   Empresa: ISI (ID: 11)`);
    console.log(`   Usuario: ${user.usuario}`);
    console.log(`   Contraseña: admin123`);
    console.log('');
    console.log('🌐 Prueba en: https://aponntsuites.onrender.com/panel-administrativo.html');
    console.log('');

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();
