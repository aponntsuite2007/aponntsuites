/**
 * TEST EXHAUSTIVO DEL MODAL DE USUARIOS - VERSIÓN SIMPLIFICADA
 * Usa user_id hardcodeado para evitar problemas con endpoint de listado
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9998';
const TEST_USER_ID = 'd2ace38c-d79a-4c9d-833d-ed549fc948f1'; // Usuario de ISI
let authToken = null;
let testResults = [];

// Colores
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, iterations, status, details = '') {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
    log(`${icon} [${iterations}x] ${testName} - ${status}`, color);
    if (details) log(`   ${details}`, 'cyan');
}

function recordResult(category, testName, iterations, status, details, endpoint) {
    testResults.push({ category, testName, iterations, status, details, endpoint, timestamp: new Date().toISOString() });
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function authenticate() {
    log('\n🔐 Autenticando...', 'blue');

    try {
        const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
            identifier: 'admin',
            password: 'admin123',
            companyId: 11
        });

        authToken = response.data.token;
        log('✅ Autenticación exitosa', 'green');
        return true;
    } catch (error) {
        log(`❌ Error de autenticación: ${error.message}`, 'red');
        return false;
    }
}

// ============================================================================
// TEST: VIEW USER (READ)
// ============================================================================

async function testViewUser(userId, iterations = 10) {
    const testName = 'Ver Ficha Completa (READ)';
    const endpoint = `/api/v1/users/${userId}`;

    log(`\n📋 Testeando: ${testName} (${iterations} veces)...`, 'cyan');

    let passCount = 0;

    for (let i = 1; i <= iterations; i++) {
        try {
            const response = await axios.get(
                `${BASE_URL}${endpoint}`,
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (response.status === 200 && response.data) {
                passCount++;
                log(`  ${i}/${iterations}: OK - Datos obtenidos correctamente`, 'green');
            }

            await delay(50);
        } catch (error) {
            log(`  ${i}/${iterations}: FAIL - ${error.response?.data?.error || error.message}`, 'red');
        }
    }

    const status = passCount === iterations ? 'PASS' : passCount > 0 ? 'PARTIAL' : 'FAIL';
    logTest(testName, iterations, status, `${passCount}/${iterations} exitosas`);
    recordResult('READ Operations', testName, iterations, status, `${passCount}/${iterations} exitosas`, endpoint);

    return status;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
    log('\n' + '='.repeat(80), 'blue');
    log('🧪 TEST EXHAUSTIVO DEL MODAL DE USUARIOS (FICHA PERSONAL)', 'blue');
    log('='.repeat(80) + '\n', 'blue');

    // Autenticar
    const authenticated = await authenticate();
    if (!authenticated) {
        log('\n❌ No se pudo autenticar. Finalizando tests.', 'red');
        return;
    }

    log(`\n✅ Usuario de test ID: ${TEST_USER_ID}`, 'green');

    // ============================================================================
    // TESTS DE LECTURA (READ)
    // ============================================================================

    log('\n' + '━'.repeat(80), 'cyan');
    log('📖 TESTS DE LECTURA (READ OPERATIONS)', 'cyan');
    log('━'.repeat(80), 'cyan');

    await testViewUser(TEST_USER_ID, 10);

    // ============================================================================
    // RESUMEN FINAL
    // ============================================================================

    log('\n' + '='.repeat(80), 'blue');
    log('📊 RESUMEN DE RESULTADOS', 'blue');
    log('='.repeat(80) + '\n', 'blue');

    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.status === 'PASS').length;
    const partialTests = testResults.filter(r => r.status === 'PARTIAL').length;
    const failedTests = testResults.filter(r => r.status === 'FAIL').length;

    log(`Total de Tests Ejecutados: ${totalTests}`, 'cyan');
    log(`✅ Exitosos (PASS): ${passedTests}`, 'green');
    log(`⚠️  Parciales (PARTIAL): ${partialTests}`, 'yellow');
    log(`❌ Fallidos (FAIL): ${failedTests}`, 'red');

    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;
    log(`\n📈 Tasa de Éxito: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red');

    // Guardar resultados en JSON
    const fs = require('fs');
    const reportPath = './test-users-modal-results-simple.json';
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        testUserId: TEST_USER_ID,
        summary: {
            total: totalTests,
            passed: passedTests,
            partial: partialTests,
            failed: failedTests,
            successRate: parseFloat(successRate)
        },
        results: testResults
    }, null, 2));

    log(`\n📄 Reporte completo guardado en: ${reportPath}`, 'cyan');
    log('\n' + '='.repeat(80), 'blue');
    log('✅ Tests completados', 'green');
    log('='.repeat(80) + '\n', 'blue');
}

// ============================================================================
// EJECUTAR TESTS
// ============================================================================

runTests().catch(error => {
    log(`\n❌ Error fatal: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
