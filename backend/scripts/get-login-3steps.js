const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendance_system',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

(async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        u.usuario,
        u.email,
        u.role,
        u.company_id,
        c.name as company_name,
        c.slug
      FROM users u
      LEFT JOIN companies c ON c.company_id = u.company_id
      WHERE u.role = 'admin'
      ORDER BY u.company_id
      LIMIT 5
    `);

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   CREDENCIALES DE LOGIN (3 PASOS)             ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    result.rows.forEach((u, i) => {
      console.log(`═══ OPCIÓN ${i+1} ═══`);
      console.log(`1️⃣  EMPRESA:  ${u.slug || u.company_name}`);
      console.log(`2️⃣  USUARIO:  ${u.usuario || u.email.split('@')[0]}`);
      console.log(`3️⃣  PASSWORD: admin123`);
      console.log('');
    });

    console.log('URL: http://localhost:9998/panel-empresa.html\n');
  } finally {
    client.release();
    await pool.end();
  }
})();
