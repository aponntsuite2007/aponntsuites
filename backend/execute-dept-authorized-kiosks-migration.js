const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('🔄 Ejecutando migración: department_authorized_kiosks');
    console.log('📂 Leyendo archivo SQL...');

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '20251009_department_authorized_kiosks.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('✅ Archivo leído correctamente');
    console.log('🚀 Ejecutando migración en Render...\n');

    await pool.query(sql);

    console.log('\n✅ Migración ejecutada exitosamente!');
    console.log('📊 Columna authorized_kiosks agregada a departments');
    console.log('📦 Datos migrados de default_kiosk_id a authorized_kiosks');

    pool.end();
  } catch (err) {
    console.error('❌ Error ejecutando migración:', err.message);
    console.error('Stack:', err.stack);
    pool.end();
    process.exit(1);
  }
})();
