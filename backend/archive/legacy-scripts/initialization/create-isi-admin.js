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

async function createISIAdmin() {
  try {
    // 1. Verificar que ISI existe
    const companyResult = await pool.query(`
      SELECT company_id, name, slug FROM companies
      WHERE slug = 'isi' OR company_id = 11
    `);

    if (companyResult.rows.length === 0) {
      console.log('❌ La empresa ISI no existe en la base de datos');
      console.log('   Slug esperado: isi');
      await pool.end();
      return;
    }

    const company = companyResult.rows[0];
    console.log('✅ Empresa encontrada:', company.name);
    console.log('   Company ID:', company.company_id);
    console.log('   Slug:', company.slug);

    // 2. Verificar si ya existe un usuario admin para ISI
    const existingUser = await pool.query(`
      SELECT user_id, usuario FROM users
      WHERE company_id = $1 AND role = 'admin'
    `, [company.company_id]);

    if (existingUser.rows.length > 0) {
      console.log('\n⚠️  Ya existe un usuario admin para ISI:');
      console.log('   Usuario:', existingUser.rows[0].usuario);
      console.log('   User ID:', existingUser.rows[0].user_id);
      console.log('\n🔐 CREDENCIALES PARA LOGIN:');
      console.log('   1. EMPRESA: isi');
      console.log(`   2. USUARIO: ${existingUser.rows[0].usuario}`);
      console.log('   3. PASSWORD: (usa la contraseña que configuraste)');
      console.log('\n🌐 URL:');
      console.log('   http://localhost:9993/panel-empresa.html\n');
      await pool.end();
      return;
    }

    // 3. Crear nuevo usuario admin para ISI
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await pool.query(`
      INSERT INTO users (
        usuario, password, "firstName", "lastName", email, role,
        company_id, "isActive", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      ) RETURNING user_id, usuario
    `, [
      'admin-isi',
      hashedPassword,
      'Administrador',
      'ISI',
      'admin@isi.com',
      'admin',
      company.company_id,
      true
    ]);

    const newUser = insertResult.rows[0];

    console.log('\n✅ Usuario admin creado exitosamente para ISI:');
    console.log('   User ID:', newUser.user_id);
    console.log('   Usuario:', newUser.usuario);
    console.log('\n🔐 CREDENCIALES PARA LOGIN:');
    console.log('   1. EMPRESA: international-security-investigations-isi');
    console.log('   2. USUARIO: admin-isi');
    console.log('   3. PASSWORD: admin123');
    console.log('\n🌐 URL:');
    console.log('   http://localhost:9993/panel-empresa.html\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await pool.end();
  }
}

createISIAdmin();
