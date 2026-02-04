/**
 * Script para sincronizar módulos en producción (Render)
 * Actualiza system_modules para que los 13 módulos faltantes
 * aparezcan en panel-empresa con show_as_card = true
 *
 * Ejecutar: node scripts/sync-modules-production.js
 */

const { Pool } = require('pg');

// URL de Render
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

// Los 13 módulos que faltan aparecer en panel-empresa
const MODULES_TO_SYNC = [
    { key: 'art-management', name: 'ART', icon: '🏥', category: 'medical' },
    { key: 'training-management', name: 'Gestión Capacitaciones', icon: '📚', category: 'rrhh' },
    { key: 'sanctions-management', name: 'Gestión de Sanciones', icon: '🚫', category: 'rrhh' },
    { key: 'vacation-management', name: 'Gestión de Vacaciones', icon: '🏖️', category: 'rrhh' },
    { key: 'legal-dashboard', name: 'Legal', icon: '⚖️', category: 'compliance' },
    { key: 'medical', name: 'Gestión Médica', icon: '👩‍⚕️', category: 'medical' },
    { key: 'payroll-liquidation', name: 'Liquidación Sueldos', icon: '💰', category: 'payroll' },
    { key: 'logistics-dashboard', name: 'Logistica Avanzada', icon: '🚚', category: 'logistics' },
    { key: 'procedures-manual', name: 'Manual de Procedimientos', icon: '📖', category: 'compliance' },
    { key: 'employee-map', name: 'Mapa Empleados', icon: '🗺️', category: 'analytics' },
    { key: 'marketplace', name: 'Marketplace', icon: '🛒', category: 'commerce' },
    { key: 'my-procedures', name: 'Mis Procedimientos', icon: '📋', category: 'compliance' },
    { key: 'audit-reports', name: 'Reportes Auditoría', icon: '📄', category: 'reports' }
];

async function syncModules() {
    const pool = new Pool({
        connectionString: RENDER_URL,
        ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    try {
        console.log('🔍 Verificando estructura de system_modules...\n');

        // Verificar qué columnas existen en system_modules
        const columnsResult = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'system_modules'
            ORDER BY ordinal_position
        `);
        console.log('📋 Columnas en system_modules:');
        columnsResult.rows.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`));
        console.log('');

        // Verificar si existe la vista v_modules_by_panel
        const viewResult = await client.query(`
            SELECT viewname FROM pg_views WHERE viewname = 'v_modules_by_panel'
        `);
        console.log(`📊 Vista v_modules_by_panel: ${viewResult.rows.length > 0 ? 'EXISTE' : 'NO EXISTE'}\n`);

        // Ver definición de la vista si existe
        if (viewResult.rows.length > 0) {
            const viewDefResult = await client.query(`
                SELECT definition FROM pg_views WHERE viewname = 'v_modules_by_panel'
            `);
            console.log('📝 Definición de la vista:');
            console.log(viewDefResult.rows[0]?.definition?.substring(0, 500) + '...\n');
        }

        // Ver módulos existentes que SÍ aparecen en panel-empresa
        const existingModules = await client.query(`
            SELECT module_key, name, target_panel, show_as_card
            FROM v_modules_by_panel
            WHERE target_panel = 'panel-empresa' AND show_as_card = true
            ORDER BY module_key
            LIMIT 20
        `);
        console.log(`✅ Módulos que YA aparecen en panel-empresa: ${existingModules.rows.length}`);
        existingModules.rows.forEach(m => console.log(`   - ${m.module_key}: ${m.name}`));
        console.log('');

        // Verificar cuáles de los 13 módulos ya existen en system_modules
        const moduleKeys = MODULES_TO_SYNC.map(m => m.key);
        const existingInSystem = await client.query(`
            SELECT module_key, name, is_active
            FROM system_modules
            WHERE module_key = ANY($1)
        `, [moduleKeys]);

        console.log(`🔍 De los 13 módulos, ${existingInSystem.rows.length} ya existen en system_modules:`);
        existingInSystem.rows.forEach(m => console.log(`   - ${m.module_key}: ${m.name} (active: ${m.is_active})`));
        console.log('');

        // Verificar cuáles faltan
        const existingKeys = existingInSystem.rows.map(r => r.module_key);
        const missingModules = MODULES_TO_SYNC.filter(m => !existingKeys.includes(m.key));

        if (missingModules.length > 0) {
            console.log(`⚠️ Módulos que FALTAN en system_modules: ${missingModules.length}`);
            missingModules.forEach(m => console.log(`   - ${m.key}: ${m.name}`));
            console.log('');
        }

        await client.query('BEGIN');

        // Insertar módulos faltantes en system_modules
        let insertedCount = 0;
        for (const mod of missingModules) {
            try {
                await client.query(`
                    INSERT INTO system_modules (module_key, name, description, icon, category, is_active, is_core, base_price, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, true, false, 0, NOW(), NOW())
                    ON CONFLICT (module_key) DO NOTHING
                `, [mod.key, mod.name, `Módulo ${mod.name}`, mod.icon, mod.category]);
                insertedCount++;
                console.log(`✅ Insertado: ${mod.key}`);
            } catch (err) {
                console.log(`⚠️ Error insertando ${mod.key}: ${err.message}`);
            }
        }

        if (insertedCount > 0) {
            console.log(`\n📦 ${insertedCount} módulos insertados en system_modules`);
        }

        // Verificar si hay columnas target_panel y show_as_card en system_modules
        const hasTargetPanel = columnsResult.rows.some(c => c.column_name === 'target_panel');
        const hasShowAsCard = columnsResult.rows.some(c => c.column_name === 'show_as_card');

        if (hasTargetPanel && hasShowAsCard) {
            // Actualizar los módulos para que aparezcan en panel-empresa
            const updateResult = await client.query(`
                UPDATE system_modules
                SET target_panel = 'panel-empresa',
                    show_as_card = true,
                    updated_at = NOW()
                WHERE module_key = ANY($1)
            `, [moduleKeys]);
            console.log(`\n✅ ${updateResult.rowCount} módulos actualizados con target_panel = 'panel-empresa'`);
        } else {
            console.log(`\n⚠️ Columnas target_panel/show_as_card no existen en system_modules`);
            console.log('   La vista v_modules_by_panel puede usar otra tabla para esta configuración');

            // Buscar si hay una tabla module_panel_config o similar
            const configTable = await client.query(`
                SELECT table_name FROM information_schema.tables
                WHERE table_name LIKE '%module%panel%' OR table_name LIKE '%panel%module%'
            `);
            if (configTable.rows.length > 0) {
                console.log('   Tablas relacionadas encontradas:');
                configTable.rows.forEach(t => console.log(`   - ${t.table_name}`));
            }
        }

        await client.query('COMMIT');

        // Verificación final
        console.log('\n════════════════════════════════════════════════════════════');
        console.log('VERIFICACIÓN FINAL');
        console.log('════════════════════════════════════════════════════════════');

        const finalCheck = await client.query(`
            SELECT module_key, name
            FROM v_modules_by_panel
            WHERE module_key = ANY($1)
              AND target_panel = 'panel-empresa'
              AND show_as_card = true
        `, [moduleKeys]);

        console.log(`\n📊 De los 13 módulos, ${finalCheck.rows.length} ahora aparecen en panel-empresa:`);
        finalCheck.rows.forEach(m => console.log(`   ✅ ${m.module_key}: ${m.name}`));

        const stillMissing = moduleKeys.filter(k => !finalCheck.rows.some(r => r.module_key === k));
        if (stillMissing.length > 0) {
            console.log(`\n❌ Todavía faltan ${stillMissing.length} módulos:`);
            stillMissing.forEach(k => console.log(`   - ${k}`));
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

syncModules()
    .then(() => {
        console.log('\n✅ Script completado');
        process.exit(0);
    })
    .catch(() => process.exit(1));
