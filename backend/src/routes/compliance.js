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
const RiskIntelligenceService = require('../services/RiskIntelligenceService');
const { auth, authorize } = require('../middleware/auth');

// Usar autenticación JWT real del sistema
router.use(auth);

// Middleware para verificar rol de RRHH o admin
const requireRRHH = authorize('admin', 'rrhh', 'medical');

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

// ═══════════════════════════════════════════════════════════════
// RISK INTELLIGENCE ENDPOINTS (Análisis de Riesgo Laboral)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/compliance/risk-dashboard
 * Dashboard completo de Risk Intelligence
 */
router.get('/risk-dashboard', requireRRHH, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const period = parseInt(req.query.period) || 30;

        console.log(`[RISK-API] Dashboard empresa ${companyId}, período ${period}d`);

        const dashboard = await RiskIntelligenceService.getDashboard(companyId, period);

        res.json(dashboard);

    } catch (error) {
        console.error('[RISK-API] Error dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener dashboard de riesgos',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/employee/:id/risk-analysis
 * Análisis de riesgo de empleado específico
 */
router.get('/employee/:id/risk-analysis', requireRRHH, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.params.id;
        const period = parseInt(req.query.period) || 30;

        const analysis = await RiskIntelligenceService.getEmployeeRiskAnalysis(
            userId, companyId, period
        );

        res.json(analysis);

    } catch (error) {
        console.error('[RISK-API] Error análisis empleado:', error);
        res.status(500).json({
            success: false,
            error: 'Error al analizar empleado',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/indices-config
 * Configuración de índices de riesgo
 */
router.get('/indices-config', requireRRHH, async (req, res) => {
    try {
        const config = RiskIntelligenceService.getIndicesConfig();
        res.json({ success: true, config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/compliance/indices-config/:id
 * Actualizar configuración de índice
 */
router.put('/indices-config/:id', requireRRHH, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Solo admins' });
        }
        const result = RiskIntelligenceService.updateIndexConfig(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/compliance/departments
 * Departamentos con estadísticas
 */
router.get('/departments', requireRRHH, async (req, res) => {
    try {
        const result = await RiskIntelligenceService.getDepartmentsWithRisk(req.user.company_id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/compliance/analyze/:id
 * Re-analizar empleado
 */
router.post('/analyze/:id', requireRRHH, async (req, res) => {
    try {
        const analysis = await RiskIntelligenceService.getEmployeeRiskAnalysis(
            req.params.id, req.user.company_id, 30
        );
        res.json({ success: true, data: analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/compliance/analyze-all
 * Re-analizar todos los empleados
 */
router.post('/analyze-all', requireRRHH, async (req, res) => {
    try {
        const period = parseInt(req.body.period) || 30;
        const employees = await RiskIntelligenceService.getEmployeesWithRisk(
            req.user.company_id, period
        );
        res.json({
            success: true,
            message: `Análisis completado para ${employees.length} empleados`,
            count: employees.length,
            employees
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/compliance/trends
 * Tendencias históricas
 */
router.get('/trends', requireRRHH, async (req, res) => {
    try {
        // TODO: Implementar tendencias históricas
        res.json({ success: true, trends: [], message: 'Tendencias pendientes' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
