/**
 * KIOSK TEST BYPASS - Endpoint para testing sin biometria real
 * =============================================================
 * Simula deteccion de rostro exitosa y ejecuta circuito completo
 * con TODAS las validaciones de coherencia:
 * - No cerrar turno sin abrir
 * - No abrir turno ya abierto
 * - Validacion de turno asignado
 * - Validacion de departamento autorizado en kiosk
 * - Control de cooldown entre fichadas
 * - Persistencia completa en BD
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
    const { User, Attendance, Shift, Kiosk, Department, Notification } = db;
    const { Op, Sequelize } = require('sequelize');

    // ================================================================
    // POST /api/kiosk-test/check-in
    // Simula check-in via kiosk (bypass biometrico)
    // ================================================================
    router.post('/check-in', async (req, res) => {
        const {
            kiosk_id,
            user_identifier, // legajo, email o user_id
            company_id,
            simulated_time,      // Opcional: hora simulada ISO para testing
            bypass_cooldown,     // Opcional: ignorar cooldown de 10 min
            force_late_minutes   // Opcional: forzar llegada tarde con X minutos (para testing)
        } = req.body;

        try {
            // 1. VALIDAR KIOSK
            const kiosk = await db.sequelize.query(`
                SELECT id, name, company_id, is_active, authorized_departments
                FROM kiosks WHERE id = :kiosk_id AND is_active = true
            `, {
                replacements: { kiosk_id },
                type: Sequelize.QueryTypes.SELECT
            });

            if (!kiosk || kiosk.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'KIOSK_NOT_FOUND',
                    message: 'Kiosk no encontrado o inactivo'
                });
            }

            const kioskData = kiosk[0];
            if (kioskData.company_id !== company_id) {
                return res.status(403).json({
                    success: false,
                    error: 'KIOSK_WRONG_COMPANY',
                    message: 'Kiosk no pertenece a esta empresa'
                });
            }

            // 2. BUSCAR USUARIO
            const user = await db.sequelize.query(`
                SELECT
                    u.user_id, u."firstName", u."lastName", u.legajo, u.email,
                    u.department_id, u.company_id, u."isActive",
                    u.can_use_kiosk, u.can_use_all_kiosks, u.authorized_kiosks
                FROM users u
                WHERE u.company_id = :company_id
                  AND u."isActive" = true
                  AND (
                      u.user_id::text = :identifier
                      OR u.legajo = :identifier
                      OR u.email = :identifier
                  )
            `, {
                replacements: { company_id, identifier: user_identifier },
                type: Sequelize.QueryTypes.SELECT
            });

            if (!user || user.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: 'Usuario no encontrado o inactivo'
                });
            }

            const userData = user[0];

            // 3. VALIDAR PERMISO DE KIOSK
            if (!userData.can_use_kiosk) {
                return res.status(403).json({
                    success: false,
                    error: 'USER_CANNOT_USE_KIOSK',
                    message: 'Usuario no tiene permiso para usar kiosk'
                });
            }

            // 4. VALIDAR DEPARTAMENTO AUTORIZADO EN KIOSK
            const authorizedDepts = kioskData.authorized_departments || [];
            const userDeptId = parseInt(userData.department_id);
            const authorizedDeptsInt = authorizedDepts.map(d => parseInt(d));
            if (authorizedDeptsInt.length > 0 && !authorizedDeptsInt.includes(userDeptId)) {
                if (!userData.can_use_all_kiosks) {
                    return res.status(403).json({
                        success: false,
                        error: 'DEPARTMENT_NOT_AUTHORIZED',
                        message: `Departamento del usuario no autorizado en este kiosk`,
                        details: {
                            user_department: userDeptId,
                            authorized_departments: authorizedDeptsInt
                        }
                    });
                }
            }

            // 5. OBTENER TURNO ASIGNADO
            const shiftAssignment = await db.sequelize.query(`
                SELECT
                    usa.shift_id, usa.assigned_phase, usa.group_name,
                    s.name as shift_name, s."startTime", s."endTime",
                    s."toleranceMinutesEntry", s."toleranceMinutesExit"
                FROM user_shift_assignments usa
                INNER JOIN shifts s ON usa.shift_id = s.id
                WHERE usa.user_id = :user_id
                  AND usa.is_active = true
                  AND usa.company_id = :company_id
            `, {
                replacements: { user_id: userData.user_id, company_id },
                type: Sequelize.QueryTypes.SELECT
            });

            if (!shiftAssignment || shiftAssignment.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'NO_SHIFT_ASSIGNED',
                    message: 'Usuario no tiene turno asignado'
                });
            }

            const shift = shiftAssignment[0];

            // 6. VERIFICAR COOLDOWN (10 minutos entre fichadas)
            if (!bypass_cooldown) {
                const lastDetection = await db.sequelize.query(`
                    SELECT id, "checkInTime", "checkOutTime"
                    FROM attendances
                    WHERE "UserId" = :user_id
                      AND company_id = :company_id
                      AND (
                          "checkInTime" > NOW() - INTERVAL '10 minutes'
                          OR "checkOutTime" > NOW() - INTERVAL '10 minutes'
                      )
                    ORDER BY "createdAt" DESC LIMIT 1
                `, {
                    replacements: { user_id: userData.user_id, company_id },
                    type: Sequelize.QueryTypes.SELECT
                });

                if (lastDetection && lastDetection.length > 0) {
                    return res.status(429).json({
                        success: false,
                        error: 'COOLDOWN_ACTIVE',
                        message: 'Debe esperar 10 minutos entre fichadas',
                        last_detection: lastDetection[0]
                    });
                }
            }

            // 7. VERIFICAR SI YA TIENE CHECK-IN HOY
            const today = new Date().toISOString().split('T')[0];
            const existingAttendance = await db.sequelize.query(`
                SELECT id, "checkInTime", "checkOutTime", status, authorization_status
                FROM attendances
                WHERE "UserId" = :user_id AND date = :today
            `, {
                replacements: { user_id: userData.user_id, today },
                type: Sequelize.QueryTypes.SELECT
            });

            if (existingAttendance && existingAttendance.length > 0) {
                const existing = existingAttendance[0];

                // Ya tiene check-in Y check-out = turno completo
                if (existing.checkInTime && existing.checkOutTime) {
                    return res.status(400).json({
                        success: false,
                        error: 'SHIFT_ALREADY_COMPLETE',
                        message: 'Turno ya completado hoy (check-in y check-out registrados)',
                        attendance: existing
                    });
                }

                // Ya tiene check-in pero no check-out
                if (existing.checkInTime && !existing.checkOutTime) {
                    return res.status(400).json({
                        success: false,
                        error: 'ALREADY_CHECKED_IN',
                        message: 'Ya tiene check-in registrado. Use /check-out para cerrar turno',
                        attendance: existing
                    });
                }
            }

            // 8. CALCULAR SI LLEGA TARDE
            const now = simulated_time ? new Date(simulated_time) : new Date();
            const checkInTime = now;

            const tolerance = shift.toleranceMinutesEntry || 15;
            let isLate = false;
            let lateMinutes = 0;
            let authorizationStatus = null;

            // MODO TESTING: Si force_late_minutes está seteado, simular llegada tarde directamente
            if (force_late_minutes && parseInt(force_late_minutes) > 0) {
                lateMinutes = parseInt(force_late_minutes);
                isLate = lateMinutes > tolerance;
                if (isLate) {
                    authorizationStatus = 'pending';
                }
            } else {
                // MODO NORMAL: Calcular tardanza basado en hora actual vs hora de turno
                const checkInHour = now.getHours();
                const checkInMinute = now.getMinutes();
                const checkInMinutesFromMidnight = checkInHour * 60 + checkInMinute;

                const shiftStart = shift.startTime.split(':');
                const shiftHour = parseInt(shiftStart[0]);
                const shiftMinute = parseInt(shiftStart[1]);
                const shiftMinutesFromMidnight = shiftHour * 60 + shiftMinute;
                const toleranceLimitMinutes = shiftMinutesFromMidnight + tolerance;

                // Manejo de turnos nocturnos
                let effectiveCheckIn = checkInMinutesFromMidnight;
                if (shiftHour >= 18 && checkInHour < 6) {
                    effectiveCheckIn = checkInMinutesFromMidnight + 24*60;
                }

                if (effectiveCheckIn > toleranceLimitMinutes) {
                    isLate = true;
                    lateMinutes = effectiveCheckIn - shiftMinutesFromMidnight;
                    authorizationStatus = 'pending';
                }
            }

            // 9. REGISTRAR ASISTENCIA
            const attendanceId = uuidv4();
            await db.sequelize.query(`
                INSERT INTO attendances (
                    id, "UserId", company_id, date, "checkInTime", kiosk_id,
                    origin_type, status, authorization_status, notes,
                    "createdAt", "updatedAt"
                ) VALUES (
                    :id, :user_id, :company_id, :date, :checkInTime, :kiosk_id,
                    'kiosk', 'present', :auth_status, :notes,
                    NOW(), NOW()
                )
            `, {
                replacements: {
                    id: attendanceId,
                    user_id: userData.user_id,
                    company_id,
                    date: today,
                    checkInTime: checkInTime.toISOString(),
                    kiosk_id,
                    auth_status: authorizationStatus,
                    notes: isLate ? `Llegada ${lateMinutes} minutos tarde (via kiosk-test)` : 'Check-in via kiosk-test'
                },
                type: Sequelize.QueryTypes.INSERT
            });

            // 10. SI LLEGA TARDE, CREAR NOTIFICACION
            if (isLate) {
                await createLateArrivalNotification(db, {
                    company_id,
                    user: userData,
                    lateMinutes,
                    attendanceId,
                    shift
                });
            }

            // 11. RESPUESTA EXITOSA
            return res.status(201).json({
                success: true,
                action: 'CHECK_IN',
                message: isLate
                    ? `Check-in registrado (${lateMinutes} min tarde, pendiente autorizacion)`
                    : 'Check-in registrado exitosamente',
                data: {
                    attendance_id: attendanceId,
                    user: {
                        id: userData.user_id,
                        name: `${userData.firstName} ${userData.lastName}`,
                        legajo: userData.legajo
                    },
                    shift: {
                        name: shift.shift_name,
                        start: shift.startTime,
                        end: shift.endTime
                    },
                    check_in_time: checkInTime.toISOString(),
                    is_late: isLate,
                    late_minutes: lateMinutes,
                    authorization_status: authorizationStatus,
                    kiosk: {
                        id: kioskData.id,
                        name: kioskData.name
                    }
                }
            });

        } catch (error) {
            console.error('[KIOSK-TEST] Error check-in:', error);
            return res.status(500).json({
                success: false,
                error: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    });

    // ================================================================
    // POST /api/kiosk-test/check-out
    // Simula check-out via kiosk (bypass biometrico)
    // ================================================================
    router.post('/check-out', async (req, res) => {
        const {
            kiosk_id,
            user_identifier,
            company_id,
            simulated_time,
            bypass_cooldown
        } = req.body;

        try {
            // 1. VALIDAR KIOSK
            const kiosk = await db.sequelize.query(`
                SELECT id, name, company_id, is_active
                FROM kiosks WHERE id = :kiosk_id AND is_active = true
            `, {
                replacements: { kiosk_id },
                type: Sequelize.QueryTypes.SELECT
            });

            if (!kiosk || kiosk.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'KIOSK_NOT_FOUND',
                    message: 'Kiosk no encontrado o inactivo'
                });
            }

            // 2. BUSCAR USUARIO
            const user = await db.sequelize.query(`
                SELECT user_id, "firstName", "lastName", legajo, email, company_id
                FROM users
                WHERE company_id = :company_id
                  AND "isActive" = true
                  AND (
                      user_id::text = :identifier
                      OR legajo = :identifier
                      OR email = :identifier
                  )
            `, {
                replacements: { company_id, identifier: user_identifier },
                type: Sequelize.QueryTypes.SELECT
            });

            if (!user || user.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: 'Usuario no encontrado'
                });
            }

            const userData = user[0];

            // 3. VERIFICAR COOLDOWN
            if (!bypass_cooldown) {
                const lastDetection = await db.sequelize.query(`
                    SELECT id FROM attendances
                    WHERE "UserId" = :user_id
                      AND "checkOutTime" > NOW() - INTERVAL '10 minutes'
                    LIMIT 1
                `, {
                    replacements: { user_id: userData.user_id },
                    type: Sequelize.QueryTypes.SELECT
                });

                if (lastDetection && lastDetection.length > 0) {
                    return res.status(429).json({
                        success: false,
                        error: 'COOLDOWN_ACTIVE',
                        message: 'Debe esperar 10 minutos entre fichadas'
                    });
                }
            }

            // 4. BUSCAR ASISTENCIA ABIERTA (con check-in pero sin check-out)
            const today = new Date().toISOString().split('T')[0];
            const openAttendance = await db.sequelize.query(`
                SELECT id, "checkInTime", "checkOutTime", status
                FROM attendances
                WHERE "UserId" = :user_id
                  AND date = :today
                  AND "checkInTime" IS NOT NULL
                  AND "checkOutTime" IS NULL
            `, {
                replacements: { user_id: userData.user_id, today },
                type: Sequelize.QueryTypes.SELECT
            });

            if (!openAttendance || openAttendance.length === 0) {
                // Verificar si ya cerro
                const closedAttendance = await db.sequelize.query(`
                    SELECT id, "checkInTime", "checkOutTime"
                    FROM attendances
                    WHERE "UserId" = :user_id AND date = :today
                      AND "checkOutTime" IS NOT NULL
                `, {
                    replacements: { user_id: userData.user_id, today },
                    type: Sequelize.QueryTypes.SELECT
                });

                if (closedAttendance && closedAttendance.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'ALREADY_CHECKED_OUT',
                        message: 'Ya tiene check-out registrado hoy',
                        attendance: closedAttendance[0]
                    });
                }

                return res.status(400).json({
                    success: false,
                    error: 'NO_OPEN_CHECKIN',
                    message: 'No hay check-in abierto para cerrar. Primero debe hacer check-in'
                });
            }

            const attendance = openAttendance[0];

            // 5. REGISTRAR CHECK-OUT
            const now = simulated_time ? new Date(simulated_time) : new Date();
            const checkOutTime = now;
            const checkInTime = new Date(attendance.checkInTime);

            // Calcular horas trabajadas
            const workingHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

            await db.sequelize.query(`
                UPDATE attendances
                SET "checkOutTime" = :checkOutTime,
                    "workingHours" = :workingHours,
                    "updatedAt" = NOW()
                WHERE id = :id
            `, {
                replacements: {
                    id: attendance.id,
                    checkOutTime: checkOutTime.toISOString(),
                    workingHours: Math.round(workingHours * 100) / 100
                },
                type: Sequelize.QueryTypes.UPDATE
            });

            return res.status(200).json({
                success: true,
                action: 'CHECK_OUT',
                message: 'Check-out registrado exitosamente',
                data: {
                    attendance_id: attendance.id,
                    user: {
                        id: userData.user_id,
                        name: `${userData.firstName} ${userData.lastName}`,
                        legajo: userData.legajo
                    },
                    check_in_time: checkInTime.toISOString(),
                    check_out_time: checkOutTime.toISOString(),
                    working_hours: Math.round(workingHours * 100) / 100,
                    kiosk: {
                        id: kiosk[0].id,
                        name: kiosk[0].name
                    }
                }
            });

        } catch (error) {
            console.error('[KIOSK-TEST] Error check-out:', error);
            return res.status(500).json({
                success: false,
                error: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    });

    // ================================================================
    // POST /api/kiosk-test/auto-detect
    // Detecta automaticamente si debe hacer check-in o check-out
    // ================================================================
    router.post('/auto-detect', async (req, res) => {
        const { kiosk_id, user_identifier, company_id, simulated_time, bypass_cooldown } = req.body;

        try {
            // Verificar estado actual
            const today = new Date().toISOString().split('T')[0];

            const user = await db.sequelize.query(`
                SELECT user_id FROM users
                WHERE company_id = :company_id
                  AND "isActive" = true
                  AND (user_id::text = :identifier OR legajo = :identifier OR email = :identifier)
            `, {
                replacements: { company_id, identifier: user_identifier },
                type: Sequelize.QueryTypes.SELECT
            });

            if (!user || user.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: 'Usuario no encontrado'
                });
            }

            const attendance = await db.sequelize.query(`
                SELECT id, "checkInTime", "checkOutTime"
                FROM attendances
                WHERE "UserId" = :user_id AND date = :today
            `, {
                replacements: { user_id: user[0].user_id, today },
                type: Sequelize.QueryTypes.SELECT
            });

            let action;
            if (!attendance || attendance.length === 0) {
                action = 'CHECK_IN';
            } else if (attendance[0].checkInTime && !attendance[0].checkOutTime) {
                action = 'CHECK_OUT';
            } else if (attendance[0].checkInTime && attendance[0].checkOutTime) {
                return res.status(400).json({
                    success: false,
                    error: 'SHIFT_COMPLETE',
                    message: 'Turno ya completado hoy',
                    attendance: attendance[0]
                });
            } else {
                action = 'CHECK_IN';
            }

            // Redirigir a la accion correcta
            req.body.kiosk_id = kiosk_id;
            req.body.user_identifier = user_identifier;
            req.body.company_id = company_id;
            req.body.simulated_time = simulated_time;
            req.body.bypass_cooldown = bypass_cooldown;

            if (action === 'CHECK_IN') {
                return router.handle(Object.assign({}, req, { url: '/check-in', method: 'POST' }), res);
            } else {
                return router.handle(Object.assign({}, req, { url: '/check-out', method: 'POST' }), res);
            }

        } catch (error) {
            console.error('[KIOSK-TEST] Error auto-detect:', error);
            return res.status(500).json({
                success: false,
                error: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    });

    // ================================================================
    // GET /api/kiosk-test/status/:user_identifier
    // Obtiene estado actual del usuario
    // ================================================================
    router.get('/status/:user_identifier', async (req, res) => {
        const { user_identifier } = req.params;
        const { company_id } = req.query;

        try {
            const today = new Date().toISOString().split('T')[0];

            const result = await db.sequelize.query(`
                SELECT
                    u.user_id, u."firstName", u."lastName", u.legajo,
                    a.id as attendance_id, a."checkInTime", a."checkOutTime",
                    a.status, a.authorization_status, a."workingHours",
                    s.name as shift_name, s."startTime", s."endTime"
                FROM users u
                LEFT JOIN attendances a ON u.user_id = a."UserId" AND a.date = :today
                LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
                LEFT JOIN shifts s ON usa.shift_id = s.id
                WHERE u.company_id = :company_id
                  AND (u.user_id::text = :identifier OR u.legajo = :identifier OR u.email = :identifier)
            `, {
                replacements: { company_id, identifier: user_identifier, today },
                type: Sequelize.QueryTypes.SELECT
            });

            if (!result || result.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'USER_NOT_FOUND'
                });
            }

            const data = result[0];
            let currentStatus;

            if (!data.attendance_id) {
                currentStatus = 'NOT_STARTED';
            } else if (data.checkInTime && !data.checkOutTime) {
                currentStatus = 'WORKING';
            } else if (data.checkInTime && data.checkOutTime) {
                currentStatus = 'COMPLETED';
            } else {
                currentStatus = 'UNKNOWN';
            }

            return res.json({
                success: true,
                data: {
                    user: {
                        id: data.user_id,
                        name: `${data.firstName} ${data.lastName}`,
                        legajo: data.legajo
                    },
                    shift: data.shift_name ? {
                        name: data.shift_name,
                        start: data.startTime,
                        end: data.endTime
                    } : null,
                    today: {
                        status: currentStatus,
                        attendance_id: data.attendance_id,
                        check_in: data.checkInTime,
                        check_out: data.checkOutTime,
                        working_hours: data.workingHours,
                        authorization_status: data.authorization_status
                    },
                    next_action: currentStatus === 'NOT_STARTED' ? 'CHECK_IN' :
                                 currentStatus === 'WORKING' ? 'CHECK_OUT' : 'NONE'
                }
            });

        } catch (error) {
            console.error('[KIOSK-TEST] Error status:', error);
            return res.status(500).json({
                success: false,
                error: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    });

    // ================================================================
    // POST /api/kiosk-test/authorize-late
    // Autoriza una llegada tarde
    // ================================================================
    router.post('/authorize-late', async (req, res) => {
        const { attendance_id, supervisor_id, action, notes } = req.body;

        try {
            // Verificar asistencia existe y esta pendiente
            const attendance = await db.sequelize.query(`
                SELECT id, "UserId", authorization_status, company_id
                FROM attendances
                WHERE id = :attendance_id
            `, {
                replacements: { attendance_id },
                type: Sequelize.QueryTypes.SELECT
            });

            if (!attendance || attendance.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'ATTENDANCE_NOT_FOUND'
                });
            }

            if (attendance[0].authorization_status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: 'NOT_PENDING',
                    message: `Estado actual: ${attendance[0].authorization_status}`
                });
            }

            // Verificar supervisor tiene permiso
            const supervisor = await db.sequelize.query(`
                SELECT user_id, can_authorize_late_arrivals
                FROM users WHERE user_id = :supervisor_id
            `, {
                replacements: { supervisor_id },
                type: Sequelize.QueryTypes.SELECT
            });

            if (!supervisor || supervisor.length === 0 || !supervisor[0].can_authorize_late_arrivals) {
                return res.status(403).json({
                    success: false,
                    error: 'NOT_AUTHORIZED',
                    message: 'Usuario no tiene permiso para autorizar llegadas tarde'
                });
            }

            const newStatus = (action === 'approve' || action === 'approved') ? 'approved' : 'rejected';

            await db.sequelize.query(`
                UPDATE attendances
                SET authorization_status = :status,
                    authorized_by_user_id = :supervisor_id,
                    authorized_at = NOW(),
                    authorization_notes = :notes,
                    "updatedAt" = NOW()
                WHERE id = :attendance_id
            `, {
                replacements: {
                    attendance_id,
                    status: newStatus,
                    supervisor_id,
                    notes: notes || `${newStatus === 'approved' ? 'Aprobado' : 'Rechazado'} via kiosk-test`
                },
                type: Sequelize.QueryTypes.UPDATE
            });

            // Marcar notificacion como leida
            await db.sequelize.query(`
                UPDATE notifications
                SET is_read = true, read_at = NOW(), read_by = :supervisor_id
                WHERE related_attendance_id = :attendance_id
            `, {
                replacements: { attendance_id, supervisor_id },
                type: Sequelize.QueryTypes.UPDATE
            });

            return res.json({
                success: true,
                message: `Llegada tarde ${newStatus === 'approved' ? 'aprobada' : 'rechazada'}`,
                data: {
                    attendance_id,
                    new_status: newStatus,
                    authorized_by: supervisor_id
                }
            });

        } catch (error) {
            console.error('[KIOSK-TEST] Error authorize:', error);
            return res.status(500).json({
                success: false,
                error: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    });

    // ================================================================
    // GET /api/kiosk-test/pending-authorizations
    // Lista llegadas tarde pendientes de autorizacion
    // ================================================================
    router.get('/pending-authorizations', async (req, res) => {
        const { company_id } = req.query;

        try {
            const result = await db.sequelize.query(`
                SELECT
                    a.id, a.date, a."checkInTime", a.notes,
                    u.user_id, u."firstName", u."lastName", u.legajo,
                    s.name as shift_name, s."startTime"
                FROM attendances a
                INNER JOIN users u ON a."UserId" = u.user_id
                LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
                LEFT JOIN shifts s ON usa.shift_id = s.id
                WHERE a.company_id = :company_id
                  AND a.authorization_status = 'pending'
                ORDER BY a."checkInTime" DESC
            `, {
                replacements: { company_id },
                type: Sequelize.QueryTypes.SELECT
            });

            return res.json({
                success: true,
                count: result.length,
                data: result.map(r => ({
                    attendance_id: r.id,
                    date: r.date,
                    check_in_time: r.checkInTime,
                    notes: r.notes,
                    user: {
                        id: r.user_id,
                        name: `${r.firstName} ${r.lastName}`,
                        legajo: r.legajo
                    },
                    shift: {
                        name: r.shift_name,
                        start: r.startTime
                    }
                }))
            });

        } catch (error) {
            console.error('[KIOSK-TEST] Error pending:', error);
            return res.status(500).json({
                success: false,
                error: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    });

    return router;
};

// ================================================================
// Helper: Crear notificacion de llegada tarde
// ================================================================
async function createLateArrivalNotification(db, { company_id, user, lateMinutes, attendanceId, shift }) {
    const { Sequelize } = require('sequelize');

    // Buscar supervisor
    const supervisor = await db.sequelize.query(`
        SELECT user_id FROM users
        WHERE company_id = :company_id AND can_authorize_late_arrivals = true
        LIMIT 1
    `, {
        replacements: { company_id },
        type: Sequelize.QueryTypes.SELECT
    });

    if (supervisor && supervisor.length > 0) {
        await db.sequelize.query(`
            INSERT INTO notifications (
                company_id, module, category, notification_type, priority,
                recipient_user_id, title, message,
                related_attendance_id, metadata, created_at
            ) VALUES (
                :company_id, 'attendance', 'warning', 'late_arrival_pending', 'high',
                :supervisor_id, 'Llegada tarde pendiente de autorizacion',
                :message, :attendance_id, :metadata, NOW()
            )
        `, {
            replacements: {
                company_id,
                supervisor_id: supervisor[0].user_id,
                message: `${user.firstName} ${user.lastName} (${user.legajo || 'S/L'}) llego ${lateMinutes} min tarde. Turno: ${shift.shift_name}`,
                attendance_id: attendanceId,
                metadata: JSON.stringify({
                    employee_id: user.user_id,
                    employee_name: `${user.firstName} ${user.lastName}`,
                    legajo: user.legajo,
                    late_minutes: lateMinutes,
                    shift_name: shift.shift_name
                })
            },
            type: Sequelize.QueryTypes.INSERT
        });
    }
}
