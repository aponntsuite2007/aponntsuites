const { sequelize } = require('./src/config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function createISIUser() {
  try {
    console.log('👤 CREANDO USUARIO PARA ISI...');
    console.log('=' .repeat(50));

    // Verificar si ya existe un usuario ISI
    const [existingUsers] = await sequelize.query(`
      SELECT user_id, username FROM users WHERE company_id = 11
    `);

    if (existingUsers.length > 0) {
      console.log('⚠️ Ya existe usuario(s) para ISI:');
      existingUsers.forEach(u => console.log(`  → ${u.username} (${u.id})`));
      console.log('\n🎯 ISI ya tiene usuarios. No es necesario crear más.');
      process.exit(0);
    }

    // Crear usuario admin para ISI
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash('123', 10);

    await sequelize.query(`
      INSERT INTO users (
        id, username, password, email, "firstName", "lastName",
        company_id, role, "isActive", "createdAt", "updatedAt"
      ) VALUES (
        ?, 'adminisi', ?, 'admin@isi.com', 'Admin', 'ISI',
        11, 'admin', true, NOW(), NOW()
      )
    `, {
      replacements: [userId, hashedPassword]
    });

    console.log('✅ Usuario creado exitosamente:');
    console.log(`  👤 Username: adminisi`);
    console.log(`  🔑 Password: 123`);
    console.log(`  🏢 Company: ISI (ID: 11)`);
    console.log(`  📧 Email: admin@isi.com`);
    console.log(`  🎭 Role: admin`);
    console.log(`  🆔 ID: ${userId}`);

    console.log('\n🎯 AHORA PUEDES HACER LOGIN EN PANEL-EMPRESA CON:');
    console.log('  Usuario: adminisi');
    console.log('  Clave: 123');
    console.log('  Y verás todos los 21 módulos de ISI habilitados! 🎉');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createISIUser();
