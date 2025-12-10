/**
 * Script para migrar tablas faltantes a RENDER en batches pequeños
 * Evita timeouts al procesar solo 30 tablas por batch
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

const BATCH_SIZE = 30;
const DELAY_BETWEEN_BATCHES = 2000; // 2 segundos

async function getTableCreateStatement(tableName) {
  const client = new Client(LOCAL_DB);
  try {
    await client.connect();

    // Obtener CREATE TABLE statement desde LOCAL
    const result = await client.query(`
      SELECT
        'CREATE TABLE IF NOT EXISTS ' || table_name || E' (\n  ' ||
        string_agg(
          column_name || ' ' ||
          CASE
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            WHEN data_type = 'character varying' AND character_maximum_length IS NOT NULL
              THEN 'varchar(' || character_maximum_length || ')'
            WHEN data_type = 'character' AND character_maximum_length IS NOT NULL
              THEN 'char(' || character_maximum_length || ')'
            ELSE data_type
          END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
          E',\n  '
          ORDER BY ordinal_position
        ) || E'\n);' as create_stmt
      FROM information_schema.columns
      WHERE table_name = $1
      GROUP BY table_name
    `, [tableName]);

    return result.rows[0]?.create_stmt;
  } finally {
    await client.end();
  }
}

async function applyTableToRender(tableName, createSQL) {
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(createSQL);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message.substring(0, 100) };
  } finally {
    await client.end();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateBatch(tables, batchNum, totalBatches) {
  console.log(`\n📦 BATCH ${batchNum}/${totalBatches} - Migrando ${tables.length} tablas...\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < tables.length; i++) {
    const tableName = tables[i];

    try {
      // Obtener CREATE TABLE de LOCAL
      const createSQL = await getTableCreateStatement(tableName);

      if (!createSQL) {
        console.log(`   ⚠️  [${i + 1}/${tables.length}] ${tableName}: No se pudo obtener definición`);
        errors++;
        continue;
      }

      // Aplicar a RENDER
      const result = await applyTableToRender(tableName, createSQL);

      if (result.success) {
        console.log(`   ✅ [${i + 1}/${tables.length}] ${tableName}`);
        created++;
      } else {
        if (result.error.includes('already exists')) {
          skipped++;
        } else {
          console.log(`   ⚠️  [${i + 1}/${tables.length}] ${tableName}: ${result.error}`);
          errors++;
        }
      }

    } catch (error) {
      console.log(`   ❌ [${i + 1}/${tables.length}] ${tableName}: ${error.message.substring(0, 80)}`);
      errors++;
    }
  }

  console.log(`\n   ✅ ${created} creadas, ⏭️  ${skipped} saltadas, ⚠️  ${errors} errores\n`);

  return { created, skipped, errors };
}

async function main() {
  console.log('🚀 MIGRACIÓN DE TABLAS FALTANTES EN BATCHES\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Leer lista de tablas faltantes
    const missingTablesPath = path.join(__dirname, 'missing_tables.json');
    const missingTables = JSON.parse(fs.readFileSync(missingTablesPath, 'utf-8'));

    console.log(`📋 Total tablas a migrar: ${missingTables.length}`);
    console.log(`📦 Tamaño de batch: ${BATCH_SIZE} tablas`);
    console.log(`⏱️  Delay entre batches: ${DELAY_BETWEEN_BATCHES}ms\n`);

    // Dividir en batches
    const batches = [];
    for (let i = 0; i < missingTables.length; i += BATCH_SIZE) {
      batches.push(missingTables.slice(i, i + BATCH_SIZE));
    }

    console.log(`📊 Total batches: ${batches.length}\n`);

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Procesar cada batch
    for (let i = 0; i < batches.length; i++) {
      const batchResult = await migrateBatch(batches[i], i + 1, batches.length);

      totalCreated += batchResult.created;
      totalSkipped += batchResult.skipped;
      totalErrors += batchResult.errors;

      // Esperar entre batches (excepto el último)
      if (i < batches.length - 1) {
        console.log(`⏳ Esperando ${DELAY_BETWEEN_BATCHES}ms antes del siguiente batch...\n`);
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESUMEN FINAL:\n');
    console.log(`   ✅ Creadas: ${totalCreated}`);
    console.log(`   ⏭️  Saltadas: ${totalSkipped}`);
    console.log(`   ⚠️  Errores: ${totalErrors}`);
    console.log(`   📋 Total procesadas: ${totalCreated + totalSkipped + totalErrors}/${missingTables.length}\n`);

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
      console.log(`📊 Total tablas en RENDER ahora: ${result.rows[0].total}\n`);
    } finally {
      await client.end();
    }

    console.log('🎉 MIGRACIÓN COMPLETADA!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
