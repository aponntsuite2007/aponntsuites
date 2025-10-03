const { Client } = require('pg');

async function completeSiacSetup() {
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

        // 1. Obtener los módulos SIAC
        const modulesResult = await client.query(`
            SELECT id, module_key, name, base_price, icon
            FROM system_modules
            WHERE module_key IN ('clientes', 'facturacion')
        `);

        console.log('📋 SIAC Modules found:', modulesResult.rows);

        // 2. Obtener la empresa ISI
        const isiResult = await client.query(`
            SELECT id, name, modules_pricing
            FROM companies
            WHERE name ILIKE '%isi%'
            LIMIT 1
        `);

        if (isiResult.rows.length === 0) {
            console.log('❌ No se encontró la empresa ISI');
            return;
        }

        const isiCompany = isiResult.rows[0];
        console.log('🏢 ISI Company found:', isiCompany.name, 'ID:', isiCompany.id);

        // 3. Crear entradas en company_modules
        for (const module of modulesResult.rows) {
            // Verificar si ya existe
            const existsResult = await client.query(`
                SELECT id FROM company_modules
                WHERE company_id = $1 AND system_module_id = $2
            `, [isiCompany.id, module.id]);

            if (existsResult.rows.length === 0) {
                // Crear nueva entrada
                await client.query(`
                    INSERT INTO company_modules (
                        id, company_id, system_module_id, precio_mensual,
                        activo, fecha_asignacion, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), $1, $2, $3,
                        true, NOW(), NOW(), NOW()
                    )
                `, [isiCompany.id, module.id, module.base_price]);

                console.log(`✅ Created company_modules entry for: ${module.name}`);
            } else {
                // Activar si existe pero está inactivo
                await client.query(`
                    UPDATE company_modules
                    SET activo = true, updated_at = NOW()
                    WHERE company_id = $1 AND system_module_id = $2
                `, [isiCompany.id, module.id]);

                console.log(`✅ Activated company_modules entry for: ${module.name}`);
            }
        }

        // 4. Actualizar modules_pricing en la tabla companies
        let modulesPricing = {};
        try {
            modulesPricing = isiCompany.modules_pricing || {};
        } catch (e) {
            console.log('⚠️ Error parsing modules_pricing, using empty object');
        }

        // Agregar los módulos SIAC al pricing
        modulesResult.rows.forEach(module => {
            modulesPricing[module.module_key] = {
                icon: module.icon || (module.module_key === 'clientes' ? '👥' : '💳'),
                name: module.module_key === 'clientes' ? 'Gestión de Clientes SIAC' : 'Facturación SIAC',
                basePrice: parseFloat(module.base_price),
                tierPrice: parseFloat(module.base_price),
                totalPrice: parseFloat(module.base_price),
                contractedAt: new Date().toISOString()
            };
        });

        // Actualizar la empresa
        await client.query(`
            UPDATE companies
            SET modules_pricing = $1, updated_at = NOW()
            WHERE id = $2
        `, [JSON.stringify(modulesPricing), isiCompany.id]);

        console.log('✅ Updated modules_pricing for ISI company');

        // 5. Verificar el resultado final
        const finalResult = await client.query(`
            SELECT active_modules, modules_pricing
            FROM companies
            WHERE id = $1
        `, [isiCompany.id]);

        console.log('🎉 Final ISI configuration:');
        console.log('  Active modules:', finalResult.rows[0].active_modules);
        console.log('  SIAC pricing:', {
            clientes: finalResult.rows[0].modules_pricing?.clientes,
            facturacion: finalResult.rows[0].modules_pricing?.facturacion
        });

        // 6. Verificar entradas en company_modules
        const companyModulesResult = await client.query(`
            SELECT cm.*, sm.module_key, sm.name
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = $1 AND sm.module_key IN ('clientes', 'facturacion')
        `, [isiCompany.id]);

        console.log('📊 Company_modules entries for SIAC:');
        companyModulesResult.rows.forEach(row => {
            console.log(`  - ${row.name} (${row.module_key}): activo=${row.activo}, precio=${row.precio_mensual}`);
        });

        console.log('🎉 SIAC setup completed successfully!');

    } catch (error) {
        console.error('❌ Error completing SIAC setup:', error);
    } finally {
        await client.end();
    }
}

completeSiacSetup();