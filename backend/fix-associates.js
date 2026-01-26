const { sequelize } = require('./src/config/database');

async function fix() {
  try {
    await sequelize.query("ALTER TABLE aponnt_associates ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT NULL");
    console.log('OK - password_hash column added to aponnt_associates');
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

fix();
