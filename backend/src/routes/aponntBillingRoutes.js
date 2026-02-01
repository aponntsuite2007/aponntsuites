/**
 * ============================================================================
 * APONNT BILLING ROUTES
 * ============================================================================
 *
 * API REST para gestión de facturación de APONNT a empresas clientes.
 * - Pre-facturas (generación automática, aprobación, facturación)
 * - Tareas administrativas
 * - Configuración de emails
 * - Dashboard de administración
 *
 * Base URL: /api/aponnt/billing
 *
 * Created: 2025-12-17
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AponntBillingService = require('../services/AponntBillingService');

// JWT secret (same as used in aponntDashboard)
const JWT_SECRET = process.env.JWT_SECRET || 'sistema_asistencia_super_secret_key_2024';

// Middleware de autenticación de staff APONNT (con verificación JWT)
const requireAponntStaff = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No autenticado - Token no proporcionado'
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verificar que sea token de staff Aponnt
        if (!decoded.staff_id && !decoded.staffId) {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado: Se requiere token de staff Aponnt'
            });
        }

        // Agregar datos del staff al request
        req.user = {
            id: decoded.staff_id || decoded.staffId,
            staff_id: decoded.staff_id || decoded.staffId,
            email: decoded.email,
            firstName: decoded.firstName || decoded.first_name,
            lastName: decoded.lastName || decoded.last_name,
            area: decoded.area,
            level: decoded.level || 1,
            role: decoded.role || decoded.area || 'staff',
            role_code: decoded.role || decoded.area,
            permissions: decoded.permissions || []
        };

        console.log('🔐 [APONNT-BILLING] Staff autenticado:', decoded.email, '- Role:', req.user.role_code, '- Level:', req.user.level);

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expirado, por favor inicie sesión nuevamente'
            });
        }
        return res.status(401).json({
            success: false,
            error: 'Token inválido'
        });
    }
};

// Roles de alto nivel que siempre tienen acceso completo
const TOP_LEVEL_ROLES = ['GG', 'DIR', 'admin', 'superadmin', 'SUPERADMIN'];

// Middleware para roles específicos
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role_code || req.user?.role || req.user?.area || 'viewer';
        const userLevel = parseInt(req.user?.level) || 0;

        console.log('🔐 [REQUIRE-ROLE] Verificando permisos:');
        console.log('   - User role:', userRole);
        console.log('   - User level:', userLevel);
        console.log('   - Required roles:', allowedRoles);

        // Roles de alto nivel siempre tienen acceso
        if (TOP_LEVEL_ROLES.includes(userRole)) {
            console.log('   ✅ Acceso permitido (rol de alto nivel:', userRole, ')');
            return next();
        }

        // Level 5+ tiene todos los permisos
        if (userLevel >= 5) {
            console.log('   ✅ Acceso permitido (nivel', userLevel, '>= 5)');
            return next();
        }

        if (!allowedRoles.includes(userRole)) {
            console.log('   ❌ Acceso denegado - rol no permitido');
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para esta acción',
                requiredRoles: allowedRoles,
                yourRole: userRole,
                yourLevel: userLevel
            });
        }
        console.log('   ✅ Acceso permitido (rol en lista)');
        next();
    };
};

// ============================================
// DASHBOARD
// ============================================

/**
 * GET /api/aponnt/billing/dashboard/stats
 * Obtiene estadísticas del dashboard administrativo
 */
router.get('/dashboard/stats', requireAponntStaff, async (req, res) => {
    try {
        const stats = await AponntBillingService.getAdminDashboardStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error obteniendo stats del dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PRE-FACTURAS
// ============================================

/**
 * GET /api/aponnt/billing/pre-invoices
 * Lista pre-facturas con filtros
 */
router.get('/pre-invoices', requireAponntStaff, async (req, res) => {
    try {
        const { status, companyId, limit, offset } = req.query;

        const result = await AponntBillingService.listPreInvoices({
            status,
            companyId: companyId ? parseInt(companyId) : null,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: result.preInvoices,
            pagination: {
                total: result.total,
                limit: result.limit,
                offset: result.offset
            }
        });

    } catch (error) {
        console.error('Error listando pre-facturas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/aponnt/billing/pre-invoices/:id
 * Obtiene detalle de una pre-factura
 */
router.get('/pre-invoices/:id', requireAponntStaff, async (req, res) => {
    try {
        const preInvoice = await AponntBillingService.getPreInvoiceById(parseInt(req.params.id));

        if (!preInvoice) {
            return res.status(404).json({
                success: false,
                error: 'Pre-factura no encontrada'
            });
        }

        res.json({
            success: true,
            data: preInvoice
        });

    } catch (error) {
        console.error('Error obteniendo pre-factura:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/aponnt/billing/pre-invoices/from-contract/:contractId
 * Genera pre-factura desde un contrato (manual)
 */
router.post('/pre-invoices/from-contract/:contractId', requireAponntStaff, requireRole(['GA', 'JFC', 'admin']), async (req, res) => {
    try {
        const { contractId } = req.params;

        const preInvoice = await AponntBillingService.createPreInvoiceFromContract(contractId);

        res.status(201).json({
            success: true,
            data: preInvoice,
            message: `Pre-factura ${preInvoice.pre_invoice_code} generada exitosamente`
        });

    } catch (error) {
        console.error('Error generando pre-factura:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/aponnt/billing/pre-invoices/:id/approve
 * Aprueba una pre-factura
 */
router.put('/pre-invoices/:id/approve', requireAponntStaff, requireRole(['GA', 'JFC', 'admin']), async (req, res) => {
    try {
        const staffId = req.user?.staff_id || req.user?.id || 1;

        const preInvoice = await AponntBillingService.approvePreInvoice(
            parseInt(req.params.id),
            staffId
        );

        res.json({
            success: true,
            data: preInvoice,
            message: 'Pre-factura aprobada exitosamente'
        });

    } catch (error) {
        console.error('Error aprobando pre-factura:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/aponnt/billing/pre-invoices/:id/reject
 * Rechaza una pre-factura
 */
router.put('/pre-invoices/:id/reject', requireAponntStaff, requireRole(['GA', 'JFC', 'admin']), async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un motivo de rechazo'
            });
        }

        const staffId = req.user?.staff_id || req.user?.id || 1;

        const preInvoice = await AponntBillingService.rejectPreInvoice(
            parseInt(req.params.id),
            reason,
            staffId
        );

        res.json({
            success: true,
            data: preInvoice,
            message: 'Pre-factura rechazada'
        });

    } catch (error) {
        console.error('Error rechazando pre-factura:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/aponnt/billing/pre-invoices/:id/invoice
 * Convierte pre-factura en factura AFIP
 */
router.put('/pre-invoices/:id/invoice', requireAponntStaff, requireRole(['GA', 'JFC', 'admin']), async (req, res) => {
    try {
        const staffId = req.user?.staff_id || req.user?.id || 1;

        const preInvoice = await AponntBillingService.invoicePreInvoice(
            parseInt(req.params.id),
            staffId
        );

        res.json({
            success: true,
            data: preInvoice,
            message: 'Pre-factura facturada exitosamente'
        });

    } catch (error) {
        console.error('Error facturando pre-factura:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// TAREAS ADMINISTRATIVAS
// ============================================

/**
 * GET /api/aponnt/billing/admin-tasks
 * Lista tareas administrativas pendientes
 */
router.get('/admin-tasks', requireAponntStaff, async (req, res) => {
    try {
        const { taskType, priority, status, assignedRole, limit, offset } = req.query;

        const result = await AponntBillingService.listAdminTasks({
            taskType,
            priority,
            status,
            assignedRole,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: result.tasks,
            counts: result.counts,
            pagination: {
                total: result.total,
                limit: result.limit,
                offset: result.offset
            }
        });

    } catch (error) {
        console.error('Error listando tareas admin:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// CONFIGURACIÓN DE EMAILS
// ============================================

/**
 * GET /api/aponnt/billing/email-config
 * Lista configuraciones de email de APONNT
 */
router.get('/email-config', requireAponntStaff, async (req, res) => {
    try {
        const configs = await AponntBillingService.listEmailConfigs();

        res.json({
            success: true,
            data: configs
        });

    } catch (error) {
        console.error('Error listando email configs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/aponnt/billing/email-config/:type
 * Obtiene configuración de email por tipo
 */
router.get('/email-config/:type', requireAponntStaff, async (req, res) => {
    try {
        const config = await AponntBillingService.getEmailConfig(req.params.type);

        if (!config) {
            return res.status(404).json({
                success: false,
                error: `Configuración de email '${req.params.type}' no encontrada`
            });
        }

        res.json({
            success: true,
            data: config
        });

    } catch (error) {
        console.error('Error obteniendo email config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/aponnt/billing/email-config/:type
 * Actualiza configuración de email
 */
router.put('/email-config/:type', requireAponntStaff, requireRole(['GG', 'GA', 'admin']), async (req, res) => {
    try {
        const { fromEmail, fromName, replyTo, smtpHost, smtpPort, smtpUser, smtpPassword, isActive } = req.body;

        const config = await AponntBillingService.updateEmailConfig(req.params.type, {
            fromEmail,
            fromName,
            replyTo,
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPassword,
            isActive
        });

        res.json({
            success: true,
            data: config,
            message: 'Configuración actualizada'
        });

    } catch (error) {
        console.error('Error actualizando email config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// HELPER: APONNT ID
// ============================================

/**
 * GET /api/aponnt/billing/master-id
 * Obtiene el company_id de APONNT master
 */
router.get('/master-id', requireAponntStaff, async (req, res) => {
    try {
        const masterId = await AponntBillingService.getAponntMasterId();

        res.json({
            success: true,
            data: {
                aponnt_master_id: masterId
            }
        });

    } catch (error) {
        console.error('Error obteniendo master ID:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// TRIAL STATUS
// ============================================

/**
 * GET /api/aponnt/billing/trial-status/contract/:contractId
 * Obtiene el estado del período trial de un contrato
 * Útil para verificar si se puede facturar o si está en trial
 */
router.get('/trial-status/contract/:contractId', requireAponntStaff, async (req, res) => {
    try {
        const trialStatus = await AponntBillingService.getContractTrialStatus(req.params.contractId);

        res.json({
            success: true,
            data: trialStatus
        });

    } catch (error) {
        console.error('Error obteniendo estado de trial:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/aponnt/billing/trial-status/company/:companyId
 * Obtiene el estado del período trial de una empresa
 * Busca el contrato activo más reciente
 */
router.get('/trial-status/company/:companyId', requireAponntStaff, async (req, res) => {
    try {
        const trialStatus = await AponntBillingService.getCompanyTrialStatus(parseInt(req.params.companyId));

        res.json({
            success: true,
            data: trialStatus
        });

    } catch (error) {
        console.error('Error obteniendo estado de trial de empresa:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
