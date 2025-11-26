const { Client } = require('pg');

async function enableSiacForIsi() {
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

        // Primero obtener los IDs de los módulos SIAC
        const modulesResult = await client.query(`
            SELECT id, module_key, name
            FROM system_modules
            WHERE module_key IN ('clientes', 'facturacion')
        `);

        console.log('📋 SIAC Modules found:', modulesResult.rows);

        // Obtener la empresa ISI
        const isiResult = await client.query(`
            SELECT id, name, slug, active_modules
            FROM companies
            WHERE slug ILIKE '%isi%' OR name ILIKE '%isi%'
            LIMIT 1
        `);

        if (isiResult.rows.length === 0) {
            console.log('❌ No se encontró la empresa ISI');
            return;
        }

        const isiCompany = isiResult.rows[0];
        console.log('🏢 ISI Company found:', isiCompany);

        // Obtener los active_modules actuales
        let activeModules = [];
        if (isiCompany.active_modules) {
            try {
                activeModules = JSON.parse(isiCompany.active_modules);
            } catch (e) {
                console.log('⚠️ Error parsing active_modules, using empty array');
                activeModules = [];
            }
        }

        // Agregar los nuevos módulos SIAC
        const siacModuleKeys = ['clientes', 'facturacion'];
        let modulesAdded = false;

        siacModuleKeys.forEach(moduleKey => {
            if (!activeModules.includes(moduleKey)) {
                activeModules.push(moduleKey);
                modulesAdded = true;
                console.log(`✅ Added module: ${moduleKey}`);
            } else {
                console.log(`ℹ️ Module already active: ${moduleKey}`);
            }
        });

        if (modulesAdded) {
            // Actualizar la empresa con los nuevos módulos
            await client.query(`
                UPDATE companies
                SET active_modules = $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [JSON.stringify(activeModules), isiCompany.id]);

            console.log('✅ ISI company updated with SIAC modules');
        } else {
            console.log('ℹ️ No changes needed, modules already active');
        }

        // Crear entradas en company_modules si no existen
        for (const module of modulesResult.rows) {
            const existsResult = await client.query(`
                SELECT id FROM company_modules
                WHERE company_id = $1 AND module_id = $2
            `, [isiCompany.id, module.id]);

            if (existsResult.rows.length === 0) {
                await client.query(`
                    INSERT INTO company_modules (company_id, module_id, is_active, created_at, updated_at)
                    VALUES ($1, $2, true, NOW(), NOW())
                `, [isiCompany.id, module.id]);
                console.log(`✅ Created company_module entry for: ${module.name}`);
            } else {
                // Activar si estaba inactivo
                await client.query(`
                    UPDATE company_modules
                    SET is_active = true, updated_at = NOW()
                    WHERE company_id = $1 AND module_id = $2
                `, [isiCompany.id, module.id]);
                console.log(`✅ Activated company_module for: ${module.name}`);
            }
        }

        console.log('🎉 SIAC modules successfully enabled for ISI!');

    } catch (error) {
        console.error('❌ Error enabling SIAC modules for ISI:', error);
    } finally {
        await client.end();
    }
}

enableSiacForIsi();