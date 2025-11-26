/**
 * Script para actualizar solo el nombre del módulo biométrico
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function updateBiometricName() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión establecida');

        // Actualizar solo el nombre y descripción del módulo existente
        await sequelize.query(`
            UPDATE system_modules
            SET
                name = 'Centro de Comando Biométrico',
                description = 'Centro de Comando Biométrico con conexiones a Harvard, Stanford y MIT. Hub unificado para análisis biométrico avanzado, templates faciales MIT FaceNet, detección de fatiga Stanford y análisis emocional Harvard Medical.',
                updated_at = NOW()
            WHERE module_key = 'biometric';
        `);

        console.log('✅ Nombre actualizado a "Centro de Comando Biométrico"');

        // Verificar el resultado
        const [result] = await sequelize.query(`
            SELECT id, module_key, name, description FROM system_modules
            WHERE module_key = 'biometric';
        `);

        if (result.length > 0) {
            console.log('\n🎯 Módulo actualizado:');
            console.log(`   - ID: ${result[0].id}`);
            console.log(`   - Key: ${result[0].module_key}`);
            console.log(`   - Name: ${result[0].name}`);
            console.log(`   - Description: ${result[0].description?.substring(0, 150)}...`);
        }

        console.log('\n🎉 ¡Centro de Comando Biométrico listo!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

updateBiometricName();