/**
 * Script para exportar las 62 tablas restantes directamente desde PostgreSQL
 * usando queries SQL para obtener el DDL completo
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

    // Query para obtener el DDL completo de la tabla incluyendo sintaxis de arrays
    const result = await client.query(`
      SELECT
        'CREATE TABLE IF NOT EXISTS ' || table_name || E' (\n' ||
        string_agg(
          '  ' || column_name || ' ' ||
          CASE
            WHEN data_type = 'ARRAY' THEN
              -- Convertir _text a text[], _int4 a integer[], etc.
              CASE
                WHEN udt_name = '_text' THEN 'text[]'
                WHEN udt_name = '_varchar' THEN 'varchar[]'
                WHEN udt_name = '_int4' THEN 'integer[]'
                WHEN udt_name = '_int8' THEN 'bigint[]'
                WHEN udt_name = '_float4' THEN 'real[]'
                WHEN udt_name = '_float8' THEN 'double precision[]'
                WHEN udt_name = '_uuid' THEN 'uuid[]'
                WHEN udt_name = '_bool' THEN 'boolean[]'
                WHEN udt_name = '_date' THEN 'date[]'
                WHEN udt_name = '_timestamp' THEN 'timestamp[]'
                WHEN udt_name = '_timestamptz' THEN 'timestamptz[]'
                WHEN udt_name = '_json' THEN 'json[]'
                WHEN udt_name = '_jsonb' THEN 'jsonb[]'
                ELSE REPLACE(udt_name, '_', '') || '[]'
              END
            WHEN data_type = 'USER-DEFINED' THEN
              udt_name
            WHEN data_type = 'character varying' AND character_maximum_length IS NOT NULL THEN
              'varchar(' || character_maximum_length || ')'
            WHEN data_type = 'character' AND character_maximum_length IS NOT NULL THEN
              'char(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL THEN
              'numeric(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
            ELSE
              data_type
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

async function applyTableToRender(tableName, ddl) {
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(ddl);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 EXPORTANDO Y APLICANDO 62 TABLAS RESTANTES\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Leer lista de tablas faltantes
    const missingTablesPath = path.join(__dirname, 'missing_tables_simple.txt');
    const missingTables = fs.readFileSync(missingTablesPath, 'utf-8').trim().split('\n');

    console.log(`📋 Total tablas a migrar: ${missingTables.length}\n`);

    let created = 0;
    let errors = 0;
    const errorDetails = [];

    for (let i = 0; i < missingTables.length; i++) {
      const tableName = missingTables[i].trim();

      process.stdout.write(`   [${i + 1}/${missingTables.length}] ${tableName}... `);

      try {
        // Obtener DDL de LOCAL
        const ddl = await getTableDDL(tableName);

        if (!ddl) {
          console.log('⚠️  No se pudo obtener DDL');
          errors++;
          errorDetails.push({ table: tableName, error: 'No DDL' });
          continue;
        }

        // Aplicar a RENDER
        const result = await applyTableToRender(tableName, ddl);

        if (result.success) {
          console.log('✅');
          created++;
        } else {
          console.log(`⚠️  ${result.error.substring(0, 60)}`);
          errors++;
          errorDetails.push({ table: tableName, error: result.error.substring(0, 100) });
        }

      } catch (error) {
        console.log(`❌ ${error.message.substring(0, 60)}`);
        errors++;
        errorDetails.push({ table: tableName, error: error.message.substring(0, 100) });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESUMEN FINAL:\n');
    console.log(`   ✅ Creadas: ${created}`);
    console.log(`   ⚠️  Errores: ${errors}\n`);

    if (errors > 0 && errors <= 10) {
      console.log('❌ ERRORES ENCONTRADOS:\n');
      errorDetails.forEach(e => {
        console.log(`   - ${e.table}: ${e.error}`);
      });
      console.log();
    } else if (errors > 10) {
      console.log(`❌ ${errors} errores encontrados (mostrando primeros 10):\n`);
      errorDetails.slice(0, 10).forEach(e => {
        console.log(`   - ${e.table}: ${e.error}`);
      });
      console.log();
    }

    // Verificar count final
    const client = new Client({
      connectionString: RENDER_DB_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      const result = await client.query(`
        SELECT COUNT(*) as total
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      console.log(`📊 Total tablas en RENDER: ${result.rows[0].total}/334\n`);

      if (result.rows[0].total === '334') {
        console.log('🎉 100% COMPLETADO - TODAS LAS TABLAS SINCRONIZADAS!\n');
      } else {
        console.log(`⚠️  Faltan ${334 - parseInt(result.rows[0].total)} tablas\n`);
      }
    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
