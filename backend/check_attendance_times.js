const { sequelize } = require('./src/config/database-postgresql');
const { QueryTypes } = require('sequelize');

async function checkAttendanceTimes() {
  try {
    console.log('🔍 Verificando registros de asistencia...\n');

    // Consultar todos los registros recientes
    const records = await sequelize.query(`
      SELECT
        id,
        "UserId",
        "checkInTime",
        "checkOutTime",
        CASE
          WHEN "checkOutTime" IS NOT NULL THEN
            EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime"))
          ELSE NULL
        END as seconds_diff
      FROM attendances
      ORDER BY "checkInTime" DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT });

    console.log(`📋 Últimos ${records.length} registros:\n`);
    records.forEach(r => {
      const checkIn = new Date(r.checkInTime).toLocaleString('es-ES');
      const checkOut = r.checkOutTime ? new Date(r.checkOutTime).toLocaleString('es-ES') : 'SIN SALIDA';
      const diff = r.seconds_diff !== null ? `${Math.round(r.seconds_diff)}s` : 'N/A';

      console.log(`ID: ${r.id}`);
      console.log(`  Entrada:  ${checkIn}`);
      console.log(`  Salida:   ${checkOut}`);
      console.log(`  Diferencia: ${diff}\n`);
    });

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAttendanceTimes();
