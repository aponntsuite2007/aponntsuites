const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
  host: 'localhost',
  dialect: 'postgresql',
  logging: false
});

async function checkGPS() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL\n');

    const userId = '766de495-e4f3-4e91-a509-1a495c52e15c';

    // Raw query directo
    const [results] = await sequelize.query(`
      SELECT user_id, email, firstname, lastname, gps_enabled, is_active
      FROM users
      WHERE user_id = '${userId}'
    `);

    if (results.length === 0) {
      console.log('❌ Usuario no encontrado');
      await sequelize.close();
      return;
    }

    const user = results[0];

    console.log('📊 DATOS DEL USUARIO (RAW desde PostgreSQL):');
    console.log('================================================');
    console.log(`user_id: ${user.user_id}`);
    console.log(`email: ${user.email}`);
    console.log(`firstname: ${user.firstname}`);
    console.log(`lastname: ${user.lastname}`);
    console.log(`gps_enabled: ${user.gps_enabled}`);
    console.log(`is_active: ${user.is_active}`);
    console.log('================================================\n');

    console.log('🎯 CONCLUSIÓN:');
    if (user.gps_enabled !== undefined && user.gps_enabled !== null) {
      console.log(`✅ gps_enabled existe en BD: ${user.gps_enabled}`);
      console.log(`   allowOutsideRadius debería ser: ${!user.gps_enabled} (inverso)`);
    } else {
      console.log('❌ gps_enabled es NULL o undefined en la BD');
    }

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkGPS();
