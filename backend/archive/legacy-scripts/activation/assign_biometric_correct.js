/**
 * Script para asignar biometric con la estructura correcta
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function assignBiometricCorrect() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión establecida');

        // Obtener el módulo biometric
        const [biometricModules] = await sequelize.query(`
            SELECT id, module_key, name FROM system_modules WHERE module_key = 'biometric';
        `);

        if (biometricModules.length === 0) {
            console.log('❌ No se encontró módulo biometric');
            return;
        }

        const biometricModule = biometricModules[0];
        console.log(`📋 Módulo encontrado: ${biometricModule.name} (ID: ${biometricModule.id})`);

        // Asignar a empresas 4 y 11
        const companiesToUpdate = [4, 11];

        for (const companyId of companiesToUpdate) {
            // Verificar si ya existe
            const [existing] = await sequelize.query(`
                SELECT id FROM company_modules
                WHERE company_id = ${companyId} AND system_module_id = '${biometricModule.id}';
            `);

            if (existing.length === 0) {
                // Insertar con la estructura correcta
                await sequelize.query(`
                    INSERT INTO company_modules (
                        id, company_id, system_module_id, precio_mensual,
                        activo, fecha_asignacion, created_at, updated_at
                    )
                    VALUES (
                        gen_random_uuid(), ${companyId}, '${biometricModule.id}', 0,
                        true, NOW(), NOW(), NOW()
                    );
                `);
                console.log(`✅ Módulo biometric asignado a empresa ${companyId}`);
            } else {
                console.log(`✅ Módulo biometric ya asignado a empresa ${companyId}`);
            }
        }

        // Verificar el resultado
        const [finalCheck] = await sequelize.query(`
            SELECT cm.company_id, sm.module_key, sm.name, cm.activo
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE sm.module_key = 'biometric' AND cm.company_id IN (4, 11);
        `);

        console.log('\n📋 Verificación final:');
        finalCheck.forEach(result => {
            console.log(`   - Empresa ${result.company_id}: ${result.name} (Active: ${result.activo})`);
        });

        console.log('\n🎉 ¡Listo! Ahora recarga el panel para ver "Control Biométrico"');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

assignBiometricCorrect();