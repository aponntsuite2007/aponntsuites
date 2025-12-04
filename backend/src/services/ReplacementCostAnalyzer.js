/**
 * ReplacementCostAnalyzer.js
 *
 * Servicio CRÍTICO para análisis de costos de reposición
 * Sistema de Estadísticas Avanzadas v2.0
 *
 * FUNCIONALIDADES:
 * 1. Calcular horas perdidas por enfermedad/vacaciones
 * 2. Identificar horas extras usadas para reposición (mismo departamento, misma fecha)
 * 3. Calcular ratio de costo real vs costo presupuestado
 * 4. Proyecciones para planificación de vacaciones
 * 5. Integración con TaskCompatibility para optimización
 *
 * METODOLOGÍA CIENTÍFICA:
 * - Correlación temporal: ausencia día D → overtime día D en mismo departamento
 * - Diferenciación: overtime "orgánico" vs overtime "por reposición"
 * - Cálculo de ineficiencia: (costo_real - costo_normal) / costo_normal
 */

const { Op, fn, col, literal } = require('sequelize');

class ReplacementCostAnalyzer {
    constructor(db) {
        this.db = db;
        this.models = db.models || db;

        // =====================================================================
        // CONFIGURACIÓN DINÁMICA - Multiplicadores vienen del TURNO del empleado
        // Cada empresa configura sus propios multiplicadores en shift.hourlyRates
        // =====================================================================

        // Multiplicadores por DEFECTO (solo si el turno no tiene hourlyRates)
        this.DEFAULT_COST_MULTIPLIERS = {
            normal: 1.0,
            overtime: 1.5,
            overtime50: 1.5,
            overtime100: 2.0,
            holiday: 2.0,
            weekend: 1.5
        };

        // Tipos de ausencia que requieren reposición
        this.REPLACEMENT_TRIGGERS = [
            'illness',
            'sick_leave',
            'vacation',
            'medical_leave',
            'maternity',
            'paternity'
        ];

        // Umbral de correlacion temporal-departamental
        this.CORRELATION_THRESHOLD = 0.6;

        // Parametros de eficiencia
        this.EFFICIENCY_BENCHMARKS = {
            excellentCoverage: 0.9,
            goodCoverage: 0.7,
            acceptableCoverage: 0.5,
            criticalCoverage: 0.3,
            healthyOvertimeRatio: 0.15,
            criticalOvertimeRatio: 0.30
        };

        // Cache de feriados
        this._holidayCache = new Map();
    }

    // ============================================================================
    // OBTENCIÓN DE MULTIPLICADORES DESDE EL TURNO
    // ============================================================================

    /**
     * Obtiene los multiplicadores de costo del turno o usa defaults
     */
    _getMultipliersForShift(shiftHourlyRates) {
        const defaults = this.DEFAULT_COST_MULTIPLIERS;

        if (!shiftHourlyRates || typeof shiftHourlyRates !== 'object') {
            return defaults;
        }

        return {
            normal: shiftHourlyRates.normal ?? defaults.normal,
            overtime: shiftHourlyRates.overtime ?? defaults.overtime,
            overtime50: shiftHourlyRates.overtime ?? defaults.overtime,
            overtime100: (shiftHourlyRates.overtime ?? defaults.overtime) + 0.5,
            weekend: shiftHourlyRates.weekend ?? defaults.weekend,
            holiday: shiftHourlyRates.holiday ?? defaults.holiday
        };
    }

    /**
     * Verifica si una fecha es feriado
     */
    async _isHoliday(date, country, stateProvince = null) {
        const cacheKey = `${date}_${country}_${stateProvince}`;
        if (this._holidayCache.has(cacheKey)) {
            return this._holidayCache.get(cacheKey);
        }

        try {
            const Holiday = this.models.Holiday;

            if (Holiday && Holiday.isHoliday) {
                const isHoliday = await Holiday.isHoliday(date, country, stateProvince, true, true);
                this._holidayCache.set(cacheKey, isHoliday);
                return isHoliday;
            }

            // Fallback: query raw
            const [results] = await this.db.sequelize.query(`
                SELECT id FROM holidays
                WHERE date = :date AND country = :country
                  AND (state_province IS NULL OR state_province = :stateProvince)
                LIMIT 1
            `, {
                replacements: { date, country, stateProvince },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            const isHoliday = results && results.length > 0;
            this._holidayCache.set(cacheKey, isHoliday);
            return isHoliday;
        } catch (error) {
            console.warn('⚠️ Error verificando feriado:', error.message);
            return false;
        }
    }

    // ============================================================================
    // MÉTODO PRINCIPAL: Análisis completo de costos de reposición
    // ============================================================================

    async analyzeReplacementCosts(companyId, dateRange = {}) {
        try {
            const startDate = dateRange.startDate || this._getDefaultStartDate();
            const endDate = dateRange.endDate || new Date();

            console.log(`📊 [REPLACEMENT] Analizando costos de reposición para empresa ${companyId}`);
            console.log(`   Período: ${startDate.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]}`);

            // 1. Obtener ausencias por enfermedad/vacaciones
            const absences = await this._getAbsencesByType(companyId, startDate, endDate);

            // 2. Obtener horas extras en los mismos períodos y departamentos
            const overtimeData = await this._getOvertimeByDepartment(companyId, startDate, endDate);

            // 3. Correlacionar ausencias con overtime (mismo departamento, misma fecha)
            const correlatedReplacement = this._correlateAbsencesWithOvertime(absences, overtimeData);

            // 4. Calcular costos
            const costAnalysis = this._calculateCosts(correlatedReplacement);

            // 5. Análisis por departamento
            const departmentBreakdown = this._analyzeByDepartment(correlatedReplacement, costAnalysis);

            // 6. Tendencias y proyecciones
            const trends = await this._analyzeTrends(companyId, startDate, endDate);

            // 7. Indicadores de eficiencia
            const efficiencyMetrics = this._calculateEfficiencyMetrics(costAnalysis, absences);

            return {
                success: true,
                companyId,
                period: {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    daysAnalyzed: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
                },
                summary: {
                    totalAbsenceHours: costAnalysis.totalAbsenceHours,
                    totalReplacementOvertimeHours: costAnalysis.totalReplacementOvertimeHours,
                    totalOrganicOvertimeHours: costAnalysis.totalOrganicOvertimeHours,
                    replacementRatio: costAnalysis.replacementRatio,
                    costImpact: {
                        normalCostIfNoAbsence: costAnalysis.theoreticalNormalCost,
                        actualReplacementCost: costAnalysis.actualReplacementCost,
                        additionalCostDueToReplacement: costAnalysis.additionalCost,
                        costIncreasePercentage: costAnalysis.costIncreasePercentage
                    }
                },
                byAbsenceType: costAnalysis.byAbsenceType,
                byDepartment: departmentBreakdown,
                trends,
                efficiencyMetrics,
                methodology: {
                    correlationMethod: 'Temporal + Departmental matching',
                    correlationThreshold: this.CORRELATION_THRESHOLD,
                    costMultipliers: this.DEFAULT_COST_MULTIPLIERS,
                    note: 'Multiplicadores reales vienen del turno asignado a cada empleado',
                    replacementTriggers: this.REPLACEMENT_TRIGGERS
                }
            };

        } catch (error) {
            console.error('❌ [REPLACEMENT] Error en análisis:', error);
            return {
                success: false,
                error: error.message,
                companyId
            };
        }
    }

    // ============================================================================
    // OBTENCIÓN DE DATOS
    // ============================================================================

    async _getAbsencesByType(companyId, startDate, endDate) {
        try {
            // Buscar en la tabla de attendance los registros de ausencia
            const Attendance = this.models.Attendance;
            const User = this.models.User;

            if (!Attendance) {
                console.warn('⚠️ Modelo Attendance no disponible, usando query raw');
                return this._getAbsencesRaw(companyId, startDate, endDate);
            }

            const absences = await Attendance.findAll({
                attributes: [
                    'id',
                    'user_id',
                    'date',
                    'status',
                    'absence_type',
                    'scheduled_hours',
                    'department_id'
                ],
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'department_id'],
                    where: { company_id: companyId },
                    required: true
                }],
                where: {
                    date: { [Op.between]: [startDate, endDate] },
                    status: 'absent',
                    absence_type: { [Op.in]: this.REPLACEMENT_TRIGGERS }
                },
                raw: true,
                nest: true
            });

            return absences.map(a => ({
                id: a.id,
                userId: a.user_id,
                date: a.date,
                absenceType: a.absence_type || 'unspecified',
                scheduledHours: a.scheduled_hours || 8,
                departmentId: a.department_id || a.user?.department_id,
                userName: a.user ? `${a.user.first_name} ${a.user.last_name}` : 'Unknown'
            }));

        } catch (error) {
            console.error('Error obteniendo ausencias:', error);
            return this._getAbsencesRaw(companyId, startDate, endDate);
        }
    }

    async _getAbsencesRaw(companyId, startDate, endDate) {
        try {
            const [results] = await this.db.sequelize.query(`
                SELECT
                    a.id,
                    a.user_id,
                    a.date,
                    a.status,
                    COALESCE(a.absence_type, 'unspecified') as absence_type,
                    COALESCE(a.scheduled_hours, 8) as scheduled_hours,
                    COALESCE(a.department_id, u.department_id) as department_id,
                    u.first_name,
                    u.last_name
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE u.company_id = :companyId
                  AND a.date BETWEEN :startDate AND :endDate
                  AND a.status = 'absent'
                  AND (a.absence_type IN (:absenceTypes) OR a.absence_type IS NULL)
            `, {
                replacements: {
                    companyId,
                    startDate,
                    endDate,
                    absenceTypes: this.REPLACEMENT_TRIGGERS
                },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            return (results || []).map(a => ({
                id: a.id,
                userId: a.user_id,
                date: a.date,
                absenceType: a.absence_type,
                scheduledHours: parseFloat(a.scheduled_hours) || 8,
                departmentId: a.department_id,
                userName: `${a.first_name} ${a.last_name}`
            }));
        } catch (error) {
            console.error('Error en query raw de ausencias:', error);
            return [];
        }
    }

    async _getOvertimeByDepartment(companyId, startDate, endDate) {
        try {
            // Buscar horas extras con datos del TURNO y SUCURSAL
            const [results] = await this.db.sequelize.query(`
                SELECT
                    a.id,
                    a.user_id,
                    a.date,
                    COALESCE(a.department_id, u.department_id) as department_id,
                    COALESCE(a.overtime_hours, 0) as overtime_hours,
                    COALESCE(a.overtime_type, 'overtime50') as overtime_type,
                    u.first_name,
                    u.last_name,
                    a.check_in,
                    a.check_out,
                    a.worked_hours,
                    a.scheduled_hours,
                    EXTRACT(DOW FROM a.date) as day_of_week,
                    -- Datos del TURNO para multiplicadores
                    s."hourlyRates" as shift_hourly_rates,
                    s.name as shift_name,
                    -- Datos de SUCURSAL para feriados
                    b.country as branch_country,
                    b.state_province as branch_state
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                LEFT JOIN branches b ON u.branch_id = b.id
                LEFT JOIN shifts s ON u.shift_id = s.id
                WHERE u.company_id = :companyId
                  AND a.date BETWEEN :startDate AND :endDate
                  AND a.status = 'present'
                  AND (
                      a.overtime_hours > 0
                      OR (a.worked_hours > a.scheduled_hours AND a.worked_hours IS NOT NULL)
                  )
            `, {
                replacements: { companyId, startDate, endDate },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            return (results || []).map(o => {
                // Calcular horas extras si no están explícitas
                let overtimeHours = parseFloat(o.overtime_hours) || 0;
                if (overtimeHours === 0 && o.worked_hours && o.scheduled_hours) {
                    overtimeHours = Math.max(0, parseFloat(o.worked_hours) - parseFloat(o.scheduled_hours));
                }

                // Detectar si es fin de semana
                const isWeekend = parseInt(o.day_of_week) === 0 || parseInt(o.day_of_week) === 6;

                // Obtener multiplicadores del TURNO
                const multipliers = this._getMultipliersForShift(o.shift_hourly_rates);

                return {
                    id: o.id,
                    userId: o.user_id,
                    date: o.date,
                    departmentId: o.department_id,
                    overtimeHours,
                    overtimeType: o.overtime_type,
                    userName: `${o.first_name} ${o.last_name}`,
                    workedHours: parseFloat(o.worked_hours) || 0,
                    scheduledHours: parseFloat(o.scheduled_hours) || 8,
                    isWeekend,
                    branchCountry: o.branch_country,
                    branchState: o.branch_state,
                    shiftName: o.shift_name,
                    multipliers  // Multiplicadores del turno para cálculos posteriores
                };
            });

        } catch (error) {
            console.error('Error obteniendo overtime:', error);
            return [];
        }
    }

    // ============================================================================
    // CORRELACIÓN DE AUSENCIAS CON OVERTIME
    // ============================================================================

    _correlateAbsencesWithOvertime(absences, overtimeData) {
        const correlations = [];
        const usedOvertimeIds = new Set();

        // Agrupar ausencias por fecha y departamento
        const absencesByDateDept = {};
        absences.forEach(absence => {
            const key = `${absence.date}_${absence.departmentId}`;
            if (!absencesByDateDept[key]) {
                absencesByDateDept[key] = [];
            }
            absencesByDateDept[key].push(absence);
        });

        // Para cada grupo de ausencias, buscar overtime correspondiente
        Object.entries(absencesByDateDept).forEach(([key, deptAbsences]) => {
            const [dateStr, deptId] = key.split('_');
            const totalAbsenceHours = deptAbsences.reduce((sum, a) => sum + a.scheduledHours, 0);

            // Buscar overtime en mismo departamento y fecha
            const matchingOvertime = overtimeData.filter(o => {
                const oDateStr = typeof o.date === 'string'
                    ? o.date.split('T')[0]
                    : o.date.toISOString().split('T')[0];
                const absDateStr = typeof dateStr === 'string'
                    ? dateStr.split('T')[0]
                    : dateStr;

                return oDateStr === absDateStr &&
                       String(o.departmentId) === String(deptId) &&
                       !usedOvertimeIds.has(o.id);
            });

            // Calcular horas extras de reposición (hasta cubrir las horas perdidas)
            let replacementOvertimeHours = 0;
            const replacementRecords = [];

            matchingOvertime.forEach(ot => {
                if (replacementOvertimeHours < totalAbsenceHours) {
                    const hoursToAttribute = Math.min(
                        ot.overtimeHours,
                        totalAbsenceHours - replacementOvertimeHours
                    );
                    replacementOvertimeHours += hoursToAttribute;
                    usedOvertimeIds.add(ot.id);
                    replacementRecords.push({
                        ...ot,
                        attributedAsReplacement: hoursToAttribute,
                        organicOvertime: ot.overtimeHours - hoursToAttribute
                    });
                }
            });

            correlations.push({
                date: dateStr,
                departmentId: deptId,
                absences: deptAbsences,
                totalAbsenceHours,
                replacementOvertime: replacementRecords,
                replacementOvertimeHours,
                coverageRatio: totalAbsenceHours > 0
                    ? replacementOvertimeHours / totalAbsenceHours
                    : 0,
                uncoveredHours: Math.max(0, totalAbsenceHours - replacementOvertimeHours)
            });
        });

        // Identificar overtime "orgánico" (no correlacionado con ausencias)
        const organicOvertime = overtimeData.filter(o => !usedOvertimeIds.has(o.id));

        return {
            correlations,
            organicOvertime,
            totalReplacementOvertime: correlations.reduce(
                (sum, c) => sum + c.replacementOvertimeHours, 0
            ),
            totalOrganicOvertime: organicOvertime.reduce(
                (sum, o) => sum + o.overtimeHours, 0
            )
        };
    }

    // ============================================================================
    // CÁLCULO DE COSTOS
    // ============================================================================

    _calculateCosts(correlatedData) {
        const { correlations, organicOvertime, totalReplacementOvertime, totalOrganicOvertime } = correlatedData;

        // Total horas de ausencia
        const totalAbsenceHours = correlations.reduce(
            (sum, c) => sum + c.totalAbsenceHours, 0
        );

        // Costo teórico si las horas se hubieran trabajado normalmente
        // Usamos multiplicador normal (1.0) como base
        const theoreticalNormalCost = totalAbsenceHours * this.DEFAULT_COST_MULTIPLIERS.normal;

        // Costo real de las horas extras de reposición
        // Ahora usa los multiplicadores del TURNO de cada empleado
        let actualReplacementCost = 0;
        correlations.forEach(corr => {
            corr.replacementOvertime.forEach(ot => {
                // Si el overtime tiene multiplicadores del turno, usarlos
                const multipliers = ot.multipliers || this.DEFAULT_COST_MULTIPLIERS;
                let multiplier = multipliers[ot.overtimeType] || multipliers.overtime || 1.5;

                // Si es fin de semana, usar multiplicador de weekend
                if (ot.isWeekend) {
                    multiplier = multipliers.weekend || multiplier;
                }

                actualReplacementCost += ot.attributedAsReplacement * multiplier;
            });
        });

        // Análisis por tipo de ausencia
        const byAbsenceType = {};
        correlations.forEach(corr => {
            corr.absences.forEach(absence => {
                const type = absence.absenceType || 'unspecified';
                if (!byAbsenceType[type]) {
                    byAbsenceType[type] = {
                        absenceHours: 0,
                        replacementOvertimeHours: 0,
                        theoreticalCost: 0,
                        actualCost: 0,
                        count: 0
                    };
                }
                byAbsenceType[type].absenceHours += absence.scheduledHours;
                byAbsenceType[type].count++;
            });
        });

        // Distribuir costos de reposición por tipo de ausencia (proporcional)
        Object.keys(byAbsenceType).forEach(type => {
            const proportion = byAbsenceType[type].absenceHours / totalAbsenceHours;
            byAbsenceType[type].replacementOvertimeHours = totalReplacementOvertime * proportion;
            byAbsenceType[type].theoreticalCost = byAbsenceType[type].absenceHours * this.DEFAULT_COST_MULTIPLIERS.normal;
            byAbsenceType[type].actualCost = actualReplacementCost * proportion;
            byAbsenceType[type].additionalCost = byAbsenceType[type].actualCost - byAbsenceType[type].theoreticalCost;
        });

        return {
            totalAbsenceHours,
            totalReplacementOvertimeHours: totalReplacementOvertime,
            totalOrganicOvertimeHours: totalOrganicOvertime,
            replacementRatio: totalAbsenceHours > 0
                ? totalReplacementOvertime / totalAbsenceHours
                : 0,
            theoreticalNormalCost,
            actualReplacementCost,
            additionalCost: actualReplacementCost - theoreticalNormalCost,
            costIncreasePercentage: theoreticalNormalCost > 0
                ? ((actualReplacementCost - theoreticalNormalCost) / theoreticalNormalCost) * 100
                : 0,
            byAbsenceType,
            overtimeBreakdown: {
                replacement: totalReplacementOvertime,
                organic: totalOrganicOvertime,
                total: totalReplacementOvertime + totalOrganicOvertime,
                replacementPercentage: (totalReplacementOvertime + totalOrganicOvertime) > 0
                    ? (totalReplacementOvertime / (totalReplacementOvertime + totalOrganicOvertime)) * 100
                    : 0
            }
        };
    }

    // ============================================================================
    // ANÁLISIS POR DEPARTAMENTO
    // ============================================================================

    _analyzeByDepartment(correlatedData, costAnalysis) {
        const { correlations } = correlatedData;
        const departments = {};

        correlations.forEach(corr => {
            const deptId = corr.departmentId || 'unassigned';

            if (!departments[deptId]) {
                departments[deptId] = {
                    departmentId: deptId,
                    totalAbsenceHours: 0,
                    totalReplacementHours: 0,
                    uncoveredHours: 0,
                    absenceCount: 0,
                    coverageRatio: 0,
                    byAbsenceType: {},
                    dailyDetails: []
                };
            }

            departments[deptId].totalAbsenceHours += corr.totalAbsenceHours;
            departments[deptId].totalReplacementHours += corr.replacementOvertimeHours;
            departments[deptId].uncoveredHours += corr.uncoveredHours;
            departments[deptId].absenceCount += corr.absences.length;
            departments[deptId].dailyDetails.push({
                date: corr.date,
                absenceHours: corr.totalAbsenceHours,
                replacementHours: corr.replacementOvertimeHours,
                coverage: corr.coverageRatio
            });

            // Por tipo de ausencia dentro del departamento
            corr.absences.forEach(absence => {
                const type = absence.absenceType || 'unspecified';
                if (!departments[deptId].byAbsenceType[type]) {
                    departments[deptId].byAbsenceType[type] = { hours: 0, count: 0 };
                }
                departments[deptId].byAbsenceType[type].hours += absence.scheduledHours;
                departments[deptId].byAbsenceType[type].count++;
            });
        });

        // Calcular ratios y rankings
        Object.values(departments).forEach(dept => {
            dept.coverageRatio = dept.totalAbsenceHours > 0
                ? dept.totalReplacementHours / dept.totalAbsenceHours
                : 0;
            dept.averageAbsenceHoursPerDay = dept.dailyDetails.length > 0
                ? dept.totalAbsenceHours / dept.dailyDetails.length
                : 0;

            // Costo estimado (usando multiplicador promedio 1.5)
            dept.estimatedReplacementCost = dept.totalReplacementHours * 1.5;
            dept.theoreticalNormalCost = dept.totalAbsenceHours * 1.0;
            dept.additionalCost = dept.estimatedReplacementCost - dept.theoreticalNormalCost;
        });

        // Ordenar por costo adicional (mayor impacto primero)
        const sorted = Object.values(departments).sort(
            (a, b) => b.additionalCost - a.additionalCost
        );

        // Calcular porcentajes del total
        const totalAdditionalCost = sorted.reduce((sum, d) => sum + d.additionalCost, 0);
        sorted.forEach(dept => {
            dept.percentageOfTotalCost = totalAdditionalCost > 0
                ? (dept.additionalCost / totalAdditionalCost) * 100
                : 0;
        });

        return {
            ranked: sorted,
            summary: {
                departmentCount: sorted.length,
                mostImpacted: sorted[0]?.departmentId || null,
                leastImpacted: sorted[sorted.length - 1]?.departmentId || null,
                averageCoverageRatio: sorted.length > 0
                    ? sorted.reduce((sum, d) => sum + d.coverageRatio, 0) / sorted.length
                    : 0
            }
        };
    }

    // ============================================================================
    // ANÁLISIS DE TENDENCIAS
    // ============================================================================

    async _analyzeTrends(companyId, startDate, endDate) {
        try {
            // Agrupar por mes para ver tendencias
            const [monthlyData] = await this.db.sequelize.query(`
                SELECT
                    DATE_TRUNC('month', a.date) as month,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absence_count,
                    SUM(CASE WHEN a.status = 'absent' THEN COALESCE(a.scheduled_hours, 8) ELSE 0 END) as absence_hours,
                    SUM(CASE WHEN a.status = 'present' AND a.overtime_hours > 0 THEN a.overtime_hours ELSE 0 END) as overtime_hours
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE u.company_id = :companyId
                  AND a.date BETWEEN :startDate AND :endDate
                GROUP BY DATE_TRUNC('month', a.date)
                ORDER BY month
            `, {
                replacements: { companyId, startDate, endDate },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            if (!monthlyData || monthlyData.length === 0) {
                return { available: false, message: 'No hay datos suficientes para análisis de tendencias' };
            }

            const months = monthlyData.map(m => ({
                month: m.month,
                absenceCount: parseInt(m.absence_count) || 0,
                absenceHours: parseFloat(m.absence_hours) || 0,
                overtimeHours: parseFloat(m.overtime_hours) || 0,
                overtimeToAbsenceRatio: (parseFloat(m.absence_hours) || 0) > 0
                    ? (parseFloat(m.overtime_hours) || 0) / (parseFloat(m.absence_hours) || 0)
                    : 0
            }));

            // Calcular tendencia (regresión simple)
            const n = months.length;
            if (n < 2) {
                return { available: false, message: 'Se necesitan al menos 2 meses de datos' };
            }

            const avgRatio = months.reduce((sum, m) => sum + m.overtimeToAbsenceRatio, 0) / n;
            const trend = this._calculateTrend(months.map(m => m.overtimeToAbsenceRatio));

            return {
                available: true,
                monthlyData: months,
                averageOvertimeToAbsenceRatio: avgRatio,
                trend: {
                    direction: trend > 0.05 ? 'increasing' : trend < -0.05 ? 'decreasing' : 'stable',
                    slope: trend,
                    interpretation: trend > 0.05
                        ? 'Las horas extras por reposición están aumentando - revisar políticas de ausencia'
                        : trend < -0.05
                            ? 'Mejora en la gestión de reposiciones'
                            : 'Tendencia estable'
                }
            };

        } catch (error) {
            console.error('Error en análisis de tendencias:', error);
            return { available: false, error: error.message };
        }
    }

    _calculateTrend(values) {
        const n = values.length;
        if (n < 2) return 0;

        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (values[i] - yMean);
            denominator += (i - xMean) ** 2;
        }

        return denominator !== 0 ? numerator / denominator : 0;
    }

    // ============================================================================
    // MÉTRICAS DE EFICIENCIA
    // ============================================================================

    _calculateEfficiencyMetrics(costAnalysis, absences) {
        const {
            totalAbsenceHours,
            totalReplacementOvertimeHours,
            theoreticalNormalCost,
            actualReplacementCost,
            overtimeBreakdown
        } = costAnalysis;

        // Ratio de cobertura
        const coverageRatio = totalAbsenceHours > 0
            ? totalReplacementOvertimeHours / totalAbsenceHours
            : 0;

        // Eficiencia de costo (1.0 = sin pérdida, <1 = pérdida)
        const costEfficiency = actualReplacementCost > 0
            ? theoreticalNormalCost / actualReplacementCost
            : 1;

        // Porcentaje de overtime "contaminado" por reposiciones
        const replacementContamination = overtimeBreakdown.replacementPercentage;

        // Score de salud (0-100)
        const healthScore = Math.max(0, Math.min(100,
            (costEfficiency * 40) +
            (Math.min(1, coverageRatio) * 30) +
            ((100 - replacementContamination) * 0.3)
        ));

        return {
            coverageRatio: {
                value: coverageRatio,
                percentage: coverageRatio * 100,
                interpretation: coverageRatio >= 0.9
                    ? 'Excelente - Casi todas las ausencias fueron cubiertas'
                    : coverageRatio >= 0.7
                        ? 'Buena - Mayoría de ausencias cubiertas'
                        : coverageRatio >= 0.5
                            ? 'Regular - Cobertura parcial'
                            : 'Deficiente - Muchas ausencias sin cubrir'
            },
            costEfficiency: {
                value: costEfficiency,
                percentage: costEfficiency * 100,
                interpretation: costEfficiency >= 0.9
                    ? 'Excelente - Costo de reposición cercano al normal'
                    : costEfficiency >= 0.7
                        ? 'Aceptable - Sobrecosto moderado por reposiciones'
                        : costEfficiency >= 0.5
                            ? 'Regular - Sobrecosto significativo'
                            : 'Crítico - Sobrecosto muy alto'
            },
            replacementContamination: {
                value: replacementContamination,
                interpretation: replacementContamination <= 20
                    ? 'Bajo - La mayoría del overtime es orgánico/productivo'
                    : replacementContamination <= 40
                        ? 'Moderado - Parte del overtime cubre ausencias'
                        : replacementContamination <= 60
                            ? 'Alto - Mucho overtime se usa para reposiciones'
                            : 'Crítico - El overtime es mayormente por reposiciones'
            },
            healthScore: {
                value: Math.round(healthScore),
                grade: healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D',
                interpretation: healthScore >= 80
                    ? 'Gestión de reposiciones saludable'
                    : healthScore >= 60
                        ? 'Áreas de mejora en gestión de reposiciones'
                        : healthScore >= 40
                            ? 'Se requiere atención a las reposiciones'
                            : 'Situación crítica - Revisar urgentemente'
            },
            recommendations: this._generateRecommendations(costEfficiency, coverageRatio, replacementContamination)
        };
    }

    _generateRecommendations(costEfficiency, coverageRatio, replacementContamination) {
        const recommendations = [];

        if (costEfficiency < 0.7) {
            recommendations.push({
                priority: 'HIGH',
                area: 'Costos',
                recommendation: 'Considerar contratar personal temporal para cubrir ausencias en lugar de overtime',
                expectedImpact: 'Reducción de 20-30% en costos de reposición'
            });
        }

        if (coverageRatio < 0.6) {
            recommendations.push({
                priority: 'MEDIUM',
                area: 'Cobertura',
                recommendation: 'Implementar sistema de cross-training para mejorar compatibilidad entre empleados',
                expectedImpact: 'Mejora de 15-25% en ratio de cobertura'
            });
        }

        if (replacementContamination > 50) {
            recommendations.push({
                priority: 'HIGH',
                area: 'Overtime',
                recommendation: 'Revisar políticas de ausencia y programar vacaciones estratégicamente',
                expectedImpact: 'Reducción de 30-40% en overtime por reposición'
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'LOW',
                area: 'General',
                recommendation: 'Mantener prácticas actuales - métricas saludables',
                expectedImpact: 'Continuidad en eficiencia actual'
            });
        }

        return recommendations;
    }

    // ============================================================================
    // PROYECCIONES PARA PLANIFICACIÓN DE VACACIONES
    // ============================================================================

    async getVacationPlanningProjection(companyId, vacationPeriod, options = {}) {
        try {
            // Obtener datos históricos de reposición
            const historicalAnalysis = await this.analyzeReplacementCosts(companyId, {
                startDate: this._subtractMonths(new Date(), 6),
                endDate: new Date()
            });

            if (!historicalAnalysis.success) {
                return { success: false, error: 'No hay datos históricos suficientes' };
            }

            // Calcular costo promedio de reposición por hora de ausencia
            const avgReplacementCostPerHour = historicalAnalysis.summary.costImpact.actualReplacementCost /
                Math.max(1, historicalAnalysis.summary.totalAbsenceHours);

            // Proyectar costos para el período de vacaciones
            const { plannedVacationHours = 0, departmentDistribution = {} } = options;

            const projectedCost = {
                plannedVacationHours,
                estimatedReplacementHours: plannedVacationHours * historicalAnalysis.summary.replacementRatio,
                projectedOvertimeCost: plannedVacationHours * avgReplacementCostPerHour,
                normalCostEquivalent: plannedVacationHours * this.DEFAULT_COST_MULTIPLIERS.normal,
                additionalCostProjection: plannedVacationHours * (avgReplacementCostPerHour - this.DEFAULT_COST_MULTIPLIERS.normal)
            };

            // Análisis por departamento si se proporciona distribución
            projectedCost.byDepartment = {};
            Object.entries(departmentDistribution).forEach(([deptId, hours]) => {
                const deptHistorical = historicalAnalysis.byDepartment?.ranked?.find(
                    d => String(d.departmentId) === String(deptId)
                );
                const deptMultiplier = deptHistorical?.coverageRatio || historicalAnalysis.summary.replacementRatio;

                projectedCost.byDepartment[deptId] = {
                    vacationHours: hours,
                    estimatedOvertimeNeeded: hours * deptMultiplier,
                    projectedCost: hours * avgReplacementCostPerHour
                };
            });

            return {
                success: true,
                historicalBasis: {
                    periodAnalyzed: historicalAnalysis.period,
                    avgReplacementRatio: historicalAnalysis.summary.replacementRatio,
                    avgCostPerHour: avgReplacementCostPerHour
                },
                projection: projectedCost,
                recommendations: [
                    {
                        suggestion: 'Distribuir vacaciones en períodos de menor carga histórica',
                        basedOn: 'Análisis de tendencias por mes'
                    },
                    {
                        suggestion: 'Priorizar departamentos con mejor ratio de cobertura',
                        basedOn: 'Análisis de compatibilidad de tareas'
                    }
                ]
            };

        } catch (error) {
            console.error('Error en proyección de vacaciones:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    _getDefaultStartDate() {
        const date = new Date();
        date.setMonth(date.getMonth() - 3);
        return date;
    }

    _subtractMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() - months);
        return result;
    }
}

module.exports = ReplacementCostAnalyzer;
