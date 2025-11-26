const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'attendance_system',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  port: process.env.POSTGRES_PORT || 5432,
});

async function checkISICredentials() {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.usuario, u."firstName", u."lastName", u.email, u.role,
             c.name as company_name, c.slug
      FROM users u
      JOIN companies c ON u.company_id = c.company_id
      WHERE c.slug = 'international-security-investigations-isi'
      ORDER BY u.user_id
    `);

    console.log('\n📋 USUARIOS DE ISI:\n');
    if (result.rows.length === 0) {
      console.log('❌ No se encontraron usuarios para ISI');
    } else {
      result.rows.forEach(user => {
        console.log(`✅ Usuario: ${user.usuario}`);
        console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Empresa: ${user.company_name} (${user.slug})`);
        console.log('');
      });
      console.log('\n🔐 CREDENCIALES PARA LOGIN:');
      console.log('   1. EMPRESA: international-security-investigations-isi');
      console.log(`   2. USUARIO: ${result.rows[0].usuario}`);
      console.log('   3. PASSWORD: (la que hayas configurado, probablemente "123456" o "admin123")');
      console.log('\n🌐 URL CORRECTA:');
      console.log('   http://localhost:9993/panel-empresa.html');
      console.log('   (El servidor está en puerto 9993, NO 9999)\n');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkISICredentials();
