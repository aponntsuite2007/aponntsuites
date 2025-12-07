/**
 * ACCESS CONTROL ROUTES v1.0
 * API para gestión de roles, permisos y control de acceso
 *
 * @version 1.0
 * @date 2025-12-06
 */

const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const AccessControlService = require('../services/AccessControlService');

// =====================================================
// VERIFICACIÓN DE ACCESO
// =====================================================

/**
 * @route POST /api/v1/access-control/check
 * @desc Verificar si usuario tiene acceso a módulo/acción
 */
router.post('/check', auth, async (req, res) => {
    try {
        const { moduleKey, action = 'read' } = req.body;
        const userId = req.user.user_id;
        const companyId = req.user.company_id;

        const result = await AccessControlService.checkAccess(userId, companyId, moduleKey, action);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error checking access:', error);
        res.status(500).json({ error: 'Error verificando acceso' });
    }
});

/**
 * @route GET /api/v1/access-control/my-permissions
 * @desc Obtener permisos del usuario actual
 */
router.get('/my-permissions', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;

        const permissions = await AccessControlService.getUserPermissions(userId, companyId);
        const modules = await AccessControlService.getAccessibleModules(userId, companyId);
        const roles = await AccessControlService.getUserRoles(userId);

        res.json({
            success: true,
            permissions,
            accessibleModules: modules,
            roles
        });

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error getting permissions:', error);
        res.status(500).json({ error: 'Error obteniendo permisos' });
    }
});

/**
 * @route GET /api/v1/access-control/can-view-employee/:employeeId
 * @desc Verificar si puede ver un empleado específico
 */
router.get('/can-view-employee/:employeeId', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const userId = req.user.user_id;
        const companyId = req.user.company_id;

        const canView = await AccessControlService.canViewEmployee(userId, companyId, employeeId);

        res.json({
            success: true,
            canView
        });

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error checking employee visibility:', error);
        res.status(500).json({ error: 'Error verificando visibilidad' });
    }
});

// =====================================================
// GESTIÓN DE ROLES
// =====================================================

/**
 * @route GET /api/v1/access-control/roles
 * @desc Obtener todos los roles disponibles
 */
router.get('/roles', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const roles = await AccessControlService.getAllRoles(companyId);

        res.json({
            success: true,
            roles
        });

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error getting roles:', error);
        res.status(500).json({ error: 'Error obteniendo roles' });
    }
});

/**
 * @route POST /api/v1/access-control/roles
 * @desc Crear nuevo rol personalizado
 */
router.post('/roles', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const createdBy = req.user.user_id;

        const result = await AccessControlService.createRole(companyId, {
            ...req.body,
            createdBy
        });

        if (result.success) {
            res.json({ success: true, role: result.role });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error creating role:', error);
        res.status(500).json({ error: 'Error creando rol' });
    }
});

/**
 * @route PUT /api/v1/access-control/roles/:roleId
 * @desc Actualizar rol
 */
router.put('/roles/:roleId', auth, adminOnly, async (req, res) => {
    try {
        const { roleId } = req.params;

        const result = await AccessControlService.updateRole(parseInt(roleId), req.body);

        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error updating role:', error);
        res.status(500).json({ error: 'Error actualizando rol' });
    }
});

/**
 * @route DELETE /api/v1/access-control/roles/:roleId
 * @desc Eliminar rol personalizado
 */
router.delete('/roles/:roleId', auth, adminOnly, async (req, res) => {
    try {
        const { roleId } = req.params;

        const result = await AccessControlService.deleteRole(parseInt(roleId));

        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error deleting role:', error);
        res.status(500).json({ error: 'Error eliminando rol' });
    }
});

// =====================================================
// ASIGNACIÓN DE ROLES A USUARIOS
// =====================================================

/**
 * @route GET /api/v1/access-control/users/:userId/roles
 * @desc Obtener roles de un usuario
 */
router.get('/users/:userId/roles', auth, async (req, res) => {
    try {
        const { userId } = req.params;

        const roles = await AccessControlService.getUserRoles(userId);

        res.json({
            success: true,
            roles
        });

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error getting user roles:', error);
        res.status(500).json({ error: 'Error obteniendo roles del usuario' });
    }
});

/**
 * @route POST /api/v1/access-control/users/:userId/roles
 * @desc Asignar rol a usuario
 */
router.post('/users/:userId/roles', auth, adminOnly, async (req, res) => {
    try {
        const { userId } = req.params;
        const { roleId, scopeOverride, validFrom, validUntil, isPrimary } = req.body;
        const assignedBy = req.user.user_id;

        const result = await AccessControlService.assignRole(userId, roleId, {
            scopeOverride,
            validFrom,
            validUntil,
            isPrimary,
            assignedBy
        });

        if (result.success) {
            res.json({ success: true, assignment: result.assignment });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error assigning role:', error);
        res.status(500).json({ error: 'Error asignando rol' });
    }
});

/**
 * @route DELETE /api/v1/access-control/users/:userId/roles/:roleId
 * @desc Revocar rol de usuario
 */
router.delete('/users/:userId/roles/:roleId', auth, adminOnly, async (req, res) => {
    try {
        const { userId, roleId } = req.params;
        const { reason } = req.body;
        const revokedBy = req.user.user_id;

        const result = await AccessControlService.revokeRole(userId, parseInt(roleId), revokedBy, reason);

        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error revoking role:', error);
        res.status(500).json({ error: 'Error revocando rol' });
    }
});

// =====================================================
// MATRIZ DE PERMISOS
// =====================================================

/**
 * @route GET /api/v1/access-control/permissions-matrix
 * @desc Obtener matriz de permisos para UI de administración
 */
router.get('/permissions-matrix', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const matrix = await AccessControlService.getPermissionsMatrix(companyId);

        res.json({
            success: true,
            ...matrix
        });

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error getting permissions matrix:', error);
        res.status(500).json({ error: 'Error obteniendo matriz de permisos' });
    }
});

/**
 * @route GET /api/v1/access-control/modules
 * @desc Obtener catálogo de módulos del sistema
 */
router.get('/modules', auth, async (req, res) => {
    try {
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        const modules = await sequelize.query(`
            SELECT module_key, module_name, description, category, icon,
                   available_actions, available_scopes, is_premium
            FROM module_definitions
            WHERE is_active = true
            ORDER BY category, sort_order
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            modules
        });

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error getting modules:', error);
        res.status(500).json({ error: 'Error obteniendo módulos' });
    }
});

// =====================================================
// VERIFICACIÓN DE DEPENDENCIAS
// =====================================================

/**
 * @route GET /api/v1/access-control/check-dependencies/:moduleKey
 * @desc Verificar si el módulo tiene todas las dependencias
 */
router.get('/check-dependencies/:moduleKey', auth, async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const companyId = req.user.company_id;

        const result = await AccessControlService.checkModuleDependencies(moduleKey, companyId);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('[ACCESS-CONTROL] Error checking dependencies:', error);
        res.status(500).json({ error: 'Error verificando dependencias' });
    }
});

module.exports = router;
