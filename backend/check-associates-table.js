const { sequelize } = require('./src/config/database');

async function check() {
  try {
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%associate%'"
    );
    console.log('Tables matching "associate":', tables);

    // Try the query directly
    try {
      const [result] = await sequelize.query(
        "SELECT COUNT(*) as cnt FROM aponnt_associates"
      );
      console.log('aponnt_associates count:', result[0].cnt);
    } catch(e) {
      console.log('aponnt_associates query error:', e.message);
    }

    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

check();
