/**
 * STRESS TEST - FULL ECOSYSTEM E2E
 * =================================
 *
 * Prueba de estrés completa del sistema de asistencia biométrico.
 * Simula cientos de usuarios, fichajes, notificaciones y escalamiento.
 *
 * USO: node scripts/stress-test-full-ecosystem.js
 *
 * @version 1.0.0
 * @date 2025-12-16
 */

require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
    // Empresa de prueba
    COMPANY_ID: 11, // ISI - empresa existente
    COMPANY_SLUG: 'isi-ingenieria',

    // Cantidades a generar
    NUM_BRANCHES: 5,           // Sucursales
    NUM_DEPARTMENTS: 8,        // Departamentos
    NUM_SECTORS: 15,           // Sectores
    NUM_SHIFTS: 6,             // Turnos diferentes
    NUM_KIOSKS: 10,            // Kioscos biométricos
    NUM_EMPLOYEES: 150,        // Empleados
    NUM_ATTENDANCES: 1000,     // Fichajes a simular
    NUM_DAYS_HISTORY: 30,      // Días de historial

    // Porcentajes de escenarios
    PCT_LATE_ARRIVALS: 15,     // % llegadas tarde
    PCT_EARLY_DEPARTURES: 10,  // % salidas tempranas
    PCT_OVERTIME: 25,          // % con horas extra
    PCT_OVERTIME_TO_BANK: 50,  // % de HE que van al banco
    PCT_ABSENCES: 5,           // % ausencias
    PCT_PENDING_DECISIONS: 10, // % pendientes de decisión

    // Notificaciones
    CLEAR_NOTIFICATIONS: true,
    TEST_SLA_ESCALATION: true,
    SLA_BREACH_HOURS: 2,       // Horas para simular breach
};

// Pool de conexión
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'attendance_system',
    password: process.env.DB_PASSWORD || 'Aedr15150302',
    port: process.env.DB_PORT || 5432,
});

// ============================================================================
// UTILIDADES
// ============================================================================

const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warn: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    section: (title) => console.log(`\n${'='.repeat(60)}\n🔷 ${title}\n${'='.repeat(60)}`),
    subsection: (title) => console.log(`\n📋 ${title}`),
    progress: (current, total, label) => {
        const pct = Math.round((current / total) * 100);
        const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
        process.stdout.write(`\r   [${bar}] ${pct}% - ${label} (${current}/${total})`);
        if (current === total) console.log();
    }
};

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack) {
    const date = new Date();
    date.setDate(date.getDate() - randomInt(0, daysBack));
    return date;
}

function formatTime(hours, minutes) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function addMinutes(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return formatTime(newH, newM);
}

// ============================================================================
// FASE 1: LIMPIEZA DE DATOS
// ============================================================================

async function cleanTables(client) {
    log.section('FASE 1: LIMPIEZA DE DATOS');

    const tablesToClean = [
        // Notificaciones y SLA
        'notification_sla_records',
        'notification_messages',
        'notification_groups',
        'notifications',

        // Banco de horas
        'hour_bank_transactions',
        'hour_bank_redemption_requests',

        // Asistencias
        'attendances',
        'late_arrival_authorizations',

        // Kioscos
        'kiosk_sessions',

        // Usuarios (excepto admins)
        // 'users', -- No limpiamos usuarios admin

        // Department aliases
        'department_aliases',
    ];

    for (const table of tablesToClean) {
        try {
            // Verificar si la tabla existe
            const exists = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = $1
                )
            `, [table]);

            if (exists.rows[0].exists) {
                if (table === 'users') {
                    // Solo eliminar empleados, no admins
                    await client.query(`DELETE FROM users WHERE company_id = $1 AND role = 'employee'`, [CONFIG.COMPANY_ID]);
                } else if (table === 'attendances') {
                    await client.query(`DELETE FROM attendances WHERE company_id = $1`, [CONFIG.COMPANY_ID]);
                } else if (table === 'notifications' || table === 'notification_groups' || table === 'notification_messages') {
                    await client.query(`DELETE FROM ${table} WHERE company_id = $1`, [CONFIG.COMPANY_ID]);
                } else if (table === 'hour_bank_transactions' || table === 'hour_bank_redemption_requests') {
                    await client.query(`DELETE FROM ${table} WHERE company_id = $1`, [CONFIG.COMPANY_ID]);
                } else if (table === 'department_aliases') {
                    await client.query(`DELETE FROM ${table} WHERE company_id = $1`, [CONFIG.COMPANY_ID]);
                } else {
                    await client.query(`DELETE FROM ${table} WHERE company_id = $1`, [CONFIG.COMPANY_ID]);
                }
                log.success(`Tabla ${table} limpiada`);
            }
        } catch (error) {
            log.warn(`No se pudo limpiar ${table}: ${error.message}`);
        }
    }

    log.success('Limpieza completada');
}

// ============================================================================
// FASE 2: CREAR ESTRUCTURA BASE
// ============================================================================

async function createBranches(client) {
    log.subsection('Creando sucursales...');

    // Usar códigos únicos para evitar conflictos
    const timestamp = Date.now().toString().slice(-6);
    const branches = [
        { name: 'Sede Central Test', code: `CENTRAL-${timestamp}`, city: 'Buenos Aires', country: 'AR' },
        { name: 'Sucursal Norte Test', code: `NORTE-${timestamp}`, city: 'Córdoba', country: 'AR' },
        { name: 'Sucursal Sur Test', code: `SUR-${timestamp}`, city: 'Mendoza', country: 'AR' },
        { name: 'Sucursal Chile Test', code: `CHILE-${timestamp}`, city: 'Santiago', country: 'CL' },
        { name: 'Sucursal Uruguay Test', code: `URUGUAY-${timestamp}`, city: 'Montevideo', country: 'UY' },
    ];

    const createdBranches = [];

    for (const branch of branches) {
        try {
            // Verificar si ya existe con ese código
            const existing = await client.query(
                `SELECT id, name, code FROM branches WHERE code = $1`,
                [branch.code]
            );

            if (existing.rows.length > 0) {
                createdBranches.push(existing.rows[0]);
                continue;
            }

            // Crear nueva sucursal
            const result = await client.query(`
                INSERT INTO branches (id, company_id, name, code, city, "isActive", timezone, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, true, 'America/Argentina/Buenos_Aires', NOW(), NOW())
                RETURNING id, name, code
            `, [uuidv4(), CONFIG.COMPANY_ID, branch.name, branch.code, branch.city]);

            createdBranches.push(result.rows[0]);
        } catch (error) {
            log.warn(`Error creando sucursal ${branch.name}: ${error.message}`);
        }
    }

    // Si no se crearon nuevas, usar la existente
    if (createdBranches.length === 0) {
        const existing = await client.query(
            `SELECT id, name, code FROM branches WHERE company_id = $1 LIMIT 5`,
            [CONFIG.COMPANY_ID]
        );
        createdBranches.push(...existing.rows);
    }

    log.success(`${createdBranches.length} sucursales creadas/verificadas`);
    return createdBranches;
}

async function createDepartments(client, branches) {
    log.subsection('Creando departamentos...');

    // Usar departamentos existentes de la empresa
    const existingDepts = await client.query(`
        SELECT id, name FROM departments WHERE company_id = $1 AND is_active = true
    `, [CONFIG.COMPANY_ID]);

    if (existingDepts.rows.length >= 3) {
        // Marcar RRHH
        const depts = existingDepts.rows.map(d => ({
            ...d,
            isRRHH: d.name.toLowerCase().includes('rrhh') || d.name.toLowerCase().includes('recursos humanos') || d.name.toLowerCase().includes('hr')
        }));

        // Asegurar alias RRHH
        const rrhhDept = depts.find(d => d.isRRHH);
        if (rrhhDept) {
            try {
                await client.query(`
                    INSERT INTO department_aliases (alias, department_id, company_id)
                    VALUES ('RRHH', $1, $2)
                    ON CONFLICT (alias, company_id) DO UPDATE SET department_id = EXCLUDED.department_id
                `, [rrhhDept.id, CONFIG.COMPANY_ID]);
                await client.query(`
                    INSERT INTO department_aliases (alias, department_id, company_id)
                    VALUES ('HR', $1, $2)
                    ON CONFLICT (alias, company_id) DO UPDATE SET department_id = EXCLUDED.department_id
                `, [rrhhDept.id, CONFIG.COMPANY_ID]);
            } catch (e) {}
        }

        log.success(`${depts.length} departamentos existentes encontrados`);
        return depts;
    }

    // Si no hay suficientes, crear nuevos
    const deptNames = [
        { name: 'Recursos Humanos', code: 'RRHH', isRRHH: true },
        { name: 'Sistemas', code: 'IT', isRRHH: false },
        { name: 'Operaciones', code: 'OPS', isRRHH: false },
        { name: 'Producción', code: 'PROD', isRRHH: false },
        { name: 'Ventas', code: 'VTA', isRRHH: false },
        { name: 'Administración', code: 'ADM', isRRHH: false },
    ];

    const createdDepts = [];

    for (const dept of deptNames) {
        try {
            const result = await client.query(`
                INSERT INTO departments (company_id, name, description, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, true, NOW(), NOW())
                ON CONFLICT (company_id, name) DO NOTHING
                RETURNING id, name
            `, [CONFIG.COMPANY_ID, dept.name, `Departamento de ${dept.name}`]);

            if (result.rows.length > 0) {
                createdDepts.push({ ...result.rows[0], code: dept.code, isRRHH: dept.isRRHH });
            } else {
                const existing = await client.query(
                    `SELECT id, name FROM departments WHERE company_id = $1 AND name = $2`,
                    [CONFIG.COMPANY_ID, dept.name]
                );
                if (existing.rows.length > 0) {
                    createdDepts.push({ ...existing.rows[0], code: dept.code, isRRHH: dept.isRRHH });
                }
            }
        } catch (error) {
            log.warn(`Error con departamento ${dept.name}: ${error.message}`);
        }
    }

    log.success(`${createdDepts.length} departamentos creados/verificados`);
    return createdDepts;
}

async function createSectors(client, departments) {
    log.subsection('Creando sectores...');

    const sectorsByDept = {
        'Tecnología': ['Desarrollo', 'Infraestructura', 'Soporte'],
        'Operaciones': ['Producción', 'Mantenimiento', 'Planificación'],
        'Comercial': ['Ventas', 'Marketing', 'Atención al Cliente'],
        'Logística': ['Almacén', 'Distribución', 'Transporte'],
    };

    const createdSectors = [];

    for (const dept of departments) {
        const sectors = sectorsByDept[dept.name] || ['General'];

        for (const sectorName of sectors) {
            try {
                const result = await client.query(`
                    INSERT INTO sectors (company_id, department_id, name, is_active)
                    VALUES ($1, $2, $3, true)
                    ON CONFLICT DO NOTHING
                    RETURNING id, name
                `, [CONFIG.COMPANY_ID, dept.id, sectorName]);

                if (result.rows.length > 0) {
                    createdSectors.push({ ...result.rows[0], departmentId: dept.id });
                }
            } catch (error) {
                // Ignorar si ya existe
            }
        }
    }

    log.success(`${createdSectors.length} sectores creados`);
    return createdSectors;
}

// ============================================================================
// FASE 3: CREAR TURNOS
// ============================================================================

async function createShifts(client) {
    log.subsection('Creando turnos...');

    const shifts = [
        { name: 'Turno Mañana', start: '06:00:00', end: '14:00:00', tolerance: 10 },
        { name: 'Turno Tarde', start: '14:00:00', end: '22:00:00', tolerance: 10 },
        { name: 'Turno Noche', start: '22:00:00', end: '06:00:00', tolerance: 15 },
        { name: 'Horario Oficina', start: '09:00:00', end: '18:00:00', tolerance: 15 },
        { name: 'Horario Flexible', start: '08:00:00', end: '17:00:00', tolerance: 30 },
        { name: 'Turno Partido', start: '08:00:00', end: '12:00:00', tolerance: 10 },
    ];

    const createdShifts = [];

    for (const shift of shifts) {
        try {
            // Verificar si ya existe
            const existing = await client.query(
                `SELECT id, name, "startTime", "endTime", "toleranceMinutes" FROM shifts WHERE company_id = $1 AND name = $2`,
                [CONFIG.COMPANY_ID, shift.name]
            );

            if (existing.rows.length > 0) {
                createdShifts.push(existing.rows[0]);
                continue;
            }

            const result = await client.query(`
                INSERT INTO shifts (id, company_id, name, "startTime", "endTime", "toleranceMinutes", "isActive", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
                RETURNING id, name, "startTime", "endTime", "toleranceMinutes"
            `, [uuidv4(), CONFIG.COMPANY_ID, shift.name, shift.start, shift.end, shift.tolerance]);

            createdShifts.push(result.rows[0]);
        } catch (error) {
            log.warn(`Error creando turno ${shift.name}: ${error.message}`);
        }
    }

    log.success(`${createdShifts.length} turnos creados/verificados`);
    return createdShifts;
}

// ============================================================================
// FASE 4: PLANTILLAS BANCO DE HORAS
// ============================================================================

async function createHourBankTemplates(client, branches) {
    log.subsection('Creando plantillas de banco de horas...');

    // hour_bank_templates usa branch_id como integer (de company_branches)
    // mientras que branches usa UUID. Por ahora usamos plantillas existentes o creamos sin branch.
    const templates = [];

    try {
        // Verificar si ya existen plantillas
        const existing = await client.query(`
            SELECT id, template_name as name, branch_id FROM hour_bank_templates
            WHERE company_id = $1
        `, [CONFIG.COMPANY_ID]);

        if (existing.rows.length > 0) {
            templates.push(...existing.rows);
            log.success(`${templates.length} plantillas de banco de horas existentes`);
            return templates;
        }

        // Crear una plantilla global para la empresa (sin branch_id específico)
        const templateCode = `TPL-GLOBAL-${Date.now()}`;
        const result = await client.query(`
            INSERT INTO hour_bank_templates (
                company_id, country_code, template_code, template_name,
                max_monthly_accrual, max_accumulation_hours,
                conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday,
                expiration_months, expiration_enabled, is_enabled, created_at, updated_at
            )
            VALUES ($1, 'AR', $2, $3, 30, 120, 1.5, 2.25, 3.0, 12, true, true, NOW(), NOW())
            RETURNING id, template_name as name
        `, [CONFIG.COMPANY_ID, templateCode, `Plantilla Global ${CONFIG.COMPANY_SLUG}`]);

        templates.push(result.rows[0]);
    } catch (error) {
        log.warn(`Error creando plantilla: ${error.message}`);
    }

    log.success(`${templates.length} plantillas de banco de horas creadas`);
    return templates;
}

// ============================================================================
// FASE 5: CREAR KIOSCOS
// ============================================================================

async function createKiosks(client, branches) {
    log.subsection('Creando kioscos biométricos...');

    const kiosks = [];

    // Primero obtener kioscos existentes
    const existing = await client.query(`
        SELECT id, name, device_id FROM kiosks WHERE company_id = $1 AND is_active = true
    `, [CONFIG.COMPANY_ID]);

    if (existing.rows.length > 0) {
        kiosks.push(...existing.rows);
        log.success(`${kiosks.length} kioscos existentes encontrados`);
        return kiosks;
    }

    // Si no hay kioscos, crear nuevos
    const timestamp = Date.now();
    for (const branch of branches) {
        for (let i = 1; i <= 2; i++) {
            const kioskName = `Kiosko Test ${branch.code}-${i}-${timestamp}`;
            const deviceId = `KIOSK-${branch.code}-${i}-${timestamp}`;

            try {
                const result = await client.query(`
                    INSERT INTO kiosks (
                        company_id, name, device_id, description, location,
                        is_active, is_configured, last_seen
                    )
                    VALUES ($1, $2, $3, $4, $5, true, true, NOW())
                    RETURNING id, name, device_id
                `, [
                    CONFIG.COMPANY_ID, kioskName, deviceId,
                    `Kiosko biométrico en ${branch.name}`,
                    `Entrada ${i} - ${branch.name}`
                ]);

                kiosks.push({ ...result.rows[0], branchCode: branch.code });
            } catch (error) {
                log.warn(`Error creando kiosko ${kioskName}: ${error.message}`);
            }
        }
    }

    log.success(`${kiosks.length} kioscos creados`);
    return kiosks;
}

// ============================================================================
// FASE 6: CREAR USUARIOS/EMPLEADOS
// ============================================================================

async function createEmployees(client, branches, departments, shifts) {
    log.section('FASE 6: CREANDO EMPLEADOS');

    const firstNames = [
        'Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Diego', 'Sofía',
        'Martín', 'Lucía', 'Gabriel', 'Valentina', 'Nicolás', 'Camila', 'Sebastián',
        'Isabella', 'Matías', 'Emma', 'Santiago', 'Mía', 'Tomás', 'Agustina',
        'Lucas', 'Paula', 'Benjamín', 'Catalina', 'Maximiliano', 'Florencia',
        'Franco', 'Julieta', 'Agustín', 'Antonella', 'Ignacio', 'Micaela'
    ];

    const lastNames = [
        'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández',
        'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera',
        'Gómez', 'Díaz', 'Reyes', 'Morales', 'Jiménez', 'Ruiz',
        'Álvarez', 'Romero', 'Fernández', 'Vargas', 'Castillo', 'Mendoza'
    ];

    const employees = [];
    const rrhhDept = departments.find(d => d.isRRHH);

    // Primero crear usuarios de RRHH para notificaciones
    log.subsection('Creando usuarios RRHH...');
    const timestamp = Date.now();
    for (let i = 0; i < 3; i++) {
        const userId = uuidv4();
        const firstName = randomChoice(firstNames);
        const lastName = randomChoice(lastNames);
        const email = `rrhh${i + 1}_${timestamp}@isi.test`;
        const employeeId = `RRHH-${timestamp}-${String(i + 1).padStart(3, '0')}`;
        const dni = `${20000000 + randomInt(1000000, 9999999)}`;

        try {
            await client.query(`
                INSERT INTO users (
                    user_id, company_id, "firstName", "lastName", email, dni, "employeeId", legajo,
                    role, department_id, branch_id, is_active, password, "createdAt", "updatedAt"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'admin', $8, $9, true, 'hash', NOW(), NOW())
                ON CONFLICT (email) DO NOTHING
            `, [
                userId, CONFIG.COMPANY_ID, firstName, lastName, email, dni, employeeId,
                rrhhDept?.id, branches[0]?.id
            ]);

            employees.push({ userId, firstName, lastName, email, role: 'admin', departmentId: rrhhDept?.id, branchId: branches[0]?.id });
        } catch (error) {
            log.warn(`Error creando RRHH ${email}: ${error.message}`);
        }
    }

    // Configurar destinatarios RRHH
    if (rrhhDept) {
        const rrhhUsers = employees.filter(e => e.role === 'admin');
        const recipients = rrhhUsers.map(u => ({ user_id: u.userId, role: 'primary' }));

        await client.query(`
            UPDATE departments
            SET notification_recipients = $1::jsonb
            WHERE id = $2
        `, [JSON.stringify(recipients), rrhhDept.id]);

        log.success(`Configurados ${rrhhUsers.length} destinatarios RRHH`);
    }

    // Crear empleados regulares
    log.subsection(`Creando ${CONFIG.NUM_EMPLOYEES} empleados...`);

    const nonRRHHDepts = departments.filter(d => !d.isRRHH);
    log.info(`Departamentos disponibles (no RRHH): ${nonRRHHDepts.length}`);
    log.info(`Sucursales disponibles: ${branches.length}`);
    log.info(`Turnos disponibles: ${shifts.length}`);

    for (let i = 0; i < CONFIG.NUM_EMPLOYEES; i++) {
        const userId = uuidv4();
        const firstName = randomChoice(firstNames);
        const lastName = randomChoice(lastNames);
        const email = `emp${String(i + 1).padStart(4, '0')}_${timestamp}@isi.test`;
        const employeeId = `EMP-${timestamp}-${String(i + 1).padStart(4, '0')}`;
        const dni = `${30000000 + timestamp.toString().slice(-6) * 1 + i}`;
        const branch = randomChoice(branches);
        const department = randomChoice(departments.filter(d => !d.isRRHH));
        const shift = randomChoice(shifts);

        try {
            await client.query(`
                INSERT INTO users (
                    user_id, company_id, "firstName", "lastName", email, dni, "employeeId", legajo,
                    role, department_id, branch_id, is_active, password, "createdAt", "updatedAt"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'employee', $8, $9, true, 'hash', NOW(), NOW())
                ON CONFLICT (email) DO NOTHING
            `, [
                userId, CONFIG.COMPANY_ID, firstName, lastName, email, dni, employeeId,
                department?.id, branch?.id
            ]);

            // Asignar turno
            await client.query(`
                INSERT INTO user_shift_assignments (user_id, shift_id, company_id, is_active, join_date, assigned_phase, created_at, updated_at)
                VALUES ($1, $2, $3, true, CURRENT_DATE, 'principal', NOW(), NOW())
                ON CONFLICT DO NOTHING
            `, [userId, shift.id, CONFIG.COMPANY_ID]);

            employees.push({
                userId,
                firstName,
                lastName,
                email,
                employeeId,
                role: 'employee',
                branchId: branch?.id,
                departmentId: department?.id,
                shiftId: shift?.id,
                shift: shift
            });

            log.progress(i + 1, CONFIG.NUM_EMPLOYEES, 'empleados');
        } catch (error) {
            if (i < 5) {
                log.warn(`Error creando empleado ${i}: ${error.message}`);
            }
        }
    }

    log.success(`${employees.length} empleados creados/verificados`);
    return employees;
}

// ============================================================================
// FASE 7: SIMULAR FICHAJES
// ============================================================================

async function simulateAttendances(client, employees, shifts, kiosks) {
    log.section('FASE 7: SIMULANDO FICHAJES');

    const attendances = [];
    const employeesWithShifts = employees.filter(e => e.shift);

    if (employeesWithShifts.length === 0) {
        log.warn('No hay empleados con turnos asignados');
        return attendances;
    }

    log.info(`Simulando ${CONFIG.NUM_ATTENDANCES} fichajes para ${employeesWithShifts.length} empleados...`);

    for (let i = 0; i < CONFIG.NUM_ATTENDANCES; i++) {
        const employee = randomChoice(employeesWithShifts);
        const shift = employee.shift;
        const kiosk = randomChoice(kiosks);
        const date = randomDate(CONFIG.NUM_DAYS_HISTORY);
        const dateStr = date.toISOString().split('T')[0];

        // Determinar escenario
        const scenario = Math.random() * 100;
        let checkIn, checkOut, isLate = false, hasOvertime = false, overtimeHours = 0;
        let overtimeDestination = null, status = 'present';

        const shiftStart = shift.startTime || shift.start_time || '09:00:00';
        const shiftEnd = shift.endTime || shift.end_time || '18:00:00';
        const tolerance = shift.toleranceMinutes || shift.tolerance_minutes || 15;

        if (scenario < CONFIG.PCT_ABSENCES) {
            // Ausencia - no crear fichaje
            continue;
        } else if (scenario < CONFIG.PCT_ABSENCES + CONFIG.PCT_LATE_ARRIVALS) {
            // Llegada tarde
            const lateMinutes = randomInt(tolerance + 1, 60);
            checkIn = addMinutes(shiftStart, lateMinutes);
            checkOut = shiftEnd;
            isLate = true;
            status = 'late';
        } else if (scenario < CONFIG.PCT_ABSENCES + CONFIG.PCT_LATE_ARRIVALS + CONFIG.PCT_OVERTIME) {
            // Con horas extra
            checkIn = shiftStart;
            overtimeHours = randomInt(1, 4);
            checkOut = addMinutes(shiftEnd, overtimeHours * 60);
            hasOvertime = true;

            // Determinar destino de HE
            if (Math.random() * 100 < CONFIG.PCT_PENDING_DECISIONS) {
                overtimeDestination = null; // Pendiente
            } else if (Math.random() * 100 < CONFIG.PCT_OVERTIME_TO_BANK) {
                overtimeDestination = 'bank';
            } else {
                overtimeDestination = 'paid';
            }
        } else if (scenario < CONFIG.PCT_ABSENCES + CONFIG.PCT_LATE_ARRIVALS + CONFIG.PCT_OVERTIME + CONFIG.PCT_EARLY_DEPARTURES) {
            // Salida temprana
            checkIn = shiftStart;
            const earlyMinutes = randomInt(30, 120);
            checkOut = addMinutes(shiftEnd, -earlyMinutes);
        } else {
            // Normal
            checkIn = shiftStart;
            checkOut = shiftEnd;
        }

        try {
            // INSERT con UUID generado (attendances.id es UUID NOT NULL sin default)
            const attendanceId = uuidv4();
            const result = await client.query(`
                INSERT INTO attendances (
                    id, "UserId", company_id, date, "checkInTime", "checkOutTime",
                    overtime_hours, overtime_destination,
                    status, kiosk_id, "BranchId", department_id,
                    "createdAt", "updatedAt"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
                RETURNING id
            `, [
                attendanceId, employee.userId, CONFIG.COMPANY_ID, dateStr,
                `${dateStr} ${checkIn}`, checkOut ? `${dateStr} ${checkOut}` : null,
                overtimeHours, overtimeDestination,
                status, kiosk.id, employee.branchId, employee.departmentId
            ]);

            attendances.push({
                id: result.rows[0]?.id,
                employeeId: employee.userId,
                date: dateStr,
                isLate,
                hasOvertime,
                overtimeHours,
                overtimeDestination
            });

            log.progress(i + 1, CONFIG.NUM_ATTENDANCES, 'fichajes');
        } catch (error) {
            // Log primeros 10 errores para diagnóstico
            if (attendances.length < 10) {
                log.error(`Error creando fichaje ${i}: ${error.message}`);
            }
        }
    }

    log.success(`${attendances.length} fichajes simulados`);

    // Estadísticas
    const stats = {
        total: attendances.length,
        late: attendances.filter(a => a.isLate).length,
        withOvertime: attendances.filter(a => a.hasOvertime).length,
        overtimeToBank: attendances.filter(a => a.overtimeDestination === 'bank').length,
        overtimeToPaid: attendances.filter(a => a.overtimeDestination === 'paid').length,
        overtimePending: attendances.filter(a => a.hasOvertime && !a.overtimeDestination).length,
    };

    log.info(`📊 Estadísticas de fichajes:`);
    log.info(`   - Total: ${stats.total}`);
    log.info(`   - Llegadas tarde: ${stats.late} (${Math.round(stats.late/stats.total*100)}%)`);
    log.info(`   - Con horas extra: ${stats.withOvertime} (${Math.round(stats.withOvertime/stats.total*100)}%)`);
    log.info(`   - HE al banco: ${stats.overtimeToBank}`);
    log.info(`   - HE pagadas: ${stats.overtimeToPaid}`);
    log.info(`   - HE pendientes: ${stats.overtimePending}`);

    return attendances;
}

// ============================================================================
// FASE 8: CREAR TRANSACCIONES DE BANCO DE HORAS
// ============================================================================

async function createHourBankTransactions(client, attendances, employees) {
    log.section('FASE 8: CREANDO TRANSACCIONES DE BANCO DE HORAS');

    const bankAttendances = attendances.filter(a => a.overtimeDestination === 'bank' && a.overtimeHours > 0);
    let created = 0;

    for (const att of bankAttendances) {
        const employee = employees.find(e => e.userId === att.employeeId);
        if (!employee) continue;

        try {
            await client.query(`
                INSERT INTO hour_bank_transactions (
                    company_id, user_id, branch_id, transaction_type,
                    hours_raw, conversion_rate, hours_final,
                    source_type, description, status, created_at, updated_at,
                    attendance_id
                )
                VALUES ($1, $2, $3, 'credit', $4, 1.5, $5, 'overtime', $6, 'approved', NOW(), NOW(), $7)
                ON CONFLICT DO NOTHING
            `, [
                CONFIG.COMPANY_ID, att.employeeId, employee.branchId,
                att.overtimeHours, att.overtimeHours * 1.5,
                `Horas extra ${att.date}`, att.id
            ]);
            created++;
        } catch (error) {
            // Ignorar
        }
    }

    log.success(`${created} transacciones de banco de horas creadas`);
    return created;
}

// ============================================================================
// FASE 9: CREAR NOTIFICACIONES DE PRUEBA
// ============================================================================

async function createTestNotifications(client, employees, attendances) {
    log.section('FASE 9: CREANDO NOTIFICACIONES DE PRUEBA');

    const rrhhEmployees = employees.filter(e => e.role === 'admin');
    const regularEmployees = employees.filter(e => e.role === 'employee');
    const lateAttendances = attendances.filter(a => a.isLate);

    let created = 0;

    // Crear notificaciones de llegadas tarde que requieren aprobación
    log.subsection('Creando notificaciones de llegadas tarde...');

    for (let i = 0; i < Math.min(50, lateAttendances.length); i++) {
        const att = lateAttendances[i];
        const employee = employees.find(e => e.userId === att.employeeId);
        if (!employee) continue;

        const recipient = randomChoice(rrhhEmployees);
        if (!recipient) continue;

        // Crear grupo de notificación
        try {
            const groupResult = await client.query(`
                INSERT INTO notification_groups (
                    company_id, group_type, initiator_type, initiator_id,
                    subject, priority, status, auto_escalate, escalation_chain,
                    created_at
                )
                VALUES ($1, 'late_arrival_authorization', 'employee', $2,
                    $3, 'high', 'open', true, '["supervisor", "rrhh", "gerencia"]',
                    NOW() - INTERVAL '${randomInt(1, 48)} hours')
                RETURNING id
            `, [
                CONFIG.COMPANY_ID, employee.userId,
                `Autorización llegada tarde - ${employee.firstName} ${employee.lastName}`
            ]);

            const groupId = groupResult.rows[0].id;

            // Crear mensaje con deadline (algunos ya vencidos para probar escalamiento)
            const hoursAgo = randomInt(1, 72);
            const deadlineHours = randomInt(2, 24);
            const isOverdue = hoursAgo > deadlineHours;

            await client.query(`
                INSERT INTO notification_messages (
                    group_id, sequence_number,
                    sender_type, sender_id, sender_name,
                    recipient_type, recipient_id, recipient_name,
                    message_type, subject, content,
                    requires_response, deadline_at, sla_breach,
                    channels, company_id, created_at
                )
                VALUES (
                    $1, 1,
                    'employee', $2, $3,
                    'employee', $4, $5,
                    'approval_request', $6, $7,
                    true, NOW() - INTERVAL '${hoursAgo - deadlineHours} hours', $8,
                    '["web", "email"]', $9, NOW() - INTERVAL '${hoursAgo} hours'
                )
            `, [
                groupId,
                employee.userId, `${employee.firstName} ${employee.lastName}`,
                recipient.userId, `${recipient.firstName} ${recipient.lastName}`,
                `Autorización requerida: ${employee.firstName} llegó tarde`,
                `El empleado ${employee.firstName} ${employee.lastName} llegó tarde el ${att.date}. Requiere su autorización.`,
                isOverdue,
                CONFIG.COMPANY_ID
            ]);

            created++;
        } catch (error) {
            // Ignorar
        }
    }

    // Crear notificaciones de decisión de HE pendientes
    log.subsection('Creando notificaciones de decisión de HE...');
    const pendingOvertimeAtt = attendances.filter(a => a.hasOvertime && !a.overtimeDestination);

    for (let i = 0; i < Math.min(30, pendingOvertimeAtt.length); i++) {
        const att = pendingOvertimeAtt[i];
        const employee = employees.find(e => e.userId === att.employeeId);
        if (!employee) continue;

        try {
            const groupResult = await client.query(`
                INSERT INTO notification_groups (
                    company_id, group_type, initiator_type, initiator_id,
                    subject, priority, status, auto_escalate,
                    created_at
                )
                VALUES ($1, 'overtime_decision', 'system', 'hour-bank-service',
                    $2, 'medium', 'open', false,
                    NOW() - INTERVAL '${randomInt(1, 24)} hours')
                RETURNING id
            `, [
                CONFIG.COMPANY_ID,
                `Decisión HE pendiente - ${employee.firstName} ${employee.lastName}`
            ]);

            const groupId = groupResult.rows[0].id;

            await client.query(`
                INSERT INTO notification_messages (
                    group_id, sequence_number,
                    sender_type, sender_id, sender_name,
                    recipient_type, recipient_id, recipient_name,
                    message_type, subject, content,
                    requires_response, channels, company_id, created_at
                )
                VALUES (
                    $1, 1,
                    'system', 'hour-bank-service', 'Sistema Banco de Horas',
                    'employee', $2, $3,
                    'decision_request', $4, $5,
                    true, '["web", "push"]', $6, NOW()
                )
            `, [
                groupId,
                employee.userId, `${employee.firstName} ${employee.lastName}`,
                `¿Qué hacer con tus ${att.overtimeHours} horas extra?`,
                `Tienes ${att.overtimeHours} horas extra del ${att.date}. Elige si deseas cobrarlas o acumularlas en tu banco de horas.`,
                CONFIG.COMPANY_ID
            ]);

            created++;
        } catch (error) {
            // Ignorar
        }
    }

    log.success(`${created} notificaciones de prueba creadas`);
    return created;
}

// ============================================================================
// FASE 10: VALIDACIÓN SSOT
// ============================================================================

async function validateSSOT(client) {
    log.section('FASE 10: VALIDACIÓN SSOT Y CONSISTENCIA DE DATOS');

    const issues = [];

    // 1. Verificar usuarios sin empresa
    const usersWithoutCompany = await client.query(`
        SELECT COUNT(*) as count FROM users WHERE company_id IS NULL
    `);
    if (parseInt(usersWithoutCompany.rows[0].count) > 0) {
        issues.push(`❌ ${usersWithoutCompany.rows[0].count} usuarios sin empresa asignada`);
    }

    // 2. Verificar fichajes sin usuario válido
    const orphanAttendances = await client.query(`
        SELECT COUNT(*) as count FROM attendances a
        LEFT JOIN users u ON a."UserId" = u.user_id
        WHERE u.user_id IS NULL AND a.company_id = $1
    `, [CONFIG.COMPANY_ID]);
    if (parseInt(orphanAttendances.rows[0].count) > 0) {
        issues.push(`❌ ${orphanAttendances.rows[0].count} fichajes sin usuario válido`);
    }

    // 3. Verificar fichajes sin turno asignado
    const attendancesWithoutShift = await client.query(`
        SELECT COUNT(DISTINCT a."UserId") as count FROM attendances a
        LEFT JOIN user_shift_assignments usa ON a."UserId" = usa.user_id AND usa.is_active = true
        WHERE usa.id IS NULL AND a.company_id = $1
    `, [CONFIG.COMPANY_ID]);
    if (parseInt(attendancesWithoutShift.rows[0].count) > 0) {
        issues.push(`⚠️  ${attendancesWithoutShift.rows[0].count} empleados con fichajes pero sin turno asignado`);
    }

    // 4. Verificar transacciones de banco sin usuario válido
    const orphanTransactions = await client.query(`
        SELECT COUNT(*) as count FROM hour_bank_transactions hbt
        LEFT JOIN users u ON hbt.user_id = u.user_id
        WHERE u.user_id IS NULL AND hbt.company_id = $1
    `, [CONFIG.COMPANY_ID]);
    if (parseInt(orphanTransactions.rows[0].count) > 0) {
        issues.push(`❌ ${orphanTransactions.rows[0].count} transacciones de banco sin usuario válido`);
    }

    // 5. Verificar notificaciones sin destinatario válido
    const orphanNotifications = await client.query(`
        SELECT COUNT(*) as count FROM notification_messages nm
        LEFT JOIN users u ON nm.recipient_id::uuid = u.user_id
        WHERE u.user_id IS NULL
          AND nm.recipient_type = 'employee'
          AND nm.company_id = $1
    `, [CONFIG.COMPANY_ID]);
    if (parseInt(orphanNotifications.rows[0].count) > 0) {
        issues.push(`⚠️  ${orphanNotifications.rows[0].count} notificaciones sin destinatario válido`);
    }

    // 6. Verificar departamentos sin manager ni notification_recipients
    const deptsWithoutRecipients = await client.query(`
        SELECT COUNT(*) as count FROM departments
        WHERE company_id = $1
          AND is_active = true
          AND (notification_recipients IS NULL OR notification_recipients = '[]'::jsonb)
          AND manager_user_id IS NULL
    `, [CONFIG.COMPANY_ID]);
    if (parseInt(deptsWithoutRecipients.rows[0].count) > 0) {
        issues.push(`⚠️  ${deptsWithoutRecipients.rows[0].count} departamentos sin destinatarios de notificaciones configurados`);
    }

    // 7. Verificar SLA breaches no escalados
    const unescalatedBreaches = await client.query(`
        SELECT COUNT(*) as count FROM notification_messages
        WHERE sla_breach = true
          AND escalation_status IS NULL
          AND company_id = $1
    `, [CONFIG.COMPANY_ID]);
    if (parseInt(unescalatedBreaches.rows[0].count) > 0) {
        log.info(`📊 ${unescalatedBreaches.rows[0].count} SLA breaches pendientes de escalamiento`);
    }

    // Resumen
    if (issues.length === 0) {
        log.success('✅ No se encontraron problemas de consistencia SSOT');
    } else {
        log.warn(`Se encontraron ${issues.length} problemas:`);
        issues.forEach(issue => console.log(`   ${issue}`));
    }

    // Estadísticas finales
    log.subsection('Estadísticas finales del sistema:');

    const stats = await client.query(`
        SELECT
            (SELECT COUNT(*) FROM users WHERE company_id = $1) as total_users,
            (SELECT COUNT(*) FROM users WHERE company_id = $1 AND role = 'employee') as employees,
            (SELECT COUNT(*) FROM users WHERE company_id = $1 AND role = 'admin') as admins,
            (SELECT COUNT(*) FROM attendances WHERE company_id = $1) as total_attendances,
            (SELECT COUNT(*) FROM attendances WHERE company_id = $1 AND is_late = true) as late_attendances,
            (SELECT COUNT(*) FROM attendances WHERE company_id = $1 AND overtime_hours > 0) as overtime_attendances,
            (SELECT COUNT(*) FROM attendances WHERE company_id = $1 AND overtime_destination = 'bank') as bank_overtime,
            (SELECT COUNT(*) FROM attendances WHERE company_id = $1 AND overtime_destination = 'paid') as paid_overtime,
            (SELECT COUNT(*) FROM attendances WHERE company_id = $1 AND overtime_hours > 0 AND overtime_destination IS NULL) as pending_overtime,
            (SELECT COUNT(*) FROM hour_bank_transactions WHERE company_id = $1) as bank_transactions,
            (SELECT COALESCE(SUM(hours_final), 0) FROM hour_bank_transactions WHERE company_id = $1 AND transaction_type = 'credit') as total_banked_hours,
            (SELECT COUNT(*) FROM notification_groups WHERE company_id = $1) as notification_groups,
            (SELECT COUNT(*) FROM notification_messages WHERE company_id = $1) as notification_messages,
            (SELECT COUNT(*) FROM notification_messages WHERE company_id = $1 AND sla_breach = true) as sla_breaches,
            (SELECT COUNT(*) FROM kiosks WHERE company_id = $1) as kiosks,
            (SELECT COUNT(*) FROM company_branches WHERE company_id = $1) as branches,
            (SELECT COUNT(*) FROM departments WHERE company_id = $1) as departments,
            (SELECT COUNT(*) FROM shifts WHERE company_id = $1) as shifts
    `, [CONFIG.COMPANY_ID]);

    const s = stats.rows[0];

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    RESUMEN DEL SISTEMA                       ║
╠══════════════════════════════════════════════════════════════╣
║  👥 Usuarios totales:          ${String(s.total_users).padStart(6)}                      ║
║     - Empleados:               ${String(s.employees).padStart(6)}                      ║
║     - Administradores:         ${String(s.admins).padStart(6)}                      ║
║                                                              ║
║  📅 Fichajes totales:          ${String(s.total_attendances).padStart(6)}                      ║
║     - Llegadas tarde:          ${String(s.late_attendances).padStart(6)}                      ║
║     - Con horas extra:         ${String(s.overtime_attendances).padStart(6)}                      ║
║     - HE al banco:             ${String(s.bank_overtime).padStart(6)}                      ║
║     - HE pagadas:              ${String(s.paid_overtime).padStart(6)}                      ║
║     - HE pendientes:           ${String(s.pending_overtime).padStart(6)}                      ║
║                                                              ║
║  🏦 Banco de Horas:                                          ║
║     - Transacciones:           ${String(s.bank_transactions).padStart(6)}                      ║
║     - Horas acumuladas:        ${String(parseFloat(s.total_banked_hours).toFixed(1)).padStart(6)}                      ║
║                                                              ║
║  🔔 Notificaciones:                                          ║
║     - Grupos:                  ${String(s.notification_groups).padStart(6)}                      ║
║     - Mensajes:                ${String(s.notification_messages).padStart(6)}                      ║
║     - SLA Breaches:            ${String(s.sla_breaches).padStart(6)}                      ║
║                                                              ║
║  🏢 Infraestructura:                                         ║
║     - Sucursales:              ${String(s.branches).padStart(6)}                      ║
║     - Departamentos:           ${String(s.departments).padStart(6)}                      ║
║     - Turnos:                  ${String(s.shifts).padStart(6)}                      ║
║     - Kioscos:                 ${String(s.kiosks).padStart(6)}                      ║
╚══════════════════════════════════════════════════════════════╝
    `);

    return issues;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🧪 STRESS TEST - ECOSISTEMA COMPLETO E2E                 ║
║                                                              ║
║    Sistema de Asistencia Biométrico                         ║
║    Prueba de estrés integral                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);

    const client = await pool.connect();

    try {
        const startTime = Date.now();

        // Fase 1: Limpieza
        await cleanTables(client);

        // Fase 2: Estructura base
        log.section('FASE 2: ESTRUCTURA BASE');
        const branches = await createBranches(client);
        const departments = await createDepartments(client, branches);
        const sectors = await createSectors(client, departments);

        // Fase 3: Turnos
        log.section('FASE 3: TURNOS');
        const shifts = await createShifts(client);

        // Fase 4: Plantillas banco de horas
        log.section('FASE 4: PLANTILLAS BANCO DE HORAS');
        const templates = await createHourBankTemplates(client, branches);

        // Fase 5: Kioscos
        log.section('FASE 5: KIOSCOS');
        const kiosks = await createKiosks(client, branches);

        // Fase 6: Empleados
        const employees = await createEmployees(client, branches, departments, shifts);

        // Fase 7: Fichajes
        const attendances = await simulateAttendances(client, employees, shifts, kiosks);

        // Fase 8: Transacciones banco de horas
        await createHourBankTransactions(client, attendances, employees);

        // Fase 9: Notificaciones
        await createTestNotifications(client, employees, attendances);

        // Fase 10: Validación
        await validateSSOT(client);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    ✅ STRESS TEST COMPLETADO                                ║
║                                                              ║
║    Duración: ${duration} segundos                               ║
║                                                              ║
║    Para probar el sistema:                                   ║
║    1. Abrir http://localhost:9998/panel-empresa.html        ║
║    2. Login con admin@isi.com                               ║
║    3. Revisar módulos de Asistencia y Banco de Horas        ║
║    4. Verificar notificaciones en Bandeja de Entrada        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);

    } catch (error) {
        log.error(`Error en stress test: ${error.message}`);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar
main().catch(console.error);
