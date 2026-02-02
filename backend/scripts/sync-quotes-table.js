/**
 * Sincronizar tabla quotes de Local a Render
 */
const { Pool } = require('pg');

const localPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

const renderPool = new Pool({
    connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com:5432/attendance_system_866u',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000
});

async function getTableColumns(pool, tableName) {
    const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default,
               character_maximum_length, numeric_precision
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
    `, [tableName]);
    return result.rows;
}

async function main() {
    console.log('=== SINCRONIZACIÓN TABLA quotes ===\n');

    try {
        // 1. Obtener estructura local
        console.log('1. Obteniendo estructura LOCAL...');
        const localColumns = await getTableColumns(localPool, 'quotes');
        console.log(`   Columnas en LOCAL: ${localColumns.length}`);

        // 2. Obtener estructura Render
        console.log('\n2. Conectando a Render...');
        let renderColumns = [];
        try {
            renderColumns = await getTableColumns(renderPool, 'quotes');
            console.log(`   Columnas en RENDER: ${renderColumns.length}`);
        } catch (e) {
            console.log('   Error conectando a Render:', e.message);
            // Intentar con retry
            await new Promise(r => setTimeout(r, 3000));
            renderColumns = await getTableColumns(renderPool, 'quotes');
            console.log(`   Columnas en RENDER (retry): ${renderColumns.length}`);
        }

        // 3. Comparar
        console.log('\n3. Comparando estructuras...');
        const localColNames = new Set(localColumns.map(c => c.column_name));
        const renderColNames = new Set(renderColumns.map(c => c.column_name));

        const missingInRender = localColumns.filter(c => !renderColNames.has(c.column_name));
        const extraInRender = renderColumns.filter(c => !localColNames.has(c.column_name));

        console.log(`\n   Columnas faltantes en RENDER: ${missingInRender.length}`);
        missingInRender.forEach(c => console.log(`   - ${c.column_name} (${c.data_type})`));

        if (extraInRender.length > 0) {
            console.log(`\n   Columnas extra en RENDER: ${extraInRender.length}`);
            extraInRender.forEach(c => console.log(`   - ${c.column_name}`));
        }

        // 4. Generar y ejecutar ALTER TABLE
        if (missingInRender.length > 0) {
            console.log('\n4. Agregando columnas faltantes a RENDER...');

            for (const col of missingInRender) {
                let dataType = col.data_type;

                // Mapear tipos
                if (dataType === 'character varying') {
                    dataType = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR(255)';
                } else if (dataType === 'integer') {
                    dataType = 'INTEGER';
                } else if (dataType === 'numeric') {
                    dataType = col.numeric_precision ? `NUMERIC(${col.numeric_precision}, 2)` : 'NUMERIC(12,2)';
                } else if (dataType === 'timestamp without time zone') {
                    dataType = 'TIMESTAMP';
                } else if (dataType === 'timestamp with time zone') {
                    dataType = 'TIMESTAMPTZ';
                } else if (dataType === 'boolean') {
                    dataType = 'BOOLEAN';
                } else if (dataType === 'text') {
                    dataType = 'TEXT';
                } else if (dataType === 'jsonb') {
                    dataType = 'JSONB';
                } else if (dataType === 'json') {
                    dataType = 'JSON';
                } else if (dataType === 'ARRAY') {
                    dataType = 'TEXT[]';
                }

                let sql = `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS "${col.column_name}" ${dataType}`;

                // Agregar default si existe
                if (col.column_default) {
                    // Limpiar el default
                    let defaultVal = col.column_default;
                    if (defaultVal.includes('::')) {
                        defaultVal = defaultVal.split('::')[0];
                    }
                    sql += ` DEFAULT ${defaultVal}`;
                }

                console.log(`   Ejecutando: ${sql}`);
                try {
                    await renderPool.query(sql);
                    console.log(`   ✅ ${col.column_name} agregada`);
                } catch (e) {
                    console.log(`   ❌ Error: ${e.message.substring(0, 80)}`);
                }
            }
        }

        // 5. Verificar resultado
        console.log('\n5. Verificando resultado...');
        const finalRenderColumns = await getTableColumns(renderPool, 'quotes');
        console.log(`   Columnas en RENDER ahora: ${finalRenderColumns.length}`);

        // Mostrar todas las columnas
        console.log('\n=== ESTRUCTURA FINAL DE quotes EN RENDER ===');
        finalRenderColumns.forEach(c => {
            console.log(`   ${c.column_name} (${c.data_type})`);
        });

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await localPool.end();
        await renderPool.end();
    }
}

main();
