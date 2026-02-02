const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
    console.log('🔧 [MIGRATION] Agregando tipos de notificación DMS...\n');
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/20260201_add_dms_notification_types.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ [SUCCESS] Tipos de notificación DMS agregados\n');
  } catch (error) {
    console.error('❌ [ERROR]', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}
runMigration();
