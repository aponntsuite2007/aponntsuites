/**
 * TEST PHASE4 - PAYROLL LIQUIDATION (ISI - Base Local)
 *
 * Ejecuta: node test-phase4-payroll.js
 */

const Phase4TestOrchestrator = require('./src/auditor/core/Phase4TestOrchestrator');

async function testPayrollCRUD() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE4 PAYROLL CRUD TEST - ISI (Base Local)                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const orchestrator = new Phase4TestOrchestrator({
        headless: false,
        slowMo: 100,
        timeout: 30000
    });

    try {
        console.log('🚀 Iniciando Phase4TestOrchestrator...\n');
        await orchestrator.start();
        console.log('✅ Sistema iniciado\n');

        // Ejecutar test de Payroll para ISI (company_id=11, slug='isi')
        console.log('\n🧪 EJECUTANDO PAYROLL CRUD TEST...\n');
        const results = await orchestrator.runPayrollCRUDTest(11, 'isi');

        // Mostrar resultados
        console.log('\n' + '═'.repeat(70));
        console.log('📊 RESULTADOS FINALES - PAYROLL CRUD TEST');
        console.log('═'.repeat(70) + '\n');

        results.tests.forEach((test, index) => {
            const icon = test.status === 'passed' ? '✅' : '❌';
            console.log(`   ${index + 1}. ${icon} ${test.name}: ${test.status.toUpperCase()}`);
            if (test.count !== undefined) {
                console.log(`      └─ Count: ${test.count}`);
            }
            if (test.error) {
                console.log(`      └─ Error: ${test.error}`);
            }
        });

        console.log('\n' + '─'.repeat(70));
        console.log(`📈 ESTADÍSTICAS:`);
        console.log(`   Total: ${results.tests.length} | ✅ Passed: ${results.passed} | ❌ Failed: ${results.failed}`);
        console.log(`   Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
        console.log('─'.repeat(70) + '\n');

        await orchestrator.stop();
        console.log('✅ Sistema cerrado\n');

        process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        try { await orchestrator.stop(); } catch (e) {}
        process.exit(1);
    }
}

testPayrollCRUD();
