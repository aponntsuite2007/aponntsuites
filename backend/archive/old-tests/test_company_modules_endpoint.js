const { sequelize } = require('./src/config/database');

async function testCompanyModulesEndpoint() {
  try {
    console.log('🔍 TESTING ENDPOINT: /api/aponnt/dashboard/companies/11/modules');
    console.log('=' .repeat(80));

    // Simular la consulta exacta que hace el endpoint para ISI
    const [modulesData] = await sequelize.query(`
      SELECT
        sm.id,
        sm.module_key,
        sm.name,
        sm.description,
        sm.icon,
        sm.color,
        CASE
          WHEN cm.id IS NOT NULL AND cm.activo = true THEN true
          ELSE false
        END as is_contracted,
        CASE
          WHEN cm.id IS NOT NULL AND cm.activo = true THEN true
          ELSE false
        END as is_active,
        cm.precio_mensual
      FROM system_modules sm
      LEFT JOIN company_modules cm ON sm.id = cm.system_module_id AND cm.company_id = 11
      ORDER BY sm.name ASC
    `);

    console.log(`\n📦 ENDPOINT DEVUELVE ${modulesData.length} MÓDULOS PARA ISI:`);
    console.log('================================================================================');

    let contractedCount = 0;
    let activeCount = 0;

    modulesData.forEach((mod, index) => {
      const contractedStatus = mod.is_contracted ? '✅ CONTRATADO' : '❌ NO CONTRATADO';
      const activeStatus = mod.is_active ? '🟢 ACTIVO' : '🔴 INACTIVO';

      if (mod.is_contracted) contractedCount++;
      if (mod.is_active) activeCount++;

      console.log(`${(index + 1).toString().padStart(2)}. ${mod.module_key.padEnd(25)} | ${contractedStatus} | ${activeStatus}`);
    });

    console.log('\n📊 RESUMEN ENDPOINT:');
    console.log(`  • Total módulos en sistema: ${modulesData.length}`);
    console.log(`  • Módulos contratados: ${contractedCount}`);
    console.log(`  • Módulos activos: ${activeCount}`);

    // Ahora verificar exactamente qué estructura devuelve el endpoint completo
    console.log('\n🔄 ESTRUCTURA COMPLETA QUE DEVUELVE EL ENDPOINT:');

    const responseStructure = {
      modules: {
        active: modulesData.filter(m => m.is_active).map(m => ({
          moduleKey: m.module_key,
          name: m.name,
          description: m.description,
          icon: m.icon,
          color: m.color
        }))
      }
    };

    console.log('Active modules array:');
    responseStructure.modules.active.forEach((mod, index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. moduleKey: "${mod.moduleKey}"`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testCompanyModulesEndpoint();