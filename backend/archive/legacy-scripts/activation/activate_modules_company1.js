const { sequelize } = require('./src/config/database');

async function activateModulesCompany1() {
  try {
    console.log('🔄 ACTIVANDO MÓDULOS PARA COMPANY_ID=1...');

    // Activar todos los módulos de company_id=1
    const [result] = await sequelize.query(`
      UPDATE company_modules
      SET activo = true
      WHERE company_id = 1 AND activo = false
    `);

    console.log('✅ Módulos activados para company_id=1');

    // Verificar resultado
    const [activeModules] = await sequelize.query(`
      SELECT cm.id, cm.activo, sm.module_key, sm.name
      FROM company_modules cm
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = 1
      ORDER BY sm.name
    `);

    console.log('\n📦 MÓDULOS ACTIVOS PARA COMPANY_ID=1:');
    activeModules.forEach(m => console.log('  -', m.module_key, '|', m.name, '| Activo:', m.activo));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

activateModulesCompany1();