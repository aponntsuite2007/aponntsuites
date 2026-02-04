const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

(async () => {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    const modules = [
        'art-management', 'training-management', 'sanctions-management',
        'vacation-management', 'legal-dashboard', 'medical',
        'payroll-liquidation', 'logistics-dashboard', 'procedures-manual',
        'employee-map', 'marketplace', 'my-procedures', 'audit-reports'
    ];

    console.log('MÓDULOS ACTIVOS PARA EMPRESA 4 (APONNT Demo):\n');

    let activeCount = 0;
    for (const modKey of modules) {
        const result = await client.query(`
            SELECT cm.activo, sm.name
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = 4 AND sm.module_key = $1
        `, [modKey]);

        if (result.rows.length === 0) {
            console.log('❌ ' + modKey + ': NO ACTIVADO');
        } else {
            const isActive = result.rows[0].activo;
            console.log((isActive ? '✅' : '⚠️') + ' ' + modKey + ': ' + (isActive ? 'ACTIVO' : 'INACTIVO'));
            if (isActive) activeCount++;
        }
    }

    const total = await client.query('SELECT COUNT(*) as c FROM company_modules WHERE company_id = 4 AND activo = true');
    console.log('\n📊 ' + activeCount + '/13 módulos del listado activos');
    console.log('📊 Total módulos activos en company_modules: ' + total.rows[0].c);

    client.release();
    await pool.end();
})();
