/**
 * Script para ejecutar migración de nuevos tipos de audit log
 *
 * Usage: node scripts/run-audit-types-migration.js
 */

const fs = require('fs');
const path = require('path');

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

async function runMigration() {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Para Render PostgreSQL
    }
  });

  try {
    console.log('🔧 [MIGRATION] Conectando a PostgreSQL...');
    await client.connect();

    console.log('📋 [MIGRATION] Ejecutando migración de audit log test types...');

    const migrationPath = path.join(__dirname, '..', 'migrations', '20251023_add_new_audit_test_types.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar la migración
    await client.query(migrationSQL);

    console.log('✅ [SUCCESS] Migración ejecutada exitosamente');
    console.log('✅ [SUCCESS] Nuevos tipos agregados: real-ux, deep-simulation');

    // Verificar que los tipos fueron agregados
    const result = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'audit_log_test_type'
      ORDER BY e.enumlabel
    `);

    console.log('📊 [INFO] Tipos de audit log disponibles:');
    result.rows.forEach(row => {
      console.log(`   - ${row.enumlabel}`);
    });

  } catch (error) {
    console.error('❌ [ERROR] Error ejecutando migración:', error.message);

    if (error.message.includes('already exists')) {
      console.log('ℹ️  [INFO] Los tipos ya existen, no hay problema');
    } else {
      throw error;
    }
  } finally {
    await client.end();
    console.log('🔧 [MIGRATION] Conexión cerrada');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 [COMPLETE] Migración completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 [FATAL] Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };