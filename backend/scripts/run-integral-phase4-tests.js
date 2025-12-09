/**
 * ============================================================================
 * INTEGRAL PHASE4 TESTING SCRIPT v2.0
 * ============================================================================
 * Tests profundos de TODOS los módulos del panel-empresa con paths correctos
 * @version 2.0.0
 * @date 2025-12-08
 */

const http = require('http');

const BASE_URL = 'http://localhost:9998';
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
    moduleResults: {}
};

let authToken = null;

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

function logTest(module, testName, passed, message = '') {
    results.total++;
    if (passed) {
        results.passed++;
        console.log(`  ✅ ${testName}`);
    } else {
        results.failed++;
        console.log(`  ❌ ${testName}: ${message}`);
        results.errors.push({ module, testName, message, timestamp: new Date().toISOString() });
    }

    if (!results.moduleResults[module]) {
        results.moduleResults[module] = { passed: 0, failed: 0, tests: [] };
    }
    results.moduleResults[module].tests.push({ testName, passed, message });
    passed ? results.moduleResults[module].passed++ : results.moduleResults[module].failed++;
}

async function login() {
    console.log('\n🔐 AUTENTICACIÓN');
    try {
        const login = await makeRequest('POST', '/api/v1/auth/login', {
            identifier: 'admin@isi.com',
            password: 'admin123',
            companyId: 11
        });

        if (login.data.token) {
            authToken = login.data.token;
            console.log('  ✅ Login exitoso (ISI - admin@isi.com)');
            return true;
        }
        throw new Error(login.data.error || 'Login failed');
    } catch (error) {
        console.log(`  ❌ Login fallido: ${error.message}`);
        return false;
    }
}

// ============================================================================
// MODULE TESTS - PATHS CORREGIDOS SEGÚN server.js
// ============================================================================

async function testUsersModule() {
    console.log('\n📋 USERS MODULE');
    const module = 'users';

    try {
        const res = await makeRequest('GET', '/api/v1/users?limit=5');
        logTest(module, 'users_list_api',
            res.status === 200 && (res.data.success || res.data.users || Array.isArray(res.data)),
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'users_list_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/users?limit=1');
        if (res.data.users?.length > 0) {
            const userId = res.data.users[0].id || res.data.users[0].user_id;
            const detail = await makeRequest('GET', `/api/v1/users/${userId}`);
            logTest(module, 'user_detail_api', detail.status === 200, detail.data?.error);
        } else {
            logTest(module, 'user_detail_api', true, 'No users');
        }
    } catch (e) { logTest(module, 'user_detail_api', false, e.message); }
}

async function testDepartmentsModule() {
    console.log('\n🏢 DEPARTMENTS MODULE');
    const module = 'departments';

    try {
        const res = await makeRequest('GET', '/api/v1/departments');
        logTest(module, 'departments_list_api',
            res.status === 200,
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'departments_list_api', false, e.message); }
}

async function testShiftsModule() {
    console.log('\n⏰ SHIFTS MODULE');
    const module = 'shifts';

    try {
        const res = await makeRequest('GET', '/api/v1/shifts');
        logTest(module, 'shifts_list_api',
            res.status === 200,
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'shifts_list_api', false, e.message); }
}

async function testAttendanceModule() {
    console.log('\n📅 ATTENDANCE MODULE');
    const module = 'attendance';

    try {
        const res = await makeRequest('GET', '/api/v1/attendance?limit=10');
        logTest(module, 'attendance_list_api',
            res.status === 200,
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'attendance_list_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/attendance-analytics/company/11/stats');
        logTest(module, 'attendance_analytics_api',
            res.status === 200,
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'attendance_analytics_api', false, e.message); }
}

async function testVacationsModule() {
    console.log('\n🏖️ VACATIONS MODULE');
    const module = 'vacations';

    try {
        const res = await makeRequest('GET', '/api/v1/vacation/requests');
        logTest(module, 'vacations_requests_api',
            res.status === 200,
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'vacations_requests_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/vacation/config');
        logTest(module, 'vacations_config_api',
            res.status === 200,
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'vacations_config_api', false, e.message); }
}

async function testMedicalModule() {
    console.log('\n🏥 MEDICAL MODULE');
    const module = 'medical';

    try {
        const res = await makeRequest('GET', '/api/medical-templates');
        logTest(module, 'medical_templates_api',
            res.status === 200 && (res.data.success || res.data.templates || Array.isArray(res.data)),
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'medical_templates_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/medical-records/stats/summary');
        logTest(module, 'medical_records_api',
            res.status === 200,
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'medical_records_api', false, e.message); }
}

async function testKiosksModule() {
    console.log('\n📱 KIOSKS MODULE');
    const module = 'kiosks';

    try {
        const res = await makeRequest('GET', '/api/kiosks');
        logTest(module, 'kiosks_list_api',
            res.status === 200 && (res.data.success || res.data.kiosks || Array.isArray(res.data)),
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'kiosks_list_api', false, e.message); }
}

async function testPayrollModule() {
    console.log('\n💰 PAYROLL MODULE');
    const module = 'payroll';

    try {
        const res = await makeRequest('GET', '/api/payroll/templates');
        logTest(module, 'payroll_templates_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'payroll_templates_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/payroll/runs');
        logTest(module, 'payroll_runs_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'payroll_runs_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/payroll/entities');
        logTest(module, 'payroll_entities_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'payroll_entities_api', false, e.message); }
}

async function testOrganizationalModule() {
    console.log('\n🏛️ ORGANIZATIONAL MODULE');
    const module = 'organizational';

    try {
        const res = await makeRequest('GET', '/api/v1/organizational/structure?company_id=11');
        logTest(module, 'org_structure_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'org_structure_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/organizational/categories');
        logTest(module, 'org_categories_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'org_categories_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/location/branches');
        logTest(module, 'branches_list_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'branches_list_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/payroll/positions');
        logTest(module, 'positions_list_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'positions_list_api', false, e.message); }
}

async function testNotificationsModule() {
    console.log('\n🔔 NOTIFICATIONS MODULE');
    const module = 'notifications';

    try {
        const res = await makeRequest('GET', '/api/v1/enterprise/notifications');
        logTest(module, 'my_notifications_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'my_notifications_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/inbox');
        logTest(module, 'inbox_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'inbox_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/enterprise/notifications/stats');
        logTest(module, 'notifications_stats_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'notifications_stats_api', false, e.message); }
}

async function testLegalModule() {
    console.log('\n⚖️ LEGAL MODULE');
    const module = 'legal';

    try {
        const res = await makeRequest('GET', '/api/v1/legal/communications');
        logTest(module, 'legal_communications_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'legal_communications_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/legal/communication-types');
        logTest(module, 'legal_comm_types_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'legal_comm_types_api', false, e.message); }
}

async function testSanctionsModule() {
    console.log('\n🚫 SANCTIONS MODULE');
    const module = 'sanctions';

    try {
        const res = await makeRequest('GET', '/api/v1/sanctions');
        logTest(module, 'sanctions_list_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'sanctions_list_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/sanctions/types');
        logTest(module, 'sanction_types_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'sanction_types_api', false, e.message); }
}

async function testProceduresModule() {
    console.log('\n📋 PROCEDURES MODULE');
    const module = 'procedures';

    try {
        const res = await makeRequest('GET', '/api/procedures');
        logTest(module, 'procedures_list_api',
            res.status === 200 && (res.data.success || res.data.procedures || Array.isArray(res.data)),
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'procedures_list_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/procedures/stats/dashboard');
        logTest(module, 'procedures_stats_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'procedures_stats_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/procedures/hierarchy/tree');
        logTest(module, 'procedures_tree_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'procedures_tree_api', false, e.message); }
}

async function testHSEModule() {
    console.log('\n🛡️ HSE MODULE');
    const module = 'hse';

    try {
        const res = await makeRequest('GET', '/api/v1/hse/categories');
        logTest(module, 'hse_categories_api',
            res.status === 200 && (res.data.success || res.data.categories || Array.isArray(res.data)),
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'hse_categories_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/hse/catalog');
        logTest(module, 'hse_catalog_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'hse_catalog_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/hse/requirements');
        logTest(module, 'hse_requirements_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'hse_requirements_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/hse/deliveries');
        logTest(module, 'hse_deliveries_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'hse_deliveries_api', false, e.message); }
}

async function testRiskIntelligenceModule() {
    console.log('\n📊 RISK INTELLIGENCE MODULE');
    const module = 'risk-intelligence';

    try {
        const res = await makeRequest('GET', '/api/compliance/risk-dashboard?period=30');
        logTest(module, 'risk_dashboard_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'risk_dashboard_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/compliance/risk-config');
        logTest(module, 'risk_config_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'risk_config_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/compliance/violations?status=active');
        logTest(module, 'violations_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'violations_api', false, e.message); }
}

async function testDMSModule() {
    console.log('\n📁 DMS MODULE');
    const module = 'dms';

    try {
        const res = await makeRequest('GET', '/api/dms/documents');
        logTest(module, 'dms_documents_api',
            res.status === 200 && (res.data.success || res.data.data || Array.isArray(res.data)),
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'dms_documents_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/dms/folders');
        logTest(module, 'dms_folders_api',
            res.status === 200,
            res.data.error || res.data.message);
    } catch (e) { logTest(module, 'dms_folders_api', false, e.message); }
}

async function testBiometricConsentModule() {
    console.log('\n🔏 BIOMETRIC CONSENT MODULE');
    const module = 'biometric-consent';

    try {
        const res = await makeRequest('GET', '/api/v1/biometric/consents');
        logTest(module, 'consent_list_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'consent_list_api', false, e.message); }
}

async function testJobPostingsModule() {
    console.log('\n💼 JOB POSTINGS MODULE');
    const module = 'job-postings';

    try {
        const res = await makeRequest('GET', '/api/job-postings/offers');
        logTest(module, 'job_postings_offers_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'job_postings_offers_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/job-postings/stats');
        logTest(module, 'job_postings_stats_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'job_postings_stats_api', false, e.message); }
}

async function testCompanyAccountModule() {
    console.log('\n🏦 COMPANY ACCOUNT MODULE');
    const module = 'company-account';

    try {
        const res = await makeRequest('GET', '/api/company-account/communications');
        logTest(module, 'company_comms_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'company_comms_api', false, e.message); }
}

async function testSupportModule() {
    console.log('\n❓ SUPPORT MODULE');
    const module = 'support';

    try {
        const res = await makeRequest('GET', '/api/v1/help/tickets');
        logTest(module, 'support_tickets_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'support_tickets_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/help/stats');
        logTest(module, 'support_stats_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'support_stats_api', false, e.message); }
}

async function testEmployee360Module() {
    console.log('\n👤 EMPLOYEE 360 MODULE');
    const module = 'employee-360';

    try {
        const res = await makeRequest('GET', '/api/employee-360/dashboard');
        logTest(module, 'employee_360_dashboard_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'employee_360_dashboard_api', false, e.message); }

    try {
        const users = await makeRequest('GET', '/api/v1/users?limit=1');
        if (users.data.users?.length > 0) {
            const userId = users.data.users[0].user_id || users.data.users[0].id;
            const res = await makeRequest('GET', `/api/employee-360/${userId}/summary`);
            logTest(module, 'employee_360_summary_api', res.status === 200, res.data.error);
        } else {
            logTest(module, 'employee_360_summary_api', true, 'No users to test');
        }
    } catch (e) { logTest(module, 'employee_360_summary_api', false, e.message); }
}

async function testHelpModule() {
    console.log('\n📚 HELP MODULE');
    const module = 'help';

    try {
        const res = await makeRequest('GET', '/api/v1/help/module/users');
        logTest(module, 'help_module_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'help_module_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/v1/help/walkthrough/users');
        logTest(module, 'help_walkthrough_api', res.status === 200, res.data.error || res.data.message);
    } catch (e) { logTest(module, 'help_walkthrough_api', false, e.message); }
}

async function testComplianceModule() {
    console.log('\n📊 COMPLIANCE MODULE');
    const module = 'compliance';

    try {
        const res = await makeRequest('GET', '/api/compliance/departments');
        logTest(module, 'compliance_departments_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'compliance_departments_api', false, e.message); }

    try {
        const res = await makeRequest('GET', '/api/compliance/trends?days=30');
        logTest(module, 'compliance_trends_api', res.status === 200, res.data.error);
    } catch (e) { logTest(module, 'compliance_trends_api', false, e.message); }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runAllTests() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║         INTEGRAL PHASE4 TESTING v2.0 - PANEL EMPRESA         ║');
    console.log('║              Tests con Paths Corregidos                      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n📅 Inicio: ${new Date().toISOString()}`);
    console.log(`🌐 Base URL: ${BASE_URL}`);

    const loggedIn = await login();
    if (!loggedIn) {
        console.log('\n❌ No se pudo autenticar. Abortando tests.');
        process.exit(1);
    }

    // Run all module tests
    await testUsersModule();
    await testDepartmentsModule();
    await testShiftsModule();
    await testAttendanceModule();
    await testVacationsModule();
    await testMedicalModule();
    await testKiosksModule();
    await testPayrollModule();
    await testOrganizationalModule();
    await testNotificationsModule();
    await testLegalModule();
    await testSanctionsModule();
    await testProceduresModule();
    await testHSEModule();
    await testRiskIntelligenceModule();
    await testDMSModule();
    await testBiometricConsentModule();
    await testJobPostingsModule();
    await testCompanyAccountModule();
    await testSupportModule();
    await testEmployee360Module();
    await testHelpModule();
    await testComplianceModule();

    // Print results
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    RESULTADOS FINALES                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

    if (results.errors.length > 0) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                      ERRORES DETECTADOS');
        console.log('═══════════════════════════════════════════════════════════════');
        results.errors.forEach((error, i) => {
            console.log(`\n${i + 1}. [${error.module}] ${error.testName}`);
            console.log(`   Error: ${error.message}`);
        });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    RESUMEN POR MÓDULO');
    console.log('═══════════════════════════════════════════════════════════════');
    Object.entries(results.moduleResults).forEach(([module, data]) => {
        const status = data.failed === 0 ? '✅' : '❌';
        console.log(`${status} ${module}: ${data.passed}/${data.passed + data.failed} passed`);
    });

    console.log(`\n📅 Fin: ${new Date().toISOString()}`);

    const fs = require('fs');
    fs.writeFileSync('./test-results-integral.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Resultados guardados en test-results-integral.json');

    process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
