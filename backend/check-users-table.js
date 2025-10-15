const { sequelize } = require('./src/config/database');

async function checkUsersTable() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('📋 ESTRUCTURA DE LA TABLA USERS:');
    console.log('');
    results.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('');
    console.log(`Total columnas: ${results.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsersTable();
