/**
 * Script para asignar el módulo biometric a empresas
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: console.log
});

async function assignBiometricToCompanies() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión establecida');

        // Obtener el ID del módulo biometric
        const [biometricModules] = await sequelize.query(`
            SELECT id, module_key, name FROM system_modules WHERE module_key = 'biometric';
        `);

        if (biometricModules.length === 0) {
            console.log('❌ No se encontró módulo biometric');
            return;
        }

        const biometricModule = biometricModules[0];
        console.log(`📋 Módulo encontrado: ${biometricModule.name} (ID: ${biometricModule.id})`);

        // Asignar a empresas 4 y 11 que vemos en los logs
        const companiesToUpdate = [4, 11];

        for (const companyId of companiesToUpdate) {
            // Verificar si ya existe la asignación
            const [existing] = await sequelize.query(`
                SELECT id FROM company_modules
                WHERE company_id = ${companyId} AND system_module_id = '${biometricModule.id}';
            `);

            if (existing.length === 0) {
                // Insertar nueva asignación
                await sequelize.query(`
                    INSERT INTO company_modules (company_id, system_module_id, is_contracted, is_active, is_operational, created_at, updated_at)
                    VALUES (${companyId}, '${biometricModule.id}', true, true, true, NOW(), NOW());
                `);
                console.log(`✅ Módulo biometric asignado a empresa ${companyId}`);
            } else {
                console.log(`✅ Módulo biometric ya asignado a empresa ${companyId}`);
            }
        }

        // Verificar el resultado
        const [finalCheck] = await sequelize.query(`
            SELECT cm.company_id, sm.module_key, sm.name, cm.is_active, cm.is_operational
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE sm.module_key = 'biometric' AND cm.company_id IN (4, 11);
        `);

        console.log('\n📋 Verificación final:');
        finalCheck.forEach(result => {
            console.log(`   - Empresa ${result.company_id}: ${result.name} (Active: ${result.is_active}, Operational: ${result.is_operational})`);
        });

        console.log('\n🎉 ¡Proceso completado!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

assignBiometricToCompanies();