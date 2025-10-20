const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendance_system',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

(async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT u.email, u.role, u.company_id, c.name as company_name, c.slug
      FROM users u
      LEFT JOIN companies c ON c.company_id = u.company_id
      WHERE u.email = 'admin@empresa-test.com'
    `);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('\n=== CREDENCIALES DE ACCESO ===\n');
      console.log('URL:      http://localhost:9998/panel-empresa.html\n');
      console.log('Email:    admin@empresa-test.com');
      console.log('Password: admin123\n');
      console.log('EMPRESA:');
      console.log('  Nombre: ', user.company_name || 'Empresa Test');
      console.log('  ID:     ', user.company_id);
      console.log('  Slug:   ', user.slug || 'N/A');
      console.log('\nRol:      ', user.role);
      console.log('\n');
    } else {
      console.log('⚠️  Usuario no encontrado');
    }
  } finally {
    client.release();
    await pool.end();
  }
})();
