const { Client } = require('pg');

async function debugModulesIssue() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'attendance_system',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    });

    try {
        await client.connect();
        console.log('🔗 Connected to PostgreSQL database');

        // 1. Verificar todas las empresas
        const empresasResult = await client.query(`
            SELECT id, name, slug, active_modules
            FROM companies
            ORDER BY id
        `);

        console.log('🏢 Empresas en el sistema:');
        empresasResult.rows.forEach(empresa => {
            console.log(`  - ID: ${empresa.id}, Name: ${empresa.name}, Slug: ${empresa.slug}`);
            console.log(`    Active modules: ${JSON.stringify(empresa.active_modules)}`);
        });

        // 2. Verificar los módulos SIAC en system_modules
        const siacModulesResult = await client.query(`
            SELECT id, module_key, name, is_active
            FROM system_modules
            WHERE module_key IN ('clientes', 'facturacion', 'plantillas-fiscales')
            ORDER BY module_key
        `);

        console.log('📋 Módulos SIAC en system_modules:');
        siacModulesResult.rows.forEach(module => {
            console.log(`  - ${module.module_key}: ${module.name} (active: ${module.is_active})`);
        });

        // 3. Verificar entries en company_modules para ISI
        const isiModulesResult = await client.query(`
            SELECT cm.*, sm.module_key, sm.name, c.name as company_name
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            JOIN companies c ON cm.company_id = c.id
            WHERE sm.module_key IN ('clientes', 'facturacion', 'plantillas-fiscales')
            ORDER BY c.id, sm.module_key
        `);

        console.log('🔗 Company_modules entries para módulos SIAC:');
        if (isiModulesResult.rows.length === 0) {
            console.log('  ❌ No hay entries en company_modules para los módulos SIAC');
        } else {
            isiModulesResult.rows.forEach(entry => {
                console.log(`  - Company: ${entry.company_name} (ID: ${entry.company_id})`);
                console.log(`    Module: ${entry.module_key} - ${entry.name}`);
                console.log(`    Active: ${entry.activo}, Price: ${entry.precio_mensual}`);
            });
        }

        // 4. Verificar cuál empresa está siendo utilizada por el sistema
        console.log('\n🔍 Investigando qué empresa usa el sistema por defecto...');

        // Buscar en logs o configuración cuál empresa es la predeterminada
        const defaultCompanyResult = await client.query(`
            SELECT id, name, slug
            FROM companies
            WHERE id = 4 OR name ILIKE '%default%' OR slug ILIKE '%default%'
        `);

        console.log('🎯 Empresa predeterminada (ID 4):');
        if (defaultCompanyResult.rows.length > 0) {
            defaultCompanyResult.rows.forEach(company => {
                console.log(`  - ID: ${company.company_id}, Name: ${company.name}, Slug: ${company.slug}`);
            });
        }

        // 5. Verificar si necesitamos agregar los módulos a la empresa 4 también
        const empresa4Result = await client.query(`
            SELECT id, name, active_modules, modules_pricing
            FROM companies
            WHERE id = 4
        `);

        if (empresa4Result.rows.length > 0) {
            const empresa4 = empresa4Result.rows[0];
            console.log('\n🏢 Estado actual de empresa ID 4:');
            console.log(`  Name: ${empresa4.name}`);
            console.log(`  Active modules: ${JSON.stringify(empresa4.active_modules)}`);
            console.log(`  Has pricing: ${empresa4.modules_pricing ? 'Yes' : 'No'}`);

            // Verificar si tiene los módulos SIAC
            const activeModules = empresa4.active_modules || [];
            const hasSiac = activeModules.some(module => ['clientes', 'facturacion', 'plantillas-fiscales'].includes(module));
            console.log(`  Has SIAC modules: ${hasSiac ? 'Yes' : 'No'}`);
        }

        console.log('\n💡 RECOMENDACIÓN:');
        if (siacModulesResult.rows.length === 3) {
            console.log('✅ Los módulos SIAC existen en system_modules');
            if (isiModulesResult.rows.length === 0) {
                console.log('❌ Pero no hay entries en company_modules');
                console.log('🔧 SOLUCIÓN: Agregar los módulos SIAC a la empresa que usa el sistema (probablemente empresa 4)');
            } else {
                console.log('✅ Hay entries en company_modules');
                console.log('🔧 PROBLEMA: Es posible que el frontend esté consultando la empresa incorrecta');
                console.log('🔧 SOLUCIÓN: Verificar qué empresa está consultando el frontend y ajustar');
            }
        } else {
            console.log('❌ Faltan módulos SIAC en system_modules');
        }

    } catch (error) {
        console.error('❌ Error debugging modules issue:', error);
    } finally {
        await client.end();
    }
}

debugModulesIssue();