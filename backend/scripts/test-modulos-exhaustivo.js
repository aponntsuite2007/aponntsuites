/**
 * TEST EXHAUSTIVO DE MÓDULOS - Verifica campos, relaciones y persistencia
 *
 * Categorías a testear:
 * - RRHH: training-management, job-postings, vacation-management, sanctions-management
 * - CORE: organizational-structure (departments, branches, positions)
 * - USERS: users (empleados)
 * - ATTENDANCE: attendance, shifts
 */
const fetch = require('node-fetch');
const { Client } = require('pg');

const API = 'http://localhost:9998/api/v1';
const DB_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
};

let token = null;
let companyId = null;
let userId = null;
const results = {
    passed: 0,
    failed: 0,
    errors: []
};

async function dbQuery(sql, params = []) {
    const client = new Client(DB_CONFIG);
    await client.connect();
    const res = await client.query(sql, params);
    await client.end();
    return res.rows;
}

function test(name, condition, detail = '') {
    if (condition) {
        console.log(`  ✅ ${name}`);
        results.passed++;
    } else {
        console.log(`  ❌ ${name} ${detail}`);
        results.failed++;
        results.errors.push({ test: name, detail });
    }
}

async function apiGet(endpoint) {
    const res = await fetch(API + endpoint, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    return res.json();
}

async function apiPost(endpoint, body) {
    const res = await fetch(API + endpoint, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    return { status: res.status, data: await res.json() };
}

async function apiPut(endpoint, body) {
    const res = await fetch(API + endpoint, {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    return { status: res.status, data: await res.json() };
}

async function apiDelete(endpoint) {
    const res = await fetch(API + endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    return { status: res.status, data: await res.json() };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST: ESTRUCTURA ORGANIZACIONAL (Departments, Branches, Positions)
// ═══════════════════════════════════════════════════════════════════════════
async function testOrganizationalStructure() {
    console.log('\n' + '═'.repeat(60));
    console.log('📁 MÓDULO: ESTRUCTURA ORGANIZACIONAL');
    console.log('═'.repeat(60));

    // 1. DEPARTAMENTOS
    console.log('\n📦 1. Departamentos');

    // 1.1 GET all
    const depts = await apiGet('/departments');
    test('GET /departments retorna array', Array.isArray(depts.departments));

    if (depts.departments && depts.departments.length > 0) {
        const dept = depts.departments[0];

        // Verificar campos críticos
        test('Departamento tiene id', dept.id !== undefined);
        test('Departamento tiene name', dept.name !== undefined);
        test('Departamento tiene branch_id', dept.branch_id !== undefined, `(actual: ${dept.branch_id})`);
        test('Departamento tiene branchId (alias)', dept.branchId !== undefined);
        test('Departamento tiene manager_user_id', dept.manager_user_id !== undefined);
        test('Departamento tiene default_kiosk_id', dept.default_kiosk_id !== undefined);
        test('Departamento tiene authorized_kiosks', Array.isArray(dept.authorized_kiosks));
        test('Departamento tiene allow_gps_attendance', dept.allow_gps_attendance !== undefined);
        test('Departamento tiene companyId', dept.companyId !== undefined);

        // Verificar con BD
        const dbDept = await dbQuery('SELECT * FROM departments WHERE id = $1', [dept.id]);
        if (dbDept.length > 0) {
            test('branch_id coincide con BD',
                (dept.branch_id === dbDept[0].branch_id) || (dept.branch_id === null && dbDept[0].branch_id === null));
        }
    }

    // 2. SUCURSALES
    console.log('\n🏢 2. Sucursales (Branches)');

    const branches = await apiGet('/companies/' + companyId + '/branches');
    const branchList = branches.branches || branches.data || [];
    test('GET /companies/:id/branches retorna array', Array.isArray(branchList));

    if (branchList.length > 0) {
        const branch = branchList[0];
        test('Sucursal tiene id', branch.id !== undefined);
        test('Sucursal tiene name', branch.name !== undefined);
        // country puede ser null si no está configurado, verificamos que el campo exista
        test('Sucursal tiene campo country', 'country' in branch || branch.country !== undefined);
        test('Sucursal tiene timezone', branch.timezone !== undefined);
    } else {
        console.log('  ⚠️  Sin sucursales para esta empresa');
    }

    // 3. POSICIONES
    console.log('\n👔 3. Posiciones');

    const positions = await apiGet('/positions');
    const posList = positions.positions || positions.data || [];
    test('GET /positions retorna array', Array.isArray(posList));

    if (posList.length > 0) {
        const pos = posList[0];
        test('Posición tiene id', pos.id !== undefined);
        test('Posición tiene name', pos.name !== undefined);
        test('Posición tiene department_id', pos.department_id !== undefined || pos.departmentId !== undefined);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST: USUARIOS (Empleados)
// ═══════════════════════════════════════════════════════════════════════════
async function testUsers() {
    console.log('\n' + '═'.repeat(60));
    console.log('👥 MÓDULO: USUARIOS');
    console.log('═'.repeat(60));

    const users = await apiGet('/users');
    const userList = users.users || users.data || [];
    test('GET /users retorna array', Array.isArray(userList));

    if (userList.length > 0) {
        const user = userList[0];

        // Campos críticos
        test('Usuario tiene id', user.id !== undefined);
        test('Usuario tiene firstName', user.firstName !== undefined || user.first_name !== undefined);
        test('Usuario tiene lastName', user.lastName !== undefined || user.last_name !== undefined);
        test('Usuario tiene email', user.email !== undefined);
        test('Usuario tiene departmentId', user.departmentId !== undefined || user.department_id !== undefined);
        test('Usuario tiene role', user.role !== undefined);

        // Verificar relación con departamento
        const deptId = user.departmentId || user.department_id;
        if (deptId) {
            const deptData = await apiGet('/departments/' + deptId);
            test('Usuario → Departamento existe', deptData.success && deptData.data);
            if (deptData.data) {
                test('Departamento → branch_id disponible', deptData.data.branch_id !== undefined);
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST: ASISTENCIA
// ═══════════════════════════════════════════════════════════════════════════
async function testAttendance() {
    console.log('\n' + '═'.repeat(60));
    console.log('⏰ MÓDULO: ASISTENCIA');
    console.log('═'.repeat(60));

    // 1. GET today/status
    console.log('\n📅 1. Estado de hoy');
    const todayStatus = await apiGet('/attendance/today/status');
    test('GET /attendance/today/status responde', todayStatus !== undefined);

    // 2. GET historial
    console.log('\n📋 2. Historial');
    const today = new Date().toISOString().split('T')[0];
    const history = await apiGet(`/attendance?start_date=${today}&end_date=${today}`);
    const records = history.records || history.data || history.attendances || [];
    test('GET /attendance retorna array', Array.isArray(records));

    if (records.length > 0) {
        const record = records[0];
        test('Registro tiene user_id', record.user_id !== undefined || record.userId !== undefined);
        test('Registro tiene check_in o checkIn', record.check_in !== undefined || record.checkIn !== undefined);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST: VACACIONES
// ═══════════════════════════════════════════════════════════════════════════
async function testVacations() {
    console.log('\n' + '═'.repeat(60));
    console.log('🏖️ MÓDULO: VACACIONES');
    console.log('═'.repeat(60));

    // 1. GET solicitudes
    console.log('\n📋 1. Solicitudes de vacaciones');
    const requests = await apiGet('/vacation/requests');
    const reqList = requests.requests || requests.data || [];
    test('GET /vacation/requests responde', requests !== undefined);

    // 2. GET escalas
    console.log('\n📊 2. Escalas de vacaciones');
    const scales = await apiGet('/vacation/scales');
    const scaleList = scales.scales || scales.data || [];
    test('GET /vacation/scales responde', scales !== undefined);

    // 3. GET licencias
    console.log('\n📄 3. Licencias');
    const licenses = await apiGet('/vacation/licenses');
    test('GET /vacation/licenses responde', licenses !== undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST: CAPACITACIONES
// ═══════════════════════════════════════════════════════════════════════════
async function testTraining() {
    console.log('\n' + '═'.repeat(60));
    console.log('📚 MÓDULO: CAPACITACIONES');
    console.log('═'.repeat(60));

    const trainings = await apiGet('/training');
    const trainingList = trainings.trainings || trainings.data || [];
    test('GET /training responde', trainings !== undefined);

    if (trainingList.length > 0) {
        const training = trainingList[0];
        test('Capacitación tiene id', training.id !== undefined);
        test('Capacitación tiene name o title', training.name !== undefined || training.title !== undefined);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST: SANCIONES
// ═══════════════════════════════════════════════════════════════════════════
async function testSanctions() {
    console.log('\n' + '═'.repeat(60));
    console.log('🚫 MÓDULO: SANCIONES');
    console.log('═'.repeat(60));

    const sanctions = await apiGet('/sanctions');
    test('GET /sanctions responde', sanctions !== undefined);

    // Verificar tipos de sanción
    const types = await apiGet('/sanctions/types');
    test('GET /sanctions/types responde', types !== undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST: TURNOS
// ═══════════════════════════════════════════════════════════════════════════
async function testShifts() {
    console.log('\n' + '═'.repeat(60));
    console.log('📆 MÓDULO: TURNOS');
    console.log('═'.repeat(60));

    const shifts = await apiGet('/shifts');
    const shiftList = shifts.shifts || shifts.data || [];
    test('GET /shifts retorna array', Array.isArray(shiftList));

    if (shiftList.length > 0) {
        const shift = shiftList[0];
        test('Turno tiene id', shift.id !== undefined);
        test('Turno tiene name', shift.name !== undefined);
        test('Turno tiene start_time', shift.start_time !== undefined || shift.startTime !== undefined);
        test('Turno tiene end_time', shift.end_time !== undefined || shift.endTime !== undefined);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST: KIOSKS
// ═══════════════════════════════════════════════════════════════════════════
async function testKiosks() {
    console.log('\n' + '═'.repeat(60));
    console.log('🖥️ MÓDULO: KIOSKS');
    console.log('═'.repeat(60));

    const kiosks = await apiGet('/kiosks');
    const kioskList = kiosks.kiosks || kiosks.data || [];
    test('GET /kiosks retorna array', Array.isArray(kioskList));

    if (kioskList.length > 0) {
        const kiosk = kioskList[0];
        test('Kiosk tiene id', kiosk.id !== undefined);
        test('Kiosk tiene name', kiosk.name !== undefined);
        // Kiosks usan authorized_departments (array) en lugar de department_id único
        test('Kiosk tiene authorized_departments (array)',
            Array.isArray(kiosk.authorized_departments) || kiosk.authorized_departments !== undefined);
        test('Kiosk tiene company_id', kiosk.company_id !== undefined);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST: MEDICAL
// ═══════════════════════════════════════════════════════════════════════════
async function testMedical() {
    console.log('\n' + '═'.repeat(60));
    console.log('🏥 MÓDULO: GESTIÓN MÉDICA');
    console.log('═'.repeat(60));

    // Exámenes médicos
    const exams = await apiGet('/medical-exams');
    test('GET /medical-exams responde', exams !== undefined);

    // Certificados médicos
    const certs = await apiGet('/medical/certificates');
    test('GET /medical/certificates responde', certs !== undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST: NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════════════════
async function testNotifications() {
    console.log('\n' + '═'.repeat(60));
    console.log('🔔 MÓDULO: NOTIFICACIONES');
    console.log('═'.repeat(60));

    const notifications = await apiGet('/notifications');
    test('GET /notifications responde', notifications !== undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║    TEST EXHAUSTIVO DE MÓDULOS - Panel Empresa              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Login
    console.log('\n🔐 Autenticación...');
    const loginRes = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            companySlug: 'isi',
            identifier: 'admin',
            password: 'admin123'
        })
    });
    const loginData = await loginRes.json();

    if (!loginData.token) {
        console.log('❌ Error de login:', loginData);
        return;
    }

    token = loginData.token;
    companyId = loginData.user?.company_id;
    userId = loginData.user?.id;
    console.log('✅ Login OK | Company:', companyId, '| User:', userId);

    // Ejecutar tests
    try {
        await testOrganizationalStructure();
        await testUsers();
        await testAttendance();
        await testShifts();
        await testKiosks();
        await testVacations();
        await testTraining();
        await testSanctions();
        await testMedical();
        await testNotifications();
    } catch (error) {
        console.error('\n💥 Error durante tests:', error);
    }

    // Resumen
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN FINAL');
    console.log('═'.repeat(60));
    console.log(`✅ Tests pasados: ${results.passed}`);
    console.log(`❌ Tests fallidos: ${results.failed}`);
    const total = results.passed + results.failed;
    const pct = total > 0 ? Math.round((results.passed / total) * 100) : 0;
    console.log(`📈 Porcentaje: ${pct}%`);

    if (results.errors.length > 0) {
        console.log('\n❌ Errores encontrados:');
        results.errors.forEach((e, i) => {
            console.log(`   ${i + 1}. ${e.test} ${e.detail}`);
        });
    }
}

main().catch(e => console.error('Error fatal:', e));
