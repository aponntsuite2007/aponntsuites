/**
 * Script para identificar tablas extra en RENDER que no existen en LOCAL
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

async function main() {
  const local = new Client(LOCAL_DB);
  const render = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await local.connect();
    await render.connect();

    // Obtener tablas de LOCAL
    const localResult = await local.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // Obtener tablas de RENDER
    const renderResult = await render.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const localTables = new Set(localResult.rows.map(r => r.table_name));
    const renderTables = new Set(renderResult.rows.map(r => r.table_name));

    // Tablas extra en RENDER
    const extraInRender = [...renderTables].filter(t => !localTables.has(t));

    // Tablas faltantes en RENDER
    const missingInRender = [...localTables].filter(t => !renderTables.has(t));

    console.log('📊 ANÁLISIS DE DIFERENCIAS:\n');
    console.log(`   LOCAL:  ${localTables.size} tablas`);
    console.log(`   RENDER: ${renderTables.size} tablas\n`);

    if (extraInRender.length > 0) {
      console.log(`📋 TABLAS EXTRA EN RENDER (${extraInRender.length}):\n`);
      extraInRender.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
      console.log();
    }

    if (missingInRender.length > 0) {
      console.log(`⚠️  TABLAS FALTANTES EN RENDER (${missingInRender.length}):\n`);
      missingInRender.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
      console.log();
    }

    if (extraInRender.length === 0 && missingInRender.length === 0) {
      console.log('🎉 100% SINCRONIZADO - ¡BASES IDÉNTICAS!\n');
    }

  } finally {
    await local.end();
    await render.end();
  }
}

main();
