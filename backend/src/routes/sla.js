/**
 * SLA ROUTES - API Endpoints para métricas de SLA
 *
 * Rutas para obtener métricas de tiempos de respuesta, rankings de aprobadores,
 * detectar cuellos de botella y ver estadísticas individuales
 *
 * @version 2.0
 * @date 2025-10-16
 */

const express = require('express');
const router = express.Router();
const slaService = require('../services/slaService');

// Middleware de autenticación
const authenticate = (req, res, next) => {
    req.user = {
        employee_id: req.headers['x-employee-id'] || 'EMP-ISI-001',
        company_id: parseInt(req.headers['x-company-id']) || 11,
        role: req.headers['x-role'] || 'employee'
    };
    next();
};

// Middleware para verificar rol de RRHH o admin
const requireRRHH = (req, res, next) => {
    if (req.user.role !== 'rrhh' && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Acceso denegado. Se requiere rol de RRHH o administrador'
        });
    }
    next();
};

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS DE SLA
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/sla/dashboard
 * Obtiene dashboard completo de SLA con métricas, rankings y cuellos de botella
 */
router.get('/dashboard', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date } = req.query;

        // Determinar período
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            // Default: mes actual
            const period = slaService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const dashboard = await slaService.getSLADashboard(company_id, startDate, endDate);

        res.json({
            success: true,
            dashboard: dashboard
        });

    } catch (error) {
        console.error('❌ Error obteniendo dashboard SLA:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/sla/metrics
 * Calcula métricas de SLA para un período
 */
router.get('/metrics', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren los parámetros start_date y end_date'
            });
        }

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        const metrics = await slaService.calculateSLAMetrics(company_id, startDate, endDate);

        res.json({
            success: true,
            metrics: metrics
        });

    } catch (error) {
        console.error('❌ Error calculando métricas SLA:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/sla/ranking
 * Obtiene ranking de aprobadores por velocidad de respuesta
 */
router.get('/ranking', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date, sort_by = 'avg', limit = 20 } = req.query;

        // Determinar período
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            const period = slaService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const ranking = await slaService.getApproverRanking(
            company_id,
            startDate,
            endDate,
            sort_by,
            parseInt(limit)
        );

        res.json({
            success: true,
            ranking: ranking,
            period: {
                start: startDate,
                end: endDate
            },
            sort_by: sort_by,
            total: ranking.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo ranking:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/sla/bottlenecks
 * Detecta cuellos de botella en el proceso de aprobaciones
 */
router.get('/bottlenecks', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date } = req.query;

        // Determinar período
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            const period = slaService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const bottlenecks = await slaService.detectBottlenecks(company_id, startDate, endDate);

        res.json({
            success: true,
            bottlenecks: bottlenecks
        });

    } catch (error) {
        console.error('❌ Error detectando cuellos de botella:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/sla/approver/:approver_id
 * Obtiene estadísticas detalladas de un aprobador específico
 */
router.get('/approver/:approver_id', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { approver_id } = req.params;
        const { start_date, end_date } = req.query;

        // Determinar período
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            const period = slaService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const stats = await slaService.getApproverStats(
            approver_id,
            company_id,
            startDate,
            endDate
        );

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('❌ Error obteniendo stats de aprobador:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/sla/my-stats
 * Obtiene estadísticas del usuario actual (permite que empleados vean sus propias métricas)
 */
router.get('/my-stats', async (req, res) => {
    try {
        const { company_id, employee_id } = req.user;
        const { start_date, end_date } = req.query;

        // Determinar período
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            const period = slaService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const stats = await slaService.getApproverStats(
            employee_id,
            company_id,
            startDate,
            endDate
        );

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('❌ Error obteniendo mis estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/sla/save-metrics
 * Guarda las métricas calculadas en la tabla sla_metrics para histórico
 */
router.post('/save-metrics', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren los campos start_date y end_date'
            });
        }

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        await slaService.saveSLAMetricsToDatabase(company_id, startDate, endDate);

        res.json({
            success: true,
            message: 'Métricas guardadas exitosamente'
        });

    } catch (error) {
        console.error('❌ Error guardando métricas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/sla/comparison
 * Compara métricas entre dos períodos (mes actual vs mes anterior)
 */
router.get('/comparison', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;

        // Obtener períodos
        const currentPeriod = slaService.getCurrentPeriod();
        const previousPeriod = slaService.getPreviousPeriod();

        // Calcular métricas para ambos períodos
        const currentMetrics = await slaService.calculateSLAMetrics(
            company_id,
            currentPeriod.start,
            currentPeriod.end
        );

        const previousMetrics = await slaService.calculateSLAMetrics(
            company_id,
            previousPeriod.start,
            previousPeriod.end
        );

        // Calcular diferencias
        const comparison = {
            current: {
                period: currentPeriod,
                metrics: currentMetrics.global_metrics
            },
            previous: {
                period: previousPeriod,
                metrics: previousMetrics.global_metrics
            },
            changes: {
                avg_response_hours: (
                    currentMetrics.global_metrics.avg_response_hours -
                    previousMetrics.global_metrics.avg_response_hours
                ).toFixed(2),
                sla_compliance_percent: (
                    currentMetrics.global_metrics.sla_compliance_percent -
                    previousMetrics.global_metrics.sla_compliance_percent
                ).toFixed(2),
                total_requests: (
                    currentMetrics.global_metrics.total_requests -
                    previousMetrics.global_metrics.total_requests
                )
            }
        };

        res.json({
            success: true,
            comparison: comparison
        });

    } catch (error) {
        console.error('❌ Error comparando períodos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
