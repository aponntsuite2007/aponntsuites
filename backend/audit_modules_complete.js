const { sequelize } = require('./src/config/database');

async function auditModulesComplete() {
  try {
    console.log('🔍 AUDITORÍA COMPLETA DE MÓDULOS - CONSISTENCIA TOTAL');
    console.log('=' .repeat(80));

    // 1. MAPEAR TODOS LOS MÓDULOS EN BD
    console.log('\n📋 1. MÓDULOS EN BASE DE DATOS (system_modules):');
    const [systemModules] = await sequelize.query(`
      SELECT id, module_key, name, description, icon, color, category, is_active
      FROM system_modules
      ORDER BY module_key
    `);

    systemModules.forEach((m, i) => {
      console.log(`  ${i+1}. ${m.module_key} | "${m.name}" | Cat: ${m.category} | Activo: ${m.is_active}`);
    });

    // 2. VERIFICAR MÓDULOS ASIGNADOS A ISI
    console.log('\n🏢 2. MÓDULOS ASIGNADOS A ISI (company_modules):');
    const [isiModules] = await sequelize.query(`
      SELECT cm.id, sm.module_key, sm.name, cm.activo, cm.precio_mensual
      FROM company_modules cm
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = 11
      ORDER BY sm.module_key
    `);

    isiModules.forEach((m, i) => {
      console.log(`  ${i+1}. ${m.module_key} | "${m.name}" | Activo: ${m.activo} | Precio: $${m.precio_mensual}`);
    });

    // 3. IDENTIFICAR MÓDULOS NO ASIGNADOS A ISI
    console.log('\n❌ 3. MÓDULOS NO ASIGNADOS A ISI:');
    const assignedKeys = isiModules.map(m => m.module_key);
    const notAssigned = systemModules.filter(m => !assignedKeys.includes(m.module_key));

    if (notAssigned.length === 0) {
      console.log('  ✅ Todos los módulos están asignados a ISI');
    } else {
      notAssigned.forEach((m, i) => {
        console.log(`  ${i+1}. ${m.module_key} | "${m.name}" | Categoría: ${m.category}`);
      });
    }

    // 4. RESUMEN ESTADÍSTICO
    console.log('\n📊 4. RESUMEN ESTADÍSTICO:');
    console.log(`  - Total módulos en system_modules: ${systemModules.length}`);
    console.log(`  - Módulos asignados a ISI: ${isiModules.length}`);
    console.log(`  - Módulos activos en ISI: ${isiModules.filter(m => m.activo).length}`);
    console.log(`  - Módulos no asignados a ISI: ${notAssigned.length}`);

    // 5. GENERAR LISTA PARA VERIFICAR EN FRONTENDS
    console.log('\n📝 5. LISTA DE VERIFICACIÓN PARA FRONTENDS:');
    console.log('   Verificar que estos module_key aparezcan en panel-admin y panel-empresa:');
    systemModules.forEach((m, i) => {
      const assigned = isiModules.find(im => im.module_key === m.module_key);
      const status = assigned ? (assigned.activo ? '🟢 ACTIVO' : '🟡 INACTIVO') : '🔴 NO ASIGNADO';
      console.log(`     ${m.module_key} → "${m.name}" → ${status}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en auditoría:', error.message);
    process.exit(1);
  }
}

auditModulesComplete();