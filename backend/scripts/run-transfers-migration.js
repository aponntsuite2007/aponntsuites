/**
 * Script para ejecutar migración de transferencias y trazabilidad
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');

async function run() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        await client.connect();
        console.log('🔄 Ejecutando migración de transferencias y trazabilidad...\n');

        const sqlPath = path.join(__dirname, '..', 'migrations', '20251231_wms_transfers_traceability.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sql);

        console.log('✅ Migración completada\n');

        // Verificar tablas creadas
        const tables = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'wms_transfers', 'wms_transfer_lines', 'wms_stock_reservations',
                'wms_product_lifecycle', 'wms_expiry_alerts', 'wms_fifo_violations',
                'wms_monitoring_config', 'wms_sales_fifo_allocation'
            )
            ORDER BY table_name
        `);

        console.log('📋 Tablas creadas:');
        tables.rows.forEach(t => console.log('   ✓', t.table_name));

        // Verificar funciones
        const funcs = await client.query(`
            SELECT routine_name FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name LIKE 'wms_%'
            ORDER BY routine_name
        `);

        console.log('\n📋 Funciones WMS:');
        funcs.rows.forEach(f => console.log('   ✓', f.routine_name));

        // Verificar vista
        const views = await client.query(`
            SELECT table_name FROM information_schema.views
            WHERE table_schema = 'public'
            AND table_name LIKE 'wms_%'
        `);

        console.log('\n📋 Vistas WMS:');
        views.rows.forEach(v => console.log('   ✓', v.table_name));

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.position) {
            console.error('   Posición:', error.position);
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
