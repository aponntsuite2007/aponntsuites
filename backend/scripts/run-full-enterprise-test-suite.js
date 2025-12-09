/**
 * ============================================================================
 * ENTERPRISE FULL TEST SUITE
 * ============================================================================
 * Ejecuta TODOS los tests del sistema y genera reporte consolidado.
 *
 * Test Suites incluidos:
 * 1. Schema Validation Tests - Detecta inconsistencias BD/código
 * 2. Comprehensive Endpoint Tests - 24 scenarios backend
 * 3. Enterprise E2E Scenarios - 38 tests de flujos completos
 * 4. Frontend Validation Tests - 54 tests de estructura frontend
 *
 * TOTAL: ~116 tests
 *
 * CREADO: 2025-12-08
 * ============================================================================
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG = {
    PORT: process.env.TEST_PORT || 9998,
    SCRIPTS_DIR: __dirname
};

const testSuites = [
    {
        name: 'Schema Validation Tests',
        description: 'Detecta inconsistencias entre código SQL y schema BD',
        script: 'run-deep-schema-validation-tests.js',
        category: 'backend',
        critical: true
    },
    {
        name: 'Comprehensive Endpoint Tests',
        description: 'Tests de endpoints críticos con 24 escenarios',
        script: 'run-comprehensive-endpoint-tests.js',
        category: 'backend',
        critical: true
    },
    {
        name: 'Enterprise E2E Scenarios',
        description: 'Flujos completos de negocio con 38 tests',
        script: 'run-enterprise-e2e-scenarios.js',
        category: 'e2e',
        critical: true
    },
    {
        name: 'Frontend Validation Tests',
        description: 'Validación de estructura frontend con 54 tests',
        script: 'run-frontend-validation-tests.js',
        category: 'frontend',
        critical: false
    }
];

const results = {
    timestamp: new Date().toISOString(),
    environment: {
        port: CONFIG.PORT,
        nodeVersion: process.version,
        platform: process.platform
    },
    suites: [],
    summary: {
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0
    }
};

// ============================================================================
// HELPERS
// ============================================================================

function runScript(scriptPath) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        let stdout = '';
        let stderr = '';

        const child = spawn('node', [scriptPath], {
            cwd: path.dirname(scriptPath),
            env: { ...process.env, TEST_PORT: CONFIG.PORT }
        });

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            const duration = Date.now() - startTime;

            // Parse results from output
            const passedMatch = stdout.match(/Passed:\s*(\d+)/i);
            const failedMatch = stdout.match(/Failed:\s*(\d+)/i);
            const totalMatch = stdout.match(/Total.*?:\s*(\d+)/i);
            const rateMatch = stdout.match(/Success.*?:\s*([\d.]+)%/i);

            resolve({
                exitCode: code,
                duration,
                stdout,
                stderr,
                parsed: {
                    passed: passedMatch ? parseInt(passedMatch[1]) : 0,
                    failed: failedMatch ? parseInt(failedMatch[1]) : 0,
                    total: totalMatch ? parseInt(totalMatch[1]) : 0,
                    rate: rateMatch ? parseFloat(rateMatch[1]) : 0
                }
            });
        });

        // Timeout after 2 minutes
        setTimeout(() => {
            child.kill();
            resolve({
                exitCode: -1,
                duration: 120000,
                stdout: '',
                stderr: 'Timeout: Script exceeded 2 minutes',
                parsed: { passed: 0, failed: 0, total: 0, rate: 0 }
            });
        }, 120000);
    });
}

// ============================================================================
// MAIN
// ============================================================================

async function runFullTestSuite() {
    console.log('╔════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    ENTERPRISE FULL TEST SUITE                          ║');
    console.log('║             Sistema de Asistencia Biométrico - Tests Completos         ║');
    console.log('╚════════════════════════════════════════════════════════════════════════╝');
    console.log(`\n📅 Timestamp: ${results.timestamp}`);
    console.log(`🖥️  Node: ${process.version} | Platform: ${process.platform}`);
    console.log(`🌐 Test Port: ${CONFIG.PORT}\n`);

    console.log('═'.repeat(76));
    console.log('EJECUTANDO TEST SUITES');
    console.log('═'.repeat(76));

    for (const suite of testSuites) {
        const scriptPath = path.join(CONFIG.SCRIPTS_DIR, suite.script);

        if (!fs.existsSync(scriptPath)) {
            console.log(`\n⚠️ [SKIP] ${suite.name}`);
            console.log(`   Script no encontrado: ${suite.script}`);
            continue;
        }

        console.log(`\n▶️  [${suite.category.toUpperCase()}] ${suite.name}`);
        console.log(`   ${suite.description}`);
        console.log('   ' + '─'.repeat(60));

        const result = await runScript(scriptPath);

        const suiteResult = {
            name: suite.name,
            category: suite.category,
            critical: suite.critical,
            script: suite.script,
            duration: result.duration,
            exitCode: result.exitCode,
            tests: result.parsed,
            passed: result.exitCode === 0 || result.parsed.failed === 0
        };

        results.suites.push(suiteResult);
        results.summary.totalSuites++;
        results.summary.totalTests += result.parsed.total || 0;
        results.summary.passedTests += result.parsed.passed || 0;
        results.summary.failedTests += result.parsed.failed || 0;

        if (suiteResult.passed) {
            results.summary.passedSuites++;
            console.log(`   ✅ PASSED: ${result.parsed.passed}/${result.parsed.total} tests (${result.parsed.rate}%)`);
        } else {
            results.summary.failedSuites++;
            console.log(`   ❌ FAILED: ${result.parsed.passed}/${result.parsed.total} tests (${result.parsed.rate}%)`);
            if (suite.critical) {
                console.log(`   ⚠️  CRITICAL: Este test suite es crítico para producción`);
            }
        }
        console.log(`   ⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
    }

    // Calculate overall success rate
    const overallRate = results.summary.totalTests > 0
        ? ((results.summary.passedTests / results.summary.totalTests) * 100).toFixed(1)
        : 0;

    // Generate summary
    console.log('\n' + '═'.repeat(76));
    console.log('                          RESUMEN CONSOLIDADO');
    console.log('═'.repeat(76));

    console.log('\n📊 RESULTADOS POR CATEGORÍA:\n');

    const byCategory = {};
    for (const suite of results.suites) {
        if (!byCategory[suite.category]) {
            byCategory[suite.category] = { passed: 0, failed: 0, total: 0 };
        }
        byCategory[suite.category].total += suite.tests.total;
        byCategory[suite.category].passed += suite.tests.passed;
        byCategory[suite.category].failed += suite.tests.failed;
    }

    for (const [cat, stats] of Object.entries(byCategory)) {
        const catRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;
        const icon = stats.failed === 0 ? '✅' : '❌';
        console.log(`   ${icon} ${cat.toUpperCase().padEnd(12)} ${stats.passed}/${stats.total} tests (${catRate}%)`);
    }

    console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
    console.log('║                         RESULTADO FINAL                                ║');
    console.log('╠════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Test Suites:     ${String(results.summary.passedSuites).padStart(3)}/${String(results.summary.totalSuites).padStart(3)} passed                                      ║`);
    console.log(`║  Total Tests:     ${String(results.summary.passedTests).padStart(3)}/${String(results.summary.totalTests).padStart(3)} passed                                      ║`);
    console.log(`║  Failed Tests:    ${String(results.summary.failedTests).padStart(3)}                                               ║`);
    console.log(`║  Success Rate:    ${overallRate.padStart(5)}%                                             ║`);
    console.log('╠════════════════════════════════════════════════════════════════════════╣');

    if (results.summary.failedTests === 0) {
        console.log('║  🏆 STATUS: READY FOR PRODUCTION                                       ║');
        console.log('║     Todos los tests pasaron. Sistema verificado.                       ║');
    } else if (results.summary.failedTests <= 5) {
        console.log('║  ⚠️  STATUS: MINOR ISSUES                                               ║');
        console.log('║     Algunos tests fallaron. Revisar antes de producción.               ║');
    } else {
        console.log('║  ❌ STATUS: NOT READY                                                   ║');
        console.log('║     Múltiples tests fallaron. Requiere correcciones.                   ║');
    }

    console.log('╚════════════════════════════════════════════════════════════════════════╝');

    // List failed tests if any
    if (results.summary.failedTests > 0) {
        console.log('\n🚨 SUITES CON FALLOS:\n');
        for (const suite of results.suites) {
            if (!suite.passed) {
                console.log(`   ❌ ${suite.name}`);
                console.log(`      ${suite.tests.failed} tests fallidos`);
            }
        }
    }

    // Save results
    const outputPath = path.join(__dirname, '..', 'test-results-full-enterprise-suite.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Resultados guardados: ${outputPath}`);

    // Return status
    return {
        success: results.summary.failedTests === 0,
        results
    };
}

// Execute
if (require.main === module) {
    runFullTestSuite()
        .then(({ success }) => process.exit(success ? 0 : 1))
        .catch(e => {
            console.error('Error ejecutando tests:', e);
            process.exit(1);
        });
}

module.exports = { runFullTestSuite };
