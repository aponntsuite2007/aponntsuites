const { sequelize } = require('./src/config/database');

async function checkISIModulesReal() {
  try {
    console.log('🔍 VERIFICACIÓN REAL DE MÓDULOS ISI (Empresa ID: 11)');
    console.log('=' .repeat(80));

    // Consultar módulos EXACTOS que tiene ISI contratados
    const [isiModules] = await sequelize.query(`
      SELECT
        cm.id,
        cm.company_id,
        cm.system_module_id,
        sm.module_key,
        sm.name,
        cm.activo,
        cm.precio_mensual,
        cm.fecha_asignacion
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = 11
      ORDER BY sm.module_key ASC
    `);

    console.log(`\n📦 ISI TIENE ${isiModules.length} MÓDULOS EN LA BASE DE DATOS:`);
    console.log('================================================================================');

    let activosCount = 0;
    isiModules.forEach((mod, index) => {
      const status = mod.activo ? '✅ ACTIVO' : '❌ INACTIVO';
      if (mod.activo) activosCount++;
      console.log(`${(index + 1).toString().padStart(2)}. ${mod.module_key.padEnd(25)} | ${mod.name.padEnd(30)} | ${status}`);
    });

    console.log('\n📊 RESUMEN:');
    console.log(`  • Total módulos contratados: ${isiModules.length}`);
    console.log(`  • Módulos activos: ${activosCount}`);
    console.log(`  • Módulos inactivos: ${isiModules.length - activosCount}`);

    // Verificar qué endpoint está usando el panel-empresa
    console.log('\n🌐 VERIFICANDO ENDPOINT QUE USA PANEL-EMPRESA:');
    console.log('Endpoint: GET /api/aponnt/dashboard/companies/11/modules');

    const [apiResponse] = await sequelize.query(`
      SELECT
        COUNT(CASE WHEN cm.activo = true THEN 1 END) as contractedModules,
        COUNT(sm.id) as totalSystemModules,
        COUNT(CASE WHEN cm.activo = true THEN 1 END) as activeModules,
        COUNT(CASE WHEN cm.activo = false THEN 1 END) as inactiveModules,
        COALESCE(SUM(CASE WHEN cm.activo = true THEN cm.precio_mensual ELSE 0 END), 0) as monthlyTotal
      FROM system_modules sm
      LEFT JOIN company_modules cm ON sm.id = cm.system_module_id AND cm.company_id = 11
    `);

    console.log('\n🔄 RESPUESTA DEL API (lo que ve panel-empresa):');
    console.log(JSON.stringify(apiResponse[0], null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkISIModulesReal();