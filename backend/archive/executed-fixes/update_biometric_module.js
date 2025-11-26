/**
 * Script para actualizar el módulo biométrico existente
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: console.log
});

async function updateBiometricModule() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida');

        // Actualizar el módulo "Biometría Facial" existente
        await sequelize.query(`
            UPDATE system_modules
            SET
                name = 'Centro de Comando Biométrico',
                module_key = 'biometric',
                description = 'Centro de Comando Biométrico con conexiones a Harvard, Stanford y MIT. Hub unificado para análisis biométrico avanzado, templates faciales MIT FaceNet, detección de fatiga Stanford y análisis emocional Harvard.',
                icon = '🎭',
                category = 'security',
                updated_at = NOW()
            WHERE id = '5aaf53ed-9ed0-4103-a065-e5296788cd03';
        `);

        console.log('✅ Módulo actualizado a "Centro de Comando Biométrico"');

        // Verificar que esté asignado a todas las empresas
        const [companies] = await sequelize.query(`
            SELECT DISTINCT company_id FROM company_modules
            WHERE company_id NOT IN (
                SELECT company_id FROM company_modules WHERE system_module_id = '5aaf53ed-9ed0-4103-a065-e5296788cd03'
            );
        `);

        console.log(`📋 Empresas sin el módulo: ${companies.length}`);

        for (const company of companies) {
            await sequelize.query(`
                INSERT INTO company_modules (company_id, system_module_id, is_contracted, is_active, is_operational, created_at, updated_at)
                VALUES ('${company.company_id}', '5aaf53ed-9ed0-4103-a065-e5296788cd03', true, true, true, NOW(), NOW());
            `);
            console.log(`✅ Asignado a empresa ${company.company_id}`);
        }

        // Verificar resultado final
        const [result] = await sequelize.query(`
            SELECT id, module_key, name, description FROM system_modules
            WHERE id = '5aaf53ed-9ed0-4103-a065-e5296788cd03';
        `);

        console.log('📋 Módulo actualizado:');
        console.log(`  - ID: ${result[0].id}`);
        console.log(`  - Key: ${result[0].module_key}`);
        console.log(`  - Name: ${result[0].name}`);
        console.log(`  - Description: ${result[0].description}`);

        console.log('🎉 ¡Centro de Comando Biométrico listo!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

updateBiometricModule();