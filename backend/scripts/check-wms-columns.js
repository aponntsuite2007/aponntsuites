/**
 * Verificar qué tablas WMS tienen company_id
 */
const { Pool } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

async function check() {
    const pool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        // Buscar todas las tablas WMS
        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_name LIKE 'wms_%' AND table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('  VERIFICACIÓN DE company_id EN TABLAS WMS');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        for (const t of tables.rows) {
            const hasCompanyId = await client.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = $1 AND column_name = 'company_id'
            `, [t.table_name]);

            const status = hasCompanyId.rows.length > 0 ? '✅' : '❌';
            console.log(`${status} ${t.table_name}`);
        }

        // Verificar tablas específicas usadas en getDashboardStats
        console.log('\n📊 Tablas usadas en getDashboardStats:');

        const statsQueries = [
            { table: 'wms_products', col: 'company_id' },
            { table: 'wms_branches', col: 'company_id' },
            { table: 'wms_warehouses', col: 'company_id' },
            { table: 'wms_stock', col: 'unit_cost' },
            { table: 'wms_promotions', col: 'company_id' },
            { table: 'wms_price_lists', col: 'company_id' },
        ];

        for (const q of statsQueries) {
            const hasCol = await client.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = $1 AND column_name = $2
            `, [q.table, q.col]);

            const status = hasCol.rows.length > 0 ? '✅' : '❌';
            console.log(`${status} ${q.table}.${q.col}`);
        }

    } finally {
        client.release();
        await pool.end();
    }
}

check();
