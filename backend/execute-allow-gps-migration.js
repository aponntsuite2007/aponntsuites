const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('🔄 Ejecutando migración: department_allow_gps_attendance');
    console.log('📂 Leyendo archivo SQL...');

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '20251009_department_allow_gps_attendance.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('✅ Archivo leído correctamente');
    console.log('🚀 Ejecutando migración en Render...\n');

    await pool.query(sql);

    console.log('\n✅ Migración ejecutada exitosamente!');
    console.log('📊 Columna allow_gps_attendance agregada a departments');
    console.log('📦 Datos migrados automáticamente (departamentos con GPS → allow_gps_attendance=true)');

    pool.end();
  } catch (err) {
    console.error('❌ Error ejecutando migración:', err.message);
    console.error('Stack:', err.stack);
    pool.end();
    process.exit(1);
  }
})();
