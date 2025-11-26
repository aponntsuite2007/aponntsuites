const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function createTestUser() {
  try {
    console.log('🔐 Actualizando contraseña del usuario admin...\n');

    // Hash de la password "123456"
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Actualizar el usuario admin
    const [results] = await sequelize.query(`
      UPDATE users
      SET password = :password, is_active = true
      WHERE usuario = 'admin' AND company_id = 11
      RETURNING user_id, usuario, email
    `, {
      replacements: { password: hashedPassword }
    });

    if (results.length > 0) {
      console.log('✅ Contraseña actualizada exitosamente!');
      console.log(`Usuario: ${results[0].usuario}`);
      console.log(`Email: ${results[0].email}`);
      console.log(`Password: 123456`);
      console.log(`\n📝 Credenciales de prueba:`);
      console.log(`   identifier: "admin"`);
      console.log(`   password: "123456"`);
      console.log(`   companyId: 11`);
    } else {
      console.log('❌ No se encontró el usuario admin');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
