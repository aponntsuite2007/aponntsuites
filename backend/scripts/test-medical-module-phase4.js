const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');

console.log('🚀 [TEST] Iniciando test de módulo Medical Cases con Phase4TestOrchestrator...\n');

async function runMedicalTest() {
    const orchestrator = new Phase4TestOrchestrator();

    try {
        console.log('🚀 [INIT] Inicializando Phase4TestOrchestrator...\n');
        await orchestrator.start();
        console.log('✅ [INIT] Inicialización completada\n');

        console.log('🏥 [TEST] Ejecutando test de Medical Cases...\n');
        const results = await orchestrator.runMedicalCasesCRUDTest(11, 'isi');

        console.log('\n' + '═'.repeat(80));
        console.log('🎯 RESULTADOS FINALES - MEDICAL CASES TEST');
        console.log('═'.repeat(80));
        console.log(`Module: ${results.module}`);
        console.log(`Total Tests: ${results.tests.length}`);
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`📈 Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
        console.log('');
        console.log('Tests ejecutados:');
        results.tests.forEach((test, idx) => {
            const icon = test.status === 'passed' ? '✅' : '❌';
            console.log(`   ${icon} ${idx + 1}. ${test.name} - ${test.status}`);
            if (test.error) {
                console.log(`      Error: ${test.error}`);
            }
        });
        console.log('═'.repeat(80) + '\n');

        if (results.failed === 0) {
            console.log('🎉 ¡ÉXITO! Todos los tests del módulo médico pasaron correctamente');
        } else {
            console.log(`⚠️  ATENCIÓN: ${results.failed} test(s) fallaron`);
        }

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO AL EJECUTAR TEST:', error.message);
        console.error(error.stack);

        try {
            await orchestrator.stop();
        } catch (e) {}

        process.exit(1);
    } finally {
        console.log('\n🧹 [CLEANUP] Cerrando orchestrator...');
        try {
            await orchestrator.stop();
            console.log('✅ [CLEANUP] Orchestrator cerrado\n');
        } catch (e) {
            console.error('⚠️  Error al cerrar orchestrator:', e.message);
        }
    }
}

runMedicalTest().catch(error => {
    console.error('Error no manejado:', error);
    process.exit(1);
});
