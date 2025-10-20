const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendance_system',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

(async () => {
  const client = await pool.connect();

  try {
    console.log('\n🚀 Ejecutando migración: assistant_knowledge_base\n');

    // Leer archivo SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', '20250119_create_assistant_knowledge_base.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar migración
    await client.query(migrationSQL);

    console.log('\n✅ Migración ejecutada exitosamente\n');

    // Verificar tabla creada
    const verifyTable = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'assistant_knowledge_base'
      ORDER BY ordinal_position
      LIMIT 10
    `);

    console.log('📋 Primeras 10 columnas de assistant_knowledge_base:');
    verifyTable.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Verificar índices
    const verifyIndexes = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'assistant_knowledge_base'
    `);

    console.log(`\n📊 Índices creados: ${verifyIndexes.rows.length}`);
    verifyIndexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    // Verificar funciones
    const verifyFunctions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_name IN ('search_similar_answers', 'get_assistant_stats')
    `);

    console.log(`\n⚙️  Funciones helper: ${verifyFunctions.rows.length}`);
    verifyFunctions.rows.forEach(fn => {
      console.log(`  - ${fn.routine_name}()`);
    });

    console.log('\n🤖 Sistema de Asistente IA LISTO para recibir conversaciones\n');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  La tabla ya existe - No se realizaron cambios\n');
    } else {
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
})();
