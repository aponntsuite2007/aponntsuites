const { sequelize } = require('./src/config/database');

async function checkCompaniesTable() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
      LIMIT 10
    `);

    console.log('📋 ESTRUCTURA DE LA TABLA COMPANIES (primeras 10 columnas):');
    console.log('');
    results.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCompaniesTable();
