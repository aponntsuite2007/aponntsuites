/**
 * TEST PRE-EMPLOYMENT SCREENING API (OH-V6-3)
 * Verifica que todos los endpoints REST funcionen correctamente
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9998/api/occupational-health';
let authToken = '';
let testScreeningId = '';

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TEST 1: LOGIN
// ============================================================================
async function testLogin() {
    log('\n📋 [TEST 1] LOGIN - Obtener token de autenticación', 'cyan');

    try {
        const response = await axios.post('http://localhost:9998/api/auth/login', {
            company: 'isi',
            username: 'admin',
            password: 'Aedr15150302'
        });

        authToken = response.data.token;

        if (authToken) {
            log('   ✅ Login exitoso', 'green');
            log(`   Token: ${authToken.substring(0, 50)}...`, 'blue');
            return true;
        } else {
            log('   ❌ No se recibió token', 'red');
            return false;
        }
    } catch (error) {
        log(`   ❌ Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

// ============================================================================
// TEST 2: GET SCREENING TYPES (Multi-Country)
// ============================================================================
async function testGetScreeningTypes() {
    log('\n📋 [TEST 2] GET /screening-types - Obtener tipos de screening', 'cyan');

    const countries = ['US', 'MX', 'AR', 'DE', '*'];

    for (const country of countries) {
        try {
            const response = await axios.get(`${BASE_URL}/screening-types`, {
                params: { country_code: country },
                headers: { Authorization: `Bearer ${authToken}` }
            });

            const count = response.data.count;
            log(`   ✅ ${country}: ${count} screening types`, 'green');

            if (count > 0) {
                const firstType = response.data.data[0];
                log(`      - Ejemplo: ${JSON.stringify(firstType.name_i18n)}`, 'blue');
            }

            await sleep(200);
        } catch (error) {
            log(`   ❌ ${country}: ${error.response?.data?.message || error.message}`, 'red');
        }
    }
}

// ============================================================================
// TEST 3: CREATE PRE-EMPLOYMENT SCREENING
// ============================================================================
async function testCreateScreening() {
    log('\n📋 [TEST 3] POST /pre-employment-screenings - Crear screening', 'cyan');

    const testData = {
        candidate_first_name: 'John',
        candidate_last_name: 'Doe',
        candidate_email: 'john.doe@example.com',
        candidate_phone: '+1-555-0100',
        position_title: 'Software Engineer',
        department: 'Engineering',
        screening_type_id: 1,
        scheduled_date: '2025-02-15',
        country_code: 'US',
        metadata: {
            recruiter: 'Jane Smith',
            job_req_id: 'JR-2025-001'
        }
    };

    try {
        const response = await axios.post(`${BASE_URL}/pre-employment-screenings`, testData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        testScreeningId = response.data.data.id;

        log('   ✅ Screening creado exitosamente', 'green');
        log(`   ID: ${testScreeningId}`, 'blue');
        log(`   Candidate: ${response.data.data.candidate_first_name} ${response.data.data.candidate_last_name}`, 'blue');
        log(`   Position: ${response.data.data.position_title}`, 'blue');
        log(`   Country: ${response.data.data.country_code}`, 'blue');

        return true;
    } catch (error) {
        log(`   ❌ Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

// ============================================================================
// TEST 4: GET ALL SCREENINGS (With Filters)
// ============================================================================
async function testGetAllScreenings() {
    log('\n📋 [TEST 4] GET /pre-employment-screenings - Listar screenings', 'cyan');

    const testCases = [
        { label: 'Sin filtros', params: {} },
        { label: 'Status=scheduled', params: { status: 'scheduled' } },
        { label: 'Country=US', params: { country_code: 'US' } },
        { label: 'Search=John', params: { search: 'John' } },
        { label: 'Page 1, Limit 5', params: { page: 1, limit: 5 } }
    ];

    for (const testCase of testCases) {
        try {
            const response = await axios.get(`${BASE_URL}/pre-employment-screenings`, {
                params: testCase.params,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            const total = response.data.pagination.total;
            const count = response.data.data.length;

            log(`   ✅ ${testCase.label}: ${count} results (total: ${total})`, 'green');

            await sleep(200);
        } catch (error) {
            log(`   ❌ ${testCase.label}: ${error.response?.data?.message || error.message}`, 'red');
        }
    }
}

// ============================================================================
// TEST 5: GET SCREENING BY ID
// ============================================================================
async function testGetScreeningById() {
    log('\n📋 [TEST 5] GET /pre-employment-screenings/:id - Obtener screening específico', 'cyan');

    if (!testScreeningId) {
        log('   ⚠️  No hay screening de prueba, saltando...', 'yellow');
        return;
    }

    try {
        const response = await axios.get(`${BASE_URL}/pre-employment-screenings/${testScreeningId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        const screening = response.data.data;

        log('   ✅ Screening obtenido exitosamente', 'green');
        log(`   Candidate: ${screening.candidate_first_name} ${screening.candidate_last_name}`, 'blue');
        log(`   Email: ${screening.candidate_email}`, 'blue');
        log(`   Position: ${screening.position_title}`, 'blue');
        log(`   Status: ${screening.status}`, 'blue');
        log(`   Documents: ${screening.documents_count || 0}`, 'blue');
        log(`   Created: ${new Date(screening.created_at).toLocaleString()}`, 'blue');

        return true;
    } catch (error) {
        log(`   ❌ Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

// ============================================================================
// TEST 6: UPDATE SCREENING
// ============================================================================
async function testUpdateScreening() {
    log('\n📋 [TEST 6] PUT /pre-employment-screenings/:id - Actualizar screening', 'cyan');

    if (!testScreeningId) {
        log('   ⚠️  No hay screening de prueba, saltando...', 'yellow');
        return;
    }

    const updateData = {
        status: 'in_progress',
        completed_date: '2025-02-16',
        overall_result: 'pass',
        has_restrictions: false,
        approved_for_hiring: true
    };

    try {
        const response = await axios.put(`${BASE_URL}/pre-employment-screenings/${testScreeningId}`, updateData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        log('   ✅ Screening actualizado exitosamente', 'green');
        log(`   Status: ${response.data.data.status}`, 'blue');
        log(`   Result: ${response.data.data.overall_result}`, 'blue');
        log(`   Approved for hiring: ${response.data.data.approved_for_hiring}`, 'blue');

        return true;
    } catch (error) {
        log(`   ❌ Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

// ============================================================================
// TEST 7: HEALTH CHECK (v6.0)
// ============================================================================
async function testHealthCheck() {
    log('\n📋 [TEST 7] GET /health - Health check v6.0', 'cyan');

    try {
        const response = await axios.get(`${BASE_URL}/health`);

        log('   ✅ Health check OK', 'green');
        log(`   Service: ${response.data.service}`, 'blue');
        log(`   Version: ${response.data.version}`, 'blue');
        log(`   Status: ${response.data.status}`, 'blue');
        log(`   Features: ${response.data.features?.join(', ') || 'None'}`, 'blue');

        return response.data.version === '6.0.0';
    } catch (error) {
        log(`   ❌ Error: ${error.message}`, 'red');
        return false;
    }
}

// ============================================================================
// TEST 8: DELETE SCREENING (Cleanup)
// ============================================================================
async function testDeleteScreening() {
    log('\n📋 [TEST 8] DELETE /pre-employment-screenings/:id - Eliminar screening', 'cyan');

    if (!testScreeningId) {
        log('   ⚠️  No hay screening de prueba, saltando...', 'yellow');
        return;
    }

    try {
        await axios.delete(`${BASE_URL}/pre-employment-screenings/${testScreeningId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        log('   ✅ Screening eliminado exitosamente (soft delete)', 'green');

        // Verificar que ya no se puede obtener
        try {
            await axios.get(`${BASE_URL}/pre-employment-screenings/${testScreeningId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            log('   ⚠️  Screening aún accesible después de delete', 'yellow');
        } catch (error) {
            if (error.response?.status === 404) {
                log('   ✅ Confirmado: Screening ya no es accesible', 'green');
            }
        }

        return true;
    } catch (error) {
        log(`   ❌ Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
    log('╔═══════════════════════════════════════════════════════════════╗', 'cyan');
    log('║  PRE-EMPLOYMENT SCREENING API TESTS (OH-V6-3)                 ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');

    const results = {
        total: 0,
        passed: 0,
        failed: 0
    };

    const tests = [
        { name: 'Login', fn: testLogin },
        { name: 'Get Screening Types', fn: testGetScreeningTypes },
        { name: 'Create Screening', fn: testCreateScreening },
        { name: 'Get All Screenings', fn: testGetAllScreenings },
        { name: 'Get Screening By ID', fn: testGetScreeningById },
        { name: 'Update Screening', fn: testUpdateScreening },
        { name: 'Health Check', fn: testHealthCheck },
        { name: 'Delete Screening', fn: testDeleteScreening }
    ];

    for (const test of tests) {
        results.total++;
        try {
            const result = await test.fn();
            if (result !== false) {
                results.passed++;
            } else {
                results.failed++;
            }
        } catch (error) {
            log(`\n❌ Test "${test.name}" threw exception: ${error.message}`, 'red');
            results.failed++;
        }
        await sleep(500);
    }

    // Summary
    log('\n\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
    log('║  TEST SUMMARY                                                  ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');

    log(`\n   Total Tests: ${results.total}`, 'blue');
    log(`   ✅ Passed: ${results.passed}`, 'green');
    log(`   ❌ Failed: ${results.failed}`, 'red');

    const percentage = ((results.passed / results.total) * 100).toFixed(1);
    log(`\n   Success Rate: ${percentage}%\n`, percentage >= 80 ? 'green' : 'yellow');

    if (results.failed === 0) {
        log('🎉 ALL TESTS PASSED! OH-V6-3 API is working correctly.', 'green');
    } else {
        log('⚠️  Some tests failed. Check logs above.', 'yellow');
    }

    process.exit(results.failed > 0 ? 1 : 0);
}

// Start tests
runAllTests().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
