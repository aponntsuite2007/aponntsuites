/**
 * COMPLIANCE ROUTES - API Endpoints de Cumplimiento Legal
 *
 * Rutas para validar compliance, obtener dashboard y gestionar violaciones
 *
 * @version 2.0
 * @date 2025-10-16
 */

const express = require('express');
const router = express.Router();
const complianceService = require('../services/complianceService');

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
// ENDPOINTS DE COMPLIANCE
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/compliance/dashboard
 * Obtiene dashboard completo de compliance
 */
router.get('/dashboard', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;

        const dashboard = await complianceService.getComplianceDashboard(company_id);

        res.json({
            success: true,
            dashboard: dashboard
        });

    } catch (error) {
        console.error('❌ Error obteniendo dashboard de compliance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/compliance/validate
 * Ejecuta validación manual de todas las reglas
 */
router.post('/validate', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;

        const validation = await complianceService.validateAllRules(company_id);

        res.json({
            success: true,
            message: 'Validación completada',
            validation: validation
        });

    } catch (error) {
        console.error('❌ Error validando compliance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/compliance/violations
 * Obtiene lista de violaciones activas
 */
router.get('/violations', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { severity, employee_id, limit = 100 } = req.query;

        const violations = await complianceService.getActiveViolations(company_id, {
            severity,
            employee_id,
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            violations: violations,
            total: violations.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo violaciones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/compliance/violations/:id/resolve
 * Marca una violación como resuelta
 */
router.post('/violations/:id/resolve', requireRRHH, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const { employee_id } = req.user;

        if (!notes) {
            return res.status(400).json({
                success: false,
                error: 'El campo "notes" es requerido'
            });
        }

        await complianceService.resolveViolation(id, employee_id, notes);

        res.json({
            success: true,
            message: 'Violación resuelta exitosamente'
        });

    } catch (error) {
        console.error('❌ Error resolviendo violación:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/compliance/alerts
 * Genera alertas automáticas para violaciones críticas
 */
router.post('/alerts', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;

        const alerts = await complianceService.generateComplianceAlerts(company_id);

        res.json({
            success: true,
            message: `${alerts.alerts_generated} alertas generadas`,
            alerts: alerts
        });

    } catch (error) {
        console.error('❌ Error generando alertas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/compliance/rules
 * Obtiene todas las reglas de compliance activas
 */
router.get('/rules', requireRRHH, async (req, res) => {
    try {
        const rules = await complianceService.getActiveRules();

        res.json({
            success: true,
            rules: rules,
            total: rules.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo reglas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/compliance/summary
 * Obtiene resumen rápido de compliance
 */
router.get('/summary', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;

        const dashboard = await complianceService.getComplianceDashboard(company_id);

        res.json({
            success: true,
            summary: dashboard.summary
        });

    } catch (error) {
        console.error('❌ Error obteniendo resumen:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/compliance/metrics/:type
 * Obtiene métrica específica por tipo
 */
router.get('/metrics/:type', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { type } = req.params;

        const validTypes = ['rest_period', 'overtime_limit', 'vacation_expiry', 'documentation', 'working_hours'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: `Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}`
            });
        }

        const metric = await complianceService.getMetricByType(company_id, type);

        res.json({
            success: true,
            type: type,
            metric: metric
        });

    } catch (error) {
        console.error('❌ Error obteniendo métrica:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
