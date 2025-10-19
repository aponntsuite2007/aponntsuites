const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/20251019_vacation_notification_templates.sql'),
      'utf8'
    );

    console.log('🔧 Ejecutando migración de templates de vacaciones...');
    await client.query(sql);
    console.log('✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
