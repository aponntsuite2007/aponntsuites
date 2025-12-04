const { sequelize } = require('../src/config/database');

console.log('🔍 [VERIFY] Verificando módulos de empresa ISI...\n');

async function verifyModules() {
    try {
        // Consultar módulos de ISI
        const [result] = await sequelize.query(`
            SELECT
                company_id,
                name,
                slug,
                active_modules,
                modules,
                modules_data
            FROM companies
            WHERE company_id = 11
        `);

        if (!result || result.length === 0) {
            console.log('❌ Empresa ISI no encontrada');
            process.exit(1);
        }

        const company = result[0];
        console.log(`✅ Empresa: ${company.name} (ID: ${company.company_id}, Slug: ${company.slug})`);
        console.log(`\n📊 ACTIVE_MODULES (${company.active_modules ? company.active_modules.length : 0} módulos):`);

        // Buscar occupational-health-enterprise
        const hasOH = company.active_modules && company.active_modules.includes('occupational-health-enterprise');
        console.log(`   🏥 "occupational-health-enterprise": ${hasOH ? '✅ PRESENTE' : '❌ NO ENCONTRADO'}`);

        if (hasOH) {
            const index = company.active_modules.indexOf('occupational-health-enterprise');
            console.log(`   📍 Posición en array: ${index}`);
        }

        // Mostrar algunos módulos para contexto
        console.log(`\n📋 Primeros 10 módulos en active_modules:`);
        if (company.active_modules) {
            company.active_modules.slice(0, 10).forEach((mod, idx) => {
                console.log(`   ${idx + 1}. ${mod}`);
            });
        }

        // Buscar módulos médicos
        console.log(`\n🔍 Módulos médicos encontrados:`);
        if (company.active_modules) {
            const medicalModules = company.active_modules.filter(m =>
                m.toLowerCase().includes('medical') ||
                m.toLowerCase().includes('health') ||
                m.toLowerCase().includes('medic')
            );
            medicalModules.forEach(mod => {
                console.log(`   - ${mod}`);
            });
        }

        // Verificar estructura MODULES (no active_modules)
        console.log(`\n📊 MODULES (campo separado):`);
        if (company.modules) {
            console.log(`   Tipo: ${typeof company.modules}`);
            console.log(`   Contenido: ${JSON.stringify(company.modules).substring(0, 200)}...`);
        } else {
            console.log(`   ❌ Campo "modules" está vacío o NULL`);
        }

        // Verificar MODULES_DATA
        console.log(`\n📊 MODULES_DATA:`);
        if (company.modules_data) {
            console.log(`   Tipo: ${typeof company.modules_data}`);
            if (typeof company.modules_data === 'object') {
                const keys = Object.keys(company.modules_data);
                console.log(`   Keys (${keys.length}): ${keys.slice(0, 10).join(', ')}...`);

                // Buscar occupational-health
                if (company.modules_data['occupational-health-enterprise']) {
                    console.log(`   🏥 "occupational-health-enterprise" en modules_data: ✅ EXISTE`);
                    console.log(`   Valor:`, company.modules_data['occupational-health-enterprise']);
                } else {
                    console.log(`   🏥 "occupational-health-enterprise" en modules_data: ❌ NO EXISTE`);
                }
            }
        } else {
            console.log(`   ❌ Campo "modules_data" está vacío o NULL`);
        }

        process.exit(0);

    } catch (error) {
        console.error('\n❌ [ERROR]:', error.message);
        console.error(error);
        process.exit(1);
    }
}

verifyModules();
