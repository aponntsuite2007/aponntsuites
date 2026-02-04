const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

(async () => {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    const missing = ['art-management', 'training-management', 'sanctions-management',
        'vacation-management', 'legal-dashboard', 'medical', 'payroll-liquidation',
        'logistics-dashboard', 'procedures-manual', 'employee-map', 'marketplace',
        'my-procedures', 'audit-reports'];

    // Verificar activo vs is_active para company_id=4 (APONNT Demo)
    const result = await client.query(`
        SELECT sm.module_key, cm.is_active, cm.activo
        FROM company_modules cm
        JOIN system_modules sm ON cm.system_module_id = sm.id
        WHERE cm.company_id = 4 AND sm.module_key = ANY($1)
        ORDER BY sm.module_key
    `, [missing]);

    console.log('=== Comparación is_active vs activo para los 13 módulos (APONNT Demo) ===\n');
    result.rows.forEach(r => {
        const icon = (r.is_active === true && r.activo === true) ? '✅' : '❌';
        console.log(`${icon} ${r.module_key}: is_active=${r.is_active}, activo=${r.activo}`);
    });

    // Cuántos tienen activo=true
    const activoCount = result.rows.filter(r => r.activo === true).length;
    const isActiveCount = result.rows.filter(r => r.is_active === true).length;
    console.log(`\n📊 Resumen: activo=true: ${activoCount}/13, is_active=true: ${isActiveCount}/13`);

    // También verificar con un módulo que SÍ funciona (users)
    const users = await client.query(`
        SELECT sm.module_key, cm.is_active, cm.activo
        FROM company_modules cm
        JOIN system_modules sm ON cm.system_module_id = sm.id
        WHERE cm.company_id = 4 AND sm.module_key = 'users'
    `);
    console.log('\n=== Módulo "users" (que SÍ funciona) ===');
    console.log(`users: is_active=${users.rows[0]?.is_active}, activo=${users.rows[0]?.activo}`);

    client.release();
    await pool.end();
})();
