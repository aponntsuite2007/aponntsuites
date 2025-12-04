#!/usr/bin/env node
/**
 * ============================================================================
 * TEST INTEGRACIÓN DIRECTO API: DEPARTAMENTOS → TURNOS → USUARIOS
 * ============================================================================
 *
 * Este test usa directamente las APIs HTTP (sin navegador) para verificar
 * que los datos se graban correctamente en la BD con multi-tenant.
 *
 * @usage node scripts/test-integration-api-direct.js
 * ============================================================================
 */

require('dotenv').config();
const { Pool } = require('pg');
const http = require('http');

// Configuración
const CONFIG = {
    companyId: 11,
    companySlug: 'isi',
    username: 'admin@isi.com',
    password: 'admin123',
    baseUrl: 'http://localhost:9998'
};

// Pool PostgreSQL
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function recordTest(category, name, passed, details = null) {
    results.tests.push({ category, name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
    const icon = passed ? '✅' : '❌';
    console.log(`   ${icon} ${name}${details ? ` - ${details}` : ''}`);
}

async function httpRequest(method, path, body = null, token = null) {
    const url = new URL(path, CONFIG.baseUrl);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json, ok: res.statusCode >= 200 && res.statusCode < 300 });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, ok: false, parseError: e.message });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

async function login() {
    console.log('🔐 Autenticando...');

    const response = await httpRequest('POST', '/api/v1/auth/login', {
        identifier: CONFIG.username,
        password: CONFIG.password,
        companyId: CONFIG.companyId
    });

    if (response.ok && response.data.token) {
        console.log('✅ Autenticación exitosa\n');
        return response.data.token;
    } else {
        throw new Error(`Login fallido: ${JSON.stringify(response.data)}`);
    }
}

async function testCreateDepartments(token) {
    console.log('═'.repeat(60));
    console.log('🏢 PASO 1: CREAR DEPARTAMENTOS');
    console.log('═'.repeat(60));

    const departments = [
        { name: 'Sistemas', description: 'Departamento de TI y Desarrollo', address: 'Piso 3' },
        { name: 'Recursos Humanos', description: 'Gestión del personal', address: 'Piso 1' },
        { name: 'Operaciones', description: 'Área operativa', address: 'Planta Baja' }
    ];

    const createdIds = [];

    for (const dept of departments) {
        console.log(`\n   📋 Creando: ${dept.name}`);

        const response = await httpRequest('POST', '/api/v1/departments', {
            name: dept.name,
            description: dept.description,
            address: dept.address,
            coverageRadius: 100,
            gpsLocation: { lat: -34.603722, lng: -58.381592 },
            allow_gps_attendance: true,
            authorized_kiosks: []
        }, token);

        if (response.ok) {
            const id = response.data?.department?.id || response.data?.id;
            if (id) createdIds.push(id);
            recordTest('DEPARTMENTS', `Crear ${dept.name}`, true, `ID: ${id}`);
        } else {
            recordTest('DEPARTMENTS', `Crear ${dept.name}`, false, response.data?.message || response.data?.error);
        }
    }

    // Verificar en BD
    console.log('\n   📊 Verificando persistencia en BD...');
    const dbResult = await pool.query(
        'SELECT id, name, company_id FROM departments WHERE company_id = $1 ORDER BY id DESC LIMIT 5',
        [CONFIG.companyId]
    );

    console.log(`   📋 Departamentos en BD para empresa ${CONFIG.companyId}: ${dbResult.rows.length}`);
    dbResult.rows.forEach(row => {
        console.log(`      - ID: ${row.id} | ${row.name} | company_id: ${row.company_id}`);
    });

    const persistenceOk = dbResult.rows.length >= departments.length;
    recordTest('DEPARTMENTS', 'Persistencia en BD', persistenceOk, `${dbResult.rows.length} encontrados`);

    return dbResult.rows;
}

async function testCreateShifts(token) {
    console.log('\n═'.repeat(60));
    console.log('⏰ PASO 2: CREAR TURNOS');
    console.log('═'.repeat(60));

    const shifts = [
        { name: 'Turno Mañana', startTime: '08:00', endTime: '16:00', days: [1, 2, 3, 4, 5] },
        { name: 'Turno Tarde', startTime: '14:00', endTime: '22:00', days: [1, 2, 3, 4, 5] },
        { name: 'Turno Noche', startTime: '22:00', endTime: '06:00', days: [0, 1, 2, 3, 4] }
    ];

    const createdIds = [];

    for (const shift of shifts) {
        console.log(`\n   📋 Creando: ${shift.name}`);
        console.log(`      📅 Días laborales: ${shift.days.join(', ')} (0=Dom, 1=Lun...)`);

        const response = await httpRequest('POST', '/api/v1/shifts', {
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            days: shift.days,
            toleranceMinutesEntry: 15,
            toleranceMinutesExit: 15,
            isActive: true,
            shiftType: 'standard'
        }, token);

        if (response.ok) {
            const id = response.data?.shift?.id || response.data?.id;
            if (id) createdIds.push(id);
            recordTest('SHIFTS', `Crear ${shift.name}`, true, `ID: ${id}`);
        } else {
            recordTest('SHIFTS', `Crear ${shift.name}`, false, response.data?.message || response.data?.error);
            console.log(`      ⚠️ Response: ${JSON.stringify(response.data).substring(0, 200)}`);
        }
    }

    // Verificar en BD
    console.log('\n   📊 Verificando persistencia en BD...');
    const dbResult = await pool.query(
        'SELECT id, name, company_id, days FROM shifts WHERE company_id = $1 ORDER BY id DESC LIMIT 5',
        [CONFIG.companyId]
    );

    console.log(`   📋 Turnos en BD para empresa ${CONFIG.companyId}: ${dbResult.rows.length}`);
    dbResult.rows.forEach(row => {
        console.log(`      - ID: ${row.id} | ${row.name} | days: ${JSON.stringify(row.days)}`);
    });

    const persistenceOk = dbResult.rows.length >= shifts.length;
    recordTest('SHIFTS', 'Persistencia en BD', persistenceOk, `${dbResult.rows.length} encontrados`);

    return dbResult.rows;
}

async function testCreateUsers(token, departments, shifts) {
    console.log('\n═'.repeat(60));
    console.log('👥 PASO 3: CREAR USUARIOS CON DEPARTAMENTO Y TURNO');
    console.log('═'.repeat(60));

    if (!departments.length || !shifts.length) {
        console.log('   ⚠️ No hay departamentos o turnos para asignar usuarios');
        recordTest('USERS', 'Crear usuarios', false, 'Sin departamentos/turnos');
        return [];
    }

    const timestamp = Date.now();
    const users = [
        { firstName: 'Juan', lastName: 'Pérez', deptIdx: 0, shiftIdx: 0 },
        { firstName: 'María', lastName: 'González', deptIdx: 1, shiftIdx: 1 },
        { firstName: 'Carlos', lastName: 'López', deptIdx: 2, shiftIdx: 2 }
    ];

    const createdIds = [];

    for (const user of users) {
        const dept = departments[user.deptIdx % departments.length];
        const shift = shifts[user.shiftIdx % shifts.length];
        const email = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}.${timestamp}@test.com`.replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]));
        const legajo = `EMP${timestamp.toString().slice(-6)}${user.deptIdx}`;

        console.log(`\n   📋 Creando: ${user.firstName} ${user.lastName}`);
        console.log(`      🏢 Departamento: ${dept.name} (ID: ${dept.id})`);
        console.log(`      ⏰ Turno: ${shift.name} (ID: ${shift.id})`);

        const response = await httpRequest('POST', '/api/v1/users', {
            firstName: user.firstName,
            lastName: user.lastName,
            email: email,
            employeeId: legajo,
            password: 'Test123456!',
            role: 'employee',
            departmentId: dept.id,
            shiftId: shift.id
        }, token);

        if (response.ok) {
            const id = response.data?.user?.user_id || response.data?.user?.id || response.data?.id;
            if (id) createdIds.push(id);
            recordTest('USERS', `Crear ${user.firstName} ${user.lastName}`, true, `ID: ${id}`);
        } else {
            recordTest('USERS', `Crear ${user.firstName} ${user.lastName}`, false, response.data?.message || response.data?.error);
            console.log(`      ⚠️ Response: ${JSON.stringify(response.data).substring(0, 200)}`);
        }
    }

    // Verificar en BD
    console.log('\n   📊 Verificando persistencia en BD...');
    const dbResult = await pool.query(
        `SELECT user_id, "firstName", "lastName", "departmentId", company_id
         FROM users WHERE company_id = $1 AND role = 'employee' ORDER BY "createdAt" DESC LIMIT 5`,
        [CONFIG.companyId]
    );

    console.log(`   📋 Empleados en BD para empresa ${CONFIG.companyId}: ${dbResult.rows.length}`);
    dbResult.rows.forEach(row => {
        console.log(`      - ${row.firstName} ${row.lastName} | dept: ${row.departmentId}`);
    });

    const persistenceOk = dbResult.rows.length >= users.length;
    recordTest('USERS', 'Persistencia en BD', persistenceOk, `${dbResult.rows.length} encontrados`);

    return dbResult.rows;
}

async function printFinalReport() {
    console.log('\n═'.repeat(60));
    console.log('📊 REPORTE FINAL');
    console.log('═'.repeat(60));

    // Estado final BD
    const [depts, shifts, users] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM departments WHERE company_id = $1', [CONFIG.companyId]),
        pool.query('SELECT COUNT(*) as count FROM shifts WHERE company_id = $1', [CONFIG.companyId]),
        pool.query('SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND role = $2', [CONFIG.companyId, 'employee'])
    ]);

    console.log(`\n   🏢 Empresa ISI (company_id=${CONFIG.companyId}):`);
    console.log(`      📁 Departamentos: ${depts.rows[0].count}`);
    console.log(`      ⏰ Turnos: ${shifts.rows[0].count}`);
    console.log(`      👥 Empleados: ${users.rows[0].count}`);

    console.log('\n   📈 Resultados de tests:');
    console.log(`      ✅ Pasados: ${results.passed}`);
    console.log(`      ❌ Fallidos: ${results.failed}`);
    console.log(`      📊 Total: ${results.passed + results.failed}`);

    if (results.failed > 0) {
        console.log('\n   ⚠️ Tests fallidos:');
        results.tests.filter(t => !t.passed).forEach(t => {
            console.log(`      - [${t.category}] ${t.name}: ${t.details || 'Sin detalles'}`);
        });
    }

    console.log('\n═'.repeat(60));
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST INTEGRACIÓN DIRECTO API                                  ║');
    console.log('║  DEPARTAMENTOS → TURNOS → USUARIOS                             ║');
    console.log('║  Con verificación de persistencia multi-tenant                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    try {
        // 1. Login
        const token = await login();

        // 2. Crear departamentos
        const departments = await testCreateDepartments(token);

        // 3. Crear turnos
        const shifts = await testCreateShifts(token);

        // 4. Crear usuarios
        await testCreateUsers(token, departments, shifts);

        // 5. Reporte final
        await printFinalReport();

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:', error.message);
        if (error.stack) console.error(error.stack);
    } finally {
        await pool.end();
        process.exit(results.failed > 0 ? 1 : 0);
    }
}

main();
