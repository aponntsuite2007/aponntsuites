/**
 * Script para debuggear exactamente qué módulos ve el sistema
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function debugModulesQuery() {
    try {
        await sequelize.authenticate();
        console.log('✅ Debuggeando consulta de módulos...');

        // 1. Ver todos los system_modules
        const [allSystemModules] = await sequelize.query(`
            SELECT id, module_key, name, is_active FROM system_modules ORDER BY name;
        `);

        console.log(`\n📋 TODOS los system_modules (${allSystemModules.length}):`);
        allSystemModules.forEach(module => {
            console.log(`  - ${module.module_key} → ${module.name} (active: ${module.is_active})`);
        });

        // 2. Ver módulos asignados a empresa 4
        const [company4Modules] = await sequelize.query(`
            SELECT sm.module_key, sm.name, cm.activo
            FROM system_modules sm
            JOIN company_modules cm ON sm.id = cm.system_module_id
            WHERE cm.company_id = 4 AND cm.activo = true
            ORDER BY sm.name;
        `);

        console.log(`\n📋 Módulos asignados a EMPRESA 4 (${company4Modules.length}):`);
        company4Modules.forEach(module => {
            console.log(`  - ${module.module_key} → ${module.name} (activo: ${module.activo})`);
        });

        // 3. Ver módulos asignados a empresa 11
        const [company11Modules] = await sequelize.query(`
            SELECT sm.module_key, sm.name, cm.activo
            FROM system_modules sm
            JOIN company_modules cm ON sm.id = cm.system_module_id
            WHERE cm.company_id = 11 AND cm.activo = true
            ORDER BY sm.name;
        `);

        console.log(`\n📋 Módulos asignados a EMPRESA 11 (${company11Modules.length}):`);
        company11Modules.forEach(module => {
            console.log(`  - ${module.module_key} → ${module.name} (activo: ${module.activo})`);
        });

        // 4. Verificar específicamente biometric
        const [biometricCheck] = await sequelize.query(`
            SELECT
                sm.id, sm.module_key, sm.name, sm.is_active,
                cm.company_id, cm.activo
            FROM system_modules sm
            LEFT JOIN company_modules cm ON sm.id = cm.system_module_id
            WHERE sm.module_key = 'biometric';
        `);

        console.log(`\n🔍 ANÁLISIS ESPECÍFICO de 'biometric':`);
        if (biometricCheck.length === 0) {
            console.log('  ❌ NO existe módulo con module_key = "biometric"');
        } else {
            biometricCheck.forEach(record => {
                console.log(`  - Module: ${record.name} (active: ${record.is_active})`);
                if (record.company_id) {
                    console.log(`    → Asignado a empresa ${record.company_id} (activo: ${record.activo})`);
                } else {
                    console.log(`    → NO asignado a ninguna empresa`);
                }
            });
        }

        console.log('\n🎯 CONCLUSIÓN:');
        const hasBiometricIn4 = company4Modules.some(m => m.module_key === 'biometric');
        const hasBiometricIn11 = company11Modules.some(m => m.module_key === 'biometric');

        console.log(`  - Empresa 4 tiene biometric: ${hasBiometricIn4 ? '✅' : '❌'}`);
        console.log(`  - Empresa 11 tiene biometric: ${hasBiometricIn11 ? '✅' : '❌'}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

debugModulesQuery();