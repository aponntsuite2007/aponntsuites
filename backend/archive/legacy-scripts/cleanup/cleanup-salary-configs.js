/**
 * Script para limpiar todas las configuraciones salariales soft-deleted
 * Esto asegura un estado limpio para los tests
 */

const { sequelize } = require('./src/config/database');

async function cleanupSalaryConfigs() {
  try {
    console.log('🧹 Limpiando configuraciones salariales soft-deleted...');

    // Eliminar todos los registros con isActive = false
    const result = await sequelize.query(`
      DELETE FROM user_salary_config
      WHERE is_active = false;
    `);

    console.log(`✅ ${result[1]?.rowCount || 0} registros soft-deleted eliminados`);

    // Mostrar registros activos restantes
    const [activeRecords] = await sequelize.query(`
      SELECT user_id, base_salary, is_active, created_at
      FROM user_salary_config
      WHERE is_active = true
      ORDER BY created_at DESC;
    `);

    console.log(`📊 Registros activos restantes: ${activeRecords.length}`);
    if (activeRecords.length > 0) {
      console.log('Registros activos:');
      activeRecords.forEach(record => {
        console.log(`  - user_id: ${record.user_id}, salary: ${record.base_salary}, active: ${record.is_active}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error limpiando configuraciones:', error.message);
    process.exit(1);
  }
}

cleanupSalaryConfigs();
