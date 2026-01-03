const { sequelize } = require('./src/config/database');

(async () => {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'system_modules'
      AND column_name LIKE '%parent%'
    `);

    console.log('\n===== COLUMNAS CON PARENT EN SYSTEM_MODULES =====\n');
    results.forEach(r => {
      console.log(`${r.column_name} - ${r.data_type} - nullable: ${r.is_nullable}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
