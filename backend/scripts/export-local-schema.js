/**
 * EXPORT LOCAL SCHEMA TO JSON
 *
 * Genera un archivo JSON con todas las columnas del schema local.
 * La otra sesión de Claude (con acceso a Render) puede compararlo.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const LOCAL_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
};

async function main() {
    const client = new Client(LOCAL_CONFIG);

    try {
        await client.connect();
        console.log('✅ Conectado a LOCAL');

        // Query optimizada para evitar join lento
        const result = await client.query(`
            SELECT
                table_name,
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default,
                udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name NOT LIKE 'pg_%'
              AND table_name NOT LIKE '_prisma%'
            ORDER BY table_name, ordinal_position
        `);

        console.log(`📊 ${result.rows.length} columnas encontradas`);

        // Agrupar por tabla
        const schema = {};
        for (const row of result.rows) {
            if (!schema[row.table_name]) {
                schema[row.table_name] = [];
            }
            schema[row.table_name].push({
                column: row.column_name,
                type: row.data_type,
                max_length: row.character_maximum_length || null,
                nullable: row.is_nullable,
                udt_name: row.udt_name
            });
        }

        const output = {
            generated: new Date().toISOString(),
            database: 'LOCAL',
            total_tables: Object.keys(schema).length,
            total_columns: result.rows.length,
            schema: schema
        };

        const outputFile = path.join(__dirname, '..', 'migrations', 'local_schema_export.json');
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`✅ Schema exportado: ${outputFile}`);
        console.log(`   📦 ${Object.keys(schema).length} tablas`);
        console.log(`   📋 ${result.rows.length} columnas`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

main();
