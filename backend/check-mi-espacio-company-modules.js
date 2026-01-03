/**
 * Verificar si mi-espacio y notification-center están asignados a ISI
 */
const database = require('./src/config/database');

(async () => {
  try {
    const { sequelize } = database;

    console.log('\n🔍 VERIFICANDO ASIGNACIÓN DE MÓDULOS A ISI (company_id=11)\n');
    console.log('='.repeat(80) + '\n');

    // 1. Verificar si los módulos existen en system_modules
    const [systemModules] = await sequelize.query(`
      SELECT id, module_key, name
      FROM system_modules
      WHERE module_key IN ('mi-espacio', 'notification-center', 'inbox')
      ORDER BY module_key
    `);

    console.log('📦 MÓDULOS EN SYSTEM_MODULES:\n');
    systemModules.forEach(m => {
      console.log(`  ✓ ${m.module_key} (id: ${m.id})`);
      console.log(`    Nombre: ${m.name}`);
    });

    // 2. Verificar si están asignados a ISI en company_modules
    const [companyModules] = await sequelize.query(`
      SELECT
        cm.id as company_module_id,
        cm.activo,
        cm.is_active,
        sm.module_key,
        sm.name
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = 11
        AND sm.module_key IN ('mi-espacio', 'notification-center', 'inbox')
      ORDER BY sm.module_key
    `);

    console.log('\n='.repeat(80));
    console.log('\n📋 ASIGNACIÓN EN COMPANY_MODULES (ISI):\n');

    if (companyModules.length === 0) {
      console.log('  ❌ NINGUNO de estos módulos está asignado a ISI\n');
      console.log('  ⚠️  Esto explica por qué no aparecen en el API');
      console.log('  ⚠️  Necesitan ser agregados a company_modules para que ISI pueda usarlos');
    } else {
      companyModules.forEach(m => {
        console.log(`  ${m.activo || m.is_active ? '✅' : '❌'} ${m.module_key}`);
        console.log(`    ID: ${m.company_module_id}`);
        console.log(`    Activo: ${m.activo || m.is_active}`);
      });
    }

    // 3. Ofrecer solución
    console.log('\n='.repeat(80));
    console.log('\n🔧 SOLUCIÓN:\n');

    const missingModules = systemModules.filter(sm =>
      !companyModules.find(cm => cm.module_key === sm.module_key)
    );

    if (missingModules.length > 0) {
      console.log('Módulos que faltan asignar a ISI:');
      missingModules.forEach(m => {
        console.log(`  - ${m.module_key} (${m.name})`);
      });

      console.log('\nEjecutar el siguiente SQL para asignarlos:\n');
      missingModules.forEach(m => {
        console.log(`INSERT INTO company_modules (company_id, system_module_id, activo, is_active)`);
        console.log(`SELECT 11, id, true, true FROM system_modules WHERE module_key = '${m.module_key}';`);
        console.log('');
      });
    } else {
      console.log('✅ Todos los módulos ya están asignados a ISI');
    }

    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
