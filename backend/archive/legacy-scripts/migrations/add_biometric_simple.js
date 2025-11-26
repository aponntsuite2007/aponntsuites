/**
 * Script simple para agregar módulo biometric usando raw SQL
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: console.log
});

async function addBiometricModule() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida');

        // Verificar estructura de system_modules
        const [systemModulesStructure] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'system_modules'
            ORDER BY ordinal_position;
        `);

        console.log('📋 Estructura de system_modules:');
        systemModulesStructure.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

        // Verificar módulos existentes
        const [existingModules] = await sequelize.query(`
            SELECT * FROM system_modules LIMIT 5;
        `);

        console.log('📋 Módulos existentes (primeros 5):');
        existingModules.forEach(module => console.log(`  - ID: ${module.id}, Name: ${module.name}`));

        // Buscar si existe un módulo biométrico
        const [biometricModules] = await sequelize.query(`
            SELECT * FROM system_modules WHERE name ILIKE '%biometric%' OR name ILIKE '%biometr%';
        `);

        console.log(`📋 Módulos biométricos encontrados: ${biometricModules.length}`);
        biometricModules.forEach(module => console.log(`  - ID: ${module.id}, Name: ${module.name}`));

        // Intentar insertar si no existe
        if (biometricModules.length === 0) {
            console.log('➕ Agregando módulo Centro de Comando Biométrico...');

            const [result] = await sequelize.query(`
                INSERT INTO system_modules (name, description, icon, category, is_active, created_at, updated_at)
                VALUES (
                    'Centro de Comando Biométrico',
                    'Centro de Comando Biométrico con conexiones a Harvard, Stanford y MIT. Análisis avanzado de biometría, templates faciales, detección de fatiga y análisis emocional.',
                    '🎭',
                    'SEGURIDAD',
                    true,
                    NOW(),
                    NOW()
                ) RETURNING id;
            `);

            const moduleId = result[0].id;
            console.log(`✅ Módulo creado con ID: ${moduleId}`);

            // Asignar a todas las empresas que tienen módulos
            const [companies] = await sequelize.query(`
                SELECT DISTINCT company_id FROM company_modules;
            `);

            console.log(`📋 Asignando a ${companies.length} empresas...`);

            for (const company of companies) {
                await sequelize.query(`
                    INSERT INTO company_modules (company_id, system_module_id, is_contracted, is_active, is_operational, created_at, updated_at)
                    VALUES (${company.company_id}, ${moduleId}, true, true, true, NOW(), NOW())
                    ON CONFLICT DO NOTHING;
                `);
                console.log(`✅ Asignado a empresa ${company.company_id}`);
            }
        } else {
            console.log('✅ Módulo biométrico ya existe');
            const moduleId = biometricModules[0].id;

            // Asignar a empresas que no lo tengan
            const [companies] = await sequelize.query(`
                SELECT DISTINCT company_id FROM company_modules
                WHERE company_id NOT IN (
                    SELECT company_id FROM company_modules WHERE system_module_id = ${moduleId}
                );
            `);

            console.log(`📋 Asignando a ${companies.length} empresas que no lo tienen...`);

            for (const company of companies) {
                await sequelize.query(`
                    INSERT INTO company_modules (company_id, system_module_id, is_contracted, is_active, is_operational, created_at, updated_at)
                    VALUES (${company.company_id}, ${moduleId}, true, true, true, NOW(), NOW());
                `);
                console.log(`✅ Asignado a empresa ${company.company_id}`);
            }
        }

        console.log('🎉 ¡Proceso completado!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

addBiometricModule();