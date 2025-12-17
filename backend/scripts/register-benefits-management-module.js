const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const sequelize = new Sequelize(
    process.env.POSTGRES_DB,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
    {
        host: process.env.POSTGRES_HOST,
        port: 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function registerBenefitsModule() {
    try {
        console.log('🎁 REGISTRANDO MÓDULO benefits-management...\n');

        // PASO 1: Insertar en system_modules
        console.log('📋 PASO 1: Registrando en system_modules...');

        const insertSystemModule = await sequelize.query(`
            INSERT INTO system_modules (
                id,
                module_key,
                name,
                description,
                icon,
                color,
                category,
                base_price,
                is_active,
                is_core,
                display_order,
                features,
                requirements,
                version,
                created_at,
                updated_at,
                rubro,
                available_in,
                metadata,
                ui_metadata
            ) VALUES (
                gen_random_uuid(),
                'benefits-management',
                'Beneficios Laborales',
                'Sistema completo de gestión de beneficios y amenidades para empleados',
                '🎁',
                '#10B981',
                'rrhh',
                1500.00,
                true,
                false,
                100,
                '["Gestión de beneficios", "Amenidades empresariales", "Reportes y métricas", "Multi-tenant"]'::jsonb,
                '["users"]'::jsonb,
                '1.0.0',
                NOW(),
                NOW(),
                'Recursos Humanos',
                'both',
                '{"frontend_file": "benefits-management.js", "init_function": "initBenefitsManagement", "database_tables": ["employee_benefits", "employee_amenities", "benefit_categories", "amenity_types", "benefit_assignment_history", "amenity_usage_history"]}'::jsonb,
                '{"tabs": ["Beneficios", "Amenidades", "Reportes"], "mainButtons": ["Nuevo Beneficio", "Nueva Amenidad"], "modals": ["benefitModal", "amenityModal"], "inputs": []}'::jsonb
            )
            ON CONFLICT (module_key) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                icon = EXCLUDED.icon,
                color = EXCLUDED.color,
                updated_at = NOW()
            RETURNING id, module_key, name;
        `, { type: QueryTypes.INSERT });

        const systemModuleId = insertSystemModule[0][0].id;
        console.log(`✅ system_modules registrado: ${insertSystemModule[0][0].name} (ID: ${systemModuleId})`);

        // PASO 2: Verificar que ISI existe
        console.log('\n📋 PASO 2: Verificando empresa ISI...');
        const isiCompany = await sequelize.query(`
            SELECT company_id, name, slug
            FROM companies
            WHERE company_id = 11
        `, { type: QueryTypes.SELECT });

        if (isiCompany.length === 0) {
            console.log('❌ ERROR: Empresa ISI (company_id: 11) no encontrada');
            process.exit(1);
        }

        console.log(`✅ Empresa encontrada: ${isiCompany[0].name} (slug: ${isiCompany[0].slug})`);

        // PASO 3: Insertar en company_modules para ISI
        console.log('\n📋 PASO 3: Asignando módulo a empresa ISI...');

        await sequelize.query(`
            INSERT INTO company_modules (
                id,
                company_id,
                system_module_id,
                precio_mensual,
                activo,
                fecha_asignacion,
                created_at,
                updated_at,
                is_active,
                contracted_price,
                auto_activated
            ) VALUES (
                gen_random_uuid(),
                11,
                :systemModuleId,
                1500.00,
                true,
                NOW(),
                NOW(),
                NOW(),
                true,
                1500.00,
                false
            )
            ON CONFLICT (company_id, system_module_id) DO UPDATE SET
                activo = true,
                is_active = true,
                updated_at = NOW()
            RETURNING id;
        `, {
            replacements: { systemModuleId },
            type: QueryTypes.INSERT
        });

        console.log('✅ Módulo asignado a empresa ISI en company_modules');

        // PASO 4: Verificar todo
        console.log('\n📋 PASO 4: Verificando resultados...\n');

        // 4.1: Verificar system_modules
        const systemCheck = await sequelize.query(`
            SELECT id, module_key, name, category, is_active
            FROM system_modules
            WHERE module_key = 'benefits-management'
        `, { type: QueryTypes.SELECT });

        console.log('🔍 system_modules:');
        console.log(`   ID: ${systemCheck[0].id}`);
        console.log(`   Key: ${systemCheck[0].module_key}`);
        console.log(`   Nombre: ${systemCheck[0].name}`);
        console.log(`   Categoría: ${systemCheck[0].category}`);
        console.log(`   Activo: ${systemCheck[0].is_active}`);

        // 4.2: Verificar company_modules
        const companyCheck = await sequelize.query(`
            SELECT
                cm.id,
                cm.company_id,
                cm.activo,
                sm.module_key,
                sm.name
            FROM company_modules cm
            INNER JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = 11 AND sm.module_key = 'benefits-management'
        `, { type: QueryTypes.SELECT });

        console.log('\n🔍 company_modules (ISI):');
        console.log(`   ID: ${companyCheck[0].id}`);
        console.log(`   Company ID: ${companyCheck[0].company_id}`);
        console.log(`   Module Key: ${companyCheck[0].module_key}`);
        console.log(`   Module Name: ${companyCheck[0].name}`);
        console.log(`   Activo: ${companyCheck[0].activo}`);

        // 4.3: Contar total de módulos de ISI
        const totalModules = await sequelize.query(`
            SELECT COUNT(*) as total
            FROM company_modules
            WHERE company_id = 11
        `, { type: QueryTypes.SELECT });

        console.log(`\n📊 Total de módulos de ISI: ${totalModules[0].total}`);

        // 4.4: Simular llamada a API
        console.log('\n🌐 Simulando llamada a API /api/v1/company-modules/11...');
        const apiSimulation = await sequelize.query(`
            SELECT
                sm.module_key,
                sm.name,
                cm.activo as is_active
            FROM company_modules cm
            INNER JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = 11
            ORDER BY sm.name ASC
        `, { type: QueryTypes.SELECT });

        const hasBenefits = apiSimulation.find(m => m.module_key === 'benefits-management');

        console.log(`   Total módulos que retornaría API: ${apiSimulation.length}`);
        console.log(`   Incluye benefits-management: ${hasBenefits ? '✅ SÍ' : '❌ NO'}`);

        if (hasBenefits) {
            console.log(`   Nombre: ${hasBenefits.name}`);
            console.log(`   Activo: ${hasBenefits.is_active}`);
        }

        console.log('\n🎉 REGISTRO COMPLETADO EXITOSAMENTE');
        console.log('\n📌 PRÓXIMOS PASOS:');
        console.log('   1. Reiniciar el servidor backend');
        console.log('   2. Limpiar caché del navegador (Ctrl+Shift+Del)');
        console.log('   3. Hacer login en panel-empresa.html como ISI');
        console.log('   4. Verificar que aparece el módulo "Beneficios Laborales"');

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        await sequelize.close();
        process.exit(1);
    }
}

registerBenefitsModule();
