const { sequelize } = require('./src/config/database');

(async () => {
  try {
    console.log('\n🔍 BUSCANDO REGISTROS PROBLEMÁTICOS EN company_modules\n');
    console.log('='.repeat(80) + '\n');

    // JOIN entre company_modules y system_modules para ver qué módulos tiene ISI
    const [rows] = await sequelize.query(`
      SELECT
        cm.id as company_module_id,
        cm.company_id,
        cm.activo,
        cm.is_active,
        sm.module_key,
        sm.name,
        sm.parent_module_key
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = 11
      AND sm.module_key IN ('departments', 'shifts', 'roles-permissions', 'dashboard')
      ORDER BY sm.module_key
    `);

    if (rows.length > 0) {
      console.log('❌ ❌ ❌ PROBLEMA ENCONTRADO ❌ ❌ ❌\n');
      console.log(`Encontrados ${rows.length} registros problemáticos en company_modules:\n`);

      rows.forEach(r => {
        console.log(`  ❌ ${r.module_key} (${r.name})`);
        console.log(`     - company_module_id: ${r.company_module_id}`);
        console.log(`     - activo: ${r.activo}`);
        console.log(`     - is_active: ${r.is_active}`);
        console.log(`     - parent_module_key: ${r.parent_module_key}`);
        console.log('');
      });

      console.log('\n🔧 ¿ELIMINAR ESTOS REGISTROS? (y/n)');
      console.log('\nPara eliminarlos ejecuta:\n');
      console.log(`DELETE FROM company_modules WHERE id IN (${rows.map(r => r.company_module_id).join(', ')});\n`);

      // Auto-eliminar
      console.log('🔧 ELIMINANDO AUTOMÁTICAMENTE...\n');

      const ids = rows.map(r => `'${r.company_module_id}'`);
      await sequelize.query(`
        DELETE FROM company_modules
        WHERE id::text IN (${ids.join(',')})
      `);

      console.log(`✅ Eliminados ${rows.length} registros de company_modules`);

    } else {
      console.log('✅ NO se encontraron registros problemáticos en company_modules\n');
    }

    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
