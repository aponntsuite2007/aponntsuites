/**
 * RISK INTELLIGENCE ROUTES v3.0 - RBAC SSOT Integration
 * API para Dashboard de Riesgo Laboral con Segmentación
 *
 * Endpoints Base:
 * - GET /api/compliance/risk-dashboard - Dashboard completo
 * - GET /api/compliance/employee/:id/risk-analysis - Análisis de empleado
 * - GET /api/compliance/violations - Violaciones activas
 * - GET /api/compliance/indices-config - Configuración de índices
 * - PUT /api/compliance/indices-config/:id - Actualizar configuración
 * - GET /api/compliance/departments - Departamentos con riesgo
 *
 * Nuevos Endpoints RBAC SSOT v3.0:
 * - GET /api/compliance/risk-config - Configuración de umbrales por empresa
 * - PUT /api/compliance/risk-config - Actualizar configuración de umbrales
 * - POST /api/compliance/risk-config/method - Cambiar método de cálculo
 * - POST /api/compliance/risk-config/segmentation - Habilitar/deshabilitar segmentación
 * - POST /api/compliance/risk-config/recalculate - Recalcular cuartiles
 * - GET /api/compliance/segmented-analysis - Análisis segmentado por categoría
 * - GET /api/compliance/benchmark-comparison - Comparación con benchmarks
 * - GET /api/compliance/employee/:id/thresholds - Umbrales efectivos del empleado
 * - GET /api/compliance/rbac-stats - Estadísticas RBAC
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

// =========================================================================
// ENDPOINTS DE EXPORTACIÓN (PDF / Excel)
// =========================================================================
const RiskReportService = require('../services/RiskReportService');

/**
 * GET /api/compliance/export/dashboard/pdf
 * Exportar dashboard ejecutivo a PDF
 */
router.get('/export/dashboard/pdf', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const period = parseInt(req.query.period) || 30;
        const companyName = req.query.company_name || 'Empresa';

        console.log(`[RISK-API] Exportando dashboard PDF para empresa ${companyId}`);

        const pdfBuffer = await RiskReportService.generateDashboardPDF(companyId, period, companyName);

        const filename = `reporte-riesgos-${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('[RISK-API] Error exportando PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar PDF',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/export/dashboard/excel
 * Exportar dashboard completo a Excel
 */
router.get('/export/dashboard/excel', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const period = parseInt(req.query.period) || 30;
        const companyName = req.query.company_name || 'Empresa';

        console.log(`[RISK-API] Exportando dashboard Excel para empresa ${companyId}`);

        const excelBuffer = await RiskReportService.generateDashboardExcel(companyId, period, companyName);

        const filename = `reporte-riesgos-${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        res.send(excelBuffer);

    } catch (error) {
        console.error('[RISK-API] Error exportando Excel:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar Excel',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/export/employee/:id/pdf
 * Exportar análisis de empleado individual a PDF
 */
router.get('/export/employee/:id/pdf', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.params.id;
        const period = parseInt(req.query.period) || 30;
        const companyName = req.query.company_name || 'Empresa';

        console.log(`[RISK-API] Exportando PDF empleado ${userId}`);

        const pdfBuffer = await RiskReportService.generateEmployeePDF(userId, companyId, period, companyName);

        const filename = `analisis-riesgo-empleado-${userId}-${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('[RISK-API] Error exportando PDF empleado:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar PDF del empleado',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/export/violations/pdf
 * Exportar listado de violaciones a PDF
 */
router.get('/export/violations/pdf', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const companyName = req.query.company_name || 'Empresa';
        const filters = {
            status: req.query.status || 'active',
            severity: req.query.severity
        };

        console.log(`[RISK-API] Exportando violaciones PDF para empresa ${companyId}`);

        const pdfBuffer = await RiskReportService.generateViolationsPDF(companyId, filters, companyName);

        const filename = `violaciones-${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('[RISK-API] Error exportando PDF violaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar PDF de violaciones',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/export/violations/excel
 * Exportar listado de violaciones a Excel
 */
router.get('/export/violations/excel', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const companyName = req.query.company_name || 'Empresa';
        const filters = {
            status: req.query.status || 'all',
            severity: req.query.severity
        };

        console.log(`[RISK-API] Exportando violaciones Excel para empresa ${companyId}`);

        const excelBuffer = await RiskReportService.generateViolationsExcel(companyId, filters, companyName);

        const filename = `violaciones-${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        res.send(excelBuffer);

    } catch (error) {
        console.error('[RISK-API] Error exportando Excel violaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar Excel de violaciones',
            details: error.message
        });
    }
});

// =========================================================================
// ENDPOINTS RBAC SSOT v3.0 - CONFIGURACIÓN DE UMBRALES Y SEGMENTACIÓN
// =========================================================================

/**
 * GET /api/compliance/risk-config
 * Obtener configuración de umbrales de riesgo de la empresa
 */
router.get('/risk-config', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        console.log(`[RISK-API] Obteniendo configuración de riesgo para empresa ${companyId}`);

        const result = await RiskIntelligenceService.getCompanyRiskConfig(companyId);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error obteniendo risk-config:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener configuración de riesgo',
            details: error.message
        });
    }
});

/**
 * PUT /api/compliance/risk-config
 * Actualizar configuración de umbrales de riesgo
 */
router.put('/risk-config', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.id;
        const updates = req.body;

        // Solo admins pueden modificar
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden modificar la configuración'
            });
        }

        console.log(`[RISK-API] Actualizando configuración de riesgo para empresa ${companyId}`);

        const result = await RiskIntelligenceService.updateCompanyRiskConfig(companyId, updates, userId);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error actualizando risk-config:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar configuración',
            details: error.message
        });
    }
});

/**
 * POST /api/compliance/risk-config/method
 * Cambiar método de cálculo de umbrales (manual, quartile, benchmark, hybrid)
 */
router.post('/risk-config/method', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.id;
        const { method, hybrid_weights } = req.body;

        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden cambiar el método'
            });
        }

        console.log(`[RISK-API] Cambiando método a ${method} para empresa ${companyId}`);

        const result = await RiskIntelligenceService.setThresholdMethod(companyId, method, hybrid_weights, userId);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error cambiando método:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cambiar método de cálculo',
            details: error.message
        });
    }
});

/**
 * POST /api/compliance/risk-config/segmentation
 * Habilitar/deshabilitar segmentación por tipo de trabajo
 */
router.post('/risk-config/segmentation', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.id;
        const { enabled } = req.body;

        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden modificar segmentación'
            });
        }

        console.log(`[RISK-API] ${enabled ? 'Habilitando' : 'Deshabilitando'} segmentación para empresa ${companyId}`);

        const result = await RiskIntelligenceService.setSegmentation(companyId, enabled, userId);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error configurando segmentación:', error);
        res.status(500).json({
            success: false,
            error: 'Error al configurar segmentación',
            details: error.message
        });
    }
});

/**
 * POST /api/compliance/risk-config/recalculate
 * Forzar recálculo de cuartiles
 */
router.post('/risk-config/recalculate', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden recalcular cuartiles'
            });
        }

        console.log(`[RISK-API] Recalculando cuartiles para empresa ${companyId}`);

        const result = await RiskIntelligenceService.recalculateQuartiles(companyId);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error recalculando cuartiles:', error);
        res.status(500).json({
            success: false,
            error: 'Error al recalcular cuartiles',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/segmented-analysis
 * Obtener análisis de riesgo segmentado por categoría de trabajo
 */
router.get('/segmented-analysis', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const period = parseInt(req.query.period) || 30;

        console.log(`[RISK-API] Análisis segmentado para empresa ${companyId}`);

        const result = await RiskIntelligenceService.getSegmentedRiskAnalysis(companyId, period);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error en análisis segmentado:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener análisis segmentado',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/benchmark-comparison
 * Obtener comparación con benchmarks internacionales
 */
router.get('/benchmark-comparison', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const period = parseInt(req.query.period) || 30;

        console.log(`[RISK-API] Comparación con benchmarks para empresa ${companyId}`);

        const result = await RiskIntelligenceService.getBenchmarkComparison(companyId, period);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error en comparación benchmarks:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener comparación con benchmarks',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/employee/:id/thresholds
 * Obtener umbrales efectivos de un empleado específico
 */
router.get('/employee/:id/thresholds', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.params.id;

        console.log(`[RISK-API] Umbrales de empleado ${userId}`);

        const result = await RiskIntelligenceService.getEmployeeThresholds(userId, companyId);

        res.json(result);

    } catch (error) {
        console.error('[RISK-API] Error obteniendo umbrales:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener umbrales del empleado',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/rbac-stats
 * Obtener estadísticas RBAC de la empresa
 */
router.get('/rbac-stats', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        console.log(`[RISK-API] Estadísticas RBAC para empresa ${companyId}`);

        const result = await RiskIntelligenceService.getRBACStats(companyId);

        res.json({
            success: true,
            stats: result
        });

    } catch (error) {
        console.error('[RISK-API] Error obteniendo stats RBAC:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas RBAC',
            details: error.message
        });
    }
});

module.exports = router;
