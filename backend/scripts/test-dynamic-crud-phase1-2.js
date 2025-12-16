/**
 * TEST PASO 3 - DYNAMIC CRUD (Fases 1 y 2 implementadas)
 *
 * Verifica:
 * - FASE 1: Discovery de módulo (botones, inputs, tabs, modales)
 * - FASE 2: Generación de datos con Faker basado en metadata
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
        console.log('║  TEST DYNAMIC CRUD - PASO 3 (FASES 1 y 2)                ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log('║  Módulo:   users                                          ║');
        console.log('║  Empresa:  isi (ID: 11)                                   ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Login
        await orchestrator.login('isi', 'admin', 'admin123');
        console.log('✅ Login exitoso\n');

        // Navegar al módulo
        await orchestrator.navigateToModule('users');
        await orchestrator.wait(2000);
        console.log('✅ Navegación a módulo "users" exitosa\n');

        // Abrir modal "Agregar Usuario"
        console.log('🔘 Abriendo modal "Agregar Usuario"...');
        const modalOpened = await orchestrator.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent.includes('Agregar Usuario'));
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });

        if (!modalOpened) {
            throw new Error('No se pudo abrir modal "Agregar Usuario"');
        }

        console.log('✅ Modal abierto\n');
        await orchestrator.wait(2000);

        // ════════════════════════════════════════════════════════════════════
        // EJECUTAR runDynamicCRUDTest - Fases 1 y 2
        // ════════════════════════════════════════════════════════════════════

        console.log('🚀 Ejecutando runDynamicCRUDTest()...\n');

        const results = await orchestrator.runDynamicCRUDTest(
            'users',     // moduleKey
            11,          // companyId
            'isi',       // companySlug
            'admin',     // username
            'admin123'   // password
        );

        // ════════════════════════════════════════════════════════════════════
        // ANÁLISIS DE RESULTADOS
        // ════════════════════════════════════════════════════════════════════

        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║                   ANÁLISIS DE RESULTADOS                  ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        console.log('📊 RESUMEN:');
        console.log(`   Total tests: ${results.tests.length}`);
        console.log(`   PASSED: ${results.passed} ✅`);
        console.log(`   FAILED: ${results.failed} ❌`);
        console.log(`   PENDING: ${results.tests.filter(t => t.status === 'PENDING').length} ⏳`);
        console.log('');

        console.log('📋 DETALLE DE TESTS:');
        results.tests.forEach((test, idx) => {
            const statusIcon = test.status === 'PASSED' ? '✅' :
                             test.status === 'FAILED' ? '❌' :
                             test.status === 'PENDING' ? '⏳' : '⚠️';

            console.log(`   ${idx + 1}. ${statusIcon} ${test.name} - ${test.status}`);

            if (test.details) {
                Object.entries(test.details).forEach(([key, value]) => {
                    console.log(`      - ${key}: ${value}`);
                });
            }

            if (test.reason) {
                console.log(`      Razón: ${test.reason}`);
            }

            if (test.error) {
                console.log(`      Error: ${test.error}`);
            }
        });

        console.log('');

        // Mostrar datos generados
        if (results.testData) {
            console.log('🎲 DATOS GENERADOS CON FAKER:');
            Object.entries(results.testData).forEach(([field, value]) => {
                console.log(`   ${field}: ${value}`);
            });
            console.log('');
        }

        // ════════════════════════════════════════════════════════════════════
        // VALIDACIÓN DE ÉXITO
        // ════════════════════════════════════════════════════════════════════

        const fase1Passed = results.tests.find(t => t.name.includes('DISCOVERY'))?.status === 'PASSED';
        const fase2Passed = results.tests.find(t => t.name.includes('GENERACIÓN'))?.status === 'PASSED';

        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║                   VALIDACIÓN FINAL                        ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log(`║  FASE 1 (DISCOVERY):       ${fase1Passed ? '✅ PASSED' : '❌ FAILED'.padEnd(30)} ║`);
        console.log(`║  FASE 2 (GENERACIÓN):      ${fase2Passed ? '✅ PASSED' : '❌ FAILED'.padEnd(30)} ║`);
        console.log(`║  FASE 3 (CREATE):          ${'⏳ PENDING'.padEnd(30)} ║`);
        console.log(`║  FASE 4 (READ):            ${'⏳ PENDING'.padEnd(30)} ║`);
        console.log(`║  FASE 5 (VERIFICACIÓN BD): ${'⏳ PENDING'.padEnd(30)} ║`);
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const allImplementedPassed = fase1Passed && fase2Passed;

        if (allImplementedPassed) {
            console.log('🎉 ✅ PASO 3 (Fases 1-2) FUNCIONANDO CORRECTAMENTE\n');
            console.log('📌 PRÓXIMOS PASOS:');
            console.log('   - Implementar FASE 3: CREATE (abrir modal, llenar inputs, guardar)');
            console.log('   - Implementar FASE 4: READ (verificar en tabla/lista)');
            console.log('   - Implementar FASE 5: VERIFICACIÓN BD (PostgreSQL)\n');
        } else {
            console.log('❌ FALLÓ - Revisar errores arriba\n');
        }

        await orchestrator.stop();
        process.exit(allImplementedPassed ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR en test:', error.message);
        console.error(error.stack);
        await orchestrator.stop();
        process.exit(1);
    }
})();
