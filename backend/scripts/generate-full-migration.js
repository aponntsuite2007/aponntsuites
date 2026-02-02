/**
 * Generar migración completa de todas las tablas
 * Obtiene estructura local y genera SQL para Render
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function main() {
    console.log('Generando migración completa...\n');

    // Obtener todas las columnas de todas las tablas
    const result = await pool.query(`
        SELECT
            table_name,
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
    `);

    console.log(`Total columnas: ${result.rows.length}`);

    // Agrupar por tabla
    const tables = {};
    result.rows.forEach(col => {
        if (!tables[col.table_name]) {
            tables[col.table_name] = [];
        }
        tables[col.table_name].push(col);
    });

    console.log(`Total tablas: ${Object.keys(tables).length}`);

    // Generar SQL de ALTER TABLE para cada columna
    const migrations = [];

    for (const [tableName, columns] of Object.entries(tables)) {
        for (const col of columns) {
            let dataType = col.data_type;

            // Mapear tipos
            if (dataType === 'character varying') {
                dataType = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR(255)';
            } else if (dataType === 'numeric') {
                dataType = col.numeric_precision ? `NUMERIC(${col.numeric_precision},${col.numeric_scale || 0})` : 'NUMERIC(12,2)';
            } else if (dataType === 'timestamp without time zone') {
                dataType = 'TIMESTAMP';
            } else if (dataType === 'timestamp with time zone') {
                dataType = 'TIMESTAMPTZ';
            } else if (dataType === 'integer') {
                dataType = 'INTEGER';
            } else if (dataType === 'bigint') {
                dataType = 'BIGINT';
            } else if (dataType === 'smallint') {
                dataType = 'SMALLINT';
            } else if (dataType === 'boolean') {
                dataType = 'BOOLEAN';
            } else if (dataType === 'text') {
                dataType = 'TEXT';
            } else if (dataType === 'jsonb') {
                dataType = 'JSONB';
            } else if (dataType === 'json') {
                dataType = 'JSON';
            } else if (dataType === 'uuid') {
                dataType = 'UUID';
            } else if (dataType === 'date') {
                dataType = 'DATE';
            } else if (dataType === 'time without time zone') {
                dataType = 'TIME';
            } else if (dataType === 'double precision') {
                dataType = 'DOUBLE PRECISION';
            } else if (dataType === 'real') {
                dataType = 'REAL';
            } else if (dataType === 'bytea') {
                dataType = 'BYTEA';
            } else if (dataType === 'ARRAY') {
                dataType = 'TEXT[]';
            } else if (dataType === 'USER-DEFINED') {
                dataType = 'TEXT'; // Fallback for enums etc
            }

            let defaultVal = '';
            if (col.column_default && !col.column_default.includes('nextval')) {
                let def = col.column_default;
                if (def.includes('::')) {
                    def = def.split('::')[0];
                }
                defaultVal = ` DEFAULT ${def}`;
            }

            migrations.push(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${dataType}${defaultVal}`);
        }
    }

    console.log(`Total migraciones generadas: ${migrations.length}`);

    // Guardar en archivo JSON para enviar al endpoint
    const outputPath = path.join(__dirname, 'full-migration-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(migrations, null, 2));
    console.log(`\nGuardado en: ${outputPath}`);

    // También crear archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', 'full-sync-migration.sql');
    fs.writeFileSync(sqlPath, migrations.join(';\n') + ';');
    console.log(`SQL guardado en: ${sqlPath}`);

    await pool.end();

    // Mostrar estadísticas
    console.log('\n=== ESTADÍSTICAS ===');
    console.log(`Tablas: ${Object.keys(tables).length}`);
    console.log(`Columnas totales: ${result.rows.length}`);
    console.log(`Statements SQL: ${migrations.length}`);
}

main().catch(console.error);
