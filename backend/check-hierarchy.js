/**
 * Script para verificar jerarquía de módulos
 */
const database = require('./src/config/database');

(async () => {
  try {
    const { SystemModule } = database;

    const modules = await SystemModule.findAll({
      where: {
        module_key: ['departments', 'shifts', 'roles-permissions', 'organizational-structure']
      },
      attributes: ['module_key', 'name', 'parent_module_key', 'metadata'],
      raw: true
    });

    console.log('\n===== ESTADO ACTUAL DE JERARQUÍA =====\n');
    modules.forEach(m => {
      console.log(`${m.module_key}:`);
      console.log(`  name: ${m.name}`);
      console.log(`  parent_module_key (columna): ${m.parent_module_key}`);
      console.log(`  hideFromDashboard (metadata): ${m.metadata?.hideFromDashboard}`);
      console.log('');
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
