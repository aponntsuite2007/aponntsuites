/**
 * Script simple para ver exactamente qué está en la base de datos
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function checkModulesSimple() {
    try {
        await sequelize.authenticate();
        console.log('✅ Verificando base de datos...');

        // Ver todos los módulos con biometric en el nombre o key
        const [modules] = await sequelize.query(`
            SELECT module_key, name FROM system_modules
            WHERE module_key ILIKE '%biometric%' OR name ILIKE '%biometric%'
            ORDER BY name;
        `);

        console.log('📋 Módulos biométricos en system_modules:');
        modules.forEach(module => {
            console.log(`   - Key: "${module.module_key}" → Name: "${module.name}"`);
        });

        // Ver qué módulos tiene asignados la empresa ISI (company_id = 11)
        const [companyModules] = await sequelize.query(`
            SELECT sm.module_key, sm.name, cm.is_active, cm.is_operational
            FROM system_modules sm
            JOIN company_modules cm ON sm.id = cm.system_module_id
            WHERE cm.company_id = 11 AND (sm.module_key ILIKE '%biometric%' OR sm.name ILIKE '%biometric%')
            ORDER BY sm.name;
        `);

        console.log('\n📋 Módulos biométricos asignados a empresa ISI (ID: 11):');
        companyModules.forEach(module => {
            console.log(`   - Key: "${module.module_key}" → Name: "${module.name}" (Active: ${module.is_active}, Operational: ${module.is_operational})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkModulesSimple();