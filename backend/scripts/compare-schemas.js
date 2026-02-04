const { Pool } = require('pg');

const LOCAL_URL = 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

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

    console.log('=== COMPARANDO TABLAS LOCAL vs PRODUCCIÓN ===\n');

    const mainTables = ['companies', 'users', 'departments', 'system_modules', 'company_modules', 'shifts', 'kiosks', 'branches'];

    const differences = [];

    for (const table of mainTables) {
        try {
            const localCols = await getColumns(localPool, table);
            const renderCols = await getColumns(renderPool, table);

            const localColNames = new Set(localCols.map(c => c.column_name));
            const renderColNames = new Set(renderCols.map(c => c.column_name));

            const onlyLocal = [...localColNames].filter(c => !renderColNames.has(c));
            const onlyRender = [...renderColNames].filter(c => !localColNames.has(c));

            if (onlyLocal.length === 0 && onlyRender.length === 0) {
                console.log(`✅ ${table}: IDÉNTICA (${localCols.length} cols)`);
            } else {
                console.log(`❌ ${table}:`);
                if (onlyLocal.length > 0) {
                    console.log(`   FALTA en RENDER: ${onlyLocal.join(', ')}`);
                    differences.push({ table, missing: onlyLocal });
                }
                if (onlyRender.length > 0) {
                    console.log(`   SOBRA en RENDER: ${onlyRender.join(', ')}`);
                }
            }
        } catch (e) {
            console.log(`⚠️  ${table}: ${e.message.substring(0, 60)}`);
        }
    }

    // Generar SQL para agregar columnas faltantes
    if (differences.length > 0) {
        console.log('\n=== SQL PARA SINCRONIZAR ===\n');
        for (const diff of differences) {
            const localCols = await getColumns(localPool, diff.table);
            for (const colName of diff.missing) {
                const col = localCols.find(c => c.column_name === colName);
                if (col) {
                    let sqlType = col.data_type;
                    if (sqlType === 'character varying') sqlType = 'VARCHAR(255)';
                    if (sqlType === 'timestamp without time zone') sqlType = 'TIMESTAMP';
                    if (sqlType === 'timestamp with time zone') sqlType = 'TIMESTAMPTZ';
                    console.log(`ALTER TABLE ${diff.table} ADD COLUMN IF NOT EXISTS ${colName} ${sqlType};`);
                }
            }
        }
    }

    await localPool.end();
    await renderPool.end();
})();
