#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const database = require('../src/config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    // Check soporte user password for ISI
    const users = await database.sequelize.query(
      "SELECT user_id, usuario, password, role, company_id, is_active FROM users WHERE usuario = 'soporte' AND company_id = 11",
      { type: database.sequelize.QueryTypes.SELECT }
    );
    console.log('Soporte user for ISI:', JSON.stringify(users, null, 2));

    if (users.length > 0) {
      const user = users[0];
      // Test if password 'admin123' matches
      let isValid = false;
      if (user.password) {
        isValid = await bcrypt.compare('admin123', user.password);
      }
      console.log('Password admin123 valid:', isValid);

      // If password doesn't exist or is wrong, update it
      if (!user.password || !isValid) {
        console.log('Updating password to admin123...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await database.sequelize.query(
          "UPDATE users SET password = $1 WHERE user_id = $2",
          { bind: [hashedPassword, user.user_id] }
        );
        console.log('Password updated!');

        // Verify update
        const verify = await database.sequelize.query(
          "SELECT password FROM users WHERE user_id = $1",
          { bind: [user.user_id], type: database.sequelize.QueryTypes.SELECT }
        );
        const verifyValid = await bcrypt.compare('admin123', verify[0].password);
        console.log('Verification - password now valid:', verifyValid);
      }
    }

    await database.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
