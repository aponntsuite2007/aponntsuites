/**
 * Script para debuggear exactamente qué módulos ve la query del servidor
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function debugCompany4Modules() {
    try {
        await sequelize.authenticate();
        console.log('✅ Debuggeando módulos de empresa 4 exactamente como el servidor...');

        // Consulta EXACTA del servidor en companyModuleRoutes.js línea 279-297
        const contractedModules = await sequelize.query(`
            SELECT
                cm.id,
                sm.module_key,
                cm.activo as is_active,
                cm.fecha_asignacion as contracted_at,
                null as expires_at,
                sm.name as module_name,
                sm.description as module_description,
                sm.icon as module_icon,
                sm.color as module_color
            FROM company_modules cm
            INNER JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = ?
            ORDER BY sm.name ASC
        `, {
            replacements: [4],
            type: sequelize.QueryTypes.SELECT
        });

        console.log(`\n📋 QUERY DEL SERVIDOR - Empresa 4: ${contractedModules.length} módulos encontrados`);
        contractedModules.forEach((module, index) => {
            console.log(`  ${index + 1}. ${module.module_key} → ${module.module_name} (active: ${module.is_active})`);
        });

        // También ver todos los system modules
        const allSystemModules = await sequelize.query(`
            SELECT
                id,
                module_key,
                name,
                description,
                icon,
                color
            FROM system_modules
            ORDER BY name ASC
        `, {
            type: sequelize.QueryTypes.SELECT
        });

        console.log(`\n📋 TODOS los system_modules: ${allSystemModules.length} módulos encontrados`);

        // Ver específicamente si biometric está en la lista
        const biometricInSystemModules = allSystemModules.find(m => m.module_key === 'biometric');
        const biometricInContracted = contractedModules.find(m => m.module_key === 'biometric');

        console.log(`\n🔍 ANÁLISIS BIOMETRIC:`);
        console.log(`  - En system_modules: ${biometricInSystemModules ? '✅ SÍ' : '❌ NO'}`);
        console.log(`  - En contracted (empresa 4): ${biometricInContracted ? '✅ SÍ' : '❌ NO'}`);

        if (biometricInSystemModules) {
            console.log(`  - System module: ${biometricInSystemModules.name} (key: ${biometricInSystemModules.module_key})`);
        }

        if (biometricInContracted) {
            console.log(`  - Contracted module: ${biometricInContracted.module_name} (key: ${biometricInContracted.module_key})`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

debugCompany4Modules();