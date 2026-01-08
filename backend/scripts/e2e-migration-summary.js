const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD
  });

  await client.connect();

  console.log('\n📊 RESUMEN FINAL - Sistema E2E Advanced Testing\n');
  console.log('='.repeat(60));

  const tables = await client.query(`
    SELECT table_name,
           (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
      AND table_name LIKE 'e2e_%'
    ORDER BY table_name
  `);

  console.log('\n✅ TABLAS CREADAS (' + tables.rows.length + '):');
  tables.rows.forEach(t => {
    console.log(`   - ${t.table_name} (${t.column_count} columnas)`);
  });

  const functions = await client.query(`
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name LIKE '%e2e%'
    ORDER BY routine_name
  `);

  console.log('\n✅ FUNCIONES/TRIGGERS CREADAS (' + functions.rows.length + '):');
  functions.rows.forEach(f => {
    console.log(`   - ${f.routine_name}() [${f.routine_type}]`);
  });

  const indexes = await client.query(`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename LIKE 'e2e_%'
    ORDER BY tablename, indexname
  `);

  console.log('\n✅ ÍNDICES CREADOS (' + indexes.rows.length + '):');
  const grouped = {};
  indexes.rows.forEach(i => {
    if (!grouped[i.tablename]) grouped[i.tablename] = [];
    grouped[i.tablename].push(i.indexname);
  });
  Object.keys(grouped).forEach(table => {
    console.log(`   ${table}:`);
    grouped[table].forEach(idx => console.log(`      - ${idx}`));
  });

  console.log('\n' + '='.repeat(60));
  console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
  console.log('='.repeat(60));
  console.log('\nEl sistema E2E Advanced Testing está listo para usar.\n');

  await client.end();
})();
