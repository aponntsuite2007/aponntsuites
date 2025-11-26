const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'attendance_system',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  port: process.env.POSTGRES_PORT || 5432,
});

async function listCompanies() {
  try {
    const result = await pool.query(`
      SELECT company_id, name, slug, contact_email, is_active
      FROM companies
      ORDER BY company_id
    `);

    console.log('\n📋 EMPRESAS EN LA BASE DE DATOS:\n');

    if (result.rows.length === 0) {
      console.log('❌ No hay empresas en la base de datos');
    } else {
      result.rows.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}`);
        console.log(`   ID: ${company.company_id}`);
        console.log(`   Slug: ${company.slug}`);
        console.log(`   Email: ${company.contact_email || 'N/A'}`);
        console.log(`   Activa: ${company.is_active ? '✅' : '❌'}`);
        console.log('');
      });
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

listCompanies();
