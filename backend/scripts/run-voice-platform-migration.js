/**
 * EJECUTAR MIGRACIÓN DE VOICE PLATFORM
 *
 * Este script ejecuta la migración completa del Employee Voice Platform:
 * - Instala extensión pgvector
 * - Crea todas las tablas
 * - Crea índices optimizados
 * - Crea funciones y triggers
 * - Inserta datos iniciales
 *
 * @usage: node scripts/run-voice-platform-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Aedr15150302',
  database: process.env.DB_NAME || 'attendance_system'
};

async function runMigration() {
  const client = new Client(config);

  try {
    console.log('📡 Conectando a base de datos...');
    await client.connect();
    console.log('✅ Conectado a:', config.database);

    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '../migrations/20251222_voice_platform_complete.sql');
    console.log('\n📄 Leyendo migración:', migrationPath);

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar migración
    console.log('\n🚀 Ejecutando migración...\n');
    await client.query(sql);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   ✅ VOICE PLATFORM MIGRATION COMPLETADA                ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Verificar tablas creadas
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'employee_experiences%'
         OR table_name LIKE 'experience_%'
         OR table_name LIKE 'voice_%'
      ORDER BY table_name
    `);

    console.log('📊 Tablas creadas:');
    result.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.table_name}`);
    });

    // Verificar extensión pgvector
    const vectorExt = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);

    console.log('\n🔧 Extensión pgvector:', vectorExt.rows.length > 0 ? '✅ INSTALADA' : '❌ NO INSTALADA');

    // Verificar funciones
    const functions = await client.query(`
      SELECT proname
      FROM pg_proc p
      INNER JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND (proname LIKE '%experience%' OR proname LIKE '%voice%' OR proname LIKE '%cluster%')
      ORDER BY proname
    `);

    console.log('\n⚙️  Funciones creadas:', functions.rows.length);
    functions.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.proname}()`);
    });

    console.log('\n🎯 Sistema listo para usar!\n');

  } catch (error) {
    console.error('\n❌ ERROR EN MIGRACIÓN:');
    console.error('   ', error.message);
    console.error('\n', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Ejecutar
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✨ Migración completada exitosamente\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = runMigration;
