const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendance_system',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('\n🔄 Ejecutando migración: Knowledge Base GLOBAL...\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../migrations/20250120_make_knowledge_base_global.sql'),
      'utf8'
    );

    await client.query(migrationSQL);

    console.log('\n✅ Migración ejecutada exitosamente\n');

    // Verificar cambios
    console.log('🔍 Verificando cambios...\n');

    // 1. Verificar que company_id es nullable
    const columnCheck = await client.query(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'assistant_knowledge_base'
        AND column_name = 'company_id'
    `);

    console.log(`✓ assistant_knowledge_base.company_id nullable: ${columnCheck.rows[0].is_nullable}`);

    // 2. Verificar que tabla conversations existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'assistant_conversations'
      )
    `);

    console.log(`✓ Tabla assistant_conversations existe: ${tableCheck.rows[0].exists}`);

    // 3. Contar índices
    const indexCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE tablename IN ('assistant_knowledge_base', 'assistant_conversations')
    `);

    console.log(`✓ Índices creados: ${indexCheck.rows[0].count}`);

    // 4. Verificar funciones
    const functionCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname IN ('get_company_conversation_stats', 'get_global_knowledge_stats', 'increment_knowledge_reuse')
    `);

    console.log(`✓ Funciones creadas: ${functionCheck.rows[0].count}`);

    console.log('\n🎯 Sistema listo para aprendizaje GLOBAL\n');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runMigration().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runMigration };
