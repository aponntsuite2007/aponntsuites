/**
 * ============================================================================
 * TEST SCRIPT - INTELLIGENT TESTING ORCHESTRATOR
 * ============================================================================
 *
 * Demuestra el uso del IntelligentTestingOrchestrator para ejecutar tests
 * masivos sobre múltiples módulos del sistema.
 *
 * USO:
 * ```bash
 * cd backend
 * node test-intelligent-orchestrator.js
 * ```
 *
 * OPCIONES:
 * - MODE=full → Testear todos los módulos registrados
 * - MODE=critical → Solo módulos críticos (users, attendance, departments, shifts, reports)
 * - MODE=selective → Módulos específicos (MODULE=users,attendance)
 * - PARALLEL=true → Ejecución paralela (más rápido)
 * - RETRIES=2 → Número de reintentos en caso de fallo
 *
 * EJEMPLOS:
 * ```bash
 * # Full test secuencial
 * node test-intelligent-orchestrator.js
 *
 * # Full test paralelo
 * MODE=full PARALLEL=true node test-intelligent-orchestrator.js
 *
 * # Critical test con reintentos
 * MODE=critical RETRIES=2 node test-intelligent-orchestrator.js
 *
 * # Selective test (solo users y attendance)
 * MODE=selective MODULE=users,attendance node test-intelligent-orchestrator.js
 * ```
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

const IntelligentTestingOrchestrator = require('./src/auditor/core/IntelligentTestingOrchestrator');
const database = require('./src/config/database');
const SystemRegistry = require('./src/auditor/registry/SystemRegistry');

async function main() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 INTELLIGENT TESTING ORCHESTRATOR - DEMO');
    console.log('='.repeat(80) + '\n');

    // Leer configuración desde ENV
    const mode = process.env.MODE || 'full'; // full, critical, selective
    const parallel = process.env.PARALLEL === 'true';
    const maxRetries = parseInt(process.env.RETRIES || '1', 10);
    const selectedModules = process.env.MODULE ? process.env.MODULE.split(',') : [];
    const companyId = parseInt(process.env.COMPANY_ID || '11', 10);

    console.log('⚙️  CONFIGURACIÓN:');
    console.log(`   - Modo: ${mode.toUpperCase()}`);
    console.log(`   - Ejecución: ${parallel ? 'PARALELA' : 'SECUENCIAL'}`);
    console.log(`   - Max reintentos: ${maxRetries}`);
    console.log(`   - Company ID: ${companyId}`);
    if (mode === 'selective' && selectedModules.length > 0) {
        console.log(`   - Módulos seleccionados: ${selectedModules.join(', ')}`);
    }
    console.log('');

    // Inicializar orchestrator
    const orchestrator = new IntelligentTestingOrchestrator(database, new SystemRegistry());

    // Auto-registrar collectors disponibles
    orchestrator.autoRegisterCollectors();

    console.log(`📋 Collectors disponibles: ${orchestrator.collectors.size}`);
    console.log(`   ${Array.from(orchestrator.collectors.keys()).join(', ')}\n`);

    // Opciones de ejecución
    const options = {
        parallel: parallel,
        maxRetries: maxRetries,
        continueOnError: true
    };

    let results;

    try {
        // Ejecutar según modo
        switch (mode) {
            case 'full':
                console.log('🚀 Ejecutando FULL TEST (todos los módulos)...\n');
                results = await orchestrator.runFullTest(companyId, options);
                break;

            case 'critical':
                console.log('⚡ Ejecutando CRITICAL TEST (módulos críticos)...\n');
                results = await orchestrator.runCriticalTest(companyId, options);
                break;

            case 'selective':
                if (selectedModules.length === 0) {
                    console.error('❌ ERROR: MODE=selective requiere MODULE=module1,module2');
                    process.exit(1);
                }
                console.log(`🎯 Ejecutando SELECTIVE TEST (${selectedModules.length} módulos)...\n`);
                results = await orchestrator.runSelectiveTest(companyId, selectedModules, options);
                break;

            default:
                console.error(`❌ ERROR: Modo desconocido: ${mode}`);
                console.error('   Modos válidos: full, critical, selective');
                process.exit(1);
        }

        // Resumen final
        console.log('\n' + '='.repeat(80));
        console.log('✅ TESTING COMPLETADO');
        console.log('='.repeat(80));
        console.log(`📊 Execution ID: ${results.execution_id}`);
        console.log(`🎯 Modo: ${results.mode.toUpperCase()}`);
        console.log(`📦 Módulos testeados: ${results.modules_tested}`);
        console.log(`⏱️  Duración total: ${results.duration_seconds.toFixed(2)}s`);

        // Calcular tasa de éxito
        const totalTests = results.results.length;
        const passedTests = results.results.filter(r => r.status === 'passed' || r.status === 'pass').length;
        const failedTests = results.results.filter(r => r.status === 'failed' || r.status === 'fail').length;
        const warningTests = results.results.filter(r => r.status === 'warning').length;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);

        console.log(`\n📈 RESULTADOS GLOBALES:`);
        console.log(`   ✅ PASSED:  ${passedTests}/${totalTests}`);
        console.log(`   ❌ FAILED:  ${failedTests}/${totalTests}`);
        console.log(`   ⚠️  WARNING: ${warningTests}/${totalTests}`);
        console.log(`   📊 SUCCESS RATE: ${successRate}%`);
        console.log('='.repeat(80) + '\n');

        // Salir con código según éxito
        if (failedTests > 0) {
            console.log('⚠️  Algunos tests fallaron. Ver detalles arriba.\n');
            process.exit(1);
        } else {
            console.log('🎉 Todos los tests pasaron exitosamente!\n');
            process.exit(0);
        }

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO EN TESTING:');
        console.error(error);
        process.exit(1);
    }
}

// Ejecutar
main().catch(error => {
    console.error('\n❌ Error no manejado:', error);
    process.exit(1);
});
