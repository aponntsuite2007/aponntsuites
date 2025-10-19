/**
 * Ejecutar una sola migración específica
 *
 * USO: node scripts/run-single-migration.js <nombre-archivo.sql>
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Uso: node scripts/run-single-migration.js <nombre-archivo.sql>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  console.log(`📄 Ejecutando: ${migrationFile}\n`);

  const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Archivo no encontrado: ${migrationPath}`);
    process.exit(1);
  }

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const client = await pool.connect();

    try {
      await client.query(sql);
      console.log(`\n✅ ${migrationFile} completado exitosamente!\n`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`\n❌ Error en ${migrationFile}:`);
    console.error('Mensaje:', error.message);
    if (error.detail) console.error('Detalles:', error.detail);
    if (error.hint) console.error('Sugerencia:', error.hint);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
