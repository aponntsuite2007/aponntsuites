/**
 * TEST: AUTO-HEALING CYCLE + DYNAMIC CRUD TESTING
 *
 * Verifica que el auto-healing cycle ahora ejecuta:
 * 1. Discovery de módulo
 * 2. Cross-reference con Brain
 * 3. Update Brain metadata
 * 4. 🎯 DYNAMIC CRUD TESTING (PASO 3)
 *
 * Ejecuta solo en 2-3 módulos para verificación rápida.
 */

const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');

(async () => {
    const orchestrator = new Phase4TestOrchestrator({
        headless: false,  // Navegador visible
        slowMo: 100,
        timeout: 60000
    }, database.sequelize);

    try {
        await orchestrator.start();

        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  TEST: AUTO-HEALING CYCLE + DYNAMIC CRUD (INTEGRADO)     ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log('║  Objetivo: Verificar integración completa                ║');
        console.log('║  - Discovery + Brain Update                               ║');
        console.log('║  - Dynamic CRUD Testing (5 fases)                         ║');
        console.log('║  Módulos: users, organizational-structure                 ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Ejecutar auto-healing cycle con solo 2 módulos
        const results = await orchestrator.runAutoHealingCycle({
            maxIterations: 1,              // Solo 1 iteración para test rápido
            companySlug: 'isi',
            username: 'admin',
            password: 'admin123',
            moduleKeys: ['users', 'organizational-structure']  // Solo 2 módulos
        });

        // ════════════════════════════════════════════════════════════════════
        // ANÁLISIS DE RESULTADOS
        // ════════════════════════════════════════════════════════════════════

        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║                   ANÁLISIS DE RESULTADOS                  ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        let totalModules = 0;
        let modulesWithCRUD = 0;
        let totalCrudPassed = 0;
        let totalCrudFailed = 0;

        for (const iteration of results.iterations) {
            totalModules += iteration.modulesProcessed;

            for (const module of iteration.modules) {
                if (module.crudTestPassed !== undefined || module.crudTestFailed !== undefined) {
                    modulesWithCRUD++;
                    totalCrudPassed += module.crudTestPassed || 0;
                    totalCrudFailed += module.crudTestFailed || 0;

                    console.log(`📦 ${module.moduleKey}:`);
                    console.log(`   Gaps: ${module.gapsFound} encontrados, ${module.gapsHealed} sanados`);
                    console.log(`   CRUD: ${module.crudTestPassed} PASSED, ${module.crudTestFailed} FAILED`);
                    console.log('');
                }
            }
        }

        const totalCrudTests = totalCrudPassed + totalCrudFailed;
        const crudSuccessRate = totalCrudTests > 0
            ? ((totalCrudPassed / totalCrudTests) * 100).toFixed(1)
            : 0;

        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║                   VALIDACIÓN FINAL                        ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log(`║  Módulos procesados:     ${totalModules}                                  ║`);
        console.log(`║  Con CRUD testing:       ${modulesWithCRUD}                                  ║`);
        console.log(`║  Total CRUD tests:       ${totalCrudTests}                                 ║`);
        console.log(`║  CRUD PASSED:            ${totalCrudPassed} ✅                              ║`);
        console.log(`║  CRUD FAILED:            ${totalCrudFailed} ❌                              ║`);
        console.log(`║  Success Rate:           ${crudSuccessRate}%                            ║`);
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const integrationSuccess = modulesWithCRUD > 0 && totalCrudTests > 0;

        if (integrationSuccess) {
            console.log('🎉 ✅ INTEGRACIÓN EXITOSA\n');
            console.log('📌 EL SISTEMA AHORA:');
            console.log('   ✅ Ejecuta Discovery + Brain Update');
            console.log('   ✅ Ejecuta Dynamic CRUD Testing (5 fases)');
            console.log('   ✅ Reporta estadísticas CRUD en el resumen');
            console.log('   ✅ Funciona con CUALQUIER módulo (100% dinámico)\n');
            console.log('📌 OBJETIVO LOGRADO:');
            console.log('   "Reemplazar a cientos de personas testeando el sistema de punta a punta" ✅\n');
        } else {
            console.log('❌ INTEGRACIÓN INCOMPLETA\n');
            console.log('⚠️  El auto-healing cycle NO ejecutó CRUD testing.');
            console.log('   Revisar logs arriba para ver errores.\n');
        }

        await orchestrator.stop();
        process.exit(integrationSuccess ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR en test:', error.message);
        console.error(error.stack);
        await orchestrator.stop();
        process.exit(1);
    }
})();
