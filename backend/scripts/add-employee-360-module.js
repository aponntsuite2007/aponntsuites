/**
 * Script para agregar el módulo Employee 360° a la base de datos
 *
 * Uso: node scripts/add-employee-360-module.js
 */

const { Pool } = require('pg');
require('dotenv').config();

async function addModule() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  REGISTRO: Módulo Expediente 360° en system_modules            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const pool = new Pool({
        host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
        user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
        database: process.env.POSTGRES_DB || process.env.DB_NAME || 'attendance_system'
    });

    try {
        // Verificar si el módulo ya existe
        const checkModule = await pool.query(`
            SELECT module_key FROM system_modules WHERE module_key = 'employee-360'
        `);

        if (checkModule.rows.length > 0) {
            console.log('ℹ️  El módulo employee-360 ya existe en system_modules');

            // Actualizar metadata
            await pool.query(`
                UPDATE system_modules
                SET
                    name = 'Expediente 360°',
                    description = 'Análisis integral de empleados con IA, scoring y timeline unificado. Incluye: Scoring de 5 categorías, Análisis con Ollama + Llama 3.1, Timeline unificado, Comparación entre empleados, Exportación PDF profesional.',
                    icon = '🎯',
                    color = '#9b59b6',
                    category = 'rrhh',
                    base_price = 150,
                    is_core = false,
                    is_active = true,
                    display_order = 15,
                    version = '1.0.0',
                    rubro = 'RRHH Premium',
                    features = '["Scoring integral de 5 categorías", "Análisis con IA (Ollama + Llama 3.1)", "Timeline unificado de eventos", "Comparación entre empleados", "Exportación PDF profesional", "Multi-tenant completo"]'::jsonb,
                    requirements = '["users", "attendance"]'::jsonb,
                    integrates_with = '["attendance", "sanctions-management", "vacation-management", "training-management", "medical-dashboard"]'::jsonb,
                    metadata = '{"frontend_file": "/js/modules/employee-360.js", "init_function": "Employee360.init", "isPremium": true}'::jsonb,
                    updated_at = NOW()
                WHERE module_key = 'employee-360'
            `);
            console.log('✅ Módulo actualizado correctamente');

            await pool.end();
            return;
        }

        // Insertar nuevo módulo
        console.log('📦 Insertando módulo employee-360...');

        await pool.query(`
            INSERT INTO system_modules (
                id,
                module_key,
                name,
                description,
                icon,
                color,
                category,
                base_price,
                is_core,
                is_active,
                display_order,
                features,
                requirements,
                version,
                min_employees,
                rubro,
                available_in,
                integrates_with,
                metadata,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                'employee-360',
                'Expediente 360°',
                'Análisis integral de empleados con IA, scoring y timeline unificado. Incluye: Scoring de 5 categorías, Análisis con Ollama + Llama 3.1, Timeline unificado, Comparación entre empleados, Exportación PDF profesional.',
                '🎯',
                '#9b59b6',
                'rrhh',
                150,
                false,
                true,
                15,
                '["Scoring integral de 5 categorías", "Análisis con IA (Ollama + Llama 3.1)", "Timeline unificado de eventos", "Comparación entre empleados", "Exportación PDF profesional", "Multi-tenant completo"]'::jsonb,
                '["users", "attendance"]'::jsonb,
                '1.0.0',
                10,
                'RRHH Premium',
                'company',
                '["attendance", "sanctions-management", "vacation-management", "training-management", "medical-dashboard"]'::jsonb,
                '{"frontend_file": "/js/modules/employee-360.js", "init_function": "Employee360.init", "isPremium": true}'::jsonb,
                NOW(),
                NOW()
            )
        `);

        console.log('✅ Módulo employee-360 insertado correctamente');

        // Verificar
        const verify = await pool.query(`
            SELECT module_key, name, icon, category, base_price, is_active, version, rubro
            FROM system_modules
            WHERE module_key = 'employee-360'
        `);

        console.log('\n📋 Módulo registrado:');
        console.log(verify.rows[0]);

        // Asignar a empresas de prueba (opcional)
        console.log('\n🔗 Asignando módulo a empresas activas...');

        const companies = await pool.query(`
            SELECT id, name FROM companies WHERE is_active = true LIMIT 5
        `);

        for (const company of companies.rows) {
            // Verificar si ya existe la asignación
            const exists = await pool.query(`
                SELECT 1 FROM company_modules
                WHERE company_id = $1 AND module_key = 'employee-360'
            `, [company.id]);

            if (exists.rows.length === 0) {
                await pool.query(`
                    INSERT INTO company_modules (company_id, module_key, is_active, created_at)
                    VALUES ($1, 'employee-360', true, NOW())
                `, [company.id]);
                console.log(`   ✅ Asignado a: ${company.name} (ID: ${company.id})`);
            } else {
                console.log(`   ℹ️  Ya asignado a: ${company.name}`);
            }
        }

        console.log('\n✅ Módulo Expediente 360° registrado y asignado correctamente');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.detail) console.error('   Detalle:', error.detail);
    } finally {
        await pool.end();
    }
}

addModule();
