const db = require('../src/config/database');

(async () => {
  try {
    await db.sequelize.authenticate();

    const [modules] = await db.sequelize.query(`
      SELECT module_key, name, is_core, category, is_active, base_price
      FROM system_modules
      WHERE is_active = true
      ORDER BY is_core DESC, display_order
    `);

    console.log('📊 MÓDULOS EN BD (system_modules):');
    console.log('Total:', modules.length);
    console.log('');

    const coreModules = modules.filter(m => m.is_core);
    const premiumModules = modules.filter(m => !m.is_core);

    console.log('CORE:', coreModules.length);
    coreModules.forEach(m => {
      console.log(`  ✓ ${m.module_key} - ${m.name} (cat: ${m.category || 'N/A'})`);
    });

    console.log('');
    console.log('PREMIUM:', premiumModules.length);
    premiumModules.slice(0, 15).forEach(m => {
      console.log(`  ○ ${m.module_key} - ${m.name} (cat: ${m.category || 'N/A'})`);
    });

    if (premiumModules.length > 15) {
      console.log(`  ... y ${premiumModules.length - 15} más`);
    }

    await db.sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
