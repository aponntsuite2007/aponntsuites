/**
 * Script para asignar el módulo Employee 360° a la empresa ISI
 *
 * Uso: node scripts/assign-employee360-to-isi.js
 */

const { Pool } = require('pg');
require('dotenv').config();

async function assignToISI() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ASIGNACIÓN: Módulo Expediente 360° → Empresa ISI              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const pool = new Pool({
        host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
        user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
        database: process.env.POSTGRES_DB || process.env.DB_NAME || 'attendance_system'
    });

    try {
        // 1. Buscar empresa ISI (nota: la tabla usa company_id, no id)
        console.log('🔍 Buscando empresa ISI...');
        const isiResult = await pool.query(
            "SELECT company_id as id, name, slug FROM companies WHERE LOWER(name) LIKE '%isi%' OR LOWER(slug) LIKE '%isi%'"
        );

        if (isiResult.rows.length === 0) {
            // Listar todas las empresas
            console.log('⚠️  No se encontró empresa ISI. Listando todas las empresas...\n');
            const allCompanies = await pool.query('SELECT company_id as id, name, slug FROM companies ORDER BY company_id');
            console.log('📋 Empresas disponibles:');
            allCompanies.rows.forEach(c => console.log(`   ID: ${c.id} - Name: ${c.name} - Slug: ${c.slug}`));

            // Usar la primera empresa con ID 11 que parece ser ISI según el contexto
            const isi11 = allCompanies.rows.find(c => c.id === 11);
            if (isi11) {
                console.log('\n🎯 Usando empresa ID 11:', isi11.name);
                await assignModule(pool, isi11);
            }
            return;
        }

        const isi = isiResult.rows[0];
        console.log('✅ Empresa encontrada:', isi.name, '(ID:', isi.id, ')');
        await assignModule(pool, isi);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.detail) console.error('   Detalle:', error.detail);
    } finally {
        await pool.end();
    }
}

async function assignModule(pool, company) {
    // 2. Verificar si el módulo existe en system_modules
    console.log('\n📦 Verificando módulo en system_modules...');
    const moduleCheck = await pool.query(
        "SELECT id, module_key, name, version, base_price FROM system_modules WHERE module_key = 'employee-360'"
    );

    let moduleId;
    if (moduleCheck.rows.length === 0) {
        console.log('⚠️  Módulo employee-360 no existe en system_modules, creándolo...');
        const insertResult = await pool.query(`
            INSERT INTO system_modules (
                id, module_key, name, description, icon, color, category,
                base_price, is_core, is_active, display_order, version, rubro,
                features, requirements, integrates_with, metadata, created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                'employee-360',
                'Expediente 360°',
                'Análisis integral de empleados con IA, scoring, patrones de conducta, roles adicionales y timeline unificado',
                '🎯',
                '#9b59b6',
                'rrhh',
                150,
                false,
                true,
                15,
                '1.1.0',
                'RRHH Premium',
                '["Scoring 5 categorías + bonus roles", "Patrones de conducta", "Roles adicionales internos", "Timeline unificado", "Análisis IA", "Exportación PDF"]'::jsonb,
                '["users", "attendance"]'::jsonb,
                '["attendance", "sanctions-management", "vacation-management", "training-management", "medical-dashboard"]'::jsonb,
                '{"frontend_file": "/js/modules/employee-360.js", "init_function": "Employee360.init", "isPremium": true, "version": "1.1.0"}'::jsonb,
                NOW(),
                NOW()
            ) RETURNING id
        `);
        moduleId = insertResult.rows[0].id;
        console.log('✅ Módulo creado en system_modules con ID:', moduleId);
    } else {
        moduleId = moduleCheck.rows[0].id;
        console.log('✅ Módulo employee-360 existe:', moduleCheck.rows[0].name, 'v' + moduleCheck.rows[0].version);
        console.log('   ID:', moduleId);
        console.log('   Precio base: $' + moduleCheck.rows[0].base_price);
    }

    // 3. Asignar a la empresa (company_modules usa system_module_id, no module_key)
    console.log('\n🔗 Asignando módulo a', company.name, '...');
    const existsAssignment = await pool.query(
        "SELECT id FROM company_modules WHERE company_id = $1 AND system_module_id = $2",
        [company.id, moduleId]
    );

    if (existsAssignment.rows.length > 0) {
        // Actualizar para asegurar que esté activo
        await pool.query(
            "UPDATE company_modules SET activo = true WHERE company_id = $1 AND system_module_id = $2",
            [company.id, moduleId]
        );
        console.log('ℹ️  El módulo ya estaba asignado, se activó');
    } else {
        await pool.query(`
            INSERT INTO company_modules (id, company_id, system_module_id, precio_mensual, activo, fecha_asignacion, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, 150, true, NOW(), NOW(), NOW())
        `, [company.id, moduleId]);
        console.log('✅ Módulo employee-360 asignado a', company.name);
    }

    // 4. Verificar asignación
    const verify = await pool.query(`
        SELECT cm.activo, sm.name, sm.version, sm.module_key, cm.precio_mensual
        FROM company_modules cm
        JOIN system_modules sm ON cm.system_module_id = sm.id
        WHERE cm.company_id = $1 AND sm.module_key = 'employee-360'
    `, [company.id]);

    if (verify.rows.length > 0) {
        console.log('\n📊 Verificación final:');
        console.log('   Módulo:', verify.rows[0].name);
        console.log('   Versión:', verify.rows[0].version);
        console.log('   Activo:', verify.rows[0].activo ? 'Sí' : 'No');
        console.log('   Precio mensual: $' + verify.rows[0].precio_mensual);
        console.log('   Empresa:', company.name, '(ID:', company.id, ')');
    }

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  🎉 ¡LISTO! El módulo está disponible para probar              ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║  URL: http://localhost:9998/panel-empresa.html                 ║');
    console.log('║  Empresa: ' + (company.slug || company.name.toLowerCase().replace(/ /g, '-')));
    console.log('║  Módulo: Expediente 360° (🎯)                                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
}

assignToISI();
