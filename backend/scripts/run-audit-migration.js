/**
 * SCRIPT: Ejecutar migración de audit_logs
 *
 * Crea la tabla audit_logs en PostgreSQL
 * Compatible con local y Render
 *
 * Uso:
 *   LOCAL:  node scripts/run-audit-migration.js
 *   RENDER: DATABASE_URL=... node scripts/run-audit-migration.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ═══════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════

const isRender = !!process.env.DATABASE_URL;
const environment = isRender ? 'RENDER' : 'LOCAL';

console.log(`🚀 [MIGRATION] Ejecutando en: ${environment}`);

// Pool de PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendance_system',
  ssl: isRender ? { rejectUnauthorized: false } : false
});

// ═══════════════════════════════════════════════════════════
// EJECUTAR MIGRACIÓN
// ═══════════════════════════════════════════════════════════

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('📦 [MIGRATION] Conectado a PostgreSQL');

    // Leer archivo SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', '20250119_create_audit_logs.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 [MIGRATION] Archivo SQL leído correctamente');
    console.log(`📏 [MIGRATION] Tamaño: ${sqlContent.length} caracteres`);

    // Ejecutar SQL
    console.log('🔧 [MIGRATION] Ejecutando SQL...');

    await client.query(sqlContent);

    console.log('✅ [MIGRATION] Migración ejecutada exitosamente');

    // Verificar tabla creada
    const checkTable = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'audit_logs'
      ORDER BY ordinal_position
    `);

    console.log(`✅ [MIGRATION] Tabla audit_logs creada con ${checkTable.rows.length} columnas`);

    // Verificar índices
    const checkIndexes = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'audit_logs'
    `);

    console.log(`✅ [MIGRATION] ${checkIndexes.rows.length} índices creados`);

    // Verificar funciones
    const checkFunctions = await client.query(`
      SELECT proname
      FROM pg_proc
      WHERE proname IN ('get_execution_summary', 'get_module_health', 'update_audit_logs_updated_at')
    `);

    console.log(`✅ [MIGRATION] ${checkFunctions.rows.length} funciones helper creadas`);

    console.log('\n🎉 [MIGRATION] ¡TODO LISTO!');
    console.log('🔍 Sistema de Auditoría y Auto-Diagnóstico configurado correctamente\n');

  } catch (error) {
    console.error('❌ [MIGRATION] Error ejecutando migración:', error.message);

    if (error.message.includes('already exists')) {
      console.log('ℹ️  [MIGRATION] La tabla audit_logs ya existe');
      console.log('ℹ️  [MIGRATION] No es necesario ejecutar la migración nuevamente');
    } else {
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

runMigration()
  .then(() => {
    console.log('✅ [MIGRATION] Script completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ [MIGRATION] Error fatal:', error);
    process.exit(1);
  });
