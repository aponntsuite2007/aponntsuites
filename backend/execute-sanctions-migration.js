const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Usar DATABASE_URL de las variables de entorno (Render)
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está configurado');
  console.log('💡 Usar: DATABASE_URL="postgresql://..." node execute-sanctions-migration.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeMigration() {
  const client = await pool.connect();

  try {
    console.log('🔌 Conectado a la base de datos de Render');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '20251009_create_sanctions_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Ejecutando migración de sanctions...');

    // Ejecutar la migración completa
    await client.query(migrationSQL);

    console.log('✅ Migración de sanctions ejecutada exitosamente');

    // Verificar que la tabla existe
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sanctions'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ Tabla sanctions verificada');

      // Contar registros
      const count = await client.query('SELECT COUNT(*) FROM sanctions');
      console.log(`📊 Registros actuales en sanctions: ${count.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

executeMigration();
