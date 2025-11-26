/**
 * Script para ejecutar migración de audit_test_logs
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD
});

async function runMigration() {
  console.log('\n🔧 Ejecutando migración de audit_test_logs...\n');

  try {
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, 'migrations', '20251029_create_audit_test_logs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar migración
    console.log('📄 Ejecutando SQL de migración...');
    await pool.query(migrationSQL);

    console.log('✅ Migración ejecutada exitosamente\n');

    // Verificar que la tabla existe
    const tableResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'audit_test_logs'
    `);

    if (tableResult.rows.length > 0) {
      console.log('✅ Tabla audit_test_logs creada\n');

      // Ver columnas
      const columnsResult = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'audit_test_logs'
        ORDER BY ordinal_position
      `);

      console.log('📋 Columnas de audit_test_logs:');
      columnsResult.rows.forEach(col => {
        console.log(`   • ${col.column_name} (${col.data_type})`);
      });
      console.log('');

    } else {
      console.log('❌ La tabla audit_test_logs NO fue creada\n');
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('\n⚠️  Esto es normal si la tabla ya existe.\n');
  } finally {
    await pool.end();
  }
}

runMigration();
