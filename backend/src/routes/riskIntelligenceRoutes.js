/**
 * RISK INTELLIGENCE ROUTES v2.0
 * API para Dashboard de Riesgo Laboral
 *
 * Endpoints:
 * - GET /api/compliance/risk-dashboard - Dashboard completo
 * - GET /api/compliance/employee/:id/risk-analysis - Análisis de empleado
 * - GET /api/compliance/violations - Violaciones activas
 * - GET /api/compliance/indices-config - Configuración de índices
 * - PUT /api/compliance/indices-config/:id - Actualizar configuración
 * - GET /api/compliance/departments - Departamentos con riesgo
 */

const express = require('express');
const router = express.Router();
const RiskIntelligenceService = require('../services/RiskIntelligenceService');

// Middleware de autenticación (usar el existente del sistema)
const authMiddleware = (req, res, next) => {
    // El token ya viene validado por middleware global
    if (!req.user || !req.user.company_id) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    next();
};

/**
 * GET /api/compliance/risk-dashboard
 * Obtener dashboard completo de riesgos
 */
router.get('/risk-dashboard', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const period = parseInt(req.query.period) || 30;

        console.log(`[RISK-API] Dashboard solicitado para empresa ${companyId}, período ${period}d`);

        const dashboard = await RiskIntelligenceService.getDashboard(companyId, period);

        res.json(dashboard);

    } catch (error) {
        console.error('[RISK-API] Error en dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener dashboard de riesgos',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/employee/:id/risk-analysis
 * Obtener análisis de riesgo de un empleado específico
 */
router.get('/employee/:id/risk-analysis', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.params.id;
        const period = parseInt(req.query.period) || 30;

        console.log(`[RISK-API] Análisis empleado ${userId}, empresa ${companyId}`);

        const analysis = await RiskIntelligenceService.getEmployeeRiskAnalysis(
            userId, companyId, period
        );

        res.json(analysis);

    } catch (error) {
        console.error('[RISK-API] Error en análisis empleado:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener análisis del empleado',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/violations
 * Obtener violaciones/alertas activas
 */
router.get('/violations', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const filters = {
            department: req.query.department,
            severity: req.query.severity,
            status: req.query.status || 'active'
        };

        const result = await RiskIntelligenceService.getViolations(companyId, filters);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error en violaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener violaciones',
            details: error.message
        });
    }
});

/**
 * POST /api/compliance/violations/:id/resolve
 * Resolver una violación
 */
router.post('/violations/:id/resolve', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution_notes } = req.body;
        const companyId = req.user.company_id;

        // TODO: Implementar resolución de violaciones
        res.json({
            success: true,
            message: 'Violación marcada como resuelta',
            id
        });

    } catch (error) {
        console.error('[RISK-API] Error resolviendo violación:', error);
        res.status(500).json({
            success: false,
            error: 'Error al resolver violación'
        });
    }
});

/**
 * GET /api/compliance/indices-config
 * Obtener configuración de índices de riesgo
 */
router.get('/indices-config', authMiddleware, async (req, res) => {
    try {
        const config = RiskIntelligenceService.getIndicesConfig();

        res.json({
            success: true,
            config
        });

    } catch (error) {
        console.error('[RISK-API] Error en config:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener configuración'
        });
    }
});

/**
 * PUT /api/compliance/indices-config/:id
 * Actualizar configuración de un índice
 */
router.put('/indices-config/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const newConfig = req.body;

        // Solo admins pueden modificar
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden modificar la configuración'
            });
        }

        const result = RiskIntelligenceService.updateIndexConfig(id, newConfig);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error actualizando config:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar configuración'
        });
    }
});

/**
 * GET /api/compliance/departments
 * Obtener departamentos con estadísticas de riesgo
 */
router.get('/departments', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const result = await RiskIntelligenceService.getDepartmentsWithRisk(companyId);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error en departamentos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener departamentos'
        });
    }
});

/**
 * POST /api/compliance/analyze/:id
 * Forzar re-análisis de un empleado específico
 */
router.post('/analyze/:id', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.params.id;

        const analysis = await RiskIntelligenceService.getEmployeeRiskAnalysis(
            userId, companyId, 30
        );

        res.json({
            success: true,
            message: 'Análisis completado',
            data: analysis
        });

    } catch (error) {
        console.error('[RISK-API] Error en análisis:', error);
        res.status(500).json({
            success: false,
            error: 'Error al analizar empleado'
        });
    }
});

/**
 * POST /api/compliance/analyze-all
 * Forzar re-análisis de todos los empleados
 */
router.post('/analyze-all', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const period = parseInt(req.body.period) || 30;

        console.log(`[RISK-API] Análisis completo empresa ${companyId}`);

        const employees = await RiskIntelligenceService.getEmployeesWithRisk(companyId, period);

        res.json({
            success: true,
            message: `Análisis completado para ${employees.length} empleados`,
            count: employees.length,
            employees
        });

    } catch (error) {
        console.error('[RISK-API] Error en análisis completo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al analizar empleados'
        });
    }
});

/**
 * GET /api/compliance/trends
 * Obtener tendencias de riesgo
 */
router.get('/trends', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const days = parseInt(req.query.days) || 30;

        // TODO: Implementar tendencias históricas
        // Por ahora retornar datos básicos
        res.json({
            success: true,
            trends: [],
            message: 'Tendencias históricas pendientes de implementación'
        });

    } catch (error) {
        console.error('[RISK-API] Error en tendencias:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener tendencias'
        });
    }
});

module.exports = router;
