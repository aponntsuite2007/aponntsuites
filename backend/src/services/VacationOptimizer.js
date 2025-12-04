/**
 * VacationOptimizer.js
 *
 * Optimizador de Cronogramas de Vacaciones
 * Sistema de Estadísticas Avanzadas v2.0
 *
 * OBJETIVO PRINCIPAL:
 * Sugerir cronogramas de vacaciones que minimicen el impacto de costos
 * por horas extras de reposición, utilizando la matriz de compatibilidad
 * de tareas para asignar coberturas óptimas.
 *
 * ALGORITMO:
 * 1. Analizar histórico de costos de reposición por empleado
 * 2. Obtener matriz de compatibilidad de tareas
 * 3. Identificar períodos de menor carga histórica
 * 4. Programación con restricciones (no más de X% del depto ausente)
 * 5. Asignar coberturas priorizando compatibilidad > overtime
 *
 * INTEGRACIÓN:
 * - TaskCompatibility model (compatibilidad de tareas)
 * - ReplacementCostAnalyzer (costos históricos)
 * - Vacation module (gestión de vacaciones existente)
 */

const { Op } = require('sequelize');

class VacationOptimizer {
    constructor(db) {
        this.db = db;
        this.models = db.models || db;

        // Multiplicadores por DEFECTO (los reales vienen del turno del empleado)
        this.DEFAULT_MULTIPLIERS = {
            normal: 1.0,
            overtime: 1.5,
            weekend: 1.5,
            holiday: 2.0
        };

        // Configuración de restricciones
        this.CONSTRAINTS = {
            maxAbsentPercentagePerDepartment: 25, // No más del 25% del depto ausente
            minDaysBetweenSameDeptVacations: 3,   // Mínimo 3 días entre vacaciones del mismo depto
            preferredCoverageScore: 70,            // Score mínimo para cobertura preferida
            maxOvertimeHoursPerPersonPerWeek: 10  // Máx 10 horas extras por persona por semana
        };

        // Pesos para scoring de fechas
        this.SCORING_WEIGHTS = {
            historicalCost: 0.30,          // 30% - Costo histórico de reposición
            compatibilityCoverage: 0.35,   // 35% - Disponibilidad de cobertura compatible
            workloadBalance: 0.20,         // 20% - Balance de carga en el período
            seasonality: 0.15              // 15% - Estacionalidad (meses menos costosos)
        };
    }

    /**
     * Obtiene el multiplicador de overtime promedio para un departamento
     * basado en los turnos asignados a los empleados
     */
    async _getAverageOvertimeMultiplier(companyId, departmentId = null) {
        try {
            const whereClause = departmentId
                ? `AND u.department_id = :departmentId`
                : '';

            const [results] = await this.db.sequelize.query(`
                SELECT AVG(COALESCE((s."hourlyRates"->>'overtime')::float, 1.5)) as avg_multiplier
                FROM users u
                LEFT JOIN shifts s ON u.shift_id = s.id
                WHERE u.company_id = :companyId
                  AND u.is_active = true
                  ${whereClause}
            `, {
                replacements: { companyId, departmentId },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            return results && results[0]?.avg_multiplier
                ? parseFloat(results[0].avg_multiplier)
                : this.DEFAULT_MULTIPLIERS.overtime;
        } catch (error) {
            console.warn('⚠️ Error obteniendo multiplicador promedio:', error.message);
            return this.DEFAULT_MULTIPLIERS.overtime;
        }
    }

    // ============================================================================
    // MÉTODO PRINCIPAL: Sugerir Cronograma Óptimo
    // ============================================================================

    async suggestOptimalSchedule(companyId, options = {}) {
        try {
            const {
                year = new Date().getFullYear(),
                employeeIds = null, // null = todos los empleados
                departmentId = null,
                excludePeriods = [], // Períodos bloqueados
                prioritizeMonths = [] // Meses preferidos
            } = options;

            console.log(`🏖️ [VACATION OPTIMIZER] Generando sugerencias para empresa ${companyId}`);

            // 1. Obtener empleados y sus días de vacaciones pendientes
            const employees = await this._getEmployeesWithVacationDays(companyId, {
                employeeIds,
                departmentId
            });

            if (employees.length === 0) {
                return {
                    success: false,
                    message: 'No hay empleados con días de vacaciones pendientes'
                };
            }

            // 2. Obtener matriz de compatibilidad de tareas
            const compatibilityMatrix = await this._getCompatibilityMatrix(companyId, departmentId);

            // 3. Analizar histórico de costos de reposición
            const historicalCosts = await this._getHistoricalReplacementCosts(companyId);

            // 4. Identificar períodos óptimos para cada empleado
            const employeeRecommendations = await Promise.all(
                employees.map(emp =>
                    this._generateEmployeeRecommendation(emp, {
                        compatibilityMatrix,
                        historicalCosts,
                        year,
                        excludePeriods,
                        prioritizeMonths
                    })
                )
            );

            // 5. Resolver conflictos y generar cronograma final
            const optimizedSchedule = this._resolveConflicts(employeeRecommendations);

            // 6. Calcular impacto proyectado
            const projectedImpact = this._calculateProjectedImpact(optimizedSchedule, historicalCosts);

            // 7. Generar plan de cobertura
            const coveragePlan = this._generateCoveragePlan(optimizedSchedule, compatibilityMatrix);

            return {
                success: true,
                companyId,
                year,
                summary: {
                    employeesAnalyzed: employees.length,
                    totalVacationDays: employees.reduce((sum, e) => sum + (e.vacationDays || 0), 0),
                    periodsCovered: optimizedSchedule.length,
                    estimatedCostSavings: projectedImpact.estimatedSavings
                },
                schedule: optimizedSchedule,
                coveragePlan,
                projectedImpact,
                constraints: this.CONSTRAINTS,
                methodology: {
                    algorithm: 'Greedy with Conflict Resolution',
                    scoringWeights: this.SCORING_WEIGHTS,
                    compatibilityThreshold: this.CONSTRAINTS.preferredCoverageScore
                }
            };

        } catch (error) {
            console.error('❌ [VACATION OPTIMIZER] Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================================================
    // OBTENCIÓN DE DATOS
    // ============================================================================

    async _getEmployeesWithVacationDays(companyId, filters) {
        try {
            let whereClause = `u.company_id = :companyId AND u.is_active = true`;
            const replacements = { companyId };

            if (filters.employeeIds) {
                whereClause += ` AND u.id IN (:employeeIds)`;
                replacements.employeeIds = filters.employeeIds;
            }

            if (filters.departmentId) {
                whereClause += ` AND u.department_id = :departmentId`;
                replacements.departmentId = filters.departmentId;
            }

            const [results] = await this.db.sequelize.query(`
                SELECT
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.department_id,
                    d.name as department_name,
                    u.hire_date,
                    COALESCE(u.vacation_days_available, 14) as vacation_days,
                    COALESCE(u.vacation_days_used, 0) as vacation_days_used,
                    u.branch_id,
                    b.name as branch_name
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                LEFT JOIN branches b ON u.branch_id = b.id
                WHERE ${whereClause}
                ORDER BY u.department_id, u.id
            `, {
                replacements,
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            return (results || []).map(emp => ({
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                departmentId: emp.department_id,
                departmentName: emp.department_name,
                branchId: emp.branch_id,
                branchName: emp.branch_name,
                hireDate: emp.hire_date,
                vacationDays: parseInt(emp.vacation_days) - parseInt(emp.vacation_days_used),
                totalVacationDays: parseInt(emp.vacation_days),
                usedVacationDays: parseInt(emp.vacation_days_used)
            }));

        } catch (error) {
            console.error('Error obteniendo empleados:', error);
            return [];
        }
    }

    async _getCompatibilityMatrix(companyId, departmentId = null) {
        try {
            let whereClause = `u1.company_id = :companyId`;
            const replacements = { companyId };

            if (departmentId) {
                whereClause += ` AND u1.department_id = :departmentId`;
                replacements.departmentId = departmentId;
            }

            // Intentar obtener de task_compatibility si existe
            const [results] = await this.db.sequelize.query(`
                SELECT
                    tc.primary_user_id,
                    tc.cover_user_id,
                    tc.compatibility_score,
                    tc.task_categories,
                    tc.restrictions,
                    u1.first_name || ' ' || u1.last_name as primary_name,
                    u2.first_name || ' ' || u2.last_name as cover_name,
                    u1.department_id as primary_dept,
                    u2.department_id as cover_dept
                FROM task_compatibility tc
                JOIN users u1 ON tc.primary_user_id = u1.id
                JOIN users u2 ON tc.cover_user_id = u2.id
                WHERE ${whereClause}
                  AND tc.compatibility_score >= :minScore
                ORDER BY tc.compatibility_score DESC
            `, {
                replacements: { ...replacements, minScore: 50 },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            // Construir matriz indexada
            const matrix = {};
            (results || []).forEach(row => {
                if (!matrix[row.primary_user_id]) {
                    matrix[row.primary_user_id] = {
                        name: row.primary_name,
                        departmentId: row.primary_dept,
                        compatibleCovers: []
                    };
                }
                matrix[row.primary_user_id].compatibleCovers.push({
                    userId: row.cover_user_id,
                    name: row.cover_name,
                    score: row.compatibility_score,
                    departmentId: row.cover_dept,
                    categories: row.task_categories,
                    restrictions: row.restrictions
                });
            });

            return matrix;

        } catch (error) {
            console.warn('TaskCompatibility no disponible, usando fallback por departamento:', error.message);
            return this._buildFallbackCompatibility(companyId, departmentId);
        }
    }

    async _buildFallbackCompatibility(companyId, departmentId) {
        // Si no hay matriz de compatibilidad, asumir que empleados del mismo depto pueden cubrirse
        try {
            const [employees] = await this.db.sequelize.query(`
                SELECT id, first_name || ' ' || last_name as name, department_id
                FROM users
                WHERE company_id = :companyId AND is_active = true
                ${departmentId ? 'AND department_id = :departmentId' : ''}
            `, {
                replacements: { companyId, departmentId },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            const matrix = {};
            (employees || []).forEach(emp => {
                matrix[emp.id] = {
                    name: emp.name,
                    departmentId: emp.department_id,
                    compatibleCovers: (employees || [])
                        .filter(other => other.id !== emp.id && other.department_id === emp.department_id)
                        .map(other => ({
                            userId: other.id,
                            name: other.name,
                            score: 60, // Score por defecto para mismo departamento
                            departmentId: other.department_id
                        }))
                };
            });

            return matrix;

        } catch (error) {
            console.error('Error en fallback de compatibilidad:', error);
            return {};
        }
    }

    async _getHistoricalReplacementCosts(companyId) {
        try {
            // Analizar últimos 12 meses
            const endDate = new Date();
            const startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 1);

            const [monthlyData] = await this.db.sequelize.query(`
                SELECT
                    EXTRACT(MONTH FROM a.date) as month,
                    EXTRACT(YEAR FROM a.date) as year,
                    u.department_id,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absence_count,
                    SUM(CASE WHEN a.status = 'absent' THEN COALESCE(a.scheduled_hours, 8) ELSE 0 END) as absence_hours,
                    SUM(CASE WHEN a.status = 'present' AND a.overtime_hours > 0 THEN a.overtime_hours ELSE 0 END) as overtime_hours,
                    COUNT(DISTINCT a.user_id) as employees_affected
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE u.company_id = :companyId
                  AND a.date BETWEEN :startDate AND :endDate
                GROUP BY EXTRACT(MONTH FROM a.date), EXTRACT(YEAR FROM a.date), u.department_id
                ORDER BY year, month
            `, {
                replacements: { companyId, startDate, endDate },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            // Calcular costo por mes (usando multiplicador 1.5 para overtime)
            const monthlyAnalysis = {};
            (monthlyData || []).forEach(row => {
                const month = parseInt(row.month);
                if (!monthlyAnalysis[month]) {
                    monthlyAnalysis[month] = {
                        absenceHours: 0,
                        overtimeHours: 0,
                        estimatedCost: 0,
                        dataPoints: 0
                    };
                }
                monthlyAnalysis[month].absenceHours += parseFloat(row.absence_hours) || 0;
                monthlyAnalysis[month].overtimeHours += parseFloat(row.overtime_hours) || 0;
                // Usar multiplicador default (el real viene del turno del empleado)
                monthlyAnalysis[month].estimatedCost += (parseFloat(row.overtime_hours) || 0) * this.DEFAULT_MULTIPLIERS.overtime;
                monthlyAnalysis[month].dataPoints++;
            });

            // Identificar meses más y menos costosos
            const monthsSorted = Object.entries(monthlyAnalysis)
                .map(([month, data]) => ({
                    month: parseInt(month),
                    ...data,
                    avgCost: data.dataPoints > 0 ? data.estimatedCost / data.dataPoints : 0
                }))
                .sort((a, b) => a.avgCost - b.avgCost);

            return {
                monthlyAnalysis,
                cheapestMonths: monthsSorted.slice(0, 3).map(m => m.month),
                expensiveMonths: monthsSorted.slice(-3).map(m => m.month),
                averageMonthlyCost: monthsSorted.length > 0
                    ? monthsSorted.reduce((sum, m) => sum + m.avgCost, 0) / monthsSorted.length
                    : 0
            };

        } catch (error) {
            console.error('Error obteniendo costos históricos:', error);
            return {
                monthlyAnalysis: {},
                cheapestMonths: [1, 2, 3], // Default: primeros meses del año
                expensiveMonths: [11, 12], // Default: fin de año
                averageMonthlyCost: 0
            };
        }
    }

    // ============================================================================
    // GENERACIÓN DE RECOMENDACIONES POR EMPLEADO
    // ============================================================================

    async _generateEmployeeRecommendation(employee, context) {
        const {
            compatibilityMatrix,
            historicalCosts,
            year,
            excludePeriods,
            prioritizeMonths
        } = context;

        // Obtener coberturas disponibles para este empleado
        const coverageOptions = compatibilityMatrix[employee.id]?.compatibleCovers || [];

        // Generar períodos candidatos (semanas del año)
        const candidatePeriods = this._generateCandidatePeriods(year, excludePeriods);

        // Calcular score para cada período
        const scoredPeriods = candidatePeriods.map(period => {
            const score = this._calculatePeriodScore(period, {
                employee,
                coverageOptions,
                historicalCosts,
                prioritizeMonths
            });
            return { ...period, score };
        });

        // Ordenar por score y seleccionar los mejores
        scoredPeriods.sort((a, b) => b.score - a.score);

        // Determinar cuántos períodos necesita para sus días de vacaciones
        const daysNeeded = employee.vacationDays;
        const periodsNeeded = Math.ceil(daysNeeded / 7); // Asumiendo semanas de 7 días

        const recommendedPeriods = scoredPeriods.slice(0, Math.min(periodsNeeded * 2, 6));

        return {
            employee: {
                id: employee.id,
                name: employee.name,
                departmentId: employee.departmentId,
                departmentName: employee.departmentName,
                vacationDays: employee.vacationDays
            },
            availableCoverages: coverageOptions.length,
            topCoverageScore: coverageOptions[0]?.score || 0,
            recommendedPeriods: recommendedPeriods.map(p => ({
                startDate: p.startDate,
                endDate: p.endDate,
                month: p.month,
                week: p.week,
                score: Math.round(p.score * 100) / 100,
                scoreBreakdown: p.scoreBreakdown,
                suggestedCoverage: this._selectBestCoverage(coverageOptions, p)
            }))
        };
    }

    _generateCandidatePeriods(year, excludePeriods) {
        const periods = [];
        const startOfYear = new Date(year, 0, 1);

        // Generar 52 semanas
        for (let week = 1; week <= 52; week++) {
            const startDate = new Date(startOfYear);
            startDate.setDate(startDate.getDate() + (week - 1) * 7);

            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);

            // Verificar si está excluido
            const isExcluded = excludePeriods.some(excluded => {
                const excludeStart = new Date(excluded.startDate);
                const excludeEnd = new Date(excluded.endDate);
                return startDate <= excludeEnd && endDate >= excludeStart;
            });

            if (!isExcluded) {
                periods.push({
                    week,
                    month: startDate.getMonth() + 1,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                });
            }
        }

        return periods;
    }

    _calculatePeriodScore(period, context) {
        const { employee, coverageOptions, historicalCosts, prioritizeMonths } = context;

        let score = 0;
        const breakdown = {};

        // 1. Score por costo histórico (meses más baratos = mejor score)
        const monthCost = historicalCosts.monthlyAnalysis[period.month]?.avgCost || 0;
        const maxMonthlyCost = Math.max(
            ...Object.values(historicalCosts.monthlyAnalysis).map(m => m.avgCost || 0),
            1
        );
        const historicalScore = 1 - (monthCost / maxMonthlyCost);
        breakdown.historical = historicalScore;
        score += historicalScore * this.SCORING_WEIGHTS.historicalCost;

        // 2. Score por disponibilidad de cobertura compatible
        const availableCoverage = coverageOptions.filter(c => c.score >= this.CONSTRAINTS.preferredCoverageScore);
        const coverageScore = Math.min(availableCoverage.length / 3, 1); // Max 1 si hay 3+ opciones
        breakdown.coverage = coverageScore;
        score += coverageScore * this.SCORING_WEIGHTS.compatibilityCoverage;

        // 3. Score por balance de carga (evitar períodos pico)
        const workloadScore = historicalCosts.cheapestMonths.includes(period.month) ? 1.0 :
            historicalCosts.expensiveMonths.includes(period.month) ? 0.3 : 0.6;
        breakdown.workload = workloadScore;
        score += workloadScore * this.SCORING_WEIGHTS.workloadBalance;

        // 4. Score por estacionalidad/preferencia
        const seasonalityScore = prioritizeMonths.includes(period.month) ? 1.0 : 0.5;
        breakdown.seasonality = seasonalityScore;
        score += seasonalityScore * this.SCORING_WEIGHTS.seasonality;

        return {
            ...period,
            score,
            scoreBreakdown: breakdown
        };
    }

    _selectBestCoverage(coverageOptions, period) {
        if (!coverageOptions || coverageOptions.length === 0) {
            return { available: false, message: 'Sin cobertura compatible disponible' };
        }

        // Seleccionar la mejor cobertura por score
        const best = coverageOptions[0];

        return {
            available: true,
            primaryCoverage: {
                userId: best.userId,
                name: best.name,
                compatibilityScore: best.score,
                estimatedOvertimeNeeded: 0 // Se calcularía con más datos
            },
            backupCoverage: coverageOptions[1] ? {
                userId: coverageOptions[1].userId,
                name: coverageOptions[1].name,
                compatibilityScore: coverageOptions[1].score
            } : null
        };
    }

    // ============================================================================
    // RESOLUCIÓN DE CONFLICTOS
    // ============================================================================

    _resolveConflicts(employeeRecommendations) {
        const schedule = [];
        const usedPeriodsByDept = {}; // Tracking de períodos usados por departamento

        // Ordenar empleados por días de vacaciones (priorizar los que tienen más días pendientes)
        const sortedEmployees = [...employeeRecommendations]
            .sort((a, b) => b.employee.vacationDays - a.employee.vacationDays);

        sortedEmployees.forEach(empRec => {
            const { employee, recommendedPeriods } = empRec;
            const deptId = employee.departmentId || 'unassigned';

            if (!usedPeriodsByDept[deptId]) {
                usedPeriodsByDept[deptId] = [];
            }

            // Encontrar el mejor período sin conflictos
            for (const period of recommendedPeriods) {
                const hasConflict = usedPeriodsByDept[deptId].some(usedPeriod => {
                    // Verificar si hay superposición
                    return period.startDate <= usedPeriod.endDate &&
                           period.endDate >= usedPeriod.startDate;
                });

                if (!hasConflict) {
                    // Verificar que no exceda el máximo de ausentes del departamento
                    const concurrentAbsences = usedPeriodsByDept[deptId].filter(up =>
                        period.startDate <= up.endDate && period.endDate >= up.startDate
                    ).length;

                    // Asumiendo 4 empleados por departamento como mínimo
                    const maxConcurrent = Math.floor(4 * (this.CONSTRAINTS.maxAbsentPercentagePerDepartment / 100));

                    if (concurrentAbsences < maxConcurrent) {
                        // Asignar este período
                        const assignment = {
                            employeeId: employee.id,
                            employeeName: employee.name,
                            departmentId: deptId,
                            departmentName: employee.departmentName,
                            period: {
                                startDate: period.startDate,
                                endDate: period.endDate,
                                days: 7
                            },
                            score: period.score,
                            coverage: period.suggestedCoverage,
                            status: 'suggested'
                        };

                        schedule.push(assignment);
                        usedPeriodsByDept[deptId].push({
                            startDate: period.startDate,
                            endDate: period.endDate,
                            employeeId: employee.id
                        });

                        break; // Pasar al siguiente empleado
                    }
                }
            }
        });

        // Ordenar schedule por fecha
        return schedule.sort((a, b) =>
            new Date(a.period.startDate) - new Date(b.period.startDate)
        );
    }

    // ============================================================================
    // CÁLCULO DE IMPACTO PROYECTADO
    // ============================================================================

    _calculateProjectedImpact(schedule, historicalCosts) {
        let totalDays = 0;
        let projectedOvertimeHours = 0;
        let projectedCost = 0;

        const byMonth = {};

        schedule.forEach(assignment => {
            const month = new Date(assignment.period.startDate).getMonth() + 1;
            const days = assignment.period.days;
            const hours = days * 8; // Horas laborales por día

            totalDays += days;

            // Estimar overtime necesario basado en histórico
            const monthlyData = historicalCosts.monthlyAnalysis[month];
            const avgReplacementRatio = monthlyData
                ? (monthlyData.overtimeHours / Math.max(1, monthlyData.absenceHours))
                : 0.5;

            const estimatedOvertime = hours * avgReplacementRatio;
            projectedOvertimeHours += estimatedOvertime;
            // Usar multiplicador default (el real debería venir del turno)
            projectedCost += estimatedOvertime * this.DEFAULT_MULTIPLIERS.overtime;

            if (!byMonth[month]) {
                byMonth[month] = { days: 0, overtime: 0, cost: 0 };
            }
            byMonth[month].days += days;
            byMonth[month].overtime += estimatedOvertime;
            byMonth[month].cost += estimatedOvertime * this.DEFAULT_MULTIPLIERS.overtime;
        });

        // Calcular ahorro vs distribución aleatoria
        const avgMonthlyCost = historicalCosts.averageMonthlyCost;
        // Costo si distribución fuera aleatoria (para comparar ahorros)
        const randomDistributionCost = totalDays * 8 * 0.5 * this.DEFAULT_MULTIPLIERS.overtime;
        const estimatedSavings = randomDistributionCost - projectedCost;

        return {
            totalVacationDays: totalDays,
            projectedOvertimeHours: Math.round(projectedOvertimeHours * 100) / 100,
            projectedCost: Math.round(projectedCost * 100) / 100,
            estimatedSavings: Math.round(Math.max(0, estimatedSavings) * 100) / 100,
            savingsPercentage: randomDistributionCost > 0
                ? Math.round((estimatedSavings / randomDistributionCost) * 100)
                : 0,
            byMonth: Object.entries(byMonth).map(([month, data]) => ({
                month: parseInt(month),
                monthName: this._getMonthName(parseInt(month)),
                ...data
            })),
            assumptions: {
                overtimeMultiplier: this.DEFAULT_MULTIPLIERS.overtime,
                note: 'Multiplicadores reales vienen del turno asignado a cada empleado',
                hoursPerDay: 8,
                basedOnHistoricalMonths: Object.keys(historicalCosts.monthlyAnalysis).length
            }
        };
    }

    _getMonthName(month) {
        const names = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return names[month] || `Mes ${month}`;
    }

    // ============================================================================
    // GENERACIÓN DE PLAN DE COBERTURA
    // ============================================================================

    _generateCoveragePlan(schedule, compatibilityMatrix) {
        const coveragePlan = [];

        schedule.forEach(assignment => {
            const primaryUser = compatibilityMatrix[assignment.employeeId];
            const covers = primaryUser?.compatibleCovers || [];

            const plan = {
                vacationAssignment: {
                    employeeId: assignment.employeeId,
                    employeeName: assignment.employeeName,
                    period: assignment.period
                },
                primaryCoverage: null,
                backupCoverages: [],
                tasksToDistribute: [],
                overtimeRequired: {
                    estimated: false,
                    reason: null
                }
            };

            if (covers.length > 0) {
                // Asignar cobertura principal
                plan.primaryCoverage = {
                    userId: covers[0].userId,
                    name: covers[0].name,
                    compatibilityScore: covers[0].score,
                    categories: covers[0].categories || []
                };

                // Asignar backups
                plan.backupCoverages = covers.slice(1, 3).map(c => ({
                    userId: c.userId,
                    name: c.name,
                    compatibilityScore: c.score
                }));

                plan.overtimeRequired.estimated = covers[0].score < 80;
                plan.overtimeRequired.reason = covers[0].score < 80
                    ? 'Compatibilidad parcial - puede requerir overtime adicional'
                    : null;

            } else {
                plan.overtimeRequired.estimated = true;
                plan.overtimeRequired.reason = 'Sin cobertura compatible - se requerirá overtime externo';
            }

            coveragePlan.push(plan);
        });

        return coveragePlan;
    }

    // ============================================================================
    // ANÁLISIS DE WHAT-IF
    // ============================================================================

    async analyzeWhatIf(companyId, proposedSchedule) {
        // Analizar impacto de un cronograma propuesto manualmente
        const historicalCosts = await this._getHistoricalReplacementCosts(companyId);
        const compatibilityMatrix = await this._getCompatibilityMatrix(companyId);

        // Convertir propuesta a formato interno
        const schedule = proposedSchedule.map(item => ({
            employeeId: item.employeeId,
            employeeName: item.employeeName || 'Unknown',
            departmentId: item.departmentId,
            departmentName: item.departmentName || 'Unknown',
            period: {
                startDate: item.startDate,
                endDate: item.endDate,
                days: Math.ceil(
                    (new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24)
                ) + 1
            }
        }));

        const impact = this._calculateProjectedImpact(schedule, historicalCosts);
        const coveragePlan = this._generateCoveragePlan(schedule, compatibilityMatrix);

        // Detectar conflictos
        const conflicts = this._detectConflicts(schedule);

        return {
            success: true,
            proposedSchedule: schedule,
            projectedImpact: impact,
            coveragePlan,
            conflicts,
            recommendation: conflicts.length > 0
                ? 'Se detectaron conflictos - considerar ajustar fechas'
                : 'Cronograma viable con bajo impacto de costos'
        };
    }

    _detectConflicts(schedule) {
        const conflicts = [];
        const byDepartment = {};

        schedule.forEach(assignment => {
            const deptId = assignment.departmentId || 'unassigned';
            if (!byDepartment[deptId]) {
                byDepartment[deptId] = [];
            }
            byDepartment[deptId].push(assignment);
        });

        Object.entries(byDepartment).forEach(([deptId, assignments]) => {
            // Verificar superposiciones
            for (let i = 0; i < assignments.length; i++) {
                for (let j = i + 1; j < assignments.length; j++) {
                    const a = assignments[i];
                    const b = assignments[j];

                    if (a.period.startDate <= b.period.endDate &&
                        a.period.endDate >= b.period.startDate) {
                        conflicts.push({
                            type: 'overlap',
                            department: deptId,
                            employees: [a.employeeName, b.employeeName],
                            overlapPeriod: {
                                start: new Date(Math.max(new Date(a.period.startDate), new Date(b.period.startDate)))
                                    .toISOString().split('T')[0],
                                end: new Date(Math.min(new Date(a.period.endDate), new Date(b.period.endDate)))
                                    .toISOString().split('T')[0]
                            },
                            severity: 'medium',
                            suggestion: 'Ajustar fechas para evitar superposición'
                        });
                    }
                }
            }
        });

        return conflicts;
    }
}

module.exports = VacationOptimizer;
