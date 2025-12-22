/**
 * ============================================================================
 * EMAIL CONFIG ROUTES - API para configuración de emails de Aponnt
 * ============================================================================
 *
 * Endpoints para gestionar configuraciones SMTP de emails de Aponnt.
 *
 * SEGURIDAD:
 * - SIN RESTRICCIONES DE ROL - Acceso libre con autenticacion JWT
 * - Autenticacion mediante JWT
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
 * Middleware de autenticacion JWT - Sin restricciones de rol
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');

        console.log('[EMAIL-CONFIG-AUTH] Verificando autenticación...');
        console.log('[EMAIL-CONFIG-AUTH] Token presente:', !!token);

        if (!token) {
            console.warn('[EMAIL-CONFIG-AUTH] ❌ Token no proporcionado');
            return res.status(401).json({ error: 'Token requerido' });
        }

        const secret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, secret);

        console.log('[EMAIL-CONFIG-AUTH] Token decodificado:', {
            staff_id: decoded.staff_id,
            staffId: decoded.staffId,
            role: decoded.role,
            role_code: decoded.role_code,
            type: decoded.type
        });

        // RESTRICCIONES DE PERMISOS DESHABILITADAS - Módulo público
        // if (!decoded.staffId && !decoded.staff_id) {
        //     console.warn('[EMAIL-CONFIG-AUTH] ❌ No es staff de APONNT');
        //     return res.status(403).json({ error: 'Acceso solo para staff de APONNT' });
        // }

        const role = decoded.role || decoded.role_code || decoded.roleCode;
        console.log('[EMAIL-CONFIG-AUTH] Rol detectado:', role);

        // if (role !== 'GG' && role !== 'SUPERADMIN') {
        //     console.warn('[EMAIL-CONFIG-AUTH] ❌ Rol insuficiente:', role);
        //     return res.status(403).json({
        //         error: 'Acceso denegado',
        //         message: 'Solo Gerente General o SUPERADMIN puede acceder a configuraciones de email'
        //     });
        // }

        console.log('[EMAIL-CONFIG-AUTH] ✅ Autenticación exitosa (acceso público) - Rol:', role);

        req.staffId = decoded.staffId || decoded.staff_id;
        req.staffRole = role;
        next();
    } catch (error) {
        console.error('[EMAIL-CONFIG-AUTH] ❌ Error:', error.message);
        return res.status(401).json({ error: 'Token inválido', detail: error.message });
    }
};

// =========================================================================
// ENDPOINTS - ORDEN IMPORTANTE: Rutas específicas primero, paramétricas al final
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
 * POST /api/email-config - Crear un nuevo tipo de email
 *
 * Body:
 * {
 *   "emailType": "marketing",
 *   "displayName": "Marketing Campaigns",
 *   "icon": "📢",
 *   "color": "#f97316",
 *   "description": "Campañas de marketing y promociones",
 *   "fromEmail": "marketing@aponnt.com",
 *   "fromName": "Aponnt Marketing"
 * }
 */
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const {
            emailType,
            displayName,
            icon,
            color,
            description,
            fromEmail,
            fromName
        } = req.body;

        // Validación
        if (!emailType || !displayName) {
            return res.status(400).json({
                error: 'emailType y displayName son requeridos',
                example: {
                    emailType: 'marketing',
                    displayName: 'Marketing Campaigns',
                    icon: '📢',
                    color: '#f97316',
                    description: 'Campañas de marketing',
                    fromEmail: 'marketing@aponnt.com',
                    fromName: 'Aponnt Marketing'
                }
            });
        }

        // Verificar que el emailType no exista ya
        const existingConfig = await EmailConfigService.getConfigByType(emailType, req.staffRole);
        if (existingConfig) {
            return res.status(409).json({
                error: 'El tipo de email ya existe',
                message: `Ya existe una configuración para el tipo "${emailType}"`
            });
        }

        // Crear nueva configuración
        const result = await EmailConfigService.createConfig({
            email_type: emailType,
            from_name: displayName,
            from_email: fromEmail || null,
            icon: icon || '📧',
            color: color || '#6b7280',
            description: description || 'Email de Aponnt'
        });

        res.status(201).json({
            success: true,
            message: 'Tipo de email creado exitosamente',
            emailType: result.email_type
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error creando email type:', error);
        res.status(500).json({
            error: error.message,
            message: 'Error creando tipo de email'
        });
    }
});

// =========================================================================
// ENDPOINTS DE MAPEO DE PROCESOS - ANTES de rutas paramétricas
// =========================================================================

/**
 * GET /api/email-config/processes/all - Obtener todos los procesos con su email asignado
 */
router.get('/processes/all', authenticateAdmin, async (req, res) => {
    try {
        const processes = await EmailConfigService.getAllProcessMappings();

        res.json({
            success: true,
            count: processes.length,
            processes
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error obteniendo process mappings:', error);
        res.status(500).json({
            error: error.message,
            message: 'Error obteniendo mapeo de procesos'
        });
    }
});

/**
 * GET /api/email-config/processes/stats - Obtener estadísticas de mapeo
 */
router.get('/processes/stats', authenticateAdmin, async (req, res) => {
    try {
        const stats = await EmailConfigService.getProcessMappingStats();

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error obteniendo stats de mapeo:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/email-config/processes/:processKey/email - Obtener email asignado a un proceso (para uso interno)
 */
router.get('/processes/:processKey/email', authenticateAdmin, async (req, res) => {
    try {
        const { processKey } = req.params;

        const email = await EmailConfigService.getEmailForProcess(processKey);

        if (!email) {
            return res.status(404).json({
                error: 'No hay email configurado para este proceso',
                processKey,
                message: 'Configure un email para este proceso en el panel de configuración'
            });
        }

        // NO enviar passwords desencriptados
        delete email.smtp_password;
        delete email.app_password;
        delete email.smtp_password_decrypted;
        delete email.app_password_decrypted;

        res.json({
            success: true,
            processKey,
            email
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error obteniendo email para proceso:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/email-config/processes/:processKey - Actualizar email asignado a un proceso
 */
router.patch('/processes/:processKey', authenticateAdmin, async (req, res) => {
    try {
        const { processKey } = req.params;
        const { emailType } = req.body;

        const result = await EmailConfigService.updateProcessMapping(
            processKey,
            emailType,
            req.staffId
        );

        res.json({
            success: true,
            message: result.message,
            processKey,
            emailType
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error actualizando mapeo:', error);
        res.status(400).json({
            error: error.message,
            message: 'Error actualizando mapeo de proceso'
        });
    }
});

/**
 * POST /api/email-config/processes/batch - Actualizar múltiples mapeos en batch
 */
router.post('/processes/batch', authenticateAdmin, async (req, res) => {
    try {
        const { mappings } = req.body;

        if (!Array.isArray(mappings) || mappings.length === 0) {
            return res.status(400).json({
                error: 'Debe proporcionar un array de mappings',
                example: [{ processKey: 'support_ticket_created', emailType: 'support' }]
            });
        }

        const result = await EmailConfigService.updateMultipleProcessMappings(
            mappings,
            req.staffId
        );

        res.json({
            success: result.failed === 0,
            message: `${result.success} mapeos actualizados, ${result.failed} fallidos`,
            result
        });

    } catch (error) {
        console.error('❌ [EMAIL-CONFIG-API] Error en batch update:', error);
        res.status(500).json({
            error: error.message,
            message: 'Error actualizando mapeos en batch'
        });
    }
});

/**
 * GET /api/email-config/audit/all - Obtener todo el historial de auditoría
 * NOTA: Esta ruta debe estar ANTES de /:emailType/audit
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

// =========================================================================
// RUTAS PARAMÉTRICAS - AL FINAL para que no capturen rutas específicas
// =========================================================================

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

module.exports = router;
