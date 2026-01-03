/**
 * Script para ejecutar las migraciones avanzadas del WMS
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');

async function runMigrations() {
    console.log('🏭 [WMS] Ejecutando migraciones avanzadas...\n');

    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL\n');

        // Migración 1: Advanced Features
        console.log('📦 [1/2] Ejecutando WMS Advanced Features...');
        const advancedPath = path.join(__dirname, '..', 'migrations', '20251231_wms_advanced_features.sql');

        if (fs.existsSync(advancedPath)) {
            const advancedSQL = fs.readFileSync(advancedPath, 'utf8');
            await client.query(advancedSQL);
            console.log('✅ WMS Advanced Features completado\n');
        } else {
            console.log('⚠️ Archivo de migración advanced no encontrado\n');
        }

        // Migración 2: Enterprise Features
        console.log('📦 [2/2] Ejecutando WMS Enterprise Features...');
        const enterprisePath = path.join(__dirname, '..', 'migrations', '20251231_wms_enterprise_features.sql');

        if (fs.existsSync(enterprisePath)) {
            const enterpriseSQL = fs.readFileSync(enterprisePath, 'utf8');
            await client.query(enterpriseSQL);
            console.log('✅ WMS Enterprise Features completado\n');
        } else {
            console.log('⚠️ Archivo de migración enterprise no encontrado\n');
        }

        // Verificar tablas creadas
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'wms_%'
            ORDER BY table_name
        `);

        console.log('═══════════════════════════════════════════════════════════════════');
        console.log(`📊 Total tablas WMS: ${result.rows.length}`);
        console.log('═══════════════════════════════════════════════════════════════════');

        // Agrupar por categoría
        const categories = {
            'Core': ['wms_warehouses', 'wms_zones', 'wms_locations', 'wms_products', 'wms_stock'],
            'Inventory': ['wms_batches', 'wms_stock_movements', 'wms_inventory_'],
            'Traceability': ['wms_traceability', 'wms_serial', 'wms_catch_weight'],
            'Pricing': ['wms_price', 'wms_promotion', 'wms_cost'],
            'Analytics': ['wms_rotation', 'wms_abc', 'wms_anomaly', 'wms_kpi', 'wms_demand'],
            'Replenishment': ['wms_replenishment'],
            'Quality': ['wms_qc'],
            'Returns': ['wms_return'],
            'Labor': ['wms_labor', 'wms_slotting'],
            'Dock/Yard': ['wms_dock', 'wms_yard'],
            'Automation': ['wms_automation', 'wms_wave', 'wms_crossdock'],
            'Kit/Pack': ['wms_kit', 'wms_assembly', 'wms_carton', 'wms_packing'],
            'Approval': ['wms_approval'],
            'Config': ['wms_conservation', 'wms_sensor', 'wms_adjustment']
        };

        for (const [category, prefixes] of Object.entries(categories)) {
            const tables = result.rows.filter(r =>
                prefixes.some(p => r.table_name.startsWith(p) || r.table_name.includes(p))
            );
            if (tables.length > 0) {
                console.log(`\n📁 ${category}:`);
                tables.forEach(t => console.log(`   ✓ ${t.table_name}`));
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('✅ Migraciones WMS completadas exitosamente');
        console.log('═══════════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        if (error.position) {
            console.error('   Posición del error:', error.position);
        }
        if (error.detail) {
            console.error('   Detalle:', error.detail);
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigrations();
