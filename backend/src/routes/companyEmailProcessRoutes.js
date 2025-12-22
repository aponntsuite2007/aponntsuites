/**
 * ============================================================================
 * COMPANY EMAIL PROCESS ROUTES
 * ============================================================================
 *
 * API REST para asignar emails de empresa a procesos de notificación.
 *
 * ENDPOINTS:
 * - POST   /api/company-email-process/assign        - Asignar email a proceso
 * - POST   /api/company-email-process/auto-assign   - Auto-asignar todos al primer email
 * - GET    /api/company-email-process/mappings      - Ver mapeos de empresa
 * - GET    /api/company-email-process/unassigned    - Ver procesos sin asignar
 * - GET    /api/company-email-process/stats         - Estadísticas de asignación
 * - DELETE /api/company-email-process/unassign      - Des-asignar proceso
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const CompanyEmailProcessService = require('../services/CompanyEmailProcessService');

// Middleware de autenticación para todas las rutas
router.use(auth);

/**
 * POST /api/company-email-process/assign
 * Asignar un email específico a un proceso
 *
 * Body:
 * {
 *   "emailConfigId": "uuid",
 *   "processKey": "employee_welcome"
 * }
 */
router.post('/assign', async (req, res) => {
    try {
        const { emailConfigId, processKey } = req.body;
        const companyId = req.user.company_id;
        const userId = req.user.id;

        // Validación
        if (!emailConfigId || !processKey) {
            return res.status(400).json({
                success: false,
                message: 'emailConfigId y processKey son requeridos'
            });
        }

        const result = await CompanyEmailProcessService.assignEmailToProcess(
            companyId,
            emailConfigId,
            processKey,
            userId
        );

        res.json(result);

    } catch (error) {
        console.error('[API CompanyEmailProcess] Error en /assign:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al asignar email a proceso'
        });
    }
});

/**
 * POST /api/company-email-process/auto-assign
 * Auto-asignar TODOS los procesos company al primer email
 * (Se ejecuta automáticamente al crear el primer email)
 *
 * Body:
 * {
 *   "emailConfigId": "uuid"
 * }
 */
router.post('/auto-assign', async (req, res) => {
    try {
        const { emailConfigId } = req.body;
        const companyId = req.user.company_id;
        const userId = req.user.id;

        // Validación
        if (!emailConfigId) {
            return res.status(400).json({
                success: false,
                message: 'emailConfigId es requerido'
            });
        }

        // Verificar si es el primer email
        const isFirst = await CompanyEmailProcessService.isFirstEmail(companyId);

        if (!isFirst) {
            return res.status(400).json({
                success: false,
                message: 'Esta operación solo se permite para el primer email configurado. Use /assign para asignar procesos individualmente.'
            });
        }

        const result = await CompanyEmailProcessService.autoAssignAllProcessesToFirstEmail(
            companyId,
            emailConfigId,
            userId
        );

        res.json(result);

    } catch (error) {
        console.error('[API CompanyEmailProcess] Error en /auto-assign:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error en auto-asignación'
        });
    }
});

/**
 * GET /api/company-email-process/mappings
 * Obtener todos los mapeos email-proceso de la empresa
 *
 * Response:
 * {
 *   "success": true,
 *   "mappings": [
 *     {
 *       "id": 1,
 *       "process_key": "employee_welcome",
 *       "process_name": "Bienvenida a nuevo empleado",
 *       "module": "onboarding",
 *       "email_config_id": "uuid",
 *       "smtp_from_email": "rrhh@empresa.com",
 *       "smtp_from_name": "RRHH Empresa",
 *       "assigned_at": "2025-12-21T10:30:00Z",
 *       "is_active": true
 *     }
 *   ]
 * }
 */
router.get('/mappings', async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const mappings = await CompanyEmailProcessService.getCompanyMappings(companyId);

        res.json({
            success: true,
            mappings,
            total: mappings.length
        });

    } catch (error) {
        console.error('[API CompanyEmailProcess] Error en /mappings:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al obtener mapeos'
        });
    }
});

/**
 * GET /api/company-email-process/unassigned
 * Obtener procesos SIN asignar de la empresa
 *
 * Response:
 * {
 *   "success": true,
 *   "unassigned": [
 *     {
 *       "process_key": "vacation_approved",
 *       "process_name": "Vacaciones aprobadas",
 *       "module": "vacation",
 *       "description": "Notificación de vacaciones aprobadas",
 *       "priority": "medium"
 *     }
 *   ]
 * }
 */
router.get('/unassigned', async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const unassigned = await CompanyEmailProcessService.getUnassignedProcesses(companyId);

        res.json({
            success: true,
            unassigned,
            total: unassigned.length
        });

    } catch (error) {
        console.error('[API CompanyEmailProcess] Error en /unassigned:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al obtener procesos sin asignar'
        });
    }
});

/**
 * GET /api/company-email-process/stats
 * Obtener estadísticas de asignación de la empresa
 *
 * Response:
 * {
 *   "success": true,
 *   "stats": {
 *     "total_processes": 26,
 *     "assigned": 20,
 *     "unassigned": 6,
 *     "coverage_percentage": 76.92
 *   }
 * }
 */
router.get('/stats', async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const stats = await CompanyEmailProcessService.getAssignmentStats(companyId);

        // Calcular porcentaje de cobertura
        const coveragePercentage = stats.total_processes > 0
            ? ((stats.assigned / stats.total_processes) * 100).toFixed(2)
            : 0;

        res.json({
            success: true,
            stats: {
                ...stats,
                coverage_percentage: parseFloat(coveragePercentage)
            }
        });

    } catch (error) {
        console.error('[API CompanyEmailProcess] Error en /stats:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al obtener estadísticas'
        });
    }
});

/**
 * DELETE /api/company-email-process/unassign
 * Des-asignar un proceso (marcar como inactivo)
 *
 * Body:
 * {
 *   "processKey": "employee_welcome"
 * }
 */
router.delete('/unassign', async (req, res) => {
    try {
        const { processKey } = req.body;
        const companyId = req.user.company_id;

        // Validación
        if (!processKey) {
            return res.status(400).json({
                success: false,
                message: 'processKey es requerido'
            });
        }

        const result = await CompanyEmailProcessService.unassignProcess(companyId, processKey);

        res.json(result);

    } catch (error) {
        console.error('[API CompanyEmailProcess] Error en /unassign:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al des-asignar proceso'
        });
    }
});

/**
 * GET /api/company-email-process/check-first-email
 * Verificar si es el primer email de la empresa
 * (Útil para UI: mostrar/ocultar opciones de auto-asignación)
 *
 * Response:
 * {
 *   "success": true,
 *   "isFirstEmail": true
 * }
 */
router.get('/check-first-email', async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const isFirst = await CompanyEmailProcessService.isFirstEmail(companyId);

        res.json({
            success: true,
            isFirstEmail: isFirst
        });

    } catch (error) {
        console.error('[API CompanyEmailProcess] Error en /check-first-email:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al verificar primer email'
        });
    }
});

module.exports = router;
