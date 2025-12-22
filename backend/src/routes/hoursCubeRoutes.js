/**
 * hoursCubeRoutes.js
 *
 * Rutas API para el Sistema de Analytics Avanzado
 * Base URL: /api/hours-cube
 *
 * ENDPOINTS:
 * - Hours Cube multidimensional
 * - Análisis de costos de reposición
 * - Optimizador de vacaciones
 * - Dashboard ejecutivo
 */

const express = require('express');
const router = express.Router();

// ============================================================================
// HELPER: Validar formato UUID
// ============================================================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

// Servicios
const HoursCubeService = require('../services/HoursCubeService');
const ReplacementCostAnalyzer = require('../services/ReplacementCostAnalyzer');
const VacationOptimizer = require('../services/VacationOptimizer');

// ============================================================================
// MIDDLEWARE - Inicializar servicios
// ============================================================================

let hoursCubeService = null;
let replacementAnalyzer = null;
let vacationOptimizer = null;

const initServices = (req, res, next) => {
    if (!hoursCubeService) {
        const db = require('../config/database');
        hoursCubeService = new HoursCubeService(db);
        replacementAnalyzer = new ReplacementCostAnalyzer(db);
        vacationOptimizer = new VacationOptimizer(db);
    }
    req.hoursCubeService = hoursCubeService;
    req.replacementAnalyzer = replacementAnalyzer;
    req.vacationOptimizer = vacationOptimizer;
    next();
};

router.use(initServices);

// ============================================================================
// HOURS CUBE ENDPOINTS
// ============================================================================

/**
 * GET /api/hours-cube/:companyId
 *
 * Obtiene el cubo de horas completo para una empresa
 * Incluye: totales, por sucursal, departamento, tipo de turno
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 */
router.get('/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = new Date(startDate);
        if (endDate) dateRange.endDate = new Date(endDate);

        const cube = await req.hoursCubeService.generateHoursCube(
            parseInt(companyId),
            dateRange
        );

        res.json(cube);

    } catch (error) {
        console.error('❌ Error en Hours Cube:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Error generando cubo de horas'
        });
    }
});

/**
 * GET /api/hours-cube/:companyId/drill-down/:dimension/:dimensionId
 *
 * Drill-down en una dimensión específica del cubo
 *
 * Dimensions: branch, department, shiftType
 */
router.get('/:companyId/drill-down/:dimension/:dimensionId', async (req, res) => {
    try {
        const { companyId, dimension, dimensionId } = req.params;
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = new Date(startDate);
        if (endDate) dateRange.endDate = new Date(endDate);

        const drillDown = await req.hoursCubeService.getDrillDown(
            parseInt(companyId),
            dateRange,
            dimension,
            dimensionId
        );

        res.json(drillDown);

    } catch (error) {
        console.error('❌ Error en drill-down:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/hours-cube/:companyId/compare-periods
 *
 * Compara múltiples períodos
 *
 * Body:
 * - periods: Array de { startDate, endDate }
 */
router.post('/:companyId/compare-periods', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { periods } = req.body;

        if (!periods || !Array.isArray(periods) || periods.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren al menos 2 períodos para comparar'
            });
        }

        const formattedPeriods = periods.map(p => ({
            startDate: new Date(p.startDate),
            endDate: new Date(p.endDate)
        }));

        const comparison = await req.hoursCubeService.comparePeriodsParallel(
            parseInt(companyId),
            formattedPeriods
        );

        res.json(comparison);

    } catch (error) {
        console.error('❌ Error en comparación de períodos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// REPLACEMENT COST ENDPOINTS
// ============================================================================

/**
 * GET /api/hours-cube/:companyId/replacement-costs
 *
 * Análisis de costos de reposición
 * Identifica horas extras usadas para cubrir ausencias por enfermedad/vacaciones
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 */
router.get('/:companyId/replacement-costs', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = new Date(startDate);
        if (endDate) dateRange.endDate = new Date(endDate);

        const analysis = await req.replacementAnalyzer.analyzeReplacementCosts(
            parseInt(companyId),
            dateRange
        );

        res.json(analysis);

    } catch (error) {
        console.error('❌ Error en análisis de reposición:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/hours-cube/:companyId/vacation-projection
 *
 * Proyección de costos para planificación de vacaciones
 *
 * Body:
 * - vacationPeriod: { startDate, endDate }
 * - plannedVacationHours: number
 * - departmentDistribution: { deptId: hours, ... }
 */
router.post('/:companyId/vacation-projection', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { vacationPeriod, plannedVacationHours, departmentDistribution } = req.body;

        const projection = await req.replacementAnalyzer.getVacationPlanningProjection(
            parseInt(companyId),
            vacationPeriod,
            { plannedVacationHours, departmentDistribution }
        );

        res.json(projection);

    } catch (error) {
        console.error('❌ Error en proyección de vacaciones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// VACATION OPTIMIZER ENDPOINTS
// ============================================================================

/**
 * GET /api/hours-cube/:companyId/vacation-optimizer
 *
 * Genera sugerencias de cronograma de vacaciones óptimo
 * Minimiza costos de reposición usando compatibilidad de tareas
 *
 * Query params:
 * - year: Año para planificar (default: año actual)
 * - departmentId: Filtrar por departamento
 * - prioritizeMonths: Meses preferidos (comma-separated)
 */
router.get('/:companyId/vacation-optimizer', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { year, departmentId, prioritizeMonths } = req.query;

        const options = {
            year: year ? parseInt(year) : new Date().getFullYear(),
            departmentId: departmentId ? parseInt(departmentId) : null,
            prioritizeMonths: prioritizeMonths
                ? prioritizeMonths.split(',').map(m => parseInt(m))
                : []
        };

        const schedule = await req.vacationOptimizer.suggestOptimalSchedule(
            parseInt(companyId),
            options
        );

        res.json(schedule);

    } catch (error) {
        console.error('❌ Error en optimizador de vacaciones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/hours-cube/:companyId/vacation-what-if
 *
 * Análisis what-if para cronograma propuesto
 *
 * Body:
 * - proposedSchedule: Array de { employeeId, startDate, endDate, departmentId }
 */
router.post('/:companyId/vacation-what-if', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { proposedSchedule } = req.body;

        if (!proposedSchedule || !Array.isArray(proposedSchedule)) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere proposedSchedule como array'
            });
        }

        const analysis = await req.vacationOptimizer.analyzeWhatIf(
            parseInt(companyId),
            proposedSchedule
        );

        res.json(analysis);

    } catch (error) {
        console.error('❌ Error en análisis what-if:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// EXECUTIVE DASHBOARD ENDPOINT
// ============================================================================

/**
 * GET /api/hours-cube/:companyId/executive-dashboard
 *
 * Dashboard ejecutivo completo con todas las métricas
 * Combina: Hours Cube + Replacement Costs + Vacation Analysis
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 */
router.get('/:companyId/executive-dashboard', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = new Date(startDate);
        if (endDate) dateRange.endDate = new Date(endDate);

        // Ejecutar todos los análisis en paralelo
        const [hoursCube, replacementCosts, vacationSuggestions] = await Promise.all([
            req.hoursCubeService.generateHoursCube(parseInt(companyId), dateRange),
            req.replacementAnalyzer.analyzeReplacementCosts(parseInt(companyId), dateRange),
            req.vacationOptimizer.suggestOptimalSchedule(parseInt(companyId), {
                year: new Date().getFullYear()
            })
        ]);

        // Construir dashboard ejecutivo
        const dashboard = {
            success: true,
            companyId: parseInt(companyId),
            period: hoursCube.period || dateRange,
            generatedAt: new Date().toISOString(),

            // Resumen de horas
            hoursSummary: hoursCube.success ? {
                total: hoursCube.executiveSummary?.hours,
                costs: hoursCube.executiveSummary?.costs,
                topBranches: hoursCube.executiveSummary?.topBranches,
                topOvertimeDepartments: hoursCube.executiveSummary?.topOvertimeDepartments,
                alerts: hoursCube.executiveSummary?.alerts
            } : null,

            // Análisis de reposición
            replacementAnalysis: replacementCosts.success ? {
                summary: replacementCosts.summary,
                byAbsenceType: replacementCosts.byAbsenceType,
                efficiencyMetrics: replacementCosts.efficiencyMetrics,
                trends: replacementCosts.trends
            } : null,

            // Sugerencias de vacaciones
            vacationOptimization: vacationSuggestions.success ? {
                summary: vacationSuggestions.summary,
                topSuggestions: (vacationSuggestions.schedule || []).slice(0, 5),
                projectedImpact: vacationSuggestions.projectedImpact
            } : null,

            // KPIs ejecutivos
            kpis: {
                attendanceRate: hoursCube.executiveSummary?.period?.attendanceRate || 0,
                overtimeRatio: hoursCube.executiveSummary?.hours?.overtimeRatio || 0,
                costEfficiency: replacementCosts.efficiencyMetrics?.costEfficiency?.percentage || 0,
                healthScore: replacementCosts.efficiencyMetrics?.healthScore?.value || 0,
                potentialSavings: vacationSuggestions.projectedImpact?.estimatedSavings || 0
            },

            // Drill-down disponible
            drillDownDimensions: hoursCube.dimensions || {},

            // Metodología
            methodology: {
                hoursCube: hoursCube.metadata || {},
                replacementCosts: replacementCosts.methodology || {},
                vacationOptimizer: vacationSuggestions.methodology || {}
            }
        };

        res.json(dashboard);

    } catch (error) {
        console.error('❌ Error en dashboard ejecutivo:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Error generando dashboard ejecutivo'
        });
    }
});

// ============================================================================
// MULTI-LEVEL OVERTIME METRICS (NEW)
// ============================================================================

/**
 * GET /api/hours-cube/:companyId/multi-level-metrics
 *
 * Métricas de horas completas en todos los niveles de la organización:
 * - Global (empresa)
 * - Por Sucursal
 * - Por Departamento
 * - Por Sector
 * - Por Turno (con multiplicadores específicos)
 * - Por Empleado
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 * - level: 'all' | 'company' | 'branch' | 'department' | 'sector' | 'shift' | 'employee'
 * - branchId: Filtrar por sucursal
 * - departmentId: Filtrar por departamento
 * - shiftId: Filtrar por turno
 */
router.get('/:companyId/multi-level-metrics', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate, level, branchId, departmentId, shiftId } = req.query;

        const db = require('../config/database');
        const { sequelize } = db;
        const OvertimeCalculatorService = require('../services/OvertimeCalculatorService');

        // Fechas por defecto: último mes
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Query base con todos los datos necesarios
        let baseQuery = `
            SELECT
                a.id,
                a.user_id,
                a.date,
                a.check_in,
                a.check_out,
                a.status,
                a.is_late,
                COALESCE(a.worked_hours, 0) as worked_hours,
                COALESCE(a.scheduled_hours, 8) as scheduled_hours,
                u.first_name,
                u.last_name,
                u.legajo,
                u.branch_id,
                u.sector,
                COALESCE(a.department_id, u.department_id) as department_id,
                d.name as department_name,
                b.name as branch_name,
                s.id as shift_id,
                s.name as shift_name,
                s."startTime" as shift_start,
                s."endTime" as shift_end,
                s."hourlyRates" as hourly_rates,
                EXTRACT(DOW FROM a.date) as day_of_week
            FROM attendance a
            INNER JOIN users u ON a.user_id = u.id
            LEFT JOIN departments d ON COALESCE(a.department_id, u.department_id) = d.id
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN user_shift_assignments usa ON usa.user_id = u.id AND usa.is_active = true
            LEFT JOIN shifts s ON s.id = usa.shift_id
            WHERE u.company_id = :companyId
              AND a.date BETWEEN :startDate AND :endDate
              AND (a.check_in IS NOT NULL OR a.check_out IS NOT NULL)
        `;

        // Filtros adicionales
        const replacements = { companyId, startDate: start, endDate: end };

        if (branchId) {
            baseQuery += ` AND u.branch_id = :branchId`;
            replacements.branchId = branchId;
        }
        if (departmentId) {
            baseQuery += ` AND COALESCE(a.department_id, u.department_id) = :departmentId`;
            replacements.departmentId = departmentId;
        }
        if (shiftId) {
            baseQuery += ` AND usa.shift_id = :shiftId`;
            replacements.shiftId = shiftId;
        }

        baseQuery += ` ORDER BY a.date DESC, u.last_name, u.first_name`;

        const [attendances] = await sequelize.query(baseQuery, {
            replacements,
            type: sequelize.QueryTypes?.SELECT || 'SELECT'
        });

        if (!attendances || attendances.length === 0) {
            return res.json({
                success: true,
                message: 'No hay registros de asistencia en el período',
                period: { startDate: start, endDate: end },
                metrics: {
                    company: { totalHours: 0, normalHours: 0, overtimeHours: 0 },
                    byBranch: [],
                    byDepartment: [],
                    bySector: [],
                    byShift: [],
                    byEmployee: []
                }
            });
        }

        // Procesar cada asistencia con OvertimeCalculatorService
        const processedAttendances = attendances.map(att => {
            const shift = att.shift_id ? {
                id: att.shift_id,
                name: att.shift_name,
                startTime: att.shift_start,
                endTime: att.shift_end,
                hourlyRates: att.hourly_rates || { normal: 1, overtime: 1.5, weekend: 1.5, holiday: 2 }
            } : null;

            const isWeekend = att.day_of_week === 0 || att.day_of_week === 6;

            const breakdown = OvertimeCalculatorService.calculateHoursBreakdown(
                { check_in: att.check_in, check_out: att.check_out, date: att.date },
                shift,
                false // TODO: Check holidays
            );

            return {
                ...att,
                ...breakdown,
                userName: `${att.first_name || ''} ${att.last_name || ''}`.trim() || 'Sin nombre',
                isWeekend
            };
        });

        // Agregadores
        const createAggregator = () => ({
            totalHours: 0,
            normalHours: 0,
            overtimeHours: 0,
            effectiveHours: 0,
            breakHours: 0,
            expectedHours: 0,
            recordCount: 0,
            lateCount: 0,
            weekendHours: 0,
            holidayHours: 0,
            multipliers: { normal: 0, overtime: 0, weekend: 0, holiday: 0 },
            employees: new Set()
        });

        const addToAggregator = (agg, record) => {
            agg.totalHours += record.totalHours || 0;
            agg.normalHours += record.normalHours || 0;
            agg.overtimeHours += record.overtimeHours || 0;
            agg.effectiveHours += record.effectiveHours || 0;
            agg.breakHours += (record.breakMinutes || 0) / 60;
            agg.expectedHours += record.expectedWorkHours || 8;
            agg.recordCount++;
            if (record.is_late) agg.lateCount++;
            if (record.isWeekend) agg.weekendHours += record.effectiveHours || 0;
            if (record.isHoliday) agg.holidayHours += record.effectiveHours || 0;
            agg.employees.add(record.user_id);

            // Acumular multiplicadores (para promediar después)
            if (record.multipliers) {
                agg.multipliers.normal += record.multipliers.normal || 1;
                agg.multipliers.overtime += record.multipliers.overtime || 1.5;
                agg.multipliers.weekend += record.multipliers.weekend || 1.5;
                agg.multipliers.holiday += record.multipliers.holiday || 2;
            }
        };

        const finalizeAggregator = (agg) => {
            const count = agg.recordCount || 1;
            return {
                totalHours: parseFloat(agg.totalHours.toFixed(2)),
                normalHours: parseFloat(agg.normalHours.toFixed(2)),
                overtimeHours: parseFloat(agg.overtimeHours.toFixed(2)),
                effectiveHours: parseFloat(agg.effectiveHours.toFixed(2)),
                breakHours: parseFloat(agg.breakHours.toFixed(2)),
                expectedHours: parseFloat(agg.expectedHours.toFixed(2)),
                recordCount: agg.recordCount,
                lateCount: agg.lateCount,
                latePercentage: parseFloat(((agg.lateCount / count) * 100).toFixed(1)),
                weekendHours: parseFloat(agg.weekendHours.toFixed(2)),
                holidayHours: parseFloat(agg.holidayHours.toFixed(2)),
                uniqueEmployees: agg.employees.size,
                percentages: {
                    normalPct: agg.totalHours > 0 ? parseFloat(((agg.normalHours / agg.totalHours) * 100).toFixed(1)) : 0,
                    overtimePct: agg.totalHours > 0 ? parseFloat(((agg.overtimeHours / agg.totalHours) * 100).toFixed(1)) : 0,
                    weekendPct: agg.totalHours > 0 ? parseFloat(((agg.weekendHours / agg.totalHours) * 100).toFixed(1)) : 0,
                    holidayPct: agg.totalHours > 0 ? parseFloat(((agg.holidayHours / agg.totalHours) * 100).toFixed(1)) : 0
                },
                avgMultipliers: {
                    normal: parseFloat((agg.multipliers.normal / count).toFixed(2)),
                    overtime: parseFloat((agg.multipliers.overtime / count).toFixed(2)),
                    weekend: parseFloat((agg.multipliers.weekend / count).toFixed(2)),
                    holiday: parseFloat((agg.multipliers.holiday / count).toFixed(2))
                },
                efficiency: agg.expectedHours > 0
                    ? parseFloat(((agg.effectiveHours / agg.expectedHours) * 100).toFixed(1))
                    : 0
            };
        };

        // Agregar por nivel
        const companyAgg = createAggregator();
        const branchAggs = new Map();
        const deptAggs = new Map();
        const sectorAggs = new Map();
        const shiftAggs = new Map();
        const employeeAggs = new Map();

        for (const record of processedAttendances) {
            // Company level
            addToAggregator(companyAgg, record);

            // Branch level
            const branchKey = record.branch_id || 'unassigned';
            if (!branchAggs.has(branchKey)) {
                branchAggs.set(branchKey, {
                    ...createAggregator(),
                    id: branchKey,
                    name: record.branch_name || 'Sin Sucursal'
                });
            }
            addToAggregator(branchAggs.get(branchKey), record);

            // Department level
            const deptKey = record.department_id || 'unassigned';
            if (!deptAggs.has(deptKey)) {
                deptAggs.set(deptKey, {
                    ...createAggregator(),
                    id: deptKey,
                    name: record.department_name || 'Sin Departamento',
                    branchId: record.branch_id
                });
            }
            addToAggregator(deptAggs.get(deptKey), record);

            // Sector level
            const sectorKey = record.sector || 'unassigned';
            if (!sectorAggs.has(sectorKey)) {
                sectorAggs.set(sectorKey, {
                    ...createAggregator(),
                    id: sectorKey,
                    name: record.sector || 'Sin Sector',
                    departmentId: record.department_id
                });
            }
            addToAggregator(sectorAggs.get(sectorKey), record);

            // Shift level
            const shiftKey = record.shift_id || 'unassigned';
            if (!shiftAggs.has(shiftKey)) {
                shiftAggs.set(shiftKey, {
                    ...createAggregator(),
                    id: shiftKey,
                    name: record.shift_name || 'Sin Turno',
                    schedule: record.shift_id ? `${record.shift_start?.substring(0,5) || '--:--'} - ${record.shift_end?.substring(0,5) || '--:--'}` : null,
                    configuredRates: record.hourly_rates || { normal: 1, overtime: 1.5, weekend: 1.5, holiday: 2 }
                });
            }
            addToAggregator(shiftAggs.get(shiftKey), record);

            // Employee level
            const empKey = record.user_id;
            if (!employeeAggs.has(empKey)) {
                employeeAggs.set(empKey, {
                    ...createAggregator(),
                    id: empKey,
                    name: record.userName,
                    legajo: record.legajo,
                    departmentId: record.department_id,
                    departmentName: record.department_name,
                    branchId: record.branch_id,
                    branchName: record.branch_name,
                    shiftId: record.shift_id,
                    shiftName: record.shift_name,
                    sector: record.sector
                });
            }
            addToAggregator(employeeAggs.get(empKey), record);
        }

        // Construir respuesta según nivel solicitado
        const requestedLevel = level || 'all';
        const metrics = {};

        // Company metrics (siempre incluidos)
        metrics.company = finalizeAggregator(companyAgg);

        // Branch metrics
        if (requestedLevel === 'all' || requestedLevel === 'branch') {
            metrics.byBranch = Array.from(branchAggs.values()).map(b => ({
                id: b.id,
                name: b.name,
                ...finalizeAggregator(b),
                pctOfCompany: companyAgg.totalHours > 0
                    ? parseFloat(((b.totalHours / companyAgg.totalHours) * 100).toFixed(1))
                    : 0
            })).sort((a, b) => b.totalHours - a.totalHours);
        }

        // Department metrics
        if (requestedLevel === 'all' || requestedLevel === 'department') {
            metrics.byDepartment = Array.from(deptAggs.values()).map(d => ({
                id: d.id,
                name: d.name,
                branchId: d.branchId,
                ...finalizeAggregator(d),
                pctOfCompany: companyAgg.totalHours > 0
                    ? parseFloat(((d.totalHours / companyAgg.totalHours) * 100).toFixed(1))
                    : 0
            })).sort((a, b) => b.totalHours - a.totalHours);
        }

        // Sector metrics
        if (requestedLevel === 'all' || requestedLevel === 'sector') {
            metrics.bySector = Array.from(sectorAggs.values()).map(s => ({
                id: s.id,
                name: s.name,
                departmentId: s.departmentId,
                ...finalizeAggregator(s),
                pctOfCompany: companyAgg.totalHours > 0
                    ? parseFloat(((s.totalHours / companyAgg.totalHours) * 100).toFixed(1))
                    : 0
            })).sort((a, b) => b.totalHours - a.totalHours);
        }

        // Shift metrics (con configuración de multiplicadores)
        if (requestedLevel === 'all' || requestedLevel === 'shift') {
            metrics.byShift = Array.from(shiftAggs.values()).map(sh => ({
                id: sh.id,
                name: sh.name,
                schedule: sh.schedule,
                configuredRates: sh.configuredRates,
                ...finalizeAggregator(sh),
                pctOfCompany: companyAgg.totalHours > 0
                    ? parseFloat(((sh.totalHours / companyAgg.totalHours) * 100).toFixed(1))
                    : 0,
                overtimeCost: parseFloat(
                    (sh.overtimeHours * (sh.configuredRates?.overtime || 1.5) +
                     sh.weekendHours * (sh.configuredRates?.weekend || 1.5) +
                     sh.holidayHours * (sh.configuredRates?.holiday || 2)).toFixed(2)
                )
            })).sort((a, b) => b.totalHours - a.totalHours);
        }

        // Employee metrics
        if (requestedLevel === 'all' || requestedLevel === 'employee') {
            metrics.byEmployee = Array.from(employeeAggs.values()).map(e => ({
                id: e.id,
                name: e.name,
                legajo: e.legajo,
                departmentId: e.departmentId,
                departmentName: e.departmentName,
                branchId: e.branchId,
                branchName: e.branchName,
                shiftId: e.shiftId,
                shiftName: e.shiftName,
                sector: e.sector,
                ...finalizeAggregator(e),
                pctOfCompany: companyAgg.totalHours > 0
                    ? parseFloat(((e.totalHours / companyAgg.totalHours) * 100).toFixed(1))
                    : 0
            })).sort((a, b) => b.totalHours - a.totalHours);
        }

        res.json({
            success: true,
            companyId: parseInt(companyId),
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
                daysInPeriod: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
            },
            recordsProcessed: processedAttendances.length,
            requestedLevel,
            metrics,
            metadata: {
                generatedAt: new Date().toISOString(),
                dimensions: ['company', 'branch', 'department', 'sector', 'shift', 'employee'],
                note: 'Los multiplicadores por turno vienen de la configuración shift.hourlyRates',
                percentages: 'normalPct + overtimePct = 100% (weekendPct y holidayPct son subconjuntos)'
            }
        });

    } catch (error) {
        console.error('❌ Error en multi-level metrics:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * GET /api/hours-cube/:companyId/employee/:userId/metrics
 *
 * Métricas de horas para un empleado específico
 * Útil para la ficha del empleado
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 * - period: 'week' | 'month' | 'quarter' | 'year' (default: month)
 */
router.get('/:companyId/employee/:userId/metrics', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { startDate, endDate, period } = req.query;

        // ✅ FIX: Validar UUID
        if (!isValidUUID(userId)) {
            return res.json({ success: false, error: 'userId inválido', employee: null, metrics: null });
        }

        const db = require('../config/database');
        const { sequelize } = db;
        const OvertimeCalculatorService = require('../services/OvertimeCalculatorService');

        // Determinar rango de fechas
        const end = endDate ? new Date(endDate) : new Date();
        let start;

        if (startDate) {
            start = new Date(startDate);
        } else {
            switch (period) {
                case 'week':
                    start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'quarter':
                    start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case 'year':
                    start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
                    break;
                default: // month
                    start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
        }

        // Obtener datos del empleado y su turno
        const [userInfo] = await sequelize.query(`
            SELECT
                u.user_id as id,
                u."firstName" as first_name,
                u."lastName" as last_name,
                u.legajo,
                u.email,
                u.default_branch_id as branch_id,
                u.department_id,
                u.sector,
                d.name as department_name,
                b.name as branch_name,
                s.id as shift_id,
                s.name as shift_name,
                s."startTime" as shift_start,
                s."endTime" as shift_end,
                s."hourlyRates" as hourly_rates,
                s."toleranceConfig" as tolerance_config
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN branches b ON u.default_branch_id = b.id
            LEFT JOIN user_shift_assignments usa ON usa.user_id = u.user_id AND usa.is_active = true
            LEFT JOIN shifts s ON s.id = usa.shift_id
            WHERE u.user_id = :userId AND u.company_id = :companyId
            LIMIT 1
        `, {
            replacements: { userId, companyId },
            type: sequelize.QueryTypes?.SELECT || 'SELECT'
        });

        if (!userInfo || userInfo.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Empleado no encontrado'
            });
        }

        const user = userInfo[0];

        // Obtener asistencias del empleado
        const [attendances] = await sequelize.query(`
            SELECT
                a.id,
                a.date,
                a.check_in,
                a.check_out,
                a.status,
                a.is_late,
                EXTRACT(DOW FROM a.date) as day_of_week
            FROM attendance a
            WHERE a.user_id = :userId
              AND a.date BETWEEN :startDate AND :endDate
            ORDER BY a.date DESC
        `, {
            replacements: { userId, startDate: start, endDate: end },
            type: sequelize.QueryTypes?.SELECT || 'SELECT'
        });

        // Crear objeto shift para el cálculo
        const shift = user.shift_id ? {
            id: user.shift_id,
            name: user.shift_name,
            startTime: user.shift_start,
            endTime: user.shift_end,
            hourlyRates: user.hourly_rates || { normal: 1, overtime: 1.5, weekend: 1.5, holiday: 2 },
            toleranceConfig: user.tolerance_config
        } : null;

        // Procesar cada asistencia
        let totals = {
            totalHours: 0,
            normalHours: 0,
            overtimeHours: 0,
            effectiveHours: 0,
            breakMinutes: 0,
            expectedHours: 0,
            daysPresent: 0,
            daysLate: 0,
            weekendDays: 0,
            weekendHours: 0
        };

        const dailyBreakdown = [];

        for (const att of attendances) {
            const isWeekend = att.day_of_week === 0 || att.day_of_week === 6;

            const breakdown = OvertimeCalculatorService.calculateHoursBreakdown(
                { check_in: att.check_in, check_out: att.check_out, date: att.date },
                shift,
                false
            );

            const lateInfo = OvertimeCalculatorService.detectLateArrival(
                { check_in: att.check_in },
                shift
            );

            dailyBreakdown.push({
                date: att.date,
                dayOfWeek: att.day_of_week,
                isWeekend,
                checkIn: att.check_in,
                checkOut: att.check_out,
                status: att.status,
                isLate: lateInfo.isLate,
                lateMinutes: lateInfo.lateMinutes,
                ...breakdown
            });

            // Acumular
            if (att.check_in && att.check_out) {
                totals.totalHours += breakdown.totalHours || 0;
                totals.normalHours += breakdown.normalHours || 0;
                totals.overtimeHours += breakdown.overtimeHours || 0;
                totals.effectiveHours += breakdown.effectiveHours || 0;
                totals.breakMinutes += breakdown.breakMinutes || 0;
                totals.expectedHours += breakdown.expectedWorkHours || 8;
                totals.daysPresent++;
                if (lateInfo.isLate) totals.daysLate++;
                if (isWeekend) {
                    totals.weekendDays++;
                    totals.weekendHours += breakdown.effectiveHours || 0;
                }
            }
        }

        // Calcular porcentajes y métricas
        const metrics = {
            totalHours: parseFloat(totals.totalHours.toFixed(2)),
            normalHours: parseFloat(totals.normalHours.toFixed(2)),
            overtimeHours: parseFloat(totals.overtimeHours.toFixed(2)),
            effectiveHours: parseFloat(totals.effectiveHours.toFixed(2)),
            breakHours: parseFloat((totals.breakMinutes / 60).toFixed(2)),
            expectedHours: parseFloat(totals.expectedHours.toFixed(2)),
            daysPresent: totals.daysPresent,
            daysLate: totals.daysLate,
            weekendDays: totals.weekendDays,
            weekendHours: parseFloat(totals.weekendHours.toFixed(2)),
            percentages: {
                normalPct: totals.totalHours > 0 ? parseFloat(((totals.normalHours / totals.totalHours) * 100).toFixed(1)) : 0,
                overtimePct: totals.totalHours > 0 ? parseFloat(((totals.overtimeHours / totals.totalHours) * 100).toFixed(1)) : 0,
                weekendPct: totals.totalHours > 0 ? parseFloat(((totals.weekendHours / totals.totalHours) * 100).toFixed(1)) : 0,
                punctuality: totals.daysPresent > 0 ? parseFloat((((totals.daysPresent - totals.daysLate) / totals.daysPresent) * 100).toFixed(1)) : 0
            },
            averages: {
                hoursPerDay: totals.daysPresent > 0 ? parseFloat((totals.effectiveHours / totals.daysPresent).toFixed(2)) : 0,
                overtimePerDay: totals.daysPresent > 0 ? parseFloat((totals.overtimeHours / totals.daysPresent).toFixed(2)) : 0
            },
            efficiency: totals.expectedHours > 0
                ? parseFloat(((totals.effectiveHours / totals.expectedHours) * 100).toFixed(1))
                : 0
        };

        res.json({
            success: true,
            employee: {
                id: user.id,
                name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                legajo: user.legajo,
                email: user.email,
                department: { id: user.department_id, name: user.department_name },
                branch: { id: user.branch_id, name: user.branch_name },
                sector: user.sector,
                shift: shift ? {
                    id: shift.id,
                    name: shift.name,
                    schedule: `${shift.startTime?.substring(0,5) || '--:--'} - ${shift.endTime?.substring(0,5) || '--:--'}`,
                    hourlyRates: shift.hourlyRates
                } : null
            },
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
                periodType: period || 'month',
                daysInPeriod: Math.ceil((end - start) / (1000 * 60 * 60 * 1000 * 24))
            },
            metrics,
            dailyBreakdown: dailyBreakdown.slice(0, 31), // Últimos 31 registros
            metadata: {
                generatedAt: new Date().toISOString(),
                recordsProcessed: attendances.length
            }
        });

    } catch (error) {
        console.error('❌ Error en employee metrics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'Hours Cube Analytics Service',
        version: '2.0.0',
        components: [
            {
                name: 'HoursCubeService',
                description: 'Cubo multidimensional de horas',
                dimensions: ['branch', 'department', 'shiftType']
            },
            {
                name: 'ReplacementCostAnalyzer',
                description: 'Análisis de costos de reposición',
                features: ['correlation', 'efficiency metrics', 'trends']
            },
            {
                name: 'VacationOptimizer',
                description: 'Optimizador de cronogramas de vacaciones',
                features: ['task compatibility', 'cost minimization', 'what-if analysis']
            }
        ],
        endpoints: [
            'GET /:companyId - Hours Cube completo',
            'GET /:companyId/drill-down/:dimension/:id - Drill-down',
            'POST /:companyId/compare-periods - Comparar períodos',
            'GET /:companyId/replacement-costs - Costos de reposición',
            'POST /:companyId/vacation-projection - Proyección vacaciones',
            'GET /:companyId/vacation-optimizer - Sugerir cronograma',
            'POST /:companyId/vacation-what-if - Análisis what-if',
            'GET /:companyId/executive-dashboard - Dashboard ejecutivo',
            'GET /:companyId/multi-level-metrics - Métricas multi-nivel (NEW)',
            'GET /:companyId/employee/:userId/metrics - Métricas por empleado (NEW)'
        ],
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
