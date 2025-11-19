/**
 * Script para eliminar TODAS las configuraciones salariales del usuario de test
 * Esto asegura un estado 100% limpio para los tests
 */

const { sequelize } = require('./src/config/database');

async function cleanupAll() {
  try {
    console.log('🧹 Limpiando TODAS las configuraciones salariales del usuario de test...');

    // User ID del test (admin de company_id 11)
    const testUserId = '766de495-e4f3-4e91-a509-1a495c52e15c';

    // Eliminar TODOS los registros de este usuario (activos + soft-deleted)
    const result = await sequelize.query(`
      DELETE FROM user_salary_config
      WHERE user_id = '${testUserId}';
    `);

    console.log(`✅ ${result[1]?.rowCount || 0} registros eliminados (activos + soft-deleted)`);

    // Mostrar registros restantes
    const [remaining] = await sequelize.query(`
      SELECT user_id, base_salary, is_active, created_at
      FROM user_salary_config
      WHERE user_id = '${testUserId}'
      ORDER BY created_at DESC;
    `);

    console.log(`📊 Registros restantes del usuario de test: ${remaining.length}`);
    if (remaining.length > 0) {
      console.log('⚠️  ADVERTENCIA: Aún quedan registros:');
      remaining.forEach(record => {
        console.log(`  - user_id: ${record.user_id}, salary: ${record.base_salary}, active: ${record.is_active}`);
      });
    } else {
      console.log('✅ Usuario de test limpio - listo para ejecutar tests');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error limpiando configuraciones:', error.message);
    process.exit(1);
  }
}

cleanupAll();
