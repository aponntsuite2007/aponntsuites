const { sequelize } = require('./src/config/database-postgresql');
const { QueryTypes } = require('sequelize');

async function fixAttendanceData() {
  try {
    console.log('🔧 Limpiando datos incorrectos de asistencia...\n');

    // 1. Mostrar registros problemáticos
    const problematicRecords = await sequelize.query(`
      SELECT id, "UserId", "checkInTime", "checkOutTime",
             EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime")) as seconds_diff
      FROM attendances
      WHERE "checkOutTime" IS NOT NULL
        AND EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime")) < 30
      ORDER BY "checkInTime" DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT });

    console.log(`📋 Encontrados ${problematicRecords.length} registros con salida < 30 segundos después de entrada:`);
    problematicRecords.forEach(r => {
      console.log(`  - ID: ${r.id} | Diferencia: ${Math.round(r.seconds_diff)}s`);
    });

    // 2. Limpiar checkOutTime de registros incorrectos
    const [updateResult] = await sequelize.query(`
      UPDATE attendances
      SET "checkOutTime" = NULL,
          "checkOutMethod" = NULL,
          "updatedAt" = NOW()
      WHERE "checkOutTime" IS NOT NULL
        AND EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime")) < 30
    `, { type: QueryTypes.UPDATE });

    console.log(`\n✅ Limpiados ${updateResult} registros incorrectos`);

    // 3. Verificar estado final
    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        COUNT("checkOutTime") as con_salida,
        COUNT(*) - COUNT("checkOutTime") as sin_salida
      FROM attendances
    `, { type: QueryTypes.SELECT });

    console.log('\n📊 Estado final:');
    console.log(`  - Total registros: ${stats.total}`);
    console.log(`  - Con salida: ${stats.con_salida}`);
    console.log(`  - Sin salida (solo entrada): ${stats.sin_salida}`);

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAttendanceData();
