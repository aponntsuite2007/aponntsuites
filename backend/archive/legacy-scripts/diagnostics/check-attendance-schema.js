const { sequelize } = require('./src/config/database');

async function checkSchema() {
  try {
    console.log('📋 Consultando esquema de tabla attendances...\n');

    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendances'
      ORDER BY ordinal_position
    `);

    console.log('✅ Columnas de la tabla attendances:');
    console.table(columns);

    // Verificar si existe user_id o employee_id
    const hasUserId = columns.some(c => c.column_name === 'user_id');
    const hasEmployeeId = columns.some(c => c.column_name === 'employee_id');

    console.log('\n🔍 Verificación:');
    console.log(`   user_id existe: ${hasUserId ? '✅' : '❌'}`);
    console.log(`   employee_id existe: ${hasEmployeeId ? '✅' : '❌'}`);

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
