const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'attendance_system',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  port: process.env.POSTGRES_PORT || 5432,
});

async function resetISIPassword() {
  try {
    // 1. Obtener usuario admin de ISI
    const userResult = await pool.query(`
      SELECT u.user_id, u.usuario, u."firstName", u."lastName", c.name as company_name, c.slug
      FROM users u
      JOIN companies c ON u.company_id = c.company_id
      WHERE c.company_id = 11 AND u.role = 'admin'
    `);

    if (userResult.rows.length === 0) {
      console.log('❌ No se encontró usuario admin para ISI');
      await pool.end();
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ Usuario encontrado:');
    console.log('   Usuario:', user.usuario);
    console.log('   Nombre:', user.firstName, user.lastName);
    console.log('   Empresa:', user.company_name);

    // 2. Resetear contraseña a "admin123"
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(`
      UPDATE users
      SET password = $1, "updatedAt" = NOW()
      WHERE user_id = $2
    `, [hashedPassword, user.user_id]);

    console.log('\n✅ Contraseña reseteada exitosamente!');
    console.log('\n🔐 CREDENCIALES PARA LOGIN:');
    console.log('   1. EMPRESA: isi');
    console.log(`   2. USUARIO: ${user.usuario}`);
    console.log('   3. PASSWORD: admin123');
    console.log('\n🌐 URL:');
    console.log('   http://localhost:9993/panel-empresa.html');
    console.log('\n⚠️  IMPORTANTE: El servidor está en puerto 9993, no 9999\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await pool.end();
  }
}

resetISIPassword();
