const { sequelize } = require('./src/config/database');

async function checkUsers() {
  try {
    // Ver estructura de tabla users
    console.log('📋 Estructura de tabla users:');
    const structure = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `, { type: sequelize.QueryTypes.SELECT });

    structure.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n🔍 Usuarios de empresa ISI (ID: 11):');

    // Buscar usuarios con los campos que existen
    const users = await sequelize.query(`
      SELECT * FROM users WHERE company_id = 11 AND is_active = true LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    users.forEach((user, i) => {
      console.log(`\n${i+1}. ID: ${user.user_id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      if (user.firstName) console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
      if (user.first_name) console.log(`   Nombre: ${user.first_name} ${user.last_name}`);
      console.log(`   Company: ${user.company_id}`);
      console.log(`   Activo: ${user.is_active}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

checkUsers();