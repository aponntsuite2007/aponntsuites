const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function updateTickets() {
  try {
    const result = await pool.query(`
      UPDATE testing_tickets
      SET
        status = 'FIXED',
        fix_attempted = true,
        fix_strategy = 'manual',
        fix_description = 'Tickets reparados por Claude Code: TICKET-001 (array validation), TICKET-002 (modal close), TICKET-003 (error handling exists), TICKET-004 (no Azure API calls)',
        fix_applied_at = NOW(),
        updated_at = NOW()
      WHERE ticket_number IN ('TICKET-001', 'TICKET-002', 'TICKET-003', 'TICKET-004')
      RETURNING ticket_number, status, fix_description
    `);

    console.log('✅ Tickets actualizados:');
    result.rows.forEach(row => {
      console.log(`   ${row.ticket_number}: ${row.status}`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updateTickets();
