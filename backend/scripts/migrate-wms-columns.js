/**
 * Migración de columnas faltantes en tablas WMS
 */
const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

async function migrate() {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('  MIGRACIÓN DE COLUMNAS WMS FALTANTES');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        // 1. wms_stock.unit_cost
        console.log('1️⃣ Agregando unit_cost a wms_stock...');
        try {
            await client.query(`
                ALTER TABLE wms_stock
                ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) DEFAULT 0
            `);
            console.log('   ✅ OK\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // 2. wms_promotions.company_id
        console.log('2️⃣ Agregando company_id a wms_promotions...');
        try {
            await client.query(`
                ALTER TABLE wms_promotions
                ADD COLUMN IF NOT EXISTS company_id INTEGER
            `);
            console.log('   ✅ OK\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // 3. wms_price_lists.company_id
        console.log('3️⃣ Agregando company_id a wms_price_lists...');
        try {
            await client.query(`
                ALTER TABLE wms_price_lists
                ADD COLUMN IF NOT EXISTS company_id INTEGER
            `);
            console.log('   ✅ OK\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // 4. wms_categories.company_id
        console.log('4️⃣ Agregando company_id a wms_categories...');
        try {
            await client.query(`
                ALTER TABLE wms_categories
                ADD COLUMN IF NOT EXISTS company_id INTEGER
            `);
            console.log('   ✅ OK\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // 5. wms_barcode_configs.company_id
        console.log('5️⃣ Agregando company_id a wms_barcode_configs...');
        try {
            await client.query(`
                ALTER TABLE wms_barcode_configs
                ADD COLUMN IF NOT EXISTS company_id INTEGER
            `);
            console.log('   ✅ OK\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // Verificación final
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('  VERIFICACIÓN FINAL');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        const checks = [
            { table: 'wms_stock', col: 'unit_cost' },
            { table: 'wms_promotions', col: 'company_id' },
            { table: 'wms_price_lists', col: 'company_id' },
            { table: 'wms_categories', col: 'company_id' },
            { table: 'wms_barcode_configs', col: 'company_id' },
        ];

        for (const c of checks) {
            const result = await client.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = $1 AND column_name = $2
            `, [c.table, c.col]);

            console.log(`${c.table}.${c.col}: ${result.rows.length > 0 ? '✅' : '❌'}`);
        }

        console.log('\n✅ MIGRACIÓN COMPLETADA');

    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
