require('dotenv').config();
const database = require('./src/config/database');

(async () => {
  try {
    await database.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    // Verificar si hay datos de asistencia
    const [attendance] = await database.sequelize.query(`
      SELECT COUNT(*) as total,
             MAX(created_at) as ultima_creacion
      FROM attendance
      WHERE company_id = 11
    `);

    console.log('📊 DATOS DE ASISTENCIA (company_id: 11)');
    console.log('   Total registros:', attendance[0].total);
    console.log('   Última creación:', attendance[0].ultima_creacion || 'N/A');
    console.log('');

    // Ver últimos 10 registros
    const [recent] = await database.sequelize.query(`
      SELECT id, user_id, checkin_time, checkout_time,
             TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
      FROM attendance
      WHERE company_id = 11
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (recent.length > 0) {
      console.log('📋 ÚLTIMOS 10 REGISTROS:');
      recent.forEach((r, i) => {
        console.log(`   ${i+1}. ID: ${r.id} | User: ${r.user_id} | CheckIn: ${r.checkin_time} | Created: ${r.created}`);
      });
    } else {
      console.log('⚠️  No hay registros de asistencia para company_id 11');
    }

    await database.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
