const { sequelize } = require('./src/config/database');

async function check() {
  try {
    const [cols] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'aponnt_associates' ORDER BY ordinal_position"
    );
    console.log('aponnt_associates columns:', cols.map(c => c.column_name).join(', '));

    // Check which columns from the query actually exist
    const needed = ['id', 'email', 'password_hash', 'first_name', 'last_name', 'phone',
      'specialty', 'license_number', 'category', 'is_active', 'rating_average',
      'contracts_completed', 'hourly_rate'];

    const existing = cols.map(c => c.column_name);
    const missing = needed.filter(n => !existing.includes(n));
    console.log('\nMissing columns from query:', missing.length > 0 ? missing : 'NONE');

    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

check();
