/**
 * Script para ejecutar migración del sistema de feriados
 */

const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function runMigration() {
  try {
    console.log('🔄 Ejecutando migración del sistema de feriados...\n');

    const migrationPath = path.join(__dirname, '../migrations/20250122_add_holidays_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar la migración
    await db.sequelize.query(sql);

    console.log('✅ Migración ejecutada exitosamente!\n');

    // Verificar tablas creadas
    const [holidays] = await db.sequelize.query(`
      SELECT COUNT(*) as count FROM holidays;
    `);

    console.log(`📊 Tabla holidays: ${holidays[0].count} registros`);

    // Verificar nuevas columnas en shifts
    const [shiftColumns] = await db.sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'shifts'
      AND column_name IN ('branch_id', 'respect_national_holidays', 'respect_provincial_holidays', 'custom_non_working_days')
      ORDER BY column_name;
    `);

    console.log('\n📋 Nuevas columnas en shifts:');
    shiftColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Verificar nuevas columnas en branches
    const [branchColumns] = await db.sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'branches'
      AND column_name IN ('country', 'state_province', 'city', 'postal_code', 'timezone')
      ORDER BY column_name;
    `);

    console.log('\n🏢 Nuevas columnas en branches:');
    branchColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Verificar nueva columna en users
    const [userColumns] = await db.sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'branch_id';
    `);

    console.log('\n👥 Nuevas columnas en users:');
    userColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n🎉 ¡Sistema de feriados instalado correctamente!');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();
