/**
 * Verificar kioscos por empresa
 */

const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function checkKiosks() {
  console.log('🔧 Conectando a PostgreSQL...\n');

  try {
    await sequelize.authenticate();

    // Contar kioscos por empresa
    const [kiosks] = await sequelize.query(`
      SELECT
        k.company_id,
        COUNT(k.id) as total_kiosks,
        COUNT(CASE WHEN k.is_active = true THEN 1 END) as kiosks_activos,
        COUNT(CASE WHEN k.is_active = false THEN 1 END) as kiosks_disponibles
      FROM kiosks k
      GROUP BY k.company_id
      ORDER BY k.company_id
    `);

    console.log('📋 Kioscos por Empresa:\n');
    console.table(kiosks);

    // Mostrar detalle de empresa ISI (company_id = 1)
    console.log('\n📋 Detalle de Kioscos de ISI (company_id = 1):\n');
    const [isiKiosks] = await sequelize.query(`
      SELECT id, name, location, device_id, is_active, is_configured, company_id
      FROM kiosks
      WHERE company_id = 1
      ORDER BY name
    `);
    console.table(isiKiosks);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkKiosks();
