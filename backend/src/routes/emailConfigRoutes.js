/**
 * ============================================================================
 * EMAIL CONFIG ROUTES - API para configuración de emails de Aponnt
 * ============================================================================
 *
 * Endpoints para gestionar configuraciones SMTP de emails de Aponnt.
 *
 * SEGURIDAD:
 * - Solo accesible para staff de Aponnt con rol GG o SUPERADMIN
 * - Autenticación mediante JWT
 * - Passwords encriptados en BD
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const EmailConfigService = require('../services/EmailConfigService');
const jwt = require('jsonwebtoken');

// =========================================================================
// MIDDLEWARE DE AUTENTICACIÓN
// =========================================================================

/**
 * Middleware de autenticación para staff de Aponnt (GG/SUPERADMIN)
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }

        const secret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, secret);

        // Verificar que es staff de APONNT
        if (!decoded.staffId && !decoded.staff_id) {
            return res.status(403).json({ error: 'Acceso solo para staff de APONNT' });
        }

        // Verificar rol GG o SUPERADMIN
        const role = decoded.role || decoded.role_code || decoded.roleCode;
        if (role !== 'GG' && role !== 'SUPERADMIN') {
            return res.status(403).json({
                error: 'Acceso denegado',
                message: 'Solo Gerente General o SUPERADMIN puede acceder a configuraciones de email'
            });
        }

        req.staffId = decoded.staffId || decoded.staff_id;
        req.staffRole = role;
        next();
    } catch (error) {
        console.error('[EMAIL-CONFIG-AUTH] Error:', error.message);
        return res.status(401).json({ error: 'Token inválido', detail: error.message });
    }
};

// =========================================================================
// ENDPOINTS
// =========================================================================

/**
 * GET /api/email-config - Obtener todas las configuraciones de email
 */
router.get('/', authenticateAdmin, async (req, res) => {
    try {
        const configs = await EmailConfigService.getAllConfigs(req.staffRole);

        res.json({
            success: true,
            count: configs.length,
            configs
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error obteniendo configs:', error);
        res.status(500).json({
            error: error.message,
            message: 'Error obteniendo configuraciones de email'
        });
    }
});

/**
 * GET /api/email-config/stats - Obtener estadísticas
 */
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        const stats = await EmailConfigService.getStats();

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error obteniendo stats:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/email-config/:emailType - Obtener configuración específica
 */
router.get('/:emailType', authenticateAdmin, async (req, res) => {
    try {
        const { emailType } = req.params;
        const config = await EmailConfigService.getConfigByType(emailType);

        if (!config) {
            return res.status(404).json({
                error: 'Configuración no encontrada',
                emailType
            });
        }

        // NO enviar passwords desencriptados al frontend
        delete config.smtp_password;
        delete config.app_password;
        delete config.smtp_password_decrypted;
        delete config.app_password_decrypted;

        // Enviar máscara si existen
        config.smtp_password_masked = config.smtp_password ? '••••••••' : null;
        config.app_password_masked = config.app_password ? '••••••••' : null;

        res.json({
            success: true,
            config
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error obteniendo config:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/email-config/:emailType - Actualizar configuración
 */
router.patch('/:emailType', authenticateAdmin, async (req, res) => {
    try {
        const { emailType } = req.params;
        const updates = req.body;

        const result = await EmailConfigService.updateConfig(
            emailType,
            updates,
            req.staffId,
            req.staffRole
        );

        res.json({
            success: true,
            message: result.message,
            emailType
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error actualizando config:', error);
        res.status(500).json({
            error: error.message,
            message: 'Error actualizando configuración'
        });
    }
});

/**
 * POST /api/email-config/:emailType/test - Probar conexión SMTP
 */
router.post('/:emailType/test', authenticateAdmin, async (req, res) => {
    try {
        const { emailType } = req.params;

        const result = await EmailConfigService.testConnection(emailType, req.staffRole);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                messageId: result.messageId,
                testedAt: result.testedAt
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.error,
                code: result.code
            });
        }

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error testeando conexión:', error);
        res.status(500).json({
            error: error.message,
            message: 'Error testeando conexión SMTP'
        });
    }
});

/**
 * GET /api/email-config/:emailType/audit - Obtener historial de auditoría
 */
router.get('/:emailType/audit', authenticateAdmin, async (req, res) => {
    try {
        const { emailType } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const logs = await EmailConfigService.getAuditLog(emailType, limit);

        res.json({
            success: true,
            count: logs.length,
            logs
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error obteniendo audit log:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/email-config/audit/all - Obtener todo el historial de auditoría
 */
router.get('/audit/all', authenticateAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;

        const logs = await EmailConfigService.getAuditLog(null, limit);

        res.json({
            success: true,
            count: logs.length,
            logs
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error obteniendo audit log:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
