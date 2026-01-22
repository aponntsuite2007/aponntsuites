/**
 * Fix missing columns in unified_notifications table
 * Required for API v2 to work properly
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function addMissingColumns() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL');

    // Agregar columna completed_at si no existe
    await sequelize.query(`
      ALTER TABLE unified_notifications
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
    `);
    console.log('✅ Columna completed_at agregada (o ya existía)');

    // Agregar columna is_deleted si no existe
    await sequelize.query(`
      ALTER TABLE unified_notifications
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Columna is_deleted agregada (o ya existía)');

    // Verificar las columnas
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'unified_notifications'
      AND column_name IN ('completed_at', 'is_deleted')
      ORDER BY column_name;
    `);

    console.log('\n📋 Columnas verificadas:');
    columns.forEach(col => {
      console.log('  -', col.column_name, '(' + col.data_type + ')', col.column_default ? 'DEFAULT: ' + col.column_default : '');
    });

    await sequelize.close();
    console.log('\n✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addMissingColumns();
