#!/usr/bin/env node
/**
 * ============================================================================
 * TEST INTEGRACIÓN: DEPARTAMENTOS → TURNOS → USUARIOS
 * ============================================================================
 *
 * Este test verifica el flujo completo de creación:
 * 1. Crear departamentos
 * 2. Crear turnos con calendario de días laborales
 * 3. Crear usuarios asignando departamentos y turnos
 * 4. Verificar persistencia de todos los datos
 *
 * @usage node scripts/test-integration-flow.js
 * ============================================================================
 */

require('dotenv').config();
const { chromium } = require('playwright');
const { Pool } = require('pg');
const http = require('http');

// Configuración
const CONFIG = {
    companySlug: 'isi',
    username: 'admin@isi.com',
    password: 'admin123',
    companyId: 11,
    headless: false,
    slowMo: 80,
    timeout: 30000,
    portsToTry: [9998, 9997, 9999, 3000]
};

// Pool PostgreSQL
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

class IntegrationFlowTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = null;
        this.timestamp = Date.now();

        // IDs creados para verificación y cleanup
        this.createdDepartments = [];
        this.createdShifts = [];
        this.createdUsers = [];

        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            tests: []
        };
    }

    recordTest(category, name, passed, details = null) {
        this.results.tests.push({ category, name, passed, details, timestamp: new Date().toISOString() });
        if (passed === true) this.results.passed++;
        else if (passed === false) this.results.failed++;
        else this.results.skipped++;
        const icon = passed === true ? '✅' : passed === false ? '❌' : '⏭️';
        console.log(`   ${icon} ${name}${details ? ` - ${details}` : ''}`);
    }

    async detectServer() {
        console.log('🔍 Detectando servidor...');
        for (const port of CONFIG.portsToTry) {
            try {
                const running = await new Promise((resolve) => {
                    const req = http.request({ hostname: 'localhost', port, path: '/api/v1/health', method: 'GET', timeout: 2000 }, () => resolve(true));
                    req.on('error', () => resolve(false));
                    req.on('timeout', () => { req.destroy(); resolve(false); });
                    req.end();
                });
                if (running) {
                    this.baseUrl = `http://localhost:${port}`;
                    console.log(`✅ Servidor en puerto ${port}\n`);
                    return true;
                }
            } catch (e) {}
        }
        return false;
    }

    async init() {
        console.log('🚀 INICIANDO TEST DE INTEGRACIÓN\n');
        console.log('═'.repeat(60));

        if (!await this.detectServer()) throw new Error('No se encontró servidor');

        this.browser = await chromium.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            args: ['--window-position=0,0', '--window-size=1280,720']
        });

        const context = await this.browser.newContext({ viewport: { width: 1280, height: 720 } });
        this.page = await context.newPage();
        console.log('✅ Browser iniciado\n');
    }

    async login() {
        console.log('🔐 Iniciando sesión...');
        await this.page.goto(`${this.baseUrl}/panel-empresa.html`, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(2000);

        const loginContainer = await this.page.$('#loginContainer');
        if (loginContainer) {
            const companySelect = await this.page.$('#companySelect');
            if (companySelect) {
                await this.page.waitForFunction(() => document.querySelector('#companySelect').options.length > 1, { timeout: 10000 });
                await companySelect.selectOption(CONFIG.companySlug);
                await this.page.waitForTimeout(500);
            }

            await this.page.waitForSelector('#userInput:not([disabled])', { timeout: 10000 });
            await this.page.fill('#userInput', CONFIG.username);
            await this.page.waitForTimeout(500);

            await this.page.waitForSelector('#passwordInput:not([disabled])', { timeout: 10000 });
            await this.page.fill('#passwordInput', CONFIG.password);
            await this.page.waitForTimeout(500);

            const loginBtn = await this.page.$('button[type="submit"], #loginBtn');
            if (loginBtn) await loginBtn.click();
            await this.page.waitForTimeout(4000);
        }
        console.log('✅ Login completado\n');
    }

    // ========================================================================
    // PASO 1: CREAR DEPARTAMENTOS
    // ========================================================================
    async createDepartments() {
        console.log('═'.repeat(60));
        console.log('🏢 PASO 1: CREAR DEPARTAMENTOS');
        console.log('═'.repeat(60));

        // Navegar al módulo departamentos
        await this.page.evaluate(() => {
            if (typeof showModuleContent === 'function') showModuleContent('departments', 'Departamentos');
            else if (typeof showDepartmentsContent === 'function') showDepartmentsContent();
        });
        await this.page.waitForTimeout(3000);

        const departmentsToCreate = [
            { name: 'Sistemas', description: 'Departamento de TI y Desarrollo', address: 'Piso 3' },
            { name: 'Recursos Humanos', description: 'Gestión del personal', address: 'Piso 1' },
            { name: 'Operaciones', description: 'Área operativa', address: 'Planta Baja' }
        ];

        for (const dept of departmentsToCreate) {
            console.log(`\n   📋 Creando departamento: ${dept.name}`);

            // Crear via API directa (más confiable)
            const result = await this.page.evaluate(async (deptData) => {
                try {
                    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                    const apiUrl = window.progressiveAdmin?.getApiUrl('/api/v1/departments') || '/api/v1/departments';

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            name: deptData.name,
                            description: deptData.description,
                            address: deptData.address,
                            coverageRadius: 100,
                            gpsLocation: { lat: -34.603722, lng: -58.381592 },
                            allow_gps_attendance: true,
                            authorized_kiosks: []
                        })
                    });

                    const data = await response.json();
                    return { success: response.ok, data, status: response.status };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }, dept);

            if (result.success) {
                const deptId = result.data?.department?.id || result.data?.id;
                if (deptId) this.createdDepartments.push(deptId);
                this.recordTest('DEPARTMENTS', `Crear ${dept.name}`, true, `ID: ${deptId}`);
            } else {
                this.recordTest('DEPARTMENTS', `Crear ${dept.name}`, false, result.error || result.data?.message);
            }
        }

        // Verificar en BD
        const dbResult = await pool.query('SELECT id, name FROM departments WHERE company_id = $1', [CONFIG.companyId]);
        console.log(`\n   📊 Departamentos en BD: ${dbResult.rows.length}`);
        this.recordTest('DEPARTMENTS', 'Persistencia en BD', dbResult.rows.length >= departmentsToCreate.length);

        console.log('');
    }

    // ========================================================================
    // PASO 2: CREAR TURNOS
    // ========================================================================
    async createShifts() {
        console.log('═'.repeat(60));
        console.log('⏰ PASO 2: CREAR TURNOS');
        console.log('═'.repeat(60));

        // Navegar al módulo turnos
        await this.page.evaluate(() => {
            if (typeof showModuleContent === 'function') showModuleContent('shifts', 'Turnos');
            else if (typeof showShiftsContent === 'function') showShiftsContent();
        });
        await this.page.waitForTimeout(3000);

        const shiftsToCreate = [
            {
                name: 'Turno Mañana',
                startTime: '08:00',
                endTime: '16:00',
                workDays: [1, 2, 3, 4, 5] // Lun-Vie
            },
            {
                name: 'Turno Tarde',
                startTime: '14:00',
                endTime: '22:00',
                workDays: [1, 2, 3, 4, 5]
            },
            {
                name: 'Turno Noche',
                startTime: '22:00',
                endTime: '06:00',
                workDays: [0, 1, 2, 3, 4] // Dom-Jue
            }
        ];

        for (const shift of shiftsToCreate) {
            console.log(`\n   📋 Creando turno: ${shift.name}`);

            const result = await this.page.evaluate(async (shiftData) => {
                try {
                    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                    const apiUrl = window.progressiveAdmin?.getApiUrl('/api/v1/shifts') || '/api/v1/shifts';

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            name: shiftData.name,
                            startTime: shiftData.startTime,
                            endTime: shiftData.endTime,
                            days: shiftData.workDays,
                            toleranceMinutesEntry: 15,
                            toleranceMinutesExit: 15,
                            isActive: true,
                            shiftType: 'standard'
                        })
                    });

                    const data = await response.json();
                    return { success: response.ok, data, status: response.status };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }, shift);

            if (result.success) {
                const shiftId = result.data?.shift?.id || result.data?.id;
                if (shiftId) this.createdShifts.push(shiftId);
                this.recordTest('SHIFTS', `Crear ${shift.name}`, true, `ID: ${shiftId}`);

                // Verificar días laborales
                console.log(`      📅 Días laborales: ${shift.workDays.join(', ')}`);
            } else {
                this.recordTest('SHIFTS', `Crear ${shift.name}`, false, result.error || result.data?.message);
            }
        }

        // Verificar en BD
        const dbResult = await pool.query('SELECT id, name FROM shifts WHERE company_id = $1', [CONFIG.companyId]);
        console.log(`\n   📊 Turnos en BD: ${dbResult.rows.length}`);
        this.recordTest('SHIFTS', 'Persistencia en BD', dbResult.rows.length >= shiftsToCreate.length);

        console.log('');
    }

    // ========================================================================
    // PASO 3: CREAR USUARIOS CON DEPARTAMENTO Y TURNO
    // ========================================================================
    async createUsers() {
        console.log('═'.repeat(60));
        console.log('👥 PASO 3: CREAR USUARIOS CON DEPARTAMENTO Y TURNO');
        console.log('═'.repeat(60));

        // Obtener departamentos y turnos creados
        const depts = await pool.query('SELECT id, name FROM departments WHERE company_id = $1', [CONFIG.companyId]);
        const shifts = await pool.query('SELECT id, name FROM shifts WHERE company_id = $1', [CONFIG.companyId]);

        if (depts.rows.length === 0 || shifts.rows.length === 0) {
            console.log('   ⚠️ No hay departamentos o turnos para asignar');
            this.recordTest('USERS', 'Crear usuarios', null, 'Sin departamentos/turnos');
            return;
        }

        // Navegar al módulo usuarios
        await this.page.evaluate(() => {
            if (typeof showModuleContent === 'function') showModuleContent('users', 'Usuarios');
            else if (typeof showUsersContent === 'function') showUsersContent();
        });
        await this.page.waitForTimeout(3000);

        const usersToCreate = [
            { firstName: 'Juan', lastName: 'Pérez', deptIndex: 0, shiftIndex: 0 },
            { firstName: 'María', lastName: 'González', deptIndex: 1, shiftIndex: 1 },
            { firstName: 'Carlos', lastName: 'López', deptIndex: 2, shiftIndex: 2 }
        ];

        for (const user of usersToCreate) {
            const dept = depts.rows[user.deptIndex % depts.rows.length];
            const shift = shifts.rows[user.shiftIndex % shifts.rows.length];
            const email = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}.${this.timestamp}@test.com`;
            const legajo = `EMP${this.timestamp.toString().slice(-6)}${user.deptIndex}`;

            console.log(`\n   📋 Creando usuario: ${user.firstName} ${user.lastName}`);
            console.log(`      🏢 Departamento: ${dept.name}`);
            console.log(`      ⏰ Turno: ${shift.name}`);

            const result = await this.page.evaluate(async (userData) => {
                try {
                    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                    const apiUrl = window.progressiveAdmin?.getApiUrl('/api/v1/users') || '/api/v1/users';

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            email: userData.email,
                            employeeId: userData.legajo,
                            password: 'Test123456!',
                            role: 'employee',
                            departmentId: userData.deptId,
                            shiftId: userData.shiftId
                        })
                    });

                    const data = await response.json();
                    return { success: response.ok, data, status: response.status };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }, { ...user, email, legajo, deptId: dept.id, shiftId: shift.id });

            if (result.success) {
                const userId = result.data?.user?.user_id || result.data?.user?.id || result.data?.id;
                if (userId) this.createdUsers.push(userId);
                this.recordTest('USERS', `Crear ${user.firstName} ${user.lastName}`, true, `ID: ${userId}`);
            } else {
                this.recordTest('USERS', `Crear ${user.firstName} ${user.lastName}`, false, result.error || result.data?.message);
            }
        }

        // Verificar en BD
        const dbResult = await pool.query(
            'SELECT user_id, "firstName", "lastName", "departmentId" FROM users WHERE company_id = $1 AND role = $2',
            [CONFIG.companyId, 'employee']
        );
        console.log(`\n   📊 Empleados en BD: ${dbResult.rows.length}`);
        this.recordTest('USERS', 'Persistencia en BD', dbResult.rows.length >= usersToCreate.length);

        console.log('');
    }

    // ========================================================================
    // PASO 4: VERIFICAR PERSISTENCIA COMPLETA
    // ========================================================================
    async verifyPersistence() {
        console.log('═'.repeat(60));
        console.log('🔄 PASO 4: VERIFICACIÓN DE PERSISTENCIA');
        console.log('═'.repeat(60));

        // Reload página
        console.log('\n   🔄 Recargando página...');
        await this.page.reload({ waitUntil: 'networkidle' });
        await this.page.waitForTimeout(3000);

        // Re-login si es necesario
        const needsLogin = await this.page.$('#loginContainer:not([style*="display: none"])');
        if (needsLogin) {
            console.log('   🔐 Re-login requerido...');
            await this.login();
        }
        this.recordTest('PERSISTENCE', 'Reload página', true);

        // Verificar departamentos en BD
        const depts = await pool.query('SELECT id, name FROM departments WHERE company_id = $1', [CONFIG.companyId]);
        console.log(`\n   🏢 Departamentos: ${depts.rows.length}`);
        depts.rows.forEach(d => console.log(`      - ${d.name} (ID: ${d.id})`));
        this.recordTest('PERSISTENCE', 'Departamentos persistidos', depts.rows.length > 0, `${depts.rows.length} encontrados`);

        // Verificar turnos en BD
        const shifts = await pool.query('SELECT id, name, start_time, end_time FROM shifts WHERE company_id = $1', [CONFIG.companyId]);
        console.log(`\n   ⏰ Turnos: ${shifts.rows.length}`);
        shifts.rows.forEach(s => console.log(`      - ${s.name} (${s.start_time} - ${s.end_time})`));
        this.recordTest('PERSISTENCE', 'Turnos persistidos', shifts.rows.length > 0, `${shifts.rows.length} encontrados`);

        // Verificar usuarios con sus asignaciones
        const users = await pool.query(`
            SELECT u.user_id, u."firstName", u."lastName", d.name as dept_name
            FROM users u
            LEFT JOIN departments d ON u."departmentId" = d.id
            WHERE u.company_id = $1 AND u.role = 'employee'
        `, [CONFIG.companyId]);
        console.log(`\n   👥 Usuarios (empleados): ${users.rows.length}`);
        users.rows.forEach(u => console.log(`      - ${u.firstName} ${u.lastName} → ${u.dept_name || 'Sin depto'}`));
        this.recordTest('PERSISTENCE', 'Usuarios persistidos', users.rows.length > 0, `${users.rows.length} encontrados`);

        console.log('');
    }

    // ========================================================================
    // REPORTE FINAL
    // ========================================================================
    generateReport() {
        console.log('═'.repeat(60));
        console.log('📊 REPORTE FINAL');
        console.log('═'.repeat(60));
        console.log(`   ✅ Pasados:  ${this.results.passed}`);
        console.log(`   ❌ Fallidos: ${this.results.failed}`);
        console.log(`   ⏭️ Saltados: ${this.results.skipped}`);
        console.log(`   📋 Total:    ${this.results.tests.length}`);
        console.log('');

        const rate = this.results.tests.length > 0 ? ((this.results.passed / this.results.tests.length) * 100).toFixed(1) : 0;
        console.log(`   📈 Tasa de éxito: ${rate}%`);
        console.log('═'.repeat(60));

        if (this.results.failed > 0) {
            console.log('\n❌ TESTS FALLIDOS:');
            this.results.tests.filter(t => t.passed === false).forEach(t => {
                console.log(`   - [${t.category}] ${t.name}: ${t.details || 'Sin detalles'}`);
            });
        }

        return this.results;
    }

    async cleanup() {
        console.log('\n🧹 Cerrando recursos...');
        if (this.browser) await this.browser.close();
        await pool.end();
        console.log('✅ Limpieza completada\n');
    }

    async run() {
        try {
            await this.init();
            await this.login();
            await this.createDepartments();
            await this.createShifts();
            await this.createUsers();
            await this.verifyPersistence();
            return this.generateReport();
        } catch (error) {
            console.error('\n❌ ERROR CRÍTICO:', error.message);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Ejecutar
console.log(`
╔════════════════════════════════════════════════════════════════╗
║  TEST INTEGRACIÓN: DEPARTAMENTOS → TURNOS → USUARIOS          ║
║  Verifica flujo completo con persistencia                       ║
╚════════════════════════════════════════════════════════════════╝
`);

const test = new IntegrationFlowTest();
test.run()
    .then(results => process.exit(results.failed > 0 ? 1 : 0))
    .catch(() => process.exit(1));
