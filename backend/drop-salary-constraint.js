/**
 * Script para eliminar el constraint UNIQUE de user_id en user_salary_config
 * Esto es necesario para permitir soft deletes (múltiples registros con isActive=false)
 */

const { sequelize } = require('./src/config/database');

async function dropConstraint() {
  try {
    console.log('🔧 Eliminando constraint UNIQUE de user_salary_config.user_id...');

    await sequelize.query(`
      ALTER TABLE user_salary_config
      DROP CONSTRAINT IF EXISTS user_salary_config_user_id_key;
    `);

    console.log('✅ Constraint eliminado exitosamente');
    console.log('💡 Ahora el soft delete funcionará correctamente');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error eliminando constraint:', error.message);
    process.exit(1);
  }
}

dropConstraint();
