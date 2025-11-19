const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function checkDepartments() {
  try {
    console.log('🔍 Verificando departamentos en la base de datos...\n');
    
    const result = await pool.query(`
      SELECT id, name, company_id
      FROM departments
      ORDER BY company_id, id
      LIMIT 20
    `);
    
    console.log(`📊 Total departamentos encontrados: ${result.rows.length}\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ No hay departamentos en la base de datos');
    } else {
      console.log('Departamentos:');
      result.rows.forEach(dept => {
        console.log(`  - ID: ${dept.id}, Nombre: ${dept.name}, Company: ${dept.company_id}`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDepartments();
