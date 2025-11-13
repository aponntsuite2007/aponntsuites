const { sequelize } = require('./src/config/database');

async function checkSchema() {
  try {
    console.log('🔍 Checking facial_biometric_data table schema...\n');

    // Query to get all column names from the table
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'facial_biometric_data'
      ORDER BY ordinal_position;
    `);

    if (results.length === 0) {
      console.log('❌ Table facial_biometric_data does NOT exist in database\n');

      // Check if table exists at all
      const [tables] = await sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '%biometric%'
        ORDER BY table_name;
      `);

      console.log('📋 Available biometric tables:');
      tables.forEach(t => console.log(`  - ${t.table_name}`));
    } else {
      console.log('✅ Table exists! Columns found:\n');
      console.log('Column Name'.padEnd(35) + 'Type'.padEnd(20) + 'Nullable');
      console.log('='.repeat(70));

      results.forEach(col => {
        console.log(
          col.column_name.padEnd(35) +
          col.data_type.padEnd(20) +
          col.is_nullable
        );
      });

      console.log('\n📌 KEY COLUMNS TO CHECK:');
      const keyColumns = [
        'userId', 'user_id',
        'qualityScore', 'quality_score',
        'confidenceThreshold', 'confidence_threshold',
        'isPrimary', 'is_primary',
        'isActive', 'is_active',
        'createdAt', 'created_at'
      ];

      keyColumns.forEach(colName => {
        const exists = results.find(r => r.column_name === colName);
        console.log(`  ${exists ? '✅' : '❌'} ${colName}`);
      });
    }

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    process.exit(1);
  }
}

checkSchema();
