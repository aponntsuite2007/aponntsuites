/**
 * Test del FIX de cache en Auto-Healing
 * Prueba con UN SOLO módulo para verificar que el refresh funciona
 */

const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');

async function testAutoHealingFix() {
    const orchestrator = new Phase4TestOrchestrator({
        headless: true,  // Sin UI
        slowMo: 50
    }, database.sequelize);

    try {
        await orchestrator.start();

        console.log('\n╔═══════════════════════════════════════════════════╗');
        console.log('║  TEST AUTO-HEALING FIX - MÓDULO: users            ║');
        console.log('╚═══════════════════════════════════════════════════╝\n');

        // Ejecutar 2 iteraciones en módulo "users"
        const result = await orchestrator.runAutoHealingCycle({
            maxIterations: 2,
            moduleKeys: ['users']
        });

        // Verificar resultados
        console.log('\n╔═══════════════════════════════════════════════════╗');
        console.log('║  RESULTADO DEL TEST                               ║');
        console.log('╠═══════════════════════════════════════════════════╣');

        const iter1 = result.iterations[0];
        const iter2 = result.iterations[1];

        if (iter1) {
            console.log('║  ITERACIÓN 1:');
            console.log(`║    Gaps encontrados: ${iter1.totalGaps}`);
            console.log(`║    Gaps sanados:     ${iter1.gapsHealed}`);
        }

        if (iter2) {
            console.log('║  ITERACIÓN 2:');
            console.log(`║    Gaps encontrados: ${iter2.totalGaps}`);
            console.log(`║    Gaps sanados:     ${iter2.gapsHealed}`);
        }

        console.log('╠═══════════════════════════════════════════════════╣');

        // Verificar éxito
        const success = iter2 && iter2.totalGaps === 0;
        if (success) {
            console.log('║  ✅ FIX FUNCIONA - Gaps llegaron a 0!            ║');
        } else {
            console.log('║  ❌ FIX NO FUNCIONA - Gaps no se redujeron       ║');
        }

        console.log('╚═══════════════════════════════════════════════════╝\n');

        await orchestrator.stop();
        process.exit(success ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR en test:', error.message);
        await orchestrator.stop();
        process.exit(1);
    }
}

testAutoHealingFix();
