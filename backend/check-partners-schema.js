const { sequelize } = require('./src/config/database');

async function check() {
  try {
    const [cols] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'partners' ORDER BY ordinal_position"
    );
    console.log('=== partners table columns ===');
    if (cols.length === 0) {
      console.log('TABLE DOES NOT EXIST!');
    } else {
      cols.forEach(c => console.log(' ', c.column_name, '-', c.data_type));
    }
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

check();
