/**
 * ============================================================================
 * CALENDARIO LABORAL SERVICE
 * ============================================================================
 *
 * Servicio CENTRAL para determinar si un empleado debe trabajar en una fecha.
 *
 * INTEGRA:
 * 1. ShiftCalculatorService - Turnos rotativos y fijos
 * 2. HolidayApiService - Feriados nacionales por país
 * 3. Holiday Model - Feriados en BD local
 * 4. CompanyNonWorkingDay - Días no laborables manuales
 *
 * LÓGICA DE DECISIÓN:
 * 1. ¿Es feriado nacional? → NO trabaja (a menos que haya excepción)
 * 2. ¿Es día no laborable de la empresa? → NO trabaja
 * 3. ¿El turno indica que debe trabajar? → SÍ/NO según rotación
 *
 * @version 1.0.0
 * @date 2025-12-14
 * @module attendance
 * ============================================================================
 */

const ShiftCalculatorService = require('./ShiftCalculatorService');
const holidayApiService = require('./HolidayApiService');

class CalendarioLaboralService {
    constructor() {
        // Cache para reducir consultas
        this.cache = new Map();
        this.cacheTimeout = 60 * 60 * 1000; // 1 hora
    }

    /**
     * ========================================================================
     * MÉTODO PRINCIPAL: ¿El empleado debe trabajar hoy?
     * ========================================================================
     *
     * @param {number|string} userId - ID del usuario
     * @param {Date|string} date - Fecha a consultar
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Object>} Resultado con shouldWork, reason, details
     */
    async isWorkingDay(userId, date, options = {}) {
        const startTime = Date.now();
        const dateObj = this.normalizeDate(date);
        const dateStr = this.formatDate(dateObj);

        try {
            // Obtener contexto del usuario (departamento, sucursal, turno)
            const userContext = await this.getUserContext(userId);

            if (!userContext.success) {
                return {
                    isWorking: false,
                    shouldWork: false,
                    reason: userContext.reason,
                    reasonCode: userContext.reasonCode,
                    date: dateStr,
                    processingTime: Date.now() - startTime
                };
            }

            const { user, department, branch, shift } = userContext;

            // ================================================================
            // PASO 1: Verificar feriados nacionales (por país de la sucursal)
            // ================================================================
            const holidayCheck = await this.checkHoliday(
                dateObj,
                branch.country,
                branch.state_province
            );

            if (holidayCheck.isHoliday) {
                // Verificar si hay excepción para este usuario/departamento
                const hasException = await this.checkHolidayException(
                    userId,
                    dateObj,
                    userContext.companyId
                );

                if (!hasException) {
                    return {
                        isWorking: false,
                        shouldWork: false,
                        reason: `Feriado nacional: ${holidayCheck.holidayName}`,
                        reasonCode: 'NATIONAL_HOLIDAY',
                        holiday: holidayCheck,
                        date: dateStr,
                        user: { id: userId, name: user.name },
                        processingTime: Date.now() - startTime
                    };
                }
            }

            // ================================================================
            // PASO 2: Verificar días no laborables de la empresa
            // ================================================================
            const companyNonWorking = await this.checkCompanyNonWorkingDay(
                dateObj,
                userContext.companyId,
                branch.id,
                department.id
            );

            if (companyNonWorking.isNonWorking) {
                return {
                    isWorking: false,
                    shouldWork: false,
                    reason: `Día no laborable: ${companyNonWorking.reason}`,
                    reasonCode: 'COMPANY_NON_WORKING',
                    nonWorkingDay: companyNonWorking,
                    date: dateStr,
                    user: { id: userId, name: user.name },
                    processingTime: Date.now() - startTime
                };
            }

            // ================================================================
            // PASO 3: Calcular según turno (rotativo o fijo)
            // ================================================================
            const shiftResult = await ShiftCalculatorService.calculateUserShiftForDate(
                userId,
                dateObj
            );

            if (!shiftResult.hasAssignment) {
                return {
                    isWorking: false,
                    shouldWork: false,
                    reason: shiftResult.reason || 'Sin turno asignado',
                    reasonCode: 'NO_SHIFT_ASSIGNED',
                    date: dateStr,
                    user: { id: userId, name: user.name },
                    processingTime: Date.now() - startTime
                };
            }

            // ================================================================
            // RESULTADO FINAL
            // ================================================================
            const shouldWork = shiftResult.shouldWork;

            return {
                isWorking: shouldWork,
                shouldWork: shouldWork,
                reason: shiftResult.reason,
                reasonCode: shouldWork ? 'WORKING_DAY' : (shiftResult.isRestDay ? 'REST_DAY' : 'NOT_IN_PHASE'),
                date: dateStr,
                user: {
                    id: userId,
                    name: user.name,
                    departmentId: department.id,
                    branchId: branch.id
                },
                shift: {
                    id: shiftResult.shift?.id,
                    name: shiftResult.shift?.name,
                    type: shiftResult.isRotative ? 'ROTATING' : 'FIXED'
                },
                rotation: shiftResult.isRotative ? {
                    dayInCycle: shiftResult.dayInCycle,
                    totalCycleDays: shiftResult.totalCycleDays,
                    currentPhase: shiftResult.currentGlobalPhase?.name || shiftResult.currentPhase?.type,
                    userPhase: shiftResult.userAssignedPhase,
                    isRestDay: shiftResult.isRestDay
                } : null,
                schedule: shouldWork ? {
                    startTime: shiftResult.shift?.startTime,
                    endTime: shiftResult.shift?.endTime,
                    toleranceMinutes: shiftResult.shift?.toleranceMinutes || 15,
                    earlyEntryMinutes: shiftResult.shift?.earlyEntryMinutes || 30
                } : null,
                processingTime: Date.now() - startTime
            };

        } catch (error) {
            console.error(`[CalendarioLaboral] Error calculando día laboral: ${error.message}`);
            return {
                isWorking: false,
                shouldWork: false,
                reason: `Error del sistema: ${error.message}`,
                reasonCode: 'SYSTEM_ERROR',
                date: dateStr,
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * ========================================================================
     * Generar calendario laboral para un rango de fechas
     * ========================================================================
     */
    async generateCalendar(userId, startDate, endDate, options = {}) {
        const start = this.normalizeDate(startDate);
        const end = this.normalizeDate(endDate);
        const calendar = [];

        const current = new Date(start);
        while (current <= end) {
            const dayResult = await this.isWorkingDay(userId, current, options);
            calendar.push(dayResult);
            current.setDate(current.getDate() + 1);
        }

        // Estadísticas
        const workingDays = calendar.filter(d => d.shouldWork).length;
        const restDays = calendar.filter(d => d.reasonCode === 'REST_DAY').length;
        const holidays = calendar.filter(d => d.reasonCode === 'NATIONAL_HOLIDAY').length;
        const companyDays = calendar.filter(d => d.reasonCode === 'COMPANY_NON_WORKING').length;

        return {
            userId,
            startDate: this.formatDate(start),
            endDate: this.formatDate(end),
            totalDays: calendar.length,
            statistics: {
                workingDays,
                restDays,
                nationalHolidays: holidays,
                companyNonWorkingDays: companyDays
            },
            calendar
        };
    }

    /**
     * ========================================================================
     * Obtener empleados que deben trabajar en una fecha
     * ========================================================================
     */
    async getEmployeesExpectedToWork(companyId, date, filters = {}) {
        const dateObj = this.normalizeDate(date);
        const { sequelize } = require('../config/database');

        try {
            // Obtener usuarios de la empresa con turno asignado
            const [users] = await sequelize.query(`
                SELECT DISTINCT u.id as user_id, u.name, u.email,
                       d.id as department_id, d.name as department_name,
                       b.id as branch_id, b.country, b.state_province
                FROM users u
                JOIN departments d ON u."departmentId" = d.id
                JOIN branches b ON d.branch_id = b.id
                WHERE u.company_id = :companyId
                  AND u.is_active = true
                  AND EXISTS (
                    SELECT 1 FROM user_shift_assignments usa
                    WHERE usa.user_id = u.id
                      AND usa.is_active = true
                      AND usa.join_date <= :date
                  )
                ${filters.departmentId ? 'AND d.id = :departmentId' : ''}
                ${filters.branchId ? 'AND b.id = :branchId' : ''}
            `, {
                replacements: {
                    companyId,
                    date: this.formatDate(dateObj),
                    departmentId: filters.departmentId,
                    branchId: filters.branchId
                }
            });

            // Calcular para cada usuario
            const results = await Promise.all(
                users.map(async (user) => {
                    const result = await this.isWorkingDay(user.user_id, dateObj);
                    return {
                        ...result,
                        user: {
                            id: user.user_id,
                            name: user.name,
                            email: user.email,
                            department: user.department_name,
                            branch: user.country
                        }
                    };
                })
            );

            // Separar por estado
            const expected = results.filter(r => r.shouldWork);
            const notExpected = results.filter(r => !r.shouldWork);

            return {
                date: this.formatDate(dateObj),
                companyId,
                total: results.length,
                expectedToWork: expected.length,
                notExpectedToWork: notExpected.length,
                employees: {
                    working: expected,
                    notWorking: notExpected
                }
            };

        } catch (error) {
            console.error(`[CalendarioLaboral] Error obteniendo empleados: ${error.message}`);
            throw error;
        }
    }

    /**
     * ========================================================================
     * Verificar si es feriado
     * ========================================================================
     */
    async checkHoliday(date, country, stateProvince = null) {
        const dateStr = this.formatDate(date);
        const year = date.getFullYear();

        try {
            // Primero intentar con BD local
            const { Holiday } = require('../config/database');

            if (Holiday) {
                const localHoliday = await Holiday.findOne({
                    where: {
                        country: country,
                        date: dateStr,
                        is_national: true
                    }
                });

                if (localHoliday) {
                    return {
                        isHoliday: true,
                        holidayName: localHoliday.name,
                        source: 'LOCAL_DB',
                        isNational: localHoliday.is_national,
                        isProvincial: localHoliday.is_provincial
                    };
                }
            }

            // Fallback: consultar API externa
            const countryCode = holidayApiService.getCountryCode(country) || country;
            const apiHoliday = await holidayApiService.checkIfHoliday(countryCode, date);

            if (apiHoliday) {
                return {
                    isHoliday: true,
                    holidayName: apiHoliday.localName || apiHoliday.name,
                    source: 'NAGER_API',
                    isNational: apiHoliday.global,
                    isProvincial: !apiHoliday.global
                };
            }

            return { isHoliday: false };

        } catch (error) {
            console.error(`[CalendarioLaboral] Error verificando feriado: ${error.message}`);
            return { isHoliday: false, error: error.message };
        }
    }

    /**
     * ========================================================================
     * Verificar excepción de feriado
     * ========================================================================
     */
    async checkHolidayException(userId, date, companyId) {
        const dateStr = this.formatDate(date);

        try {
            const { sequelize } = require('../config/database');

            // Buscar si hay excepción configurada
            const [exceptions] = await sequelize.query(`
                SELECT id FROM holiday_work_exceptions
                WHERE company_id = :companyId
                  AND date = :date
                  AND (user_id = :userId OR user_id IS NULL)
                  AND is_active = true
                LIMIT 1
            `, {
                replacements: { companyId, date: dateStr, userId }
            });

            return exceptions.length > 0;

        } catch (error) {
            // Tabla puede no existir
            return false;
        }
    }

    /**
     * ========================================================================
     * Verificar día no laborable de la empresa
     * ========================================================================
     */
    async checkCompanyNonWorkingDay(date, companyId, branchId, departmentId) {
        const dateStr = this.formatDate(date);

        try {
            const { sequelize } = require('../config/database');

            const [nonWorking] = await sequelize.query(`
                SELECT id, reason, affects
                FROM company_non_working_days
                WHERE company_id = :companyId
                  AND date = :date
                  AND (
                    affects = 'ALL'
                    OR (affects = 'BRANCH' AND branch_id = :branchId)
                    OR (affects = 'DEPARTMENT' AND department_id = :departmentId)
                  )
                LIMIT 1
            `, {
                replacements: { companyId, date: dateStr, branchId, departmentId }
            });

            if (nonWorking.length > 0) {
                return {
                    isNonWorking: true,
                    reason: nonWorking[0].reason,
                    affects: nonWorking[0].affects
                };
            }

            return { isNonWorking: false };

        } catch (error) {
            // Tabla puede no existir
            return { isNonWorking: false };
        }
    }

    /**
     * ========================================================================
     * Obtener contexto del usuario
     * ========================================================================
     */
    async getUserContext(userId) {
        try {
            const { User, Department, Branch } = require('../config/database');

            const user = await User.findByPk(userId, {
                include: [
                    {
                        model: Department,
                        as: 'department',
                        include: [{
                            model: Branch,
                            as: 'branch'
                        }]
                    }
                ]
            });

            if (!user) {
                return {
                    success: false,
                    reason: 'Usuario no encontrado',
                    reasonCode: 'USER_NOT_FOUND'
                };
            }

            if (!user.is_active) {
                return {
                    success: false,
                    reason: 'Usuario inactivo',
                    reasonCode: 'USER_INACTIVE'
                };
            }

            const department = user.department;
            if (!department) {
                return {
                    success: false,
                    reason: 'Usuario sin departamento asignado',
                    reasonCode: 'NO_DEPARTMENT'
                };
            }

            const branch = department.branch;
            if (!branch) {
                return {
                    success: false,
                    reason: 'Departamento sin sucursal asignada',
                    reasonCode: 'NO_BRANCH'
                };
            }

            return {
                success: true,
                user,
                department,
                branch,
                companyId: user.company_id
            };

        } catch (error) {
            console.error(`[CalendarioLaboral] Error obteniendo contexto: ${error.message}`);
            return {
                success: false,
                reason: `Error obteniendo contexto: ${error.message}`,
                reasonCode: 'CONTEXT_ERROR'
            };
        }
    }

    /**
     * ========================================================================
     * Crear día no laborable manual
     * ========================================================================
     */
    async createNonWorkingDay(companyId, data) {
        const { sequelize } = require('../config/database');

        const {
            date,
            reason,
            affects = 'ALL', // ALL, BRANCH, DEPARTMENT
            branchId = null,
            departmentId = null,
            createdBy
        } = data;

        try {
            const [result] = await sequelize.query(`
                INSERT INTO company_non_working_days
                (company_id, date, reason, affects, branch_id, department_id, created_by, created_at)
                VALUES (:companyId, :date, :reason, :affects, :branchId, :departmentId, :createdBy, NOW())
                RETURNING id
            `, {
                replacements: { companyId, date, reason, affects, branchId, departmentId, createdBy }
            });

            return {
                success: true,
                id: result[0].id,
                message: `Día no laborable creado: ${date} - ${reason}`
            };

        } catch (error) {
            console.error(`[CalendarioLaboral] Error creando día no laborable: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ========================================================================
     * Sincronizar feriados para un país
     * ========================================================================
     */
    async syncHolidays(companyId, countryCode, year) {
        const { Holiday } = require('../config/database');

        if (!Holiday) {
            return {
                success: false,
                error: 'Modelo Holiday no disponible'
            };
        }

        return await holidayApiService.syncHolidaysToDb(Holiday, countryCode, year, {
            replaceExisting: false,
            onlyNational: false
        });
    }

    /**
     * ========================================================================
     * Obtener próximos feriados
     * ========================================================================
     */
    async getUpcomingHolidays(countryCode, days = 30) {
        return await holidayApiService.getUpcomingHolidays(countryCode, days);
    }

    /**
     * ========================================================================
     * HELPERS
     * ========================================================================
     */

    normalizeDate(date) {
        if (date instanceof Date) return date;
        return new Date(date);
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * Obtener estadísticas de calendario para un mes
     */
    async getMonthStatistics(companyId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const { sequelize } = require('../config/database');

        // Obtener feriados del mes
        const [holidays] = await sequelize.query(`
            SELECT date, name
            FROM holidays
            WHERE year = :year
              AND EXTRACT(MONTH FROM date) = :month
            ORDER BY date
        `, {
            replacements: { year, month }
        });

        // Obtener días no laborables de la empresa
        const [nonWorking] = await sequelize.query(`
            SELECT date, reason
            FROM company_non_working_days
            WHERE company_id = :companyId
              AND date BETWEEN :startDate AND :endDate
            ORDER BY date
        `, {
            replacements: {
                companyId,
                startDate: this.formatDate(startDate),
                endDate: this.formatDate(endDate)
            }
        });

        // Calcular días hábiles (excluyendo fines de semana, feriados y días no laborables)
        let workingDays = 0;
        let weekendDays = 0;

        const current = new Date(startDate);
        while (current <= endDate) {
            const dayOfWeek = current.getDay();
            const dateStr = this.formatDate(current);

            if (dayOfWeek === 0 || dayOfWeek === 6) {
                weekendDays++;
            } else {
                const isHoliday = holidays.some(h => h.date === dateStr);
                const isNonWorking = nonWorking.some(n => n.date === dateStr);

                if (!isHoliday && !isNonWorking) {
                    workingDays++;
                }
            }

            current.setDate(current.getDate() + 1);
        }

        return {
            year,
            month,
            totalDays: endDate.getDate(),
            weekendDays,
            nationalHolidays: holidays.length,
            companyNonWorkingDays: nonWorking.length,
            workingDays,
            holidays,
            nonWorkingDays: nonWorking
        };
    }
}

// Singleton
const calendarioLaboralService = new CalendarioLaboralService();

module.exports = calendarioLaboralService;
