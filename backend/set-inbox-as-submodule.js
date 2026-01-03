/**
 * Configurar inbox como sub-módulo de mi-espacio
 */
const database = require('./src/config/database');

(async () => {
  try {
    const { sequelize } = database;

    console.log('\n🔧 CONFIGURANDO JERARQUÍA DE MÓDULOS\n');
    console.log('='.repeat(80) + '\n');

    // 1. Establecer inbox como sub-módulo de mi-espacio
    await sequelize.query(`
      UPDATE system_modules
      SET parent_module_key = 'mi-espacio'
      WHERE module_key = 'inbox'
    `);

    console.log('✅ inbox ahora es sub-módulo de mi-espacio\n');

    // 2. Verificar estado actual
    const [modules] = await sequelize.query(`
      SELECT module_key, name, parent_module_key, description
      FROM system_modules
      WHERE module_key IN ('inbox', 'mi-espacio', 'notification-center')
      ORDER BY module_key
    `);

    console.log('📊 ESTADO ACTUAL:\n');
    modules.forEach(m => {
      console.log(`${m.module_key}:`);
      console.log(`  Nombre: ${m.name}`);
      console.log(`  Parent: ${m.parent_module_key || 'null (módulo raíz)'}`);
      console.log(`  Descripción: ${m.description}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n🎯 RESULTADO:\n');
    console.log('✅ Mi Espacio (mi-espacio) → MÓDULO RAÍZ');
    console.log('   └── 🔗 Bandeja Notificaciones (inbox) → SUB-MÓDULO');
    console.log('');
    console.log('✅ Centro de Notificaciones (notification-center) → MÓDULO RAÍZ');
    console.log('');
    console.log('📌 El dashboard ahora mostrará solo:');
    console.log('   - Mi Espacio (con acceso a inbox dentro)');
    console.log('   - Centro de Notificaciones (workflows empresariales)');
    console.log('');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
