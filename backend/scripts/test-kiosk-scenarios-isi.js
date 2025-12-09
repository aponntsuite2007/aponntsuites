#!/usr/bin/env node
/**
 * TEST KIOSK SCENARIOS - EMPRESA ISI (ID=11)
 * ==========================================
 * Simula diferentes escenarios de kiosk para testing:
 * - Llegadas a tiempo
 * - Llegadas tarde (requieren autorización)
 * - Autorización de llegadas tarde
 * - Notificaciones generadas
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';
const pool = new Pool({ connectionString: DB_URL });

const COMPANY_ID = 11;

async function main() {
    console.log('========================================');
    console.log('  TEST KIOSK SCENARIOS - ISI (ID=11)');
    console.log('========================================\n');

    try {
        // 1. Obtener datos base
        const { users, kiosks, shifts, supervisors } = await getBaseData();
        console.log('Datos cargados:');
        console.log(`  - Usuarios: ${users.length}`);
        console.log(`  - Kioscos: ${kiosks.length}`);
        console.log(`  - Turnos: ${shifts.length}`);
        console.log(`  - Supervisores: ${supervisors.length}\n`);

        if (kiosks.length === 0 || shifts.length === 0) {
            throw new Error('No hay kioscos o turnos configurados');
        }

        // 2. Simular llegadas a tiempo
        console.log('=== ESCENARIO 1: LLEGADAS A TIEMPO ===');
        const onTimeResults = await simulateOnTimeArrivals(users.slice(0, 5), kiosks[0], shifts[0]);
        console.log(`   ${onTimeResults.success} registros exitosos\n`);

        // 3. Simular llegadas tarde (sin autorización previa)
        console.log('=== ESCENARIO 2: LLEGADAS TARDE SIN AUTORIZACIÓN ===');
        const lateResults = await simulateLateArrivals(users.slice(5, 10), kiosks[0], shifts[0]);
        console.log(`   ${lateResults.pending} pendientes de autorización\n`);

        // 4. Verificar notificaciones generadas
        console.log('=== ESCENARIO 3: VERIFICAR NOTIFICACIONES ===');
        const notifications = await checkNotifications();
        console.log(`   ${notifications.total} notificaciones encontradas`);
        console.log(`   - Llegadas tarde: ${notifications.lateArrivals}`);
        console.log(`   - Pendientes: ${notifications.pending}\n`);

        // 5. Simular autorización de llegada tarde
        console.log('=== ESCENARIO 4: AUTORIZAR LLEGADA TARDE ===');
        if (lateResults.pendingIds.length > 0 && supervisors.length > 0) {
            const authResult = await authorizeLateArrival(
                lateResults.pendingIds[0],
                supervisors[0].user_id
            );
            console.log(`   Autorización: ${authResult.success ? 'OK' : 'FALLIDA'}\n`);
        } else {
            console.log('   No hay llegadas pendientes o supervisores\n');
        }

        // 6. Estadísticas finales
        console.log('=== ESTADÍSTICAS FINALES ===');
        const stats = await getFinalStats();
        console.log(`   Asistencias hoy: ${stats.attendancesToday}`);
        console.log(`   Llegadas tarde pendientes: ${stats.pendingLateArrivals}`);
        console.log(`   Notificaciones sin leer: ${stats.unreadNotifications}`);

        console.log('\n========================================');
        console.log('  TESTING COMPLETADO');
        console.log('========================================');

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function getBaseData() {
    // Usuarios activos
    const usersResult = await pool.query(`
        SELECT u.user_id, u."firstName", u."lastName", u.department_id, u.legajo
        FROM users u
        WHERE u.company_id = $1 AND u."isActive" = true
        LIMIT 20
    `, [COMPANY_ID]);

    // Kioscos activos
    const kiosksResult = await pool.query(`
        SELECT id, name, authorized_departments
        FROM kiosks WHERE company_id = $1 AND is_active = true
    `, [COMPANY_ID]);

    // Turnos
    const shiftsResult = await pool.query(`
        SELECT id, name, "startTime", "endTime", "toleranceMinutesEntry"
        FROM shifts WHERE company_id = $1
    `, [COMPANY_ID]);

    // Supervisores (pueden autorizar llegadas tarde)
    const supervisorsResult = await pool.query(`
        SELECT user_id, "firstName", "lastName"
        FROM users
        WHERE company_id = $1 AND can_authorize_late_arrivals = true
        LIMIT 5
    `, [COMPANY_ID]);

    return {
        users: usersResult.rows,
        kiosks: kiosksResult.rows,
        shifts: shiftsResult.rows,
        supervisors: supervisorsResult.rows
    };
}

async function simulateOnTimeArrivals(users, kiosk, shift) {
    let success = 0;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Simular llegada dentro del horario (dentro de tolerancia)
    const shiftStart = shift.startTime.split(':');
    const arrivalTime = new Date(now);
    arrivalTime.setHours(parseInt(shiftStart[0]), parseInt(shiftStart[1]) + 5, 0);

    for (const user of users) {
        try {
            const attendanceId = uuidv4();
            // Usar campos correctos de la tabla attendances (camelCase)
            await pool.query(`
                INSERT INTO attendances (
                    id, "UserId", company_id, date, "checkInTime", kiosk_id, origin_type,
                    status, "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, 'kiosk',
                    'present', NOW(), NOW()
                )
                ON CONFLICT DO NOTHING
            `, [attendanceId, user.user_id, COMPANY_ID, today, arrivalTime, kiosk.id]);
            success++;
            console.log(`   [OK] ${user.firstName} ${user.lastName} - Llegada a tiempo`);
        } catch (e) {
            console.log(`   [ERR] ${user.firstName}: ${e.message}`);
        }
    }

    return { success };
}

async function simulateLateArrivals(users, kiosk, shift) {
    let pending = 0;
    const pendingIds = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Simular llegada 30 minutos tarde
    const shiftStart = shift.startTime.split(':');
    const arrivalTime = new Date(now);
    arrivalTime.setHours(parseInt(shiftStart[0]), parseInt(shiftStart[1]) + 30, 0);

    for (const user of users) {
        try {
            const attendanceId = uuidv4();

            // Insertar asistencia con llegada tarde (authorization_status = 'pending')
            await pool.query(`
                INSERT INTO attendances (
                    id, "UserId", company_id, date, "checkInTime", kiosk_id, origin_type,
                    status, authorization_status, notes,
                    "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, 'kiosk',
                    'present', 'pending', 'Llegada 30 minutos tarde',
                    NOW(), NOW()
                )
                ON CONFLICT DO NOTHING
                RETURNING id
            `, [attendanceId, user.user_id, COMPANY_ID, today, arrivalTime, kiosk.id]);

            // Crear notificación de llegada tarde
            await createLateArrivalNotification(user, 30, attendanceId);

            pendingIds.push(attendanceId);
            pending++;
            console.log(`   [TARDE] ${user.firstName} ${user.lastName} - 30min tarde, pendiente autorización`);
        } catch (e) {
            console.log(`   [ERR] ${user.firstName}: ${e.message}`);
        }
    }

    return { pending, pendingIds };
}

async function createLateArrivalNotification(user, lateMinutes, attendanceId) {
    try {
        // Buscar supervisor del departamento
        const supervisorResult = await pool.query(`
            SELECT user_id FROM users
            WHERE company_id = $1
              AND can_authorize_late_arrivals = true
              AND (authorized_departments @> $2::jsonb OR authorized_departments = '[]'::jsonb)
            LIMIT 1
        `, [COMPANY_ID, JSON.stringify([user.department_id])]);

        if (supervisorResult.rows.length > 0) {
            const supervisorId = supervisorResult.rows[0].user_id;

            // Usar estructura correcta de notifications
            await pool.query(`
                INSERT INTO notifications (
                    company_id, module, category, notification_type, priority,
                    recipient_user_id, title, message,
                    related_attendance_id, metadata,
                    created_at
                ) VALUES (
                    $1, 'attendance', 'warning', 'late_arrival_pending', 'high',
                    $2, 'Llegada tarde pendiente de autorización',
                    $3, $4, $5,
                    NOW()
                )
            `, [
                COMPANY_ID,
                supervisorId,
                `${user.firstName} ${user.lastName} llegó ${lateMinutes} minutos tarde y requiere autorización`,
                attendanceId,
                JSON.stringify({
                    employee_id: user.user_id,
                    employee_name: `${user.firstName} ${user.lastName}`,
                    late_minutes: lateMinutes,
                    legajo: user.legajo
                })
            ]);
            console.log(`      > Notificación creada para supervisor`);
        } else {
            console.log(`      > No hay supervisor disponible para autorizar`);
        }
    } catch (e) {
        console.log(`   [NOTIF ERR] ${e.message}`);
    }
}

async function checkNotifications() {
    const result = await pool.query(`
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE notification_type = 'late_arrival_pending') as late_arrivals,
            COUNT(*) FILTER (WHERE is_read = false) as pending
        FROM notifications
        WHERE company_id = $1
          AND created_at > NOW() - INTERVAL '1 day'
    `, [COMPANY_ID]);

    return {
        total: parseInt(result.rows[0].total),
        lateArrivals: parseInt(result.rows[0].late_arrivals),
        pending: parseInt(result.rows[0].pending)
    };
}

async function authorizeLateArrival(attendanceId, supervisorId) {
    try {
        // Actualizar estado de la asistencia
        await pool.query(`
            UPDATE attendances
            SET authorization_status = 'approved',
                authorized_by_user_id = $1,
                authorized_at = NOW(),
                authorization_notes = 'Autorizado via script de testing',
                "updatedAt" = NOW()
            WHERE id = $2
        `, [supervisorId, attendanceId]);

        // Marcar notificación como leída
        await pool.query(`
            UPDATE notifications
            SET is_read = true, read_at = NOW(), read_by = $1
            WHERE related_attendance_id = $2
        `, [supervisorId, attendanceId]);

        return { success: true };
    } catch (e) {
        console.log(`   [AUTH ERR] ${e.message}`);
        return { success: false };
    }
}

async function getFinalStats() {
    const today = new Date().toISOString().split('T')[0];

    const attendances = await pool.query(`
        SELECT COUNT(*) as count FROM attendances
        WHERE company_id = $1 AND date = $2::date
    `, [COMPANY_ID, today]);

    const pendingLate = await pool.query(`
        SELECT COUNT(*) as count FROM attendances
        WHERE company_id = $1 AND authorization_status = 'pending'
    `, [COMPANY_ID]);

    const unreadNotif = await pool.query(`
        SELECT COUNT(*) as count FROM notifications
        WHERE company_id = $1 AND is_read = false
    `, [COMPANY_ID]);

    return {
        attendancesToday: parseInt(attendances.rows[0].count),
        pendingLateArrivals: parseInt(pendingLate.rows[0].count),
        unreadNotifications: parseInt(unreadNotif.rows[0].count)
    };
}

main();
