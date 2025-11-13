/**
 * Script para ejecutar migración de audit_logs (agregar execution_id)
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
  console.log('\n🔧 Ejecutando migración de audit_logs...\n');

  try {
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, 'migrations', '20251029_add_execution_id_to_audit_logs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar migración
    console.log('📄 Ejecutando SQL de migración...');
    await pool.query(migrationSQL);

    console.log('✅ Migración ejecutada exitosamente\n');

    // Verificar que la columna existe
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'audit_logs' AND column_name = 'execution_id'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Columna execution_id confirmada:');
      console.log(`   • Tipo: ${result.rows[0].data_type}\n`);
    } else {
      console.log('❌ La columna execution_id NO fue creada\n');
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
