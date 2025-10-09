const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u', {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function checkTables() {
  try {
    console.log('🔍 Verificando tablas necesarias en Render...\n');

    const tablesToCheck = [
      'employee_locations',
      'trainings',
      'training_assignments',
      'training_progress'
    ];

    for (const tableName of tablesToCheck) {
      // Check if table exists
      const [tables] = await sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '${tableName}'
      `);

      if (tables.length === 0) {
        console.log(`❌ Tabla ${tableName} NO EXISTE\n`);
        continue;
      }

      console.log(`✅ Tabla ${tableName} existe`);

      // Get columns
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position
      `);

      console.log(`   Columnas:`);
      columns.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type})`);
      });

      // Get count
      const [count] = await sequelize.query(`SELECT COUNT(*) as total FROM ${tableName}`);
      console.log(`   Total registros: ${count[0].total}\n`);
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

checkTables();
