const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

(async () => {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    const result = await client.query(`
      SELECT
        vmp.module_key,
        vmp.name
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      INNER JOIN v_modules_by_panel vmp ON vmp.module_key = sm.module_key
      WHERE cm.company_id = 4
        AND cm.activo = true
        AND vmp.target_panel = 'panel-empresa'
        AND vmp.show_as_card = true
      ORDER BY vmp.name ASC
    `);

    console.log('Total módulos retornados por API:', result.rows.length);
    console.log('\n=== COMPARACIÓN TEST vs API ===\n');

    const testModules = [
        { key: 'art-management', testName: 'ART' },
        { key: 'training-management', testName: 'Gestión Capacitaciones' },
        { key: 'sanctions-management', testName: 'Gestión de Sanciones' },
        { key: 'vacation-management', testName: 'Gestión de Vacaciones' },
        { key: 'legal-dashboard', testName: 'Legal' },
        { key: 'medical', testName: 'Gestión Médica' },
        { key: 'payroll-liquidation', testName: 'Liquidación Sueldos' },
        { key: 'logistics-dashboard', testName: 'Logistica Avanzada' },
        { key: 'procedures-manual', testName: 'Manual de Procedimientos' },
        { key: 'employee-map', testName: 'Mapa Empleados' },
        { key: 'marketplace', testName: 'Marketplace' },
        { key: 'my-procedures', testName: 'Mis Procedimientos' },
        { key: 'audit-reports', testName: 'Reportes Auditoría' }
    ];

    testModules.forEach(tm => {
        const apiModule = result.rows.find(r => r.module_key === tm.key);
        if (apiModule) {
            if (apiModule.name === tm.testName) {
                console.log(`✅ ${tm.key}: Test busca "${tm.testName}" = API retorna "${apiModule.name}"`);
            } else {
                console.log(`❌ ${tm.key}: Test busca "${tm.testName}" ≠ API retorna "${apiModule.name}"`);
            }
        } else {
            console.log(`❌ ${tm.key}: NO está en la respuesta de la API`);
        }
    });

    client.release();
    await pool.end();
})();
