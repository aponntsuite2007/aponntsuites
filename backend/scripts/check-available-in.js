const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

(async () => {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    // Los 13 módulos faltantes
    const missing = ['art-management', 'training-management', 'sanctions-management',
        'vacation-management', 'legal-dashboard', 'medical', 'payroll-liquidation',
        'logistics-dashboard', 'procedures-manual', 'employee-map', 'marketplace',
        'my-procedures', 'audit-reports'];

    const result = await client.query(`
        SELECT module_key, name, available_in, is_active, is_core, module_type, parent_module_key
        FROM system_modules
        WHERE module_key = ANY($1)
        ORDER BY module_key
    `, [missing]);

    console.log('=== Estado de los 13 módulos en system_modules ===\n');
    result.rows.forEach(r => {
        console.log(`${r.module_key}:`);
        console.log(`  name: "${r.name}"`);
        console.log(`  available_in: ${r.available_in}`);
        console.log(`  is_active: ${r.is_active}`);
        console.log(`  is_core: ${r.is_core}`);
        console.log(`  module_type: ${r.module_type}`);
        console.log(`  parent_module_key: ${r.parent_module_key || 'NULL'}`);
        console.log('');
    });

    // Comparar con un módulo que SÍ funciona (users)
    const working = await client.query(`
        SELECT module_key, name, available_in, is_active, is_core, module_type, parent_module_key
        FROM system_modules
        WHERE module_key = 'users'
    `);
    console.log('\n=== Módulo que SÍ funciona (users) ===\n');
    const u = working.rows[0];
    console.log(`${u.module_key}:`);
    console.log(`  name: "${u.name}"`);
    console.log(`  available_in: ${u.available_in}`);
    console.log(`  is_active: ${u.is_active}`);
    console.log(`  is_core: ${u.is_core}`);
    console.log(`  module_type: ${u.module_type}`);
    console.log(`  parent_module_key: ${u.parent_module_key || 'NULL'}`);

    client.release();
    await pool.end();
})();
