const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function testUserFields() {
  try {
    console.log('🔍 Testeando campos de usuario real...\n');

    const [users] = await sequelize.query(`
      SELECT
        user_id,
        email,
        "firstName",
        "lastName",
        can_use_mobile_app,
        can_use_kiosk,
        can_use_all_kiosks,
        authorized_kiosks,
        has_flexible_schedule,
        flexible_schedule_notes,
        can_authorize_late_arrivals,
        authorized_departments
      FROM users
      WHERE company_id = 11
      LIMIT 3
    `);

    console.log(`✅ Encontrados ${users.length} usuarios:\n`);
    users.forEach((user, idx) => {
      console.log(`Usuario ${idx + 1}:`);
      console.log(`  user_id: ${user.user_id}`);
      console.log(`  email: ${user.email}`);
      console.log(`  can_use_mobile_app: ${user.can_use_mobile_app}`);
      console.log(`  can_use_kiosk: ${user.can_use_kiosk}`);
      console.log(`  can_use_all_kiosks: ${user.can_use_all_kiosks}`);
      console.log(`  has_flexible_schedule: ${user.has_flexible_schedule}`);
      console.log(`  can_authorize_late_arrivals: ${user.can_authorize_late_arrivals}`);
      console.log('---');
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testUserFields();
