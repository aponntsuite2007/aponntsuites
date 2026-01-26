const { sequelize } = require('../src/config/database');

async function test() {
  try {
    console.log('Checking companies table structure...');

    const [columns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `);

    console.log('Columns in companies table:');
    columns.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));

    // Get sample data
    console.log('\nSample company data:');
    const [companies] = await sequelize.query(`SELECT * FROM companies WHERE slug = 'isi' LIMIT 1`);
    console.log(companies[0]);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit();
  }
}

test();
