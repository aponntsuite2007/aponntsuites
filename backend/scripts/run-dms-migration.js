#!/usr/bin/env node
/**
 * Script para ejecutar la migración del módulo DMS Dashboard
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';

async function runMigration() {
    const sequelize = new Sequelize(DB_URL, {
        logging: false,
        dialectOptions: DB_URL.includes('render.com') ? {
            ssl: { require: true, rejectUnauthorized: false }
        } : {}
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL');

        // PASO 0: Eliminar módulo antiguo
        console.log('\n📋 PASO 0: Limpiando módulo antiguo...');
        await sequelize.query(`DELETE FROM system_modules WHERE module_key = 'document-management'`);

        // Quitar de active_modules (puede ser TEXT o JSONB)
        // Primero verificar el tipo de columna
        const [colType] = await sequelize.query(`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'companies' AND column_name = 'active_modules'
        `);

        if (colType.length > 0) {
            const isJsonb = colType[0].data_type === 'jsonb';
            if (isJsonb) {
                await sequelize.query(`
                    UPDATE companies
                    SET active_modules = (
                        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
                        FROM jsonb_array_elements(active_modules) AS elem
                        WHERE elem::text != '"document-management"'
                    )
                    WHERE active_modules ? 'document-management'
                `);
            } else {
                // Es TEXT - usar REPLACE
                await sequelize.query(`
                    UPDATE companies
                    SET active_modules = REPLACE(
                        REPLACE(active_modules, '"document-management",', ''),
                        ',"document-management"', ''
                    )
                    WHERE active_modules LIKE '%document-management%'
                `);
            }
        }
        console.log('✅ Módulo document-management eliminado');

        // PASO 1: Registrar DMS Dashboard
        console.log('\n📋 PASO 1: Registrando módulo DMS Dashboard...');

        // Verificar si la tabla tiene columna is_core
        const [columns] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'system_modules' AND column_name = 'is_core'
        `);
        const hasIsCoreColumn = columns.length > 0;

        if (hasIsCoreColumn) {
            await sequelize.query(`
                INSERT INTO system_modules (
                    id, module_key, name, description, icon, category, is_active, is_core, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(),
                    'dms-dashboard',
                    'Gestión Documental (DMS)',
                    'Sistema de Gestión Documental - Fuente Única de Verdad para todos los documentos del sistema',
                    'fas fa-folder-open',
                    'core',
                    true,
                    true,
                    NOW(),
                    NOW()
                )
                ON CONFLICT (module_key) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    icon = EXCLUDED.icon,
                    category = EXCLUDED.category,
                    is_core = true,
                    updated_at = NOW()
            `);
        } else {
            await sequelize.query(`
                INSERT INTO system_modules (
                    id, module_key, name, description, icon, category, is_active, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(),
                    'dms-dashboard',
                    'Gestión Documental (DMS)',
                    'Sistema de Gestión Documental - Fuente Única de Verdad para todos los documentos del sistema',
                    'fas fa-folder-open',
                    'core',
                    true,
                    NOW(),
                    NOW()
                )
                ON CONFLICT (module_key) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    icon = EXCLUDED.icon,
                    category = EXCLUDED.category,
                    updated_at = NOW()
            `);
        }
        console.log('✅ Módulo dms-dashboard registrado');

        // PASO 2: Activar para todas las empresas
        console.log('\n📋 PASO 2: Activando para todas las empresas...');

        // Verificar tipo de columna otra vez
        const [colType2] = await sequelize.query(`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'companies' AND column_name = 'active_modules'
        `);

        if (colType2.length > 0) {
            const isJsonb = colType2[0].data_type === 'jsonb';
            if (isJsonb) {
                await sequelize.query(`
                    UPDATE companies
                    SET
                        active_modules = CASE
                            WHEN active_modules IS NULL THEN '["dms-dashboard"]'::jsonb
                            WHEN NOT (active_modules ? 'dms-dashboard') THEN active_modules || '["dms-dashboard"]'::jsonb
                            ELSE active_modules
                        END,
                        updated_at = NOW()
                    WHERE is_active = true
                `);
            } else {
                // Es TEXT - agregar al JSON como string
                await sequelize.query(`
                    UPDATE companies
                    SET active_modules = CASE
                        WHEN active_modules IS NULL OR active_modules = '' OR active_modules = '[]' THEN '["dms-dashboard"]'
                        WHEN active_modules NOT LIKE '%dms-dashboard%' THEN
                            REPLACE(active_modules, ']', ',"dms-dashboard"]')
                        ELSE active_modules
                    END,
                    updated_at = NOW()
                    WHERE is_active = true
                `);
            }
        }
        console.log('✅ DMS activado para todas las empresas activas');

        // VERIFICACIÓN FINAL
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  DMS DASHBOARD - MIGRACIÓN COMPLETADA');
        console.log('═══════════════════════════════════════════════════════════');

        const [modules] = await sequelize.query(`
            SELECT module_key, name, category FROM system_modules WHERE module_key = 'dms-dashboard'
        `);
        console.log('📁 Módulo registrado:', modules.length > 0 ? 'SI' : 'NO');
        if (modules.length > 0) {
            console.log('   - Key:', modules[0].module_key);
            console.log('   - Nombre:', modules[0].name);
            console.log('   - Categoría:', modules[0].category);
        }

        const [companies] = await sequelize.query(`
            SELECT COUNT(*) as count FROM companies WHERE active_modules LIKE '%dms-dashboard%'
        `);
        console.log('🏢 Empresas con DMS activo:', companies[0].count);

        const [old] = await sequelize.query(`
            SELECT module_key FROM system_modules WHERE module_key = 'document-management'
        `);
        console.log('🗑️ Módulo viejo eliminado:', old.length === 0 ? 'SI' : 'NO');

        console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

runMigration();
