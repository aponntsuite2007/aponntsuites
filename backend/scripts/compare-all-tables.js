const { Pool } = require('pg');

const LOCAL_URL = 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

async function getTables(pool) {
    const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
    `);
    return result.rows.map(r => r.table_name);
}

async function getColumns(pool, tableName) {
    const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY column_name
    `, [tableName]);
    return result.rows;
}

(async () => {
    const localPool = new Pool({ connectionString: LOCAL_URL });
    const renderPool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });

    const localTables = await getTables(localPool);
    const renderTables = await getTables(renderPool);

    const localSet = new Set(localTables);
    const renderSet = new Set(renderTables);

    const missingInRender = localTables.filter(t => !renderSet.has(t));
    const extraInRender = renderTables.filter(t => !localSet.has(t));

    console.log('=== COMPARACIÓN DE TABLAS ===\n');
    console.log(`LOCAL: ${localTables.length} tablas`);
    console.log(`RENDER: ${renderTables.length} tablas\n`);

    if (missingInRender.length > 0) {
        console.log('❌ TABLAS QUE FALTAN EN RENDER:');
        missingInRender.forEach(t => console.log(`   - ${t}`));
    } else {
        console.log('✅ Todas las tablas de LOCAL existen en RENDER\n');
    }

    if (extraInRender.length > 0) {
        console.log('\n📋 Tablas extra en RENDER (no están en local):');
        extraInRender.forEach(t => console.log(`   + ${t}`));
    }

    // Para cada tabla común, verificar columnas FALTANTES en RENDER
    console.log('\n=== COLUMNAS FALTANTES EN RENDER ===\n');
    const commonTables = localTables.filter(t => renderSet.has(t));
    let hasMissingCols = false;

    for (const table of commonTables) {
        const localCols = await getColumns(localPool, table);
        const renderCols = await getColumns(renderPool, table);

        const renderColNames = new Set(renderCols.map(c => c.column_name));
        const missingCols = localCols.filter(c => !renderColNames.has(c.column_name));

        if (missingCols.length > 0) {
            hasMissingCols = true;
            console.log(`❌ ${table}:`);
            missingCols.forEach(c => {
                let sqlType = c.data_type;
                if (sqlType === 'character varying') sqlType = 'VARCHAR(255)';
                if (sqlType === 'timestamp without time zone') sqlType = 'TIMESTAMP';
                if (sqlType === 'timestamp with time zone') sqlType = 'TIMESTAMPTZ';
                if (sqlType === 'integer') sqlType = 'INTEGER';
                if (sqlType === 'boolean') sqlType = 'BOOLEAN';
                if (sqlType === 'text') sqlType = 'TEXT';
                if (sqlType === 'uuid') sqlType = 'UUID';
                if (sqlType === 'jsonb') sqlType = 'JSONB';
                if (sqlType === 'numeric') sqlType = 'NUMERIC';
                console.log(`   ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${c.column_name} ${sqlType};`);
            });
        }
    }

    if (!hasMissingCols) {
        console.log('✅ No hay columnas faltantes en RENDER');
    }

    await localPool.end();
    await renderPool.end();
})();
