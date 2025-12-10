/**
 * Script para exportar ENUMs, SEQUENCEs y tablas de LOCAL y aplicarlos a RENDER
 * Versión 2: Sincronización completa con soporte para todos los tipos de PostgreSQL
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

async function exportEnums() {
  const client = new Client(LOCAL_DB);
  try {
    await client.connect();

    // Obtener nombres únicos de ENUMs
    const typesResult = await client.query(`
      SELECT DISTINCT t.typname as enum_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY t.typname
    `);

    const enums = [];

    // Para cada ENUM, obtener sus valores
    for (const row of typesResult.rows) {
      const valuesResult = await client.query(`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = $1
        ORDER BY e.enumsortorder
      `, [row.enum_name]);

      enums.push({
        enum_name: row.enum_name,
        enum_values: valuesResult.rows.map(r => r.enumlabel)
      });
    }

    return enums;
  } finally {
    await client.end();
  }
}

async function exportSequences() {
  const client = new Client(LOCAL_DB);
  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        sequence_name,
        COALESCE(start_value::BIGINT, 1) as start_value,
        COALESCE(minimum_value::BIGINT, 1) as minimum_value,
        COALESCE(maximum_value::BIGINT, 9223372036854775807) as maximum_value,
        COALESCE(increment::BIGINT, 1) as increment
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `);

    return result.rows;
  } finally {
    await client.end();
  }
}

async function applyEnumsToRender(enums) {
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('\n📊 Creando ENUMs en Render...\n');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const enumDef of enums) {
      const { enum_name, enum_values } = enumDef;
      const valuesStr = enum_values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
      const sql = `CREATE TYPE ${enum_name} AS ENUM (${valuesStr})`;

      try {
        await client.query(sql);
        console.log(`   ✅ ENUM: ${enum_name}`);
        created++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          skipped++;
        } else {
          console.log(`   ⚠️  ${enum_name}: ${error.message.substring(0, 60)}`);
          errors++;
        }
      }
    }

    console.log(`\n   ✅ ${created} creados, ⏭️  ${skipped} saltados, ⚠️  ${errors} errores\n`);
    return { created, skipped, errors };

  } finally {
    await client.end();
  }
}

async function applySequencesToRender(sequences) {
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('📊 Creando SEQUENCEs en Render...\n');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const seqDef of sequences) {
      const { sequence_name, start_value, minimum_value, maximum_value, increment } = seqDef;
      const sql = `CREATE SEQUENCE IF NOT EXISTS ${sequence_name} START WITH ${start_value} INCREMENT BY ${increment}`;

      try {
        await client.query(sql);
        console.log(`   ✅ SEQUENCE: ${sequence_name}`);
        created++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          skipped++;
        } else {
          console.log(`   ⚠️  ${sequence_name}: ${error.message.substring(0, 60)}`);
          errors++;
        }
      }
    }

    console.log(`\n   ✅ ${created} creados, ⏭️  ${skipped} saltados, ⚠️  ${errors} errores\n`);
    return { created, skipped, errors };

  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 SINCRONIZACIÓN COMPLETA: LOCAL → RENDER\n');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Exportar ENUMs
    console.log('📤 PASO 1: Exportando ENUMs de LOCAL...');
    const enums = await exportEnums();
    console.log(`   Encontrados: ${enums.length} ENUMs\n`);

    // 2. Exportar SEQUENCEs
    console.log('📤 PASO 2: Exportando SEQUENCEs de LOCAL...');
    const sequences = await exportSequences();
    console.log(`   Encontrados: ${sequences.length} SEQUENCEs\n`);

    // 3. Aplicar ENUMs
    console.log('📥 PASO 3: Aplicando ENUMs a RENDER...');
    const enumsResult = await applyEnumsToRender(enums);

    // 4. Aplicar SEQUENCEs
    console.log('📥 PASO 4: Aplicando SEQUENCEs a RENDER...');
    const seqsResult = await applySequencesToRender(sequences);

    console.log('🎉 CONFIGURACIÓN INICIAL COMPLETA!\n');
    console.log('📊 RESUMEN:');
    console.log(`   ENUMs: ${enumsResult.created} creados`);
    console.log(`   SEQUENCEs: ${seqsResult.created} creados\n`);

    console.log('💡 SIGUIENTE PASO: Ejecutar apply-full-schema-to-render.js para crear tablas\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
