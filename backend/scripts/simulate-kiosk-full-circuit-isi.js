#!/usr/bin/env node
/**
 * SIMULACION COMPLETA CIRCUITO KIOSK - EMPRESA ISI (ID=11)
 * =========================================================
 * 1. Asigna turnos a usuarios (distribuidos entre los 3 turnos)
 * 2. Asigna sucursal a usuarios
 * 3. Simula deteccion de rostro (bypass biometrico)
 * 4. Ejecuta flujo completo: check-in, validacion turno, notificaciones
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';
const pool = new Pool({ connectionString: DB_URL });

const COMPANY_ID = 11;

async function main() {
    console.log('========================================================');
    console.log('  SIMULACION CIRCUITO COMPLETO KIOSK - ISI (ID=11)');
    console.log('========================================================\n');

    try {
        // 1. Obtener datos base
        const shifts = await getShifts();
        const branch = await getBranch();
        const kiosks = await getKiosks();

        console.log('DATOS BASE:');
        console.log(`  - Turnos: ${shifts.length}`);
        shifts.forEach(s => console.log(`    * ${s.name}: ${s.startTime}-${s.endTime}`));
        console.log(`  - Sucursal: ${branch ? branch.name : 'N/A'}`);
        console.log(`  - Kioscos: ${kiosks.length}\n`);

        // 2. Asignar turnos a usuarios sin turno
        console.log('=== PASO 1: ASIGNAR TURNOS A USUARIOS ===');
        const assignedShifts = await assignShiftsToUsers(shifts);
        console.log(`   ${assignedShifts} usuarios asignados a turnos\n`);

        // 3. Asignar sucursal a usuarios sin sucursal
        if (branch) {
            console.log('=== PASO 2: ASIGNAR SUCURSAL A USUARIOS ===');
            const assignedBranch = await assignBranchToUsers(branch.id);
            console.log(`   ${assignedBranch} usuarios asignados a sucursal ${branch.name}\n`);
        }

        // 4. Verificar cuantos usuarios tienen turno hoy
        console.log('=== PASO 3: VERIFICAR USUARIOS CON TURNO HOY ===');
        const usersWithShiftToday = await getUsersWithShiftToday(shifts);
        console.log(`   ${usersWithShiftToday.length} usuarios tienen turno hoy (ignorando feriados)\n`);

        // 5. Simular deteccion de rostros y check-in para varios usuarios
        console.log('=== PASO 4: SIMULAR DETECCION DE ROSTROS Y CHECK-IN ===');
        const kiosk = kiosks[0]; // Usar kiosko principal

        // Simular 10 check-ins exitosos (dentro de horario)
        console.log('\n--- Llegadas A TIEMPO (dentro de tolerancia) ---');
        const onTimeUsers = usersWithShiftToday.slice(0, 10);
        for (const user of onTimeUsers) {
            await simulateKioskCheckIn(user, kiosk, 'on_time');
        }

        // Simular 5 check-ins tarde (fuera de tolerancia)
        console.log('\n--- Llegadas TARDE (fuera de tolerancia, +30 min) ---');
        const lateUsers = usersWithShiftToday.slice(10, 15);
        for (const user of lateUsers) {
            await simulateKioskCheckIn(user, kiosk, 'late');
        }

        // Simular 3 check-ins muy temprano (antes de tolerancia)
        console.log('\n--- Llegadas TEMPRANO (-60 min antes) ---');
        const earlyUsers = usersWithShiftToday.slice(15, 18);
        for (const user of earlyUsers) {
            await simulateKioskCheckIn(user, kiosk, 'early');
        }

        // 6. Estadisticas finales
        console.log('\n=== ESTADISTICAS FINALES ===');
        const stats = await getFinalStats();
        console.log(`   Asistencias hoy: ${stats.attendancesToday}`);
        console.log(`   Llegadas tarde pendientes: ${stats.pendingLateArrivals}`);
        console.log(`   Notificaciones sin leer: ${stats.unreadNotifications}`);
        console.log(`   Usuarios con turno asignado: ${stats.usersWithShift}`);

        console.log('\n========================================================');
        console.log('  SIMULACION COMPLETADA');
        console.log('========================================================');

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function getShifts() {
    const result = await pool.query(`
        SELECT id, name, "startTime", "endTime", "toleranceMinutesEntry", "toleranceMinutesExit"
        FROM shifts WHERE company_id = $1
    `, [COMPANY_ID]);
    return result.rows;
}

async function getBranch() {
    const result = await pool.query(`
        SELECT id, name FROM branches WHERE company_id = $1 LIMIT 1
    `, [COMPANY_ID]);
    return result.rows[0];
}

async function getKiosks() {
    const result = await pool.query(`
        SELECT id, name, authorized_departments
        FROM kiosks WHERE company_id = $1 AND is_active = true
    `, [COMPANY_ID]);
    return result.rows;
}

async function assignShiftsToUsers(shifts) {
    // Obtener usuarios sin turno asignado
    const usersWithoutShift = await pool.query(`
        SELECT u.user_id, u."firstName", u."lastName"
        FROM users u
        LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
        WHERE u.company_id = $1 AND u."isActive" = true AND usa.id IS NULL
        LIMIT 500
    `, [COMPANY_ID]);

    let assigned = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < usersWithoutShift.rows.length; i++) {
        const user = usersWithoutShift.rows[i];
        const shift = shifts[i % shifts.length]; // Distribuir equitativamente

        try {
            await pool.query(`
                INSERT INTO user_shift_assignments (
                    user_id, shift_id, company_id, join_date, assigned_phase,
                    group_name, is_active, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, 'A', 'Grupo General', true, NOW(), NOW()
                )
                ON CONFLICT DO NOTHING
            `, [user.user_id, shift.id, COMPANY_ID, today]);
            assigned++;

            // También insertar en user_shifts (tabla simple)
            await pool.query(`
                INSERT INTO user_shifts (user_id, shift_id, "createdAt", "updatedAt")
                VALUES ($1, $2, NOW(), NOW())
                ON CONFLICT DO NOTHING
            `, [user.user_id, shift.id]);

        } catch (e) {
            // Ignorar si ya existe
        }
    }

    return assigned;
}

async function assignBranchToUsers(branchId) {
    const result = await pool.query(`
        UPDATE users
        SET default_branch_id = $1
        WHERE company_id = $2
          AND default_branch_id IS NULL
          AND "isActive" = true
        RETURNING user_id
    `, [branchId, COMPANY_ID]);

    return result.rowCount;
}

async function getUsersWithShiftToday(shifts) {
    // Obtener usuarios con turno asignado (sin considerar feriados por ahora)
    const result = await pool.query(`
        SELECT
            u.user_id,
            u."firstName",
            u."lastName",
            u.legajo,
            u.department_id,
            usa.shift_id,
            s.name as shift_name,
            s."startTime",
            s."endTime",
            s."toleranceMinutesEntry"
        FROM users u
        INNER JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
        INNER JOIN shifts s ON usa.shift_id = s.id
        WHERE u.company_id = $1 AND u."isActive" = true
        LIMIT 50
    `, [COMPANY_ID]);

    return result.rows;
}

async function simulateKioskCheckIn(user, kiosk, arrivalType) {
    const attendanceId = uuidv4();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Calcular hora de llegada segun tipo
    const shiftStart = user.startTime.split(':');
    const tolerance = user.toleranceMinutesEntry || 15;
    let checkInTime = new Date(now);
    let isLate = false;
    let lateMinutes = 0;
    let authStatus = null;

    switch (arrivalType) {
        case 'on_time':
            // Dentro de tolerancia: startTime + random(0, tolerance-5) min
            const onTimeOffset = Math.floor(Math.random() * Math.max(tolerance - 5, 1));
            checkInTime.setHours(parseInt(shiftStart[0]), parseInt(shiftStart[1]) + onTimeOffset, 0);
            break;

        case 'late':
            // Fuera de tolerancia: startTime + tolerance + 30 min
            lateMinutes = 30;
            checkInTime.setHours(parseInt(shiftStart[0]), parseInt(shiftStart[1]) + tolerance + lateMinutes, 0);
            isLate = true;
            authStatus = 'pending';
            break;

        case 'early':
            // Muy temprano: startTime - 60 min
            checkInTime.setHours(parseInt(shiftStart[0]), parseInt(shiftStart[1]) - 60, 0);
            break;
    }

    try {
        // Simular deteccion de rostro exitosa (bypass biometrico)
        console.log(`   [FACE OK] ${user.firstName} ${user.lastName} (${user.legajo}) - Turno: ${user.shift_name}`);

        // Verificar si ya tiene asistencia hoy
        const existingAttendance = await pool.query(`
            SELECT id FROM attendances
            WHERE "UserId" = $1 AND date = $2
        `, [user.user_id, today]);

        if (existingAttendance.rows.length > 0) {
            console.log(`      -> Ya tiene asistencia registrada hoy`);
            return;
        }

        // Registrar asistencia
        await pool.query(`
            INSERT INTO attendances (
                id, "UserId", company_id, date, "checkInTime", kiosk_id,
                origin_type, status, authorization_status, notes,
                "createdAt", "updatedAt"
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                'kiosk', 'present', $7, $8,
                NOW(), NOW()
            )
        `, [
            attendanceId,
            user.user_id,
            COMPANY_ID,
            today,
            checkInTime,
            kiosk.id,
            authStatus,
            isLate ? `Llegada ${lateMinutes} minutos tarde` : null
        ]);

        // Si es tarde, crear notificacion
        if (isLate) {
            await createLateNotification(user, lateMinutes, attendanceId);
            console.log(`      -> [TARDE] ${lateMinutes} min - Notificacion enviada a supervisor`);
        } else if (arrivalType === 'early') {
            console.log(`      -> [TEMPRANO] Llegada anticipada registrada`);
        } else {
            console.log(`      -> [OK] Check-in registrado a las ${checkInTime.toTimeString().slice(0,5)}`);
        }

    } catch (e) {
        console.log(`      -> [ERROR] ${e.message}`);
    }
}

async function createLateNotification(user, lateMinutes, attendanceId) {
    // Buscar supervisor
    const supervisorResult = await pool.query(`
        SELECT user_id FROM users
        WHERE company_id = $1 AND can_authorize_late_arrivals = true
        LIMIT 1
    `, [COMPANY_ID]);

    if (supervisorResult.rows.length > 0) {
        const supervisorId = supervisorResult.rows[0].user_id;

        await pool.query(`
            INSERT INTO notifications (
                company_id, module, category, notification_type, priority,
                recipient_user_id, title, message,
                related_attendance_id, metadata, created_at
            ) VALUES (
                $1, 'attendance', 'warning', 'late_arrival_pending', 'high',
                $2, 'Llegada tarde pendiente',
                $3, $4, $5, NOW()
            )
        `, [
            COMPANY_ID,
            supervisorId,
            `${user.firstName} ${user.lastName} (${user.legajo}) llegó ${lateMinutes} min tarde. Turno: ${user.shift_name}`,
            attendanceId,
            JSON.stringify({
                employee_id: user.user_id,
                employee_name: `${user.firstName} ${user.lastName}`,
                legajo: user.legajo,
                late_minutes: lateMinutes,
                shift_name: user.shift_name
            })
        ]);
    }
}

async function getFinalStats() {
    const today = new Date().toISOString().split('T')[0];

    const attendances = await pool.query(`
        SELECT COUNT(*) as count FROM attendances
        WHERE company_id = $1 AND date = $2
    `, [COMPANY_ID, today]);

    const pendingLate = await pool.query(`
        SELECT COUNT(*) as count FROM attendances
        WHERE company_id = $1 AND authorization_status = 'pending'
    `, [COMPANY_ID]);

    const unreadNotif = await pool.query(`
        SELECT COUNT(*) as count FROM notifications
        WHERE company_id = $1 AND is_read = false
    `, [COMPANY_ID]);

    const usersWithShift = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_shift_assignments
        WHERE company_id = $1 AND is_active = true
    `, [COMPANY_ID]);

    return {
        attendancesToday: parseInt(attendances.rows[0].count),
        pendingLateArrivals: parseInt(pendingLate.rows[0].count),
        unreadNotifications: parseInt(unreadNotif.rows[0].count),
        usersWithShift: parseInt(usersWithShift.rows[0].count)
    };
}

main();
