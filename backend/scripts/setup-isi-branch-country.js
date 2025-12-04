require('dotenv').config();
const db = require('../src/config/database');

async function setup() {
  try {
    console.log('🔧 Configurando sucursal CENTRAL de ISI con país Argentina...\n');

    // Actualizar sucursal CENTRAL de company_id=11 (ISI) con país AR
    const [result] = await db.sequelize.query(`
      UPDATE branches
      SET country = 'AR',
          state_province = 'Buenos Aires',
          city = 'Buenos Aires'
      WHERE company_id = 11 AND name = 'CENTRAL'
      RETURNING id, name, country, state_province, city;
    `);

    if (result.length > 0) {
      console.log('✅ Sucursal actualizada:');
      console.log('   ID:', result[0].id);
      console.log('   Nombre:', result[0].name);
      console.log('   País:', result[0].country);
      console.log('   Provincia:', result[0].state_province);
      console.log('   Ciudad:', result[0].city);

      // Ahora obtener ID de la sucursal para asignar a los turnos
      const branchId = result[0].id;

      // Actualizar turnos de ISI para que usen esta sucursal
      const [shifts] = await db.sequelize.query(`
        UPDATE shifts
        SET branch_id = '${branchId}',
            respect_national_holidays = true
        WHERE company_id = 11
        RETURNING id, name, branch_id, respect_national_holidays;
      `);

      console.log('\n✅ Turnos actualizados con sucursal y feriados nacionales:');
      shifts.forEach(s => {
        console.log(`   - ${s.name}: branch_id=${s.branch_id}, feriados_nacionales=${s.respect_national_holidays}`);
      });

    } else {
      console.log('⚠️ No se encontró la sucursal CENTRAL para company_id=11');
    }

    console.log('\n🎉 Configuración completada!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}
setup();
