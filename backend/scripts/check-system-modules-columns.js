const db = require('../src/config/database');

(async () => {
  try {
    await db.sequelize.authenticate();

    const [columns] = await db.sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'system_modules'
      ORDER BY ordinal_position
    `);

    console.log('📋 COLUMNAS DE system_modules:');
    console.log('='.repeat(60));
    columns.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} | ${col.data_type}`);
    });
    console.log('='.repeat(60));
    console.log(`Total: ${columns.length} columnas`);

    await db.sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
