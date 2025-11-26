const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function updateUser() {
  try {
    const userId = '0393c9cd-5ae4-410d-a9d9-9446b7f15bd2';
    const departmentId = 9; // Administración Central (company 11)
    
    console.log(`🔧 Actualizando usuario ${userId} para usar department_id: ${departmentId}...\n`);
    
    const result = await pool.query(`
      UPDATE users
      SET department_id = $1
      WHERE user_id = $2
      RETURNING user_id, "firstName", "lastName", department_id
    `, [departmentId, userId]);
    
    if (result.rows.length > 0) {
      console.log('✅ Usuario actualizado correctamente:');
      console.log(`   Nombre: ${result.rows[0].firstName} ${result.rows[0].lastName}`);
      console.log(`   Department ID: ${result.rows[0].department_id}`);
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updateUser();
