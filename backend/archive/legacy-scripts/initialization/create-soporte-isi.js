const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createSoporteUser() {
  await client.connect();
  
  try {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const result = await client.query(`
      INSERT INTO users (
        "employeeId",
        "usuario",
        "firstName",
        "lastName",
        email,
        password,
        role,
        company_id,
        is_active
      ) VALUES (
        'SUPPORT-011',
        'soporte',
        'Soporte',
        'Técnico Sistema',
        'soporte11@sistema.local',
        $1,
        'admin',
        11,
        true
      )
      RETURNING user_id, "usuario", "firstName", "lastName", email
    `, [hashedPassword]);
    
    console.log('✅ Usuario soporte creado para ISI:');
    console.log(result.rows[0]);
    
  } catch (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      console.log('⚠️  Usuario soporte ya existe para ISI');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await client.end();
  }
}

createSoporteUser();
