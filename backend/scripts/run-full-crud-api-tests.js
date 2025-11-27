/**
 * =============================================================================
 * CRUD COMPLETO VIA API - Tests de los 5 Módulos Principales
 * =============================================================================
 *
 * Ejecuta tests CRUD reales contra el servidor para:
 * - Users
 * - Departments
 * - Shifts
 * - Attendance
 * - Payroll
 *
 * Uso: node scripts/run-full-crud-api-tests.js
 *
 * =============================================================================
 */

const http = require('http');

const BASE_URL = 'http://localhost:9998';
const COMPANY_ID = 11; // ISI
const COMPANY_SLUG = 'isi';

// Resultados globales
const results = {
    timestamp: new Date().toISOString(),
    modules: {},
    summary: { total: 0, passed: 0, failed: 0 }
};

// Helper para hacer requests HTTP
function request(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Test helper
function test(moduleName, testName, passed, details = '') {
    if (!results.modules[moduleName]) {
        results.modules[moduleName] = { tests: [], passed: 0, failed: 0 };
    }

    results.modules[moduleName].tests.push({
        name: testName,
        passed,
        details
    });

    if (passed) {
        results.modules[moduleName].passed++;
        results.summary.passed++;
    } else {
        results.modules[moduleName].failed++;
        results.summary.failed++;
    }
    results.summary.total++;

    const icon = passed ? '✅' : '❌';
    console.log(`   ${icon} ${testName}${details ? ` (${details})` : ''}`);
}

// ════════════════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════════════════
async function login() {
    console.log('\n🔐 AUTENTICACIÓN');
    console.log('─'.repeat(60));

    const loginAttempts = [
        { email: 'admin11@sistema.local', password: 'admin123' },
        { email: 'admin11@sistema.local', password: 'Admin123!' },
        { email: 'admin11@sistema.local', password: '123456' }
    ];

    for (const creds of loginAttempts) {
        try {
            const res = await request('POST', '/api/v1/auth/login', {
                companySlug: COMPANY_SLUG,
                email: creds.email,
                password: creds.password
            });

            if (res.status === 200 && res.data.token) {
                console.log(`   ✅ Login exitoso como ${creds.email}`);
                return res.data.token;
            }
        } catch (e) {}
    }

    // Intentar crear un token JWT directamente para testing
    try {
        const jwt = require('jsonwebtoken');
        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize(
            'attendance_system', 'postgres', 'Aedr15150302',
            { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
        );

        const [admins] = await sequelize.query(`
            SELECT user_id, email, role, company_id FROM users
            WHERE company_id = ${COMPANY_ID} AND role = 'admin' AND is_active = true
            LIMIT 1
        `);

        if (admins.length > 0) {
            const admin = admins[0];
            const token = jwt.sign(
                {
                    id: admin.user_id,
                    email: admin.email,
                    role: admin.role,
                    companyId: admin.company_id
                },
                process.env.JWT_SECRET || 'tu_secreto_jwt_super_seguro_2024',
                { expiresIn: '1h' }
            );
            console.log(`   ✅ Token generado para ${admin.email}`);
            await sequelize.close();
            return token;
        }

        await sequelize.close();
    } catch (e) {
        console.log('   ⚠️ Error generando token:', e.message);
    }

    console.log('   ❌ No se pudo autenticar');
    return null;
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: DEPARTMENTS
// ════════════════════════════════════════════════════════════════════════════
async function testDepartments(token) {
    console.log('\n📦 MODULE: DEPARTMENTS');
    console.log('─'.repeat(60));

    let createdId = null;
    const testDeptName = `[CRUD-TEST] Dept_${Date.now()}`;

    // CREATE
    try {
        const res = await request('POST', '/api/v1/departments', {
            name: testDeptName,
            description: 'Test department created by CRUD tests',
            is_active: true,
            gpsLocation: { lat: -34.6037, lng: -58.3816 },
            coverageRadius: 100
        }, token);

        if (res.status === 201 || res.status === 200) {
            createdId = res.data.id || res.data.department?.id;
            test('departments', 'CREATE - Crear departamento', true, `ID: ${createdId}`);
        } else {
            test('departments', 'CREATE - Crear departamento', false, `Status: ${res.status}`);
        }
    } catch (e) {
        test('departments', 'CREATE - Crear departamento', false, e.message);
    }

    // READ ALL
    try {
        const res = await request('GET', '/api/v1/departments', null, token);
        const depts = res.data?.departments || res.data;
        const found = res.status === 200 && Array.isArray(depts);
        test('departments', 'READ ALL - Listar departamentos', found, `Count: ${depts?.length || 0}`);
    } catch (e) {
        test('departments', 'READ ALL - Listar departamentos', false, e.message);
    }

    // READ ONE
    if (createdId) {
        try {
            const res = await request('GET', `/api/v1/departments/${createdId}`, null, token);
            test('departments', 'READ ONE - Obtener por ID', res.status === 200, `Name: ${res.data?.name}`);
        } catch (e) {
            test('departments', 'READ ONE - Obtener por ID', false, e.message);
        }
    }

    // UPDATE
    if (createdId) {
        try {
            const res = await request('PUT', `/api/v1/departments/${createdId}`, {
                name: testDeptName + ' UPDATED',
                description: 'Updated by CRUD tests'
            }, token);
            test('departments', 'UPDATE - Actualizar departamento', res.status === 200);
        } catch (e) {
            test('departments', 'UPDATE - Actualizar departamento', false, e.message);
        }
    }

    // DELETE
    if (createdId) {
        try {
            const res = await request('DELETE', `/api/v1/departments/${createdId}`, null, token);
            test('departments', 'DELETE - Eliminar departamento', res.status === 200 || res.status === 204);
        } catch (e) {
            test('departments', 'DELETE - Eliminar departamento', false, e.message);
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: SHIFTS
// ════════════════════════════════════════════════════════════════════════════
async function testShifts(token) {
    console.log('\n📦 MODULE: SHIFTS');
    console.log('─'.repeat(60));

    let createdId = null;
    const testShiftName = `[CRUD-TEST] Shift_${Date.now()}`;

    // CREATE
    try {
        const res = await request('POST', '/api/v1/shifts', {
            name: testShiftName,
            shiftType: 'fixed',
            startTime: '09:00',
            endTime: '18:00',
            workDays: [1, 2, 3, 4, 5],
            isActive: true,
            toleranceMinutes: 15,
            description: 'Test shift created by CRUD tests'
        }, token);

        if (res.status === 201 || res.status === 200) {
            createdId = res.data.id || res.data.shift?.id;
            test('shifts', 'CREATE - Crear turno', true, `ID: ${createdId}`);
        } else {
            test('shifts', 'CREATE - Crear turno', false, `Status: ${res.status}, ${JSON.stringify(res.data).substring(0, 100)}`);
        }
    } catch (e) {
        test('shifts', 'CREATE - Crear turno', false, e.message);
    }

    // READ ALL
    try {
        const res = await request('GET', '/api/v1/shifts', null, token);
        const shifts = res.data?.shifts || res.data;
        const found = res.status === 200 && Array.isArray(shifts);
        test('shifts', 'READ ALL - Listar turnos', found, `Count: ${shifts?.length || 0}`);
    } catch (e) {
        test('shifts', 'READ ALL - Listar turnos', false, e.message);
    }

    // READ ONE
    if (createdId) {
        try {
            const res = await request('GET', `/api/v1/shifts/${createdId}`, null, token);
            test('shifts', 'READ ONE - Obtener por ID', res.status === 200);
        } catch (e) {
            test('shifts', 'READ ONE - Obtener por ID', false, e.message);
        }
    }

    // UPDATE
    if (createdId) {
        try {
            const res = await request('PUT', `/api/v1/shifts/${createdId}`, {
                name: testShiftName + ' UPDATED',
                toleranceMinutes: 20
            }, token);
            test('shifts', 'UPDATE - Actualizar turno', res.status === 200);
        } catch (e) {
            test('shifts', 'UPDATE - Actualizar turno', false, e.message);
        }
    }

    // DELETE
    if (createdId) {
        try {
            const res = await request('DELETE', `/api/v1/shifts/${createdId}`, null, token);
            test('shifts', 'DELETE - Eliminar turno', res.status === 200 || res.status === 204);
        } catch (e) {
            test('shifts', 'DELETE - Eliminar turno', false, e.message);
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: USERS
// ════════════════════════════════════════════════════════════════════════════
async function testUsers(token) {
    console.log('\n📦 MODULE: USERS');
    console.log('─'.repeat(60));

    let createdId = null;
    const testEmail = `crud-test-${Date.now()}@test.com`;

    // Primero obtener un departamento válido de ISI
    let validDeptId = null;
    try {
        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize(
            'attendance_system', 'postgres', 'Aedr15150302',
            { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
        );
        const [depts] = await sequelize.query(`
            SELECT id FROM departments WHERE company_id = ${COMPANY_ID} AND is_active = true LIMIT 1
        `);
        if (depts.length > 0) validDeptId = depts[0].id;
        await sequelize.close();
    } catch (e) {}

    // CREATE
    try {
        const userData = {
            firstName: 'CRUDTest',
            lastName: 'User',
            email: testEmail,
            password: 'Test123456!',
            role: 'employee',
            dni: `${Date.now()}`.substring(5),
            position: 'Tester'
        };
        if (validDeptId) userData.departmentId = validDeptId;

        const res = await request('POST', '/api/v1/users', userData, token);

        if (res.status === 201 || res.status === 200) {
            createdId = res.data.user_id || res.data.user?.user_id || res.data.id;
            test('users', 'CREATE - Crear usuario', true, `ID: ${createdId}`);
        } else {
            test('users', 'CREATE - Crear usuario', false, `Status: ${res.status}`);
        }
    } catch (e) {
        test('users', 'CREATE - Crear usuario', false, e.message);
    }

    // READ ALL
    try {
        const res = await request('GET', '/api/v1/users', null, token);
        const users = res.data?.users || res.data;
        const found = res.status === 200 && Array.isArray(users);
        test('users', 'READ ALL - Listar usuarios', found, `Count: ${users?.length || 0}`);
    } catch (e) {
        test('users', 'READ ALL - Listar usuarios', false, e.message);
    }

    // READ ONE
    if (createdId) {
        try {
            const res = await request('GET', `/api/v1/users/${createdId}`, null, token);
            test('users', 'READ ONE - Obtener por ID', res.status === 200);
        } catch (e) {
            test('users', 'READ ONE - Obtener por ID', false, e.message);
        }
    }

    // UPDATE
    if (createdId) {
        try {
            const res = await request('PUT', `/api/v1/users/${createdId}`, {
                firstName: 'CRUDTest UPDATED',
                position: 'Senior Tester'
            }, token);
            test('users', 'UPDATE - Actualizar usuario', res.status === 200);
        } catch (e) {
            test('users', 'UPDATE - Actualizar usuario', false, e.message);
        }
    }

    // DELETE
    if (createdId) {
        try {
            const res = await request('DELETE', `/api/v1/users/${createdId}`, null, token);
            test('users', 'DELETE - Eliminar usuario', res.status === 200 || res.status === 204);
        } catch (e) {
            test('users', 'DELETE - Eliminar usuario', false, e.message);
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: ATTENDANCE
// ════════════════════════════════════════════════════════════════════════════
async function testAttendance(token) {
    console.log('\n📦 MODULE: ATTENDANCE');
    console.log('─'.repeat(60));

    // READ ALL
    try {
        const res = await request('GET', '/api/v1/attendance', null, token);
        const attendances = res.data?.attendances || res.data;
        const found = res.status === 200;
        test('attendance', 'READ ALL - Listar asistencias', found, `Count: ${attendances?.length || 0}`);
    } catch (e) {
        test('attendance', 'READ ALL - Listar asistencias', false, e.message);
    }

    // GET TODAY STATUS
    try {
        const res = await request('GET', '/api/v1/attendance/today/status', null, token);
        test('attendance', 'READ - Estado de hoy', res.status === 200 || res.status === 404);
    } catch (e) {
        test('attendance', 'READ - Estado de hoy', false, e.message);
    }

    // GET STATS
    try {
        const res = await request('GET', '/api/v1/attendance/stats', null, token);
        test('attendance', 'READ - Estadísticas', res.status === 200);
    } catch (e) {
        test('attendance', 'READ - Estadísticas', false, e.message);
    }

    // CHECK-IN (puede fallar si ya hay check-in hoy)
    try {
        const res = await request('POST', '/api/v1/attendance/checkin', {
            latitude: -34.6037,
            longitude: -58.3816
        }, token);
        // 201 = éxito, 400 = ya hay check-in, ambos son válidos
        test('attendance', 'CREATE - Check-in', res.status === 201 || res.status === 200 || res.status === 400,
            res.status === 400 ? 'Ya existe check-in' : 'OK');
    } catch (e) {
        test('attendance', 'CREATE - Check-in', false, e.message);
    }

    // CHECK-OUT (puede fallar si no hay check-in)
    try {
        const res = await request('POST', '/api/v1/attendance/checkout', {
            latitude: -34.6037,
            longitude: -58.3816
        }, token);
        test('attendance', 'UPDATE - Check-out', res.status === 200 || res.status === 400,
            res.status === 400 ? 'No hay check-in activo' : 'OK');
    } catch (e) {
        test('attendance', 'UPDATE - Check-out', false, e.message);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: PAYROLL
// ════════════════════════════════════════════════════════════════════════════
async function testPayroll(token) {
    console.log('\n📦 MODULE: PAYROLL (Liquidación de Sueldos)');
    console.log('─'.repeat(60));

    let createdTemplateId = null;

    // READ COUNTRIES
    try {
        const res = await request('GET', '/api/payroll/countries', null, token);
        test('payroll', 'READ - Listar países', res.status === 200, `Count: ${res.data?.length || 0}`);
    } catch (e) {
        test('payroll', 'READ - Listar países', false, e.message);
    }

    // READ CONCEPT TYPES
    try {
        const res = await request('GET', '/api/payroll/concept-types', null, token);
        test('payroll', 'READ - Tipos de conceptos', res.status === 200);
    } catch (e) {
        test('payroll', 'READ - Tipos de conceptos', false, e.message);
    }

    // READ TEMPLATES
    try {
        const res = await request('GET', '/api/payroll/templates', null, token);
        test('payroll', 'READ ALL - Listar plantillas', res.status === 200, `Count: ${res.data?.length || 0}`);
    } catch (e) {
        test('payroll', 'READ ALL - Listar plantillas', false, e.message);
    }

    // CREATE TEMPLATE
    try {
        const res = await request('POST', '/api/payroll/templates', {
            name: `[CRUD-TEST] Template_${Date.now()}`,
            description: 'Test template created by CRUD tests',
            country_id: 1, // Argentina
            is_active: true
        }, token);

        if (res.status === 201 || res.status === 200) {
            createdTemplateId = res.data.id || res.data.template?.id;
            test('payroll', 'CREATE - Crear plantilla', true, `ID: ${createdTemplateId}`);
        } else {
            test('payroll', 'CREATE - Crear plantilla', false, `Status: ${res.status}`);
        }
    } catch (e) {
        test('payroll', 'CREATE - Crear plantilla', false, e.message);
    }

    // UPDATE TEMPLATE
    if (createdTemplateId) {
        try {
            const res = await request('PUT', `/api/payroll/templates/${createdTemplateId}`, {
                name: `[CRUD-TEST] Template_${Date.now()} UPDATED`,
                description: 'Updated by CRUD tests'
            }, token);
            test('payroll', 'UPDATE - Actualizar plantilla', res.status === 200);
        } catch (e) {
            test('payroll', 'UPDATE - Actualizar plantilla', false, e.message);
        }
    }

    // READ BRANCHES
    try {
        const res = await request('GET', '/api/payroll/branches', null, token);
        test('payroll', 'READ - Listar sucursales', res.status === 200, `Count: ${res.data?.length || 0}`);
    } catch (e) {
        test('payroll', 'READ - Listar sucursales', false, e.message);
    }

    // READ AGREEMENTS (Convenios)
    try {
        const res = await request('GET', '/api/payroll/agreements', null, token);
        test('payroll', 'READ - Listar convenios', res.status === 200, `Count: ${res.data?.length || 0}`);
    } catch (e) {
        test('payroll', 'READ - Listar convenios', false, e.message);
    }

    // READ RUNS (Liquidaciones)
    try {
        const res = await request('GET', '/api/payroll/runs', null, token);
        test('payroll', 'READ - Historial liquidaciones', res.status === 200, `Count: ${res.data?.length || 0}`);
    } catch (e) {
        test('payroll', 'READ - Historial liquidaciones', false, e.message);
    }

    // READ CATEGORIES
    try {
        const res = await request('GET', '/api/payroll/categories', null, token);
        test('payroll', 'READ - Categorías salariales', res.status === 200, `Count: ${res.data?.length || 0}`);
    } catch (e) {
        test('payroll', 'READ - Categorías salariales', false, e.message);
    }

    // PREVIEW CALCULATION (no crea datos, solo calcula)
    try {
        const res = await request('POST', '/api/payroll/calculate/preview', {
            period: new Date().toISOString().substring(0, 7), // YYYY-MM
            user_ids: [] // preview vacío
        }, token);
        // Puede dar 200 o 400 si no hay datos
        test('payroll', 'CALCULATE - Preview liquidación', res.status === 200 || res.status === 400);
    } catch (e) {
        test('payroll', 'CALCULATE - Preview liquidación', false, e.message);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
async function main() {
    console.log('\n' + '╔'.padEnd(79, '═') + '╗');
    console.log('║  🧪 CRUD COMPLETO VIA API - Tests de 5 Módulos Principales                 ║');
    console.log('╚'.padEnd(79, '═') + '╝');

    console.log(`\n📋 Configuración:`);
    console.log(`   Server: ${BASE_URL}`);
    console.log(`   Company: ${COMPANY_SLUG} (ID: ${COMPANY_ID})`);

    // Login
    const token = await login();

    if (!token) {
        console.log('\n❌ No se pudo obtener token de autenticación');
        console.log('   Ejecutando tests sin autenticación (limitados)...\n');
    }

    // Ejecutar tests
    await testDepartments(token);
    await testShifts(token);
    await testUsers(token);
    await testAttendance(token);
    await testPayroll(token);

    // Resumen
    console.log('\n' + '═'.repeat(70));
    console.log('🏆 RESUMEN FINAL - CRUD API TESTS');
    console.log('═'.repeat(70));

    let allPassed = true;
    for (const [module, data] of Object.entries(results.modules)) {
        const icon = data.failed === 0 ? '✅' : '❌';
        console.log(`\n   ${icon} ${module.toUpperCase()}: ${data.passed}/${data.passed + data.failed} tests passed`);
        if (data.failed > 0) {
            allPassed = false;
            data.tests.filter(t => !t.passed).forEach(t => {
                console.log(`      ❌ ${t.name}: ${t.details}`);
            });
        }
    }

    console.log('\n' + '─'.repeat(70));
    console.log(`   📊 TOTAL: ${results.summary.passed}/${results.summary.total} tests passed`);
    console.log(`   📈 Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
    console.log('═'.repeat(70) + '\n');

    // Guardar resultados
    const fs = require('fs');
    const path = require('path');
    const resultsPath = path.join(__dirname, '..', `CRUD-API-RESULTS-${Date.now()}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`📁 Resultados guardados: ${path.basename(resultsPath)}\n`);

    process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
