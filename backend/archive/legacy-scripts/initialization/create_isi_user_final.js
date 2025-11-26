const { sequelize } = require('./src/config/database');

async function createIsiUserFinal() {
  try {
    console.log('👤 CREANDO USUARIO FINAL PARA ISI...');

    // Crear usuario para ISI usando las columnas mínimas requeridas
    await sequelize.query(`
      INSERT INTO users (
        id, email, password, username, company_id, role, is_active
      ) VALUES (
        gen_random_uuid(),
        'admin@isi.com',
        '$2b$10$placeholder_hash',
        'admin_isi',
        11,
        'admin',
        true
      )
      ON CONFLICT (email) DO UPDATE SET
        company_id = 11,
        is_active = true
    `);

    console.log('✅ Usuario admin@isi.com creado/actualizado para ISI (company_id=11)');

    // Verificar usuarios en ISI
    const [isiUsers] = await sequelize.query(`
      SELECT user_id, email, username, company_id FROM users
      WHERE company_id = 11
    `);

    console.log('\n👥 USUARIOS EN ISI:');
    isiUsers.forEach(u => console.log(`  - ${u.email} (${u.username}) | ID: ${u.id}`));

    // Verificar módulos activos
    const [moduleCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM company_modules
      WHERE company_id = 11 AND activo = true
    `);

    console.log(`\n📦 ISI tiene ${moduleCount[0].total} módulos activos`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createIsiUserFinal();