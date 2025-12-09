/**
 * attendanceAdvancedStatsRoutes.js
 *
 * Rutas API para Estadísticas Avanzadas de Asistencia
 * Sistema de Ecosistema Inteligente
 *
 * Base URL: /api/attendance-stats
 *
 * CARACTERÍSTICAS:
 * - Media acotada (trimmed mean) para análisis objetivo
 * - Desviación estándar y distribución Gaussiana
 * - Segmentación por zona climática
 * - Comparativas entre sucursales de misma región
 * - Correlaciones temporales (día, estación, feriados)
 */

const express = require('express');
const router = express.Router();
const AttendanceAdvancedStatsService = require('../services/AttendanceAdvancedStatsService');

// ============================================================================
// MIDDLEWARE - Inicializar servicio con conexión a BD
// ============================================================================
let statsService = null;

const initService = (req, res, next) => {
    if (!statsService) {
        const db = require('../config/database');
        statsService = new AttendanceAdvancedStatsService(db);
    }
    req.statsService = statsService;
    next();
};

router.use(initService);

// ============================================================================
// ENDPOINTS PRINCIPALES
// ============================================================================

/**
 * GET /api/attendance-stats/advanced/:companyId
 *
 * Obtiene estadísticas avanzadas completas para una empresa
 * Incluye: métricas globales, por zona climática, rankings, análisis temporal
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 */
router.get('/advanced/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = new Date(startDate);
        if (endDate) dateRange.endDate = new Date(endDate);

        const stats = await req.statsService.getAdvancedStats(
            parseInt(companyId),
            dateRange
        );

        res.json(stats);

    } catch (error) {
        console.error('❌ Error en estadísticas avanzadas:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Error obteniendo estadísticas avanzadas'
        });
    }
});

/**
 * GET /api/attendance-stats/branch-comparison/:companyId
 *
 * Compara sucursales SOLO dentro de la misma zona climática
 * IMPORTANTE: No compara Jujuy con Ushuaia directamente
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 */
router.get('/branch-comparison/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = new Date(startDate);
        if (endDate) dateRange.endDate = new Date(endDate);

        const comparison = await req.statsService.compareBranchesInSameZone(
            parseInt(companyId),
            dateRange
        );

        res.json(comparison);

    } catch (error) {
        console.error('❌ Error en comparativa de sucursales:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Error comparando sucursales'
        });
    }
});

/**
 * GET /api/attendance-stats/climate-zones
 *
 * Retorna la configuración de zonas climáticas disponibles
 * Útil para el frontend para mostrar leyendas y filtros
 */
router.get('/climate-zones', (req, res) => {
    const { CLIMATE_ZONES, SEASONS, WEEKDAY_IMPACT } = require('../services/AttendanceAdvancedStatsService');

    res.json({
        success: true,
        climateZones: Object.entries(CLIMATE_ZONES).map(([code, zone]) => ({
            code,
            name: zone.name,
            description: zone.description,
            provinces: zone.provinces,
            latitudeRange: {
                min: zone.maxLat, // En hemisferio sur, maxLat es más cercano a 0
                max: zone.minLat
            },
            characteristics: {
                winterTemp: zone.winterTemp,
                summerTemp: zone.summerTemp
            }
        })),
        seasons: Object.entries(SEASONS).map(([code, season]) => ({
            code,
            name: season.name,
            months: season.months
        })),
        weekdayImpact: Object.entries(WEEKDAY_IMPACT).map(([day, info]) => ({
            day: parseInt(day),
            name: info.name,
            expectedImpact: info.expectedImpact,
            description: info.description
        })),
        methodology: {
            trimmedMeanPercent: 10,
            outlierMethod: 'IQR (Interquartile Range)',
            minimumRecordsForAnalysis: 10,
            minimumRecordsForRanking: 20,
            scoringFormula: 'score = presentRate - (lateRate * 0.5) - (absentRate * 1.5)'
        }
    });
});

/**
 * GET /api/attendance-stats/distribution/:companyId
 *
 * Obtiene la distribución de horarios de llegada
 * Para graficar campana de Gauss
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 * - bins: Número de intervalos para el histograma (default: 12)
 */
router.get('/distribution/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate, bins = 12 } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = new Date(startDate);
        if (endDate) dateRange.endDate = new Date(endDate);

        const stats = await req.statsService.getAdvancedStats(
            parseInt(companyId),
            dateRange
        );

        if (!stats.success) {
            return res.status(400).json(stats);
        }

        res.json({
            success: true,
            companyId: parseInt(companyId),
            period: stats.period,
            arrivalDistribution: stats.arrivalDistribution,
            interpretation: stats.arrivalDistribution.available ? {
                meanArrivalTime: stats.arrivalDistribution.formattedMean,
                trimmedMeanArrivalTime: stats.arrivalDistribution.formattedTrimmedMean,
                stdDevMinutes: stats.arrivalDistribution.statistics.stdDev,
                cv: stats.arrivalDistribution.statistics.cv,
                outlierPercentage: stats.arrivalDistribution.outlierAnalysis.outlierPercentage,
                normalDistributionFit: stats.arrivalDistribution.statistics.cv < 20
                    ? 'Alta - Distribución cercana a normal'
                    : stats.arrivalDistribution.statistics.cv < 40
                        ? 'Media - Variabilidad moderada'
                        : 'Baja - Alta variabilidad, considerar segmentar por turno'
            } : null
        });

    } catch (error) {
        console.error('❌ Error en distribución:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/attendance-stats/temporal/:companyId
 *
 * Obtiene análisis de patrones temporales
 * - Por día de semana
 * - Por estación del año
 * - Impacto de feriados
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 */
router.get('/temporal/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = new Date(startDate);
        if (endDate) dateRange.endDate = new Date(endDate);

        const stats = await req.statsService.getAdvancedStats(
            parseInt(companyId),
            dateRange
        );

        if (!stats.success || !stats.temporalAnalysis) {
            return res.status(400).json({
                success: false,
                error: 'No hay datos temporales disponibles'
            });
        }

        res.json({
            success: true,
            companyId: parseInt(companyId),
            period: stats.period,
            sampleSize: stats.sampleSize,
            temporalAnalysis: stats.temporalAnalysis
        });

    } catch (error) {
        console.error('❌ Error en análisis temporal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/attendance-stats/department-rankings/:companyId
 *
 * Obtiene rankings de departamentos por zona climática
 * IMPORTANTE: Solo compara departamentos dentro de la misma zona
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 * - zone: Filtrar por zona específica (NORTH_WARM, CENTER_TEMPERATE, SOUTH_COLD)
 */
router.get('/department-rankings/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate, zone } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = new Date(startDate);
        if (endDate) dateRange.endDate = new Date(endDate);

        const stats = await req.statsService.getAdvancedStats(
            parseInt(companyId),
            dateRange
        );

        if (!stats.success || !stats.departmentRankings) {
            return res.status(400).json({
                success: false,
                error: 'No hay datos de ranking disponibles'
            });
        }

        let rankings = stats.departmentRankings;

        // Filtrar por zona si se especifica
        if (zone && rankings[zone]) {
            rankings = { [zone]: rankings[zone] };
        }

        res.json({
            success: true,
            companyId: parseInt(companyId),
            period: stats.period,
            sampleSize: stats.sampleSize,
            rankings,
            methodology: stats.methodology
        });

    } catch (error) {
        console.error('❌ Error en rankings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/attendance-stats/calculate-trimmed-mean
 *
 * Endpoint utilitario para calcular media acotada sobre datos custom
 * Útil para análisis ad-hoc desde frontend
 *
 * Body:
 * - values: Array de números
 * - trimPercent: Porcentaje a recortar (default: 0.10)
 */
router.post('/calculate-trimmed-mean', (req, res) => {
    try {
        const { values, trimPercent = 0.10 } = req.body;

        if (!values || !Array.isArray(values)) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de valores numéricos'
            });
        }

        const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));

        if (numericValues.length < 4) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren al menos 4 valores para calcular media acotada'
            });
        }

        const trimmedMean = req.statsService.trimmedMean(numericValues, trimPercent);
        const rawMean = req.statsService.mean(numericValues);
        const stdDev = req.statsService.standardDeviation(numericValues);
        const cv = req.statsService.coefficientOfVariation(numericValues);
        const percentiles = req.statsService.percentiles(numericValues);
        const outlierAnalysis = req.statsService.detectOutliers(numericValues);

        res.json({
            success: true,
            input: {
                count: numericValues.length,
                trimPercent
            },
            results: {
                rawMean,
                trimmedMean,
                difference: rawMean - trimmedMean,
                differencePercent: ((rawMean - trimmedMean) / rawMean) * 100,
                stdDev,
                cv,
                percentiles,
                outlierAnalysis
            },
            interpretation: {
                outlierImpact: Math.abs(rawMean - trimmedMean) > stdDev * 0.5
                    ? 'Alto - Los outliers afectan significativamente la media'
                    : 'Bajo - Los outliers tienen poco impacto'
            }
        });

    } catch (error) {
        console.error('❌ Error calculando media acotada:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/attendance-stats/absences/:companyId/:date
 *
 * Obtiene empleados ausentes para una fecha específica
 * Compara turno asignado vs fichaje real (SSOT)
 *
 * Query params:
 * - department_id: Filtrar por departamento
 * - branch_id: Filtrar por sucursal
 * - shift_id: Filtrar por turno específico
 */
router.get('/absences/:companyId/:date', async (req, res) => {
    try {
        const { companyId, date } = req.params;
        const { department_id, branch_id, shift_id } = req.query;

        const filters = {};
        if (department_id) filters.department_id = parseInt(department_id);
        if (branch_id) filters.branch_id = parseInt(branch_id);
        if (shift_id) filters.shift_id = parseInt(shift_id);

        const result = await req.statsService.getAbsentEmployees(
            parseInt(companyId),
            date,
            filters
        );

        res.json(result);

    } catch (error) {
        console.error('❌ Error obteniendo ausentes:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Error obteniendo lista de ausentes'
        });
    }
});

/**
 * GET /api/attendance-stats/absenteeism-report/:companyId
 *
 * Obtiene reporte de ausentismo para un rango de fechas
 * Incluye tendencias por día de semana, días críticos
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 * - department_id: Filtrar por departamento
 * - branch_id: Filtrar por sucursal
 * - shift_id: Filtrar por turno
 * - includeWeekends: true para incluir fines de semana
 */
router.get('/absenteeism-report/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate, department_id, branch_id, shift_id, includeWeekends } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren startDate y endDate'
            });
        }

        const filters = {};
        if (department_id) filters.department_id = parseInt(department_id);
        if (branch_id) filters.branch_id = parseInt(branch_id);
        if (shift_id) filters.shift_id = parseInt(shift_id);
        if (includeWeekends === 'true') filters.includeWeekends = true;

        const result = await req.statsService.getAbsenteeismReport(
            parseInt(companyId),
            startDate,
            endDate,
            filters
        );

        res.json(result);

    } catch (error) {
        console.error('❌ Error en reporte de ausentismo:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Error generando reporte de ausentismo'
        });
    }
});

/**
 * GET /api/attendance-stats/absences-today/:companyId
 *
 * Atajo para obtener ausentes de HOY
 */
router.get('/absences-today/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { department_id, branch_id, shift_id } = req.query;

        const today = new Date().toISOString().split('T')[0];

        const filters = {};
        if (department_id) filters.department_id = parseInt(department_id);
        if (branch_id) filters.branch_id = parseInt(branch_id);
        if (shift_id) filters.shift_id = parseInt(shift_id);

        const result = await req.statsService.getAbsentEmployees(
            parseInt(companyId),
            today,
            filters
        );

        res.json(result);

    } catch (error) {
        console.error('❌ Error obteniendo ausentes de hoy:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Error obteniendo lista de ausentes de hoy'
        });
    }
});

/**
 * GET /api/attendance-stats/health
 *
 * Health check del servicio de estadísticas avanzadas
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'AttendanceAdvancedStatsService',
        version: '2.0.0',
        features: [
            'Trimmed Mean (Media Acotada)',
            'Standard Deviation',
            'Coefficient of Variation',
            'Percentiles (P25, P50, P75, P90, P95)',
            'Outlier Detection (IQR)',
            'Climate Zone Segmentation',
            'Temporal Pattern Analysis',
            'Same-Zone Branch Comparison',
            'Department Rankings by Zone',
            '🆕 Shift-Based Absences (SSOT)',
            '🆕 Absenteeism Report with Trends',
            '🆕 Today Absences Quick Endpoint'
        ],
        endpoints: {
            absences: 'GET /api/attendance-stats/absences/:companyId/:date',
            absencesToday: 'GET /api/attendance-stats/absences-today/:companyId',
            absenteeismReport: 'GET /api/attendance-stats/absenteeism-report/:companyId'
        },
        climateZones: ['TROPICAL', 'SUBTROPICAL', 'TEMPERATE', 'COLD'],
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
