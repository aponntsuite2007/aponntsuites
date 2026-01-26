/**
 * ============================================================================
 * OVERTIME CALCULATOR SERVICE
 * ============================================================================
 *
 * Servicio para calcular horas trabajadas, horas extras y aplicar
 * multiplicadores según configuración de turnos.
 *
 * Considera:
 * - Horas normales vs horas extras (basado en startTime/endTime del turno)
 * - Multiplicadores por tipo: normal, overtime, weekend, holiday
 * - Descansos (breakStartTime/breakEndTime)
 * - Tolerancias de entrada/salida
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const { sequelize, Shift, UserShiftAssignment, Holiday } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Integración con HourBankService (carga diferida para evitar circular dependency)
let HourBankService = null;

class OvertimeCalculatorService {

    /**
     * Obtiene el HourBankService (carga diferida)
     */
    getHourBankService() {
        if (!HourBankService) {
            try {
                HourBankService = require('./HourBankService');
            } catch (error) {
                console.warn('[OvertimeCalc] HourBankService no disponible:', error.message);
            }
        }
        return HourBankService;
    }

    /**
     * Obtiene el turno activo de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Object|null} Turno activo o null
     */
    async getUserActiveShift(userId) {
        try {
            const [assignment] = await sequelize.query(`
                SELECT
                    usa.id as assignment_id,
                    usa.shift_id,
                    usa.assigned_phase,
                    usa.group_name,
                    s.name as shift_name,
                    s."startTime" as start_time,
                    s."endTime" as end_time,
                    s."breakStartTime" as break_start,
                    s."breakEndTime" as break_end,
                    s."hourlyRates" as hourly_rates,
                    s."toleranceConfig" as tolerance_config,
                    s."shiftType" as shift_type,
                    s.company_id
                FROM user_shift_assignments usa
                INNER JOIN shifts s ON usa.shift_id = s.id
                WHERE usa.user_id = :userId
                  AND usa.is_active = true
                ORDER BY usa.join_date DESC
                LIMIT 1
            `, {
                replacements: { userId },
                type: QueryTypes.SELECT
            });

            return assignment || null;
        } catch (error) {
            console.error('[OvertimeCalc] Error obteniendo turno:', error);
            return null;
        }
    }

    /**
     * Verifica si una fecha es feriado
     * @param {string} date - Fecha en formato YYYY-MM-DD
     * @param {number} companyId - ID de la empresa
     * @returns {boolean}
     */
    async isHoliday(date, companyId) {
        try {
            // Convertir fecha a formato YYYY-MM-DD si es timestamp
            const dateStr = typeof date === 'string'
                ? date.split('T')[0]
                : new Date(date).toISOString().split('T')[0];

            const [result] = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM holidays h
                WHERE h.date = :date
            `, {
                replacements: { date: dateStr },
                type: QueryTypes.SELECT
            });

            return parseInt(result?.count || 0) > 0;
        } catch (error) {
            // Si no existe tabla holidays, retornar false
            console.warn('[OvertimeCalc] Tabla holidays no disponible:', error.message);
            return false;
        }
    }

    /**
     * Verifica si una fecha es fin de semana
     * @param {string|Date} date - Fecha
     * @returns {boolean}
     */
    isWeekend(date) {
        const d = new Date(date);
        const day = d.getDay();
        return day === 0 || day === 6; // Domingo = 0, Sábado = 6
    }

    /**
     * Convierte TIME string a minutos desde medianoche
     * @param {string} timeStr - Hora en formato HH:MM:SS o HH:MM
     * @returns {number} Minutos desde medianoche
     */
    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return hours * 60 + minutes;
    }

    /**
     * Extrae hora de un timestamp ISO
     * @param {string|Date} timestamp - Timestamp
     * @returns {number} Minutos desde medianoche
     */
    timestampToMinutes(timestamp) {
        if (!timestamp) return 0;
        const d = new Date(timestamp);
        return d.getHours() * 60 + d.getMinutes();
    }

    /**
     * Calcula las horas trabajadas con desglose
     * @param {Object} attendance - Registro de asistencia
     * @param {Object} shift - Configuración del turno
     * @param {boolean} isHoliday - Si es feriado
     * @returns {Object} Desglose de horas
     */
    calculateHoursBreakdown(attendance, shift, isHoliday = false) {
        const checkIn = attendance.check_in || attendance.checkInTime;
        const checkOut = attendance.check_out || attendance.checkOutTime;

        if (!checkIn || !checkOut) {
            return {
                totalMinutes: 0,
                totalHours: 0,
                normalMinutes: 0,
                normalHours: 0,
                overtimeMinutes: 0,
                overtimeHours: 0,
                breakMinutes: 0,
                effectiveMinutes: 0,
                effectiveHours: 0,
                dayType: 'incomplete',
                multipliers: { normal: 1, overtime: 1.5, weekend: 1.5, holiday: 2 },
                error: 'Fichaje incompleto: falta entrada o salida'
            };
        }

        // VALIDACIÓN: El turno DEBE estar configurado - NO usar hardcodes
        const shiftStartRaw = shift?.start_time || shift?.startTime;
        const shiftEndRaw = shift?.end_time || shift?.endTime;

        if (!shift || !shiftStartRaw || !shiftEndRaw) {
            // Calcular solo tiempo trabajado, sin poder determinar horas extras
            const checkInTime = new Date(checkIn);
            const checkOutTime = new Date(checkOut);
            const totalMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));

            return {
                totalMinutes,
                totalHours: parseFloat((totalMinutes / 60).toFixed(2)),
                normalMinutes: totalMinutes,
                normalHours: parseFloat((totalMinutes / 60).toFixed(2)),
                overtimeMinutes: 0,
                overtimeHours: 0,
                breakMinutes: 0,
                effectiveMinutes: totalMinutes,
                effectiveHours: parseFloat((totalMinutes / 60).toFixed(2)),
                expectedWorkMinutes: null,
                expectedWorkHours: null,
                dayType: 'unknown',
                isWeekend: this.isWeekend(attendance.date || checkIn),
                isHoliday,
                multipliers: { normal: 1, overtime: 1.5, weekend: 1.5, holiday: 2 },
                shiftInfo: { name: 'Sin turno configurado', startTime: null, endTime: null },
                warning: 'Sin turno asignado - no se pueden calcular horas extras'
            };
        }

        const hourlyRates = shift?.hourly_rates || shift?.hourlyRates || {
            normal: 1,
            overtime: 1.5,
            weekend: 1.5,
            holiday: 2
        };

        // Obtener tiempos del turno (ya validados como existentes)
        const shiftStart = this.timeToMinutes(shiftStartRaw);
        const shiftEnd = this.timeToMinutes(shiftEndRaw);
        const breakStart = this.timeToMinutes(shift?.break_start || shift?.breakStartTime);
        const breakEnd = this.timeToMinutes(shift?.break_end || shift?.breakEndTime);

        // Calcular duración esperada del turno (sin descanso)
        let shiftDurationMinutes = shiftEnd - shiftStart;
        if (shiftDurationMinutes < 0) {
            // Turno nocturno que cruza medianoche
            shiftDurationMinutes = (24 * 60 - shiftStart) + shiftEnd;
        }

        // Descontar tiempo de descanso si está configurado
        let breakMinutes = 0;
        if (breakStart && breakEnd && breakEnd > breakStart) {
            breakMinutes = breakEnd - breakStart;
        }

        const expectedWorkMinutes = shiftDurationMinutes - breakMinutes;

        // Calcular tiempo real trabajado
        const checkInTime = new Date(checkIn);
        const checkOutTime = new Date(checkOut);
        const totalMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));

        // Restar tiempo de descanso del tiempo total
        const effectiveMinutes = Math.max(0, totalMinutes - breakMinutes);

        // Determinar horas normales y extras
        let normalMinutes = Math.min(effectiveMinutes, expectedWorkMinutes);
        let overtimeMinutes = Math.max(0, effectiveMinutes - expectedWorkMinutes);

        // Determinar tipo de día
        const date = attendance.date || checkIn;
        const isWeekendDay = this.isWeekend(date);
        let dayType = 'normal';

        if (isHoliday) {
            dayType = 'holiday';
        } else if (isWeekendDay) {
            dayType = 'weekend';
        }

        return {
            totalMinutes,
            totalHours: parseFloat((totalMinutes / 60).toFixed(2)),
            normalMinutes,
            normalHours: parseFloat((normalMinutes / 60).toFixed(2)),
            overtimeMinutes,
            overtimeHours: parseFloat((overtimeMinutes / 60).toFixed(2)),
            breakMinutes,
            effectiveMinutes,
            effectiveHours: parseFloat((effectiveMinutes / 60).toFixed(2)),
            expectedWorkMinutes,
            expectedWorkHours: parseFloat((expectedWorkMinutes / 60).toFixed(2)),
            dayType,
            isWeekend: isWeekendDay,
            isHoliday,
            multipliers: hourlyRates,
            shiftInfo: {
                name: shift?.shift_name || shift?.name || 'Sin turno',
                startTime: shift?.start_time || shift?.startTime,
                endTime: shift?.end_time || shift?.endTime
            }
        };
    }

    /**
     * Calcula el costo de horas (para reportes de nómina)
     * @param {Object} breakdown - Desglose de horas (de calculateHoursBreakdown)
     * @param {number} baseHourlyRate - Tarifa base por hora
     * @returns {Object} Desglose de costos
     */
    calculateHoursCost(breakdown, baseHourlyRate = 1) {
        const { normalHours, overtimeHours, dayType, multipliers } = breakdown;

        // Aplicar multiplicador según tipo de día
        let baseMultiplier = multipliers.normal;
        if (dayType === 'holiday') {
            baseMultiplier = multipliers.holiday;
        } else if (dayType === 'weekend') {
            baseMultiplier = multipliers.weekend;
        }

        // Calcular costos
        const normalCost = normalHours * baseHourlyRate * baseMultiplier;
        const overtimeCost = overtimeHours * baseHourlyRate * multipliers.overtime * baseMultiplier;
        const totalCost = normalCost + overtimeCost;

        return {
            normalHours,
            normalCost: parseFloat(normalCost.toFixed(2)),
            normalMultiplier: baseMultiplier,
            overtimeHours,
            overtimeCost: parseFloat(overtimeCost.toFixed(2)),
            overtimeMultiplier: multipliers.overtime * baseMultiplier,
            totalHours: normalHours + overtimeHours,
            totalCost: parseFloat(totalCost.toFixed(2)),
            baseHourlyRate,
            dayType
        };
    }

    /**
     * Procesa una lista de asistencias con cálculo de horas extras
     * @param {Array} attendances - Lista de asistencias
     * @param {number} companyId - ID de la empresa
     * @returns {Array} Asistencias con desglose de horas
     */
    async processAttendancesWithOvertime(attendances, companyId) {
        const processed = [];
        const shiftCache = new Map();

        for (const attendance of attendances) {
            const userId = attendance.user_id || attendance.UserId;

            // Obtener turno del usuario (con caché)
            let shift;
            if (shiftCache.has(userId)) {
                shift = shiftCache.get(userId);
            } else {
                shift = await this.getUserActiveShift(userId);
                shiftCache.set(userId, shift);
            }

            // Verificar si es feriado
            const date = attendance.date;
            const isHoliday = await this.isHoliday(date, companyId);

            // Calcular desglose
            const breakdown = this.calculateHoursBreakdown(attendance, shift, isHoliday);

            processed.push({
                ...attendance,
                hoursBreakdown: breakdown
            });
        }

        return processed;
    }

    /**
     * Calcula estadísticas agregadas de horas
     * @param {Array} processedAttendances - Asistencias con desglose
     * @returns {Object} Estadísticas agregadas
     */
    calculateAggregatedStats(processedAttendances) {
        const stats = {
            totalRecords: processedAttendances.length,
            totalHours: 0,
            totalNormalHours: 0,
            totalOvertimeHours: 0,
            totalBreakHours: 0,
            averageHoursPerDay: 0,
            byDayType: {
                normal: { count: 0, hours: 0 },
                weekend: { count: 0, hours: 0 },
                holiday: { count: 0, hours: 0 },
                incomplete: { count: 0, hours: 0 }
            },
            byUser: new Map()
        };

        for (const attendance of processedAttendances) {
            const breakdown = attendance.hoursBreakdown;
            if (!breakdown) continue;

            stats.totalHours += breakdown.effectiveHours;
            stats.totalNormalHours += breakdown.normalHours;
            stats.totalOvertimeHours += breakdown.overtimeHours;
            stats.totalBreakHours += breakdown.breakMinutes / 60;

            // Por tipo de día
            const dayType = breakdown.dayType || 'normal';
            if (stats.byDayType[dayType]) {
                stats.byDayType[dayType].count++;
                stats.byDayType[dayType].hours += breakdown.effectiveHours;
            }

            // Por usuario
            const userId = attendance.user_id || attendance.UserId;
            if (!stats.byUser.has(userId)) {
                stats.byUser.set(userId, {
                    userId,
                    userName: attendance.user_name || attendance.userName,
                    legajo: attendance.legajo || attendance.employeeId,
                    totalHours: 0,
                    normalHours: 0,
                    overtimeHours: 0,
                    days: 0
                });
            }

            const userStats = stats.byUser.get(userId);
            userStats.totalHours += breakdown.effectiveHours;
            userStats.normalHours += breakdown.normalHours;
            userStats.overtimeHours += breakdown.overtimeHours;
            userStats.days++;
        }

        // Calcular promedios
        if (stats.totalRecords > 0) {
            stats.averageHoursPerDay = parseFloat((stats.totalHours / stats.totalRecords).toFixed(2));
        }

        // Convertir Map a Array
        stats.byUserArray = Array.from(stats.byUser.values());
        delete stats.byUser;

        // Redondear totales
        stats.totalHours = parseFloat(stats.totalHours.toFixed(2));
        stats.totalNormalHours = parseFloat(stats.totalNormalHours.toFixed(2));
        stats.totalOvertimeHours = parseFloat(stats.totalOvertimeHours.toFixed(2));
        stats.totalBreakHours = parseFloat(stats.totalBreakHours.toFixed(2));

        return stats;
    }

    /**
     * Detecta tardanzas según tolerancia del turno
     * @param {Object} attendance - Registro de asistencia
     * @param {Object} shift - Configuración del turno
     * @returns {Object} Información de tardanza
     */
    detectLateArrival(attendance, shift) {
        const checkIn = attendance.check_in || attendance.checkInTime;
        if (!checkIn || !shift) {
            return { isLate: false, lateMinutes: 0 };
        }

        const toleranceConfig = shift?.tolerance_config || shift?.toleranceConfig || {
            entry: { before: 15, after: 10 }
        };

        const shiftStartMinutes = this.timeToMinutes(shift?.start_time || shift?.startTime || '08:00');
        const checkInMinutes = this.timestampToMinutes(checkIn);
        const toleranceAfter = toleranceConfig.entry?.after || 10;

        // Límite de llegada = hora inicio + tolerancia
        const lateThreshold = shiftStartMinutes + toleranceAfter;

        const isLate = checkInMinutes > lateThreshold;
        const lateMinutes = isLate ? checkInMinutes - shiftStartMinutes : 0;

        return {
            isLate,
            lateMinutes,
            expectedTime: shift?.start_time || shift?.startTime,
            actualTime: new Date(checkIn).toTimeString().substring(0, 5),
            toleranceMinutes: toleranceAfter
        };
    }

    /**
     * Detecta salidas tempranas según tolerancia del turno
     * @param {Object} attendance - Registro de asistencia
     * @param {Object} shift - Configuración del turno
     * @returns {Object} Información de salida temprana
     */
    detectEarlyDeparture(attendance, shift) {
        const checkOut = attendance.check_out || attendance.checkOutTime;
        if (!checkOut || !shift) {
            return { isEarly: false, earlyMinutes: 0 };
        }

        const toleranceConfig = shift?.tolerance_config || shift?.toleranceConfig || {
            exit: { before: 10, after: 30 }
        };

        const shiftEndMinutes = this.timeToMinutes(shift?.end_time || shift?.endTime || '17:00');
        const checkOutMinutes = this.timestampToMinutes(checkOut);
        const toleranceBefore = toleranceConfig.exit?.before || 10;

        // Límite de salida = hora fin - tolerancia
        const earlyThreshold = shiftEndMinutes - toleranceBefore;

        const isEarly = checkOutMinutes < earlyThreshold;
        const earlyMinutes = isEarly ? shiftEndMinutes - checkOutMinutes : 0;

        return {
            isEarly,
            earlyMinutes,
            expectedTime: shift?.end_time || shift?.endTime,
            actualTime: new Date(checkOut).toTimeString().substring(0, 5),
            toleranceMinutes: toleranceBefore
        };
    }

    /**
     * =========================================================================
     * INTEGRACION CON BANCO DE HORAS
     * =========================================================================
     * Cuando se detectan horas extras en un checkout, notifica al Banco de Horas
     * para que el empleado pueda elegir si cobrar o acumular.
     */

    /**
     * Procesa el checkout de un empleado y notifica al banco de horas si hay HE
     * @param {Object} attendance - Registro de asistencia completo
     * @param {number} companyId - ID de la empresa
     * @param {number} userId - ID del usuario
     * @returns {Object} Resultado del proceso
     */
    async processCheckoutForHourBank(attendance, companyId, userId) {
        const hourBankSvc = this.getHourBankService();
        if (!hourBankSvc) {
            return { hourBankAvailable: false, reason: 'Service not loaded' };
        }

        try {
            // Obtener turno del usuario
            const shift = await this.getUserActiveShift(userId);
            if (!shift) {
                return { hourBankAvailable: false, reason: 'No shift assigned' };
            }

            // Verificar si es feriado
            const date = attendance.date || new Date(attendance.check_in).toISOString().split('T')[0];
            const isHoliday = await this.isHoliday(date, companyId);
            const isWeekend = this.isWeekend(date);

            // Calcular desglose de horas
            const breakdown = this.calculateHoursBreakdown(attendance, shift, isHoliday);

            // Si no hay horas extras, no hay nada que procesar
            if (breakdown.overtimeHours <= 0) {
                return {
                    hourBankAvailable: true,
                    overtimeDetected: false,
                    breakdown
                };
            }

            // Determinar tipo de hora extra
            let overtimeType = 'normal';
            if (isHoliday) {
                overtimeType = 'holiday';
            } else if (isWeekend) {
                overtimeType = 'weekend';
            }

            // Procesar hora extra a través del banco de horas
            const hourBankResult = await hourBankSvc.processOvertimeHour({
                userId,
                companyId,
                branchId: attendance.branch_id || attendance.kiosk_id || null,
                attendanceId: attendance.id,
                overtimeDate: date,
                overtimeHours: breakdown.overtimeHours,
                overtimeType
            });

            return {
                hourBankAvailable: true,
                overtimeDetected: true,
                overtimeHours: breakdown.overtimeHours,
                overtimeType,
                breakdown,
                hourBankResult
            };

        } catch (error) {
            console.error('[OvertimeCalc] Error procesando para banco de horas:', error);
            return {
                hourBankAvailable: true,
                error: error.message
            };
        }
    }

    /**
     * Obtiene las decisiones pendientes de un usuario
     * @param {number} companyId - ID de la empresa
     * @param {number} userId - ID del usuario (opcional, si no se da, trae todas de la empresa)
     * @returns {Array} Decisiones pendientes
     */
    async getPendingHourBankDecisions(companyId, userId = null) {
        const hourBankSvc = this.getHourBankService();
        if (!hourBankSvc) {
            return [];
        }

        try {
            return await hourBankSvc.getPendingDecisions(companyId, userId);
        } catch (error) {
            console.error('[OvertimeCalc] Error obteniendo decisiones pendientes:', error);
            return [];
        }
    }

    /**
     * Procesa una decision del empleado (cobrar o acumular)
     * @param {number} decisionId - ID de la decision pendiente
     * @param {string} choice - 'pay' o 'bank'
     * @param {number} userId - ID del usuario que toma la decision
     * @returns {Object} Resultado
     */
    async processHourBankDecision(decisionId, choice, userId) {
        const hourBankSvc = this.getHourBankService();
        if (!hourBankSvc) {
            return { success: false, error: 'Hour Bank Service not available' };
        }

        try {
            return await hourBankSvc.processEmployeeDecision(decisionId, userId, choice);
        } catch (error) {
            console.error('[OvertimeCalc] Error procesando decision:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene el saldo de banco de horas de un usuario
     * @param {number} companyId - ID de la empresa
     * @param {number} userId - ID del usuario
     * @returns {Object|null} Saldo
     */
    async getHourBankBalance(companyId, userId) {
        const hourBankSvc = this.getHourBankService();
        if (!hourBankSvc) {
            return null;
        }

        try {
            return await hourBankSvc.getBalance(companyId, userId);
        } catch (error) {
            console.error('[OvertimeCalc] Error obteniendo saldo:', error);
            return null;
        }
    }

    /**
     * Valida si un usuario puede usar horas del banco para salida anticipada
     * @param {number} companyId - ID de la empresa
     * @param {number} userId - ID del usuario
     * @param {number} earlyMinutes - Minutos de salida anticipada
     * @returns {Object} Resultado de validación
     */
    async validateEarlyDepartureWithHourBank(companyId, userId, earlyMinutes) {
        const hourBankSvc = this.getHourBankService();
        if (!hourBankSvc) {
            return { allowed: false, reason: 'Hour Bank not available' };
        }

        try {
            return await hourBankSvc.validateEarlyDeparture(companyId, userId, earlyMinutes);
        } catch (error) {
            console.error('[OvertimeCalc] Error validando salida anticipada:', error);
            return { allowed: false, reason: error.message };
        }
    }
}

module.exports = new OvertimeCalculatorService();
