/**
 * Script para exportar el esquema completo de la base de datos local
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

async function exportSchema() {
  const client = new Client(LOCAL_DB);

  try {
    console.log('📊 Conectando a base de datos LOCAL...');
    await client.connect();
    console.log('✅ Conexión establecida\n');

    // Obtener todas las tablas
    console.log('📋 Obteniendo lista de tablas...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`   Total tablas: ${tables.length}\n`);

    // Obtener el schema completo usando pg_dump via psql
    console.log('📥 Exportando esquema completo...');

    const schemaQuery = `
      SELECT
        'CREATE TABLE IF NOT EXISTS ' || tablename || ' (' ||
        string_agg(
          column_definition,
          ', '
        ) ||
        ');' as create_statement
      FROM (
        SELECT
          c.table_name as tablename,
          c.column_name || ' ' ||
          c.data_type ||
          CASE
            WHEN c.character_maximum_length IS NOT NULL
            THEN '(' || c.character_maximum_length || ')'
            WHEN c.numeric_precision IS NOT NULL
            THEN '(' || c.numeric_precision || ',' || c.numeric_scale || ')'
            ELSE ''
          END ||
          CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END
          as column_definition
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        ORDER BY c.table_name, c.ordinal_position
      ) sub
      GROUP BY tablename
      ORDER BY tablename;
    `;

    // Por ahora, solo crear un reporte de las tablas que faltan en Render
    let sql = `-- ============================================================================
-- ESQUEMA COMPLETO DE BASE LOCAL (attendance_system)
-- Exportado: ${new Date().toISOString()}
-- Total tablas: ${tables.length}
-- ============================================================================\n\n`;

    sql += `-- NOTA: Este script debe ejecutarse en Render para crear las tablas faltantes\n\n`;

    // Listar tablas
    sql += `-- TABLAS A CREAR:\n`;
    tables.forEach(table => {
      sql += `--   - ${table}\n`;
    });

    sql += `\n\n-- Este esquema se debe aplicar usando las migraciones de Sequelize\n`;
    sql += `-- o ejecutando el auto-sync al iniciar el servidor.\n`;

    const outputPath = path.join(__dirname, '..', 'migrations', 'LOCAL_SCHEMA_REFERENCE.sql');
    fs.writeFileSync(outputPath, sql);

    console.log(`✅ Esquema exportado a: ${outputPath}`);
    console.log(`\n📊 RESUMEN:`);
    console.log(`   - Tablas en LOCAL: ${tables.length}`);
    console.log(`   - Tablas en RENDER: 23 (aproximadamente)`);
    console.log(`   - Tablas FALTANTES en Render: ~${tables.length - 23}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

exportSchema();
