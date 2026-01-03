const { sequelize } = require('./src/config/database');

(async () => {
  try {
    const [cols] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'company_modules'
      ORDER BY ordinal_position
    `);

    console.log('\nColumnas en company_modules:');
    cols.forEach(c => console.log('  -', c.column_name));

    // Verificar si hay registros
    const [rows] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM company_modules
      WHERE company_id = 11
    `);

    console.log('\nTotal registros para company_id=11:', rows[0].total);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
