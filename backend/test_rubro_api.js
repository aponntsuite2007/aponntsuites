const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'attendance_system',
  password: 'Aedr15150302',
  port: 5432,
});

async function testRubroApi() {
  const client = await pool.connect();
  try {
    console.log('🧪 Testing API query con rubro...');

    // Misma query que usa la API
    const query = `
      SELECT
        id,
        module_key,
        name,
        description,
        icon,
        color,
        category,
        base_price,
        is_active,
        is_core,
        display_order,
        features,
        requirements,
        version,
        rubro
      FROM system_modules
      ORDER BY rubro ASC, name ASC
    `;

    const result = await client.query(query);

    console.log(`✅ Query exitoso. ${result.rows.length} módulos encontrados`);
    console.log('\n📋 Primeros 3 módulos con rubro:');

    result.rows.slice(0, 3).forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} [${row.rubro}] - ${row.module_key}`);
    });

    console.log('\n🎯 Verificando agrupación por rubro:');
    const rubroGroups = {};
    result.rows.forEach(row => {
      if (!rubroGroups[row.rubro]) {
        rubroGroups[row.rubro] = 0;
      }
      rubroGroups[row.rubro]++;
    });

    Object.keys(rubroGroups).forEach(rubro => {
      console.log(`  ${rubro}: ${rubroGroups[rubro]} módulos`);
    });

  } catch (error) {
    console.error('❌ Error en test:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testRubroApi();