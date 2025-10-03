// ============================================
// LIMPIAR DUPLICADOS Y ASIGNAR MÓDULOS
// ============================================
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    timezone: '+00:00'
  }
);

async function cleanupAndAssign() {
    try {
        console.log('🔄 [CLEANUP] Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ [CLEANUP] Conectado exitosamente');

        // 1. Eliminar empresas duplicadas manteniendo la más reciente
        console.log('🧹 [CLEANUP] Eliminando empresas duplicadas...');

        // Obtener IDs de empresas a mantener (las más recientes)
        const companiesToKeep = await sequelize.query(`
            SELECT DISTINCT ON (slug) id, slug, name
            FROM companies
            WHERE metadata->>'created_for' = 'panel-transporte'
            ORDER BY slug, id DESC
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('📋 [CLEANUP] Empresas a mantener:');
        companiesToKeep.forEach(comp => {
            console.log(`   ${comp.slug} (ID: ${comp.id}) - ${comp.name}`);
        });

        const keepIds = companiesToKeep.map(c => c.id);

        // Eliminar asignaciones de módulos de empresas duplicadas
        await sequelize.query(`
            DELETE FROM company_modules
            WHERE company_id IN (
                SELECT company_id FROM companies
                WHERE metadata->>'created_for' = 'panel-transporte'
                AND id NOT IN (${keepIds.join(',')})
            )
        `);
        console.log('✅ [CLEANUP] Asignaciones de módulos duplicadas eliminadas');

        // Eliminar empresas duplicadas
        const deleteResult = await sequelize.query(`
            DELETE FROM companies
            WHERE metadata->>'created_for' = 'panel-transporte'
            AND id NOT IN (${keepIds.join(',')})
        `, { type: sequelize.QueryTypes.DELETE });

        console.log(`✅ [CLEANUP] ${deleteResult[1]} empresas duplicadas eliminadas`);

        // 2. Actualizar company_id del usuario ADMIN1 a la empresa válida
        const firstCompany = companiesToKeep[0];
        await sequelize.query(`
            UPDATE users SET company_id = ${firstCompany.id}
            WHERE email = 'admin1@transportes.com'
        `);
        console.log(`✅ [CLEANUP] Usuario ADMIN1 asignado a empresa ${firstCompany.name}`);

        // 3. Asignar módulos a empresas válidas
        console.log('\n🔄 [MODULES] Asignando módulos...');

        // Obtener módulos de transporte
        const modules = await sequelize.query(
            `SELECT id, module_key, name, base_price FROM system_modules WHERE module_key LIKE 'transport-%' ORDER BY display_order`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`📦 [MODULES] Módulos disponibles: ${modules.length}`);

        // Asignar módulos a cada empresa
        let totalAssignments = 0;
        for (const company of companiesToKeep) {
            console.log(`\n🔄 [MODULES] Procesando ${company.name}...`);

            // Obtener módulos activos de la empresa
            const companyData = await sequelize.query(
                `SELECT active_modules FROM companies WHERE company_id = ${company.company_id}`,
                { type: sequelize.QueryTypes.SELECT }
            );

            const activeModules = companyData[0]?.active_modules || {};
            const activeModuleKeys = Object.keys(activeModules).filter(k => activeModules[k]);
            console.log(`   📋 Módulos activos: ${activeModuleKeys.join(', ')}`);

            // Asignar cada módulo activo usando la estructura correcta
            for (const module of modules) {
                if (activeModules[module.module_key]) {
                    try {
                        await sequelize.query(`
                            INSERT INTO company_modules (
                                company_id, system_module_id, precio_mensual, activo, fecha_asignacion
                            ) VALUES (
                                ${company.company_id},
                                '${module.id}',
                                ${module.base_price},
                                true,
                                NOW()
                            );
                        `);
                        console.log(`   ✅ ${module.module_key} asignado ($${module.base_price})`);
                        totalAssignments++;
                    } catch (error) {
                        if (error.message.includes('llave duplicada')) {
                            console.log(`   ⚠️ ${module.module_key} ya asignado`);
                        } else {
                            console.warn(`   ❌ Error asignando ${module.module_key}:`, error.message);
                        }
                    }
                }
            }
        }

        // 4. Verificar resultado final
        console.log('\n🔍 [VERIFICATION] Verificando resultado...');

        const finalCompanies = await sequelize.query(
            `SELECT company_id, name, slug FROM companies WHERE metadata->>'created_for' = 'panel-transporte' ORDER BY name`,
            { type: sequelize.QueryTypes.SELECT }
        );

        const assignments = await sequelize.query(`
            SELECT
                c.name as company_name,
                sm.module_key,
                sm.name as module_name,
                cm.precio_mensual
            FROM company_modules cm
            JOIN companies c ON cm.company_id = c.id
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE sm.module_key LIKE 'transport-%'
            ORDER BY c.name, sm.display_order
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('📋 [VERIFICATION] Empresas finales:');
        finalCompanies.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.name} (${company.slug}) - ID: ${company.company_id}`);
        });

        console.log('\n📋 [VERIFICATION] Asignaciones de módulos:');
        let currentCompany = '';
        assignments.forEach(assignment => {
            if (assignment.company_name !== currentCompany) {
                currentCompany = assignment.company_name;
                console.log(`\n🏢 ${currentCompany}:`);
            }
            console.log(`   📦 ${assignment.module_key} - ${assignment.module_name} ($${assignment.precio_mensual})`);
        });

        console.log(`\n✅ [SUCCESS] Proceso completado`);
        console.log(`   🏢 Empresas: ${finalCompanies.length}`);
        console.log(`   📦 Asignaciones: ${assignments.length}`);
        console.log(`   🆕 Nuevas asignaciones: ${totalAssignments}`);

    } catch (error) {
        console.error('❌ [ERROR] Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('\n🔐 [CLEANUP] Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    cleanupAndAssign()
        .then(() => {
            console.log('\n🎉 [SUCCESS] LIMPIEZA Y ASIGNACIÓN COMPLETADA');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 [ERROR] FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { cleanupAndAssign };