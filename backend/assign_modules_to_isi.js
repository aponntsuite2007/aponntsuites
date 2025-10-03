#!/usr/bin/env node
/**
 * Script para asignar todos los módulos del sistema a la empresa ISI
 * Empresa ISI: company_id = 11
 */

const { SystemModule, CompanyModule, Company, sequelize } = require('./src/config/database');

async function assignModulesToISI() {
    try {
        console.log('🚀 [ISI-MODULES] Iniciando asignación de módulos a empresa ISI...');

        // 1. Verificar que la empresa ISI existe
        const isiCompany = await sequelize.query(
            'SELECT company_id, name FROM companies WHERE company_id = 11',
            { type: sequelize.QueryTypes.SELECT, plain: true }
        );

        if (!isiCompany) {
            throw new Error('❌ Empresa ISI (company_id = 11) no encontrada');
        }

        console.log(`✅ [ISI-MODULES] Empresa encontrada: ${isiCompany.name}`);

        // 2. Obtener todos los módulos del sistema
        const systemModules = await sequelize.query(
            'SELECT * FROM system_modules WHERE is_active = true',
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`📦 [ISI-MODULES] Encontrados ${systemModules.length} módulos del sistema`);

        // 3. Limpiar módulos existentes de ISI
        await sequelize.query(
            'DELETE FROM company_modules WHERE company_id = 11',
            { type: sequelize.QueryTypes.DELETE }
        );

        console.log('🧹 [ISI-MODULES] Módulos anteriores de ISI eliminados');

        // 4. Asignar todos los módulos a ISI usando la estructura correcta
        const now = new Date();

        for (const module of systemModules) {
            await sequelize.query(`
                INSERT INTO company_modules (
                    company_id, system_module_id, is_active, contracted_price,
                    employee_tier, contracted_at, created_at, updated_at
                ) VALUES (
                    :company_id, :system_module_id, :is_active, :contracted_price,
                    :employee_tier, :contracted_at, :created_at, :updated_at
                )
            `, {
                replacements: {
                    company_id: 11,
                    system_module_id: module.id,
                    is_active: true,
                    contracted_price: module.base_price || 0,
                    employee_tier: '1-50',
                    contracted_at: now,
                    created_at: now,
                    updated_at: now
                },
                type: sequelize.QueryTypes.INSERT
            });
        }

        console.log(`✅ [ISI-MODULES] ${systemModules.length} módulos asignados a ISI`);

        // 6. Verificar módulos insertados
        const assignedModules = await sequelize.query(`
            SELECT cm.is_active, sm.module_key, sm.name
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = 11
            ORDER BY sm.display_order
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('\n📋 [ISI-MODULES] Módulos asignados a ISI:');
        assignedModules.forEach(module => {
            const status = module.is_active ? '✅' : '❌';
            console.log(`  ${status} ${module.name} (${module.module_key})`);
        });

        console.log(`\n🎉 [ISI-MODULES] ¡Proceso completado! ISI ahora tiene ${assignedModules.length} módulos contratados`);

    } catch (error) {
        console.error('❌ [ISI-MODULES] Error asignando módulos:', error.message);
        console.error('❌ [ISI-MODULES] Stack:', error.stack);
        throw error;
    }
}

// Ejecutar el script
if (require.main === module) {
    assignModulesToISI()
        .then(() => {
            console.log('🏁 [ISI-MODULES] Script completado exitosamente');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 [ISI-MODULES] Script falló:', error.message);
            process.exit(1);
        });
}

module.exports = assignModulesToISI;