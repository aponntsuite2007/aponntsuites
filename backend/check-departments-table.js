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

    // Ver las columnas
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'departments'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Columnas de departments:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Contar registros
    const count = await client.query('SELECT COUNT(*) FROM departments');
    console.log(`\n📈 Registros: ${count.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTable();
