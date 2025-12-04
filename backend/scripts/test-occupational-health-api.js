/**
 * ============================================================================
 * OCCUPATIONAL HEALTH ENTERPRISE - COMPREHENSIVE API TESTS
 * ============================================================================
 * Prueba todos los endpoints del módulo Occupational Health Enterprise v5.0
 *
 * @version 1.0.0
 * @date 2025-01-30
 * ============================================================================
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9998';
const API_URL = `${BASE_URL}/api/occupational-health`;

// ANSI colors para output bonito
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

let authToken = null;
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
};

// ============================================================================
// UTILITIES
// ============================================================================

function logSection(title) {
    console.log('\n' + colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
    console.log(colors.bright + colors.cyan + `  ${title}` + colors.reset);
    console.log(colors.bright + colors.cyan + '═'.repeat(80) + colors.reset + '\n');
}

function logTest(name, status, details = '') {
    testResults.total++;

    if (status === 'PASS') {
        testResults.passed++;
        console.log(`${colors.green}✓${colors.reset} ${name} ${colors.green}PASS${colors.reset}`);
        if (details) console.log(`  ${colors.reset}${details}${colors.reset}`);
    } else if (status === 'FAIL') {
        testResults.failed++;
        console.log(`${colors.red}✗${colors.reset} ${name} ${colors.red}FAIL${colors.reset}`);
        if (details) console.log(`  ${colors.red}${details}${colors.reset}`);
        testResults.errors.push({ test: name, error: details });
    } else if (status === 'SKIP') {
        testResults.skipped++;
        console.log(`${colors.yellow}○${colors.reset} ${name} ${colors.yellow}SKIP${colors.reset}`);
        if (details) console.log(`  ${colors.yellow}${details}${colors.reset}`);
    }
}

function logInfo(message) {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function logWarning(message) {
    console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logError(message) {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function authenticate() {
    logSection('1. AUTENTICACIÓN');

    try {
        logInfo('Intentando login con usuario demo...');

        // Primero obtener el user_id del usuario administrador de empresa demo
        const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
            companySlug: 'aponnt-empresa-demo',
            username: 'administrador',
            password: 'admin123'
        });

        if (loginResponse.data.success && loginResponse.data.token) {
            authToken = loginResponse.data.token;
            logTest('Login exitoso', 'PASS', `Token: ${authToken.substring(0, 20)}...`);
            logInfo(`Usuario: ${loginResponse.data.user.firstName} ${loginResponse.data.user.lastName}`);
            logInfo(`Empresa: ${loginResponse.data.user.companyName || 'Aponnt Empresa Demo'}`);
            return true;
        } else {
            logTest('Login', 'FAIL', 'No se recibió token válido');
            return false;
        }
    } catch (error) {
        logTest('Login', 'FAIL', error.response?.data?.error || error.message);
        logWarning('Continuando con tests sin autenticación (algunos fallarán)...');
        return false;
    }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

async function testHealthCheck() {
    logSection('2. HEALTH CHECK');

    try {
        const response = await axios.get(`${API_URL}/health`);

        if (response.data.success && response.data.status === 'operational') {
            logTest('Health endpoint', 'PASS', `Version: ${response.data.version}`);
            logInfo(`Service: ${response.data.service}`);
            logInfo(`Standards: ${response.data.standards.join(', ')}`);
            return true;
        } else {
            logTest('Health endpoint', 'FAIL', 'Status no es operational');
            return false;
        }
    } catch (error) {
        logTest('Health endpoint', 'FAIL', error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// MEDICAL STAFF TESTS
// ============================================================================

async function testMedicalStaff() {
    logSection('3. MEDICAL STAFF MANAGEMENT');

    if (!authToken) {
        logTest('Medical Staff - List', 'SKIP', 'Sin autenticación');
        return;
    }

    try {
        // GET medical staff
        const response = await axios.get(`${API_URL}/medical-staff`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (response.data.success) {
            logTest('GET /medical-staff', 'PASS', `${response.data.data.length} médicos encontrados`);

            if (response.data.data.length > 0) {
                const doctor = response.data.data[0];
                logInfo(`Ejemplo: ${doctor.first_name} ${doctor.last_name} - ${doctor.specialty || 'Sin especialidad'}`);
            }
        } else {
            logTest('GET /medical-staff', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /medical-staff', 'FAIL', error.response?.data?.error || error.message);
    }

    // POST medical staff (crear nuevo)
    try {
        const newDoctor = {
            first_name: 'Test',
            last_name: 'Doctor',
            email: `test.doctor.${Date.now()}@test.com`,
            phone: '+1234567890',
            license_number: `LIC-${Date.now()}`,
            specialty: 'Occupational Medicine'
        };

        const response = await axios.post(`${API_URL}/medical-staff`, newDoctor, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (response.data.success) {
            logTest('POST /medical-staff', 'PASS', `Doctor creado: ${newDoctor.first_name} ${newDoctor.last_name}`);
        } else {
            logTest('POST /medical-staff', 'FAIL', 'No se pudo crear');
        }
    } catch (error) {
        logTest('POST /medical-staff', 'FAIL', error.response?.data?.error || error.message);
    }
}

// ============================================================================
// ABSENCE CASES TESTS
// ============================================================================

async function testAbsenceCases() {
    logSection('4. ABSENCE CASES - CRUD');

    if (!authToken) {
        logTest('Absence Cases - CRUD', 'SKIP', 'Sin autenticación');
        return;
    }

    // GET cases (list with pagination)
    try {
        const response = await axios.get(`${API_URL}/cases`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: {
                page: 1,
                limit: 10,
                sortField: 'created_at',
                sortOrder: 'DESC'
            }
        });

        if (response.data.success) {
            logTest('GET /cases (paginated)', 'PASS',
                `${response.data.data.length} casos en página 1, total: ${response.data.pagination.total}`);
            logInfo(`Páginas totales: ${response.data.pagination.totalPages}`);
        } else {
            logTest('GET /cases', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /cases', 'FAIL', error.response?.data?.error || error.message);
    }

    // GET cases with filters
    try {
        const response = await axios.get(`${API_URL}/cases`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: {
                status: 'pending',
                limit: 5
            }
        });

        if (response.data.success) {
            logTest('GET /cases (filtered by status=pending)', 'PASS',
                `${response.data.data.length} casos pendientes`);
        } else {
            logTest('GET /cases (filtered)', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /cases (filtered)', 'FAIL', error.response?.data?.error || error.message);
    }

    // GET single case (if exists)
    try {
        const listResponse = await axios.get(`${API_URL}/cases`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { limit: 1 }
        });

        if (listResponse.data.success && listResponse.data.data.length > 0) {
            const caseId = listResponse.data.data[0].id;

            const response = await axios.get(`${API_URL}/cases/${caseId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (response.data.success) {
                logTest('GET /cases/:id', 'PASS', `Caso ${caseId.substring(0, 8)}... obtenido`);
                logInfo(`Tipo: ${response.data.data.absence_type}, Estado: ${response.data.data.case_status}`);
            } else {
                logTest('GET /cases/:id', 'FAIL', 'Response no exitoso');
            }
        } else {
            logTest('GET /cases/:id', 'SKIP', 'No hay casos para probar');
        }
    } catch (error) {
        logTest('GET /cases/:id', 'FAIL', error.response?.data?.error || error.message);
    }
}

// ============================================================================
// ANALYTICS TESTS
// ============================================================================

async function testAnalytics() {
    logSection('5. ANALYTICS & DASHBOARDS');

    if (!authToken) {
        logTest('Analytics', 'SKIP', 'Sin autenticación');
        return;
    }

    // Dashboard KPIs
    try {
        const response = await axios.get(`${API_URL}/analytics/dashboard`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { period: '30' }
        });

        if (response.data.success) {
            const kpis = response.data.data.kpis;
            logTest('GET /analytics/dashboard', 'PASS', 'KPIs obtenidos');
            logInfo(`Casos activos: ${kpis.active_cases || 0}`);
            logInfo(`Pendientes: ${kpis.pending_review || 0}`);
            logInfo(`Justificados: ${kpis.justified_cases || 0}`);
        } else {
            logTest('GET /analytics/dashboard', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /analytics/dashboard', 'FAIL', error.response?.data?.error || error.message);
    }

    // Absence trends
    try {
        const response = await axios.get(`${API_URL}/analytics/absence-trends`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { period: '12months', groupBy: 'month' }
        });

        if (response.data.success) {
            logTest('GET /analytics/absence-trends', 'PASS',
                `${response.data.data.length} períodos de datos`);
        } else {
            logTest('GET /analytics/absence-trends', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /analytics/absence-trends', 'FAIL', error.response?.data?.error || error.message);
    }

    // Cost analysis
    try {
        const response = await axios.get(`${API_URL}/analytics/absence-cost`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { period: '12months' }
        });

        if (response.data.success) {
            logTest('GET /analytics/absence-cost', 'PASS', 'Análisis de costos obtenido');
            if (response.data.data.by_type && response.data.data.by_type.length > 0) {
                logInfo(`Tipos analizados: ${response.data.data.by_type.length}`);
            }
        } else {
            logTest('GET /analytics/absence-cost', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /analytics/absence-cost', 'FAIL', error.response?.data?.error || error.message);
    }

    // RTW metrics
    try {
        const response = await axios.get(`${API_URL}/analytics/rtw-metrics`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { period: '12months' }
        });

        if (response.data.success) {
            logTest('GET /analytics/rtw-metrics', 'PASS', 'Métricas RTW obtenidas');
            if (response.data.data.rtw_success_rate !== undefined) {
                logInfo(`Tasa de éxito RTW: ${response.data.data.rtw_success_rate}%`);
            }
        } else {
            logTest('GET /analytics/rtw-metrics', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /analytics/rtw-metrics', 'FAIL', error.response?.data?.error || error.message);
    }

    // Department comparison
    try {
        const response = await axios.get(`${API_URL}/analytics/department-comparison`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { period: '12months' }
        });

        if (response.data.success) {
            logTest('GET /analytics/department-comparison', 'PASS',
                `${response.data.data.length} departamentos analizados`);
        } else {
            logTest('GET /analytics/department-comparison', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /analytics/department-comparison', 'FAIL', error.response?.data?.error || error.message);
    }
}

// ============================================================================
// COMPLIANCE TESTS
// ============================================================================

async function testCompliance() {
    logSection('6. COMPLIANCE & AUDIT');

    if (!authToken) {
        logTest('Compliance', 'SKIP', 'Sin autenticación');
        return;
    }

    // Compliance report
    try {
        const response = await axios.get(`${API_URL}/compliance/report`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { period: '12months' }
        });

        if (response.data.success) {
            logTest('GET /compliance/report', 'PASS', 'Reporte de cumplimiento obtenido');
            const metrics = response.data.data.compliance_metrics;
            if (metrics) {
                logInfo(`Tasa de revisión médica: ${metrics.doctor_review_rate}%`);
                logInfo(`Tiempo promedio respuesta: ${Math.round(metrics.avg_response_hours || 0)} horas`);
            }
        } else {
            logTest('GET /compliance/report', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /compliance/report', 'FAIL', error.response?.data?.error || error.message);
    }

    // Audit log
    try {
        const response = await axios.get(`${API_URL}/compliance/audit-log`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { limit: 10 }
        });

        if (response.data.success) {
            logTest('GET /compliance/audit-log', 'PASS',
                `${response.data.data.length} entradas de audit log`);
        } else {
            logTest('GET /compliance/audit-log', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /compliance/audit-log', 'FAIL', error.response?.data?.error || error.message);
    }
}

// ============================================================================
// EMPLOYEE HISTORY TESTS
// ============================================================================

async function testEmployeeEndpoints() {
    logSection('7. EMPLOYEE-SPECIFIC ENDPOINTS');

    if (!authToken) {
        logTest('Employee Endpoints', 'SKIP', 'Sin autenticación');
        return;
    }

    try {
        // Primero obtener un employee_id válido
        const casesResponse = await axios.get(`${API_URL}/cases`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { limit: 1 }
        });

        if (casesResponse.data.success && casesResponse.data.data.length > 0) {
            const employeeId = casesResponse.data.data[0].employee_id;

            // Get employee history
            const historyResponse = await axios.get(`${API_URL}/employee/${employeeId}/history`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (historyResponse.data.success) {
                logTest('GET /employee/:id/history', 'PASS',
                    `Historial obtenido para empleado ${employeeId.substring(0, 8)}...`);
                logInfo(`Casos totales: ${historyResponse.data.data.stats.total_cases}`);
                logInfo(`Días ausentes: ${historyResponse.data.data.stats.total_days_absent}`);
            } else {
                logTest('GET /employee/:id/history', 'FAIL', 'Response no exitoso');
            }

            // Get employee risk score
            const riskResponse = await axios.get(`${API_URL}/employee/${employeeId}/risk-score`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (riskResponse.data.success) {
                logTest('GET /employee/:id/risk-score', 'PASS',
                    `Risk score: ${riskResponse.data.data.risk_score}/100 (${riskResponse.data.data.risk_level})`);
                logInfo(`Recomendaciones: ${riskResponse.data.data.recommendations.length}`);
            } else {
                logTest('GET /employee/:id/risk-score', 'FAIL', 'Response no exitoso');
            }
        } else {
            logTest('Employee Endpoints', 'SKIP', 'No hay casos para obtener employee_id');
        }
    } catch (error) {
        logTest('Employee Endpoints', 'FAIL', error.response?.data?.error || error.message);
    }
}

// ============================================================================
// REPORTS TESTS
// ============================================================================

async function testReports() {
    logSection('8. REPORTS & EXPORTS');

    if (!authToken) {
        logTest('Reports', 'SKIP', 'Sin autenticación');
        return;
    }

    // Monthly summary
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        const response = await axios.get(`${API_URL}/reports/monthly-summary`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { year, month }
        });

        if (response.data.success) {
            logTest('GET /reports/monthly-summary', 'PASS',
                `Resumen ${year}-${month}: ${response.data.data.daily_summary.length} días`);
        } else {
            logTest('GET /reports/monthly-summary', 'FAIL', 'Response no exitoso');
        }
    } catch (error) {
        logTest('GET /reports/monthly-summary', 'FAIL', error.response?.data?.error || error.message);
    }
}

// ============================================================================
// FINAL REPORT
// ============================================================================

function printFinalReport() {
    logSection('TEST RESULTS SUMMARY');

    const passRate = testResults.total > 0
        ? ((testResults.passed / testResults.total) * 100).toFixed(2)
        : 0;

    console.log(`${colors.bright}Total Tests:${colors.reset}    ${testResults.total}`);
    console.log(`${colors.green}✓ Passed:${colors.reset}       ${testResults.passed}`);
    console.log(`${colors.red}✗ Failed:${colors.reset}       ${testResults.failed}`);
    console.log(`${colors.yellow}○ Skipped:${colors.reset}      ${testResults.skipped}`);
    console.log(`${colors.bright}Pass Rate:${colors.reset}      ${passRate}%\n`);

    if (testResults.failed > 0) {
        console.log(colors.red + colors.bright + 'FAILED TESTS:' + colors.reset);
        testResults.errors.forEach((err, index) => {
            console.log(`${colors.red}${index + 1}. ${err.test}${colors.reset}`);
            console.log(`   ${err.error}\n`);
        });
    }

    if (testResults.passed === testResults.total && testResults.total > 0) {
        console.log(colors.green + colors.bright + '🎉 ALL TESTS PASSED! 🎉' + colors.reset + '\n');
    } else if (passRate >= 80) {
        console.log(colors.yellow + colors.bright + '⚠️  MOST TESTS PASSED (>80%)' + colors.reset + '\n');
    } else {
        console.log(colors.red + colors.bright + '❌ MANY TESTS FAILED (<80%)' + colors.reset + '\n');
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runAllTests() {
    console.log(colors.bright + colors.magenta);
    console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                           ║');
    console.log('║   OCCUPATIONAL HEALTH ENTERPRISE v5.0 - COMPREHENSIVE API TESTS          ║');
    console.log('║                                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    logInfo(`Base URL: ${BASE_URL}`);
    logInfo(`API URL: ${API_URL}`);
    logInfo(`Started at: ${new Date().toISOString()}\n`);

    try {
        // Run all test sections
        const authenticated = await authenticate();
        await testHealthCheck();
        await testMedicalStaff();
        await testAbsenceCases();
        await testAnalytics();
        await testCompliance();
        await testEmployeeEndpoints();
        await testReports();

        // Print final report
        printFinalReport();

        // Exit with appropriate code
        const exitCode = testResults.failed > 0 ? 1 : 0;
        process.exit(exitCode);

    } catch (error) {
        logError(`Unexpected error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Run tests
runAllTests();
