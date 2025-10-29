const fs = require('fs');
const database = require('./src/config/database');

async function runMigration() {
  try {
    const { sequelize } = database;

    console.log('\n🔧 [MIGRATION] Ejecutando migración de testing_tickets...\n');

    const sql = fs.readFileSync('./migrations/20251023_create_testing_tickets.sql', 'utf8');

    await sequelize.query(sql);

    console.log('✅ [MIGRATION] Tabla testing_tickets creada exitosamente');
    console.log('✅ [MIGRATION] Funciones SQL creadas exitosamente\n');

    // Verificar que la tabla existe
    const [tables] = await sequelize.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'testing_tickets'
    `);

    if (tables.length > 0) {
      console.log('✅ [VERIFICATION] Tabla testing_tickets confirmada en BD\n');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ [ERROR]:', error.message);
    if (error.message.includes('already exists')) {
      console.log('⚠️  [INFO] La tabla ya existe, puedes continuar\n');
      process.exit(0);
    }
    process.exit(1);
  }
}

runMigration();
