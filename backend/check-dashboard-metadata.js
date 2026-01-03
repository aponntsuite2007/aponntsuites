/**
 * CHECK DASHBOARD METADATA - Ver por qué dashboard no aparece en API
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function checkDashboard() {
    try {
        console.log('🔍 [DEBUG] Verificando módulo dashboard...\n');

        // 1. Ver datos completos del dashboard
        const dashboardResult = await pool.query(`
            SELECT id, module_key, name, is_active, module_type, available_in, metadata
            FROM system_modules
            WHERE module_key = 'dashboard'
        `);

        if (dashboardResult.rows.length === 0) {
            console.log('❌ Módulo dashboard NO existe en system_modules');
            return;
        }

        const dashboard = dashboardResult.rows[0];
        console.log('📊 Datos del módulo dashboard:');
        console.log('   ID:', dashboard.id);
        console.log('   module_key:', dashboard.module_key);
        console.log('   name:', dashboard.name);
        console.log('   is_active:', dashboard.is_active);
        console.log('   module_type:', dashboard.module_type);
        console.log('   available_in:', dashboard.available_in);
        console.log('   metadata:', JSON.stringify(dashboard.metadata, null, 2));

        // 2. Verificar filtros del API
        console.log('\n🔍 [DEBUG] Verificando filtros del API:\n');

        // Filtro 1: module_type
        const moduleTypeOK = !dashboard.module_type || !['submodule', 'container'].includes(dashboard.module_type);
        console.log(`   ✅ Filtro 1 (module_type): ${moduleTypeOK ? 'PASA' : 'FALLA'}`);
        if (!moduleTypeOK) {
            console.log(`      → module_type='${dashboard.module_type}' está en ['submodule', 'container']`);
        }

        // Filtro 2: available_in
        const availableInOK = !dashboard.available_in || dashboard.available_in !== 'none';
        console.log(`   ✅ Filtro 2 (available_in): ${availableInOK ? 'PASA' : 'FALLA'}`);
        if (!availableInOK) {
            console.log(`      → available_in='${dashboard.available_in}' es 'none'`);
        }

        // Filtro 3: hideFromDashboard
        const hideFromDashboardOK = !dashboard.metadata?.hideFromDashboard || dashboard.metadata.hideFromDashboard !== 'true';
        console.log(`   ✅ Filtro 3 (hideFromDashboard): ${hideFromDashboardOK ? 'PASA' : 'FALLA'}`);
        if (!hideFromDashboardOK) {
            console.log(`      → metadata.hideFromDashboard='${dashboard.metadata?.hideFromDashboard}'`);
        }

        // 3. Ver si está en company_modules
        console.log('\n🏢 [DEBUG] Verificando company_modules para ISI (ID 11):\n');

        const companyModuleResult = await pool.query(`
            SELECT cm.id, cm.activo, sm.module_key, sm.name
            FROM company_modules cm
            INNER JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = 11 AND sm.module_key = 'dashboard'
        `);

        if (companyModuleResult.rows.length === 0) {
            console.log('   ❌ Dashboard NO está en company_modules para ISI');
        } else {
            const cm = companyModuleResult.rows[0];
            console.log('   ✅ Dashboard está en company_modules:');
            console.log('      company_module.id:', cm.id);
            console.log('      activo:', cm.activo);
        }

        // 4. Ejecutar el MISMO query que el API
        console.log('\n🔍 [DEBUG] Ejecutando el MISMO query que usa el API:\n');

        const apiQueryResult = await pool.query(`
            SELECT sm.module_key
            FROM company_modules cm
            INNER JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = 11
              AND cm.activo = true
              AND (sm.module_type IS NULL OR sm.module_type NOT IN ('submodule', 'container'))
              AND (sm.available_in IS NULL OR sm.available_in <> 'none')
              AND (sm.metadata->>'hideFromDashboard' IS NULL OR sm.metadata->>'hideFromDashboard' <> 'true')
              AND sm.module_key = 'dashboard'
        `);

        if (apiQueryResult.rows.length === 0) {
            console.log('   ❌ Dashboard NO pasa los filtros del API');
            console.log('\n   🔧 [ANÁLISIS] El dashboard NO cumple al menos uno de estos filtros:');
            console.log('      1. cm.activo = true');
            console.log('      2. sm.module_type IS NULL OR sm.module_type NOT IN (\'submodule\', \'container\')');
            console.log('      3. sm.available_in IS NULL OR sm.available_in <> \'none\'');
            console.log('      4. sm.metadata->>\'hideFromDashboard\' IS NULL OR sm.metadata->>\'hideFromDashboard\' <> \'true\'');
        } else {
            console.log('   ✅ Dashboard PASA todos los filtros del API');
        }

    } catch (error) {
        console.error('❌ [ERROR]:', error.message);
    } finally {
        await pool.end();
    }
}

checkDashboard();
