const db = require('../src/config/database');

(async () => {
  try {
    await db.sequelize.authenticate();

    const [modules] = await db.sequelize.query(`
      SELECT module_key, name, is_core, category, is_active, base_price
      FROM system_modules
      WHERE is_active = true
      ORDER BY is_core DESC, module_key
    `);

    console.log('📊 TODOS LOS MÓDULOS EN BD (system_modules):');
    console.log('Total:', modules.length);
    console.log('');

    const coreModules = modules.filter(m => m.is_core);
    const premiumModules = modules.filter(m => !m.is_core);

    console.log('═══════════════════════════════════════');
    console.log('CORE MODULES:', coreModules.length);
    console.log('═══════════════════════════════════════');
    coreModules.forEach(m => {
      console.log(`✓ ${m.module_key.padEnd(35)} | ${m.name.padEnd(40)} | cat: ${(m.category || 'N/A').padEnd(15)}`);
    });

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('PREMIUM MODULES:', premiumModules.length);
    console.log('═══════════════════════════════════════');
    premiumModules.forEach(m => {
      console.log(`○ ${m.module_key.padEnd(35)} | ${m.name.padEnd(40)} | cat: ${(m.category || 'N/A').padEnd(15)}`);
    });

    await db.sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
