/**
 * AUDIT REPORTS ROUTES - API Endpoints para Reportes de Auditoría
 *
 * Rutas para generación de reportes PDF con validez legal,
 * verificación de integridad, historial y descarga
 *
 * @version 1.0
 * @date 2025-10-16
 */

const express = require('express');
const router = express.Router();
const auditReportService = require('../services/auditReportService');

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
// ENDPOINTS DE AUDIT REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/audit-reports/generate
 * Genera un nuevo reporte de auditoría con firma digital y QR
 */
router.post('/generate', requireRRHH, async (req, res) => {
    try {
        const { company_id, employee_id } = req.user;
        const { report_type, params } = req.body;

        // Validar tipo de reporte
        const validTypes = [
            'compliance_audit',
            'sla_performance',
            'resource_utilization',
            'attendance_summary',
            'employee_performance',
            'violation_report'
        ];

        if (!validTypes.includes(report_type)) {
            return res.status(400).json({
                success: false,
                error: `Tipo de reporte inválido. Tipos válidos: ${validTypes.join(', ')}`
            });
        }

        // Validar parámetros requeridos según tipo
        if (!params || !params.start_date || !params.end_date) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren los parámetros: start_date, end_date'
            });
        }

        // Validación adicional para employee_performance
        if (report_type === 'employee_performance' && !params.employee_id) {
            return res.status(400).json({
                success: false,
                error: 'Para employee_performance se requiere params.employee_id'
            });
        }

        console.log(`📄 Generando reporte: ${report_type} para empresa ${company_id}`);

        const report = await auditReportService.generateReport(
            company_id,
            report_type,
            params,
            employee_id
        );

        res.status(201).json({
            success: true,
            message: 'Reporte generado exitosamente',
            report: report
        });

    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/audit-reports/verify/:verification_code
 * Verifica la integridad y autenticidad de un reporte
 * NOTA: Este endpoint NO requiere autenticación para permitir verificación pública
 */
router.get('/verify/:verification_code', async (req, res) => {
    try {
        const { verification_code } = req.params;

        if (!verification_code || verification_code.length !== 32) {
            return res.status(400).json({
                success: false,
                error: 'Código de verificación inválido'
            });
        }

        const verification = await auditReportService.verifyReport(verification_code);

        if (!verification.valid) {
            return res.status(404).json({
                success: false,
                error: verification.error,
                verified: false
            });
        }

        res.json({
            success: true,
            verified: true,
            report: verification.report,
            message: verification.message
        });

    } catch (error) {
        console.error('❌ Error verificando reporte:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/audit-reports/history
 * Obtiene historial de reportes generados
 */
router.get('/history', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { report_type, start_date, end_date, limit = 50 } = req.query;

        const filters = {
            report_type,
            start_date,
            end_date,
            limit: parseInt(limit)
        };

        const history = await auditReportService.getReportHistory(company_id, filters);

        res.json({
            success: true,
            reports: history,
            total: history.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo historial:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/audit-reports/download/:report_id
 * Descarga un reporte PDF existente
 */
router.get('/download/:report_id', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { report_id } = req.params;

        const report = await auditReportService.downloadReport(
            parseInt(report_id),
            company_id
        );

        // Enviar archivo
        res.download(report.filepath, report.filename, (err) => {
            if (err) {
                console.error('❌ Error descargando archivo:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Error al descargar el archivo'
                    });
                }
            }
        });

    } catch (error) {
        console.error('❌ Error descargando reporte:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/audit-reports/statistics
 * Obtiene estadísticas de reportes generados
 */
router.get('/statistics', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren los parámetros: start_date, end_date'
            });
        }

        const statistics = await auditReportService.getReportStatistics(
            company_id,
            start_date,
            end_date
        );

        res.json({
            success: true,
            period: { start_date, end_date },
            statistics: statistics
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/audit-reports/types
 * Lista los tipos de reportes disponibles con sus descripciones
 */
router.get('/types', requireRRHH, async (req, res) => {
    try {
        const reportTypes = [
            {
                type: 'compliance_audit',
                name: 'Auditoría de Cumplimiento Legal',
                description: 'Reporte completo de violaciones legales detectadas',
                required_params: ['start_date', 'end_date']
            },
            {
                type: 'sla_performance',
                name: 'Rendimiento SLA',
                description: 'Métricas de tiempo de respuesta y rankings de aprobadores',
                required_params: ['start_date', 'end_date']
            },
            {
                type: 'resource_utilization',
                name: 'Utilización de Recursos',
                description: 'Análisis de horas trabajadas por categoría y empleado',
                required_params: ['start_date', 'end_date']
            },
            {
                type: 'attendance_summary',
                name: 'Resumen de Asistencias',
                description: 'Reporte de asistencias, tardanzas y ausencias',
                required_params: ['start_date', 'end_date'],
                optional_params: ['employee_id']
            },
            {
                type: 'employee_performance',
                name: 'Desempeño de Empleado',
                description: 'Reporte individual de desempeño y cumplimiento',
                required_params: ['employee_id', 'start_date', 'end_date']
            },
            {
                type: 'violation_report',
                name: 'Reporte de Violaciones Activas',
                description: 'Lista de todas las violaciones sin resolver',
                required_params: ['start_date', 'end_date']
            }
        ];

        res.json({
            success: true,
            report_types: reportTypes,
            total: reportTypes.length
        });

    } catch (error) {
        console.error('❌ Error listando tipos de reportes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/audit-reports/batch-generate
 * Genera múltiples reportes en lote
 */
router.post('/batch-generate', requireRRHH, async (req, res) => {
    try {
        const { company_id, employee_id } = req.user;
        const { reports } = req.body;

        if (!Array.isArray(reports) || reports.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de reportes a generar'
            });
        }

        if (reports.length > 10) {
            return res.status(400).json({
                success: false,
                error: 'Máximo 10 reportes por lote'
            });
        }

        console.log(`📄 Generando ${reports.length} reportes en lote para empresa ${company_id}`);

        const results = [];
        const errors = [];

        for (const reportConfig of reports) {
            try {
                const report = await auditReportService.generateReport(
                    company_id,
                    reportConfig.report_type,
                    reportConfig.params,
                    employee_id
                );
                results.push(report);
            } catch (error) {
                errors.push({
                    report_type: reportConfig.report_type,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `${results.length} reportes generados exitosamente`,
            reports: results,
            errors: errors.length > 0 ? errors : undefined,
            total_generated: results.length,
            total_errors: errors.length
        });

    } catch (error) {
        console.error('❌ Error generando reportes en lote:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/audit-reports/:report_id/info
 * Obtiene información de un reporte sin descargarlo
 */
router.get('/:report_id/info', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { report_id } = req.params;

        const result = await pool.query(`
            SELECT
                id,
                report_type,
                generated_at,
                generated_by,
                parameters,
                verification_code,
                file_path,
                status
            FROM audit_reports
            WHERE id = $1 AND company_id = $2
        `, [parseInt(report_id), company_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reporte no encontrado'
            });
        }

        const report = result.rows[0];

        res.json({
            success: true,
            report: {
                id: report.id,
                type: report.report_type,
                generated_at: report.generated_at,
                generated_by: report.generated_by,
                parameters: report.parameters,
                verification_code: report.verification_code,
                verification_url: `${process.env.VERIFICATION_URL || 'https://tu-dominio.com/verify'}/${report.verification_code}`,
                status: report.status
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo información de reporte:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
