/**
 * Ejecutar migración de hardware profiles
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function runMigration() {
  try {
    console.log('🔄 Conectando a base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa');

    console.log('\n🔧 Ejecutando migración de hardware profiles...\n');

    // Agregar columnas
    await sequelize.query(`
      ALTER TABLE kiosks
      ADD COLUMN IF NOT EXISTS hardware_profile VARCHAR(100),
      ADD COLUMN IF NOT EXISTS hardware_category VARCHAR(50),
      ADD COLUMN IF NOT EXISTS detection_method_facial VARCHAR(100),
      ADD COLUMN IF NOT EXISTS detection_method_fingerprint VARCHAR(100),
      ADD COLUMN IF NOT EXISTS performance_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS supports_walkthrough BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS supports_liveness BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS biometric_modes JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS hardware_specs JSONB;
    `);

    console.log('✅ Migración completada exitosamente');
    console.log('\n📊 Columnas agregadas:');
    console.log('  - hardware_profile');
    console.log('  - hardware_category');
    console.log('  - detection_method_facial');
    console.log('  - detection_method_fingerprint');
    console.log('  - performance_score');
    console.log('  - supports_walkthrough');
    console.log('  - supports_liveness');
    console.log('  - biometric_modes');
    console.log('  - hardware_specs\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();
