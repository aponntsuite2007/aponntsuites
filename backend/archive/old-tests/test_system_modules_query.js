/**
 * Test the exact query from server.js that's only returning 20 modules
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function testSystemModulesQuery() {
    try {
        await sequelize.authenticate();
        console.log('✅ Testing exact server.js system-modules query...');

        // EXACT query from server.js line 1802-1820
        const query = `
            SELECT
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
                version
            FROM system_modules
            ORDER BY display_order ASC, name ASC
        `;

        const systemModules = await sequelize.query(query, {
            type: sequelize.QueryTypes.SELECT
        });

        console.log(`📋 EXACT SERVER QUERY: ${systemModules.length} módulos encontrados`);

        // Show first 25 modules to see what's being returned
        console.log('\n📋 Primeros 25 módulos:');
        systemModules.slice(0, 25).forEach((module, index) => {
            console.log(`  ${index + 1}. ${module.module_key} → ${module.name} (active: ${module.is_active}, order: ${module.display_order})`);
        });

        // Check specifically for biometric
        const biometricModule = systemModules.find(m => m.module_key === 'biometric');
        console.log(`\n🔍 BIOMETRIC MODULE:`);
        if (biometricModule) {
            console.log(`  ✅ ENCONTRADO: ${biometricModule.name} (active: ${biometricModule.is_active}, order: ${biometricModule.display_order})`);
        } else {
            console.log(`  ❌ NO ENCONTRADO en los resultados`);
        }

        // Show totals
        console.log(`\n📊 TOTALES:`);
        console.log(`  - Total módulos: ${systemModules.length}`);
        console.log(`  - Activos: ${systemModules.filter(m => m.is_active).length}`);
        console.log(`  - Inactivos: ${systemModules.filter(m => !m.is_active).length}`);

        // If we're only getting 20, show the exact modules
        if (systemModules.length === 20) {
            console.log('\n⚠️ SOLO 20 MÓDULOS - Lista completa:');
            systemModules.forEach((module, index) => {
                console.log(`  ${index + 1}. ${module.module_key} → ${module.name}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

testSystemModulesQuery();