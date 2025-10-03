const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { checkPermission, auditChanges } = require('../middleware/permissions');

/**
 * @route GET /api/v1/permissions/modules
 * @desc Obtener todos los módulos del sistema
 */
router.get('/modules', checkPermission('admin-permissions', 'view'), async (req, res) => {
    try {
        const [modules] = await sequelize.query(`
            SELECT 
                sm.*,
                COUNT(ma.id) as totalActions,
                COUNT(CASE WHEN ma.isActive = 1 THEN 1 END) as activeActions
            FROM system_modules sm
            LEFT JOIN module_actions ma ON sm.id = ma.moduleId
            WHERE sm.isActive = 1
            GROUP BY sm.id
            ORDER BY sm.category, sm.name
        `);
        
        res.json({
            success: true,
            data: modules
        });
        
    } catch (error) {
        console.error('Error obteniendo módulos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * @route GET /api/v1/permissions/modules/:moduleId/actions
 * @desc Obtener acciones disponibles para un módulo
 */
router.get('/modules/:moduleId/actions', checkPermission('admin-permissions', 'view'), async (req, res) => {
    try {
        const { moduleId } = req.params;
        
        const [actions] = await sequelize.query(`
            SELECT ma.*, sm.name as moduleName
            FROM module_actions ma
            JOIN system_modules sm ON ma.moduleId = sm.id
            WHERE ma.moduleId = ? AND ma.isActive = 1
            ORDER BY ma.action
        `, { replacements: [moduleId] });
        
        res.json({
            success: true,
            data: actions
        });
        
    } catch (error) {
        console.error('Error obteniendo acciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * @route GET /api/v1/permissions/users/:userId
 * @desc Obtener permisos de un usuario específico
 */
router.get('/users/:userId', checkPermission('admin-permissions', 'view'), async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Obtener información del usuario
        const [users] = await sequelize.query(`
            SELECT id, employeeId, firstName, lastName, email, role, isActive
            FROM users 
            WHERE id = ?
        `, { replacements: [userId] });
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        const user = users[0];
        
        // Obtener permisos específicos del usuario
        const [userPermissions] = await sequelize.query(`
            SELECT 
                up.*,
                sm.name as moduleName,
                sm.category as moduleCategory,
                sm.icon as moduleIcon,
                ma.name as actionName,
                ma.action as actionCode,
                CONCAT(u1.firstName, ' ', u1.lastName) as grantedByName
            FROM user_permissions up
            JOIN system_modules sm ON up.moduleId = sm.id
            JOIN module_actions ma ON up.actionId = ma.id
            LEFT JOIN users u1 ON up.grantedBy = u1.id
            WHERE up.userId = ?
            ORDER BY sm.category, sm.name, ma.action
        `, { replacements: [userId] });
        
        // Obtener permisos de plantilla de rol
        const roleTemplateMap = {
            'admin': 'super-admin',
            'supervisor': 'supervisor', 
            'employee': 'employee',
            'medical': 'medical-doctor'
        };
        
        const templateId = roleTemplateMap[user.role];
        let rolePermissions = [];
        
        if (templateId) {
            const [templatePermissions] = await sequelize.query(`
                SELECT 
                    rtp.*,
                    sm.name as moduleName,
                    sm.category as moduleCategory,
                    sm.icon as moduleIcon,
                    ma.name as actionName,
                    ma.action as actionCode,
                    rt.name as roleName
                FROM role_template_permissions rtp
                JOIN system_modules sm ON rtp.moduleId = sm.id
                JOIN module_actions ma ON rtp.actionId = ma.id
                JOIN role_templates rt ON rtp.roleTemplateId = rt.id
                WHERE rtp.roleTemplateId = ? AND rtp.hasAccess = 1
                ORDER BY sm.category, sm.name, ma.action
            `, { replacements: [templateId] });
            
            rolePermissions = templatePermissions;
        }
        
        res.json({
            success: true,
            data: {
                user,
                userPermissions,
                rolePermissions,
                roleTemplate: templateId
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo permisos de usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * @route POST /api/v1/permissions/users/:userId/grant
 * @desc Otorgar permisos a un usuario
 */
router.post('/users/:userId/grant', 
    checkPermission('admin-permissions', 'assign-permissions'),
    auditChanges('user_permission'),
    async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions, notes } = req.body;
        const grantedBy = req.user.user_id;
        
        if (!Array.isArray(permissions) || permissions.length === 0) {
            return res.status(400).json({ error: 'Se requiere un array de permisos' });
        }
        
        const results = [];
        
        for (const permission of permissions) {
            const { moduleId, actionId } = permission;
            
            if (!moduleId || !actionId) {
                results.push({
                    moduleId,
                    actionId,
                    success: false,
                    error: 'moduleId y actionId son requeridos'
                });
                continue;
            }
            
            try {
                await sequelize.query(`
                    INSERT INTO user_permissions (userId, moduleId, actionId, hasAccess, grantedBy, notes)
                    VALUES (?, ?, ?, 1, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        hasAccess = 1,
                        grantedBy = ?,
                        grantedAt = NOW(),
                        revokedAt = NULL,
                        notes = ?
                `, { replacements: [userId, moduleId, actionId, grantedBy, notes || '', grantedBy, notes || ''] });
                
                results.push({
                    moduleId,
                    actionId,
                    success: true
                });
                
            } catch (error) {
                results.push({
                    moduleId,
                    actionId,
                    success: false,
                    error: error.message
                });
            }
        }
        
        res.json({
            success: true,
            message: 'Permisos procesados',
            data: results
        });
        
    } catch (error) {
        console.error('Error otorgando permisos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * @route POST /api/v1/permissions/users/:userId/revoke
 * @desc Revocar permisos de un usuario
 */
router.post('/users/:userId/revoke',
    checkPermission('admin-permissions', 'assign-permissions'),
    auditChanges('user_permission'),
    async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions, notes } = req.body;
        const revokedBy = req.user.user_id;
        
        if (!Array.isArray(permissions) || permissions.length === 0) {
            return res.status(400).json({ error: 'Se requiere un array de permisos' });
        }
        
        const results = [];
        
        for (const permission of permissions) {
            const { actionId } = permission;
            
            if (!actionId) {
                results.push({
                    actionId,
                    success: false,
                    error: 'actionId es requerido'
                });
                continue;
            }
            
            try {
                await sequelize.query(`
                    UPDATE user_permissions 
                    SET hasAccess = 0, revokedAt = NOW(), notes = CONCAT(COALESCE(notes, ''), ' | Revocado: ', ?)
                    WHERE userId = ? AND actionId = ?
                `, { replacements: [notes || 'Sin motivo especificado', userId, actionId] });
                
                results.push({
                    actionId,
                    success: true
                });
                
            } catch (error) {
                results.push({
                    actionId,
                    success: false,
                    error: error.message
                });
            }
        }
        
        res.json({
            success: true,
            message: 'Permisos revocados',
            data: results
        });
        
    } catch (error) {
        console.error('Error revocando permisos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * @route GET /api/v1/permissions/role-templates
 * @desc Obtener plantillas de roles disponibles
 */
router.get('/role-templates', checkPermission('admin-permissions', 'view'), async (req, res) => {
    try {
        const [templates] = await sequelize.query(`
            SELECT 
                rt.*,
                COUNT(rtp.id) as totalPermissions,
                COUNT(CASE WHEN rtp.hasAccess = 1 THEN 1 END) as activePermissions
            FROM role_templates rt
            LEFT JOIN role_template_permissions rtp ON rt.id = rtp.roleTemplateId
            GROUP BY rt.id
            ORDER BY rt.category, rt.name
        `);
        
        res.json({
            success: true,
            data: templates
        });
        
    } catch (error) {
        console.error('Error obteniendo plantillas de roles:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * @route POST /api/v1/permissions/users/:userId/apply-role-template
 * @desc Aplicar plantilla de rol a un usuario
 */
router.post('/users/:userId/apply-role-template',
    checkPermission('admin-permissions', 'assign-permissions'),
    auditChanges('user_permission'),
    async (req, res) => {
    try {
        const { userId } = req.params;
        const { roleTemplateId, replaceExisting } = req.body;
        const grantedBy = req.user.user_id;
        
        if (!roleTemplateId) {
            return res.status(400).json({ error: 'roleTemplateId es requerido' });
        }
        
        // Verificar que la plantilla existe
        const [templates] = await sequelize.query(`
            SELECT id, name FROM role_templates WHERE id = ?
        `, { replacements: [roleTemplateId] });
        
        if (templates.length === 0) {
            return res.status(404).json({ error: 'Plantilla de rol no encontrada' });
        }
        
        const template = templates[0];
        
        // Si replaceExisting, limpiar permisos existentes
        if (replaceExisting) {
            await sequelize.query(`
                UPDATE user_permissions 
                SET hasAccess = 0, revokedAt = NOW(), notes = CONCAT(COALESCE(notes, ''), ' | Reemplazado por plantilla: ', ?)
                WHERE userId = ?
            `, { replacements: [template.name, userId] });
        }
        
        // Obtener permisos de la plantilla
        const [templatePermissions] = await sequelize.query(`
            SELECT moduleId, actionId
            FROM role_template_permissions
            WHERE roleTemplateId = ? AND hasAccess = 1
        `, { replacements: [roleTemplateId] });
        
        // Aplicar permisos de la plantilla
        let applied = 0;
        for (const permission of templatePermissions) {
            try {
                await sequelize.query(`
                    INSERT INTO user_permissions (userId, moduleId, actionId, hasAccess, grantedBy, notes)
                    VALUES (?, ?, ?, 1, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        hasAccess = 1,
                        grantedBy = ?,
                        grantedAt = NOW(),
                        revokedAt = NULL,
                        notes = ?
                `, { 
                    replacements: [
                        userId, 
                        permission.moduleId, 
                        permission.actionId, 
                        grantedBy, 
                        `Aplicado desde plantilla: ${template.name}`,
                        grantedBy,
                        `Aplicado desde plantilla: ${template.name}`
                    ] 
                });
                applied++;
            } catch (error) {
                console.error(`Error aplicando permiso ${permission.actionId}:`, error);
            }
        }
        
        res.json({
            success: true,
            message: `Plantilla de rol "${template.name}" aplicada exitosamente`,
            data: {
                templateName: template.name,
                permissionsApplied: applied,
                totalTemplatePermissions: templatePermissions.length
            }
        });
        
    } catch (error) {
        console.error('Error aplicando plantilla de rol:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * @route GET /api/v1/permissions/audit
 * @desc Obtener logs de auditoría de permisos
 */
router.get('/audit', checkPermission('admin-audit', 'view'), async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            userId, 
            action, 
            moduleId,
            startDate,
            endDate 
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE 1=1';
        const replacements = [];
        
        if (userId) {
            whereClause += ' AND al.userId = ?';
            replacements.push(userId);
        }
        
        if (action) {
            whereClause += ' AND al.action LIKE ?';
            replacements.push(`%${action}%`);
        }
        
        if (moduleId) {
            whereClause += ' AND al.moduleId = ?';
            replacements.push(moduleId);
        }
        
        if (startDate) {
            whereClause += ' AND al.createdAt >= ?';
            replacements.push(startDate);
        }
        
        if (endDate) {
            whereClause += ' AND al.createdAt <= ?';
            replacements.push(endDate);
        }
        
        const [logs] = await sequelize.query(`
            SELECT 
                al.*,
                CONCAT(u.firstName, ' ', u.lastName) as userName,
                u.employeeId,
                sm.name as moduleName
            FROM audit_logs al
            LEFT JOIN users u ON al.userId = u.id
            LEFT JOIN system_modules sm ON al.moduleId = sm.id
            ${whereClause}
            ORDER BY al.createdAt DESC
            LIMIT ? OFFSET ?
        `, { replacements: [...replacements, parseInt(limit), offset] });
        
        // Obtener total para paginación
        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) as total
            FROM audit_logs al
            ${whereClause}
        `, { replacements });
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo logs de auditoría:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;