const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendance_system',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

(async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT u.email, u.role, u.company_id, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON c.company_id = u.company_id
      WHERE u.role = 'admin'
      ORDER BY u.company_id
      LIMIT 10
    `);

    console.log('\n=== USUARIOS ADMIN DISPONIBLES ===\n');

    result.rows.forEach((user, i) => {
      console.log(`Opción ${i+1}:`);
      console.log(`  Email:    ${user.email}`);
      console.log(`  Password: admin123`);
      console.log(`  Empresa:  ${user.company_name || 'Sin empresa'}`);
      console.log('');
    });

    console.log('URL: http://localhost:9998/panel-empresa.html\n');
  } finally {
    client.release();
    await pool.end();
  }
})();
