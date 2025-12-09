/**
 * ============================================================================
 * TEST COMPLETO: APK MÉDICO - Todas las Funcionalidades
 * ============================================================================
 * Prueba TODOS los endpoints del módulo médico para identificar errores 500
 * Similar al test del Employee APK pero para funcionalidades médicas.
 *
 * Endpoints probados:
 * - /api/medical-advanced/* (Antropométricos, Crónicos, Cirugías, etc.)
 * - /api/medical-cases/* (Casos médicos, Vista 360°, Aptitud)
 * - /api/medical-records/* (Registros con inmutabilidad)
 * - /api/medical-authorizations/* (Autorizaciones)
 * - /api/medical/* (Certificados, Prescripciones, etc.)
 *
 * @date 2025-12-08
 * ============================================================================
 */

const http = require('http');

const PORT = process.env.TEST_PORT || 9998;
const BASE_URL = `http://localhost:${PORT}`;

// Colores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Resultados de tests
const results = {
    passed: 0,
    failed: 0,
    errors: []
};

/**
 * Hacer request HTTP
 */
function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: jsonBody });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

/**
 * Registrar resultado de test
 */
function logResult(testName, success, details = '', errorDetails = null) {
    if (success) {
        console.log(`${colors.green}[OK]${colors.reset} ${testName} ${details}`);
        results.passed++;
    } else {
        console.log(`${colors.red}[FAIL]${colors.reset} ${testName} ${details}`);
        results.failed++;
        if (errorDetails) {
            results.errors.push({ test: testName, error: errorDetails });
        }
    }
}

/**
 * Test de endpoint - Solo verifica que NO sea error 500
 */
async function testEndpoint(token, method, path, testName, data = null) {
    try {
        const response = await makeRequest(method, path, data, token);

        // 500 es error del servidor - queremos detectar estos
        if (response.status === 500) {
            logResult(testName, false, `(500 Internal Server Error)`, response.data);
            return { success: false, status: response.status, data: response.data };
        }

        // 200, 201, 400, 401, 403, 404 son respuestas válidas (no errores del servidor)
        logResult(testName, true, `(${response.status})`);
        return { success: true, status: response.status, data: response.data };
    } catch (error) {
        logResult(testName, false, `(Connection Error: ${error.message})`);
        return { success: false, error: error.message };
    }
}

/**
 * Login como admin
 */
async function loginAsAdmin() {
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan} STEP 1: LOGIN ADMIN${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    try {
        // Usar campos correctos: identifier, password, companyId
        const response = await makeRequest('POST', '/api/v1/auth/login', {
            identifier: 'administrador',
            password: 'admin123',
            companyId: 1  // APONNT - Empresa Demo
        });

        if (response.status === 200 && response.data.token) {
            logResult('Login Admin', true, '(Token obtenido)');
            return {
                token: response.data.token,
                user: response.data.user,
                companyId: response.data.user?.company_id || 1
            };
        } else {
            logResult('Login Admin', false, `(${response.status}) ${JSON.stringify(response.data).substring(0, 100)}`);
            return null;
        }
    } catch (error) {
        logResult('Login Admin', false, `(${error.message})`);
        return null;
    }
}

/**
 * Obtener un empleado de prueba
 */
async function getTestEmployee(token, companyId) {
    try {
        const response = await makeRequest('GET', `/api/users?company_id=${companyId}&limit=1`, null, token);
        if (response.status === 200 && response.data.users && response.data.users.length > 0) {
            return response.data.users[0];
        }
        // Fallback: buscar por otra ruta
        const fallback = await makeRequest('GET', `/api/employees?limit=1`, null, token);
        if (fallback.status === 200 && fallback.data.data && fallback.data.data.length > 0) {
            return fallback.data.data[0];
        }
        return null;
    } catch (error) {
        console.log(`${colors.yellow}⚠ No se pudo obtener empleado de prueba${colors.reset}`);
        return null;
    }
}

/**
 * TEST: Medical Advanced Routes
 */
async function testMedicalAdvanced(token, employeeId) {
    console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta} MEDICAL ADVANCED (/api/medical-advanced/*)${colors.reset}`);
    console.log(`${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    // Catálogos
    await testEndpoint(token, 'GET', '/api/medical-advanced/chronic-conditions-catalog', 'Catálogo condiciones crónicas');
    await testEndpoint(token, 'GET', '/api/medical-advanced/sports-catalog', 'Catálogo deportes');

    // Datos por empleado (usando UUID o ID)
    const userId = employeeId || '00000000-0000-0000-0000-000000000001';

    await testEndpoint(token, 'GET', `/api/medical-advanced/anthropometric/${userId}`, 'Antropométricos empleado');
    await testEndpoint(token, 'GET', `/api/medical-advanced/chronic-conditions/${userId}`, 'Condiciones crónicas empleado');
    await testEndpoint(token, 'GET', `/api/medical-advanced/surgeries/${userId}`, 'Cirugías empleado');
    await testEndpoint(token, 'GET', `/api/medical-advanced/psychiatric/${userId}`, 'Tratamientos psiquiátricos');
    await testEndpoint(token, 'GET', `/api/medical-advanced/sports/${userId}`, 'Actividades deportivas');
    await testEndpoint(token, 'GET', `/api/medical-advanced/healthy-habits/${userId}`, 'Hábitos saludables');
    await testEndpoint(token, 'GET', `/api/medical-advanced/complete/${userId}`, 'Vista completa médica');
}

/**
 * TEST: Medical Cases Routes
 */
async function testMedicalCases(token, employeeId, companyId) {
    console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta} MEDICAL CASES (/api/medical-cases/*)${colors.reset}`);
    console.log(`${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    const userId = employeeId || '00000000-0000-0000-0000-000000000001';

    // Endpoints de listado
    await testEndpoint(token, 'GET', '/api/medical-cases/doctor/pending', 'Casos pendientes médico');
    await testEndpoint(token, 'GET', '/api/medical-cases/company/doctors', 'Médicos de la empresa');
    await testEndpoint(token, 'GET', '/api/medical-cases/employees/with-medical-records', 'Empleados con registros médicos');

    // Por empleado
    await testEndpoint(token, 'GET', `/api/medical-cases/employee/${userId}`, 'Historial casos empleado');
    await testEndpoint(token, 'GET', `/api/medical-cases/employee/${userId}/medical-history`, 'Historial médico completo');
    await testEndpoint(token, 'GET', `/api/medical-cases/employee/${userId}/360`, 'Vista 360° empleado');
    await testEndpoint(token, 'GET', `/api/medical-cases/employee/${userId}/fitness-status`, 'Estado aptitud laboral');

    // Caso específico (UUID de prueba - debe retornar 404, no 500)
    const testCaseUUID = '00000000-0000-0000-0000-000000000001';
    await testEndpoint(token, 'GET', `/api/medical-cases/${testCaseUUID}`, 'Detalle caso médico');
    await testEndpoint(token, 'GET', `/api/medical-cases/${testCaseUUID}/messages`, 'Mensajes caso médico');
}

/**
 * TEST: Medical Records Routes
 */
async function testMedicalRecords(token, employeeId) {
    console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta} MEDICAL RECORDS (/api/medical-records/*)${colors.reset}`);
    console.log(`${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    const userId = employeeId || '00000000-0000-0000-0000-000000000001';

    // Listados y stats
    await testEndpoint(token, 'GET', '/api/medical-records/expiring/list', 'Registros por vencer');
    await testEndpoint(token, 'GET', '/api/medical-records/stats/summary', 'Estadísticas registros');

    // Por empleado
    await testEndpoint(token, 'GET', `/api/medical-records/employee/${userId}`, 'Registros empleado');

    // Registro específico
    await testEndpoint(token, 'GET', '/api/medical-records/1', 'Detalle registro médico');
    await testEndpoint(token, 'GET', '/api/medical-records/1/editability', 'Estado editabilidad');
    await testEndpoint(token, 'GET', '/api/medical-records/1/audit-trail', 'Trail de auditoría');
    await testEndpoint(token, 'GET', '/api/medical-records/1/custody-chain', 'Cadena de custodia');
}

/**
 * TEST: Medical Authorizations Routes
 */
async function testMedicalAuthorizations(token) {
    console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta} MEDICAL AUTHORIZATIONS (/api/medical-authorizations/*)${colors.reset}`);
    console.log(`${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    await testEndpoint(token, 'GET', '/api/medical-authorizations/pending', 'Autorizaciones pendientes');
    await testEndpoint(token, 'GET', '/api/medical-authorizations/my-requests', 'Mis solicitudes');
    await testEndpoint(token, 'GET', '/api/medical-authorizations/stats/summary', 'Estadísticas autorizaciones');
    await testEndpoint(token, 'GET', '/api/medical-authorizations/1', 'Detalle autorización');
    await testEndpoint(token, 'GET', '/api/medical-authorizations/1/window-status', 'Estado ventana');
}

/**
 * TEST: Medical Base Routes (Certificados, etc.)
 */
async function testMedicalBase(token, employeeId) {
    console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta} MEDICAL BASE (/api/medical/*)${colors.reset}`);
    console.log(`${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    const userId = employeeId || '00000000-0000-0000-0000-000000000001';

    // Certificados
    await testEndpoint(token, 'GET', '/api/medical/certificates', 'Listar certificados');
    await testEndpoint(token, 'GET', `/api/medical/certificates/employee/${userId}`, 'Certificados empleado');
    await testEndpoint(token, 'GET', '/api/medical/certificates/pending', 'Certificados pendientes');
    await testEndpoint(token, 'GET', '/api/medical/certificates/1', 'Detalle certificado');

    // Prescripciones
    await testEndpoint(token, 'GET', '/api/medical/prescriptions', 'Listar prescripciones');
    await testEndpoint(token, 'GET', `/api/medical/prescriptions/employee/${userId}`, 'Prescripciones empleado');

    // Ficha médica
    await testEndpoint(token, 'GET', `/api/medical/medical-file/${userId}`, 'Ficha médica');
    await testEndpoint(token, 'GET', `/api/medical/history/${userId}`, 'Historial médico');

    // Diagnósticos y cuestionarios
    await testEndpoint(token, 'GET', '/api/medical/diagnostics/types', 'Tipos diagnóstico');
    await testEndpoint(token, 'GET', '/api/medical/questionnaires', 'Listar cuestionarios');

    // Estudios
    await testEndpoint(token, 'GET', '/api/medical/studies', 'Listar estudios');
    await testEndpoint(token, 'GET', `/api/medical/studies/employee/${userId}`, 'Estudios empleado');

    // Fotos médicas
    await testEndpoint(token, 'GET', '/api/medical/photos/pending', 'Fotos pendientes');
    await testEndpoint(token, 'GET', `/api/medical/photos/employee/${userId}`, 'Fotos empleado');

    // Exámenes médicos
    await testEndpoint(token, 'GET', '/api/medical/exams', 'Listar exámenes');
    await testEndpoint(token, 'GET', '/api/medical/exams/types', 'Tipos de exámenes');
    await testEndpoint(token, 'GET', '/api/medical/exams/pending', 'Exámenes pendientes');
    await testEndpoint(token, 'GET', `/api/medical/exams/employee/${userId}`, 'Exámenes empleado');
}

/**
 * TEST: Medical Statistics Service
 */
async function testMedicalStatistics(token) {
    console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta} MEDICAL STATISTICS (/api/medical/statistics/*)${colors.reset}`);
    console.log(`${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    await testEndpoint(token, 'GET', '/api/medical/statistics', 'Estadísticas generales');
    await testEndpoint(token, 'GET', '/api/medical/statistics/dashboard', 'Dashboard médico');
    await testEndpoint(token, 'GET', '/api/medical/statistics/by-department', 'Por departamento');
    await testEndpoint(token, 'GET', '/api/medical/statistics/absences', 'Estadísticas ausencias');
    await testEndpoint(token, 'GET', '/api/medical/statistics/exams', 'Estadísticas exámenes');
}

/**
 * TEST: Medical Templates
 */
async function testMedicalTemplates(token) {
    console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta} MEDICAL TEMPLATES (/api/medical/templates/*)${colors.reset}`);
    console.log(`${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    await testEndpoint(token, 'GET', '/api/medical/templates', 'Listar templates');
    await testEndpoint(token, 'GET', '/api/medical/templates/exam-types', 'Tipos de examen');
    await testEndpoint(token, 'GET', '/api/medical/templates/1', 'Detalle template');
}

/**
 * Imprimir resumen final
 */
function printSummary() {
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan} RESUMEN FINAL${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`Total Tests: ${results.passed + results.failed}`);
    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);

    if (results.errors.length > 0) {
        console.log(`\n${colors.red}═══ ERRORES 500 DETECTADOS ═══${colors.reset}\n`);
        results.errors.forEach((err, i) => {
            console.log(`${colors.red}${i + 1}. ${err.test}${colors.reset}`);
            if (typeof err.error === 'object') {
                console.log(`   Error: ${JSON.stringify(err.error).substring(0, 200)}`);
            } else {
                console.log(`   Error: ${err.error}`);
            }
            console.log('');
        });
    } else {
        console.log(`\n${colors.green}✓ No se detectaron errores 500!${colors.reset}`);
    }

    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
}

/**
 * Main
 */
async function main() {
    console.log(`\n${colors.cyan}════════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan} TEST COMPLETO: APK MÉDICO - TODAS LAS FUNCIONALIDADES${colors.reset}`);
    console.log(`${colors.cyan} Puerto: ${PORT}${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════════════════════════════════${colors.reset}`);

    // Login
    const auth = await loginAsAdmin();
    if (!auth || !auth.token) {
        console.log(`\n${colors.red}✗ No se pudo obtener token. Abortando tests.${colors.reset}\n`);
        process.exit(1);
    }

    const token = auth.token;
    const companyId = auth.companyId;

    // Obtener empleado de prueba
    console.log(`\n${colors.cyan}Obteniendo empleado de prueba...${colors.reset}`);
    const employee = await getTestEmployee(token, companyId);
    const employeeId = employee?.user_id || employee?.id || null;

    if (employeeId) {
        console.log(`${colors.green}✓ Empleado de prueba: ${employee.firstName || employee.name} (${employeeId})${colors.reset}`);
    } else {
        console.log(`${colors.yellow}⚠ No se encontró empleado de prueba, usando UUID dummy${colors.reset}`);
    }

    // Ejecutar tests
    await testMedicalAdvanced(token, employeeId);
    await testMedicalCases(token, employeeId, companyId);
    await testMedicalRecords(token, employeeId);
    await testMedicalAuthorizations(token);
    await testMedicalBase(token, employeeId);
    await testMedicalStatistics(token);
    await testMedicalTemplates(token);

    // Resumen
    printSummary();

    process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error(`${colors.red}Error fatal:${colors.reset}`, err);
    process.exit(1);
});
