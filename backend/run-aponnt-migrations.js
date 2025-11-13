/**
 * =====================================================================
 * SCRIPT: Ejecutar Migraciones de Aponnt Staff y Partners
 * =====================================================================
 */

const { sequelize } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('\n🚀 ========================================');
  console.log('   EJECUTAR MIGRACIONES APONNT');
  console.log('========================================\n');

  try {
    // Conectar a BD
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos exitosa\n');

    // Migraciones a ejecutar
    const migrations = [
      '20251030_create_aponnt_staff.sql',
      '20251030_create_aponnt_staff_companies.sql',
      '20251030_create_partners.sql'
    ];

    for (const migration of migrations) {
      const filePath = path.join(__dirname, 'migrations', migration);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Migración ${migration} no encontrada, saltando...`);
        continue;
      }

      console.log(`📋 Ejecutando: ${migration}...`);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await sequelize.query(sql);
        console.log(`✅ ${migration} ejecutada correctamente\n`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('ya existe')) {
          console.log(`ℹ️  ${migration} - Objetos ya existen (OK)\n`);
        } else {
          console.error(`❌ Error en ${migration}:`, error.message);
          console.error('Detalles:', error);
          // No salir, continuar con las siguientes migraciones
        }
      }
    }

    console.log('✅ ========================================');
    console.log('   MIGRACIONES COMPLETADAS');
    console.log('========================================\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('   ERROR AL EJECUTAR MIGRACIONES');
    console.error('========================================\n');
    console.error('Error:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
}

// Ejecutar
console.log('⏳ Iniciando ejecución de migraciones Aponnt...\n');
runMigrations();
