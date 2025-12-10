/**
 * Script para crear las últimas 6 tablas restantes
 */

const { Client } = require('pg');

const LOCAL_DB = {
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
};

const RENDER_DB_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com/aponnt_db';

const tables = ['UserShifts', 'employee_locations', 'multiple_art_configurations', 'procedure_versions', 'procedures', 'system_config'];

async function createTables() {
  const local = new Client(LOCAL_DB);
  const render = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await local.connect();
    await render.connect();

    console.log('🔧 Creando 6 tablas restantes...\n');

    for (const table of tables) {
      process.stdout.write(`   ${table}... `);

      // Obtener DDL
      const ddl = await local.query(`
        SELECT
          'CREATE TABLE IF NOT EXISTS ' || table_name || E' (\n' ||
          string_agg(
            '  ' || column_name || ' ' ||
            CASE
              WHEN data_type = 'ARRAY' THEN
                CASE
                  WHEN udt_name = '_text' THEN 'text[]'
                  WHEN udt_name = '_varchar' THEN 'varchar[]'
                  WHEN udt_name = '_int4' THEN 'integer[]'
                  WHEN udt_name = '_float4' THEN 'real[]'
                  WHEN udt_name = '_uuid' THEN 'uuid[]'
                  WHEN udt_name = '_bool' THEN 'boolean[]'
                  ELSE REPLACE(udt_name, '_', '') || '[]'
                END
              WHEN data_type = 'USER-DEFINED' THEN udt_name
              WHEN data_type = 'character varying' AND character_maximum_length IS NOT NULL THEN
                'varchar(' || character_maximum_length || ')'
              WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL THEN
                'numeric(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
              ELSE data_type
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
            E',\n'
            ORDER BY ordinal_position
          ) || E'\n);' as ddl
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        GROUP BY table_name
      `, [table]);

      if (ddl.rows.length === 0) {
        console.log('⚠️  No DDL');
        continue;
      }

      try {
        await render.query(ddl.rows[0].ddl);
        console.log('✅');
      } catch (e) {
        console.log(`⚠️  ${e.message.substring(0, 60)}`);
      }
    }

    console.log('\n✅ Proceso completado!\n');

    // Verificar count final
    const count = await render.query(`
      SELECT COUNT(*) as total
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    console.log(`📊 Total tablas en RENDER: ${count.rows[0].total}/334\n`);

    if (parseInt(count.rows[0].total) === 334) {
      console.log('🎉 100% COMPLETADO - ¡TODAS LAS TABLAS SINCRONIZADAS!\n');
    }

  } finally {
    await local.end();
    await render.end();
  }
}

createTables();
