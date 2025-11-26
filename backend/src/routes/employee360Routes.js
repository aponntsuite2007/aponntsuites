/**
 * ============================================================================
 * RUTAS: Employee 360° - Expediente Digital Integral
 * ============================================================================
 *
 * API REST para el módulo de Expediente 360°
 *
 * Endpoints:
 * - GET  /api/employee-360/:userId/report - Obtener expediente completo
 * - GET  /api/employee-360/:userId/summary - Obtener resumen rápido
 * - GET  /api/employee-360/:userId/timeline - Obtener timeline de eventos
 * - GET  /api/employee-360/:userId/scoring - Obtener scoring detallado
 * - POST /api/employee-360/compare - Comparar múltiples empleados
 * - GET  /api/employee-360/:userId/export/pdf - Exportar a PDF
 * - GET  /api/employee-360/dashboard - Dashboard del módulo
 *
 * @version 1.0.0
 * @date 2025-01-25
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const Employee360Service = require('../services/Employee360Service');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');
const { User } = require('../config/database');

/**
 * @route GET /api/employee-360/dashboard
 * @desc Dashboard general del módulo - estadísticas de la empresa
 */
router.get('/dashboard', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const companyId = req.user.company_id || req.user.companyId;

        // Obtener lista de empleados para el selector
        const employees = await User.findAll({
            where: {
                company_id: companyId,
                isActive: true
            },
            attributes: ['user_id', 'employeeId', 'firstName', 'lastName', 'role', 'department_id'],
            order: [['lastName', 'ASC'], ['firstName', 'ASC']]
        });

        res.json({
            success: true,
            data: {
                totalEmployees: employees.length,
                employees: employees.map(e => ({
                    id: e.user_id,
                    employeeId: e.employeeId,
                    name: `${e.firstName} ${e.lastName}`,
                    role: e.role
                })),
                moduleInfo: {
                    name: 'Expediente 360°',
                    version: '1.0.0',
                    features: [
                        'Análisis integral de empleados',
                        'Scoring automático',
                        'Timeline unificado',
                        'Análisis con IA',
                        'Comparación entre empleados',
                        'Exportación PDF'
                    ]
                }
            }
        });
    } catch (error) {
        console.error('❌ [360°] Error en dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo dashboard'
        });
    }
});

/**
 * @route GET /api/employee-360/:userId/report
 * @desc Obtener expediente 360° completo de un empleado
 */
router.get('/:userId/report', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;
        const {
            dateFrom,
            dateTo,
            includeAI = 'true'
        } = req.query;

        console.log(`📊 [360°] Solicitud de reporte para usuario ${userId}`);

        // Verificar que el usuario pertenece a la empresa
        const targetUser = await User.findOne({
            where: {
                user_id: userId,
                company_id: companyId
            }
        });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: 'Empleado no encontrado o no pertenece a su empresa'
            });
        }

        const report = await Employee360Service.getFullReport(userId, companyId, {
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            includeAIAnalysis: includeAI === 'true'
        });

        res.json({
            success: true,
            data: report
        });

    } catch (error) {
        console.error('❌ [360°] Error generando reporte:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando expediente 360°',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route GET /api/employee-360/:userId/summary
 * @desc Obtener resumen rápido (sin análisis IA)
 */
router.get('/:userId/summary', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;

        const report = await Employee360Service.getFullReport(userId, companyId, {
            includeAIAnalysis: false
        });

        // Devolver solo resumen
        res.json({
            success: true,
            data: {
                employee: report.employee,
                scoring: report.scoring,
                highlights: {
                    attendanceRate: report.sections.attendance.attendanceRate,
                    punctualityRate: report.sections.attendance.punctualityRate,
                    sanctions: report.sections.sanctions.total,
                    trainingsCompleted: report.sections.training.completed
                }
            }
        });

    } catch (error) {
        console.error('❌ [360°] Error en resumen:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo resumen'
        });
    }
});

/**
 * @route GET /api/employee-360/:userId/timeline
 * @desc Obtener timeline de eventos del empleado
 */
router.get('/:userId/timeline', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;
        const { limit = 50, offset = 0 } = req.query;

        const report = await Employee360Service.getFullReport(userId, companyId, {
            includeAIAnalysis: false
        });

        const timeline = report.timeline.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
        );

        res.json({
            success: true,
            data: {
                employee: {
                    id: report.employee.id,
                    name: report.employee.fullName
                },
                timeline,
                total: report.timeline.length,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            }
        });

    } catch (error) {
        console.error('❌ [360°] Error en timeline:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo timeline'
        });
    }
});

/**
 * @route GET /api/employee-360/:userId/scoring
 * @desc Obtener scoring detallado por categoría
 */
router.get('/:userId/scoring', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;

        const report = await Employee360Service.getFullReport(userId, companyId, {
            includeAIAnalysis: false
        });

        res.json({
            success: true,
            data: {
                employee: {
                    id: report.employee.id,
                    name: report.employee.fullName
                },
                scoring: report.scoring,
                breakdown: {
                    attendance: {
                        score: report.scoring.categories.attendance.score,
                        details: report.sections.attendance
                    },
                    punctuality: {
                        score: report.scoring.categories.punctuality.score,
                        lateArrivals: report.sections.attendance.lateArrivals,
                        pattern: report.sections.attendance.patterns
                    },
                    discipline: {
                        score: report.scoring.categories.discipline.score,
                        totalSanctions: report.sections.sanctions.total,
                        severity: report.sections.sanctions.severity
                    },
                    training: {
                        score: report.scoring.categories.training.score,
                        completed: report.sections.training.completed,
                        pending: report.sections.training.pending
                    },
                    stability: {
                        score: report.scoring.categories.stability.score,
                        medicalDays: report.sections.medical.totalDaysOff,
                        vacationDays: report.sections.vacations.totalDaysApproved
                    }
                }
            }
        });

    } catch (error) {
        console.error('❌ [360°] Error en scoring:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo scoring'
        });
    }
});

/**
 * @route POST /api/employee-360/compare
 * @desc Comparar múltiples empleados
 */
router.post('/compare', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { userIds, dateFrom, dateTo } = req.body;
        const companyId = req.user.company_id || req.user.companyId;

        if (!userIds || !Array.isArray(userIds) || userIds.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren al menos 2 empleados para comparar'
            });
        }

        if (userIds.length > 10) {
            return res.status(400).json({
                success: false,
                error: 'Máximo 10 empleados por comparación'
            });
        }

        const comparison = await Employee360Service.compareEmployees(userIds, companyId, {
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined
        });

        res.json({
            success: true,
            data: comparison
        });

    } catch (error) {
        console.error('❌ [360°] Error en comparación:', error);
        res.status(500).json({
            success: false,
            error: 'Error comparando empleados'
        });
    }
});

/**
 * @route GET /api/employee-360/:userId/export/pdf
 * @desc Exportar expediente a PDF (genera URL de descarga)
 */
router.get('/:userId/export/pdf', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;

        // Obtener reporte completo
        const report = await Employee360Service.getFullReport(userId, companyId, {
            includeAIAnalysis: true
        });

        // TODO: Implementar generación de PDF con Puppeteer o jsPDF
        // Por ahora, devolver datos JSON que el frontend puede usar para generar PDF

        res.json({
            success: true,
            message: 'Datos preparados para exportación PDF',
            data: {
                report,
                exportInfo: {
                    format: 'pdf',
                    generatedAt: new Date().toISOString(),
                    generatedBy: `${req.user.firstName} ${req.user.lastName}`
                }
            }
        });

    } catch (error) {
        console.error('❌ [360°] Error exportando PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando exportación PDF'
        });
    }
});

/**
 * @route GET /api/employee-360/:userId/ai-analysis
 * @desc Obtener solo el análisis IA (regenerar si es necesario)
 */
router.get('/:userId/ai-analysis', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;

        const report = await Employee360Service.getFullReport(userId, companyId, {
            includeAIAnalysis: true
        });

        if (!report.aiAnalysis) {
            return res.status(503).json({
                success: false,
                error: 'Análisis IA no disponible. Verifique que Ollama esté ejecutándose.'
            });
        }

        res.json({
            success: true,
            data: {
                employee: {
                    id: report.employee.id,
                    name: report.employee.fullName
                },
                aiAnalysis: report.aiAnalysis,
                scoring: report.scoring
            }
        });

    } catch (error) {
        console.error('❌ [360°] Error en análisis IA:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo análisis IA'
        });
    }
});

module.exports = router;
