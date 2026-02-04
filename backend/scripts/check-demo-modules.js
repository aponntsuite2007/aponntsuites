/**
 * Verificar si los 13 módulos están activados para APONNT Demo
 */
const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

async function check() {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        // Buscar APONNT Demo
        const demo = await client.query(`
            SELECT company_id, name FROM companies WHERE name ILIKE '%aponnt demo%' OR name ILIKE '%demo%'
        `);
        console.log('Empresa APONNT Demo:', demo.rows);

        if (demo.rows.length === 0) {
            console.log('❌ No se encontró empresa demo');
            return;
        }

        const companyId = demo.rows[0].company_id;
        console.log(`\nCompany ID: ${companyId}\n`);

        // Verificar los 13 módulos faltantes
        const modules = [
            'art-management', 'training-management', 'sanctions-management',
            'vacation-management', 'legal-dashboard', 'medical',
            'payroll-liquidation', 'logistics-dashboard', 'procedures-manual',
            'employee-map', 'marketplace', 'my-procedures', 'audit-reports'
        ];

        console.log('═══════════════════════════════════════════════════════════════════');
        console.log(`  ESTADO DE LOS 13 MÓDULOS PARA EMPRESA ${companyId}`);
        console.log('═══════════════════════════════════════════════════════════════════\n');

        let activatedCount = 0;

        for (const modKey of modules) {
            // Buscar el system_module_id
            const sm = await client.query(`
                SELECT id, module_key, name FROM system_modules WHERE module_key = $1
            `, [modKey]);

            if (sm.rows.length === 0) {
                console.log(`❌ ${modKey}: No existe en system_modules`);
                continue;
            }

            const moduleId = sm.rows[0].id;

            // Verificar si está en company_modules
            const cm = await client.query(`
                SELECT id, activo, contracted_at FROM company_modules
                WHERE company_id = $1 AND system_module_id = $2
            `, [companyId, moduleId]);

            if (cm.rows.length === 0) {
                console.log(`❌ ${modKey}: NO está en company_modules`);
            } else {
                const status = cm.rows[0].activo ? '✅ ACTIVO' : '⚠️ INACTIVO';
                console.log(`${cm.rows[0].activo ? '✅' : '⚠️'} ${modKey}: ${status}`);
                if (cm.rows[0].activo) activatedCount++;
            }
        }

        console.log(`\n📊 ${activatedCount}/13 módulos activos para la empresa demo`);

        // Ver total de módulos activos
        const total = await client.query(`
            SELECT COUNT(*) as count FROM company_modules
            WHERE company_id = $1 AND activo = true
        `, [companyId]);
        console.log(`📊 Total módulos activos: ${total.rows[0].count}`);

    } finally {
        client.release();
        await pool.end();
    }
}

check();
