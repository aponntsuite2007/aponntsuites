#!/usr/bin/env node
/**
 * ============================================================================
 * SUPER INTEGRATION TEST - Flujo Completo APK Kiosk → Banco de Horas
 * ============================================================================
 *
 * Ejecuta TODO el arsenal de testing:
 * 1. 📱 Flutter Integration Tests (APK kiosk simulada)
 * 2. 🔥 Stress Tests (fichajes masivos)
 * 3. 🎭 E2E Tests (Playwright si disponible)
 * 4. 🏦 Hour Bank Cycle Test (HE → decisión → doble aprobación)
 *
 * USO:
 *   node scripts/run-super-integration-test.js
 *   node scripts/run-super-integration-test.js --company=11
 *   node scripts/run-super-integration-test.js --quick
 *   node scripts/run-super-integration-test.js --skip-flutter
 *   node scripts/run-super-integration-test.js --skip-stress
 *   node scripts/run-super-integration-test.js --only-hourbank
 *
 * OPCIONES:
 *   --company=N      Company ID para testing (default: 11 = ISI)
 *   --quick          Modo rápido (menos escenarios)
 *   --skip-flutter   Saltar tests de Flutter
 *   --skip-stress    Saltar stress tests
 *   --skip-e2e       Saltar E2E tests
 *   --only-hourbank  Solo ejecutar Hour Bank Cycle Test
 *   --verbose        Mostrar logs detallados
 *
 * @version 1.0.0
 * @date 2025-12-16
 * ============================================================================
 */

const path = require('path');
const fs = require('fs');

// ============================================================================
// PARSEAR ARGUMENTOS
// ============================================================================

const args = process.argv.slice(2);
const options = {
    companyId: 11,
    quick: false,
    skipFlutter: false,
    skipStress: false,
    skipE2E: false,
    onlyHourbank: false,
    verbose: true
};

args.forEach(arg => {
    if (arg === '--help' || arg === '-h') {
        console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║       🚀 SUPER INTEGRATION TEST - Flujo Completo APK → Hour Bank           ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  USO:                                                                      ║
║    node scripts/run-super-integration-test.js [opciones]                   ║
║                                                                            ║
║  OPCIONES:                                                                 ║
║    --company=N      Company ID para testing (default: 11)                  ║
║    --quick          Modo rápido con menos escenarios                       ║
║    --skip-flutter   Saltar Flutter Integration Tests                       ║
║    --skip-stress    Saltar Stress Tests                                    ║
║    --skip-e2e       Saltar E2E Tests (Playwright)                          ║
║    --only-hourbank  Solo ejecutar Hour Bank Cycle Test                     ║
║    --verbose        Mostrar logs detallados                                ║
║                                                                            ║
║  FLUJO DEL TEST:                                                           ║
║    1. 📱 Flutter Integration - Simula fichajes desde APK                   ║
║    2. 🔥 Stress Test - Carga masiva de fichajes                            ║
║    3. 🎭 E2E Tests - Navegación por panel web                              ║
║    4. 🏦 Hour Bank Cycle:                                                  ║
║       - Fichaje con horas extras                                           ║
║       - Detección automática de HE                                         ║
║       - Notificación al empleado                                           ║
║       - Decisión: cobrar vs depositar                                      ║
║       - Doble aprobación (Supervisor + RRHH)                               ║
║       - Acreditación al banco de horas                                     ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
        `);
        process.exit(0);
    }

    if (arg === '--quick') options.quick = true;
    else if (arg === '--skip-flutter') options.skipFlutter = true;
    else if (arg === '--skip-stress') options.skipStress = true;
    else if (arg === '--skip-e2e') options.skipE2E = true;
    else if (arg === '--only-hourbank') options.onlyHourbank = true;
    else if (arg === '--verbose') options.verbose = true;
    else if (arg === '--quiet') options.verbose = false;
    else if (arg.startsWith('--company=')) {
        options.companyId = parseInt(arg.split('=')[1]) || 11;
    }
});

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║       🚀 SUPER INTEGRATION TEST - Flujo Completo APK → Hour Bank           ║');
    console.log('╠════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Company ID: ${String(options.companyId).padEnd(10)} Mode: ${options.quick ? 'QUICK' : 'FULL'}                              ║`);
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    const startTime = Date.now();

    try {
        // Cargar dependencias
        require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
        const database = require('../src/config/database');
        const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');

        // Conectar base de datos
        console.log('📡 Conectando a base de datos...');
        await database.sequelize.authenticate();
        console.log('✅ Conexión establecida\n');

        // Crear orchestrator
        const config = {
            baseUrl: process.env.BASE_URL || 'http://localhost:9998',
            headless: true,
            slowMo: options.quick ? 0 : 50,
            timeout: 60000
        };

        const orchestrator = new Phase4TestOrchestrator(config, database.sequelize);

        // Iniciar orchestrator
        console.log('⚙️  Inicializando Phase4TestOrchestrator...');
        await orchestrator.start();
        console.log('✅ Orchestrator listo\n');

        // Opciones del test
        const testOptions = {
            companyId: options.companyId,

            // Flutter
            includeFlutter: !options.skipFlutter && !options.onlyHourbank,
            flutter: {
                scenarioCount: options.quick ? 10 : 50,
                companyId: options.companyId
            },

            // Stress
            includeStress: !options.skipStress && !options.onlyHourbank,
            stressMode: options.quick ? 'quick' : 'standard',
            stress: {
                scenarioCount: options.quick ? 50 : 200,
                parallelWorkers: options.quick ? 3 : 10
            },

            // E2E
            includeE2E: !options.skipE2E && !options.onlyHourbank,
            e2eModule: 'users',

            // Hour Bank
            includeHourBankCycle: true,
            hourBank: {
                companyId: options.companyId,
                choice: 'bank' // Por defecto deposita al banco
            }
        };

        console.log('═'.repeat(76));
        console.log('  EJECUTANDO SUPER INTEGRATION TEST');
        console.log('═'.repeat(76));
        console.log('');

        if (options.onlyHourbank) {
            console.log('⚡ Modo: SOLO HOUR BANK CYCLE TEST\n');
        }

        // Ejecutar el super test
        const results = await orchestrator.runFullIntegrationSuiteWithHourBank(testOptions);

        // Detener orchestrator
        await orchestrator.stop();

        // Calcular tiempo
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

        // Mostrar resultados
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                         📊 RESULTADOS FINALES                              ║');
        console.log('╠════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  Tiempo total:       ${String(totalTime + 's').padEnd(15)}                                   ║`);
        console.log(`║  Suites ejecutadas:  ${String(results.summary.totalSuites).padEnd(15)}                                   ║`);
        console.log(`║  Suites PASSED:      ${String(results.summary.passedSuites).padEnd(15)}                                   ║`);
        console.log(`║  Suites FAILED:      ${String(results.summary.failedSuites).padEnd(15)}                                   ║`);
        console.log('╠════════════════════════════════════════════════════════════════════════════╣');

        // Detalle por suite
        if (results.suites.flutter) {
            const f = results.suites.flutter;
            console.log(`║  📱 Flutter:         ${f.success ? '✅ PASSED' : '❌ FAILED'}                                        ║`);
        }
        if (results.suites.stress) {
            const s = results.suites.stress;
            console.log(`║  🔥 Stress:          ${s.success ? '✅ PASSED' : '❌ FAILED'}                                        ║`);
        }
        if (results.suites.e2e) {
            const e = results.suites.e2e;
            console.log(`║  🎭 E2E:             ${e.success || e.passed > 0 ? '✅ PASSED' : '❌ FAILED'}                                        ║`);
        }
        if (results.suites.hourBankCycle) {
            const h = results.suites.hourBankCycle;
            console.log(`║  🏦 Hour Bank:       ${h.success ? '✅ PASSED' : '❌ FAILED'}                                        ║`);
            if (h.summary) {
                console.log(`║     - Pasos: ${h.summary.passedSteps}/${h.summary.totalSteps} (${h.summary.passRate}%)                                      ║`);
            }
        }

        console.log('╠════════════════════════════════════════════════════════════════════════════╣');

        // Status final
        if (results.success) {
            console.log('║  🏆 STATUS: ✅ TODOS LOS TESTS PASARON                                     ║');
            console.log('║     Sistema validado para flujo completo APK → Hour Bank                   ║');
        } else {
            console.log('║  ⚠️  STATUS: ❌ ALGUNOS TESTS FALLARON                                      ║');
            console.log('║     Revisar detalles arriba para identificar problemas                     ║');
        }

        console.log('╚════════════════════════════════════════════════════════════════════════════╝');

        // Guardar resultados
        const resultsPath = path.join(__dirname, '..', 'logs', `super-integration-${Date.now()}.json`);
        fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`\n💾 Resultados guardados: ${resultsPath}`);

        // Exit code
        process.exit(results.success ? 0 : 1);

    } catch (error) {
        console.error('');
        console.error('❌ ERROR FATAL:', error.message);
        console.error('');
        if (options.verbose) {
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }
}

// ============================================================================
// EJECUTAR
// ============================================================================

main().catch(error => {
    console.error('❌ Error no capturado:', error);
    process.exit(1);
});
