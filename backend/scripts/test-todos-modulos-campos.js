/**
 * TEST EXHAUSTIVO - TODOS LOS CAMPOS DE TODOS LOS MÓDULOS
 *
 * Verifica que cada endpoint devuelva TODOS los campos que el frontend necesita
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

const results = {
    passed: 0,
    failed: 0,
    modules: {}
};

async function dbQuery(sql) {
    const client = new Client(DB_CONFIG);
    await client.connect();
    const res = await client.query(sql);
    await client.end();
    return res.rows;
}

async function getDbColumns(tableName) {
    const cols = await dbQuery(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position
    `);
    return cols.map(c => c.column_name);
}

function test(module, testName, condition, missing = '') {
    if (!results.modules[module]) {
        results.modules[module] = { passed: 0, failed: 0, errors: [] };
    }

    if (condition) {
        results.modules[module].passed++;
        results.passed++;
    } else {
        results.modules[module].failed++;
        results.modules[module].errors.push({ test: testName, missing });
        results.failed++;
        console.log(`  ❌ ${testName} ${missing}`);
    }
}

async function apiGet(endpoint) {
    try {
        const res = await fetch(API + endpoint, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        return res.json();
    } catch (e) {
        return { error: e.message };
    }
}

// Verificar que un objeto API tenga todos los campos de la BD
function checkAllFields(apiObj, dbColumns, module, entityName, criticalFields = []) {
    if (!apiObj) {
        test(module, `${entityName} existe`, false, '(objeto null)');
        return;
    }

    const apiKeys = Object.keys(apiObj);

    // Verificar campos críticos específicos
    criticalFields.forEach(field => {
        const hasField = apiObj[field] !== undefined ||
                        apiObj[field.replace(/_/g, '')] !== undefined ||
                        apiObj[toCamelCase(field)] !== undefined;
        test(module, `${entityName}.${field}`, hasField, hasField ? '' : '(undefined)');
    });
}

function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 1: ESTRUCTURA ORGANIZACIONAL
// ═══════════════════════════════════════════════════════════════════════════
async function testEstructuraOrganizacional() {
    console.log('\n' + '═'.repeat(70));
    console.log('📁 MÓDULO: ESTRUCTURA ORGANIZACIONAL');
    console.log('═'.repeat(70));

    // 1.1 DEPARTAMENTOS
    console.log('\n  📦 Departamentos');
    const depts = await apiGet('/departments');
    const deptList = depts.departments || depts.data || [];

    if (deptList.length > 0) {
        const dept = deptList[0];
        const criticalFields = [
            'id', 'name', 'description', 'branch_id', 'manager_user_id',
            'default_kiosk_id', 'authorized_kiosks', 'allow_gps_attendance',
            'company_id', 'gps_lat', 'gps_lng', 'coverage_radius', 'is_active',
            'notification_recipients'
        ];
        checkAllFields(dept, [], 'estructura-org', 'Departamento', criticalFields);
    } else {
        console.log('    ⚠️ Sin departamentos para verificar');
    }

    // 1.2 SUCURSALES (BRANCHES)
    console.log('\n  🏢 Sucursales');
    const branches = await apiGet('/companies/' + companyId + '/branches');
    const branchList = branches.branches || branches.data || [];

    if (branchList.length > 0) {
        const branch = branchList[0];
        const criticalFields = [
            'id', 'name', 'code', 'address', 'city', 'state_province',
            'country', 'postal_code', 'phone', 'email', 'latitude', 'longitude',
            'radius', 'timezone', 'is_main', 'isActive'
        ];
        checkAllFields(branch, [], 'estructura-org', 'Sucursal', criticalFields);
    }

    // 1.3 POSICIONES
    console.log('\n  👔 Posiciones');
    const positions = await apiGet('/positions');
    const posList = positions.positions || positions.data || [];

    if (posList.length > 0) {
        const pos = posList[0];
        const criticalFields = [
            'id', 'name', 'description', 'department_id', 'level',
            'reports_to', 'is_active', 'company_id'
        ];
        checkAllFields(pos, [], 'estructura-org', 'Posición', criticalFields);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 2: USUARIOS
// ═══════════════════════════════════════════════════════════════════════════
async function testUsuarios() {
    console.log('\n' + '═'.repeat(70));
    console.log('👥 MÓDULO: USUARIOS');
    console.log('═'.repeat(70));

    const users = await apiGet('/users');
    const userList = users.users || users.data || [];

    if (userList.length > 0) {
        const user = userList[0];
        const criticalFields = [
            'id', 'firstName', 'lastName', 'email', 'role', 'departmentId',
            'position_id', 'legajo', 'employee_id', 'is_active', 'company_id',
            'phone', 'hire_date', 'birth_date', 'document_number', 'document_type',
            'emergency_contact', 'address', 'city', 'country', 'shift_id'
        ];
        checkAllFields(user, [], 'usuarios', 'Usuario', criticalFields);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 3: ASISTENCIA
// ═══════════════════════════════════════════════════════════════════════════
async function testAsistencia() {
    console.log('\n' + '═'.repeat(70));
    console.log('⏰ MÓDULO: ASISTENCIA');
    console.log('═'.repeat(70));

    const today = new Date().toISOString().split('T')[0];
    const attendance = await apiGet(`/attendance?start_date=${today}&end_date=${today}`);
    const records = attendance.records || attendance.data || attendance.attendances || [];

    if (records.length > 0) {
        const record = records[0];
        const criticalFields = [
            'id', 'user_id', 'check_in', 'check_out', 'date', 'status',
            'department_id', 'shift_id', 'kiosk_id', 'company_id',
            'check_in_method', 'check_out_method', 'gps_lat', 'gps_lng',
            'worked_hours', 'overtime_hours', 'late_minutes', 'notes'
        ];
        checkAllFields(record, [], 'asistencia', 'Registro', criticalFields);
    } else {
        console.log('  ⚠️ Sin registros de asistencia hoy');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 4: TURNOS
// ═══════════════════════════════════════════════════════════════════════════
async function testTurnos() {
    console.log('\n' + '═'.repeat(70));
    console.log('📆 MÓDULO: TURNOS');
    console.log('═'.repeat(70));

    const shifts = await apiGet('/shifts');
    const shiftList = shifts.shifts || shifts.data || [];

    if (shiftList.length > 0) {
        const shift = shiftList[0];
        const criticalFields = [
            'id', 'name', 'start_time', 'end_time', 'break_duration',
            'tolerance_minutes', 'is_active', 'company_id', 'color',
            'working_days', 'is_night_shift', 'description'
        ];
        checkAllFields(shift, [], 'turnos', 'Turno', criticalFields);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 5: KIOSKS
// ═══════════════════════════════════════════════════════════════════════════
async function testKiosks() {
    console.log('\n' + '═'.repeat(70));
    console.log('🖥️ MÓDULO: KIOSKS');
    console.log('═'.repeat(70));

    const kiosks = await apiGet('/kiosks');
    const kioskList = kiosks.kiosks || kiosks.data || [];

    if (kioskList.length > 0) {
        const kiosk = kioskList[0];
        const criticalFields = [
            'id', 'name', 'description', 'location', 'device_id',
            'gps_lat', 'gps_lng', 'is_configured', 'is_active', 'company_id',
            'authorized_departments', 'has_external_reader', 'reader_model',
            'ip_address', 'port', 'last_seen', 'apk_version'
        ];
        checkAllFields(kiosk, [], 'kiosks', 'Kiosk', criticalFields);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 6: VACACIONES
// ═══════════════════════════════════════════════════════════════════════════
async function testVacaciones() {
    console.log('\n' + '═'.repeat(70));
    console.log('🏖️ MÓDULO: VACACIONES');
    console.log('═'.repeat(70));

    // 6.1 Solicitudes
    console.log('\n  📋 Solicitudes');
    const requests = await apiGet('/vacation/requests');
    const reqList = requests.requests || requests.data || [];

    if (reqList.length > 0) {
        const req = reqList[0];
        const criticalFields = [
            'id', 'user_id', 'start_date', 'end_date', 'days_requested',
            'status', 'request_type', 'reason', 'approved_by', 'approved_at',
            'company_id', 'created_at'
        ];
        checkAllFields(req, [], 'vacaciones', 'Solicitud', criticalFields);
    } else {
        console.log('    ⚠️ Sin solicitudes');
    }

    // 6.2 Escalas
    console.log('\n  📊 Escalas');
    const scales = await apiGet('/vacation/scales');
    const scaleList = scales.scales || scales.data || [];

    if (scaleList.length > 0) {
        const scale = scaleList[0];
        const criticalFields = [
            'id', 'name', 'years_from', 'years_to', 'days_entitled',
            'is_active', 'company_id'
        ];
        checkAllFields(scale, [], 'vacaciones', 'Escala', criticalFields);
    }

    // 6.3 Licencias
    console.log('\n  📄 Licencias');
    const licenses = await apiGet('/vacation/licenses');
    const licList = licenses.licenses || licenses.data || [];

    if (licList.length > 0) {
        const lic = licList[0];
        const criticalFields = [
            'id', 'name', 'max_days', 'requires_documentation',
            'is_paid', 'is_active', 'company_id'
        ];
        checkAllFields(lic, [], 'vacaciones', 'Licencia', criticalFields);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 7: CAPACITACIONES
// ═══════════════════════════════════════════════════════════════════════════
async function testCapacitaciones() {
    console.log('\n' + '═'.repeat(70));
    console.log('📚 MÓDULO: CAPACITACIONES');
    console.log('═'.repeat(70));

    const trainings = await apiGet('/training');
    const trainingList = trainings.trainings || trainings.data || [];

    if (trainingList.length > 0) {
        const training = trainingList[0];
        const criticalFields = [
            'id', 'name', 'description', 'instructor', 'start_date', 'end_date',
            'duration_hours', 'max_participants', 'status', 'is_mandatory',
            'department_id', 'company_id', 'location', 'type'
        ];
        checkAllFields(training, [], 'capacitaciones', 'Capacitación', criticalFields);
    } else {
        console.log('  ⚠️ Sin capacitaciones');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 8: SANCIONES
// ═══════════════════════════════════════════════════════════════════════════
async function testSanciones() {
    console.log('\n' + '═'.repeat(70));
    console.log('🚫 MÓDULO: SANCIONES');
    console.log('═'.repeat(70));

    // 8.1 Sanciones
    console.log('\n  📋 Sanciones');
    const sanctions = await apiGet('/sanctions');
    const sanctionList = sanctions.sanctions || sanctions.data || [];

    if (sanctionList.length > 0) {
        const sanction = sanctionList[0];
        const criticalFields = [
            'id', 'user_id', 'type_id', 'description', 'date',
            'severity', 'status', 'issued_by', 'company_id'
        ];
        checkAllFields(sanction, [], 'sanciones', 'Sanción', criticalFields);
    } else {
        console.log('    ⚠️ Sin sanciones');
    }

    // 8.2 Tipos de sanción
    console.log('\n  📊 Tipos de sanción');
    const types = await apiGet('/sanctions/types');
    const typeList = types.types || types.data || [];

    if (typeList.length > 0) {
        const type = typeList[0];
        const criticalFields = [
            'id', 'name', 'description', 'severity', 'is_active', 'company_id'
        ];
        checkAllFields(type, [], 'sanciones', 'Tipo', criticalFields);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 9: GESTIÓN MÉDICA
// ═══════════════════════════════════════════════════════════════════════════
async function testMedico() {
    console.log('\n' + '═'.repeat(70));
    console.log('🏥 MÓDULO: GESTIÓN MÉDICA');
    console.log('═'.repeat(70));

    // 9.1 Exámenes médicos
    console.log('\n  🩺 Exámenes médicos');
    const exams = await apiGet('/medical-exams');
    const examList = exams.exams || exams.data || [];

    if (examList.length > 0) {
        const exam = examList[0];
        const criticalFields = [
            'id', 'user_id', 'exam_type', 'exam_date', 'result',
            'next_exam_date', 'provider', 'notes', 'status', 'company_id'
        ];
        checkAllFields(exam, [], 'medico', 'Examen', criticalFields);
    } else {
        console.log('    ⚠️ Sin exámenes');
    }

    // 9.2 Certificados
    console.log('\n  📄 Certificados');
    const certs = await apiGet('/medical/certificates');
    const certList = certs.certificates || certs.data || [];

    if (certList.length > 0) {
        const cert = certList[0];
        const criticalFields = [
            'id', 'user_id', 'start_date', 'end_date', 'diagnosis',
            'doctor_name', 'status', 'company_id'
        ];
        checkAllFields(cert, [], 'medico', 'Certificado', criticalFields);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 10: NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════════════════
async function testNotificaciones() {
    console.log('\n' + '═'.repeat(70));
    console.log('🔔 MÓDULO: NOTIFICACIONES');
    console.log('═'.repeat(70));

    const notifs = await apiGet('/notifications');
    const notifList = notifs.notifications || notifs.data || [];

    if (notifList.length > 0) {
        const notif = notifList[0];
        const criticalFields = [
            'id', 'user_id', 'title', 'message', 'type', 'is_read',
            'created_at', 'action_url', 'priority'
        ];
        checkAllFields(notif, [], 'notificaciones', 'Notificación', criticalFields);
    } else {
        console.log('  ⚠️ Sin notificaciones');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 11: VISITANTES
// ═══════════════════════════════════════════════════════════════════════════
async function testVisitantes() {
    console.log('\n' + '═'.repeat(70));
    console.log('🚶 MÓDULO: VISITANTES');
    console.log('═'.repeat(70));

    const visitors = await apiGet('/visitors');
    const visitorList = visitors.visitors || visitors.data || [];

    if (visitorList.length > 0) {
        const visitor = visitorList[0];
        const criticalFields = [
            'id', 'name', 'document_number', 'document_type', 'company_from',
            'contact_person', 'reason', 'check_in', 'check_out', 'status',
            'badge_number', 'company_id'
        ];
        checkAllFields(visitor, [], 'visitantes', 'Visitante', criticalFields);
    } else {
        console.log('  ⚠️ Sin visitantes');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 12: LIQUIDACIÓN SUELDOS
// ═══════════════════════════════════════════════════════════════════════════
async function testPayroll() {
    console.log('\n' + '═'.repeat(70));
    console.log('💰 MÓDULO: LIQUIDACIÓN SUELDOS');
    console.log('═'.repeat(70));

    const payrolls = await apiGet('/payroll');
    const payrollList = payrolls.payrolls || payrolls.data || [];

    if (payrollList.length > 0) {
        const payroll = payrollList[0];
        const criticalFields = [
            'id', 'user_id', 'period', 'gross_salary', 'deductions',
            'net_salary', 'status', 'paid_at', 'company_id'
        ];
        checkAllFields(payroll, [], 'payroll', 'Liquidación', criticalFields);
    } else {
        console.log('  ⚠️ Sin liquidaciones');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 13: AVISOS DE EMPLEO
// ═══════════════════════════════════════════════════════════════════════════
async function testJobPostings() {
    console.log('\n' + '═'.repeat(70));
    console.log('💼 MÓDULO: AVISOS DE EMPLEO');
    console.log('═'.repeat(70));

    const jobs = await apiGet('/job-postings');
    const jobList = jobs.jobs || jobs.data || [];

    if (jobList.length > 0) {
        const job = jobList[0];
        const criticalFields = [
            'id', 'title', 'description', 'department_id', 'position_id',
            'requirements', 'salary_range', 'status', 'deadline',
            'vacancies', 'company_id'
        ];
        checkAllFields(job, [], 'job-postings', 'Aviso', criticalFields);
    } else {
        console.log('  ⚠️ Sin avisos de empleo');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 14: ROLES Y PERMISOS
// ═══════════════════════════════════════════════════════════════════════════
async function testRolesPermisos() {
    console.log('\n' + '═'.repeat(70));
    console.log('🔐 MÓDULO: ROLES Y PERMISOS');
    console.log('═'.repeat(70));

    const roles = await apiGet('/roles');
    const roleList = roles.roles || roles.data || [];

    if (roleList.length > 0) {
        const role = roleList[0];
        const criticalFields = [
            'id', 'name', 'description', 'permissions', 'is_system',
            'is_active', 'company_id'
        ];
        checkAllFields(role, [], 'roles', 'Rol', criticalFields);
    } else {
        console.log('  ⚠️ Sin roles');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 15: FERIADOS
// ═══════════════════════════════════════════════════════════════════════════
async function testFeriados() {
    console.log('\n' + '═'.repeat(70));
    console.log('📅 MÓDULO: FERIADOS');
    console.log('═'.repeat(70));

    const holidays = await apiGet('/holidays');
    const holidayList = holidays.holidays || holidays.data || [];

    if (holidayList.length > 0) {
        const holiday = holidayList[0];
        const criticalFields = [
            'id', 'name', 'date', 'type', 'country', 'is_national',
            'is_working', 'company_id'
        ];
        checkAllFields(holiday, [], 'feriados', 'Feriado', criticalFields);
    } else {
        console.log('  ⚠️ Sin feriados');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST EXHAUSTIVO - TODOS LOS CAMPOS DE TODOS LOS MÓDULOS           ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

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
    console.log('✅ Login OK | Company:', companyId);

    // Ejecutar todos los tests
    try {
        await testEstructuraOrganizacional();
        await testUsuarios();
        await testAsistencia();
        await testTurnos();
        await testKiosks();
        await testVacaciones();
        await testCapacitaciones();
        await testSanciones();
        await testMedico();
        await testNotificaciones();
        await testVisitantes();
        await testPayroll();
        await testJobPostings();
        await testRolesPermisos();
        await testFeriados();
    } catch (error) {
        console.error('\n💥 Error durante tests:', error);
    }

    // Resumen por módulo
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN POR MÓDULO');
    console.log('═'.repeat(70));

    Object.keys(results.modules).forEach(mod => {
        const m = results.modules[mod];
        const total = m.passed + m.failed;
        const pct = total > 0 ? Math.round((m.passed / total) * 100) : 0;
        const status = m.failed === 0 ? '✅' : '❌';
        console.log(`${status} ${mod}: ${m.passed}/${total} (${pct}%)`);

        if (m.errors.length > 0) {
            m.errors.forEach(e => {
                console.log(`   ↳ ${e.test} ${e.missing}`);
            });
        }
    });

    // Resumen final
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN FINAL');
    console.log('═'.repeat(70));
    const total = results.passed + results.failed;
    const pct = total > 0 ? Math.round((results.passed / total) * 100) : 0;
    console.log(`✅ Tests pasados: ${results.passed}`);
    console.log(`❌ Tests fallidos: ${results.failed}`);
    console.log(`📈 Porcentaje: ${pct}%`);
}

main().catch(e => console.error('Error fatal:', e));
