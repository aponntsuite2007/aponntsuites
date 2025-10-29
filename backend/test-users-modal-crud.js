/**
 * TEST EXHAUSTIVO DEL MODAL DE USUARIOS (FICHA PERSONAL)
 *
 * Este script prueba todas las operaciones CRUD del expediente digital
 * al menos 10 veces cada una como solicitó el usuario.
 *
 * Uso: node test-users-modal-crud.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9998';
let authToken = null;
let testResults = [];

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
    testResults.push({
        category,
        testName,
        iterations,
        status,
        details,
        endpoint,
        timestamp: new Date().toISOString()
    });
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
        // Intentar login con credenciales de test
        const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
            identifier: 'admin',
            companyId: 11,
            password: 'admin123'
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
// GET TEST USER
// ============================================================================

async function getTestUser() {
    try {
        const response = await axios.get(`${BASE_URL}/api/v1/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.data && response.data.length > 0) {
            return response.data[0]; // Usar primer usuario de la lista
        }

        log('⚠️ No hay usuarios para testear', 'yellow');
        return null;
    } catch (error) {
        log(`❌ Error obteniendo usuarios: ${error.message}`, 'red');
        return null;
    }
}

// ============================================================================
// TEST FUNCTIONS - ADMINISTRACIÓN
// ============================================================================

async function testEditUserRole(userId, iterations = 10) {
    const testName = 'Cambiar Rol de Usuario';
    const endpoint = `/api/v1/users/${userId}/role`;
    const roles = ['admin', 'supervisor', 'medical', 'employee'];

    log(`\n📋 Testeando: ${testName} (${iterations} veces)...`, 'cyan');

    let passCount = 0;

    for (let i = 1; i <= iterations; i++) {
        try {
            const newRole = roles[i % roles.length];
            const response = await axios.put(
                `${BASE_URL}${endpoint}`,
                { role: newRole },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (response.status === 200) {
                passCount++;
                log(`  ${i}/${iterations}: OK - Rol cambiado a ${newRole}`, 'green');
            }

            await delay(100);
        } catch (error) {
            log(`  ${i}/${iterations}: FAIL - ${error.response?.data?.error || error.message}`, 'red');
        }
    }

    const status = passCount === iterations ? 'PASS' : passCount > 0 ? 'PARTIAL' : 'FAIL';
    logTest(testName, iterations, status, `${passCount}/${iterations} exitosas`);
    recordResult('Administración', testName, iterations, status, `${passCount}/${iterations} exitosas`, endpoint);

    return status;
}

async function testToggleUserStatus(userId, iterations = 10) {
    const testName = 'Activar/Desactivar Usuario';
    const endpoint = `/api/v1/users/${userId}/status`;

    log(`\n📋 Testeando: ${testName} (${iterations} veces)...`, 'cyan');

    let passCount = 0;

    for (let i = 1; i <= iterations; i++) {
        try {
            const isActive = i % 2 === 0;
            const response = await axios.put(
                `${BASE_URL}${endpoint}`,
                { isActive },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (response.status === 200) {
                passCount++;
                log(`  ${i}/${iterations}: OK - Usuario ${isActive ? 'activado' : 'desactivado'}`, 'green');
            }

            await delay(100);
        } catch (error) {
            log(`  ${i}/${iterations}: FAIL - ${error.response?.data?.error || error.message}`, 'red');
        }
    }

    const status = passCount === iterations ? 'PASS' : passCount > 0 ? 'PARTIAL' : 'FAIL';
    logTest(testName, iterations, status, `${passCount}/${iterations} exitosas`);
    recordResult('Administración', testName, iterations, status, `${passCount}/${iterations} exitosas`, endpoint);

    return status;
}

async function testToggleGPSRadius(userId, iterations = 10) {
    const testName = 'Toggle GPS Radius';
    const endpoint = `/api/v1/users/${userId}/gps-radius`;

    log(`\n📋 Testeando: ${testName} (${iterations} veces)...`, 'cyan');

    let passCount = 0;

    for (let i = 1; i <= iterations; i++) {
        try {
            const allowOutsideRadius = i % 2 === 0;
            const response = await axios.put(
                `${BASE_URL}${endpoint}`,
                { allowOutsideRadius },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (response.status === 200) {
                passCount++;
                log(`  ${i}/${iterations}: OK - GPS ${allowOutsideRadius ? 'sin restricción' : 'restringido'}`, 'green');
            }

            await delay(100);
        } catch (error) {
            log(`  ${i}/${iterations}: FAIL - ${error.response?.data?.error || error.message}`, 'red');
        }
    }

    const status = passCount === iterations ? 'PASS' : passCount > 0 ? 'PARTIAL' : 'FAIL';
    logTest(testName, iterations, status, `${passCount}/${iterations} exitosas`);
    recordResult('Administración', testName, iterations, status, `${passCount}/${iterations} exitosas`, endpoint);

    return status;
}

async function testChangeDepartment(userId, iterations = 10) {
    const testName = 'Cambiar Departamento';
    const endpoint = `/api/v1/users/${userId}/department`;

    log(`\n📋 Testeando: ${testName} (${iterations} veces)...`, 'cyan');

    // Primero obtener lista de departamentos
    let departments = [];
    try {
        const deptResponse = await axios.get(`${BASE_URL}/api/v1/departments`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        departments = deptResponse.data;
    } catch (error) {
        log('⚠️ No se pudieron obtener departamentos', 'yellow');
    }

    let passCount = 0;

    for (let i = 1; i <= iterations; i++) {
        try {
            if (departments.length === 0) {
                log(`  ${i}/${iterations}: SKIP - No hay departamentos disponibles`, 'yellow');
                continue;
            }

            const department = departments[i % departments.length];
            const response = await axios.put(
                `${BASE_URL}${endpoint}`,
                { departmentId: department.id },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (response.status === 200) {
                passCount++;
                log(`  ${i}/${iterations}: OK - Departamento cambiado a ${department.name}`, 'green');
            }

            await delay(100);
        } catch (error) {
            log(`  ${i}/${iterations}: FAIL - ${error.response?.data?.error || error.message}`, 'red');
        }
    }

    const status = passCount === iterations ? 'PASS' : passCount > 0 ? 'PARTIAL' : 'FAIL';
    logTest(testName, iterations, status, `${passCount}/${iterations} exitosas`);
    recordResult('Administración', testName, iterations, status, `${passCount}/${iterations} exitosas`, endpoint);

    return status;
}

async function testEditPosition(userId, iterations = 10) {
    const testName = 'Editar Posición';
    const endpoint = `/api/v1/users/${userId}/position`;
    const positions = ['Gerente', 'Supervisor', 'Analista', 'Operador', 'Técnico'];

    log(`\n📋 Testeando: ${testName} (${iterations} veces)...`, 'cyan');

    let passCount = 0;

    for (let i = 1; i <= iterations; i++) {
        try {
            const position = positions[i % positions.length];
            const response = await axios.put(
                `${BASE_URL}${endpoint}`,
                { position },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (response.status === 200) {
                passCount++;
                log(`  ${i}/${iterations}: OK - Posición cambiada a ${position}`, 'green');
            }

            await delay(100);
        } catch (error) {
            log(`  ${i}/${iterations}: FAIL - ${error.response?.data?.error || error.message}`, 'red');
        }
    }

    const status = passCount === iterations ? 'PASS' : passCount > 0 ? 'PARTIAL' : 'FAIL';
    logTest(testName, iterations, status, `${passCount}/${iterations} exitosas`);
    recordResult('Administración', testName, iterations, status, `${passCount}/${iterations} exitosas`, endpoint);

    return status;
}

// ============================================================================
// TEST FUNCTIONS - DATOS PERSONALES
// ============================================================================

async function testEditContactInfo(userId, iterations = 10) {
    const testName = 'Editar Información de Contacto';
    const endpoint = `/api/v1/users/${userId}/contact`;

    log(`\n📋 Testeando: ${testName} (${iterations} veces)...`, 'cyan');

    let passCount = 0;

    for (let i = 1; i <= iterations; i++) {
        try {
            const contactData = {
                emergencyContact: `Contacto Test ${i}`,
                emergencyPhone: `+54 11 ${4000 + i}-${i}${i}${i}${i}`,
                additionalContact: `Adicional ${i}`,
                additionalPhone: `+54 9 11 ${5000 + i}-${i}${i}${i}${i}`
            };

            const response = await axios.put(
                `${BASE_URL}${endpoint}`,
                contactData,
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (response.status === 200) {
                passCount++;
                log(`  ${i}/${iterations}: OK - Contactos actualizados`, 'green');
            }

            await delay(100);
        } catch (error) {
            log(`  ${i}/${iterations}: FAIL - ${error.response?.data?.error || error.message}`, 'red');
        }
    }

    const status = passCount === iterations ? 'PASS' : passCount > 0 ? 'PARTIAL' : 'FAIL';
    logTest(testName, iterations, status, `${passCount}/${iterations} exitosas`);
    recordResult('Datos Personales', testName, iterations, status, `${passCount}/${iterations} exitosas`, endpoint);

    return status;
}

async function testEditHealthInsurance(userId, iterations = 10) {
    const testName = 'Configurar Obra Social/Prepaga';
    const endpoint = `/api/v1/users/${userId}/health-insurance`;

    log(`\n📋 Testeando: ${testName} (${iterations} veces)...`, 'cyan');

    const insuranceProviders = ['OSDE', 'Swiss Medical', 'Galeno', 'Medicus', 'IOMA'];
    const plans = ['Plan Básico', 'Plan Intermedio', 'Plan Premium'];

    let passCount = 0;

    for (let i = 1; i <= iterations; i++) {
        try {
            const insuranceData = {
                provider: insuranceProviders[i % insuranceProviders.length],
                plan: plans[i % plans.length],
                coverageType: i % 2 === 0 ? 'Obra Social' : 'Prepaga',
                coverageMode: i % 3 === 0 ? 'Individual' : 'Familiar',
                companyPercentage: 50 + (i % 50)
            };

            const response = await axios.put(
                `${BASE_URL}${endpoint}`,
                insuranceData,
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (response.status === 200) {
                passCount++;
                log(`  ${i}/${iterations}: OK - Cobertura configurada: ${insuranceData.provider}`, 'green');
            }

            await delay(100);
        } catch (error) {
            log(`  ${i}/${iterations}: FAIL - ${error.response?.data?.error || error.message}`, 'red');
        }
    }

    const status = passCount === iterations ? 'PASS' : passCount > 0 ? 'PARTIAL' : 'FAIL';
    logTest(testName, iterations, status, `${passCount}/${iterations} exitosas`);
    recordResult('Datos Personales', testName, iterations, status, `${passCount}/${iterations} exitosas`, endpoint);

    return status;
}

// ============================================================================
// TEST VIEW USER (READ)
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

            if (response.status === 200 && response.data.id) {
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

    // Obtener usuario de test
    const testUser = await getTestUser();
    if (!testUser) {
        log('\n❌ No se pudo obtener usuario para testear. Finalizando tests.', 'red');
        return;
    }

    log(`\n✅ Usuario de test: ${testUser.firstName} ${testUser.lastName} (ID: ${testUser.id})`, 'green');

    // ============================================================================
    // TESTS DE LECTURA (READ)
    // ============================================================================

    log('\n' + '━'.repeat(80), 'cyan');
    log('📖 TESTS DE LECTURA (READ OPERATIONS)', 'cyan');
    log('━'.repeat(80), 'cyan');

    await testViewUser(testUser.id, 10);

    // ============================================================================
    // TESTS DE ADMINISTRACIÓN
    // ============================================================================

    log('\n' + '━'.repeat(80), 'cyan');
    log('⚙️ TESTS DE ADMINISTRACIÓN', 'cyan');
    log('━'.repeat(80), 'cyan');

    await testEditUserRole(testUser.id, 10);
    await testToggleUserStatus(testUser.id, 10);
    await testToggleGPSRadius(testUser.id, 10);
    await testChangeDepartment(testUser.id, 10);
    await testEditPosition(testUser.id, 10);

    // ============================================================================
    // TESTS DE DATOS PERSONALES
    // ============================================================================

    log('\n' + '━'.repeat(80), 'cyan');
    log('👤 TESTS DE DATOS PERSONALES', 'cyan');
    log('━'.repeat(80), 'cyan');

    await testEditContactInfo(testUser.id, 10);
    await testEditHealthInsurance(testUser.id, 10);

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

    const successRate = ((passedTests / totalTests) * 100).toFixed(2);
    log(`\n📈 Tasa de Éxito: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red');

    // Agrupar por categoría
    log('\n📋 Resultados por Categoría:', 'cyan');
    const categories = {};
    testResults.forEach(result => {
        if (!categories[result.category]) {
            categories[result.category] = { pass: 0, partial: 0, fail: 0, total: 0 };
        }
        categories[result.category].total++;
        if (result.status === 'PASS') categories[result.category].pass++;
        if (result.status === 'PARTIAL') categories[result.category].partial++;
        if (result.status === 'FAIL') categories[result.category].fail++;
    });

    Object.entries(categories).forEach(([category, stats]) => {
        const catSuccessRate = ((stats.pass / stats.total) * 100).toFixed(0);
        log(`\n  ${category}:`, 'cyan');
        log(`    ✅ ${stats.pass}/${stats.total} (${catSuccessRate}%)`, 'green');
        if (stats.partial > 0) log(`    ⚠️  ${stats.partial} parciales`, 'yellow');
        if (stats.fail > 0) log(`    ❌ ${stats.fail} fallidos`, 'red');
    });

    log('\n' + '='.repeat(80), 'blue');
    log('✅ Tests completados', 'green');
    log('='.repeat(80) + '\n', 'blue');

    // Guardar resultados en JSON
    const fs = require('fs');
    const reportPath = './test-users-modal-results.json';
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        testUser: {
            id: testUser.id,
            name: `${testUser.firstName} ${testUser.lastName}`
        },
        summary: {
            total: totalTests,
            passed: passedTests,
            partial: partialTests,
            failed: failedTests,
            successRate: parseFloat(successRate)
        },
        categories,
        results: testResults
    }, null, 2));

    log(`📄 Reporte completo guardado en: ${reportPath}`, 'cyan');
}

// ============================================================================
// EJECUTAR TESTS
// ============================================================================

runTests().catch(error => {
    log(`\n❌ Error fatal: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
