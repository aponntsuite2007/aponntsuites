require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function checkAllColumns() {
  try {
    const columns = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('is_active', 'allow_outside_radius', 'gps_enabled')
      ORDER BY ordinal_position
    `, { type: QueryTypes.SELECT });

    console.log('📋 Columnas de GPS/Estado en tabla users:');
    console.log(JSON.stringify(columns, null, 2));

    if (columns.length === 0) {
      console.log('\n⚠️ NO se encontraron columnas de GPS/Estado');
      console.log('\n📋 Todas las columnas de la tabla users:');
      const allColumns = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `, { type: QueryTypes.SELECT });

      allColumns.forEach(col => {
        console.log(`   - ${col.column_name.padEnd(40)} ${col.data_type}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAllColumns();
