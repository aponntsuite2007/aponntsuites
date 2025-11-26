const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function checkColumns() {
  try {
    console.log('🔍 Verificando columnas de la tabla users...\n');

    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN (
          'can_use_mobile_app', 'canUseMobileApp',
          'can_use_kiosk', 'canUseKiosk',
          'can_use_all_kiosks', 'canUseAllKiosks',
          'authorized_kiosks', 'authorizedKiosks',
          'has_flexible_schedule', 'hasFlexibleSchedule',
          'flexible_schedule_notes', 'flexibleScheduleNotes',
          'can_authorize_late_arrivals', 'canAuthorizeLateArrivals',
          'authorized_departments', 'authorizedDepartments'
        )
      ORDER BY column_name
    `);

    if (columns.length === 0) {
      console.log('❌ NO se encontraron las columnas nuevas en la tabla users');
      console.log('⚠️ Las columnas deben ser agregadas a la tabla\n');
    } else {
      console.log(`✅ Encontradas ${columns.length} columnas:\n`);
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
