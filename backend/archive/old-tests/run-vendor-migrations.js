/**
 * Ejecutar migraciones del sistema de roles y comisiones
 */

const { sequelize } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

const migrations = [
  '20250119_update_aponnt_staff_hierarchy.sql',
  '20250119_create_vendor_statistics.sql',
  '20250119_add_commission_fields_to_companies.sql',
  '20250119_create_pyramid_commission_functions.sql'
];

async function runMigrations() {
  console.log('🚀 Ejecutando migraciones del sistema de roles y comisiones...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida\n');

    for (const migration of migrations) {
      const filePath = path.join(__dirname, 'migrations', migration);
      console.log(`📄 Ejecutando: ${migration}`);

      const sql = fs.readFileSync(filePath, 'utf8');
      await sequelize.query(sql);

      console.log(`   ✅ Completada\n`);
    }

    console.log('🎉 Todas las migraciones ejecutadas exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigrations();
