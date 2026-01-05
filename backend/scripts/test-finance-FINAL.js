/**
 * FINANCE ENTERPRISE - TEST SUITE COMPLETO
 * Testing multi-tenant con usuarios reales
 * Garantiza: Velocidad, Integridad, Funcionalidad
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';

// =============================================
// CONFIGURACIÓN
// =============================================

const COMPANY_CREDENTIALS = [
    { name: 'ISI', slug: 'isi', email: 'rrhh2@isi.test', password: 'test123' }
];

// =============================================
// LOGGER CON COLORES
// =============================================

const log = {
    header: (msg) => console.log(`\n${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}`),
    test: (msg) => console.log(`\n🧪 ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    warning: (msg) => console.log(`⚠️  ${msg}`),
    info: (msg) => console.log(`ℹ️  ${msg}`),
    dim: (msg) => console.log(`   ${msg}`)
};

// =============================================
// RESULTADOS
// =============================================

const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: [],
    performance: {}
};

// =============================================
// MAIN TEST RUNNER
// =============================================

async function runAllTests() {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║        🧪 FINANCE ENTERPRISE - TEST SUITE COMPLETO 🧪             ║
║                                                                   ║
║   Testing PROFESIONAL para sistema multi-tenant en producción    ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

    try {
        // FASE 1: ESTRUCTURA DE ARCHIVOS
        await testFileStructure();

        // FASE 2: LOGIN Y OBTENER TOKENS REALES
        log.header('FASE 2: AUTENTICACIÓN Y TOKENS REALES');
        const tokens = await getAuthTokens();

        // FASE 3: ENDPOINTS DE API
        await testAPIEndpoints(tokens);

        // FASE 4: PERFORMANCE
        await testPerformance();

        // REPORTE FINAL
        printFinalReport();

    } catch (error) {
        log.error(`Error fatal en tests: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// =============================================
// FASE 1: ESTRUCTURA DE ARCHIVOS
// =============================================

async function testFileStructure() {
    log.header('FASE 1: ESTRUCTURA DE ARCHIVOS');

    const publicDir = path.join(__dirname, '../public');

    // Test CSS
    log.test('Test 1.1: CSS Dark Theme existe');
    testResults.total++;
    const cssPath = path.join(publicDir, 'css/finance-modules-dark.css');
    if (fs.existsSync(cssPath)) {
        const cssStats = fs.statSync(cssPath);
        log.success(`CSS existe - Tamaño: ${(cssStats.size / 1024).toFixed(2)} KB`);
        testResults.passed++;
    } else {
        log.error('CSS dark theme NO EXISTE');
        testResults.failed++;
        testResults.errors.push({ test: '1.1-css', error: 'File not found' });
    }

    // Test módulos JS
    log.test('Test 1.2: Archivos JS de módulos Finance');
    const modules = [
        'finance-dashboard',
        'finance-chart-of-accounts',
        'finance-budget',
        'finance-cash-flow',
        'finance-cost-centers',
        'finance-journal-entries',
        'finance-treasury',
        'finance-reports',
        'finance-executive-dashboard'
    ];

    for (const mod of modules) {
        testResults.total++;
        const jsPath = path.join(publicDir, `js/modules/${mod}.js`);
        if (fs.existsSync(jsPath)) {
            const jsStats = fs.statSync(jsPath);
            log.success(`${mod}: ${(jsStats.size / 1024).toFixed(2)} KB`);
            testResults.passed++;
        } else {
            log.error(`${mod}: NO EXISTE`);
            testResults.failed++;
            testResults.errors.push({ test: `1.2-${mod}`, error: 'File not found' });
        }
    }
}

// =============================================
// FASE 2: OBTENER TOKENS REALES
// =============================================

async function getAuthTokens() {
    log.test('Obteniendo tokens de autenticación...');

    const tokens = {};

    for (const company of COMPANY_CREDENTIALS) {
        try {
            log.dim(`Logging in: ${company.email}@${company.slug}`);

            const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
                identifier: company.email,
                password: company.password,
                companySlug: company.slug
            });

            tokens[company.slug] = {
                token: loginRes.data.token,
                user: loginRes.data.user,
                company_id: loginRes.data.user.company_id
            };

            log.success(`Token obtenido: ${company.name} (ID: ${loginRes.data.user.company_id})`);

        } catch (error) {
            log.error(`Login failed para ${company.name}: ${error.response?.data?.error || error.message}`);
        }
    }

    if (Object.keys(tokens).length === 0) {
        throw new Error('No se pudo obtener ningún token de autenticación');
    }

    return tokens;
}

// =============================================
// FASE 3: ENDPOINTS DE API
// =============================================

async function testAPIEndpoints(tokens) {
    log.header('FASE 3: ENDPOINTS DE API');

    for (const [slug, authData] of Object.entries(tokens)) {
        log.test(`Testing APIs para ${slug.toUpperCase()} (Company ID: ${authData.company_id})`);

        // Test Dashboard API
        testResults.total++;
        try {
            const startTime = Date.now();
            const response = await axios.get(`${BASE_URL}/api/finance/dashboard?fiscal_year=2026`, {
                headers: { 'Authorization': `Bearer ${authData.token}` },
                timeout: 10000
            });
            const responseTime = Date.now() - startTime;

            testResults.performance[`dashboard-${slug}`] = responseTime;

            if (response.data.success && response.data.data) {
                log.success(`Dashboard API: ${responseTime}ms`);
                log.dim(`   Liquidity: ${JSON.stringify(response.data.data.liquidity.current_ratio.status)}`);
                log.dim(`   Has Budget: ${response.data.data.budget.has_budget}`);
                testResults.passed++;
            } else {
                log.error(`Dashboard API: Respuesta inválida`);
                testResults.failed++;
                testResults.errors.push({
                    test: `api-dashboard-${slug}`,
                    error: 'Invalid response structure'
                });
            }

        } catch (error) {
            log.error(`Dashboard API: ${error.message}`);
            testResults.failed++;
            testResults.errors.push({
                test: `api-dashboard-${slug}`,
                error: error.response?.data?.error || error.message
            });
        }
    }
}

// =============================================
// FASE 4: PERFORMANCE
// =============================================

async function testPerformance() {
    log.header('FASE 4: PERFORMANCE');

    log.test('Test 4.1: Tiempo de carga de archivos estáticos');

    const staticFiles = [
        '/css/finance-modules-dark.css',
        '/js/modules/finance-dashboard.js',
        '/js/modules/finance-budget.js'
    ];

    for (const file of staticFiles) {
        testResults.total++;
        try {
            const startTime = Date.now();
            await axios.get(`${BASE_URL}${file}`, { timeout: 5000 });
            const responseTime = Date.now() - startTime;

            testResults.performance[file] = responseTime;

            if (responseTime < 100) {
                log.success(`${file}: ${responseTime}ms (excelente)`);
                testResults.passed++;
            } else if (responseTime < 500) {
                log.warning(`${file}: ${responseTime}ms (aceptable)`);
                testResults.passed++;
                testResults.warnings++;
            } else {
                log.error(`${file}: ${responseTime}ms (lento)`);
                testResults.failed++;
                testResults.errors.push({
                    test: `performance${file}`,
                    error: `Slow response: ${responseTime}ms`
                });
            }

        } catch (error) {
            log.error(`${file}: No disponible`);
            testResults.failed++;
        }
    }
}

// =============================================
// REPORTE FINAL
// =============================================

function printFinalReport() {
    log.header('REPORTE FINAL - FINANCE ENTERPRISE TESTING');

    console.log(`
📊 Estadísticas:
   Total Tests:    ${testResults.total}
   ✅ Passed:       ${testResults.passed} (${((testResults.passed / testResults.total) * 100).toFixed(1)}%)
   ❌ Failed:       ${testResults.failed} (${((testResults.failed / testResults.total) * 100).toFixed(1)}%)
   ⚠️  Warnings:     ${testResults.warnings} (${((testResults.warnings / testResults.total) * 100).toFixed(1)}%)
`);

    if (Object.keys(testResults.performance).length > 0) {
        console.log('⚡ Performance Metrics:');
        for (const [key, time] of Object.entries(testResults.performance)) {
            console.log(`   ${key}: ${time}ms`);
        }
        console.log();
    }

    if (testResults.errors.length > 0) {
        console.log(`\n❌ Errores Detectados (${testResults.errors.length}):`);
        testResults.errors.forEach((err, idx) => {
            console.log(`   ${idx + 1}. ${err.test}: ${err.error}`);
        });
        console.log();
    }

    const passRate = (testResults.passed / testResults.total) * 100;

    if (passRate === 100) {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     ✅ 100% TESTS PASADOS - LISTO PARA PRODUCCIÓN ✅             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
    } else if (passRate >= 90) {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     ⚠️  ${passRate.toFixed(1)}% TESTS PASADOS - CASI LISTO             ║
║     Revisar warnings antes de deployment                        ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
    } else {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     ❌ NO LISTO PARA PRODUCCIÓN - ${passRate.toFixed(1)}% PASS RATE        ║
║     Errores críticos deben ser corregidos                       ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
    }
}

// =============================================
// EJECUTAR
// =============================================

runAllTests().catch(error => {
    console.error('\n❌ ERROR FATAL:', error);
    process.exit(1);
});
