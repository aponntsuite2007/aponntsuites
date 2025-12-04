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
            'GET /:companyId/executive-dashboard - Dashboard ejecutivo'
        ],
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
