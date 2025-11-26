const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function checkCompanyIds() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // Verificar usuarios y sus company_id
    console.log('📊 VERIFICANDO COMPANY_ID EN TABLA USERS:');
    console.log('='.repeat(70));

    const query = `
      SELECT
        user_id,
        "firstName",
        "lastName",
        legajo,
        company_id,
        "createdAt"
      FROM users
      ORDER BY "createdAt" DESC
      LIMIT 20;
    `;

    const result = await client.query(query);

    result.rows.forEach(row => {
      console.log(`\nID: ${row.user_id}`);
      console.log(`  Nombre: ${row.firstName} ${row.lastName}`);
      console.log(`  Legajo: ${row.legajo || 'NULL'}`);
      console.log(`  Company ID: ${row.company_id || 'NULL'} ${row.company_id ? '✅' : '❌'}`);
      console.log(`  Creado: ${row.createdAt}`);
    });

    // Contar por company_id
    console.log('\n' + '='.repeat(70));
    console.log('📊 DISTRIBUCIÓN POR COMPANY_ID:\n');

    const distribution = await client.query(`
      SELECT
        company_id,
        COUNT(*) as total
      FROM users
      GROUP BY company_id
      ORDER BY company_id;
    `);

    distribution.rows.forEach(row => {
      console.log(`Company ID ${row.company_id || 'NULL'}: ${row.total} usuarios`);
    });

    // Verificar admin de company 11
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ADMIN DE COMPANY 11:\n');

    const admin = await client.query(`
      SELECT user_id, usuario, "firstName", "lastName", company_id, role
      FROM users
      WHERE usuario = 'admin' OR email LIKE '%admin%'
      LIMIT 5;
    `);

    admin.rows.forEach(row => {
      console.log(`Usuario: ${row.usuario || row.firstName}`);
      console.log(`  Company ID: ${row.company_id || 'NULL'}`);
      console.log(`  Rol: ${row.role}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkCompanyIds();
