/**
 * FIX COMPANY MODULES - Activar todos los módulos para la empresa
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

async function fixCompanyModules() {
    try {
        console.log('🔧 [FIX] Iniciando reparación de módulos de empresa...\n');

        // 1. Ver empresas existentes
        const companiesResult = await pool.query(`
            SELECT id, name, slug, active_modules, modules
            FROM companies
            ORDER BY id
            LIMIT 10
        `);

        console.log(`📋 [INFO] Empresas encontradas: ${companiesResult.rows.length}\n`);

        for (const company of companiesResult.rows) {
            console.log(`\n🏢 Empresa: ${company.name} (${company.slug})`);
            console.log(`   ID: ${company.id}`);
            console.log(`   Active modules: ${JSON.stringify(company.active_modules || []).substring(0, 100)}...`);
            console.log(`   Modules: ${JSON.stringify(company.modules || []).substring(0, 100)}...`);
        }

        // 2. Módulos básicos que SIEMPRE deben estar activos
        const coreModules = [
            'dashboard',
            'users',
            'attendance',
            'departments',
            'shifts',
            'reports',
            'kiosks',
            'notifications',
            'medical',
            'partners',
            'procedures',
            'my-procedures',
            'dms',
            'employee-map',
            'legal-dashboard',
            'hse-management',
            'job-postings',
            'employee-360',
            'vacation-management',
            'hour-bank',
            'organizational-structure',
            'mi-espacio',
            'biometric-consent',
            'company-account',
            'roles-permissions',
            'admin-consent-management',
            'compliance-dashboard',
            'payroll-liquidation',
            'associate-workflow-panel',
            'associate-marketplace'
        ];

        console.log(`\n✅ [FIX] Módulos core a activar: ${coreModules.length}`);

        // 3. Actualizar TODAS las empresas
        for (const company of companiesResult.rows) {
            console.log(`\n🔧 [FIX] Actualizando empresa ${company.name}...`);

            // Combinar módulos existentes con core modules (sin duplicados)
            const existingModules = company.active_modules || [];
            const allModules = [...new Set([...existingModules, ...coreModules])];

            await pool.query(`
                UPDATE companies
                SET
                    active_modules = $1,
                    modules = $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [JSON.stringify(allModules), company.id]);

            console.log(`   ✅ Módulos actualizados: ${allModules.length} módulos activos`);
        }

        // 4. Verificar resultado
        console.log(`\n\n📊 [VERIFICACIÓN] Estado después de la reparación:\n`);

        const verifyResult = await pool.query(`
            SELECT id, name, slug,
                   jsonb_array_length(COALESCE(active_modules, '[]'::jsonb)) as modules_count
            FROM companies
            ORDER BY id
            LIMIT 10
        `);

        for (const company of verifyResult.rows) {
            console.log(`   🏢 ${company.name}: ${company.modules_count} módulos activos`);
        }

        console.log(`\n✅ [SUCCESS] Reparación completada!`);
        console.log(`\n🔄 Ahora recarga la página: http://localhost:9998/panel-empresa.html\n`);

    } catch (error) {
        console.error('❌ [ERROR] Error reparando módulos:', error);
    } finally {
        await pool.end();
    }
}

fixCompanyModules();
