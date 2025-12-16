/**
 * TEST RÁPIDO - Verificar que el modo headless funcione correctamente
 *
 * Esto ejecuta el Auto-Healing con headless=true (SIN abrir navegador)
 */

const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');

(async () => {
    console.log('\n🧪 [TEST] Verificando modo headless...\n');

    // CONFIGURACIÓN: headless = TRUE (NO debe abrir navegador)
    const config = {
        headless: true,  // ← ESTE ES EL PROBLEMA QUE ESTAMOS TESTEANDO
        slowMo: 100,
        timeout: 60000
    };

    console.log('📋 [TEST] Configuración:');
    console.log('   headless:', config.headless);
    console.log('   slowMo:', config.slowMo);
    console.log('   timeout:', config.timeout);
    console.log('');

    const orchestrator = new Phase4TestOrchestrator(config, database.sequelize);

    try {
        console.log('🚀 [TEST] Iniciando Phase4TestOrchestrator...');
        console.log('⏳ [TEST] Si ves navegador abrirse → BUG confirmado');
        console.log('✅ [TEST] Si NO ves navegador → headless funciona OK\n');

        await orchestrator.start();

        console.log('\n✅ [TEST] Orchestrator iniciado correctamente');
        console.log('💡 [TEST] ¿Viste un navegador abrirse? (SI/NO)');
        console.log('');

        // Esperar 5 segundos para que veas si se abrió o no
        console.log('⏱️ [TEST] Esperando 5 segundos...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('\n🛑 [TEST] Cerrando orchestrator...');
        await orchestrator.stop();

        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║  TEST COMPLETADO                                   ║');
        console.log('╠════════════════════════════════════════════════════╣');
        console.log('║  Si NO viste navegador abrirse → headless funciona ║');
        console.log('║  Si viste navegador abrirse → hay un BUG           ║');
        console.log('╚════════════════════════════════════════════════════╝\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ [TEST] Error:', error.message);
        await orchestrator.stop();
        process.exit(1);
    }
})();
