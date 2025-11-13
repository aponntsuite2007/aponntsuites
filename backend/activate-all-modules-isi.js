const { sequelize } = require('./src/config/database');
const UnifiedKnowledgeService = require('./src/services/UnifiedKnowledgeService');
const database = require('./src/config/database');

async function activateAllModulesForISI() {
    console.log('🔧 [ACTIVATE] Activando TODOS los módulos para empresa ISI...\n');

    try {
        // Inicializar UnifiedKnowledgeService
        const knowledgeService = new UnifiedKnowledgeService(database);
        await knowledgeService.initialize();

        console.log(`✅ [ACTIVATE] Knowledge Service initialized con ${knowledgeService.metadata.size} módulos\n`);

        // Recolectar TODOS los módulos para panel empresa
        const allModules = [];
        const coreModules = [];
        const optionalModules = [];

        for (const [moduleKey, metadata] of knowledgeService.metadata.entries()) {
            const isCore = metadata.commercial?.isCore || metadata.is_core || false;
            const availableIn = metadata.commercial?.availableIn || metadata.available_in || 'both';

            // Si es para panel empresa/company o both
            if (availableIn === 'empresa' || availableIn === 'company' || availableIn === 'both') {
                allModules.push(moduleKey);

                if (isCore) {
                    coreModules.push(moduleKey);
                } else {
                    optionalModules.push(moduleKey);
                }
            }
        }

        console.log('=== RESUMEN ===');
        console.log(`📦 Total módulos panel empresa: ${allModules.length}`);
        console.log(`✅ Módulos CORE: ${coreModules.length}`);
        console.log(`📦 Módulos OPCIONALES: ${optionalModules.length}\n`);

        console.log('=== CORE ===');
        coreModules.forEach(m => console.log(`  ✅ ${m}`));

        console.log('\n=== OPCIONALES ===');
        optionalModules.forEach(m => console.log(`  📦 ${m}`));

        // Actualizar BD para empresa ISI (company_id = 11)
        console.log('\n🔄 [UPDATE] Actualizando BD para empresa ISI (company_id = 11)...');

        const [result] = await sequelize.query(`
            UPDATE companies
            SET active_modules = $1::jsonb
            WHERE company_id = 11
            RETURNING company_id, name, active_modules
        `, {
            bind: [JSON.stringify(allModules)]
        });

        if (result.length > 0) {
            console.log('\n✅ [SUCCESS] Empresa ISI actualizada:');
            console.log(`   • Empresa: ${result[0].name} (ID: ${result[0].company_id})`);
            console.log(`   • Módulos activados: ${JSON.parse(result[0].active_modules).length}`);
            console.log('\n📋 Lista de módulos activados:');
            JSON.parse(result[0].active_modules).forEach((m, idx) => {
                const prefix = coreModules.includes(m) ? '✅' : '📦';
                console.log(`   ${prefix} ${(idx + 1).toString().padStart(2)}. ${m}`);
            });
        } else {
            console.error('\n❌ [ERROR] No se encontró la empresa ISI (company_id = 11)');
        }

        process.exit(0);

    } catch (error) {
        console.error('\n❌ [ERROR]', error);
        console.error(error.stack);
        process.exit(1);
    }
}

activateAllModulesForISI();
