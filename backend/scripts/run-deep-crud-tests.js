/**
 * Tests CRUD Profundos para 5 Módulos Core
 * Users, Departments, Shifts, Attendance, Payroll
 *
 * Ejecutar: node scripts/run-deep-crud-tests.js
 */

require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

const PORT = 9998;
const results = { passed: 0, failed: 0, tests: [] };

function request(method, path, data, token) {
    return new Promise((resolve, reject) => {
        const body = data ? JSON.stringify(data) : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        if (body) headers['Content-Length'] = Buffer.byteLength(body);

        const req = http.request({
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: headers,
            timeout: 10000
        }, (res) => {
            let responseBody = '';
            res.on('data', c => responseBody += c);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseBody });
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        if (body) req.write(body);
        req.end();
    });
}

function logTest(module, operation, success, details) {
    const status = success ? 'PASS' : 'FAIL';
    const symbol = success ? '✅' : '❌';
    console.log('   ' + symbol + ' ' + operation + ': ' + status + (details ? ' - ' + details : ''));
    results.tests.push({ module, operation, success, details });
    if (success) results.passed++; else results.failed++;
}

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log('TESTS CRUD PROFUNDOS - 5 MODULOS CORE');
    console.log('='.repeat(70) + '\n');

    try {
        await sequelize.authenticate();
        console.log('Conexion a PostgreSQL establecida\n');

        // Obtener admin de ISI (company_id = 11)
        const [admins] = await sequelize.query(
            "SELECT user_id, email, role, company_id FROM users WHERE company_id = 11 AND role = 'admin' AND is_active = true LIMIT 1"
        );

        if (admins.length === 0) {
            console.log('ERROR: No se encontro admin de ISI');
            return;
        }

        const admin = admins[0];
        console.log('Admin encontrado: ' + admin.email + '\n');

        // Generar token JWT
        const token = jwt.sign(
            { id: admin.user_id, email: admin.email, role: 'admin', companyId: 11 },
            process.env.JWT_SECRET || 'tu_secreto_jwt_super_seguro_2024',
            { expiresIn: '1h' }
        );

        // Obtener datos necesarios
        const [depts] = await sequelize.query("SELECT id FROM departments WHERE company_id = 11 LIMIT 1");
        const [shifts] = await sequelize.query("SELECT id FROM shifts WHERE company_id = 11 LIMIT 1");
        const deptId = depts[0]?.id;
        const shiftId = shifts[0]?.id;

        // ════════════════════════════════════════════════════════════════════════
        // 1. USERS MODULE
        // ════════════════════════════════════════════════════════════════════════
        console.log('1. USERS MODULE');
        console.log('-'.repeat(60));

        let createdUserId = null;
        const testEmail = 'test-crud-' + Date.now() + '@test.com';

        // CREATE
        try {
            const createRes = await request('POST', '/api/v1/users', {
                firstName: 'TestCRUD',
                lastName: 'User',
                email: testEmail,
                password: 'Test123456!',
                role: 'employee',
                dni: String(Date.now()).substring(5),
                departmentId: deptId
            }, token);

            if (createRes.status === 201 || createRes.status === 200) {
                createdUserId = createRes.data.user?.user_id || createRes.data.user_id || createRes.data.id;
                logTest('users', 'CREATE', true, 'ID: ' + createdUserId);
            } else {
                logTest('users', 'CREATE', false, 'Status: ' + createRes.status + ' - ' + JSON.stringify(createRes.data).substring(0, 100));
            }
        } catch (e) {
            logTest('users', 'CREATE', false, e.message);
        }

        // READ (list)
        try {
            const readRes = await request('GET', '/api/v1/users', null, token);
            if (readRes.status === 200 && (Array.isArray(readRes.data) || readRes.data.users)) {
                const count = Array.isArray(readRes.data) ? readRes.data.length : readRes.data.users?.length || 0;
                logTest('users', 'READ (list)', true, count + ' usuarios');
            } else {
                logTest('users', 'READ (list)', false, 'Status: ' + readRes.status);
            }
        } catch (e) {
            logTest('users', 'READ (list)', false, e.message);
        }

        // READ (single)
        if (createdUserId) {
            try {
                const readOneRes = await request('GET', '/api/v1/users/' + createdUserId, null, token);
                if (readOneRes.status === 200) {
                    logTest('users', 'READ (single)', true);
                } else {
                    logTest('users', 'READ (single)', false, 'Status: ' + readOneRes.status);
                }
            } catch (e) {
                logTest('users', 'READ (single)', false, e.message);
            }
        }

        // UPDATE
        if (createdUserId) {
            try {
                const updateRes = await request('PUT', '/api/v1/users/' + createdUserId, {
                    firstName: 'TestCRUD-Updated'
                }, token);
                if (updateRes.status === 200) {
                    logTest('users', 'UPDATE', true);
                } else {
                    logTest('users', 'UPDATE', false, 'Status: ' + updateRes.status);
                }
            } catch (e) {
                logTest('users', 'UPDATE', false, e.message);
            }
        }

        // DELETE
        if (createdUserId) {
            try {
                const deleteRes = await request('DELETE', '/api/v1/users/' + createdUserId, null, token);
                if (deleteRes.status === 200 || deleteRes.status === 204) {
                    logTest('users', 'DELETE', true);
                } else {
                    logTest('users', 'DELETE', false, 'Status: ' + deleteRes.status);
                }
            } catch (e) {
                logTest('users', 'DELETE', false, e.message);
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // 2. DEPARTMENTS MODULE
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n2. DEPARTMENTS MODULE');
        console.log('-'.repeat(60));

        let createdDeptId = null;

        // CREATE (sin branch_id - debe funcionar ahora)
        try {
            const createRes = await request('POST', '/api/v1/departments', {
                name: 'Test Department ' + Date.now(),
                description: 'Test department for CRUD'
            }, token);

            if (createRes.status === 201 || createRes.status === 200) {
                createdDeptId = createRes.data.department?.id || createRes.data.id;
                logTest('departments', 'CREATE', true, 'ID: ' + createdDeptId);
            } else {
                logTest('departments', 'CREATE', false, 'Status: ' + createRes.status + ' - ' + JSON.stringify(createRes.data).substring(0, 150));
            }
        } catch (e) {
            logTest('departments', 'CREATE', false, e.message);
        }

        // READ (list)
        try {
            const readRes = await request('GET', '/api/v1/departments', null, token);
            if (readRes.status === 200) {
                const count = Array.isArray(readRes.data) ? readRes.data.length : readRes.data.departments?.length || 0;
                logTest('departments', 'READ (list)', true, count + ' departamentos');
            } else {
                logTest('departments', 'READ (list)', false, 'Status: ' + readRes.status);
            }
        } catch (e) {
            logTest('departments', 'READ (list)', false, e.message);
        }

        // READ (single)
        if (createdDeptId) {
            try {
                const readOneRes = await request('GET', '/api/v1/departments/' + createdDeptId, null, token);
                if (readOneRes.status === 200) {
                    logTest('departments', 'READ (single)', true);
                } else {
                    logTest('departments', 'READ (single)', false, 'Status: ' + readOneRes.status);
                }
            } catch (e) {
                logTest('departments', 'READ (single)', false, e.message);
            }
        }

        // UPDATE
        if (createdDeptId) {
            try {
                const updateRes = await request('PUT', '/api/v1/departments/' + createdDeptId, {
                    name: 'Test Department Updated ' + Date.now()
                }, token);
                if (updateRes.status === 200) {
                    logTest('departments', 'UPDATE', true);
                } else {
                    logTest('departments', 'UPDATE', false, 'Status: ' + updateRes.status);
                }
            } catch (e) {
                logTest('departments', 'UPDATE', false, e.message);
            }
        }

        // DELETE
        if (createdDeptId) {
            try {
                const deleteRes = await request('DELETE', '/api/v1/departments/' + createdDeptId, null, token);
                if (deleteRes.status === 200 || deleteRes.status === 204) {
                    logTest('departments', 'DELETE', true);
                } else {
                    logTest('departments', 'DELETE', false, 'Status: ' + deleteRes.status);
                }
            } catch (e) {
                logTest('departments', 'DELETE', false, e.message);
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // 3. SHIFTS MODULE
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n3. SHIFTS MODULE');
        console.log('-'.repeat(60));

        let createdShiftId = null;

        // CREATE
        try {
            const createRes = await request('POST', '/api/v1/shifts', {
                name: 'Test Shift ' + Date.now(),
                startTime: '09:00',
                endTime: '18:00',
                workDays: [1, 2, 3, 4, 5]
            }, token);

            if (createRes.status === 201 || createRes.status === 200) {
                createdShiftId = createRes.data.shift?.id || createRes.data.id;
                logTest('shifts', 'CREATE', true, 'ID: ' + createdShiftId);
            } else {
                logTest('shifts', 'CREATE', false, 'Status: ' + createRes.status + ' - ' + JSON.stringify(createRes.data).substring(0, 100));
            }
        } catch (e) {
            logTest('shifts', 'CREATE', false, e.message);
        }

        // READ (list)
        try {
            const readRes = await request('GET', '/api/v1/shifts', null, token);
            if (readRes.status === 200) {
                const data = readRes.data;
                const count = Array.isArray(data) ? data.length : (data.shifts?.length || data.data?.length || 0);
                logTest('shifts', 'READ (list)', true, count + ' turnos');
            } else {
                logTest('shifts', 'READ (list)', false, 'Status: ' + readRes.status);
            }
        } catch (e) {
            logTest('shifts', 'READ (list)', false, e.message);
        }

        // READ (single)
        if (createdShiftId) {
            try {
                const readOneRes = await request('GET', '/api/v1/shifts/' + createdShiftId, null, token);
                if (readOneRes.status === 200) {
                    logTest('shifts', 'READ (single)', true);
                } else {
                    logTest('shifts', 'READ (single)', false, 'Status: ' + readOneRes.status);
                }
            } catch (e) {
                logTest('shifts', 'READ (single)', false, e.message);
            }
        }

        // UPDATE
        if (createdShiftId) {
            try {
                const updateRes = await request('PUT', '/api/v1/shifts/' + createdShiftId, {
                    name: 'Test Shift Updated'
                }, token);
                if (updateRes.status === 200) {
                    logTest('shifts', 'UPDATE', true);
                } else {
                    logTest('shifts', 'UPDATE', false, 'Status: ' + updateRes.status);
                }
            } catch (e) {
                logTest('shifts', 'UPDATE', false, e.message);
            }
        }

        // DELETE
        if (createdShiftId) {
            try {
                const deleteRes = await request('DELETE', '/api/v1/shifts/' + createdShiftId, null, token);
                if (deleteRes.status === 200 || deleteRes.status === 204) {
                    logTest('shifts', 'DELETE', true);
                } else {
                    logTest('shifts', 'DELETE', false, 'Status: ' + deleteRes.status);
                }
            } catch (e) {
                logTest('shifts', 'DELETE', false, e.message);
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // 4. ATTENDANCE MODULE
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n4. ATTENDANCE MODULE');
        console.log('-'.repeat(60));

        // READ (list) - Attendance generalmente no tiene CREATE via API normal
        try {
            const readRes = await request('GET', '/api/v1/attendance', null, token);
            if (readRes.status === 200) {
                const count = Array.isArray(readRes.data) ? readRes.data.length :
                              (readRes.data.attendances?.length || readRes.data.data?.length || 0);
                logTest('attendance', 'READ (list)', true, count + ' registros');
            } else {
                logTest('attendance', 'READ (list)', false, 'Status: ' + readRes.status);
            }
        } catch (e) {
            logTest('attendance', 'READ (list)', false, e.message);
        }

        // READ con filtros
        try {
            const today = new Date().toISOString().split('T')[0];
            const readRes = await request('GET', '/api/v1/attendance?date=' + today, null, token);
            if (readRes.status === 200) {
                logTest('attendance', 'READ (filtered)', true, 'Filtro por fecha funciona');
            } else {
                logTest('attendance', 'READ (filtered)', false, 'Status: ' + readRes.status);
            }
        } catch (e) {
            logTest('attendance', 'READ (filtered)', false, e.message);
        }

        // Stats endpoint
        try {
            const statsRes = await request('GET', '/api/v1/attendance/stats', null, token);
            if (statsRes.status === 200) {
                logTest('attendance', 'STATS', true);
            } else {
                logTest('attendance', 'STATS', false, 'Status: ' + statsRes.status);
            }
        } catch (e) {
            logTest('attendance', 'STATS', false, e.message);
        }

        // ════════════════════════════════════════════════════════════════════════
        // 5. PAYROLL MODULE
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n5. PAYROLL MODULE');
        console.log('-'.repeat(60));

        // Countries endpoint
        try {
            const countriesRes = await request('GET', '/api/payroll/countries', null, token);
            if (countriesRes.status === 200) {
                const count = Array.isArray(countriesRes.data) ? countriesRes.data.length :
                              (countriesRes.data.countries?.length || 0);
                logTest('payroll', 'GET countries', true, count + ' paises');
            } else {
                logTest('payroll', 'GET countries', false, 'Status: ' + countriesRes.status);
            }
        } catch (e) {
            logTest('payroll', 'GET countries', false, e.message);
        }

        // Runs endpoint (liquidaciones)
        try {
            const runsRes = await request('GET', '/api/payroll/runs', null, token);
            if (runsRes.status === 200) {
                const count = runsRes.data?.data?.length || (Array.isArray(runsRes.data) ? runsRes.data.length : 0);
                logTest('payroll', 'GET runs', true, count + ' liquidaciones');
            } else {
                logTest('payroll', 'GET runs', false, 'Status: ' + runsRes.status);
            }
        } catch (e) {
            logTest('payroll', 'GET runs', false, e.message);
        }

        // Concept-types endpoint
        try {
            const conceptsRes = await request('GET', '/api/payroll/concept-types', null, token);
            if (conceptsRes.status === 200) {
                const count = conceptsRes.data?.data?.length || (Array.isArray(conceptsRes.data) ? conceptsRes.data.length : 0);
                logTest('payroll', 'GET concept-types', true, count + ' tipos');
            } else {
                logTest('payroll', 'GET concept-types', false, 'Status: ' + conceptsRes.status);
            }
        } catch (e) {
            logTest('payroll', 'GET concept-types', false, e.message);
        }

        // ════════════════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n' + '='.repeat(70));
        console.log('RESUMEN FINAL');
        console.log('='.repeat(70));

        const total = results.passed + results.failed;
        const percentage = Math.round((results.passed / total) * 100);

        console.log('\n   Total tests: ' + total);
        console.log('   Passed: ' + results.passed + ' (' + percentage + '%)');
        console.log('   Failed: ' + results.failed);

        // Resumen por módulo
        const byModule = {};
        results.tests.forEach(t => {
            if (!byModule[t.module]) byModule[t.module] = { passed: 0, failed: 0 };
            if (t.success) byModule[t.module].passed++; else byModule[t.module].failed++;
        });

        console.log('\n   Por modulo:');
        Object.keys(byModule).forEach(mod => {
            const m = byModule[mod];
            const modTotal = m.passed + m.failed;
            const modPct = Math.round((m.passed / modTotal) * 100);
            const status = m.failed === 0 ? '✅' : '⚠️';
            console.log('      ' + status + ' ' + mod + ': ' + m.passed + '/' + modTotal + ' (' + modPct + '%)');
        });

        // Listar fallos
        const failures = results.tests.filter(t => !t.success);
        if (failures.length > 0) {
            console.log('\n   Tests fallidos:');
            failures.forEach(f => {
                console.log('      ❌ ' + f.module + ' - ' + f.operation + ': ' + (f.details || 'Sin detalles'));
            });
        }

        console.log('\n');

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

runTests();
