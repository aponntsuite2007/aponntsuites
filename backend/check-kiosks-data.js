const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const result = await pool.query('SELECT id, name, location, is_active FROM kiosks WHERE deleted_at IS NULL ORDER BY id');
    console.log('📟 Kiosks en base de datos:', result.rows.length);
    result.rows.forEach(k => {
      console.log(`  - ID: ${k.id} | Nombre: ${k.name} | Activo: ${k.is_active}`);
    });
    pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    pool.end();
  }
})();
