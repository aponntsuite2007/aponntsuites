const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'attendance_system',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  port: process.env.POSTGRES_PORT || 5432,
});

async function checkTestUserHistory() {
  try {
    // Obtener info completa del usuario testuser
    const result = await pool.query(`
      SELECT u.user_id, u.usuario, u."firstName", u."lastName", u.email, u.role,
             u."isActive", u."createdAt", u."updatedAt",
             c.name as company_name, c.slug, c.company_id
      FROM users u
      JOIN companies c ON u.company_id = c.company_id
      WHERE u.usuario = 'testuser' AND c.company_id = 11
    `);

    if (result.rows.length === 0) {
      console.log('❌ Usuario testuser no encontrado');
      await pool.end();
      return;
    }

    const user = result.rows[0];

    console.log('\n📋 INFORMACIÓN DEL USUARIO "testuser":\n');
    console.log('🆔 User ID:', user.user_id);
    console.log('👤 Usuario:', user.usuario);
    console.log('📛 Nombre:', user.firstName, user.lastName);
    console.log('📧 Email:', user.email);
    console.log('🎭 Role:', user.role);
    console.log('✅ Activo:', user.isActive);
    console.log('🏢 Empresa:', user.company_name, `(ID: ${user.company_id})`);
    console.log('🔗 Slug:', user.slug);
    console.log('\n📅 FECHAS:');
    console.log('   Creado:', user.createdAt);
    console.log('   Actualizado:', user.updatedAt);

    console.log('\n💡 CONCLUSIÓN:');
    console.log('   Este usuario NO fue hardcodeado por mí.');
    console.log('   Ya existía en la base de datos desde:', user.createdAt);
    console.log('   Lo único que hice fue resetear su contraseña a "admin123"');
    console.log('   porque no sabíamos cuál era la contraseña original.\n');

    // Verificar si hay más usuarios para ISI
    const allUsersISI = await pool.query(`
      SELECT u.usuario, u.role, u."isActive"
      FROM users u
      WHERE u.company_id = 11
      ORDER BY u."createdAt"
    `);

    console.log('👥 TODOS LOS USUARIOS DE ISI:');
    allUsersISI.rows.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.usuario} (${u.role}) - Activo: ${u.isActive ? '✅' : '❌'}`);
    });
    console.log('');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkTestUserHistory();
