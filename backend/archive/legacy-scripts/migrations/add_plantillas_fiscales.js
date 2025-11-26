const { Client } = require('pg');

async function addPlantillasFiscales() {
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

        // 1. Agregar el módulo plantillas-fiscales a system_modules
        const insertModuleResult = await client.query(`
            INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'plantillas-fiscales',
                'Plantillas Fiscales SIAC',
                'Sistema configurable de matriz impositiva por país con condiciones IVA, conceptos y alícuotas',
                '📋',
                '#9b59b6',
                'additional',
                2800,
                true,
                false,
                32,
                '["Plantillas por país", "Condiciones IVA", "Conceptos impositivos", "Alícuotas", "Configuración fiscal"]',
                '["users"]',
                '1.0.0',
                3,
                null,
                NOW(),
                NOW()
            )
            ON CONFLICT (module_key) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING id, module_key, name;
        `);

        console.log('✅ Módulo plantillas-fiscales agregado:', insertModuleResult.rows[0]);

        // 2. Obtener ISI company
        const isiResult = await client.query(`
            SELECT id, name, active_modules, modules_pricing
            FROM companies
            WHERE name ILIKE '%isi%'
            LIMIT 1
        `);

        if (isiResult.rows.length === 0) {
            console.log('❌ No se encontró la empresa ISI');
            return;
        }

        const isiCompany = isiResult.rows[0];
        console.log('🏢 ISI Company found:', isiCompany.name);

        // 3. Actualizar active_modules
        let activeModules = isiCompany.active_modules || [];
        if (!activeModules.includes('plantillas-fiscales')) {
            activeModules.push('plantillas-fiscales');

            await client.query(`
                UPDATE companies
                SET active_modules = $1, updated_at = NOW()
                WHERE id = $2
            `, [JSON.stringify(activeModules), isiCompany.id]);

            console.log('✅ ISI active_modules updated:', activeModules);
        }

        // 4. Agregar a modules_pricing
        let modulesPricing = {};
        try {
            modulesPricing = isiCompany.modules_pricing || {};
        } catch (e) {
            console.log('⚠️ Error parsing modules_pricing, using empty object');
        }

        modulesPricing['plantillas-fiscales'] = {
            icon: '📋',
            name: 'Plantillas Fiscales SIAC',
            basePrice: 2800,
            tierPrice: 2800,
            totalPrice: 2800,
            contractedAt: new Date().toISOString()
        };

        await client.query(`
            UPDATE companies
            SET modules_pricing = $1, updated_at = NOW()
            WHERE id = $2
        `, [JSON.stringify(modulesPricing), isiCompany.id]);

        console.log('✅ ISI modules_pricing updated');

        // 5. Crear entrada en company_modules
        const moduleId = insertModuleResult.rows[0].id;
        await client.query(`
            INSERT INTO company_modules (
                id, company_id, system_module_id, precio_mensual,
                activo, fecha_asignacion, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), $1, $2, 2800,
                true, NOW(), NOW(), NOW()
            )
            ON CONFLICT (company_id, system_module_id) DO UPDATE SET
                activo = true, updated_at = NOW()
        `, [isiCompany.id, moduleId]);

        console.log('✅ Company_modules entry created');

        // 6. Verificar resultado final
        const finalResult = await client.query(`
            SELECT active_modules, modules_pricing
            FROM companies
            WHERE id = $1
        `, [isiCompany.id]);

        console.log('🎉 Final configuration:');
        console.log('  Active modules:', finalResult.rows[0].active_modules);
        console.log('  Plantillas Fiscales pricing:', finalResult.rows[0].modules_pricing?.['plantillas-fiscales']);

        console.log('🎉 Plantillas Fiscales module successfully added!');

    } catch (error) {
        console.error('❌ Error adding Plantillas Fiscales module:', error);
    } finally {
        await client.end();
    }
}

addPlantillasFiscales();