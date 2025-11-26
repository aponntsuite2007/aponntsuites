const { Client } = require('pg');

async function addSiacToCompany4() {
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
        const siacModulesResult = await client.query(`
            SELECT id, module_key, name, base_price, icon
            FROM system_modules
            WHERE module_key IN ('clientes', 'facturacion', 'plantillas-fiscales')
        `);

        console.log('📋 Módulos SIAC encontrados:', siacModulesResult.rows.length);

        // 2. Obtener empresa 4
        const company4Result = await client.query(`
            SELECT id, name, active_modules, modules_pricing
            FROM companies
            WHERE id = 4
        `);

        if (company4Result.rows.length === 0) {
            console.log('❌ No se encontró empresa con ID 4');
            return;
        }

        const company4 = company4Result.rows[0];
        console.log('🏢 Empresa encontrada:', company4.name);

        // 3. Actualizar active_modules (convertir de objeto a array)
        let activeModules = [];
        if (company4.active_modules && typeof company4.active_modules === 'object') {
            // Si es un objeto como {"medical":false,"reports":true}, convertir a array de keys activos
            if (Array.isArray(company4.active_modules)) {
                activeModules = [...company4.active_modules];
            } else {
                // Convertir objeto a array de keys donde el valor es true
                activeModules = Object.keys(company4.active_modules).filter(
                    key => company4.active_modules[key] === true
                );
            }
        }

        // Agregar módulos SIAC
        const siacKeys = ['clientes', 'facturacion', 'plantillas-fiscales'];
        siacKeys.forEach(key => {
            if (!activeModules.includes(key)) {
                activeModules.push(key);
            }
        });

        console.log('🔧 Nuevos active_modules:', activeModules);

        // Actualizar company
        await client.query(`
            UPDATE companies
            SET active_modules = $1, updated_at = NOW()
            WHERE id = 4
        `, [JSON.stringify(activeModules)]);

        console.log('✅ Active_modules actualizado');

        // 4. Actualizar modules_pricing
        let modulesPricing = {};
        try {
            modulesPricing = company4.modules_pricing || {};
        } catch (e) {
            console.log('⚠️ Error parsing modules_pricing, usando objeto vacío');
        }

        // Agregar pricing para módulos SIAC
        siacModulesResult.rows.forEach(module => {
            modulesPricing[module.module_key] = {
                icon: module.icon || (module.module_key === 'clientes' ? '👥' : module.module_key === 'facturacion' ? '💳' : '📋'),
                name: module.name,
                basePrice: parseFloat(module.base_price),
                tierPrice: parseFloat(module.base_price),
                totalPrice: parseFloat(module.base_price),
                contractedAt: new Date().toISOString()
            };
        });

        await client.query(`
            UPDATE companies
            SET modules_pricing = $1, updated_at = NOW()
            WHERE id = 4
        `, [JSON.stringify(modulesPricing)]);

        console.log('✅ Modules_pricing actualizado');

        // 5. Crear entries en company_modules
        for (const module of siacModulesResult.rows) {
            await client.query(`
                INSERT INTO company_modules (
                    id, company_id, system_module_id, precio_mensual,
                    activo, fecha_asignacion, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), 4, $1, $2,
                    true, NOW(), NOW(), NOW()
                )
                ON CONFLICT (company_id, system_module_id) DO UPDATE SET
                    activo = true, updated_at = NOW()
            `, [module.id, module.base_price]);

            console.log(`✅ Company_module creado para: ${module.name}`);
        }

        // 6. Verificar resultado final
        const finalResult = await client.query(`
            SELECT id, name, active_modules
            FROM companies
            WHERE id = 4
        `);

        console.log('🎉 Resultado final empresa 4:');
        console.log(`  Name: ${finalResult.rows[0].name}`);
        console.log(`  Active modules: ${JSON.stringify(finalResult.rows[0].active_modules)}`);

        console.log('🎉 Módulos SIAC agregados exitosamente a empresa 4!');

    } catch (error) {
        console.error('❌ Error agregando módulos SIAC a empresa 4:', error);
    } finally {
        await client.end();
    }
}

addSiacToCompany4();