const { sequelize } = require('../config/database');
const jwt = require('jsonwebtoken');

// Usar el mismo secreto que el resto del sistema
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_aqui';

// Middleware para verificar permisos granulares
const checkPermission = (moduleId, action = 'view') => {
    return async (req, res, next) => {
        try {
            // Verificar si el usuario está autenticado
            const token = req.header('Authorization')?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({ error: 'Token de acceso requerido' });
            }
            
            // Verificar token válido
            let decoded;
            try {
                decoded = jwt.verify(token, JWT_SECRET);
            } catch (error) {
                return res.status(401).json({ error: 'Token inválido' });
            }
            
            const userId = decoded.id;
            const userRole = decoded.role;
            
            // Log de auditoría de intento de acceso
            await logAuditAttempt(req, userId, moduleId, action, 'access_attempt');
            
            // Super admin tiene acceso a todo
            if (userRole === 'admin' && userId) {
                // Verificar que el usuario existe y es admin
                // NOTA: "isActive" es boolean en PostgreSQL, usar true no 1
                const [adminCheck] = await sequelize.query(`
                    SELECT user_id FROM users WHERE user_id = ? AND role = 'admin' AND "isActive" = true
                `, { replacements: [userId] });

                if (adminCheck.length > 0) {
                    req.user = decoded;
                    await logAuditAttempt(req, userId, moduleId, action, 'access_granted', true, 'super_admin');
                    return next();
                }
            }
            
            // Verificar permiso específico del usuario
            const actionId = `${moduleId}:${action}`;
            
            const [permissions] = await sequelize.query(`
                SELECT up.hasAccess, up.revokedAt, sm.name as moduleName, ma.name as actionName
                FROM user_permissions up
                JOIN system_modules sm ON up.moduleId = sm.id
                JOIN module_actions ma ON up.actionId = ma.id
                WHERE up.userId = ? AND up.actionId = ? AND (up.revokedAt IS NULL OR up.revokedAt > NOW())
            `, { replacements: [userId, actionId] });
            
            if (permissions.length === 0) {
                // No tiene permiso específico, verificar plantilla de rol
                const hasRoleAccess = await checkRoleTemplateAccess(userRole, actionId);
                
                if (!hasRoleAccess) {
                    await logAuditAttempt(req, userId, moduleId, action, 'access_denied', false, 'no_permission');
                    return res.status(403).json({ 
                        error: 'Acceso denegado', 
                        message: `No tienes permisos para ${action} en el módulo ${moduleId}`,
                        requiredPermission: actionId
                    });
                }
                
                // Crear permiso implícito basado en rol
                await createImplicitPermission(userId, moduleId, actionId);
            } else {
                const permission = permissions[0];
                if (!permission.hasAccess) {
                    await logAuditAttempt(req, userId, moduleId, action, 'access_denied', false, 'permission_revoked');
                    return res.status(403).json({ 
                        error: 'Acceso denegado', 
                        message: `Permiso revocado para ${permission.actionName} en ${permission.moduleName}`,
                        requiredPermission: actionId
                    });
                }
            }
            
            // Acceso concedido
            req.user = decoded;
            req.permission = { moduleId, action, actionId };
            
            await logAuditAttempt(req, userId, moduleId, action, 'access_granted', true, 'permission_granted');
            next();
            
        } catch (error) {
            console.error('Error verificando permisos:', error);
            await logAuditAttempt(req, req.user?.id, moduleId, action, 'access_error', false, 'system_error');
            res.status(500).json({ error: 'Error interno verificando permisos' });
        }
    };
};

// Verificar acceso por plantilla de rol
async function checkRoleTemplateAccess(userRole, actionId) {
    try {
        const roleTemplateMap = {
            'admin': 'super-admin',
            'supervisor': 'supervisor',
            'employee': 'employee',
            'medical': 'medical-doctor'
        };
        
        const templateId = roleTemplateMap[userRole];
        if (!templateId) return false;
        
        const [roleAccess] = await sequelize.query(`
            SELECT hasAccess 
            FROM role_template_permissions 
            WHERE roleTemplateId = ? AND actionId = ? AND hasAccess = 1
        `, { replacements: [templateId, actionId] });
        
        return roleAccess.length > 0;
        
    } catch (error) {
        console.error('Error verificando acceso por rol:', error);
        return false;
    }
}

// Crear permiso implícito basado en rol
async function createImplicitPermission(userId, moduleId, actionId) {
    try {
        await sequelize.query(`
            INSERT INTO user_permissions (userId, moduleId, actionId, hasAccess, grantedBy, notes)
            VALUES (?, ?, ?, 1, ?, 'Permiso implícito por rol')
            ON DUPLICATE KEY UPDATE hasAccess = 1, revokedAt = NULL
        `, { replacements: [userId, moduleId, actionId, userId] });
        
    } catch (error) {
        console.error('Error creando permiso implícito:', error);
    }
}

// Log detallado de auditoría
async function logAuditAttempt(req, userId, moduleId, action, auditAction, success = true, reason = '') {
    try {
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || '';
        const sessionId = req.sessionID || req.get('X-Session-ID') || '';
        
        await sequelize.query(`
            INSERT INTO audit_logs 
            (userId, action, moduleId, entityType, entityId, ipAddress, userAgent, sessionId, success, errorMessage, createdAt)
            VALUES (?, ?, ?, 'permission_check', ?, ?, ?, ?, ?, ?, NOW())
        `, { 
            replacements: [
                userId || 'anonymous',
                auditAction,
                moduleId,
                `${moduleId}:${action}`,
                ipAddress,
                userAgent,
                sessionId,
                success,
                reason
            ]
        });
        
    } catch (error) {
        console.error('Error logging audit:', error);
        // No fallar por errores de auditoría
    }
}

// Middleware para registrar cambios en entidades
const auditChanges = (entityType) => {
    return (req, res, next) => {
        // Guardar el método original de res.json
        const originalJson = res.json;
        
        res.json = function(data) {
            // Log después de la respuesta exitosa
            if (res.statusCode >= 200 && res.statusCode < 300) {
                setImmediate(() => {
                    logEntityChange(req, entityType, data);
                });
            }
            
            // Llamar al método original
            return originalJson.call(this, data);
        };
        
        next();
    };
};

// Log cambios en entidades
async function logEntityChange(req, entityType, responseData) {
    try {
        const userId = req.user?.id;
        if (!userId) return;
        
        const action = req.method.toLowerCase();
        const entityId = req.params.id || responseData?.id || responseData?.data?.id;
        const moduleId = req.permission?.moduleId || 'unknown';
        
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || '';
        const sessionId = req.sessionID || req.get('X-Session-ID') || '';
        
        // Capturar datos antes/después para ciertos métodos
        let oldValues = null;
        let newValues = null;
        
        if (action === 'put' || action === 'patch') {
            oldValues = req.originalData || null; // Se debe configurar en el controlador
            newValues = req.body;
        } else if (action === 'post') {
            newValues = req.body;
        } else if (action === 'delete') {
            oldValues = req.originalData || null;
        }
        
        await sequelize.query(`
            INSERT INTO audit_logs 
            (userId, action, moduleId, entityType, entityId, oldValues, newValues, ipAddress, userAgent, sessionId, success, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
        `, { 
            replacements: [
                userId,
                `${entityType}_${action}`,
                moduleId,
                entityType,
                entityId?.toString() || '',
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                ipAddress,
                userAgent,
                sessionId
            ]
        });
        
    } catch (error) {
        console.error('Error logging entity change:', error);
    }
}

// Middleware para obtener datos originales antes de modificar
const captureOriginalData = (entityModel, idParam = 'id') => {
    return async (req, res, next) => {
        try {
            if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
                const entityId = req.params[idParam];
                if (entityId && entityModel) {
                    const entity = await entityModel.findByPk(entityId);
                    if (entity) {
                        req.originalData = entity.dataValues;
                    }
                }
            }
            next();
        } catch (error) {
            console.error('Error capturing original data:', error);
            next();
        }
    };
};

// Verificar permisos múltiples
const checkMultiplePermissions = (permissions) => {
    return async (req, res, next) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({ error: 'Token de acceso requerido' });
            }
            
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = decoded.id;
            
            // Verificar si tiene al menos uno de los permisos requeridos
            for (const permission of permissions) {
                const { moduleId, action } = permission;
                const actionId = `${moduleId}:${action}`;
                
                const [userPermission] = await sequelize.query(`
                    SELECT hasAccess 
                    FROM user_permissions 
                    WHERE userId = ? AND actionId = ? AND hasAccess = 1 AND (revokedAt IS NULL OR revokedAt > NOW())
                `, { replacements: [userId, actionId] });
                
                if (userPermission.length > 0) {
                    req.user = decoded;
                    return next();
                }
                
                // Verificar por rol si no tiene permiso específico
                const hasRoleAccess = await checkRoleTemplateAccess(decoded.role, actionId);
                if (hasRoleAccess) {
                    req.user = decoded;
                    return next();
                }
            }
            
            return res.status(403).json({ 
                error: 'Acceso denegado',
                message: 'No tienes ninguno de los permisos requeridos',
                requiredPermissions: permissions
            });
            
        } catch (error) {
            console.error('Error verificando permisos múltiples:', error);
            res.status(500).json({ error: 'Error interno verificando permisos' });
        }
    };
};

module.exports = {
    checkPermission,
    auditChanges,
    captureOriginalData,
    checkMultiplePermissions
};