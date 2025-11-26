require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function verificarPassword() {
  try {
    const [user] = await sequelize.query(
      `SELECT usuario, password, role, "isActive", company_id
       FROM users
       WHERE usuario = 'admin' AND company_id = 11`,
      { type: QueryTypes.SELECT }
    );

    if (!user) {
      console.log('❌ Usuario "admin" NO existe para empresa ISI');
      process.exit(1);
    }

    console.log('✅ Usuario encontrado:', user.usuario);
    console.log('🔐 Hash de password:', user.password.substring(0, 30) + '...');

    // Probar contraseñas comunes
    const passwords = ['admin123', 'Admin123', 'admin', 'Admin', '123456', 'password'];

    console.log('\n🔍 Probando contraseñas...\n');

    for (const pwd of passwords) {
      const match = await bcrypt.compare(pwd, user.password);
      if (match) {
        console.log(`✅ ¡CONTRASEÑA CORRECTA! → "${pwd}"`);
        process.exit(0);
      } else {
        console.log(`❌ "${pwd}" - incorrecta`);
      }
    }

    console.log('\n⚠️ Ninguna contraseña común funcionó');
    console.log('💡 Necesitas resetear la contraseña del usuario admin');

    process.exit(1);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verificarPassword();
