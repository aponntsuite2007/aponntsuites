/**
 * Verificar qué empresas tienen el módulo procurement-management
 */
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9998';

async function checkProcurement() {
    console.log('🔍 Buscando módulo procurement-management...\n');

    try {
        // 1. Obtener lista de empresas
        const companiesRes = await fetch(`${BASE_URL}/api/v1/companies`);
        const companiesData = await companiesRes.json();

        if (!companiesData.success) {
            console.log('❌ Error obteniendo empresas');
            return;
        }

        console.log(`📊 Total empresas: ${companiesData.data.length}\n`);

        // 2. Buscar en cada empresa si tiene procurement
        for (const company of companiesData.data.slice(0, 10)) {
            const modulesRes = await fetch(`${BASE_URL}/api/v1/modules/company/${company.id}`);
            const modulesData = await modulesRes.json();

            const modules = modulesData.data || modulesData.modules || [];
            const hasProcurement = modules.some(m =>
                m.module_key === 'procurement-management' ||
                m.module_key === 'procurement' ||
                m.name?.toLowerCase().includes('compras')
            );

            if (hasProcurement) {
                console.log(`✅ ${company.name} (${company.slug}) TIENE procurement`);
            }
        }

        // 3. Verificar módulos del sistema (todos los disponibles)
        console.log('\n📦 Verificando módulos del sistema...');
        const allModulesRes = await fetch(`${BASE_URL}/api/v1/modules`);
        const allModulesData = await allModulesRes.json();

        const allModules = allModulesData.data || allModulesData.modules || [];
        console.log(`   Total módulos en sistema: ${allModules.length}`);

        const procurementModule = allModules.find(m =>
            m.module_key === 'procurement-management' ||
            m.module_key === 'procurement' ||
            m.name?.toLowerCase().includes('compras')
        );

        if (procurementModule) {
            console.log('   ✅ Módulo procurement existe:', procurementModule.module_key, '-', procurementModule.name);
        } else {
            console.log('   ❌ Módulo procurement NO existe en el sistema');
            console.log('   📋 Módulos disponibles:');
            allModules.forEach(m => {
                console.log(`      - ${m.module_key}: ${m.name}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkProcurement();
