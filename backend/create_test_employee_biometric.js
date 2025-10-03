const { sequelize } = require('./src/config/database');

async function createTestEmployeeWithBiometric() {
  try {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('emp123', 10);

    // 1. Crear empleado
    const [employee] = await sequelize.query(`
      INSERT INTO users (
        user_id, "employeeId", usuario, email, password,
        "firstName", "lastName", dni, role, company_id,
        is_active, "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), 'EMP001', 'juan.perez', 'juan.perez@test.com',
        '${passwordHash}', 'Juan', 'Pérez', '87654321', 'employee', 11,
        true, NOW(), NOW()
      )
      RETURNING user_id, "employeeId"
    `);

    const employeeId = employee[0].employeeId;
    const userId = employee[0].user_id;

    console.log('✅ Empleado creado:', employeeId, userId);

    // 2. Generar embedding de prueba (128 dimensiones, valores random entre -1 y 1)
    const mockEmbedding = Array.from({ length: 128 }, () => Math.random() * 2 - 1);

    // 3. Insertar template biométrico
    await sequelize.query(`
      INSERT INTO biometric_templates (
        id, "employeeId", user_id, company_id, template_data,
        quality_score, algorithm, "createdAt", "updatedAt", is_active
      )
      VALUES (
        gen_random_uuid(), '${employeeId}', '${userId}', 11,
        '${JSON.stringify(mockEmbedding)}', 0.95, 'face-api.js',
        NOW(), NOW(), true
      )
    `);

    console.log('✅ Template biométrico creado para empleado:', employeeId);
    console.log('📊 Embedding generado:', mockEmbedding.length, 'dimensiones');
    console.log('');
    console.log('🎯 Empleado de prueba listo:');
    console.log('   Employee ID:', employeeId);
    console.log('   Nombre: Juan Pérez');
    console.log('   Usuario: juan.perez');
    console.log('   Password: emp123');
    console.log('   Company ID: 11');
    console.log('');
    console.log('⚠️ IMPORTANTE: El backend necesita ajuste temporal para testing');
    console.log('   Voy a modificar el threshold de matching a 0.1 (muy permisivo)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestEmployeeWithBiometric();
