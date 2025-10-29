const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendance_system',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

(async () => {
  const client = await pool.connect();
  try {
    // Buscar empresa ISI
    const result = await client.query(`
      SELECT
        c.company_id,
        c.name as company_name,
        c.slug,
        u.usuario,
        u.email,
        u.role,
        u."firstName",
        u."lastName"
      FROM companies c
      LEFT JOIN users u ON u.company_id = c.company_id
      WHERE LOWER(c.name) LIKE '%isi%' OR LOWER(c.slug) LIKE '%isi%'
      ORDER BY c.company_id, u.role DESC
      LIMIT 10
    `);

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   EMPRESA ISI - CREDENCIALES LOCALHOST        ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    if (result.rows.length === 0) {
      console.log('❌ No se encontró empresa ISI\n');
      console.log('Buscando todas las empresas disponibles...\n');

      const allCompanies = await client.query(`
        SELECT company_id, name, slug FROM companies ORDER BY company_id LIMIT 10
      `);

      console.log('EMPRESAS DISPONIBLES:');
      allCompanies.rows.forEach(c => {
        console.log(`  • ${c.name} (slug: ${c.slug || 'N/A'})`);
      });
    } else {
      const company = result.rows[0];
      const admins = result.rows.filter(r => r.role === 'admin');

      console.log(`🏢 EMPRESA: ${company.company_name}`);
      console.log(`   ID: ${company.company_id}`);
      console.log(`   Slug: ${company.slug || 'N/A'}`);
      console.log('');

      if (admins.length > 0) {
        console.log('👥 USUARIOS ADMIN DISPONIBLES:\n');
        admins.forEach((admin, i) => {
          console.log(`═══ OPCIÓN ${i+1} ═══`);
          console.log(`1️⃣  EMPRESA:  ${company.slug || company.company_name}`);
          console.log(`2️⃣  USUARIO:  ${admin.usuario || admin.email.split('@')[0]}`);
          console.log(`3️⃣  PASSWORD: admin123`);
          console.log(`    (Nombre: ${admin.firstName || ''} ${admin.lastName || ''})`);
          console.log('');
        });
      } else {
        console.log('⚠️  No se encontraron usuarios admin para esta empresa\n');
        console.log('Todos los usuarios de ISI:\n');
        result.rows.forEach(u => {
          console.log(`  • ${u.email} (rol: ${u.role})`);
        });
      }

      console.log('\n📍 URL: http://localhost:9998/panel-empresa.html\n');
    }
  } finally {
    client.release();
    await pool.end();
  }
})();
