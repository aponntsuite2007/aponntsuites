/**
 * Obtener estructura de tabla quotes local
 */
const { Pool } = require('pg');

const localPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function main() {
    try {
        const result = await localPool.query(`
            SELECT column_name, data_type, is_nullable, column_default,
                   character_maximum_length, numeric_precision, numeric_scale
            FROM information_schema.columns
            WHERE table_name = 'quotes'
            ORDER BY ordinal_position
        `);

        console.log('=== COLUMNAS DE quotes LOCAL ===\n');
        result.rows.forEach((r, i) => {
            let type = r.data_type;
            if (type === 'character varying' && r.character_maximum_length) {
                type = `VARCHAR(${r.character_maximum_length})`;
            } else if (type === 'numeric' && r.numeric_precision) {
                type = `NUMERIC(${r.numeric_precision},${r.numeric_scale || 0})`;
            }
            console.log(`${String(i+1).padStart(2)}. ${r.column_name.padEnd(30)} ${type.padEnd(20)} ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Generar ALTER TABLE para todas las columnas
        console.log('\n\n=== SQL PARA AGREGAR COLUMNAS FALTANTES ===\n');
        result.rows.forEach(r => {
            let type = r.data_type;
            if (type === 'character varying') {
                type = r.character_maximum_length ? `VARCHAR(${r.character_maximum_length})` : 'VARCHAR(255)';
            } else if (type === 'numeric') {
                type = r.numeric_precision ? `NUMERIC(${r.numeric_precision},${r.numeric_scale || 2})` : 'NUMERIC(12,2)';
            } else if (type === 'timestamp without time zone') {
                type = 'TIMESTAMP';
            } else if (type === 'timestamp with time zone') {
                type = 'TIMESTAMPTZ';
            } else if (type === 'integer') {
                type = 'INTEGER';
            } else if (type === 'bigint') {
                type = 'BIGINT';
            } else if (type === 'boolean') {
                type = 'BOOLEAN';
            } else if (type === 'text') {
                type = 'TEXT';
            } else if (type === 'jsonb') {
                type = 'JSONB';
            } else if (type === 'json') {
                type = 'JSON';
            } else if (type === 'ARRAY') {
                type = 'TEXT[]';
            }

            let defaultVal = '';
            if (r.column_default) {
                let def = r.column_default;
                if (def.includes('::')) {
                    def = def.split('::')[0];
                }
                defaultVal = ` DEFAULT ${def}`;
            }

            console.log(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS "${r.column_name}" ${type}${defaultVal};`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await localPool.end();
    }
}

main();
