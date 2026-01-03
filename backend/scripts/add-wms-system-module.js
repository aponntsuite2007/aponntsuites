/**
 * Script para agregar warehouse-management a system_modules y asignarlo a ISI
 */

const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function addWarehouseModule() {
    console.log('🏭 Agregando módulo warehouse-management al sistema...\n');

    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL');

        // 1. Verificar si ya existe en system_modules
        const existing = await client.query(
            "SELECT id FROM system_modules WHERE module_key = 'warehouse-management'"
        );

        let systemModuleId;

        if (existing.rows.length > 0) {
            systemModuleId = existing.rows[0].id;
            console.log('⚠️ Módulo ya existe en system_modules, ID:', systemModuleId);
        } else {
            // Insertar en system_modules
            const metadata = JSON.stringify({
                frontend_file: "js/modules/warehouse-management.js",
                init_function: "showWarehouseManagementContent"
            });

            const insertResult = await client.query(`
                INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, module_type, metadata, created_at, updated_at)
                VALUES (
                    gen_random_uuid(),
                    'warehouse-management',
                    'Gestión de Almacenes',
                    'Sistema completo de gestión de almacenes, depósitos, productos, precios, promociones y stock. Multi-sucursal, multi-moneda, con soporte de lotes y vencimientos.',
                    'warehouse',
                    '#6366f1',
                    'additional',
                    0,
                    true,
                    'standalone',
                    $1::jsonb,
                    NOW(),
                    NOW()
                )
                RETURNING id
            `, [metadata]);

            systemModuleId = insertResult.rows[0].id;
            console.log('✅ Módulo insertado en system_modules, ID:', systemModuleId);
        }

        // 2. Verificar si ISI (company_id=11) ya tiene el módulo
        const existingAssignment = await client.query(
            "SELECT id FROM company_modules WHERE company_id = 11 AND system_module_id = $1",
            [systemModuleId]
        );

        if (existingAssignment.rows.length > 0) {
            console.log('⚠️ ISI ya tiene asignado el módulo');
        } else {
            // Asignar a ISI
            await client.query(`
                INSERT INTO company_modules (company_id, system_module_id, activo, created_at)
                VALUES (11, $1, true, NOW())
            `, [systemModuleId]);
            console.log('✅ Módulo asignado a ISI exitosamente');
        }

        // 3. Verificar resultado final
        const verify = await client.query(`
            SELECT sm.name, sm.module_key, cm.activo
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = 11 AND sm.module_key = 'warehouse-management'
        `);

        if (verify.rows.length > 0) {
            console.log('\n🔍 Verificación final:');
            console.log('   Módulo:', verify.rows[0].name);
            console.log('   Key:', verify.rows[0].module_key);
            console.log('   Activo:', verify.rows[0].activo);
            console.log('\n✅ ¡Configuración completada!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

addWarehouseModule();
