const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/config/database');

async function updatePassword() {
  try {
    const hashedPassword = await bcrypt.hash('test123', 10);
    console.log('Generated hash:', hashedPassword);

    const [result] = await sequelize.query(
      `UPDATE users
       SET password = ?, email_verified = true, account_status = 'active'
       WHERE company_id = 11 AND email = 'rrhh1_1765854889484@isi.test'`,
      {
        replacements: [hashedPassword],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    console.log('✅ Password updated successfully');

    // Verify
    const [user] = await sequelize.query(
      `SELECT user_id, email, role, email_verified, account_status, LENGTH(password) as pwd_len
       FROM users
       WHERE company_id = 11 AND email = 'rrhh1_1765854889484@isi.test'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('User details:', user);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePassword();
