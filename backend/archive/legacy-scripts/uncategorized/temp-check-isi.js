const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkISI() {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.username, u.role, u.company_id, c.slug
      FROM users u
      JOIN companies c ON u.company_id = c.id
      WHERE c.slug = 'isi'
      ORDER BY u.user_id
    `);

    console.log('Usuarios ISI:', JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkISI();
