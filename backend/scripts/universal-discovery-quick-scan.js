/**
 * ============================================================================
 * UNIVERSAL MODULE DISCOVERY - QUICK SCAN (10 módulos)
 * ============================================================================
 *
 * Script rápido para validar el sistema en los primeros 10 módulos.
 * Úsalo antes de ejecutar el scan completo de 45 módulos.
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  UNIVERSAL MODULE DISCOVERY - QUICK SCAN (10 módulos)     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const COMPANY_SLUG = 'isi';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const MAX_MODULES = 10;

(async () => {
    const orchestrator = new Phase4TestOrchestrator({
        headless: false,
        slowMo: 50,
        timeout: 30000
    }, database.sequelize);

    const results = {
        totalModules: 0,
        tested: 0,
        failed: 0,
        modules: [],
        consolidatedStats: {
            totalButtons: 0,
            totalUndocumented: 0
        },
        timestamp: new Date().toISOString()
    };

    try {
        await orchestrator.start();

        console.log('🔐 LOGIN...\n');
        await orchestrator.login(COMPANY_SLUG, USERNAME, PASSWORD);
        console.log('✅ Login exitoso\n');

        const [modules] = await database.sequelize.query(`
            SELECT module_key, name, category
            FROM system_modules
            WHERE is_active = true
            AND module_key NOT IN ('kiosks-apk', 'support-base', 'mi-espacio')
            ORDER BY category, module_key
            LIMIT ${MAX_MODULES}
        `);

        results.totalModules = modules.length;
        console.log(`📦 Testing ${modules.length} módulos...\n`);

        for (let i = 0; i < modules.length; i++) {
            const module = modules[i];
            const moduleKey = module.module_key;

            console.log(`\n[${ i + 1}/${modules.length}] 📦 ${moduleKey}`);

            const moduleResult = {
                moduleKey,
                name: module.name,
                status: 'pending',
                buttons: 0,
                undocumented: 0
            };

            try {
                await orchestrator.navigateToModule(moduleKey);
                await orchestrator.wait(1500);

                const discovery = await orchestrator.discoverModuleStructure(moduleKey);
                const comparison = await orchestrator.crossReferenceWithBrain(discovery, moduleKey);

                moduleResult.buttons = discovery.structure.buttons?.count || 0;
                moduleResult.undocumented = comparison.gaps?.undocumented.length || 0;
                moduleResult.status = 'success';

                results.consolidatedStats.totalButtons += moduleResult.buttons;
                results.consolidatedStats.totalUndocumented += moduleResult.undocumented;

                results.tested++;
                console.log(`   ✅ Buttons: ${moduleResult.buttons}, Gaps: ${moduleResult.undocumented}`);

            } catch (error) {
                console.error(`   ❌ ${error.message}`);
                moduleResult.status = 'failed';
                results.failed++;
            }

            results.modules.push(moduleResult);
        }

        console.log('\n' + '═'.repeat(70));
        console.log('QUICK SCAN COMPLETADO');
        console.log('═'.repeat(70));
        console.log(`\nTesteados: ${results.tested}/${results.totalModules}`);
        console.log(`Fallidos: ${results.failed}`);
        console.log(`Total Botones: ${results.consolidatedStats.totalButtons}`);
        console.log(`Total Gaps: ${results.consolidatedStats.totalUndocumented}\n`);

        const reportPath = path.join(__dirname, `../logs/discovery-quick-scan-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`✅ Reporte guardado: ${reportPath}\n`);

        await orchestrator.stop();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await orchestrator.stop();
        process.exit(1);
    }
})();
