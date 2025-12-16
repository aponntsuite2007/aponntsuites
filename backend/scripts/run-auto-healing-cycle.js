/**
 * ============================================================================
 * AUTO-HEALING CYCLE - UNIVERSAL DISCOVERY + BRAIN UPDATE
 * ============================================================================
 *
 * Loop automático: Test → Update Brain → Re-test → Countdown to 0 gaps
 *
 * Este script ejecuta el ciclo de auto-sanado completo:
 * 1. Discovery de todos los módulos
 * 2. Cross-reference con Brain metadata
 * 3. Actualiza modules-registry.json automáticamente con gaps
 * 4. Re-testea para verificar que gaps disminuyen
 * 5. Loop hasta gaps === 0 o max iteraciones
 *
 * Uso:
 *   node scripts/run-auto-healing-cycle.js
 *   node scripts/run-auto-healing-cycle.js --max-iterations=10
 *   node scripts/run-auto-healing-cycle.js --company=isi --user=admin --pass=admin123
 *   node scripts/run-auto-healing-cycle.js --modules=users,attendance
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       AUTO-HEALING CYCLE - UNIVERSAL DISCOVERY             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    maxIterations: 5,
    companySlug: 'isi',
    username: 'administrador',  // ✅ FIX: Usuario que YA EXISTE en todas las empresas
    password: 'admin123',
    moduleKeys: null,
    onlyWithGaps: false
};

args.forEach(arg => {
    if (arg.startsWith('--max-iterations=')) {
        options.maxIterations = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--company=')) {
        options.companySlug = arg.split('=')[1];
    } else if (arg.startsWith('--user=')) {
        options.username = arg.split('=')[1];
    } else if (arg.startsWith('--pass=')) {
        options.password = arg.split('=')[1];
    } else if (arg.startsWith('--modules=')) {
        options.moduleKeys = arg.split('=')[1].split(',');
    } else if (arg === '--only-gaps') {
        options.onlyWithGaps = true;
    }
});

console.log('📋 CONFIGURACIÓN:');
console.log(`   Max iteraciones: ${options.maxIterations}`);
console.log(`   Empresa: ${options.companySlug}`);
console.log(`   Usuario: ${options.username}`);
console.log(`   Módulos específicos: ${options.moduleKeys ? options.moduleKeys.join(', ') : 'TODOS'}`);
console.log('');

(async () => {
    const orchestrator = new Phase4TestOrchestrator({
        headless: false, // Visible para debugging
        slowMo: 50,      // Rápido
        timeout: 30000   // 30s timeout
    }, database.sequelize);

    try {
        // Iniciar orchestrator
        await orchestrator.start();

        // Ejecutar ciclo de auto-healing
        const results = await orchestrator.runAutoHealingCycle(options);

        // Mostrar resumen final
        console.log('═'.repeat(70));
        console.log('RESULTADO FINAL');
        console.log('═'.repeat(70));
        console.log('');
        console.log(`✅ Iteraciones ejecutadas: ${results.iterations.length}`);
        console.log(`✅ Total gaps sanados: ${results.totalGapsHealed}`);
        console.log(`✅ Gaps finales: ${results.finalGapsCount}`);
        console.log('');

        if (results.finalGapsCount === 0) {
            console.log('🎉 ¡PERFECTO! Brain metadata está 100% sincronizado con UI.');
            console.log('');
        } else {
            console.log(`⚠️  Aún quedan ${results.finalGapsCount} gaps por documentar.`);
            console.log('   Ejecuta el script nuevamente o incrementa max-iterations.');
            console.log('');
        }

        await orchestrator.stop();
        process.exit(results.finalGapsCount === 0 ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR FATAL:', error.message);
        console.error(error.stack);
        await orchestrator.stop();
        process.exit(1);
    }
})();
