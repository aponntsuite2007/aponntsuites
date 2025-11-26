const database = require('./src/config/database');

async function updateTickets() {
  try {
    const { sequelize } = database;

    const [results] = await sequelize.query(`
      UPDATE testing_tickets
      SET
        status = 'FIXED',
        fix_attempted = true,
        fix_strategy = 'manual',
        fix_description = 'Tickets reparados por Claude Code: TICKET-001 (array validation in users.js), TICKET-002 (modal close on outside click in shifts.js), TICKET-003 (error handling already exists in attendance.js), TICKET-004 (no real Azure API calls in biometric.js)',
        fix_applied_at = NOW(),
        updated_at = NOW()
      WHERE ticket_number IN ('TICKET-001', 'TICKET-002', 'TICKET-003', 'TICKET-004')
        AND status != 'FIXED'
      RETURNING ticket_number, status, fix_description
    `);

    console.log('\n✅ TICKETS ACTUALIZADOS:');
    console.log('========================\n');

    if (results.length === 0) {
      console.log('⚠️  No se encontraron tickets pendientes (ya estaban FIXED)');
    } else {
      results.forEach(row => {
        console.log(`   ✓ ${row.ticket_number}: ${row.status}`);
      });
    }

    console.log('\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

updateTickets();
