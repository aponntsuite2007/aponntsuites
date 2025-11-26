const { sequelize } = require('./src/config/database');

async function assignMissingModulesISI() {
  try {
    console.log('📦 ASIGNANDO MÓDULOS FALTANTES A ISI...');

    // Obtener IDs de los módulos faltantes
    const [missingModules] = await sequelize.query(`
      SELECT id, module_key, name FROM system_modules
      WHERE module_key IN ('biometric', 'reports')
    `);

    console.log('\nMódulos a asignar:');
    missingModules.forEach(m => console.log(`  - ${m.module_key} | "${m.name}"`));

    // Asignar cada módulo a ISI
    for (const module of missingModules) {
      await sequelize.query(`
        INSERT INTO company_modules (company_id, system_module_id, precio_mensual, activo, fecha_asignacion, created_at, updated_at)
        VALUES (11, '${module.id}', 15.00, true, NOW(), NOW(), NOW())
        ON CONFLICT (company_id, system_module_id) DO UPDATE SET activo = true
      `);
      console.log(`  ✅ ${module.module_key} asignado a ISI`);
    }

    // Verificar resultado final
    const [finalCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM company_modules
      WHERE company_id = 11 AND activo = true
    `);

    console.log(`\n🎯 RESULTADO: ISI tiene ${finalCount[0].total} módulos activos`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignMissingModulesISI();