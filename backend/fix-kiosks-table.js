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

async function fixTable() {
  const client = await pool.connect();

  try {
    console.log('🔌 Conectado a la base de datos de Render\n');

    // Agregar deleted_at si no existe
    console.log('📝 Agregando columna deleted_at...');
    await client.query(`
      ALTER TABLE kiosks
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
    `);

    // Asegurar que company_id sea NOT NULL (primero llenar nulls)
    console.log('📝 Actualizando company_id null a 1...');
    await client.query(`
      UPDATE kiosks SET company_id = 1 WHERE company_id IS NULL;
    `);

    console.log('📝 Estableciendo company_id como NOT NULL...');
    await client.query(`
      ALTER TABLE kiosks
      ALTER COLUMN company_id SET NOT NULL;
    `);

    // Asegurar valores por defecto
    console.log('📝 Estableciendo defaults...');
    await client.query(`
      ALTER TABLE kiosks
      ALTER COLUMN is_configured SET DEFAULT false;
    `);

    // Agregar constraint si no existe
    console.log('📝 Agregando foreign key constraint...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'kiosks_company_id_fkey'
        ) THEN
          ALTER TABLE kiosks
          ADD CONSTRAINT kiosks_company_id_fkey
          FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    console.log('\n✅ Tabla kiosks actualizada exitosamente\n');

    // Verificar
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'kiosks'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Columnas actualizadas:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default || ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixTable();
