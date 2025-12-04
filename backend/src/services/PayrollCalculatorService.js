/**
 * ============================================================================
 * SERVICIO: PayrollCalculatorService
 * ============================================================================
 *
 * Motor de cálculo de liquidación de sueldos 100% automatizado
 *
 * INTEGRA:
 * - Sistema de Asistencia (horas trabajadas, horas extras, inasistencias)
 * - Calendario de Feriados (por país/provincia)
 * - Plantillas Remunerativas (conceptos, deducciones)
 * - Turnos (horarios base, horas nocturnas)
 * - Configuración por Usuario (overrides, bonos)
 *
 * @version 1.0.0
 * @date 2025-11-26
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const conceptDependencyService = require('./ConceptDependencyService');

class PayrollCalculatorService {
    constructor() {
        this.monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    }

    // =========================================================================
    // MÉTODO PRINCIPAL: Calcular liquidación de un empleado
    // =========================================================================
    async calculatePayroll(userId, companyId, year, month, options = {}) {
        console.log(`💰 [PAYROLL] Calculando liquidación para usuario ${userId} - ${month}/${year}`);

        try {
            // 1. Obtener asignación de plantilla del usuario
            const assignment = await this.getUserPayrollAssignment(userId);
            if (!assignment) {
                throw new Error('Usuario no tiene plantilla remunerativa asignada');
            }

            // 2. Obtener plantilla con conceptos
            const template = await this.getTemplateWithConcepts(assignment.template_id);
            if (!template) {
                throw new Error('Plantilla remunerativa no encontrada');
            }

            // 3. Obtener datos del usuario (branch, country, shift)
            const userData = await this.getUserData(userId, companyId);

            // =========================================================================
            // PP-11-IMPL-1: VALIDACIÓN DE TURNO OBLIGATORIO
            // Sin turno asignado, no se puede calcular correctamente:
            // - Horas regulares vs extras
            // - Horas nocturnas
            // - Ausencias (no sabemos cuándo debía trabajar)
            // =========================================================================
            const shiftValidation = await this.validateUserShiftAssignment(userId, companyId, options);
            if (!shiftValidation.valid) {
                throw new Error(shiftValidation.error);
            }

            // =========================================================================
            // PP-11-IMPL-2: VALIDACIÓN DE CATEGORÍA SALARIAL OBLIGATORIA
            // Sin categoría no se puede calcular:
            // - Sueldo base
            // - Adicionales por categoría
            // =========================================================================
            const categoryValidation = await this.validateUserSalaryCategory(userId, assignment, options);
            if (!categoryValidation.valid) {
                throw new Error(categoryValidation.error);
            }

            // 4. Calcular período
            const period = this.calculatePeriod(year, month, template.pay_frequency);

            // 5. Obtener feriados del período
            const holidays = await this.getHolidaysForPeriod(
                userData.country,
                userData.state_province,
                period.startDate,
                period.endDate
            );

            // 6. Obtener registros de asistencia
            const attendanceData = await this.getAttendanceData(
                userId,
                companyId,
                period.startDate,
                period.endDate
            );

            // 6.5. Obtener ausencias justificadas (vacaciones, licencias médicas)
            const justifiedAbsences = await this.getJustifiedAbsences(
                userId,
                companyId,
                period.startDate,
                period.endDate
            );

            // 7. Calcular horas trabajadas, extras, nocturnas, inasistencias
            const hoursAnalysis = this.analyzeWorkHours(
                attendanceData,
                template,
                holidays,
                userData.shift,
                justifiedAbsences
            );

            // 8. Obtener overrides del usuario
            const userOverrides = await this.getUserConceptOverrides(userId, assignment.id);

            // 9. Obtener bonos activos del usuario
            const userBonuses = await this.getActiveBonuses(userId, companyId, period.startDate);

            // 10. Calcular cada concepto (con evaluación de dependencias)
            const payrollPeriod = `${year}-${String(month).padStart(2, '0')}`;
            const calculatedConcepts = await this.calculateAllConcepts(
                template.concepts,
                assignment,
                hoursAnalysis,
                userOverrides,
                userBonuses,
                holidays.length,
                {
                    userId,
                    companyId,
                    payrollPeriod
                }
            );

            // 11. Calcular totales
            const totals = this.calculateTotals(calculatedConcepts);

            // 12. Generar resultado
            const result = {
                userId,
                companyId,
                period: {
                    year,
                    month,
                    monthName: this.monthNames[month - 1],
                    startDate: period.startDate,
                    endDate: period.endDate,
                    payFrequency: template.pay_frequency
                },
                employee: {
                    name: userData.fullName,
                    employeeId: userData.employeeId,
                    branch: userData.branchName,
                    department: userData.departmentName,
                    position: userData.position
                },
                template: {
                    id: template.id,
                    name: template.template_name,
                    laborAgreement: template.labor_agreement_name
                },
                workAnalysis: {
                    ...hoursAnalysis,
                    holidaysInPeriod: holidays.length,
                    holidaysList: holidays.map(h => ({ date: h.holiday_date, name: h.holiday_name }))
                },
                concepts: calculatedConcepts,
                totals,
                // Información de evaluación de dependencias (Benefits Engine)
                dependencyAnalysis: calculatedConcepts.dependencyAnalysis || {
                    skippedConcepts: [],
                    warnings: [],
                    totalEvaluated: 0,
                    totalApplied: 0
                },
                calculatedAt: new Date(),
                status: 'calculated'
            };

            console.log(`✅ [PAYROLL] Liquidación calculada: Bruto ${totals.grossTotal}, Neto ${totals.netSalary}`);

            return result;

        } catch (error) {
            console.error(`❌ [PAYROLL] Error calculando liquidación:`, error.message);
            throw error;
        }
    }

    // =========================================================================
    // OBTENER ASIGNACIÓN DE PLANTILLA DEL USUARIO
    // =========================================================================
    async getUserPayrollAssignment(userId) {
        const query = `
            SELECT upa.*,
                   pt.template_name, pt.pay_frequency, pt.calculation_basis,
                   pt.work_hours_per_day, pt.work_days_per_week, pt.work_hours_per_month,
                   sc.category_name, sc.recommended_base_salary
            FROM user_payroll_assignment upa
            JOIN payroll_templates pt ON upa.template_id = pt.id
            LEFT JOIN salary_categories_v2 sc ON upa.category_id = sc.id
            WHERE upa.user_id = $1 AND upa.is_current = true
            LIMIT 1
        `;
        const [result] = await sequelize.query(query, { bind: [userId] });
        return result[0] || null;
    }

    // =========================================================================
    // OBTENER PLANTILLA CON CONCEPTOS
    // =========================================================================
    async getTemplateWithConcepts(templateId) {
        // Plantilla
        const templateQuery = `
            SELECT pt.*,
                   la.name as labor_agreement_name, la.code as labor_agreement_code,
                   la.overtime_50_multiplier, la.overtime_100_multiplier, la.night_shift_multiplier,
                   pc.country_name, pc.currency_code, pc.currency_symbol,
                   pc.aguinaldo_enabled
            FROM payroll_templates pt
            LEFT JOIN labor_agreements_v2 la ON pt.labor_agreement_id = la.id
            LEFT JOIN payroll_countries pc ON pt.country_id = pc.id
            WHERE pt.id = $1
        `;
        const [templateResult] = await sequelize.query(templateQuery, { bind: [templateId] });

        if (!templateResult[0]) return null;

        // Conceptos
        const conceptsQuery = `
            SELECT ptc.*, pct.type_code, pct.type_name,
                   pct.affects_gross, pct.affects_net, pct.is_taxable,
                   pct.is_deduction, pct.is_employer_cost
            FROM payroll_template_concepts ptc
            JOIN payroll_concept_types pct ON ptc.concept_type_id = pct.id
            WHERE ptc.template_id = $1 AND ptc.is_active = true
            ORDER BY pct.display_order, ptc.display_order
        `;
        const [concepts] = await sequelize.query(conceptsQuery, { bind: [templateId] });

        return {
            ...templateResult[0],
            concepts
        };
    }

    // =========================================================================
    // OBTENER DATOS DEL USUARIO
    // =========================================================================
    async getUserData(userId, companyId) {
        const query = `
            SELECT
                u.user_id, u."employeeId", u."firstName", u."lastName", u."position",
                cb.id as branch_id, cb.branch_name, cb.country_id,
                pc.country_code as country, cb.state_province,
                d.name as department_name,
                s.name as shift_name, s.start_time as shift_start, s.end_time as shift_end,
                s.break_minutes, s.is_night_shift
            FROM users u
            LEFT JOIN company_branches cb ON u.branch_id = cb.id
            LEFT JOIN payroll_countries pc ON cb.country_id = pc.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN user_shift_assignments usa ON usa.user_id = u.user_id AND usa.is_primary = true
            LEFT JOIN shifts s ON usa.shift_id = s.id
            WHERE u.user_id = $1 AND u.company_id = $2
        `;
        const [result] = await sequelize.query(query, { bind: [userId, companyId] });
        const user = result[0] || {};

        return {
            ...user,
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            country: user.country || 'ARG',  // Default Argentina
            state_province: user.state_province,
            shift: {
                name: user.shift_name,
                startTime: user.shift_start,
                endTime: user.shift_end,
                breakMinutes: user.break_minutes || 0,
                isNightShift: user.is_night_shift || false
            }
        };
    }

    // =========================================================================
    // PP-11-IMPL-1: VALIDAR ASIGNACIÓN DE TURNO OBLIGATORIA
    // =========================================================================
    /**
     * Valida que el usuario tenga un turno asignado antes de calcular liquidación.
     *
     * CRÍTICO: Sin turno asignado no se puede calcular correctamente:
     * - Horas regulares vs extras (no sabemos horario base)
     * - Horas nocturnas (no sabemos si trabaja de noche)
     * - Ausencias (no sabemos cuándo debía trabajar)
     *
     * @param {string} userId - UUID del usuario
     * @param {number} companyId - ID de la empresa
     * @param {object} options - Opciones de validación
     * @param {boolean} options.allowMissingShift - Si es true, permite usuarios sin turno (WARNING pero continúa)
     * @returns {object} { valid: boolean, error?: string, warning?: string, shiftInfo?: object }
     */
    async validateUserShiftAssignment(userId, companyId, options = {}) {
        try {
            // Buscar asignación de turno activa
            const query = `
                SELECT
                    usa.id as assignment_id,
                    usa.shift_id,
                    usa.is_primary,
                    usa.effective_from,
                    usa.effective_to,
                    s.id as shift_table_id,
                    s.name as shift_name,
                    s.start_time,
                    s.end_time,
                    s.break_minutes,
                    s.is_night_shift,
                    s.is_rotative,
                    s.total_weekly_hours
                FROM user_shift_assignments usa
                JOIN shifts s ON usa.shift_id = s.id
                WHERE usa.user_id = $1
                AND usa.is_primary = true
                AND (usa.effective_to IS NULL OR usa.effective_to >= CURRENT_DATE)
                ORDER BY usa.created_at DESC
                LIMIT 1
            `;

            const [result] = await sequelize.query(query, { bind: [userId] });

            if (!result || result.length === 0) {
                // No tiene turno asignado
                if (options.allowMissingShift === true) {
                    // Modo permisivo: WARNING pero continúa
                    console.log(`⚠️ [PAYROLL] Usuario ${userId} sin turno asignado. Usando valores por defecto.`);
                    return {
                        valid: true,
                        warning: 'Usuario sin turno asignado. Cálculos basados en valores por defecto (8 hs/día, horario diurno).',
                        shiftInfo: {
                            name: 'Sin turno (default)',
                            startTime: '09:00',
                            endTime: '18:00',
                            breakMinutes: 60,
                            isNightShift: false,
                            isDefault: true
                        }
                    };
                }

                // Modo estricto (default): ERROR
                console.log(`❌ [PAYROLL] Usuario ${userId} sin turno asignado. Liquidación BLOQUEADA.`);
                return {
                    valid: false,
                    error: `Usuario sin turno asignado. Debe asignar un turno antes de calcular liquidación. ` +
                           `Vaya a: Gestión de Turnos → Asignar Turnos → Seleccione este usuario.`,
                    errorCode: 'SHIFT_REQUIRED',
                    userId
                };
            }

            const shift = result[0];

            // Validar que el turno tenga datos mínimos
            if (!shift.start_time || !shift.end_time) {
                return {
                    valid: false,
                    error: `Turno "${shift.shift_name}" no tiene horarios definidos. ` +
                           `Configure start_time y end_time en el turno.`,
                    errorCode: 'SHIFT_INCOMPLETE',
                    shiftId: shift.shift_id
                };
            }

            console.log(`✅ [PAYROLL] Usuario ${userId} tiene turno asignado: ${shift.shift_name}`);

            return {
                valid: true,
                shiftInfo: {
                    assignmentId: shift.assignment_id,
                    shiftId: shift.shift_id,
                    name: shift.shift_name,
                    startTime: shift.start_time,
                    endTime: shift.end_time,
                    breakMinutes: shift.break_minutes || 0,
                    isNightShift: shift.is_night_shift || false,
                    isRotative: shift.is_rotative || false,
                    totalWeeklyHours: shift.total_weekly_hours,
                    effectiveFrom: shift.effective_from,
                    effectiveTo: shift.effective_to
                }
            };

        } catch (error) {
            // Si falla la query (ej: tabla no existe), permitir pero con warning
            console.log(`⚠️ [PAYROLL] Error validando turno: ${error.message}`);

            if (options.allowMissingShift === true) {
                return {
                    valid: true,
                    warning: `No se pudo verificar turno: ${error.message}. Usando valores por defecto.`,
                    shiftInfo: {
                        name: 'Sin turno (error)',
                        startTime: '09:00',
                        endTime: '18:00',
                        breakMinutes: 60,
                        isNightShift: false,
                        isDefault: true
                    }
                };
            }

            return {
                valid: false,
                error: `Error verificando turno del usuario: ${error.message}`,
                errorCode: 'SHIFT_VALIDATION_ERROR'
            };
        }
    }

    // =========================================================================
    // PP-11-IMPL-2: VALIDAR CATEGORÍA SALARIAL OBLIGATORIA
    // =========================================================================
    /**
     * Valida que el usuario tenga categoría salarial y sueldo base definido.
     *
     * CRÍTICO: Sin categoría no se puede calcular:
     * - Sueldo base (base para todos los cálculos)
     * - Adicionales por categoría (antigüedad, título, etc.)
     * - Deducciones porcentuales (dependen del bruto)
     *
     * @param {string} userId - UUID del usuario
     * @param {object} assignment - Asignación de plantilla del usuario
     * @param {object} options - Opciones de validación
     * @param {boolean} options.allowMissingCategory - Si es true, permite sin categoría (WARNING)
     * @returns {object} { valid: boolean, error?: string, warning?: string, categoryInfo?: object }
     */
    async validateUserSalaryCategory(userId, assignment, options = {}) {
        try {
            // Verificar que tenga asignación de plantilla (ya validado antes, pero por seguridad)
            if (!assignment) {
                return {
                    valid: false,
                    error: 'Usuario no tiene plantilla remunerativa asignada.',
                    errorCode: 'TEMPLATE_REQUIRED'
                };
            }

            // Verificar categoría salarial
            const hasCategory = assignment.category_id && assignment.category_name;
            const hasBaseSalary = assignment.base_salary && parseFloat(assignment.base_salary) > 0;
            const hasHourlyRate = assignment.hourly_rate && parseFloat(assignment.hourly_rate) > 0;

            if (!hasCategory) {
                if (options.allowMissingCategory === true) {
                    console.log(`⚠️ [PAYROLL] Usuario ${userId} sin categoría salarial. Usando sueldo base directo.`);

                    // Sin categoría pero ¿tiene sueldo base?
                    if (!hasBaseSalary) {
                        return {
                            valid: false,
                            error: `Usuario sin categoría salarial NI sueldo base definido. ` +
                                   `Vaya a: Liquidaciones → Asignar Plantilla → Configure categoría o sueldo base.`,
                            errorCode: 'SALARY_REQUIRED'
                        };
                    }

                    return {
                        valid: true,
                        warning: 'Usuario sin categoría salarial. Usando sueldo base directo sin adicionales de categoría.',
                        categoryInfo: {
                            name: 'Sin categoría',
                            baseSalary: parseFloat(assignment.base_salary),
                            hourlyRate: hasHourlyRate ? parseFloat(assignment.hourly_rate) : null,
                            isDefault: true
                        }
                    };
                }

                // Modo estricto (default): ERROR
                console.log(`❌ [PAYROLL] Usuario ${userId} sin categoría salarial. Liquidación BLOQUEADA.`);
                return {
                    valid: false,
                    error: `Usuario sin categoría salarial asignada. ` +
                           `Vaya a: Liquidaciones → Asignar Plantilla → Seleccione una categoría para este usuario.`,
                    errorCode: 'CATEGORY_REQUIRED',
                    userId
                };
            }

            // Tiene categoría, verificar sueldo base
            if (!hasBaseSalary) {
                // Usar recommended_base_salary de la categoría si existe
                if (assignment.recommended_base_salary && parseFloat(assignment.recommended_base_salary) > 0) {
                    console.log(`✅ [PAYROLL] Usuario ${userId} usando sueldo recomendado de categoría: ${assignment.recommended_base_salary}`);
                    return {
                        valid: true,
                        warning: 'Usuario sin sueldo base específico. Usando sueldo recomendado de la categoría.',
                        categoryInfo: {
                            id: assignment.category_id,
                            name: assignment.category_name,
                            baseSalary: parseFloat(assignment.recommended_base_salary),
                            hourlyRate: hasHourlyRate ? parseFloat(assignment.hourly_rate) : null,
                            usingRecommended: true
                        }
                    };
                }

                // Sin sueldo base ni recomendado
                return {
                    valid: false,
                    error: `Usuario tiene categoría "${assignment.category_name}" pero sin sueldo base definido. ` +
                           `Configure el sueldo base en la asignación del usuario.`,
                    errorCode: 'BASE_SALARY_REQUIRED',
                    categoryId: assignment.category_id
                };
            }

            console.log(`✅ [PAYROLL] Usuario ${userId} tiene categoría: ${assignment.category_name} - Base: ${assignment.base_salary}`);

            return {
                valid: true,
                categoryInfo: {
                    id: assignment.category_id,
                    name: assignment.category_name,
                    baseSalary: parseFloat(assignment.base_salary),
                    hourlyRate: hasHourlyRate ? parseFloat(assignment.hourly_rate) : null,
                    recommendedSalary: assignment.recommended_base_salary ? parseFloat(assignment.recommended_base_salary) : null
                }
            };

        } catch (error) {
            console.log(`⚠️ [PAYROLL] Error validando categoría: ${error.message}`);

            if (options.allowMissingCategory === true) {
                return {
                    valid: true,
                    warning: `No se pudo verificar categoría: ${error.message}`,
                    categoryInfo: null
                };
            }

            return {
                valid: false,
                error: `Error verificando categoría salarial: ${error.message}`,
                errorCode: 'CATEGORY_VALIDATION_ERROR'
            };
        }
    }

    // =========================================================================
    // CALCULAR PERÍODO SEGÚN FRECUENCIA DE PAGO
    // =========================================================================
    calculatePeriod(year, month, payFrequency) {
        let startDate, endDate;

        switch (payFrequency) {
            case 'monthly':
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0);  // Último día del mes
                break;
            case 'biweekly':
            case 'semimonthly':
                // Primera quincena (1-15) o segunda (16-fin)
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month - 1, 15);
                break;
            case 'weekly':
                // Última semana del mes (simplificado)
                endDate = new Date(year, month, 0);
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - 6);
                break;
            default:
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0);
        }

        return { startDate, endDate };
    }

    // =========================================================================
    // OBTENER FERIADOS DEL PERÍODO
    // =========================================================================
    async getHolidaysForPeriod(country, stateProvince, startDate, endDate) {
        const query = `
            SELECT * FROM get_holidays_for_location($1, $2, $3, $4)
        `;
        try {
            const [holidays] = await sequelize.query(query, {
                bind: [country, stateProvince, startDate, endDate]
            });
            return holidays || [];
        } catch (error) {
            // Si la función no existe, query directo
            const fallbackQuery = `
                SELECT date as holiday_date, name as holiday_name, is_national, is_provincial
                FROM holidays
                WHERE country = $1
                AND ($2 IS NULL OR state_province IS NULL OR state_province = $2)
                AND date BETWEEN $3 AND $4
                ORDER BY date
            `;
            const [holidays] = await sequelize.query(fallbackQuery, {
                bind: [country, stateProvince, startDate, endDate]
            });
            return holidays || [];
        }
    }

    // =========================================================================
    // OBTENER DATOS DE ASISTENCIA
    // =========================================================================
    async getAttendanceData(userId, companyId, startDate, endDate) {
        const query = `
            SELECT
                id, check_in, check_out, break_out, break_in,
                DATE(check_in) as work_date,
                EXTRACT(EPOCH FROM (COALESCE(check_out, check_in) - check_in)) / 3600 as raw_hours,
                EXTRACT(EPOCH FROM (COALESCE(break_in, break_out) - break_out)) / 3600 as break_hours,
                origin_type, status
            FROM attendances
            WHERE user_id = $1
            AND company_id = $2
            AND check_in BETWEEN $3 AND $4
            ORDER BY check_in
        `;

        try {
            const [records] = await sequelize.query(query, {
                bind: [userId, companyId, startDate, endDate]
            });
            return records || [];
        } catch (error) {
            console.log(`⚠️ [PAYROLL] Error obteniendo asistencia: ${error.message}`);
            // Retornar array vacío si tabla no existe
            return [];
        }
    }

    // =========================================================================
    // ANALIZAR HORAS TRABAJADAS
    // =========================================================================
    analyzeWorkHours(attendanceRecords, template, holidays, shift, justifiedAbsences = { vacationDays: 0, medicalDays: 0, otherDays: 0 }) {
        const holidayDates = new Set(holidays.map(h =>
            new Date(h.holiday_date).toISOString().split('T')[0]
        ));

        let totalWorkedHours = 0;
        let regularHours = 0;
        let overtime50Hours = 0;
        let overtime100Hours = 0;
        let nightHours = 0;
        let holidayHours = 0;
        let workedDays = 0;
        let absentDays = 0;

        const dailyThreshold = template.work_hours_per_day || 8;
        const overtime50Threshold = template.overtime_50_after_hours || 8;
        const overtime100Threshold = template.overtime_100_after_hours || 12;
        const overtime50Multiplier = template.overtime_50_multiplier || 1.5;
        const overtime100Multiplier = template.overtime_100_multiplier || 2.0;
        const nightMultiplier = template.night_shift_multiplier || 1.08; // 8% adicional según LCT Argentina

        // Constantes para horario nocturno (Argentina: 21:00 - 06:00)
        const NIGHT_START_HOUR = 21;
        const NIGHT_END_HOUR = 6;

        // Agrupar por día
        const byDay = {};
        attendanceRecords.forEach(record => {
            const date = record.work_date;
            if (!byDay[date]) {
                byDay[date] = { records: [], totalHours: 0, nightHours: 0 };
            }
            const hours = (parseFloat(record.raw_hours) || 0) - (parseFloat(record.break_hours) || 0);
            byDay[date].records.push(record);
            byDay[date].totalHours += Math.max(0, hours);

            // CÁLCULO DE HORAS NOCTURNAS (FIX del bug - antes siempre era 0)
            if (record.check_in && record.check_out) {
                const dayNightHours = this.calculateNightHours(record.check_in, record.check_out, NIGHT_START_HOUR, NIGHT_END_HOUR);
                byDay[date].nightHours += dayNightHours;
            }
        });

        // Calcular por día
        Object.entries(byDay).forEach(([date, day]) => {
            const isHoliday = holidayDates.has(date);
            const hours = day.totalHours;
            workedDays++;
            totalWorkedHours += hours;

            // Acumular horas nocturnas del día
            nightHours += day.nightHours;

            if (isHoliday) {
                // Horas en feriado pagan al 100%
                holidayHours += hours;
                overtime100Hours += hours;
            } else if (hours > overtime100Threshold) {
                // Más de 12 horas: primeras 8 normales, 8-12 al 50%, resto al 100%
                regularHours += overtime50Threshold;
                overtime50Hours += (overtime100Threshold - overtime50Threshold);
                overtime100Hours += (hours - overtime100Threshold);
            } else if (hours > overtime50Threshold) {
                // 8-12 horas: primeras 8 normales, resto al 50%
                regularHours += overtime50Threshold;
                overtime50Hours += (hours - overtime50Threshold);
            } else {
                // Menos de 8 horas: todas normales
                regularHours += hours;
            }
        });

        // Calcular días laborables del período
        const expectedWorkDays = template.work_days_per_week ?
            Math.round(template.work_days_per_week * 4.33) : 22;  // ~22 días/mes

        // Calcular ausencias DESCONTANDO las justificadas (vacaciones, licencias médicas)
        const totalJustifiedDays = (justifiedAbsences.vacationDays || 0) +
                                   (justifiedAbsences.medicalDays || 0) +
                                   (justifiedAbsences.otherDays || 0);

        // Ausencias injustificadas = días esperados - trabajados - feriados - justificadas
        const rawAbsentDays = expectedWorkDays - workedDays - holidays.length - totalJustifiedDays;
        absentDays = Math.max(0, rawAbsentDays);

        return {
            totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
            regularHours: Math.round(regularHours * 100) / 100,
            overtime50Hours: Math.round(overtime50Hours * 100) / 100,
            overtime100Hours: Math.round(overtime100Hours * 100) / 100,
            nightHours: Math.round(nightHours * 100) / 100,
            holidayHours: Math.round(holidayHours * 100) / 100,
            workedDays,
            absentDays,
            expectedWorkDays,
            attendanceRecordCount: attendanceRecords.length,
            overtime50Multiplier,
            overtime100Multiplier,
            nightMultiplier,
            // Desglose de ausencias justificadas (para transparencia)
            justifiedAbsences: {
                vacationDays: justifiedAbsences.vacationDays || 0,
                medicalDays: justifiedAbsences.medicalDays || 0,
                otherDays: justifiedAbsences.otherDays || 0,
                total: totalJustifiedDays
            }
        };
    }

    // =========================================================================
    // CALCULAR HORAS NOCTURNAS (21:00 - 06:00 según Ley de Contrato de Trabajo Argentina)
    // =========================================================================
    calculateNightHours(checkIn, checkOut, nightStartHour = 21, nightEndHour = 6) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return 0;
        }

        let nightMinutes = 0;
        let current = new Date(start);

        // Iterar minuto a minuto para calcular horas nocturnas
        while (current < end) {
            const hour = current.getHours();
            // Horario nocturno: 21:00-23:59 o 00:00-05:59
            if (hour >= nightStartHour || hour < nightEndHour) {
                nightMinutes++;
            }
            current = new Date(current.getTime() + 60000); // +1 minuto
        }

        // Convertir minutos a horas con 2 decimales
        return Math.round((nightMinutes / 60) * 100) / 100;
    }

    // =========================================================================
    // OBTENER AUSENCIAS JUSTIFICADAS (Vacaciones, Licencias Médicas, Otras)
    // Elimina duplicación: el usuario YA cargó la vacación/licencia aprobada
    // No necesita marcar manualmente "ausencia justificada" en liquidación
    // =========================================================================
    async getJustifiedAbsences(userId, companyId, startDate, endDate) {
        let vacationDays = 0;
        let medicalDays = 0;
        let otherDays = 0;

        try {
            // 1. VACACIONES APROBADAS
            const vacationsQuery = `
                SELECT id, start_date, end_date, days_requested
                FROM vacation_requests
                WHERE user_id = $1
                AND company_id = $2
                AND status = 'approved'
                AND (
                    (start_date <= $4 AND end_date >= $3)
                    OR (start_date BETWEEN $3 AND $4)
                    OR (end_date BETWEEN $3 AND $4)
                )
            `;
            const [vacations] = await sequelize.query(vacationsQuery, {
                bind: [userId, companyId, startDate, endDate]
            });

            vacations.forEach(v => {
                // Contar días que caen dentro del período
                const vStart = new Date(v.start_date) < new Date(startDate) ? new Date(startDate) : new Date(v.start_date);
                const vEnd = new Date(v.end_date) > new Date(endDate) ? new Date(endDate) : new Date(v.end_date);
                const days = this.countWorkDays(vStart, vEnd);
                vacationDays += days;
            });

            // 2. LICENCIAS MÉDICAS APROBADAS
            const medicalQuery = `
                SELECT id, start_date, end_date, days_off
                FROM medical_certificates
                WHERE user_id = $1
                AND company_id = $2
                AND status = 'approved'
                AND (
                    (start_date <= $4 AND end_date >= $3)
                    OR (start_date BETWEEN $3 AND $4)
                    OR (end_date BETWEEN $3 AND $4)
                )
            `;
            const [medicals] = await sequelize.query(medicalQuery, {
                bind: [userId, companyId, startDate, endDate]
            });

            medicals.forEach(m => {
                const mStart = new Date(m.start_date) < new Date(startDate) ? new Date(startDate) : new Date(m.start_date);
                const mEnd = new Date(m.end_date) > new Date(endDate) ? new Date(endDate) : new Date(m.end_date);
                const days = this.countWorkDays(mStart, mEnd);
                medicalDays += days;
            });

            // 3. OTROS PERMISOS APROBADOS (si existe la tabla)
            try {
                const otherQuery = `
                    SELECT id, start_date, end_date
                    FROM leave_requests
                    WHERE user_id = $1
                    AND company_id = $2
                    AND status = 'approved'
                    AND (
                        (start_date <= $4 AND end_date >= $3)
                        OR (start_date BETWEEN $3 AND $4)
                        OR (end_date BETWEEN $3 AND $4)
                    )
                `;
                const [others] = await sequelize.query(otherQuery, {
                    bind: [userId, companyId, startDate, endDate]
                });

                others.forEach(o => {
                    const oStart = new Date(o.start_date) < new Date(startDate) ? new Date(startDate) : new Date(o.start_date);
                    const oEnd = new Date(o.end_date) > new Date(endDate) ? new Date(endDate) : new Date(o.end_date);
                    const days = this.countWorkDays(oStart, oEnd);
                    otherDays += days;
                });
            } catch (e) {
                // Tabla leave_requests no existe, ignorar
            }

        } catch (error) {
            console.log(`⚠️ [PAYROLL] Error obteniendo ausencias justificadas: ${error.message}`);
            // Retornar 0 si las tablas no existen
        }

        return { vacationDays, medicalDays, otherDays };
    }

    // =========================================================================
    // CONTAR DÍAS LABORABLES ENTRE DOS FECHAS (excluyendo fines de semana)
    // =========================================================================
    countWorkDays(startDate, endDate) {
        let count = 0;
        let current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            const day = current.getDay();
            // 0 = Domingo, 6 = Sábado
            if (day !== 0 && day !== 6) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    }

    // =========================================================================
    // OBTENER OVERRIDES DE CONCEPTOS DEL USUARIO
    // =========================================================================
    async getUserConceptOverrides(userId, assignmentId) {
        const query = `
            SELECT * FROM user_payroll_concept_overrides
            WHERE user_id = $1 AND assignment_id = $2 AND is_active = true
        `;
        const [overrides] = await sequelize.query(query, { bind: [userId, assignmentId] });
        return overrides || [];
    }

    // =========================================================================
    // OBTENER BONOS ACTIVOS DEL USUARIO
    // =========================================================================
    async getActiveBonuses(userId, companyId, periodDate) {
        const query = `
            SELECT upb.*, pct.type_code, pct.affects_gross, pct.is_taxable
            FROM user_payroll_bonuses upb
            JOIN payroll_concept_types pct ON upb.concept_type_id = pct.id
            WHERE upb.user_id = $1
            AND upb.company_id = $2
            AND upb.is_active = true
            AND upb.effective_from <= $3
            AND (upb.effective_to IS NULL OR upb.effective_to >= $3)
            AND (
                upb.frequency = 'monthly'
                OR (upb.frequency = 'once' AND upb.last_payment_date IS NULL)
                OR (upb.frequency = 'quarterly' AND (upb.next_payment_date IS NULL OR upb.next_payment_date <= $3))
            )
        `;
        const [bonuses] = await sequelize.query(query, { bind: [userId, companyId, periodDate] });
        return bonuses || [];
    }

    // =========================================================================
    // CALCULAR TODOS LOS CONCEPTOS (con evaluación de dependencias)
    // =========================================================================
    async calculateAllConcepts(templateConcepts, assignment, hoursAnalysis, userOverrides, userBonuses, holidayCount, context = {}) {
        const earnings = [];
        const deductions = [];
        const nonRemunerative = [];
        const employerCosts = [];
        const skippedConcepts = [];  // Conceptos omitidos por dependencias no cumplidas
        const dependencyWarnings = [];  // Advertencias de dependencias

        const baseSalary = parseFloat(assignment.base_salary) || 0;
        const hourlyRate = parseFloat(assignment.hourly_rate) || (baseSalary / (assignment.work_hours_per_month || 200));
        const { userId, companyId, payrollPeriod } = context;

        // Procesar conceptos de la plantilla
        for (const concept of templateConcepts) {
            // Verificar override
            const override = userOverrides.find(o => o.template_concept_id === concept.id);

            // Calcular monto base
            let amount = this.calculateConceptAmount(concept, {
                baseSalary,
                hourlyRate,
                hoursAnalysis,
                override,
                holidayCount
            });

            // =====================================================================
            // EVALUACIÓN DE DEPENDENCIAS (Benefits Engine Integration)
            // =====================================================================
            let dependencyResult = { applies: true, amount, reason: null, evaluations: [] };

            if (userId && companyId && amount > 0) {
                try {
                    dependencyResult = await conceptDependencyService.evaluateConceptDependencies(
                        companyId,
                        userId,
                        concept.id,
                        amount,
                        payrollPeriod
                    );

                    // Aplicar resultado de evaluación
                    if (!dependencyResult.applies) {
                        // Concepto NO aplica - omitir
                        skippedConcepts.push({
                            conceptId: concept.id,
                            conceptCode: concept.concept_code,
                            conceptName: concept.concept_name,
                            originalAmount: amount,
                            reason: dependencyResult.reason,
                            evaluations: dependencyResult.evaluations
                        });
                        console.log(`⏭️ [PAYROLL] Concepto ${concept.concept_code} OMITIDO: ${dependencyResult.reason}`);
                        continue;  // Saltar este concepto
                    }

                    // Aplicar monto ajustado (puede ser reducido proporcionalmente)
                    if (dependencyResult.amount !== amount) {
                        console.log(`📉 [PAYROLL] Concepto ${concept.concept_code} REDUCIDO: ${amount} → ${dependencyResult.amount}`);
                        amount = dependencyResult.amount;
                    }

                    // Registrar advertencias si hay
                    if (dependencyResult.reason && dependencyResult.reason.startsWith('Advertencia:')) {
                        dependencyWarnings.push({
                            conceptCode: concept.concept_code,
                            warning: dependencyResult.reason
                        });
                    }
                } catch (depError) {
                    // Si falla la evaluación de dependencias, aplicar concepto normalmente
                    console.log(`⚠️ [PAYROLL] Error evaluando dependencias para ${concept.concept_code}: ${depError.message}`);
                }
            }

            const calculatedConcept = {
                id: concept.id,
                code: concept.concept_code,
                name: concept.concept_name,
                shortName: concept.short_name,
                typeCode: concept.type_code,
                calculationType: concept.calculation_type,
                amount: Math.round(amount * 100) / 100,
                isOverride: !!override,
                isTaxable: concept.is_taxable,
                affectsGross: concept.affects_gross,
                displayOrder: concept.display_order,
                // Entidad de destino para consolidación
                entityId: concept.entity_id || null,
                entityLabel: concept.entity_label || null,
                // Info de dependencias evaluadas
                dependencyInfo: dependencyResult.evaluations.length > 0 ? {
                    evaluated: true,
                    passed: dependencyResult.applies,
                    evaluations: dependencyResult.evaluations
                } : null
            };

            // Clasificar
            if (concept.is_employer_cost) {
                employerCosts.push(calculatedConcept);
            } else if (concept.is_deduction) {
                deductions.push(calculatedConcept);
            } else if (!concept.is_taxable) {
                nonRemunerative.push(calculatedConcept);
            } else {
                earnings.push(calculatedConcept);
            }
        }

        // Procesar bonos del usuario
        for (const bonus of userBonuses) {
            const amount = bonus.is_percentage ?
                (baseSalary * (parseFloat(bonus.percentage) / 100)) :
                parseFloat(bonus.amount) || 0;

            const bonusConcept = {
                id: `bonus_${bonus.id}`,
                code: bonus.bonus_code,
                name: bonus.bonus_name,
                typeCode: bonus.type_code,
                calculationType: 'bonus',
                amount: Math.round(amount * 100) / 100,
                isBonus: true,
                isTaxable: bonus.is_taxable,
                affectsGross: bonus.affects_gross
            };

            if (bonus.affects_gross) {
                earnings.push(bonusConcept);
            } else {
                nonRemunerative.push(bonusConcept);
            }
        }

        // Log resumen de dependencias
        if (skippedConcepts.length > 0) {
            console.log(`📋 [PAYROLL] Resumen dependencias: ${skippedConcepts.length} conceptos omitidos por no cumplir requisitos`);
        }

        return {
            earnings,
            deductions,
            nonRemunerative,
            employerCosts,
            // Información adicional de dependencias (para transparencia en recibo)
            dependencyAnalysis: {
                skippedConcepts,
                warnings: dependencyWarnings,
                totalEvaluated: templateConcepts.length,
                totalApplied: templateConcepts.length - skippedConcepts.length
            }
        };
    }

    // =========================================================================
    // CALCULAR MONTO DE UN CONCEPTO
    // =========================================================================
    calculateConceptAmount(concept, context) {
        const { baseSalary, hourlyRate, hoursAnalysis, override, holidayCount } = context;

        // Si hay override, usar ese valor
        if (override) {
            if (override.is_percentage) {
                return baseSalary * (parseFloat(override.override_percentage) / 100);
            }
            return parseFloat(override.override_value) || 0;
        }

        const defaultValue = parseFloat(concept.default_value) || 0;

        switch (concept.calculation_type) {
            case 'fixed':
                return defaultValue;

            case 'percentage':
                const baseForPercentage = concept.percentage_base === 'gross' ?
                    baseSalary : baseSalary;
                return baseForPercentage * (defaultValue / 100);

            case 'hours':
                // Calcular según tipo de horas
                if (concept.concept_code.includes('OVERTIME_50')) {
                    return hoursAnalysis.overtime50Hours * hourlyRate * hoursAnalysis.overtime50Multiplier;
                }
                if (concept.concept_code.includes('OVERTIME_100')) {
                    return hoursAnalysis.overtime100Hours * hourlyRate * hoursAnalysis.overtime100Multiplier;
                }
                if (concept.concept_code.includes('NIGHT')) {
                    return hoursAnalysis.nightHours * hourlyRate * 1.2;  // 20% adicional nocturno
                }
                if (concept.concept_code.includes('HOLIDAY')) {
                    return hoursAnalysis.holidayHours * hourlyRate * 2;  // Doble en feriado
                }
                return hoursAnalysis.regularHours * hourlyRate;

            case 'days':
                const dailyRate = baseSalary / 30;
                return defaultValue * dailyRate;

            case 'formula':
                // Evaluar fórmula personalizada (simplificado)
                return this.evaluateFormula(concept.formula, { baseSalary, hourlyRate, hoursAnalysis });

            default:
                return defaultValue;
        }
    }

    // =========================================================================
    // PP-11-IMPL-3: EVALUAR FÓRMULA PERSONALIZADA (PARSER SEGURO - SIN EVAL)
    // =========================================================================
    /**
     * Parser matemático seguro para fórmulas de payroll.
     * REEMPLAZA eval() para evitar vulnerabilidades de inyección de código.
     *
     * Variables soportadas:
     * - {baseSalary} - Sueldo base del usuario
     * - {hourlyRate} - Valor por hora
     * - {workedDays} - Días trabajados en el período
     * - {workedHours} - Horas trabajadas en el período
     * - {overtime50Hours} - Horas extras al 50%
     * - {overtime100Hours} - Horas extras al 100%
     * - {nightHours} - Horas nocturnas
     * - {absentDays} - Días de ausencia injustificada
     *
     * Operadores soportados: + - * / ( ) %
     * Funciones soportadas: round(), floor(), ceil(), min(), max(), abs()
     *
     * Ejemplo: "{baseSalary} * 0.05 + round({workedHours} * {hourlyRate} * 0.1)"
     *
     * @param {string} formula - Fórmula con variables entre llaves
     * @param {object} context - Contexto con valores de variables
     * @returns {number} Resultado del cálculo
     */
    evaluateFormula(formula, context) {
        if (!formula) return 0;

        try {
            // 1. Expandir variables del contexto
            const variables = {
                baseSalary: context.baseSalary || 0,
                hourlyRate: context.hourlyRate || 0,
                workedDays: context.hoursAnalysis?.workedDays || 0,
                workedHours: context.hoursAnalysis?.totalWorkedHours || 0,
                overtime50Hours: context.hoursAnalysis?.overtime50Hours || 0,
                overtime100Hours: context.hoursAnalysis?.overtime100Hours || 0,
                nightHours: context.hoursAnalysis?.nightHours || 0,
                absentDays: context.hoursAnalysis?.absentDays || 0,
                holidayCount: context.holidayCount || 0
            };

            // 2. Reemplazar variables
            let expression = formula;
            for (const [key, value] of Object.entries(variables)) {
                expression = expression.replace(new RegExp(`\\{${key}\\}`, 'gi'), String(value));
            }

            // 3. Evaluar con parser seguro
            return this.safeEvaluateMathExpression(expression);

        } catch (error) {
            console.log(`⚠️ [PAYROLL] Error evaluando fórmula "${formula}": ${error.message}`);
            return 0;
        }
    }

    /**
     * PP-11-IMPL-3: Parser matemático seguro (sin eval)
     *
     * Implementa un parser de descenso recursivo para expresiones matemáticas.
     * Solo permite números, operadores matemáticos básicos y funciones seguras.
     *
     * @param {string} expression - Expresión matemática pura (sin variables)
     * @returns {number} Resultado
     */
    safeEvaluateMathExpression(expression) {
        // Validar que solo contenga caracteres permitidos
        const allowedPattern = /^[\d\s+\-*/().,%a-zA-Z]+$/;
        if (!allowedPattern.test(expression)) {
            throw new Error(`Caracteres no permitidos en fórmula: ${expression}`);
        }

        // Tokenizar
        const tokens = this.tokenizeMathExpression(expression);

        // Parsear con precedencia de operadores
        let pos = 0;

        const peek = () => tokens[pos];
        const consume = () => tokens[pos++];

        // Funciones matemáticas seguras
        const mathFunctions = {
            round: Math.round,
            floor: Math.floor,
            ceil: Math.ceil,
            abs: Math.abs,
            min: Math.min,
            max: Math.max,
            sqrt: Math.sqrt,
            pow: Math.pow
        };

        // Parser de expresiones con precedencia
        const parseExpression = () => parseAddSub();

        const parseAddSub = () => {
            let left = parseMulDiv();
            while (peek() === '+' || peek() === '-') {
                const op = consume();
                const right = parseMulDiv();
                left = op === '+' ? left + right : left - right;
            }
            return left;
        };

        const parseMulDiv = () => {
            let left = parseUnary();
            while (peek() === '*' || peek() === '/' || peek() === '%') {
                const op = consume();
                const right = parseUnary();
                if (op === '*') left = left * right;
                else if (op === '/') left = right !== 0 ? left / right : 0;
                else left = left % right;
            }
            return left;
        };

        const parseUnary = () => {
            if (peek() === '-') {
                consume();
                return -parsePrimary();
            }
            if (peek() === '+') {
                consume();
            }
            return parsePrimary();
        };

        const parsePrimary = () => {
            const token = peek();

            // Número
            if (typeof token === 'number') {
                consume();
                return token;
            }

            // Paréntesis
            if (token === '(') {
                consume(); // (
                const result = parseExpression();
                if (peek() === ')') consume(); // )
                return result;
            }

            // Función matemática: round(x), min(a,b), etc.
            if (typeof token === 'string' && mathFunctions[token.toLowerCase()]) {
                const funcName = consume().toLowerCase();
                if (peek() !== '(') throw new Error(`Se esperaba '(' después de ${funcName}`);
                consume(); // (

                const args = [];
                args.push(parseExpression());

                while (peek() === ',') {
                    consume(); // ,
                    args.push(parseExpression());
                }

                if (peek() === ')') consume(); // )

                const func = mathFunctions[funcName];
                return func(...args);
            }

            throw new Error(`Token inesperado: ${token}`);
        };

        const result = parseExpression();

        // Validar resultado
        if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
            return 0;
        }

        return result;
    }

    /**
     * Tokenizador para expresiones matemáticas
     */
    tokenizeMathExpression(expression) {
        const tokens = [];
        let i = 0;

        while (i < expression.length) {
            const char = expression[i];

            // Espacios: ignorar
            if (/\s/.test(char)) {
                i++;
                continue;
            }

            // Operadores y paréntesis
            if ('+-*/(),%'.includes(char)) {
                tokens.push(char);
                i++;
                continue;
            }

            // Números (incluyendo decimales)
            if (/[\d.]/.test(char)) {
                let num = '';
                while (i < expression.length && /[\d.]/.test(expression[i])) {
                    num += expression[i++];
                }
                tokens.push(parseFloat(num));
                continue;
            }

            // Identificadores (funciones como round, min, max)
            if (/[a-zA-Z_]/.test(char)) {
                let id = '';
                while (i < expression.length && /[a-zA-Z_\d]/.test(expression[i])) {
                    id += expression[i++];
                }
                tokens.push(id);
                continue;
            }

            // Caracter desconocido
            throw new Error(`Caracter no reconocido: ${char}`);
        }

        return tokens;
    }

    // =========================================================================
    // CALCULAR TOTALES
    // =========================================================================
    calculateTotals(concepts) {
        const sumByCategory = (items) => items.reduce((sum, c) => sum + c.amount, 0);

        const earningsTotal = sumByCategory(concepts.earnings);
        const nonRemunerativeTotal = sumByCategory(concepts.nonRemunerative);
        const deductionsTotal = sumByCategory(concepts.deductions);
        const employerCostsTotal = sumByCategory(concepts.employerCosts);

        const grossTotal = earningsTotal + nonRemunerativeTotal;
        const taxableBase = earningsTotal;  // Solo remunerativos
        const netSalary = grossTotal - deductionsTotal;

        return {
            earningsTotal: Math.round(earningsTotal * 100) / 100,
            nonRemunerativeTotal: Math.round(nonRemunerativeTotal * 100) / 100,
            grossTotal: Math.round(grossTotal * 100) / 100,
            taxableBase: Math.round(taxableBase * 100) / 100,
            deductionsTotal: Math.round(deductionsTotal * 100) / 100,
            netSalary: Math.round(netSalary * 100) / 100,
            employerCostsTotal: Math.round(employerCostsTotal * 100) / 100,
            totalCost: Math.round((grossTotal + employerCostsTotal) * 100) / 100
        };
    }

    // =========================================================================
    // GUARDAR LIQUIDACIÓN
    // =========================================================================
    async savePayrollRun(payrollData, companyId, branchId, createdBy) {
        const transaction = await sequelize.transaction();

        try {
            // Crear corrida de liquidación
            const runCode = `PAY-${payrollData.period.year}-${String(payrollData.period.month).padStart(2, '0')}-${Date.now()}`;

            const [runResult] = await sequelize.query(`
                INSERT INTO payroll_runs (
                    company_id, branch_id, run_code, run_name,
                    period_year, period_month, period_start, period_end,
                    total_employees, total_gross, total_deductions, total_net, total_employer_cost,
                    status, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10, $11, $12, 'calculated', $13)
                RETURNING id
            `, {
                bind: [
                    companyId, branchId, runCode,
                    `Liquidación ${payrollData.period.monthName} ${payrollData.period.year}`,
                    payrollData.period.year, payrollData.period.month,
                    payrollData.period.startDate, payrollData.period.endDate,
                    payrollData.totals.grossTotal, payrollData.totals.deductionsTotal,
                    payrollData.totals.netSalary, payrollData.totals.employerCostsTotal,
                    createdBy
                ],
                transaction
            });

            const runId = runResult[0].id;

            // Guardar detalle del empleado
            const [detailResult] = await sequelize.query(`
                INSERT INTO payroll_run_details (
                    run_id, user_id, assignment_id,
                    worked_days, worked_hours, overtime_50_hours, overtime_100_hours,
                    gross_earnings, non_remunerative, total_deductions, net_salary, employer_contributions,
                    earnings_detail, deductions_detail, employer_detail,
                    status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'calculated')
                RETURNING id
            `, {
                bind: [
                    runId, payrollData.userId, payrollData.template.id,
                    payrollData.workAnalysis.workedDays, payrollData.workAnalysis.totalWorkedHours,
                    payrollData.workAnalysis.overtime50Hours, payrollData.workAnalysis.overtime100Hours,
                    payrollData.totals.earningsTotal, payrollData.totals.nonRemunerativeTotal,
                    payrollData.totals.deductionsTotal, payrollData.totals.netSalary,
                    payrollData.totals.employerCostsTotal,
                    JSON.stringify(payrollData.concepts.earnings),
                    JSON.stringify(payrollData.concepts.deductions),
                    JSON.stringify(payrollData.concepts.employerCosts)
                ],
                transaction
            });

            await transaction.commit();

            return {
                runId,
                runCode,
                detailId: detailResult[0].id
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // =========================================================================
    // CALCULAR LIQUIDACIÓN MASIVA (TODOS LOS EMPLEADOS)
    // =========================================================================
    async calculateBulkPayroll(companyId, branchId, year, month, createdBy) {
        console.log(`💰 [PAYROLL] Iniciando liquidación masiva para empresa ${companyId}, ${month}/${year}`);

        // Obtener todos los usuarios con plantilla asignada
        const usersQuery = `
            SELECT DISTINCT upa.user_id, upa.template_id, u."firstName", u."lastName"
            FROM user_payroll_assignment upa
            JOIN users u ON upa.user_id = u.user_id
            WHERE upa.company_id = $1 AND upa.is_current = true
            ${branchId ? 'AND u.branch_id = $2' : ''}
        `;
        const [users] = await sequelize.query(usersQuery, {
            bind: branchId ? [companyId, branchId] : [companyId]
        });

        const results = {
            total: users.length,
            success: 0,
            failed: 0,
            details: []
        };

        for (const user of users) {
            try {
                const payroll = await this.calculatePayroll(user.user_id, companyId, year, month);
                const saved = await this.savePayrollRun(payroll, companyId, branchId, createdBy);
                results.success++;
                results.details.push({
                    userId: user.user_id,
                    name: `${user.firstName} ${user.lastName}`,
                    status: 'success',
                    netSalary: payroll.totals.netSalary,
                    runId: saved.runId
                });
            } catch (error) {
                results.failed++;
                results.details.push({
                    userId: user.user_id,
                    name: `${user.firstName} ${user.lastName}`,
                    status: 'error',
                    error: error.message
                });
            }
        }

        console.log(`✅ [PAYROLL] Liquidación masiva completada: ${results.success}/${results.total} exitosas`);
        return results;
    }
}

module.exports = new PayrollCalculatorService();
