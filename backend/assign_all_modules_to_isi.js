const { sequelize } = require('./src/config/database');

async function assignAllModulesToISI() {
    try {
        console.log('🔄 Iniciando asignación de todos los módulos a empresa ISI...');

        // 1. Buscar empresa ISI (por nombre que contenga 'isi')
        const companies = await sequelize.query(`
            SELECT company_id, name FROM companies
            WHERE LOWER(name) LIKE '%isi%'
            ORDER BY company_id
        `, {
            type: sequelize.QueryTypes.SELECT
        });

        console.log('📋 Empresas encontradas con "isi":', companies);

        if (companies.length === 0) {
            console.log('⚠️ No se encontró empresa ISI, usando company_id = 11');
            var isiCompanyId = 11;
        } else {
            var isiCompanyId = companies[0].company_id;
            console.log(`✅ Empresa ISI encontrada: ${companies[0].name} (ID: ${isiCompanyId})`);
        }

        // 2. Obtener todos los módulos del sistema
        const systemModules = await sequelize.query(`
            SELECT id, module_key, name
            FROM system_modules
            WHERE is_active = true
            ORDER BY module_key
        `, {
            type: sequelize.QueryTypes.SELECT
        });

        console.log(`📦 ${systemModules.length} módulos del sistema encontrados`);

        // 3. Limpiar módulos existentes de ISI
        await sequelize.query(`
            DELETE FROM company_modules
            WHERE company_id = ?
        `, {
            replacements: [isiCompanyId],
            type: sequelize.QueryTypes.DELETE
        });

        console.log(`🧹 Módulos existentes de empresa ${isiCompanyId} eliminados`);

        // 4. Insertar todos los módulos para ISI
        let insertCount = 0;
        for (const module of systemModules) {
            try {
                await sequelize.query(`
                    INSERT INTO company_modules (
                        company_id,
                        system_module_id,
                        activo,
                        fecha_asignacion,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, true, NOW(), NOW(), NOW())
                `, {
                    replacements: [isiCompanyId, module.id],
                    type: sequelize.QueryTypes.INSERT
                });

                insertCount++;
                console.log(`✅ ${insertCount}/${systemModules.length} - Asignado: ${module.module_key} (${module.name})`);
            } catch (error) {
                console.error(`❌ Error asignando ${module.module_key}:`, error.message);
            }
        }

        // 5. Verificar asignación
        const assignedModules = await sequelize.query(`
            SELECT
                cm.company_id,
                sm.module_key,
                sm.name,
                cm.activo
            FROM company_modules cm
            INNER JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = ?
            ORDER BY sm.module_key
        `, {
            replacements: [isiCompanyId],
            type: sequelize.QueryTypes.SELECT
        });

        console.log(`\n🎯 RESUMEN:`);
        console.log(`   • Empresa: ${isiCompanyId}`);
        console.log(`   • Módulos disponibles: ${systemModules.length}`);
        console.log(`   • Módulos asignados: ${assignedModules.length}`);
        console.log(`   • Módulos activos: ${assignedModules.filter(m => m.activo).length}`);

        console.log(`\n📋 MÓDULOS ASIGNADOS:`);
        assignedModules.forEach((mod, index) => {
            console.log(`   ${index + 1}. ${mod.module_key} - ${mod.name} ${mod.activo ? '✅' : '❌'}`);
        });

        console.log(`\n✅ ¡Asignación completada! ISI ahora tiene todos los ${assignedModules.length} módulos.`);

    } catch (error) {
        console.error('❌ Error en asignación de módulos:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    assignAllModulesToISI();
}

module.exports = { assignAllModulesToISI };