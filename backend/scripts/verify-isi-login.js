const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendance_system',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

(async () => {
  const client = await pool.connect();
  try {
    // 1. Obtener TODAS las empresas
    const companies = await client.query('SELECT company_id, name, slug FROM companies ORDER BY company_id');

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   TODAS LAS EMPRESAS DISPONIBLES              ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    companies.rows.forEach(c => {
      const slugText = c.slug || 'NULL';
      console.log(`ID: ${c.company_id.toString().padEnd(3)} | ${c.name.padEnd(30)} | Slug: '${slugText}'`);
    });

    // 2. Buscar ISI específicamente
    const isiCompany = companies.rows.find(c =>
      c.name.toLowerCase().includes('isi') ||
      (c.slug && c.slug.toLowerCase().includes('isi'))
    );

    if (!isiCompany) {
      console.log('\n❌ No se encontró empresa con "ISI" en el nombre o slug\n');
      return;
    }

    console.log(`\n✅ EMPRESA ISI ENCONTRADA: ${isiCompany.name} (ID: ${isiCompany.company_id})`);
    console.log(`   Slug: '${isiCompany.slug || 'NULL'}'\n`);

    // 3. Buscar usuarios admin de ISI
    const isiUsers = await client.query(`
      SELECT
        usuario,
        email,
        role,
        "firstName",
        "lastName",
        password
      FROM users
      WHERE company_id = $1 AND role = 'admin'
      ORDER BY usuario
    `, [isiCompany.company_id]);

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   USUARIOS ADMIN DE ISI - VERIFICADOS         ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    if (isiUsers.rows.length === 0) {
      console.log('❌ No hay usuarios admin en ISI\n');

      // Buscar CUALQUIER usuario de ISI
      const anyUsers = await client.query(`
        SELECT usuario, email, role FROM users WHERE company_id = $1 LIMIT 5
      `, [isiCompany.company_id]);

      if (anyUsers.rows.length > 0) {
        console.log('Usuarios encontrados (cualquier rol):');
        anyUsers.rows.forEach(u => {
          console.log(`  • ${u.email} (rol: ${u.role}, usuario: ${u.usuario || 'N/A'})`);
        });
      }
    } else {
      for (const user of isiUsers.rows) {
        console.log('═══════════════════════════════════════════════');
        console.log(`Usuario: ${user.usuario || 'N/A'}`);
        console.log(`Email: ${user.email}`);
        console.log(`Nombre: ${user.firstName} ${user.lastName}`);
        console.log(`Rol: ${user.role}`);

        // Verificar passwords comunes
        const passwords = ['admin123', 'password', '123456', 'admin', 'Aedr15150302'];
        const passwordHash = user.password;

        console.log('\nVerificando passwords:');
        for (const pwd of passwords) {
          try {
            const matches = await bcrypt.compare(pwd, passwordHash);
            if (matches) {
              console.log(`  ✅ '${pwd}' - FUNCIONA`);
            }
          } catch (e) {
            // Silent
          }
        }
        console.log('');
      }

      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║   CREDENCIALES PARA LOCALHOST                  ║');
      console.log('╚════════════════════════════════════════════════╝\n');
      console.log('URL: http://localhost:9998/panel-empresa.html\n');
      console.log('LOGIN (3 PASOS):');
      console.log(`1️⃣  EMPRESA:  ${isiCompany.slug || isiCompany.name}`);
      console.log(`2️⃣  USUARIO:  ${isiUsers.rows[0].usuario || isiUsers.rows[0].email.split('@')[0]}`);
      console.log(`3️⃣  PASSWORD: (ver arriba cual funciona)`);
      console.log('');
    }

  } finally {
    client.release();
    await pool.end();
  }
})();
