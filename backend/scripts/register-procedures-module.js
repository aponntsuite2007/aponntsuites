/**
 * Script para registrar el módulo Manual de Procedimientos
 * y asignarlo a la empresa ISI para testing
 *
 * Ejecutar: node scripts/register-procedures-module.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function registerModule() {
    console.log('🚀 Registrando módulo Manual de Procedimientos...\n');

    const { Client } = require('pg');

    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'attendance_system',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Aedr15150302'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL\n');

        // 1. Verificar si el módulo ya existe
        const checkModule = await client.query(`
            SELECT id FROM system_modules WHERE module_key = 'procedures-manual'
        `);

        let moduleId;

        if (checkModule.rows.length > 0) {
            moduleId = checkModule.rows[0].id;
            console.log('⚠️  Módulo ya existe con ID:', moduleId);
        } else {
            // 2. Crear el módulo en system_modules
            const moduleResult = await client.query(`
                INSERT INTO system_modules (
                    id,
                    module_key,
                    name,
                    description,
                    category,
                    is_core,
                    base_price,
                    version,
                    icon,
                    is_active,
                    display_order,
                    requirements,
                    created_at,
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    'procedures-manual',
                    'Manual de Procedimientos',
                    'Sistema de gestión documental ISO 9001 para procedimientos e instructivos con control de versiones, publicación centralizada y acuse de recibo.',
                    'rrhh',
                    false,
                    0,
                    '1.0.0',
                    'bi-journal-text',
                    true,
                    500,
                    '["notifications-enterprise", "organizational-structure"]'::jsonb,
                    NOW(),
                    NOW()
                )
                RETURNING id
            `);

            moduleId = moduleResult.rows[0].id;
            console.log('✅ Módulo creado con ID:', moduleId);
        }

        // 3. Buscar empresa ISI
        const isiCompany = await client.query(`
            SELECT company_id, name FROM companies
            WHERE LOWER(name) LIKE '%isi%'
               OR LOWER(slug) LIKE '%isi%'
            LIMIT 1
        `);

        if (isiCompany.rows.length === 0) {
            console.log('\n⚠️  No se encontró empresa ISI. Buscando primera empresa activa...');

            const anyCompany = await client.query(`
                SELECT company_id, name FROM companies
                WHERE is_active = true
                ORDER BY company_id
                LIMIT 1
            `);

            if (anyCompany.rows.length === 0) {
                console.log('❌ No hay empresas activas para asignar el módulo');
                return;
            }

            const companyId = anyCompany.rows[0].company_id;
            const companyName = anyCompany.rows[0].name;

            console.log(`\n📋 Asignando módulo a empresa: ${companyName} (ID: ${companyId})`);

            // Verificar si ya tiene el módulo
            const hasModule = await client.query(`
                SELECT 1 FROM company_modules
                WHERE company_id = $1 AND system_module_id = $2
            `, [companyId, moduleId]);

            if (hasModule.rows.length > 0) {
                console.log('⚠️  La empresa ya tiene este módulo asignado');
            } else {
                await client.query(`
                    INSERT INTO company_modules (company_id, system_module_id, is_active, activo, fecha_asignacion, created_at, updated_at)
                    VALUES ($1, $2, true, true, NOW(), NOW(), NOW())
                `, [companyId, moduleId]);
                console.log('✅ Módulo asignado a empresa:', companyName);
            }
        } else {
            const companyId = isiCompany.rows[0].company_id;
            const companyName = isiCompany.rows[0].name;

            console.log(`\n📋 Encontrada empresa ISI: ${companyName} (ID: ${companyId})`);

            // Verificar si ya tiene el módulo
            const hasModule = await client.query(`
                SELECT 1 FROM company_modules
                WHERE company_id = $1 AND system_module_id = $2
            `, [companyId, moduleId]);

            if (hasModule.rows.length > 0) {
                console.log('⚠️  La empresa ISI ya tiene este módulo asignado');
            } else {
                await client.query(`
                    INSERT INTO company_modules (company_id, system_module_id, is_active, activo, fecha_asignacion, created_at, updated_at)
                    VALUES ($1, $2, true, true, NOW(), NOW(), NOW())
                `, [companyId, moduleId]);
                console.log('✅ Módulo asignado a empresa ISI');
            }
        }

        console.log('\n✅ Registro completado');
        console.log('\n📝 Próximos pasos:');
        console.log('   1. Ejecutar migración: node scripts/run-procedures-migration.js');
        console.log('   2. Reiniciar servidor: PORT=9998 npm start');
        console.log('   3. Probar en: http://localhost:9998/panel-empresa.html');

    } catch (error) {
        console.error('❌ Error:', error.message);

        if (error.message.includes('relation "system_modules" does not exist')) {
            console.log('\n⚠️  La tabla system_modules no existe.');
            console.log('   Ejecuta primero las migraciones base del sistema.');
        }
    } finally {
        await client.end();
    }
}

registerModule();
