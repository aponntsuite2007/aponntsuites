#!/usr/bin/env node
/**
 * ============================================================================
 * BIOMETRIC STRESS TEST - SCRIPT DE EJECUCIÓN
 * ============================================================================
 *
 * Ejecuta testing masivo de fichajes biométricos.
 *
 * USO:
 *   node scripts/run-biometric-stress-test.js [opciones]
 *
 * OPCIONES:
 *   --count=N        Número de escenarios (default: 1000)
 *   --workers=N      Workers paralelos (default: 10)
 *   --company=N      Company ID (default: 1)
 *   --quick          Modo rápido (100 escenarios)
 *   --full           Modo completo (5000 escenarios)
 *   --cleanup        Limpiar datos de prueba al finalizar
 *   --verbose        Mostrar logs detallados
 *   --help           Mostrar ayuda
 *
 * EJEMPLOS:
 *   node scripts/run-biometric-stress-test.js --quick
 *   node scripts/run-biometric-stress-test.js --count=500 --workers=20
 *   node scripts/run-biometric-stress-test.js --full --cleanup
 *
 * @version 1.0.0
 * @date 2024-12-14
 * ============================================================================
 */

const path = require('path');

// Parsear argumentos
const args = process.argv.slice(2);
const options = {
    count: 1000,
    workers: 10,
    company: 1,
    cleanup: false,
    verbose: true
};

// Procesar argumentos
args.forEach(arg => {
    if (arg === '--help' || arg === '-h') {
        console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║              BIOMETRIC STRESS TEST - TESTING MASIVO                        ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  USO:                                                                      ║
║    node scripts/run-biometric-stress-test.js [opciones]                    ║
║                                                                            ║
║  OPCIONES:                                                                 ║
║    --count=N     Número de escenarios a ejecutar (default: 1000)           ║
║    --workers=N   Workers paralelos (default: 10)                           ║
║    --company=N   Company ID para testing (default: 1)                      ║
║    --quick       Modo rápido: 100 escenarios                               ║
║    --full        Modo completo: 5000 escenarios                            ║
║    --cleanup     Limpiar datos de prueba al finalizar                      ║
║    --verbose     Mostrar logs detallados                                   ║
║    --quiet       Modo silencioso (solo errores)                            ║
║                                                                            ║
║  ESCENARIOS:                                                               ║
║    - HAPPY_PATH (40%)      - Fichaje exitoso                               ║
║    - USER_NOT_FOUND (10%)  - Usuario no reconocido                         ║
║    - LATE_ARRIVAL (15%)    - Llegada tarde                                 ║
║    - EARLY_ARRIVAL (5%)    - Llegada temprana                              ║
║    - OUTSIDE_SHIFT (5%)    - Fuera de turno                                ║
║    - DUPLICATE_SHORT (10%) - Duplicado <5 min                              ║
║    - DUPLICATE_MEDIUM (5%) - Duplicado <30 min                             ║
║    - LOW_QUALITY (5%)      - Imagen baja calidad                           ║
║    - SUSPENDED_USER (3%)   - Usuario suspendido                            ║
║    - RAPID_FIRE (2%)       - Stress test                                   ║
║                                                                            ║
║  EJEMPLOS:                                                                 ║
║    node scripts/run-biometric-stress-test.js --quick                       ║
║    node scripts/run-biometric-stress-test.js --count=500 --cleanup         ║
║    node scripts/run-biometric-stress-test.js --full --company=2            ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
        `);
        process.exit(0);
    }

    if (arg === '--quick') {
        options.count = 100;
        options.workers = 5;
    } else if (arg === '--full') {
        options.count = 5000;
        options.workers = 20;
    } else if (arg === '--cleanup') {
        options.cleanup = true;
    } else if (arg === '--verbose') {
        options.verbose = true;
    } else if (arg === '--quiet') {
        options.verbose = false;
    } else if (arg.startsWith('--count=')) {
        options.count = parseInt(arg.split('=')[1]) || 1000;
    } else if (arg.startsWith('--workers=')) {
        options.workers = parseInt(arg.split('=')[1]) || 10;
    } else if (arg.startsWith('--company=')) {
        options.company = parseInt(arg.split('=')[1]) || 1;
    }
});

// Main execution
async function main() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║              🎯 BIOMETRIC STRESS TEST - INICIANDO                          ║');
    console.log('╠════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Escenarios: ${String(options.count).padEnd(10)} Workers: ${String(options.workers).padEnd(10)} Company: ${options.company}       ║`);
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        // Cargar orchestrator
        const BiometricStressTestOrchestrator = require('../src/auditor/biometric/BiometricStressTestOrchestrator');

        // Crear instancia
        const orchestrator = new BiometricStressTestOrchestrator({
            scenarioCount: options.count,
            parallelWorkers: options.workers,
            companyId: options.company,
            verbose: options.verbose,
            baseUrl: process.env.BASE_URL || 'http://localhost:9998'
        });

        // Suscribirse a eventos
        orchestrator.on('progress', (progress) => {
            process.stdout.write(`\r📊 Progreso: ${progress.percent}% (${progress.completed}/${progress.total})`);
        });

        orchestrator.on('log', (log) => {
            if (options.verbose && log.level !== 'debug') {
                // Los logs se muestran automáticamente en el orchestrator
            }
        });

        // Ejecutar test
        const startTime = Date.now();
        const report = await orchestrator.run();
        const totalTime = Date.now() - startTime;

        // Mostrar resultados
        console.log('');
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                        📊 RESULTADOS DEL TEST                              ║');
        console.log('╠════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  Total ejecutados:  ${String(report.summary.total).padEnd(10)}                                       ║`);
        console.log(`║  Pasaron:           ${String(report.summary.passed).padEnd(10)} (${report.summary.passRate})                           ║`);
        console.log(`║  Fallaron:          ${String(report.summary.failed).padEnd(10)}                                       ║`);
        console.log(`║  Tiempo total:      ${String((totalTime/1000).toFixed(1) + 's').padEnd(10)}                                       ║`);
        console.log(`║  Tiempo promedio:   ${String(report.summary.avgResponseTime).padEnd(10)}                                       ║`);
        console.log('╠════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  Por Escenario:                                                            ║');

        report.byScenario.forEach(s => {
            const line = `║    ${s.type.padEnd(18)} ${String(s.passed + '/' + s.total).padEnd(10)} ${s.passRate.padEnd(8)}                      ║`;
            console.log(line);
        });

        console.log('╠════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  Consistencia BD:                                                          ║');
        console.log(`║    Duplicados:        ${String(report.consistency.duplicatesFound).padEnd(5)}                                          ║`);
        console.log(`║    Violaciones FK:    ${String(report.consistency.fkViolations).padEnd(5)}                                          ║`);
        console.log(`║    Errores integ.:    ${String(report.consistency.dataIntegrityErrors).padEnd(5)}                                          ║`);
        console.log('╠════════════════════════════════════════════════════════════════════════════╣');

        if (report.recommendations && report.recommendations.length > 0) {
            console.log('║  ⚠️  RECOMENDACIONES:                                                      ║');
            report.recommendations.forEach((rec, i) => {
                console.log(`║    ${i+1}. [${rec.severity}] ${rec.issue.substring(0, 50).padEnd(50)}    ║`);
            });
        } else {
            console.log('║  ✅ Sin problemas críticos detectados                                      ║');
        }

        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`📄 Reporte guardado en: logs/biometric-stress-${orchestrator.executionId}.json`);
        console.log('');

        // Cleanup si se solicitó
        if (options.cleanup) {
            console.log('🧹 Limpiando datos de prueba...');
            await orchestrator.cleanup();
            console.log('✅ Limpieza completada');
        }

        // Exit code según resultados
        const passRate = parseFloat(report.summary.passRate);
        if (passRate >= 80) {
            console.log('✅ TEST PASSED');
            process.exit(0);
        } else if (passRate >= 60) {
            console.log('⚠️ TEST PASSED WITH WARNINGS');
            process.exit(0);
        } else {
            console.log('❌ TEST FAILED');
            process.exit(1);
        }

    } catch (error) {
        console.error('');
        console.error('❌ ERROR FATAL:', error.message);
        console.error('');
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Ejecutar
main();
