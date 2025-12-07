#!/usr/bin/env node
/**
 * Registrar módulo MI-ESPACIO como CORE
 */
const { Sequelize } = require('sequelize');

const DB_URL = 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';
const sequelize = new Sequelize(DB_URL, { logging: false });

async function addMiEspacioModule() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL');

        // Insertar módulo mi-espacio como CORE
        await sequelize.query(`
            INSERT INTO system_modules (
                id, module_key, name, description, icon, color, category,
                base_price, is_active, is_core, display_order, version,
                frontend_file, init_function, created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                'mi-espacio',
                'Mi Espacio',
                'Dashboard personal del empleado con acceso a documentos, asistencia, vacaciones y perfil',
                '👤',
                '#667eea',
                'core',
                0,
                true,
                true,
                0,
                '1.0.0',
                'js/modules/mi-espacio.js',
                'showMiEspacioContent',
                NOW(),
                NOW()
            )
            ON CONFLICT (module_key) DO UPDATE SET
                name = EXCLUDED.name,
                is_core = true,
                is_active = true,
                display_order = 0,
                frontend_file = EXCLUDED.frontend_file,
                init_function = EXCLUDED.init_function,
                updated_at = NOW()
            RETURNING id, module_key, name, is_core
        `);

        console.log('✅ Módulo mi-espacio registrado como CORE');

        // Obtener ID del módulo
        const [modules] = await sequelize.query(`
            SELECT id FROM system_modules WHERE module_key = 'mi-espacio'
        `);
        const moduleId = modules[0].id;
        console.log('📦 Module ID:', moduleId);

        // Asignar a TODAS las empresas activas
        const [companies] = await sequelize.query(`
            SELECT company_id, name FROM companies WHERE is_active = true
        `);
        console.log('🏢 Empresas activas:', companies.length);

        let added = 0;
        for (const company of companies) {
            const [exists] = await sequelize.query(`
                SELECT id FROM company_modules
                WHERE company_id = ${company.company_id} AND system_module_id = '${moduleId}'
            `);

            if (exists.length === 0) {
                await sequelize.query(`
                    INSERT INTO company_modules (
                        id, company_id, system_module_id,
                        precio_mensual, activo, is_active, auto_activated,
                        fecha_asignacion, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(),
                        ${company.company_id},
                        '${moduleId}',
                        0, true, true, true,
                        NOW(), NOW(), NOW()
                    )
                `);
                added++;
                console.log('  ✅ Agregado a:', company.name);
            } else {
                console.log('  ⏭️ Ya existe en:', company.name);
            }
        }

        console.log('\n═══════════════════════════════════════');
        console.log('✅ Mi Espacio agregado a', added, 'empresas');
        console.log('═══════════════════════════════════════');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await sequelize.close();
    }
}

addMiEspacioModule();
