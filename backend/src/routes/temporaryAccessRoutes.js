/**
 * ============================================================================
 * RUTAS: Temporary Access (Accesos Temporales)
 * ============================================================================
 * API REST para gestión de accesos temporales digitales
 * - Auditores externos
 * - Asesores y consultores
 * - Médicos no asociados
 * - Contratistas y personal temporal
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const temporaryAccessService = require('../services/TemporaryAccessService');
const { auth } = require('../middleware/auth');

// ============================================================================
// MIDDLEWARE: Verificar permisos de administrador
// ============================================================================
const requireAdmin = (req, res, next) => {
    if (!['admin', 'owner', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Se requieren permisos de administrador'
        });
    }
    next();
};

// ============================================================================
// ENDPOINTS PÚBLICOS (sin autenticación)
// ============================================================================

/**
 * POST /api/temporary-access/auth/login
 * Login especial para usuarios temporales
 */
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username y password son requeridos'
            });
        }

        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await temporaryAccessService.validateCredentials(
            username,
            password,
            ipAddress
        );

        // Si requiere cambio de password, retornar flag
        if (result.grant.requirePasswordChange) {
            return res.json({
                success: true,
                requirePasswordChange: true,
                grantId: result.grant.id,
                message: 'Debe cambiar su contraseña antes de continuar'
            });
        }

        // Generar token JWT temporal (igual que usuarios normales pero con scope limitado)
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            {
                id: result.grant.id,
                type: 'temporary_access',
                companyId: result.grant.companyId,
                username: result.grant.username,
                role: 'temporary_user',
                permissions: {
                    allowedModules: result.grant.allowedModules,
                    permissionLevel: result.grant.permissionLevel
                }
            },
            process.env.JWT_SECRET,
            { expiresIn: '12h' } // Token expira cada 12 horas
        );

        res.json({
            success: true,
            token,
            user: {
                id: result.grant.id,
                fullName: result.grant.fullName,
                email: result.grant.email,
                username: result.grant.username,
                accessType: result.grant.accessType,
                allowedModules: result.grant.allowedModules,
                permissionLevel: result.grant.permissionLevel,
                validUntil: result.grant.validUntil
            }
        });

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error en login:', error);
        res.status(401).json({
            success: false,
            error: error.message || 'Credenciales inválidas'
        });
    }
});

/**
 * POST /api/temporary-access/auth/change-password
 * Cambiar contraseña en primer login
 */
router.post('/auth/change-password', async (req, res) => {
    try {
        const { grantId, oldPassword, newPassword } = req.body;

        if (!grantId || !oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos'
            });
        }

        // Validar que la contraseña anterior sea correcta
        const { sequelize } = require('../config/database');
        const bcrypt = require('bcrypt');

        const [grant] = await sequelize.query(`
            SELECT password_hash, username FROM temporary_access_grants WHERE id = :grantId
        `, {
            replacements: { grantId },
            type: sequelize.QueryTypes.SELECT
        });

        if (!grant) {
            return res.status(404).json({
                success: false,
                error: 'Acceso no encontrado'
            });
        }

        const passwordValid = await bcrypt.compare(oldPassword, grant.password_hash);
        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                error: 'Contraseña actual incorrecta'
            });
        }

        // Validar nueva contraseña
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe tener al menos 8 caracteres'
            });
        }

        // Cambiar contraseña
        await temporaryAccessService.changePassword(grantId, newPassword);

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error cambiando password:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al cambiar contraseña'
        });
    }
});

// ============================================================================
// ENDPOINTS PROTEGIDOS (requieren autenticación)
// ============================================================================

// Aplicar autenticación a todos los endpoints siguientes
router.use(auth);

/**
 * GET /api/temporary-access/templates
 * Listar templates disponibles
 */
router.get('/templates', async (req, res) => {
    try {
        const companyId = req.user.companyId || req.user.company_id;

        const result = await temporaryAccessService.getTemplates(companyId);

        res.json(result);

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error obteniendo templates:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/temporary-access/create
 * Crear nuevo acceso temporal (solo admins)
 */
router.post('/create', requireAdmin, async (req, res) => {
    try {
        const companyId = req.user.companyId || req.user.company_id;
        const createdBy = req.user.user_id || req.user.id;

        const data = {
            companyId,
            ...req.body
        };

        const result = await temporaryAccessService.createTemporaryAccess(data, createdBy);

        res.json(result);

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error creando acceso:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/temporary-access/list
 * Listar accesos temporales (solo admins)
 */
router.get('/list', requireAdmin, async (req, res) => {
    try {
        const companyId = req.user.companyId || req.user.company_id;

        const filters = {
            status: req.query.status,
            accessType: req.query.accessType,
            search: req.query.search,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        const result = await temporaryAccessService.listAccessesByCompany(companyId, filters);

        res.json(result);

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error listando accesos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/temporary-access/:grantId
 * Obtener detalles de un acceso temporal
 */
router.get('/:grantId', async (req, res) => {
    try {
        const { grantId } = req.params;
        const companyId = req.user.companyId || req.user.company_id;
        const { sequelize } = require('../config/database');

        const [grant] = await sequelize.query(`
            SELECT
                g.id,
                g.full_name,
                g.email,
                g.dni,
                g.phone,
                g.organization,
                g.access_type,
                g.username,
                g.allowed_modules,
                g.permission_level,
                g.status,
                g.valid_from,
                g.valid_until,
                g.first_login_at,
                g.last_login_at,
                g.total_logins,
                g.password_changed,
                g.purpose,
                g.internal_notes,
                g.created_at,
                EXTRACT(DAY FROM (g.valid_until - NOW())) as days_remaining,
                creator.email as created_by_email,
                approver.email as approved_by_email
            FROM temporary_access_grants g
            LEFT JOIN users creator ON g.created_by = creator.user_id
            LEFT JOIN users approver ON g.approved_by = approver.user_id
            WHERE g.id = :grantId
            AND g.company_id = :companyId
        `, {
            replacements: { grantId, companyId },
            type: sequelize.QueryTypes.SELECT
        });

        if (!grant) {
            return res.status(404).json({
                success: false,
                error: 'Acceso no encontrado'
            });
        }

        res.json({
            success: true,
            grant
        });

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error obteniendo detalles:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/temporary-access/:grantId/activate
 * Activar acceso temporal (solo admins)
 */
router.put('/:grantId/activate', requireAdmin, async (req, res) => {
    try {
        const { grantId } = req.params;
        const approvedBy = req.user.user_id || req.user.id;

        const result = await temporaryAccessService.activateAccess(grantId, approvedBy);

        res.json(result);

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error activando acceso:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/temporary-access/:grantId/revoke
 * Revocar acceso temporal (solo admins)
 */
router.put('/:grantId/revoke', requireAdmin, async (req, res) => {
    try {
        const { grantId } = req.params;
        const { reason } = req.body;
        const revokedBy = req.user.user_id || req.user.id;

        const result = await temporaryAccessService.revokeAccess(grantId, revokedBy, reason);

        res.json(result);

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error revocando acceso:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/temporary-access/stats
 * Obtener estadísticas de accesos temporales (solo admins)
 */
router.get('/company/stats', requireAdmin, async (req, res) => {
    try {
        const companyId = req.user.companyId || req.user.company_id;

        const result = await temporaryAccessService.getStatistics(companyId);

        res.json(result);

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/temporary-access/activity
 * Obtener actividad reciente (solo admins)
 */
router.get('/company/activity', requireAdmin, async (req, res) => {
    try {
        const companyId = req.user.companyId || req.user.company_id;
        const limit = parseInt(req.query.limit) || 50;

        const result = await temporaryAccessService.getRecentActivity(companyId, limit);

        res.json(result);

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error obteniendo actividad:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/temporary-access/:grantId/activity
 * Obtener actividad de un acceso específico
 */
router.get('/:grantId/activity', async (req, res) => {
    try {
        const { grantId } = req.params;
        const companyId = req.user.companyId || req.user.company_id;
        const limit = parseInt(req.query.limit) || 50;
        const { sequelize } = require('../config/database');

        const logs = await sequelize.query(`
            SELECT
                l.id,
                l.activity_type,
                l.module_accessed,
                l.action_performed,
                l.ip_address,
                l.user_agent,
                l.created_at
            FROM temporary_access_activity_log l
            JOIN temporary_access_grants g ON l.grant_id = g.id
            WHERE l.grant_id = :grantId
            AND g.company_id = :companyId
            ORDER BY l.created_at DESC
            LIMIT :limit
        `, {
            replacements: { grantId, companyId, limit },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            logs
        });

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error obteniendo actividad:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/temporary-access/:grantId/extend
 * Extender vigencia de un acceso temporal (solo admins)
 */
router.put('/:grantId/extend', requireAdmin, async (req, res) => {
    try {
        const { grantId } = req.params;
        const { newValidUntil, additionalDays } = req.body;
        const companyId = req.user.companyId || req.user.company_id;
        const { sequelize } = require('../config/database');

        if (!newValidUntil && !additionalDays) {
            return res.status(400).json({
                success: false,
                error: 'Debe especificar newValidUntil o additionalDays'
            });
        }

        let finalValidUntil;

        if (newValidUntil) {
            finalValidUntil = new Date(newValidUntil);
        } else {
            // Obtener valid_until actual y sumar días
            const [grant] = await sequelize.query(`
                SELECT valid_until FROM temporary_access_grants WHERE id = :grantId
            `, {
                replacements: { grantId },
                type: sequelize.QueryTypes.SELECT
            });

            if (!grant) {
                return res.status(404).json({
                    success: false,
                    error: 'Acceso no encontrado'
                });
            }

            finalValidUntil = new Date(grant.valid_until);
            finalValidUntil.setDate(finalValidUntil.getDate() + parseInt(additionalDays));
        }

        await sequelize.query(`
            UPDATE temporary_access_grants
            SET
                valid_until = :validUntil,
                updated_at = NOW()
            WHERE id = :grantId
            AND company_id = :companyId
        `, {
            replacements: {
                grantId,
                companyId,
                validUntil: finalValidUntil
            }
        });

        // Log actividad
        await temporaryAccessService.logActivity({
            grantId,
            companyId,
            activityType: 'access_extended',
            metadata: {
                newValidUntil: finalValidUntil.toISOString(),
                extendedBy: req.user.user_id || req.user.id
            }
        });

        res.json({
            success: true,
            message: 'Vigencia extendida correctamente',
            newValidUntil: finalValidUntil
        });

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error extendiendo acceso:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/temporary-access/:grantId/suspend
 * Suspender temporalmente un acceso (solo admins)
 */
router.put('/:grantId/suspend', requireAdmin, async (req, res) => {
    try {
        const { grantId } = req.params;
        const { reason } = req.body;
        const companyId = req.user.companyId || req.user.company_id;
        const { sequelize } = require('../config/database');

        await sequelize.query(`
            UPDATE temporary_access_grants
            SET
                status = 'suspended',
                updated_at = NOW(),
                metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{suspension_reason}',
                    to_jsonb(:reason::text)
                )
            WHERE id = :grantId
            AND company_id = :companyId
            AND status = 'active'
        `, {
            replacements: {
                grantId,
                companyId,
                reason: reason || 'Suspendido manualmente'
            }
        });

        await temporaryAccessService.logActivity({
            grantId,
            companyId,
            activityType: 'access_suspended',
            metadata: {
                reason,
                suspendedBy: req.user.user_id || req.user.id
            }
        });

        res.json({
            success: true,
            message: 'Acceso suspendido correctamente'
        });

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error suspendiendo acceso:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/temporary-access/:grantId/reactivate
 * Reactivar un acceso suspendido (solo admins)
 */
router.put('/:grantId/reactivate', requireAdmin, async (req, res) => {
    try {
        const { grantId } = req.params;
        const companyId = req.user.companyId || req.user.company_id;
        const { sequelize } = require('../config/database');

        await sequelize.query(`
            UPDATE temporary_access_grants
            SET
                status = 'active',
                updated_at = NOW()
            WHERE id = :grantId
            AND company_id = :companyId
            AND status = 'suspended'
        `, {
            replacements: { grantId, companyId }
        });

        await temporaryAccessService.logActivity({
            grantId,
            companyId,
            activityType: 'access_reactivated',
            metadata: {
                reactivatedBy: req.user.user_id || req.user.id
            }
        });

        res.json({
            success: true,
            message: 'Acceso reactivado correctamente'
        });

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error reactivando acceso:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/temporary-access/:grantId
 * Eliminar acceso temporal (solo admins, solo si está en pending)
 */
router.delete('/:grantId', requireAdmin, async (req, res) => {
    try {
        const { grantId } = req.params;
        const companyId = req.user.companyId || req.user.company_id;
        const { sequelize } = require('../config/database');

        const [result] = await sequelize.query(`
            DELETE FROM temporary_access_grants
            WHERE id = :grantId
            AND company_id = :companyId
            AND status = 'pending'
            RETURNING id
        `, {
            replacements: { grantId, companyId },
            type: sequelize.QueryTypes.DELETE
        });

        if (!result || result.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Solo se pueden eliminar accesos en estado pending'
            });
        }

        res.json({
            success: true,
            message: 'Acceso eliminado correctamente'
        });

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error eliminando acceso:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/temporary-access/cron/auto-expire
 * Endpoint para CRON job de auto-expiración
 * (protegido por API key en headers)
 */
router.post('/cron/auto-expire', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];

        // Validar API key (configurar en .env)
        if (apiKey !== process.env.CRON_API_KEY) {
            return res.status(401).json({
                success: false,
                error: 'API key inválida'
            });
        }

        const result = await temporaryAccessService.autoExpireAccesses();

        res.json(result);

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error en auto-expiración:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/temporary-access/cron/expiry-warnings
 * Endpoint para CRON job de alertas de expiración
 */
router.post('/cron/expiry-warnings', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (apiKey !== process.env.CRON_API_KEY) {
            return res.status(401).json({
                success: false,
                error: 'API key inválida'
            });
        }

        const result = await temporaryAccessService.sendExpiryWarnings();

        res.json(result);

    } catch (error) {
        console.error('❌ [TEMP-ACCESS-API] Error enviando alertas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
