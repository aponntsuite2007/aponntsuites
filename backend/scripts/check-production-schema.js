/**
 * Script para verificar qué columnas y tablas faltan en producción
 * Comparar esquema de producción vs lo que necesita el sistema
 */

const { Pool } = require('pg');

const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

async function checkSchema() {
    const pool = new Pool({
        connectionString: RENDER_URL,
        ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    try {
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('  ANÁLISIS DE ESQUEMA EN PRODUCCIÓN (RENDER)');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        // 1. Verificar tablas de Warehouse (WMS)
        console.log('📦 WAREHOUSE MANAGEMENT (WMS)\n');

        const wmsTables = ['wms_products', 'wms_warehouses', 'wms_locations', 'wms_movements', 'wms_inventory'];

        for (const table of wmsTables) {
            const exists = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = $1
                )
            `, [table]);

            if (exists.rows[0].exists) {
                console.log(`✅ Tabla ${table} EXISTE`);

                // Ver columnas
                const columns = await client.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [table]);

                const colNames = columns.rows.map(c => c.column_name);
                console.log(`   Columnas: ${colNames.join(', ')}`);

                // Verificar columnas críticas
                if (table === 'wms_products') {
                    const hasCompanyId = colNames.includes('company_id');
                    const hasUnitCost = colNames.includes('unit_cost');
                    console.log(`   ⚠️  company_id: ${hasCompanyId ? '✅' : '❌ FALTA'}`);
                    console.log(`   ⚠️  unit_cost: ${hasUnitCost ? '✅' : '❌ FALTA'}`);
                }
                if (table === 'wms_warehouses') {
                    const hasCompanyId = colNames.includes('company_id');
                    console.log(`   ⚠️  company_id: ${hasCompanyId ? '✅' : '❌ FALTA'}`);
                }
                if (table === 'wms_movements') {
                    const hasCompanyId = colNames.includes('company_id');
                    console.log(`   ⚠️  company_id: ${hasCompanyId ? '✅' : '❌ FALTA'}`);
                }
            } else {
                console.log(`❌ Tabla ${table} NO EXISTE`);
            }
            console.log('');
        }

        // 2. Verificar tablas de Finanzas
        console.log('\n💰 FINANZAS\n');

        const financeTables = ['payment_orders', 'invoices', 'budgets', 'financial_transactions'];

        for (const table of financeTables) {
            const exists = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = $1
                )
            `, [table]);

            if (exists.rows[0].exists) {
                console.log(`✅ Tabla ${table} EXISTE`);
                const columns = await client.query(`
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name = $1 ORDER BY ordinal_position
                `, [table]);
                console.log(`   Columnas: ${columns.rows.map(c => c.column_name).join(', ')}`);
            } else {
                console.log(`❌ Tabla ${table} NO EXISTE`);
            }
        }

        // 3. Verificar v_modules_by_panel
        console.log('\n\n📊 VISTA v_modules_by_panel\n');

        const viewExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM pg_views WHERE viewname = 'v_modules_by_panel'
            )
        `);

        if (viewExists.rows[0].exists) {
            console.log('✅ Vista v_modules_by_panel EXISTE');

            // Ver definición
            const viewDef = await client.query(`
                SELECT definition FROM pg_views WHERE viewname = 'v_modules_by_panel'
            `);
            console.log('\nDefinición:');
            console.log(viewDef.rows[0].definition);

            // Ver columnas
            const viewCols = await client.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'v_modules_by_panel'
            `);
            console.log('\nColumnas:', viewCols.rows.map(c => c.column_name).join(', '));
        } else {
            console.log('❌ Vista v_modules_by_panel NO EXISTE');
        }

        // 4. Verificar system_modules
        console.log('\n\n🔧 system_modules\n');

        const smColumns = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'system_modules'
            ORDER BY ordinal_position
        `);

        console.log('Columnas:');
        smColumns.rows.forEach(c => console.log(`   - ${c.column_name} (${c.data_type})`));

        // Verificar si tiene show_as_card y target_panel
        const colNames = smColumns.rows.map(c => c.column_name);
        console.log(`\n⚠️  show_as_card: ${colNames.includes('show_as_card') ? '✅' : '❌ FALTA'}`);
        console.log(`⚠️  target_panel: ${colNames.includes('target_panel') ? '✅' : '❌ FALTA'}`);

        // 5. Ver los 13 módulos faltantes en v_modules_by_panel
        console.log('\n\n🔍 VERIFICACIÓN DE LOS 13 MÓDULOS FALTANTES\n');

        const missingModules = [
            'art-management', 'training-management', 'sanctions-management',
            'vacation-management', 'legal-dashboard', 'medical',
            'payroll-liquidation', 'logistics-dashboard', 'procedures-manual',
            'employee-map', 'marketplace', 'my-procedures', 'audit-reports'
        ];

        for (const modKey of missingModules) {
            // Verificar en system_modules
            const inSystem = await client.query(`
                SELECT id, module_key, name, is_active FROM system_modules WHERE module_key = $1
            `, [modKey]);

            if (inSystem.rows.length > 0) {
                const mod = inSystem.rows[0];
                console.log(`✅ ${modKey}: en system_modules (id=${mod.id}, active=${mod.is_active})`);

                // Verificar en v_modules_by_panel
                const inView = await client.query(`
                    SELECT module_key, target_panel, show_as_card
                    FROM v_modules_by_panel
                    WHERE module_key = $1
                `, [modKey]);

                if (inView.rows.length > 0) {
                    const v = inView.rows[0];
                    console.log(`   → En vista: target_panel=${v.target_panel}, show_as_card=${v.show_as_card}`);
                } else {
                    console.log(`   ❌ NO está en v_modules_by_panel`);
                }
            } else {
                console.log(`❌ ${modKey}: NO existe en system_modules`);
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('  FIN DEL ANÁLISIS');
        console.log('═══════════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema();
