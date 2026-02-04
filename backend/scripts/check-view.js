const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

(async () => {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        // 1. Ver definición de la vista
        const viewDef = await client.query(`
            SELECT pg_get_viewdef('v_modules_by_panel', true) as definition
        `);
        console.log('=== Definición de v_modules_by_panel ===');
        console.log(viewDef.rows[0]?.definition || 'VISTA NO EXISTE');
    } catch (e) {
        console.log('Vista v_modules_by_panel no existe:', e.message);
    }

    // 2. Ver si los 13 módulos aparecen en la vista para company_id=4
    const missing = ['art-management', 'training-management', 'sanctions-management',
        'vacation-management', 'legal-dashboard', 'medical', 'payroll-liquidation',
        'logistics-dashboard', 'procedures-manual', 'employee-map', 'marketplace',
        'my-procedures', 'audit-reports'];

    try {
        const viewCheck = await client.query(`
            SELECT * FROM v_modules_by_panel
            WHERE company_id = 4 AND module_key = ANY($1)
        `, [missing]);

        console.log('\n=== Los 13 módulos en v_modules_by_panel ===');
        console.log(`Encontrados: ${viewCheck.rows.length}/13`);
        viewCheck.rows.forEach(r => {
            console.log(`✅ ${r.module_key}`);
        });
    } catch (e) {
        console.log('\nNo se pudo consultar la vista:', e.message);
    }

    // 3. Verificar metadata.visibility.showAsCard de los 13 módulos
    const metaCheck = await client.query(`
        SELECT module_key,
               metadata->'visibility'->>'showAsCard' as show_as_card,
               metadata->'visibility'->>'panel' as panel,
               metadata->'visibility'->>'scope' as scope
        FROM system_modules
        WHERE module_key = ANY($1)
        ORDER BY module_key
    `, [missing]);

    console.log('\n=== Metadata de los 13 módulos ===');
    metaCheck.rows.forEach(r => {
        console.log(`${r.module_key}: showAsCard=${r.show_as_card}, panel=${r.panel}, scope=${r.scope}`);
    });

    client.release();
    await pool.end();
})();
