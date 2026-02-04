/**
 * Verificar qué módulos retorna la API para empresa 4
 * Simula lo que hace el frontend
 */
const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

async function check() {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        // Query que usa el frontend para obtener módulos de empresa
        // Similar a /api/companies/:id/modules
        const result = await client.query(`
            SELECT
                sm.module_key,
                sm.name,
                sm.icon,
                sm.description,
                cm.activo,
                vmp.target_panel,
                vmp.show_as_card
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            LEFT JOIN v_modules_by_panel vmp ON vmp.module_key = sm.module_key
            WHERE cm.company_id = 4
              AND cm.activo = true
              AND vmp.target_panel = 'panel-empresa'
              AND vmp.show_as_card = true
            ORDER BY sm.name
        `);

        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('  MÓDULOS QUE DEBERÍA MOSTRAR EL DASHBOARD (EMPRESA 4)');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        console.log(`Total: ${result.rows.length} módulos\n`);

        // Los 13 que buscamos
        const target = [
            'art-management', 'training-management', 'sanctions-management',
            'vacation-management', 'legal-dashboard', 'medical',
            'payroll-liquidation', 'logistics-dashboard', 'procedures-manual',
            'employee-map', 'marketplace', 'my-procedures', 'audit-reports'
        ];

        console.log('TODOS LOS MÓDULOS RETORNADOS:');
        result.rows.forEach((r, i) => {
            const isTarget = target.includes(r.module_key);
            console.log(`${String(i+1).padStart(2)}. ${isTarget ? '🎯' : '  '} ${r.module_key} → "${r.name}"`);
        });

        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('  VERIFICACIÓN DE LOS 13 MÓDULOS BUSCADOS');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        for (const key of target) {
            const found = result.rows.find(r => r.module_key === key);
            if (found) {
                console.log(`✅ ${key} → "${found.name}"`);
            } else {
                console.log(`❌ ${key} → NO APARECE EN LA QUERY`);
            }
        }

    } finally {
        client.release();
        await pool.end();
    }
}

check();
