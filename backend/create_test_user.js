const { sequelize } = require('./src/config/database');

async function createTestUser() {
  try {
    const passwordHash = '$2a$10$Jgx83uFjuDHU9dq6gz3uBObkFLaSTqsDOajx6av2YQ.GDAsdDySQK'; // test123

    // Primero eliminar usuarios de prueba existentes
    await sequelize.query(`
      DELETE FROM users WHERE usuario = 'testuser' OR email = 'test@example.com' OR dni = '12345678';
    `);

    // Insertar usuario de prueba nuevo
    await sequelize.query(`
      INSERT INTO users (user_id, "employeeId", usuario, email, password, "firstName", "lastName", dni, role, company_id, is_active, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'TEST001', 'testuser', 'test@example.com', '${passwordHash}', 'Test', 'User', '12345678', 'admin', 11, true, NOW(), NOW());
    `);

    console.log('✅ Usuario de prueba creado exitosamente:');
    console.log('   Usuario: testuser');
    console.log('   Password: test123');
    console.log('   Company ID: 11');
    console.log('   Role: admin');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    process.exit(1);
  }
}

createTestUser();
