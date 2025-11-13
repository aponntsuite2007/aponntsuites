require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function checkUsers() {
  try {
    const users = await sequelize.query(
      `SELECT user_id, usuario, "firstName", "lastName", role, "isActive", company_id
       FROM users
       WHERE company_id = 11
       ORDER BY user_id`,
      { type: QueryTypes.SELECT }
    );

    console.log('👥 Todos los usuarios para empresa ISI (company_id=11):');
    console.log(JSON.stringify(users, null, 2));
    console.log(`\n📊 Total usuarios: ${users.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
