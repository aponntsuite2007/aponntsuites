const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function checkTables() {
  try {
    // Check departments
    const [depts] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'departments' 
      ORDER BY ordinal_position;
    `);
    console.log('📋 Columnas de departments:');
    depts.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

    // Check kiosks
    const [kiosks] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'kiosks' 
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 Columnas de kiosks:');
    kiosks.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

    // Check attendances
    const [att] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'attendances' 
      ORDER BY ordinal_position LIMIT 10;
    `);
    console.log('\n📋 Columnas de attendances (primeras 10):');
    att.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTables();
