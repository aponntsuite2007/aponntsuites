/**
 * TEST PASO 3 - DYNAMIC CRUD (organizational-structure)
 *
 * Verifica que el sistema dinámico funciona para CUALQUIER módulo,
 * no solo users. Usando organizational-structure que contiene departments.
 *
 * - FASE 1: Discovery de módulo (botones, inputs, tabs, modales)
 * - FASE 2: Generación de datos con Faker basado en metadata
 * - FASE 3: CREATE (abrir modal, llenar inputs, guardar)
 * - FASE 4: READ (verificar en tabla/lista)
 * - FASE 5: VERIFICACIÓN BD (PostgreSQL)
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
        console.log('║  TEST DYNAMIC CRUD - PASO 3 (TODAS LAS FASES)            ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log('║  Módulo:   organizational-structure (departments)         ║');
        console.log('║  Empresa:  isi (ID: 11)                                   ║');
        console.log('║  Tabla BD: departments                                    ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Login
        await orchestrator.login('isi', 'admin', 'admin123');
        console.log('✅ Login exitoso\n');

        // Navegar al módulo organizational-structure
        await orchestrator.navigateToModule('organizational-structure');
        await orchestrator.wait(2000);
        console.log('✅ Navegación a módulo "organizational-structure" exitosa\n');

        // Buscar botón de crear departamento
        console.log('🔘 Buscando botón "Agregar Departamento"...');
        const modalOpened = await orchestrator.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            // Buscar botón con "Agregar", "Nuevo" o "Crear" + "Departamento"
            const btn = buttons.find(b => {
                const text = b.textContent.toLowerCase();
                return (text.includes('agregar') || text.includes('nuevo') || text.includes('crear')) &&
                       text.includes('departamento');
            });
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });

        if (!modalOpened) {
            throw new Error('No se pudo abrir modal de crear departamento');
        }

        console.log('✅ Modal abierto\n');
        await orchestrator.wait(2000);

        // ════════════════════════════════════════════════════════════════════
        // EJECUTAR runDynamicCRUDTest - TODAS LAS FASES (1-5)
        // ════════════════════════════════════════════════════════════════════

        console.log('🚀 Ejecutando runDynamicCRUDTest()...\n');

        const results = await orchestrator.runDynamicCRUDTest(
            'organizational-structure',  // moduleKey
            11,                          // companyId
            'isi',                       // companySlug
            'admin',                     // username
            'admin123'                   // password
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
        console.log(`   WARNING: ${results.tests.filter(t => t.status === 'WARNING').length} ⚠️`);
        console.log(`   PENDING: ${results.tests.filter(t => t.status === 'PENDING').length} ⏳`);
        console.log('');

        console.log('📋 DETALLE DE TESTS:');
        results.tests.forEach((test, idx) => {
            const statusIcon = test.status === 'PASSED' ? '✅' :
                             test.status === 'FAILED' ? '❌' :
                             test.status === 'WARNING' ? '⚠️' :
                             test.status === 'PENDING' ? '⏳' : '❓';

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
        const fase3Passed = results.tests.find(t => t.name.includes('CREATE'))?.status === 'PASSED';
        const fase4Status = results.tests.find(t => t.name.includes('READ'))?.status;
        const fase4Passed = fase4Status === 'PASSED' || fase4Status === 'WARNING';
        const fase5Passed = results.tests.find(t => t.name.includes('VERIFICACIÓN BD'))?.status === 'PASSED';

        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║                   VALIDACIÓN FINAL                        ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log(`║  FASE 1 (DISCOVERY):       ${fase1Passed ? '✅ PASSED' : '❌ FAILED'.padEnd(30)} ║`);
        console.log(`║  FASE 2 (GENERACIÓN):      ${fase2Passed ? '✅ PASSED' : '❌ FAILED'.padEnd(30)} ║`);
        console.log(`║  FASE 3 (CREATE):          ${fase3Passed ? '✅ PASSED' : '❌ FAILED'.padEnd(30)} ║`);
        console.log(`║  FASE 4 (READ):            ${fase4Passed ? (fase4Status === 'WARNING' ? '⚠️  WARNING' : '✅ PASSED') : '❌ FAILED'.padEnd(30)} ║`);
        console.log(`║  FASE 5 (VERIFICACIÓN BD): ${fase5Passed ? '✅ PASSED' : '❌ FAILED'.padEnd(30)} ║`);
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const allPassed = fase1Passed && fase2Passed && fase3Passed && fase4Passed && fase5Passed;

        if (allPassed) {
            console.log('🎉 ✅ PASO 3 (TODAS LAS FASES) FUNCIONANDO AL 100%\n');
            console.log('📌 SISTEMA DINÁMICO UNIVERSAL VERIFICADO:');
            console.log('   ✅ Funciona con módulo "organizational-structure"');
            console.log('   ✅ Descubre inputs dinámicamente');
            console.log('   ✅ Genera datos con Faker contextualmente');
            console.log('   ✅ Ejecuta CREATE completo');
            console.log('   ✅ Verifica en UI (READ)');
            console.log('   ✅ Verifica persistencia en PostgreSQL (FASE 5)\n');
            console.log('📌 PRÓXIMO PASO:');
            console.log('   - Integrar runDynamicCRUDTest() en runAutoHealingCycle()');
            console.log('   - Ejecutar en TODOS los módulos del sistema\n');
        } else {
            console.log('❌ ALGUNAS FASES FALLARON - Revisar errores arriba\n');

            if (!fase5Passed) {
                console.log('⚠️  FASE 5 (BD) falló - Posibles causas:');
                console.log('   1. Modal no está persistiendo realmente en BD');
                console.log('   2. company_id no coincide');
                console.log('   3. Mapping de campos incorrecto');
                console.log('   4. Tabla incorrecta (revisar SystemRegistry)\n');
            }
        }

        await orchestrator.stop();
        process.exit(allPassed ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR en test:', error.message);
        console.error(error.stack);
        await orchestrator.stop();
        process.exit(1);
    }
})();
