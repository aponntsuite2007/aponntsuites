/**
 * SCRIPT: Crear vista notifications_enterprise
 * Resuelve el error: no existe la columna «created_at» en la relación «notifications_enterprise»
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de conexión local (mismos valores que database.js)
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔧 [MIGRATION] Creando vista notifications_enterprise...\n');

    const migrationPath = path.join(__dirname, '../migrations/20260201_create_notifications_enterprise_view.sql');

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Archivo de migración no encontrado:', migrationPath);
      return;
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    await client.query(sql);
    console.log('✅ [SUCCESS] Vista notifications_enterprise creada correctamente\n');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  [INFO] Vista ya existe (OK)\n');
    } else {
      console.error('❌ [ERROR]', error.message);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
