/**
 * Verificación rápida de la migración
 */
const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

async function verify() {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('  VERIFICACIÓN POST-MIGRACIÓN');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        // 1. wms_products.unit_cost
        const unitCost = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'wms_products' AND column_name = 'unit_cost'
        `);
        console.log('wms_products.unit_cost:', unitCost.rows.length > 0 ? `✅ ${unitCost.rows[0].data_type}` : '❌');

        // 2. wms_warehouses.company_id
        const whCompanyId = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'wms_warehouses' AND column_name = 'company_id'
        `);
        console.log('wms_warehouses.company_id:', whCompanyId.rows.length > 0 ? `✅ ${whCompanyId.rows[0].data_type}` : '❌');

        // 3-5. Tablas nuevas
        const newTables = ['wms_movements', 'wms_inventory', 'financial_transactions'];
        for (const t of newTables) {
            const exists = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [t]);
            const count = exists.rows[0].exists
                ? (await client.query(`SELECT COUNT(*) as c FROM ${t}`)).rows[0].c
                : 'N/A';
            console.log(`${t}:`, exists.rows[0].exists ? `✅ (${count} rows)` : '❌');
        }

        // 6. marketplace target_panel
        const marketplace = await client.query(`
            SELECT module_key, target_panel, show_as_card
            FROM v_modules_by_panel WHERE module_key = 'marketplace'
        `);
        console.log('\nmarketplace:', marketplace.rows[0]
            ? `target_panel=${marketplace.rows[0].target_panel}, show_as_card=${marketplace.rows[0].show_as_card}`
            : '❌');

        // 7. Los 13 módulos en v_modules_by_panel
        console.log('\n📊 Estado de los 13 módulos en v_modules_by_panel:\n');
        const modules = [
            'art-management', 'training-management', 'sanctions-management',
            'vacation-management', 'legal-dashboard', 'medical',
            'payroll-liquidation', 'logistics-dashboard', 'procedures-manual',
            'employee-map', 'marketplace', 'my-procedures', 'audit-reports'
        ];

        let okCount = 0;
        for (const m of modules) {
            const result = await client.query(`
                SELECT target_panel, show_as_card FROM v_modules_by_panel WHERE module_key = $1
            `, [m]);
            if (result.rows.length > 0) {
                const r = result.rows[0];
                const isOk = r.target_panel === 'panel-empresa' && r.show_as_card === true;
                console.log(`${isOk ? '✅' : '⚠️'} ${m}: ${r.target_panel}, show_as_card=${r.show_as_card}`);
                if (isOk) okCount++;
            } else {
                console.log(`❌ ${m}: NO ENCONTRADO`);
            }
        }

        console.log(`\n📈 ${okCount}/13 módulos correctamente configurados`);

    } finally {
        client.release();
        await pool.end();
    }
}

verify();
