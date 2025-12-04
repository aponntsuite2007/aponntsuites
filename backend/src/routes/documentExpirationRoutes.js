/**
 * documentExpirationRoutes.js
 * API para gestion de notificaciones de vencimiento de documentos
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { documentExpirationService } = require('../services/DocumentExpirationNotificationService');

// =========================================================================
// MIDDLEWARE DE AUTENTICACION
// =========================================================================

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Token requerido' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-in-production');

        req.user = decoded;
        req.companyId = decoded.company_id;
        req.userId = decoded.id;

        if (!req.companyId) {
            return res.status(400).json({ success: false, error: 'company_id no encontrado en token' });
        }

        next();
    } catch (error) {
        console.error('[AUTH] Error:', error.message);
        return res.status(401).json({ success: false, error: 'Token invalido o expirado' });
    }
};

// Middleware para verificar rol admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Acceso denegado. Se requiere rol admin.' });
    }
    next();
};

// Aplicar autenticacion a todas las rutas
router.use(authenticate);

// =========================================================================
// RUTAS
// =========================================================================

/**
 * GET /api/v1/document-expiration/stats
 * Obtener estadisticas de documentos por vencer
 */
router.get('/stats', async (req, res) => {
    try {
        const result = await documentExpirationService.getExpirationStats(req.companyId);
        res.json(result);
    } catch (error) {
        console.error('[DOC-EXPIRATION] Error getting stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/document-expiration/process
 * Ejecutar proceso de notificaciones manualmente (solo admin)
 */
router.post('/process', requireAdmin, async (req, res) => {
    try {
        const result = await documentExpirationService.runForCompany(req.companyId);
        res.json(result);
    } catch (error) {
        console.error('[DOC-EXPIRATION] Error processing:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/document-expiration/scheduler/status
 * Obtener estado del scheduler (solo admin)
 */
router.get('/scheduler/status', requireAdmin, (req, res) => {
    res.json({
        success: true,
        data: {
            isRunning: documentExpirationService.scheduledJob !== null,
            isProcessing: documentExpirationService.isRunning,
            escalationConfig: documentExpirationService.escalationConfig
        }
    });
});

/**
 * POST /api/v1/document-expiration/scheduler/start
 * Iniciar scheduler (solo admin de sistema - company_id especial)
 */
router.post('/scheduler/start', requireAdmin, (req, res) => {
    try {
        const { cronExpression } = req.body;
        documentExpirationService.startScheduler(cronExpression || '0 8 * * *');
        res.json({
            success: true,
            message: 'Scheduler iniciado',
            cronExpression: cronExpression || '0 8 * * * (default: 8:00 AM diario)'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/document-expiration/scheduler/stop
 * Detener scheduler (solo admin)
 */
router.post('/scheduler/stop', requireAdmin, (req, res) => {
    try {
        documentExpirationService.stopScheduler();
        res.json({ success: true, message: 'Scheduler detenido' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/document-expiration/expiring
 * Obtener documentos proximos a vencer (con detalle)
 */
router.get('/expiring', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const dependencyService = require('../services/ConceptDependencyService');
        const result = await dependencyService.getExpiringDocuments(req.companyId, days);
        res.json(result);
    } catch (error) {
        console.error('[DOC-EXPIRATION] Error getting expiring docs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
