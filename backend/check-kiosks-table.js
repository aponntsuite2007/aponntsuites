const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está configurado');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTable() {
  const client = await pool.connect();

  try {
    console.log('🔌 Conectado a la base de datos de Render\n');

    // Verificar si la tabla existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'kiosks'
      );
    `);

    console.log(`📋 Tabla kiosks existe: ${tableExists.rows[0].exists}\n`);

    if (tableExists.rows[0].exists) {
      // Ver las columnas
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'kiosks'
        ORDER BY ordinal_position;
      `);

      console.log('📊 Columnas actuales:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      // Ver índices
      const indexes = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'kiosks';
      `);

      console.log('\n🔍 Índices:');
      indexes.rows.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });

      // Contar registros
      const count = await client.query('SELECT COUNT(*) FROM kiosks');
      console.log(`\n📈 Registros: ${count.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTable();
