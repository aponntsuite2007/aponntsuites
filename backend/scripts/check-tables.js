const { Client } = require('pg');
require('dotenv').config();

async function checkTables() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    console.log('📊 Primeras 5 columnas de USERS:');
    const usersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
      LIMIT 5
    `);
    console.table(usersColumns.rows);

    console.log('\n📊 Primeras 5 columnas de COMPANIES:');
    const companiesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
      LIMIT 5
    `);
    console.table(companiesColumns.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();
