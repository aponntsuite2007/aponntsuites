/**
 * Script para verificar todos los módulos biométricos
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function checkBiometricModules() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión establecida');

        // Buscar todos los módulos biométricos
        const [biometricModules] = await sequelize.query(`
            SELECT id, module_key, name, description, icon, category
            FROM system_modules
            WHERE module_key ILIKE '%biometric%' OR name ILIKE '%biometric%' OR name ILIKE '%biometr%'
            ORDER BY name;
        `);

        console.log('📋 Módulos biométricos encontrados:');
        biometricModules.forEach((module, index) => {
            console.log(`\n${index + 1}. ${module.name}`);
            console.log(`   - ID: ${module.id}`);
            console.log(`   - Key: ${module.module_key}`);
            console.log(`   - Icon: ${module.icon}`);
            console.log(`   - Category: ${module.category}`);
            console.log(`   - Description: ${module.description?.substring(0, 100)}...`);
        });

        // Verificar cuál usar para "Centro de Comando Biométrico"
        const [existingBiometric] = await sequelize.query(`
            SELECT id, module_key, name FROM system_modules WHERE module_key = 'biometric';
        `);

        if (existingBiometric.length > 0) {
            console.log('\n🎯 Módulo con key "biometric" encontrado:');
            console.log(`   - ID: ${existingBiometric[0].id}`);
            console.log(`   - Name: ${existingBiometric[0].name}`);
            console.log('   ✅ Este será usado para el Centro de Comando Biométrico');
        } else {
            console.log('\n❌ No se encontró módulo con key "biometric"');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkBiometricModules();