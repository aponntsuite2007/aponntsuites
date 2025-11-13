const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'attendance_system',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  port: process.env.POSTGRES_PORT || 5432,
});

async function checkCompaniesColumn() {
  try {
    console.log('🔍 Verificando columna active en tabla companies...\n');

    // Check all columns with 'active' in the name
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'companies'
      AND column_name LIKE '%active%'
      ORDER BY column_name
    `);

    if (result.rows.length === 0) {
      console.log('❌ No se encontró ninguna columna con "active" en el nombre');
    } else {
      console.log('✅ Columnas encontradas:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    }

    console.log('\n📋 Todas las columnas de companies:');
    const allColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `);

    allColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    // Test actual query to see what works
    console.log('\n🧪 Probando query con is_active:');
    try {
      const test1 = await pool.query('SELECT company_id, name FROM companies WHERE is_active = true LIMIT 1');
      console.log(`   ✅ is_active FUNCIONA - Empresas encontradas: ${test1.rows.length}`);
    } catch (err) {
      console.log(`   ❌ is_active NO FUNCIONA: ${err.message}`);
    }

    console.log('\n🧪 Probando query con "isActive":');
    try {
      const test2 = await pool.query('SELECT company_id, name FROM companies WHERE "isActive" = true LIMIT 1');
      console.log(`   ✅ "isActive" FUNCIONA - Empresas encontradas: ${test2.rows.length}`);
    } catch (err) {
      console.log(`   ❌ "isActive" NO FUNCIONA: ${err.message}`);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkCompaniesColumn();
