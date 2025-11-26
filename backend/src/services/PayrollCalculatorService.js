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

            // 7. Calcular horas trabajadas, extras, nocturnas, inasistencias
            const hoursAnalysis = this.analyzeWorkHours(
                attendanceData,
                template,
                holidays,
                userData.shift
            );

            // 8. Obtener overrides del usuario
            const userOverrides = await this.getUserConceptOverrides(userId, assignment.id);

            // 9. Obtener bonos activos del usuario
            const userBonuses = await this.getActiveBonuses(userId, companyId, period.startDate);

            // 10. Calcular cada concepto
            const calculatedConcepts = this.calculateAllConcepts(
                template.concepts,
                assignment,
                hoursAnalysis,
                userOverrides,
                userBonuses,
                holidays.length
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
    analyzeWorkHours(attendanceRecords, template, holidays, shift) {
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

        // Agrupar por día
        const byDay = {};
        attendanceRecords.forEach(record => {
            const date = record.work_date;
            if (!byDay[date]) {
                byDay[date] = { records: [], totalHours: 0 };
            }
            const hours = (parseFloat(record.raw_hours) || 0) - (parseFloat(record.break_hours) || 0);
            byDay[date].records.push(record);
            byDay[date].totalHours += Math.max(0, hours);
        });

        // Calcular por día
        Object.entries(byDay).forEach(([date, day]) => {
            const isHoliday = holidayDates.has(date);
            const hours = day.totalHours;
            workedDays++;
            totalWorkedHours += hours;

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
        absentDays = Math.max(0, expectedWorkDays - workedDays - holidays.length);

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
            overtime100Multiplier
        };
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
    // CALCULAR TODOS LOS CONCEPTOS
    // =========================================================================
    calculateAllConcepts(templateConcepts, assignment, hoursAnalysis, userOverrides, userBonuses, holidayCount) {
        const earnings = [];
        const deductions = [];
        const nonRemunerative = [];
        const employerCosts = [];

        const baseSalary = parseFloat(assignment.base_salary) || 0;
        const hourlyRate = parseFloat(assignment.hourly_rate) || (baseSalary / (assignment.work_hours_per_month || 200));

        // Procesar conceptos de la plantilla
        templateConcepts.forEach(concept => {
            // Verificar override
            const override = userOverrides.find(o => o.template_concept_id === concept.id);

            let amount = this.calculateConceptAmount(concept, {
                baseSalary,
                hourlyRate,
                hoursAnalysis,
                override,
                holidayCount
            });

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
                displayOrder: concept.display_order
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
        });

        // Procesar bonos del usuario
        userBonuses.forEach(bonus => {
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
        });

        return { earnings, deductions, nonRemunerative, employerCosts };
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
    // EVALUAR FÓRMULA PERSONALIZADA
    // =========================================================================
    evaluateFormula(formula, context) {
        if (!formula) return 0;
        try {
            // Reemplazar variables
            let evaluated = formula
                .replace(/\{baseSalary\}/g, context.baseSalary)
                .replace(/\{hourlyRate\}/g, context.hourlyRate)
                .replace(/\{workedDays\}/g, context.hoursAnalysis?.workedDays || 0)
                .replace(/\{workedHours\}/g, context.hoursAnalysis?.totalWorkedHours || 0);

            // Evaluar (cuidado con eval - en producción usar parser seguro)
            return eval(evaluated);
        } catch (error) {
            console.log(`⚠️ [PAYROLL] Error evaluando fórmula: ${error.message}`);
            return 0;
        }
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
