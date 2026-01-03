/**
 * FIX ACTIVE MODULES - Agregar módulos core a todas las empresas
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

async function fixActiveModules() {
    try {
        console.log('🔧 [FIX] Activando módulos core para todas las empresas...\n');

        // 1. Ver empresas existentes
        const companiesResult = await pool.query(`
            SELECT company_id, name, slug, active_modules
            FROM companies
            WHERE is_active = true
            ORDER BY company_id
        `);

        console.log(`📋 [INFO] Empresas activas encontradas: ${companiesResult.rows.length}\n`);

        // 2. Módulos CORE que SIEMPRE deben estar activos
        const coreModules = {
            'dashboard': true,
            'users': true,
            'attendance': true,
            'departments': true,
            'shifts': true,
            'reports': true,
            'kiosks': true,
            'notifications': true,
            'medical': true,
            'partners': true,
            'procedures': true,
            'my-procedures': true,
            'dms': true,
            'employee-map': true,
            'legal-dashboard': true,
            'hse-management': true,
            'job-postings': true,
            'employee-360': true,
            'vacation-management': true,
            'hour-bank': true,
            'organizational-structure': true,
            'mi-espacio': true,
            'biometric-consent': true,
            'company-account': true,
            'roles-permissions': true,
            'admin-consent-management': true,
            'compliance-dashboard': true,
            'payroll-liquidation': true,
            'associate-workflow-panel': true,
            'associate-marketplace': true,
            'notification-center': true,
            'inbox': true,
            'siac-commercial-dashboard': true,
            'predictive-workforce-dashboard': true,
            'hours-cube-dashboard': true,
            'audit-reports': true,
            'sla-tracking': true,
            'positions-management': true,
            'partner-scoring-system': true,
            'enterprise-companies-grid': true
        };

        console.log(`✅ [FIX] Módulos core a activar: ${Object.keys(coreModules).length}\n`);

        // 3. Actualizar TODAS las empresas
        for (const company of companiesResult.rows) {
            console.log(`\n🏢 Empresa: ${company.name} (ID: ${company.company_id})`);

            // Parsear active_modules existentes (puede ser TEXT o JSONB)
            let existingModules = {};
            if (company.active_modules) {
                try {
                    if (typeof company.active_modules === 'string') {
                        existingModules = JSON.parse(company.active_modules);
                    } else {
                        existingModules = company.active_modules;
                    }
                } catch (e) {
                    console.log(`   ⚠️ Error parseando active_modules, usando objeto vacío`);
                }
            }

            // Combinar módulos existentes con core modules
            const updatedModules = { ...existingModules, ...coreModules };

            console.log(`   📊 Antes: ${Object.keys(existingModules).length} módulos`);
            console.log(`   📊 Después: ${Object.keys(updatedModules).length} módulos`);

            // Actualizar usando JSON string (compatible con TEXT y JSONB)
            await pool.query(`
                UPDATE companies
                SET
                    active_modules = $1::jsonb,
                    updated_at = NOW()
                WHERE company_id = $2
            `, [JSON.stringify(updatedModules), company.company_id]);

            console.log(`   ✅ Actualizado`);
        }

        // 4. Verificar resultado
        console.log(`\n\n📊 [VERIFICACIÓN] Estado después de la reparación:\n`);

        const verifyResult = await pool.query(`
            SELECT company_id, name, slug, active_modules
            FROM companies
            WHERE is_active = true
            ORDER BY company_id
        `);

        for (const company of verifyResult.rows) {
            let moduleCount = 0;
            try {
                const modules = typeof company.active_modules === 'string'
                    ? JSON.parse(company.active_modules)
                    : company.active_modules;
                moduleCount = Object.keys(modules || {}).length;
            } catch (e) {
                moduleCount = 0;
            }

            console.log(`   🏢 ${company.name}: ${moduleCount} módulos activos`);

            // Mostrar primeros 5 módulos como muestra
            try {
                const modules = typeof company.active_modules === 'string'
                    ? JSON.parse(company.active_modules)
                    : company.active_modules;
                const firstModules = Object.keys(modules || {}).slice(0, 5);
                console.log(`      Ejemplo: ${firstModules.join(', ')}...`);
            } catch (e) {}
        }

        console.log(`\n✅ [SUCCESS] Reparación completada!`);
        console.log(`\n🔄 Ahora recarga la página: http://localhost:9998/panel-empresa.html`);
        console.log(`   Deberías ver el módulo Dashboard y todos los demás funcionando.\n`);

    } catch (error) {
        console.error('❌ [ERROR] Error reparando módulos:', error);
    } finally {
        await pool.end();
    }
}

fixActiveModules();
