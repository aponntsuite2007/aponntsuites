require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function checkUser() {
  try {
    const users = await sequelize.query(
      `SELECT user_id, usuario, "firstName", "lastName", role, "isActive", company_id
       FROM users
       WHERE usuario = 'soporte' AND company_id = 11`,
      { type: QueryTypes.SELECT }
    );

    console.log('🔍 Usuario soporte para empresa ISI (company_id=11):');
    console.log(JSON.stringify(users, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();
