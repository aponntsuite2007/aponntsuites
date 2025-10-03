const { sequelize } = require('./src/config/database');

async function checkUsersColumns() {
  try {
    // Verificar estructura de users
    const [columns] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public'");
    console.log('📋 COLUMNAS EN users:');
    columns.forEach(c => console.log('  -', c.column_name));

    // Verificar datos ISI con nombres correctos
    const [isiUsers] = await sequelize.query(`
      SELECT *
      FROM users
      WHERE company_id = 11
      LIMIT 3
    `);
    console.log('\n👥 USUARIOS DE ISI (ID 11):');
    isiUsers.forEach(u => console.log('  - ID:', u.id, '| Company:', u.company_id));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsersColumns();