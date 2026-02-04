const { Client } = require('pg');

async function check() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'attendance_system',
        user: 'postgres',
        password: 'Aedr15150302'
    });
    await client.connect();

    // Ver si la vista existe
    const viewExists = await client.query(`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.views
            WHERE table_name = 'v_modules_by_panel'
        ) as exists
    `);
    console.log('=== VISTA v_modules_by_panel ===');
    console.log('Existe:', viewExists.rows[0].exists);

    if (viewExists.rows[0].exists) {
        // Ver definición de la vista
        const view = await client.query(`
            SELECT pg_get_viewdef('v_modules_by_panel', true) as definition
        `);
        console.log('\n=== DEFINICIÓN ===');
        console.log(view.rows[0]?.definition || 'Sin definición');
    }

    // Verificar si commercial_type existe en system_modules
    const cols = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'system_modules'
        AND column_name LIKE '%commercial%'
    `);
    console.log('\n=== COLUMNAS commercial_* EN system_modules ===');
    console.log(cols.rows.length > 0 ? cols.rows.map(c => c.column_name) : 'NINGUNA');

    // Ver todas las columnas de system_modules
    const allCols = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'system_modules'
        ORDER BY ordinal_position
    `);
    console.log('\n=== TODAS LAS COLUMNAS DE system_modules ===');
    console.log(allCols.rows.map(c => c.column_name).join(', '));

    await client.end();
}

check().catch(e => console.error('Error:', e.message));
