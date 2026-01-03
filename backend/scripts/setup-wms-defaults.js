/**
 * Script para configurar datos por defecto del WMS
 * - Crea sucursal "Central" para empresas que no tienen
 * - Crea almacén "Depósito 1" para empresas con WMS activo
 *
 * Respeta arquitectura multi-tenant:
 * Company (1) → Branches (N) → Warehouses (N)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');

async function setupWMSDefaults() {
    console.log('🏭 [WMS] Configurando datos por defecto...\n');

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

        // 1. Encontrar empresas con WMS activo pero sin sucursales
        console.log('📋 Buscando empresas con WMS activo...');

        const companiesWithWMS = await client.query(`
            SELECT c.company_id as id, c.name, c.slug
            FROM companies c
            WHERE c.is_active = true
            AND (
                c.active_modules::text LIKE '%warehouse-management%'
                OR EXISTS (
                    SELECT 1 FROM company_modules cm
                    JOIN system_modules sm ON cm.system_module_id = sm.id
                    WHERE cm.company_id = c.company_id
                    AND sm.module_key = 'warehouse-management'
                    AND cm.is_active = true
                )
            )
        `);

        console.log(`   Encontradas: ${companiesWithWMS.rows.length} empresas con WMS\n`);

        for (const company of companiesWithWMS.rows) {
            console.log(`\n═══════════════════════════════════════════════════════════════`);
            console.log(`🏢 Procesando: ${company.name} (ID: ${company.id})`);
            console.log(`═══════════════════════════════════════════════════════════════`);

            // Verificar si tiene sucursal
            const branchCheck = await client.query(
                'SELECT id, name FROM wms_branches WHERE company_id = $1',
                [company.id]
            );

            let branchId;

            if (branchCheck.rows.length === 0) {
                // Crear sucursal Central
                console.log('   📍 Creando sucursal "Central"...');

                const branchResult = await client.query(`
                    INSERT INTO wms_branches (
                        company_id, code, name, address, city, state_province,
                        country_id, is_headquarters, is_active, created_at, updated_at
                    ) VALUES (
                        $1, 'CENTRAL', 'Central', 'Dirección Principal', 'Ciudad', 'Provincia',
                        1, true, true, NOW(), NOW()
                    ) RETURNING id
                `, [company.id]);

                branchId = branchResult.rows[0].id;
                console.log(`   ✅ Sucursal Central creada (ID: ${branchId})`);
            } else {
                branchId = branchCheck.rows[0].id;
                console.log(`   ✓ Ya tiene sucursal: ${branchCheck.rows[0].name} (ID: ${branchId})`);
            }

            // Verificar si tiene almacén
            const warehouseCheck = await client.query(
                'SELECT id, name FROM wms_warehouses WHERE branch_id = $1',
                [branchId]
            );

            if (warehouseCheck.rows.length === 0) {
                // Crear almacén Depósito 1
                console.log('   🏭 Creando almacén "Depósito 1"...');

                const warehouseResult = await client.query(`
                    INSERT INTO wms_warehouses (
                        branch_id, code, name, warehouse_type, rotation_policy,
                        track_batches, track_serial_numbers, track_expiry,
                        allows_negative_stock, is_active, created_at, updated_at
                    ) VALUES (
                        $1, 'DEP-001', 'Depósito 1', 'general', 'FIFO',
                        true, false, true,
                        false, true, NOW(), NOW()
                    ) RETURNING id
                `, [branchId]);

                const warehouseId = warehouseResult.rows[0].id;
                console.log(`   ✅ Almacén Depósito 1 creado (ID: ${warehouseId})`);

                // Crear zona por defecto
                console.log('   📦 Creando zona "General"...');

                const zoneResult = await client.query(`
                    INSERT INTO wms_warehouse_zones (
                        warehouse_id, code, name, zone_type, is_active,
                        created_at
                    ) VALUES (
                        $1, 'GENERAL', 'Zona General', 'storage', true,
                        NOW()
                    ) RETURNING id
                `, [warehouseId]);

                const zoneId = zoneResult.rows[0].id;
                console.log(`   ✅ Zona General creada (ID: ${zoneId})`);

                // Crear ubicación por defecto
                console.log('   📍 Creando ubicación "A-01-01"...');

                await client.query(`
                    INSERT INTO wms_locations (
                        zone_id, code, name, aisle, rack, level, position,
                        location_type, max_weight_kg, is_active,
                        created_at
                    ) VALUES (
                        $1, 'A-01-01', 'Ubicación A-01-01', 'A', '01', '01', '01',
                        'rack', 1000.00, true,
                        NOW()
                    )
                `, [zoneId]);

                console.log(`   ✅ Ubicación A-01-01 creada`);

            } else {
                console.log(`   ✓ Ya tiene almacén: ${warehouseCheck.rows[0].name}`);
            }
        }

        // 2. Resumen final
        console.log('\n\n═══════════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN FINAL');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const summary = await client.query(`
            SELECT
                c.company_id,
                c.name as company_name,
                COUNT(DISTINCT b.id) as branches,
                COUNT(DISTINCT w.id) as warehouses,
                COUNT(DISTINCT z.id) as zones,
                COUNT(DISTINCT l.id) as locations
            FROM companies c
            LEFT JOIN wms_branches b ON b.company_id = c.company_id
            LEFT JOIN wms_warehouses w ON w.branch_id = b.id
            LEFT JOIN wms_warehouse_zones z ON z.warehouse_id = w.id
            LEFT JOIN wms_locations l ON l.zone_id = z.id
            WHERE c.is_active = true
            AND (
                c.active_modules::text LIKE '%warehouse-management%'
                OR EXISTS (
                    SELECT 1 FROM company_modules cm
                    JOIN system_modules sm ON cm.system_module_id = sm.id
                    WHERE cm.company_id = c.company_id
                    AND sm.module_key = 'warehouse-management'
                    AND cm.is_active = true
                )
            )
            GROUP BY c.company_id, c.name
            ORDER BY c.name
        `);

        console.log('Empresa                          | Sucursales | Almacenes | Zonas | Ubicaciones');
        console.log('─────────────────────────────────────────────────────────────────────────────────');

        for (const row of summary.rows) {
            const name = row.company_name.padEnd(32);
            console.log(`${name} | ${row.branches.toString().padStart(10)} | ${row.warehouses.toString().padStart(9)} | ${row.zones.toString().padStart(5)} | ${row.locations.toString().padStart(11)}`);
        }

        console.log('\n✅ Configuración de datos por defecto completada');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.detail) console.error('   Detalle:', error.detail);
        process.exit(1);
    } finally {
        await client.end();
    }
}

setupWMSDefaults();
