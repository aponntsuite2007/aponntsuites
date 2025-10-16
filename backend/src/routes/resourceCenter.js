/**
 * RESOURCE CENTER ROUTES - API Endpoints para Centro de Recursos
 *
 * Rutas para tracking de horas, utilización de recursos, alertas de sobrecarga
 * y análisis de productividad
 *
 * @version 2.0
 * @date 2025-10-16
 */

const express = require('express');
const router = express.Router();
const resourceCenterService = require('../services/resourceCenterService');

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
// ENDPOINTS DE RESOURCE CENTER
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/resources/dashboard
 * Obtiene dashboard completo de recursos con resumen, utilización y alertas
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
            const period = resourceCenterService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const dashboard = await resourceCenterService.getResourceDashboard(company_id, startDate, endDate);

        res.json({
            success: true,
            dashboard: dashboard
        });

    } catch (error) {
        console.error('❌ Error obteniendo dashboard de recursos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resources/summary
 * Obtiene resumen de horas por categoría
 */
router.get('/summary', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date, department_id } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren los parámetros start_date y end_date'
            });
        }

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        const summary = await resourceCenterService.getHoursSummary(
            company_id,
            startDate,
            endDate,
            department_id ? parseInt(department_id) : null
        );

        res.json({
            success: true,
            summary: summary
        });

    } catch (error) {
        console.error('❌ Error obteniendo resumen de horas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resources/departments
 * Obtiene utilización de recursos por departamento
 */
router.get('/departments', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date } = req.query;

        // Determinar período
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            const period = resourceCenterService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const utilization = await resourceCenterService.getDepartmentUtilization(
            company_id,
            startDate,
            endDate
        );

        res.json({
            success: true,
            period: { start: startDate, end: endDate },
            departments: utilization,
            total: utilization.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo utilización por departamento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resources/employees
 * Obtiene utilización de recursos por empleado
 */
router.get('/employees', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date, limit = 50 } = req.query;

        // Determinar período
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            const period = resourceCenterService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const utilization = await resourceCenterService.getEmployeeUtilization(
            company_id,
            startDate,
            endDate,
            parseInt(limit)
        );

        res.json({
            success: true,
            period: { start: startDate, end: endDate },
            employees: utilization,
            total: utilization.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo utilización por empleado:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resources/employee/:employee_id
 * Obtiene estadísticas de un empleado específico
 */
router.get('/employee/:employee_id', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { employee_id } = req.params;
        const { start_date, end_date } = req.query;

        // Determinar período
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            const period = resourceCenterService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const stats = await resourceCenterService.getEmployeeStats(
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
        console.error('❌ Error obteniendo stats de empleado:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resources/my-stats
 * Obtiene estadísticas del usuario actual
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
            const period = resourceCenterService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const stats = await resourceCenterService.getEmployeeStats(
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
 * GET /api/resources/overload-alerts
 * Detecta empleados con sobrecarga de trabajo (muchas horas extra)
 */
router.get('/overload-alerts', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date, threshold = 30 } = req.query;

        // Determinar período
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            const period = resourceCenterService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const overloadAlerts = await resourceCenterService.detectWorkloadOverload(
            company_id,
            startDate,
            endDate,
            parseFloat(threshold)
        );

        res.json({
            success: true,
            period: { start: startDate, end: endDate },
            threshold: parseFloat(threshold),
            alerts: overloadAlerts,
            total_alerts: overloadAlerts.length
        });

    } catch (error) {
        console.error('❌ Error detectando sobrecarga:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resources/budget-alerts
 * Obtiene alertas de presupuesto de horas
 */
router.get('/budget-alerts', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date } = req.query;

        // Determinar período
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            const period = resourceCenterService.getCurrentPeriod();
            startDate = period.start;
            endDate = period.end;
        }

        const budgetAlerts = await resourceCenterService.getBudgetAlerts(
            company_id,
            startDate,
            endDate
        );

        res.json({
            success: true,
            period: { start: startDate, end: endDate },
            alerts: budgetAlerts,
            total_alerts: budgetAlerts.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo alertas de presupuesto:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/resources/record
 * Registra una transacción de recursos (horas trabajadas)
 */
router.post('/record', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const {
            employee_id,
            department_id,
            category,
            hours,
            description,
            metadata
        } = req.body;

        if (!employee_id || !category || !hours || !description) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: employee_id, category, hours, description'
            });
        }

        const transaction = await resourceCenterService.recordTransaction(
            company_id,
            department_id || null,
            employee_id,
            category,
            parseFloat(hours),
            description,
            metadata || {}
        );

        res.json({
            success: true,
            message: 'Transacción registrada exitosamente',
            transaction: transaction
        });

    } catch (error) {
        console.error('❌ Error registrando transacción:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resources/comparison
 * Compara utilización entre dos períodos
 */
router.get('/comparison', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;

        // Obtener períodos
        const currentPeriod = resourceCenterService.getCurrentPeriod();
        const previousPeriod = resourceCenterService.getPreviousPeriod();

        const comparison = await resourceCenterService.comparePeriods(
            company_id,
            currentPeriod.start,
            currentPeriod.end,
            previousPeriod.start,
            previousPeriod.end
        );

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
