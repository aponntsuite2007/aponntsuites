/**
 * VERIFY ISI MODULES - Verificar módulos problemáticos en company_modules
 */
const database = require('./src/config/database');

(async () => {
  try {
    const { CompanyModule, SystemModule, sequelize } = database;

    console.log('\n🔍 VERIFICANDO MÓDULOS PROBLEMÁTICOS EN ISI (company_id=11)\n');
    console.log('='.repeat(80));

    // 1. Buscar en company_modules
    const [companyModules] = await sequelize.query(`
      SELECT module_key, activo, contracted, id
      FROM company_modules
      WHERE company_id = 11
      ORDER BY module_key
    `);

    console.log('\n📋 Total módulos en company_modules para ISI:', companyModules.length);

    const problematic = ['departments', 'shifts', 'roles-permissions', 'dashboard'];
    const foundProblematic = companyModules.filter(cm =>
      problematic.includes(cm.module_key)
    );

    if (foundProblematic.length > 0) {
      console.log('\n❌ ❌ ❌ PROBLEMA ENCONTRADO ❌ ❌ ❌\n');
      console.log('Los siguientes módulos ESTÁN en company_modules:\n');
      foundProblematic.forEach(cm => {
        console.log(`  ❌ ${cm.module_key}`);
        console.log(`     - activo: ${cm.activo}`);
        console.log(`     - contracted: ${cm.contracted}`);
        console.log(`     - id: ${cm.id}`);
        console.log('');
      });

      console.log('\n🔧 EJECUTANDO LIMPIEZA AUTOMÁTICA...\n');

      const [result] = await sequelize.query(`
        DELETE FROM company_modules
        WHERE company_id = 11
        AND module_key IN ('departments', 'shifts', 'roles-permissions', 'dashboard')
        RETURNING module_key
      `);

      console.log(`✅ Eliminados ${result.length} módulos problemáticos de company_modules`);
      result.forEach(r => console.log(`   - ${r.module_key}`));

    } else {
      console.log('\n✅ OK - NO hay módulos problemáticos en company_modules');
    }

    // 2. Verificar companies.active_modules
    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 VERIFICANDO companies.active_modules:\n');

    const [companies] = await sequelize.query(`
      SELECT company_id, name, active_modules
      FROM companies
      WHERE company_id = 11
    `);

    if (companies.length > 0) {
      const isi = companies[0];
      const activeModules = isi.active_modules || {};

      const foundInActive = problematic.filter(key => activeModules[key] === true);

      if (foundInActive.length > 0) {
        console.log('❌ Módulos problemáticos en active_modules JSONB:\n');
        foundInActive.forEach(key => {
          console.log(`  ❌ ${key}: ${activeModules[key]}`);
        });

        console.log('\n🔧 LIMPIANDO active_modules...\n');

        // Eliminar las keys problemáticas
        foundInActive.forEach(key => delete activeModules[key]);

        await sequelize.query(`
          UPDATE companies
          SET active_modules = :modules::jsonb
          WHERE company_id = 11
        `, {
          replacements: { modules: JSON.stringify(activeModules) }
        });

        console.log('✅ active_modules limpiado');
      } else {
        console.log('✅ OK - NO hay módulos problemáticos en active_modules');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ VERIFICACIÓN COMPLETADA\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
