const { sequelize } = require('./backend/src/config/database');

async function checkTables() {
  try {
    console.log('🔍 Verificando tablas en producción...\n');

    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE 'biometric_%' OR table_name LIKE '%consent%')
      ORDER BY table_name
    `);

    console.log('📊 TABLAS BIOMÉTRICAS ENCONTRADAS:');
    if (tables.length === 0) {
      console.log('   ❌ NO SE ENCONTRARON TABLAS');
    } else {
      tables.forEach(t => {
        console.log(`   ✅ ${t.table_name}`);
      });
    }

    console.log(`\n📊 Total: ${tables.length} tablas`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
