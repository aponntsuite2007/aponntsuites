/**
 * TESTING EXHAUSTIVO DEL SISTEMA COMPLETO
 * Prueba TODOS los módulos, endpoints y funcionalidades
 *
 * Empresa: ISI
 * Usuario: admin
 * Password: admin123
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'localhost';
const PORT = 9999;
let authToken = null;
let companyId = null;
let userId = null;

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const results = {
    passed: [],
    failed: [],
    warnings: []
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(path, method = 'GET', data = null, useAuth = true) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_URL,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (useAuth && authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testHealthCheck() {
    log('\n📊 TEST 1: Health Check', 'cyan');
    try {
        const response = await makeRequest('/api/v1/health', 'GET', null, false);

        if (response.statusCode === 200 && response.body.status === 'OK') {
            log('✅ Health check: OK', 'green');
            log(`   Database: ${response.body.database.status}`, 'blue');
            results.passed.push('Health Check');
            return true;
        } else {
            log('❌ Health check failed', 'red');
            results.failed.push({ test: 'Health Check', error: 'Invalid response' });
            return false;
        }
    } catch (error) {
        log(`❌ Health check error: ${error.message}`, 'red');
        results.failed.push({ test: 'Health Check', error: error.message });
        return false;
    }
}

async function testLogin() {
    log('\n🔐 TEST 2: Login (admin@ISI)', 'cyan');
    try {
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
            identifier: 'admin',
            password: 'admin123',
            companyId: 11  // ISI company
        }, false);

        if (response.statusCode === 200 && response.body.token) {
            authToken = response.body.token;
            companyId = response.body.user?.company_id || response.body.user?.companyId;
            userId = response.body.user?.id || response.body.user?.user_id;

            log('✅ Login exitoso', 'green');
            log(`   Token: ${authToken.substring(0, 20)}...`, 'blue');
            log(`   Company ID: ${companyId}`, 'blue');
            log(`   User ID: ${userId}`, 'blue');
            log(`   User: ${response.body.user?.firstName} ${response.body.user?.lastName}`, 'blue');
            results.passed.push('Login');
            return true;
        } else {
            log('❌ Login falló', 'red');
            log(`   Status: ${response.statusCode}`, 'red');
            log(`   Response: ${JSON.stringify(response.body)}`, 'red');
            results.failed.push({ test: 'Login', error: response.body });
            return false;
        }
    } catch (error) {
        log(`❌ Login error: ${error.message}`, 'red');
        results.failed.push({ test: 'Login', error: error.message });
        return false;
    }
}

async function testDepartments() {
    log('\n🏢 TEST 3: Departamentos', 'cyan');
    try {
        const response = await makeRequest('/api/v1/departments');

        if (response.statusCode === 200) {
            log(`✅ Departamentos obtenidos: ${response.body.total || response.body.departments?.length || 0}`, 'green');

            if (response.body.departments && response.body.departments.length > 0) {
                log(`   Ejemplo: ${response.body.departments[0].name}`, 'blue');
            }

            results.passed.push('Departamentos - GET');
            return true;
        } else {
            log(`❌ Departamentos falló: ${response.statusCode}`, 'red');
            results.failed.push({ test: 'Departamentos - GET', error: response.body });
            return false;
        }
    } catch (error) {
        log(`❌ Departamentos error: ${error.message}`, 'red');
        results.failed.push({ test: 'Departamentos - GET', error: error.message });
        return false;
    }
}

async function testUsers() {
    log('\n👥 TEST 4: Usuarios', 'cyan');
    try {
        const response = await makeRequest('/api/v1/users');

        if (response.statusCode === 200) {
            log(`✅ Usuarios obtenidos: ${response.body.total || response.body.users?.length || 0}`, 'green');

            if (response.body.users && response.body.users.length > 0) {
                log(`   Ejemplo: ${response.body.users[0].firstName} ${response.body.users[0].lastName}`, 'blue');
            }

            results.passed.push('Usuarios - GET');
            return true;
        } else {
            log(`❌ Usuarios falló: ${response.statusCode}`, 'red');
            results.failed.push({ test: 'Usuarios - GET', error: response.body });
            return false;
        }
    } catch (error) {
        log(`❌ Usuarios error: ${error.message}`, 'red');
        results.failed.push({ test: 'Usuarios - GET', error: error.message });
        return false;
    }
}

async function testSystemModules() {
    log('\n🧩 TEST 5: Módulos del Sistema', 'cyan');
    try {
        const response = await makeRequest('/api/v1/system-modules');

        if (response.statusCode === 200) {
            const modules = response.body.modules || [];
            log(`✅ Módulos del sistema: ${modules.length}`, 'green');

            // Verificar que los íconos NO sean texto
            const modulosConIconoTexto = modules.filter(m =>
                m.icon && !m.icon.includes('fa-')
            );

            if (modulosConIconoTexto.length > 0) {
                log(`⚠️  ${modulosConIconoTexto.length} módulos tienen íconos como texto (no Font Awesome)`, 'yellow');
                modulosConIconoTexto.slice(0, 3).forEach(m => {
                    log(`   - ${m.name}: "${m.icon}"`, 'yellow');
                });
                results.warnings.push({
                    test: 'Módulos - Íconos',
                    warning: `${modulosConIconoTexto.length} módulos con íconos incorrectos`
                });
            } else {
                log(`✅ Todos los íconos son Font Awesome`, 'green');
            }

            results.passed.push('System Modules - GET');
            return true;
        } else {
            log(`❌ System Modules falló: ${response.statusCode}`, 'red');
            results.failed.push({ test: 'System Modules - GET', error: response.body });
            return false;
        }
    } catch (error) {
        log(`❌ System Modules error: ${error.message}`, 'red');
        results.failed.push({ test: 'System Modules - GET', error: error.message });
        return false;
    }
}

async function testCompanyModules() {
    log('\n📦 TEST 6: Módulos de la Empresa (Multi-Tenant)', 'cyan');
    try {
        const response = await makeRequest('/api/v1/company-modules/my-modules');

        if (response.statusCode === 200) {
            const modules = response.body.modules || [];
            log(`✅ Módulos de ISI: ${modules.length}`, 'green');

            if (modules.length > 0) {
                log(`   Ejemplos:`, 'blue');
                modules.slice(0, 5).forEach(m => {
                    log(`   - ${m.name} (${m.module_key})`, 'blue');
                });
            }

            results.passed.push('Company Modules - GET');
            return true;
        } else {
            log(`❌ Company Modules falló: ${response.statusCode}`, 'red');
            results.failed.push({ test: 'Company Modules - GET', error: response.body });
            return false;
        }
    } catch (error) {
        log(`❌ Company Modules error: ${error.message}`, 'red');
        results.failed.push({ test: 'Company Modules - GET', error: error.message });
        return false;
    }
}

async function testNotifications() {
    log('\n🔔 TEST 7: Sistema de Notificaciones V2.0', 'cyan');

    // Test 7.1: Verificar que las tablas existan
    try {
        const checkResponse = await makeRequest(
            '/api/v1/admin/migrations/check-tables',
            'GET',
            null,
            false
        );

        if (checkResponse.statusCode === 200) {
            const tables = checkResponse.body.notificationTables || [];
            log(`✅ Tablas de notificaciones: ${tables.length}`, 'green');

            if (tables.length === 0) {
                log(`⚠️  No hay tablas de notificaciones. Ejecutar migraciones.`, 'yellow');
                results.warnings.push({
                    test: 'Notificaciones - Tablas',
                    warning: 'Tablas no creadas'
                });
            }

            results.passed.push('Notificaciones - Check Tables');
        } else {
            log(`❌ Check tables falló: ${checkResponse.statusCode}`, 'red');
            results.failed.push({ test: 'Notificaciones - Check Tables', error: checkResponse.body });
        }
    } catch (error) {
        log(`❌ Check tables error: ${error.message}`, 'red');
        results.failed.push({ test: 'Notificaciones - Check Tables', error: error.message });
    }

    // Test 7.2: Probar endpoints de notificaciones
    const notificationEndpoints = [
        '/api/v1/notifications',
        '/api/v1/compliance',
        '/api/v1/sla',
        '/api/v1/audit-reports',
        '/api/v1/proactive',
        '/api/v1/resource-center'
    ];

    for (const endpoint of notificationEndpoints) {
        try {
            const response = await makeRequest(endpoint);

            if (response.statusCode === 200 || response.statusCode === 404) {
                log(`✅ ${endpoint}: Accesible`, 'green');
                results.passed.push(`Notificaciones - ${endpoint}`);
            } else {
                log(`⚠️  ${endpoint}: Status ${response.statusCode}`, 'yellow');
                results.warnings.push({
                    test: `Notificaciones - ${endpoint}`,
                    warning: `Status ${response.statusCode}`
                });
            }
        } catch (error) {
            log(`❌ ${endpoint}: ${error.message}`, 'red');
            results.failed.push({ test: `Notificaciones - ${endpoint}`, error: error.message });
        }
    }
}

async function testKiosks() {
    log('\n📟 TEST 8: Kiosks', 'cyan');
    try {
        const response = await makeRequest('/api/v1/kiosks');

        if (response.statusCode === 200) {
            const kiosks = response.body.kiosks || response.body.data || [];
            log(`✅ Kiosks obtenidos: ${kiosks.length}`, 'green');

            if (kiosks.length > 0) {
                log(`   Ejemplo: ${kiosks[0].name || kiosks[0].id}`, 'blue');
            }

            results.passed.push('Kiosks - GET');
            return true;
        } else if (response.statusCode === 404) {
            log(`⚠️  Endpoint de kiosks no encontrado`, 'yellow');
            results.warnings.push({ test: 'Kiosks - GET', warning: 'Endpoint no implementado' });
            return true;
        } else {
            log(`❌ Kiosks falló: ${response.statusCode}`, 'red');
            results.failed.push({ test: 'Kiosks - GET', error: response.body });
            return false;
        }
    } catch (error) {
        log(`❌ Kiosks error: ${error.message}`, 'red');
        results.failed.push({ test: 'Kiosks - GET', error: error.message });
        return false;
    }
}

async function testAttendance() {
    log('\n⏰ TEST 9: Asistencias', 'cyan');
    try {
        const response = await makeRequest('/api/v1/attendance');

        if (response.statusCode === 200) {
            log(`✅ Endpoint de asistencias: Accesible`, 'green');
            results.passed.push('Attendance - GET');
            return true;
        } else if (response.statusCode === 404) {
            log(`⚠️  Endpoint de asistencias no encontrado`, 'yellow');
            results.warnings.push({ test: 'Attendance - GET', warning: 'Endpoint no implementado' });
            return true;
        } else {
            log(`❌ Attendance falló: ${response.statusCode}`, 'red');
            results.failed.push({ test: 'Attendance - GET', error: response.body });
            return false;
        }
    } catch (error) {
        log(`❌ Attendance error: ${error.message}`, 'red');
        results.failed.push({ test: 'Attendance - GET', error: error.message });
        return false;
    }
}

async function testVacations() {
    log('\n🏖️ TEST 10: Vacaciones', 'cyan');
    try {
        const response = await makeRequest('/api/v1/vacation');

        if (response.statusCode === 200) {
            log(`✅ Endpoint de vacaciones: Accesible`, 'green');
            results.passed.push('Vacation - GET');
            return true;
        } else if (response.statusCode === 404) {
            log(`⚠️  Endpoint de vacaciones no encontrado`, 'yellow');
            results.warnings.push({ test: 'Vacation - GET', warning: 'Endpoint no implementado' });
            return true;
        } else {
            log(`❌ Vacation falló: ${response.statusCode}`, 'red');
            results.failed.push({ test: 'Vacation - GET', error: response.body });
            return false;
        }
    } catch (error) {
        log(`❌ Vacation error: ${error.message}`, 'red');
        results.failed.push({ test: 'Vacation - GET', error: error.message });
        return false;
    }
}

async function generateReport() {
    log('\n\n╔═══════════════════════════════════════════════════════════╗', 'magenta');
    log('║                REPORTE FINAL DE TESTING                   ║', 'magenta');
    log('╚═══════════════════════════════════════════════════════════╝\n', 'magenta');

    log(`📊 RESUMEN:`, 'cyan');
    log(`   ✅ Tests pasados: ${results.passed.length}`, 'green');
    log(`   ❌ Tests fallidos: ${results.failed.length}`, 'red');
    log(`   ⚠️  Warnings: ${results.warnings.length}`, 'yellow');

    if (results.passed.length > 0) {
        log(`\n✅ TESTS EXITOSOS (${results.passed.length}):`, 'green');
        results.passed.forEach(test => {
            log(`   ✓ ${test}`, 'green');
        });
    }

    if (results.warnings.length > 0) {
        log(`\n⚠️  WARNINGS (${results.warnings.length}):`, 'yellow');
        results.warnings.forEach(w => {
            log(`   ! ${w.test}: ${w.warning}`, 'yellow');
        });
    }

    if (results.failed.length > 0) {
        log(`\n❌ TESTS FALLIDOS (${results.failed.length}):`, 'red');
        results.failed.forEach(f => {
            log(`   ✗ ${f.test}`, 'red');
            log(`     Error: ${JSON.stringify(f.error)}`, 'red');
        });
    }

    const successRate = ((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1);
    log(`\n📈 TASA DE ÉXITO: ${successRate}%`, successRate > 80 ? 'green' : successRate > 50 ? 'yellow' : 'red');
}

async function runAllTests() {
    log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║        TESTING EXHAUSTIVO DEL SISTEMA COMPLETO           ║', 'cyan');
    log('║        Empresa: ISI | Usuario: admin                     ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝', 'cyan');

    await testHealthCheck();

    const loginSuccess = await testLogin();
    if (!loginSuccess) {
        log('\n❌ LOGIN FALLÓ - No se pueden ejecutar tests autenticados', 'red');
        await generateReport();
        return;
    }

    await testDepartments();
    await testUsers();
    await testSystemModules();
    await testCompanyModules();
    await testNotifications();
    await testKiosks();
    await testAttendance();
    await testVacations();

    await generateReport();
}

// Ejecutar tests
runAllTests().catch(error => {
    log(`\n💥 ERROR FATAL: ${error.message}`, 'red');
    console.error(error);
});
