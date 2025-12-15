/**
 * ============================================================================
 * TEST DE ESTRÉS REALISTA - FICHAJES CON AUTORIZACIONES
 * ============================================================================
 *
 * Simula escenarios reales de producción:
 * - 100 usuarios activos
 * - 1000+ fichajes distribuidos en varios días
 * - Múltiples intentos de captura biométrica (solo 1 se registra)
 * - Llegadas tardías con flujo de autorización
 * - Supervisores disponibles/no disponibles
 * - Escalaciones jerárquicas
 * - Notificaciones en tiempo real
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const { sequelize } = require('../src/config/database-postgresql');
const { QueryTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// Cargar servicios (exportado como instancia singleton)
const lateArrivalService = require('../src/services/LateArrivalAuthorizationService');

// ============================================================================
// CONFIGURACIÓN DEL TEST
// ============================================================================

const CONFIG = {
    // Empresa de prueba
    companyId: 11, // ISI

    // Volumen de datos
    totalUsers: 100,
    totalAttendances: 1000, // Test completo de producción
    daysToSimulate: 30, // Último mes

    // Distribución de escenarios (porcentajes)
    scenarios: {
        normalOnTime: 60,        // 60% llegan a tiempo
        slightlyLate: 15,        // 15% llegan 1-5 min tarde (tolerancia)
        lateNeedsAuth: 15,       // 15% llegan tarde y necesitan autorización
        veryLate: 5,             // 5% llegan muy tarde (>30 min)
        noShow: 5                // 5% no se presentan
    },

    // Configuración de captura biométrica
    biometric: {
        maxAttempts: 5,          // Máximo intentos antes de éxito
        avgAttempts: 1.8,        // Promedio de intentos
        failureReasons: [
            'finger_not_detected',
            'poor_quality',
            'timeout',
            'sensor_error',
            'wet_finger'
        ]
    },

    // Turnos
    shifts: {
        morning: { start: '08:00', end: '16:00', tolerance: 10 },
        afternoon: { start: '14:00', end: '22:00', tolerance: 10 },
        night: { start: '22:00', end: '06:00', tolerance: 15 }
    },

    // Autorización
    authorization: {
        approvalRate: 75,        // 75% se aprueban
        avgResponseTime: 5,      // 5 minutos promedio de respuesta
        escalationRate: 20       // 20% escalan al siguiente nivel
    }
};

// ============================================================================
// UTILIDADES
// ============================================================================

const log = {
    info: (msg) => console.log(`\x1b[36m[${timestamp()}] ${msg}\x1b[0m`),
    success: (msg) => console.log(`\x1b[32m[${timestamp()}] ✅ ${msg}\x1b[0m`),
    warning: (msg) => console.log(`\x1b[33m[${timestamp()}] ⚠️ ${msg}\x1b[0m`),
    error: (msg) => console.log(`\x1b[31m[${timestamp()}] ❌ ${msg}\x1b[0m`),
    header: (msg) => console.log(`\n\x1b[35m[${timestamp()}] \n${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}\x1b[0m`),
    subheader: (msg) => console.log(`\x1b[34m[${timestamp()}] \n📋 ${msg}\x1b[0m`),
    metric: (label, value) => console.log(`   📊 ${label}: ${value}`)
};

function timestamp() {
    return new Date().toLocaleTimeString('es-AR');
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function gaussianRandom(mean, stdDev) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function addMinutesToTime(timeStr, minutes) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// ============================================================================
// GENERADORES DE DATOS
// ============================================================================

/**
 * Simular múltiples intentos de captura biométrica
 * Solo el último intento exitoso se registra como fichaje real
 */
function simulateBiometricCapture(userId, kioskId, attemptTime) {
    const attempts = [];
    const numAttempts = Math.min(
        CONFIG.biometric.maxAttempts,
        Math.max(1, Math.round(gaussianRandom(CONFIG.biometric.avgAttempts, 0.8)))
    );

    let currentTime = new Date(attemptTime);

    for (let i = 0; i < numAttempts; i++) {
        const isLastAttempt = i === numAttempts - 1;
        const isSuccess = isLastAttempt; // Solo el último es exitoso

        attempts.push({
            attempt_id: uuidv4(),
            user_id: userId,
            kiosk_id: kioskId,
            attempt_number: i + 1,
            timestamp: new Date(currentTime),
            success: isSuccess,
            failure_reason: isSuccess ? null : randomFromArray(CONFIG.biometric.failureReasons),
            quality_score: isSuccess ? randomBetween(70, 100) : randomBetween(20, 60),
            processing_time_ms: randomBetween(200, 1500)
        });

        // Agregar tiempo entre intentos (2-10 segundos)
        currentTime = new Date(currentTime.getTime() + randomBetween(2000, 10000));
    }

    return {
        attempts,
        finalSuccess: true,
        totalAttempts: numAttempts,
        successfulAttempt: attempts[attempts.length - 1]
    };
}

/**
 * Generar hora de llegada según escenario
 */
function generateArrivalTime(shiftStart, scenario, tolerance) {
    let minutesOffset;

    switch (scenario) {
        case 'normalOnTime':
            // -15 a +tolerance minutos
            minutesOffset = randomBetween(-15, tolerance);
            break;
        case 'slightlyLate':
            // tolerance+1 a tolerance+5 minutos
            minutesOffset = randomBetween(tolerance + 1, tolerance + 5);
            break;
        case 'lateNeedsAuth':
            // tolerance+6 a 30 minutos tarde
            minutesOffset = randomBetween(tolerance + 6, 30);
            break;
        case 'veryLate':
            // 31 a 120 minutos tarde
            minutesOffset = randomBetween(31, 120);
            break;
        case 'noShow':
            return null; // No se presenta
    }

    return addMinutesToTime(shiftStart, minutesOffset);
}

/**
 * Seleccionar escenario basado en probabilidades
 */
function selectScenario() {
    const rand = Math.random() * 100;
    let cumulative = 0;

    for (const [scenario, probability] of Object.entries(CONFIG.scenarios)) {
        cumulative += probability;
        if (rand < cumulative) {
            return scenario;
        }
    }
    return 'normalOnTime';
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtener usuarios de prueba
 */
async function getTestUsers() {
    const users = await sequelize.query(`
        SELECT
            u.user_id,
            u."firstName",
            u."lastName",
            u.department_id,
            u.default_branch_id,
            usa.shift_id,
            s.name AS shift_name,
            s."startTime" AS shift_start,
            s."endTime" AS shift_end,
            s."toleranceMinutes" AS tolerance_minutes
        FROM users u
        LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
        LEFT JOIN shifts s ON usa.shift_id = s.id
        WHERE u.company_id = $1
          AND u.is_active = true
        ORDER BY RANDOM()
        LIMIT $2
    `, {
        bind: [CONFIG.companyId, CONFIG.totalUsers],
        type: QueryTypes.SELECT
    });

    return users;
}

/**
 * Obtener kiosks disponibles
 */
async function getKiosks() {
    const kiosks = await sequelize.query(`
        SELECT id, name, location
        FROM kiosks
        WHERE company_id = $1 AND is_active = true
        LIMIT 10
    `, {
        bind: [CONFIG.companyId],
        type: QueryTypes.SELECT
    });

    // Si no hay kiosks, crear uno virtual
    if (kiosks.length === 0) {
        return [{
            id: uuidv4(),
            name: 'Kiosk Virtual Test',
            location: 'Test Location'
        }];
    }

    return kiosks;
}

/**
 * Crear tabla temporal para intentos biométricos
 */
async function createBiometricAttemptsTable() {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS biometric_capture_attempts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            kiosk_id UUID,
            attempt_number INTEGER NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            success BOOLEAN NOT NULL DEFAULT false,
            failure_reason VARCHAR(100),
            quality_score INTEGER,
            processing_time_ms INTEGER,
            attendance_id UUID,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_biometric_attempts_user ON biometric_capture_attempts(user_id);
        CREATE INDEX IF NOT EXISTS idx_biometric_attempts_timestamp ON biometric_capture_attempts(timestamp);
    `);
}

/**
 * Procesar un fichaje individual con todos sus escenarios
 */
async function processAttendance(user, kiosk, date, stats) {
    const scenario = selectScenario();
    const shiftStart = user.shift_start || '08:00:00';
    const tolerance = user.tolerance_minutes || 10;

    // Generar hora de llegada
    const arrivalTime = generateArrivalTime(shiftStart.substring(0, 5), scenario, tolerance);

    if (!arrivalTime) {
        // No-show
        stats.noShows++;
        return { scenario, success: false, reason: 'no_show' };
    }

    // Crear timestamp completo
    const arrivalTimestamp = new Date(`${date}T${arrivalTime}:00`);

    // Simular captura biométrica
    const biometricResult = simulateBiometricCapture(user.user_id, kiosk.id, arrivalTimestamp);
    stats.totalBiometricAttempts += biometricResult.totalAttempts;

    // Guardar intentos de captura
    for (const attempt of biometricResult.attempts) {
        await sequelize.query(`
            INSERT INTO biometric_capture_attempts
            (user_id, kiosk_id, attempt_number, timestamp, success, failure_reason, quality_score, processing_time_ms)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, {
            bind: [
                attempt.user_id,
                attempt.kiosk_id,
                attempt.attempt_number,
                attempt.timestamp,
                attempt.success,
                attempt.failure_reason,
                attempt.quality_score,
                attempt.processing_time_ms
            ],
            type: QueryTypes.INSERT
        });
    }

    // Calcular minutos de retraso
    const [shiftH, shiftM] = shiftStart.split(':').map(Number);
    const [arrH, arrM] = arrivalTime.split(':').map(Number);
    const minutesLate = (arrH * 60 + arrM) - (shiftH * 60 + shiftM);

    // Determinar si necesita autorización
    const needsAuthorization = minutesLate > tolerance;
    let authorizationStatus = null;
    let authorizationId = null;

    if (needsAuthorization && scenario !== 'noShow') {
        stats.lateArrivals++;

        // Buscar autorizador
        const authorizers = await lateArrivalService.findAuthorizersByHierarchy(
            user.user_id,
            CONFIG.companyId
        );

        if (authorizers && authorizers.length > 0) {
            const authorizer = authorizers[0];

            // Simular decisión de autorización
            const isApproved = Math.random() * 100 < CONFIG.authorization.approvalRate;
            authorizationStatus = isApproved ? 'approved' : 'rejected';

            // Registrar autorización
            const authResult = await sequelize.query(`
                INSERT INTO late_arrival_authorizations
                (employee_id, company_id, request_date, scheduled_time, actual_arrival_time,
                 minutes_late, shift_id, shift_name, requested_authorizer_id, actual_authorizer_id,
                 status, decision_timestamp, notification_sent_at, notification_channels)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $11, $12)
                RETURNING id
            `, {
                bind: [
                    user.user_id,
                    CONFIG.companyId,
                    date,
                    shiftStart,
                    arrivalTime + ':00',
                    minutesLate,
                    user.shift_id,
                    user.shift_name,
                    authorizer.user_id,
                    authorizationStatus,
                    new Date(),
                    JSON.stringify(['websocket', 'email'])
                ],
                type: QueryTypes.INSERT
            });

            authorizationId = authResult[0]?.[0]?.id;

            if (isApproved) {
                stats.authorizationsApproved++;
            } else {
                stats.authorizationsRejected++;
            }
        } else {
            stats.noAuthorizerFound++;
        }
    }

    // Crear registro de asistencia (solo si llegó y fue autorizado o no necesitaba autorización)
    let attendanceId = null;
    const canRegisterAttendance = !needsAuthorization || authorizationStatus === 'approved';

    if (canRegisterAttendance) {
        const checkInResult = await sequelize.query(`
            INSERT INTO attendances
            (id, "UserId", "checkInTime", date, kiosk_id, status, company_id,
             is_late, minutes_late, authorization_status, authorization_id, "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), $1, $2, DATE($2), $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING id
        `, {
            bind: [
                user.user_id,
                arrivalTimestamp,
                kiosk.id,
                needsAuthorization ? 'late' : 'present',
                CONFIG.companyId,
                minutesLate > 0,
                Math.max(0, minutesLate),
                authorizationStatus,
                authorizationId
            ],
            type: QueryTypes.INSERT
        });

        attendanceId = checkInResult[0]?.[0]?.id;
        stats.successfulCheckIns++;

        // Simular check-out (70% de los casos)
        if (Math.random() < 0.7) {
            const checkOutTime = new Date(arrivalTimestamp);
            checkOutTime.setHours(checkOutTime.getHours() + randomBetween(7, 10));

            await sequelize.query(`
                UPDATE attendances
                SET "checkOutTime" = $1, kiosk_id = $2, "updatedAt" = NOW()
                WHERE id = $3
            `, {
                bind: [checkOutTime, kiosk.id, attendanceId],
                type: QueryTypes.UPDATE
            });

            stats.successfulCheckOuts++;
        }
    } else {
        stats.rejectedCheckIns++;
    }

    // Actualizar intento exitoso con ID de asistencia
    if (attendanceId && biometricResult.successfulAttempt) {
        await sequelize.query(`
            UPDATE biometric_capture_attempts
            SET attendance_id = $1
            WHERE user_id = $2 AND timestamp = $3 AND success = true
        `, {
            bind: [attendanceId, user.user_id, biometricResult.successfulAttempt.timestamp],
            type: QueryTypes.UPDATE
        });
    }

    return {
        scenario,
        success: canRegisterAttendance,
        minutesLate,
        needsAuthorization,
        authorizationStatus,
        biometricAttempts: biometricResult.totalAttempts
    };
}

/**
 * Ejecutar test completo
 */
async function runStressTest() {
    log.header('🧪 TEST DE ESTRÉS REALISTA - FICHAJES CON AUTORIZACIONES');

    const stats = {
        totalProcessed: 0,
        successfulCheckIns: 0,
        successfulCheckOuts: 0,
        rejectedCheckIns: 0,
        lateArrivals: 0,
        authorizationsApproved: 0,
        authorizationsRejected: 0,
        noAuthorizerFound: 0,
        noShows: 0,
        totalBiometricAttempts: 0,
        errors: 0,
        startTime: Date.now()
    };

    try {
        // 1. Preparar tablas
        log.subheader('FASE 1: PREPARACIÓN');
        await createBiometricAttemptsTable();
        log.success('Tabla de intentos biométricos lista');

        // 2. Obtener datos
        const users = await getTestUsers();
        log.info(`Usuarios obtenidos: ${users.length}`);

        if (users.length === 0) {
            log.error('No se encontraron usuarios para la prueba');
            return;
        }

        const kiosks = await getKiosks();
        log.info(`Kiosks disponibles: ${kiosks.length}`);

        // 3. Generar fechas a simular
        const dates = [];
        const today = new Date();
        for (let i = CONFIG.daysToSimulate; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            // Solo días laborables (lun-vie)
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                dates.push(date.toISOString().split('T')[0]);
            }
        }
        log.info(`Días a simular: ${dates.length}`);

        // 4. Calcular fichajes por día
        const attendancesPerDay = Math.ceil(CONFIG.totalAttendances / dates.length);
        log.info(`Fichajes por día: ~${attendancesPerDay}`);

        // 5. Procesar fichajes
        log.subheader('FASE 2: SIMULACIÓN DE FICHAJES');

        let processedCount = 0;
        const totalToProcess = CONFIG.totalAttendances;

        for (const date of dates) {
            if (processedCount >= totalToProcess) break;

            const dailyCount = Math.min(attendancesPerDay, totalToProcess - processedCount);
            const shuffledUsers = [...users].sort(() => Math.random() - 0.5);

            for (let i = 0; i < dailyCount && i < shuffledUsers.length; i++) {
                const user = shuffledUsers[i];
                const kiosk = randomFromArray(kiosks);

                try {
                    await processAttendance(user, kiosk, date, stats);
                    stats.totalProcessed++;
                    processedCount++;

                    // Mostrar progreso cada 100
                    if (processedCount % 100 === 0) {
                        const progress = ((processedCount / totalToProcess) * 100).toFixed(1);
                        log.info(`Progreso: ${processedCount}/${totalToProcess} (${progress}%)`);
                    }
                } catch (error) {
                    stats.errors++;
                    if (stats.errors <= 5) {
                        log.error(`Error procesando fichaje: ${error.message}`);
                    }
                }
            }
        }

        // 6. Mostrar resultados
        const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);

        log.header('📊 RESULTADOS DEL TEST');

        console.log('\n📈 MÉTRICAS GENERALES:');
        log.metric('Total fichajes procesados', stats.totalProcessed);
        log.metric('Check-ins exitosos', stats.successfulCheckIns);
        log.metric('Check-outs exitosos', stats.successfulCheckOuts);
        log.metric('Check-ins rechazados', stats.rejectedCheckIns);
        log.metric('No-shows', stats.noShows);
        log.metric('Errores', stats.errors);
        log.metric('Duración total', `${duration}s`);

        console.log('\n🕐 MÉTRICAS DE LLEGADAS TARDÍAS:');
        log.metric('Llegadas tardías totales', stats.lateArrivals);
        log.metric('Autorizaciones aprobadas', stats.authorizationsApproved);
        log.metric('Autorizaciones rechazadas', stats.authorizationsRejected);
        log.metric('Sin autorizador disponible', stats.noAuthorizerFound);

        const approvalRate = stats.lateArrivals > 0
            ? ((stats.authorizationsApproved / stats.lateArrivals) * 100).toFixed(1)
            : 0;
        log.metric('Tasa de aprobación', `${approvalRate}%`);

        console.log('\n🔬 MÉTRICAS BIOMÉTRICAS:');
        log.metric('Total intentos de captura', stats.totalBiometricAttempts);
        const avgAttempts = stats.totalProcessed > 0
            ? (stats.totalBiometricAttempts / stats.totalProcessed).toFixed(2)
            : 0;
        log.metric('Promedio intentos/fichaje', avgAttempts);

        console.log('\n📊 DISTRIBUCIÓN DE ESCENARIOS:');
        const totalWithAttendance = stats.successfulCheckIns + stats.rejectedCheckIns;
        if (totalWithAttendance > 0) {
            log.metric('Tasa de éxito check-in',
                `${((stats.successfulCheckIns / totalWithAttendance) * 100).toFixed(1)}%`);
            log.metric('Tasa de éxito check-out',
                `${((stats.successfulCheckOuts / stats.successfulCheckIns) * 100).toFixed(1)}%`);
        }

        // 7. Verificar datos en BD
        log.subheader('FASE 3: VERIFICACIÓN EN BASE DE DATOS');

        const [attendanceCount] = await sequelize.query(`
            SELECT COUNT(*) as count FROM attendances WHERE company_id = $1
        `, { bind: [CONFIG.companyId], type: QueryTypes.SELECT });
        log.info(`Registros en attendances: ${attendanceCount.count}`);

        const [authCount] = await sequelize.query(`
            SELECT COUNT(*) as count FROM late_arrival_authorizations WHERE company_id = $1
        `, { bind: [CONFIG.companyId], type: QueryTypes.SELECT });
        log.info(`Registros en late_arrival_authorizations: ${authCount.count}`);

        const [biometricCount] = await sequelize.query(`
            SELECT COUNT(*) as count FROM biometric_capture_attempts
        `, { type: QueryTypes.SELECT });
        log.info(`Registros en biometric_capture_attempts: ${biometricCount.count}`);

        // 8. Mostrar ejemplos
        log.subheader('FASE 4: EJEMPLOS DE DATOS GENERADOS');

        const examples = await sequelize.query(`
            SELECT
                a.id,
                u."firstName" || ' ' || u."lastName" AS employee,
                a."checkInTime",
                a.status,
                a.is_late,
                a.minutes_late,
                a.authorization_status
            FROM attendances a
            JOIN users u ON a."UserId" = u.user_id
            WHERE a.company_id = $1
            ORDER BY a."checkInTime" DESC
            LIMIT 5
        `, { bind: [CONFIG.companyId], type: QueryTypes.SELECT });

        console.log('\n🔍 Últimos 5 fichajes:');
        examples.forEach((ex, i) => {
            console.log(`   ${i + 1}. ${ex.employee}`);
            console.log(`      Check-in: ${ex.checkInTime}`);
            console.log(`      Status: ${ex.status} | Late: ${ex.is_late ? `Sí (${ex.minutes_late} min)` : 'No'}`);
            console.log(`      Auth: ${ex.authorization_status || 'N/A'}`);
        });

        log.success(`\n✅ TEST COMPLETADO EXITOSAMENTE en ${duration} segundos`);

    } catch (error) {
        log.error(`Error fatal: ${error.message}`);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

// ============================================================================
// EJECUTAR TEST
// ============================================================================

runStressTest();
