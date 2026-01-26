const { sequelize } = require('./src/config/database');

async function checkSchema() {
  try {
    // Check aponnt_staff columns
    const [staffCols] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'aponnt_staff' ORDER BY ordinal_position"
    );
    console.log('=== aponnt_staff columns ===');
    staffCols.forEach(c => console.log(' ', c.column_name, '-', c.data_type));

    // Check aponnt_staff_roles
    const [roleCols] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'aponnt_staff_roles' ORDER BY ordinal_position"
    );
    console.log('\n=== aponnt_staff_roles columns ===');
    roleCols.forEach(c => console.log(' ', c.column_name, '-', c.data_type));

    // Check if any staff records exist
    const [staffCount] = await sequelize.query("SELECT COUNT(*) as cnt FROM aponnt_staff");
    console.log('\n=== Staff count:', staffCount[0].cnt);

    // Check if any roles exist
    const [roles] = await sequelize.query("SELECT role_id, role_code, role_name FROM aponnt_staff_roles LIMIT 10");
    console.log('\n=== Existing roles ===');
    roles.forEach(r => console.log(' ', r.role_id, '-', r.role_code, '-', r.role_name));

    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

checkSchema();
