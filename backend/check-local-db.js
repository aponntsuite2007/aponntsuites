// Script para verificar BD LOCAL (sin DATABASE_URL)
const { Sequelize } = require('sequelize');

// Forzar conexión local IGNORANDO DATABASE_URL
const sequelize = new Sequelize('attendance_system', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
  port: 5432,
  logging: false
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL LOCAL\n');

    // 1. Verificar si existe tabla attendance
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'attendance'
    `);

    if (tables.length === 0) {
      console.log('❌ Tabla "attendance" NO EXISTE en BD local');
      console.log('');

      // Listar todas las tablas que SÍ existen
      const [allTables] = await sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      console.log(`📋 Tablas que SÍ existen en BD local (${allTables.length}):`);
      allTables.forEach((t, i) => {
        console.log(`   ${i+1}. ${t.table_name}`);
      });
    } else {
      console.log('✅ Tabla "attendance" EXISTE en BD local\n');

      // Verificar estructura
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'attendance'
        ORDER BY ordinal_position
      `);

      console.log('📋 Estructura de la tabla:');
      columns.forEach((col, i) => {
        console.log(`   ${i+1}. ${col.column_name} (${col.data_type})`);
      });
      console.log('');

      // Verificar datos
      const [count] = await sequelize.query(`SELECT COUNT(*) as total FROM attendance`);
      console.log(`📊 Total de registros: ${count[0].total}`);

      if (count[0].total > 0) {
        const [recent] = await sequelize.query(`
          SELECT id, user_id, checkin_time,
                 TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
          FROM attendance
          ORDER BY created_at DESC
          LIMIT 5
        `);

        console.log('\n📋 Últimos 5 registros:');
        recent.forEach((r, i) => {
          console.log(`   ${i+1}. ID: ${r.id} | User: ${r.user_id} | CheckIn: ${r.checkin_time} | Created: ${r.created}`);
        });
      }
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
