/**
 * Script para crear la tabla UserShifts (CamelCase) en RENDER
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

async function getTableDDL(tableName) {
  const client = new Client(LOCAL_DB);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        'CREATE TABLE IF NOT EXISTS "' || table_name || E'" (\n' ||
        string_agg(
          '  "' || column_name || '" ' ||
          CASE
            WHEN data_type = 'ARRAY' THEN
              CASE
                WHEN udt_name = '_text' THEN 'text[]'
                WHEN udt_name = '_varchar' THEN 'varchar[]'
                WHEN udt_name = '_int4' THEN 'integer[]'
                WHEN udt_name = '_int8' THEN 'bigint[]'
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
        ) ||
        E'\n);' as ddl
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      GROUP BY table_name
    `, [tableName]);

    return result.rows[0]?.ddl;

  } finally {
    await client.end();
  }
}

async function createTableInRender(ddl) {
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(ddl);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 CREANDO TABLA "UserShifts" EN RENDER\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Obtener DDL de LOCAL
    console.log('📤 Obteniendo DDL de LOCAL...');
    const ddl = await getTableDDL('UserShifts');

    if (!ddl) {
      console.log('❌ No se pudo obtener DDL de UserShifts en LOCAL\n');
      process.exit(1);
    }

    console.log('✅ DDL obtenido\n');
    console.log('📥 Aplicando a RENDER...');

    // Aplicar a RENDER
    const result = await createTableInRender(ddl);

    if (result.success) {
      console.log('✅ Tabla "UserShifts" creada exitosamente\n');
    } else {
      console.log(`❌ Error: ${result.error}\n`);
      process.exit(1);
    }

    // Verificar count final
    const client = new Client({
      connectionString: RENDER_DB_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    const count = await client.query(`
      SELECT COUNT(*) as total
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    await client.end();

    console.log(`📊 Total tablas en RENDER: ${count.rows[0].total}\n`);
    console.log('🎉 COMPLETADO!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
