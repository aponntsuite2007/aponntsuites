const { sequelize } = require('../src/config/database');

async function debugISI() {
    try {
        console.log('🔍 [DEBUG] Verificando módulos de ISI...\n');

        // 1. Ver empresa ISI completa
        const [result] = await sequelize.query(`
            SELECT company_id, name, slug, active_modules
            FROM companies
            WHERE company_id = 11 OR LOWER(name) LIKE '%isi%'
        `);

        if (result.length === 0) {
            console.log('❌ No se encontró empresa ISI');
            process.exit(1);
        }

        const company = result[0];
        console.log('✅ EMPRESA ENCONTRADA:');
        console.log(`   ID: ${company.company_id}`);
        console.log(`   Nombre: ${company.name}`);
        console.log(`   Slug: ${company.slug}`);
        console.log('');

        // 2. Parsear active_modules
        let modules;
        try {
            modules = JSON.parse(company.active_modules);
        } catch (e) {
            console.log('⚠️  active_modules no es JSON válido');
            console.log('   Valor raw:', company.active_modules);
            process.exit(1);
        }

        console.log('📦 ACTIVE MODULES:');
        console.log(`   Tipo: ${Array.isArray(modules) ? 'ARRAY ✅' : 'OBJECT ⚠️'}`);
        console.log(`   Total: ${Array.isArray(modules) ? modules.length : Object.keys(modules).length}`);
        console.log('');

        // 3. Buscar occupational-health-enterprise
        const hasModule = Array.isArray(modules)
            ? modules.includes('occupational-health-enterprise')
            : modules['occupational-health-enterprise'] === true;

        console.log('🏥 MÓDULO OCCUPATIONAL HEALTH ENTERPRISE:');
        console.log(`   Presente: ${hasModule ? 'SÍ ✅' : 'NO ❌'}`);

        if (hasModule && Array.isArray(modules)) {
            const index = modules.indexOf('occupational-health-enterprise');
            console.log(`   Posición: ${index + 1} / ${modules.length}`);
        }
        console.log('');

        // 4. Listar TODOS los módulos médicos
        console.log('🏥 MÓDULOS MÉDICOS ACTIVOS:');
        const medicalModules = modules.filter(m =>
            m.includes('medical') ||
            m.includes('health') ||
            m.includes('art')
        );
        medicalModules.forEach(m => {
            console.log(`   • ${m}`);
        });
        console.log('');

        // 5. Ver panel-empresa.html
        const fs = require('fs');
        const path = require('path');
        const panelPath = path.join(__dirname, '..', 'public', 'panel-empresa.html');
        const content = fs.readFileSync(panelPath, 'utf8');

        console.log('📄 PANEL-EMPRESA.HTML:');
        const occurrences = (content.match(/occupational-health-enterprise/g) || []).length;
        console.log(`   Ocurrencias de "occupational-health-enterprise": ${occurrences}`);

        const hasArrayCheck = content.includes('Array.isArray(company.activeModules)');
        console.log(`   Tiene Array.isArray check: ${hasArrayCheck ? 'SÍ ✅' : 'NO ❌'}`);
        console.log('');

        console.log('✅ [RESUMEN]');
        console.log(`   • Empresa ISI: ${company.company_id === 11 ? 'OK ✅' : 'PROBLEMA ❌'}`);
        console.log(`   • Módulo en BD: ${hasModule ? 'OK ✅' : 'FALTA ❌'}`);
        console.log(`   • En panel-empresa: ${occurrences >= 4 ? 'OK ✅' : 'FALTA ❌'}`);
        console.log(`   • Logic fix: ${hasArrayCheck ? 'OK ✅' : 'FALTA ❌'}`);
        console.log('');

        if (hasModule && occurrences >= 4 && hasArrayCheck) {
            console.log('🎉 TODO ESTÁ EN ORDEN');
            console.log('   💡 Intenta:');
            console.log('      1. Cerrar navegador completamente');
            console.log('      2. Abrir nuevo navegador');
            console.log('      3. Login en ISI');
            console.log('      4. Ctrl+F5 (hard reload)');
        } else {
            console.log('⚠️  HAY PROBLEMAS - revisar arriba');
        }

        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

debugISI();
