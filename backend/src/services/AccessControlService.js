/**
 * ACCESS CONTROL SERVICE v1.0
 * Servicio central para verificación de permisos RBAC
 *
 * @version 1.0
 * @date 2025-12-06
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class AccessControlService {

    /**
     * Verificar si un usuario puede acceder a un módulo con una acción específica
     *
     * @param {string} userId - UUID del usuario
     * @param {number} companyId - ID de la empresa
     * @param {string} moduleKey - Clave del módulo
     * @param {string} action - Acción: 'read', 'create', 'update', 'delete'
     * @returns {Object} { allowed, scope, reason }
     */
    static async checkAccess(userId, companyId, moduleKey, action = 'read') {
        try {
            // Usar función SQL optimizada
            const [result] = await sequelize.query(`
                SELECT * FROM check_user_access($1, $2, $3, $4)
            `, {
                bind: [userId, companyId, moduleKey, action],
                type: QueryTypes.SELECT
            });

            // Registrar en log de auditoría
            await this.logAccess(userId, companyId, moduleKey, action, result.allowed, result.reason);

            return {
                allowed: result.allowed,
                scope: result.scope,
                reason: result.reason
            };

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error checking access:', error);
            // Fail-safe: denegar acceso en caso de error
            return {
                allowed: false,
                scope: null,
                reason: 'error_checking_permissions'
            };
        }
    }

    /**
     * Obtener todos los permisos efectivos de un usuario
     *
     * @param {string} userId - UUID del usuario
     * @param {number} companyId - ID de la empresa
     */
    static async getUserPermissions(userId, companyId) {
        try {
            const [result] = await sequelize.query(`
                SELECT get_user_effective_permissions($1, $2) as permissions
            `, {
                bind: [userId, companyId],
                type: QueryTypes.SELECT
            });

            return result?.permissions || {};

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error getting permissions:', error);
            return {};
        }
    }

    /**
     * Obtener módulos accesibles para un usuario
     *
     * @param {string} userId - UUID del usuario
     * @param {number} companyId - ID de la empresa
     */
    static async getAccessibleModules(userId, companyId) {
        try {
            const permissions = await this.getUserPermissions(userId, companyId);
            const moduleKeys = Object.keys(permissions);

            // Si tiene wildcard, obtener todos los módulos
            if (moduleKeys.includes('*')) {
                const [allModules] = await sequelize.query(`
                    SELECT module_key, module_name, category, icon, description
                    FROM module_definitions
                    WHERE is_active = true
                    ORDER BY sort_order
                `, { type: QueryTypes.SELECT });

                return allModules;
            }

            // Obtener detalles de módulos permitidos
            if (moduleKeys.length === 0) {
                return [];
            }

            const modules = await sequelize.query(`
                SELECT module_key, module_name, category, icon, description
                FROM module_definitions
                WHERE module_key = ANY($1)
                  AND is_active = true
                ORDER BY sort_order
            `, {
                bind: [moduleKeys],
                type: QueryTypes.SELECT
            });

            return modules;

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error getting accessible modules:', error);
            return [];
        }
    }

    /**
     * Verificar dependencias de un módulo antes de CRUD
     *
     * @param {string} moduleKey - Clave del módulo
     * @param {number} companyId - ID de la empresa
     */
    static async checkModuleDependencies(moduleKey, companyId) {
        try {
            const [result] = await sequelize.query(`
                SELECT * FROM check_module_dependencies($1, $2)
            `, {
                bind: [moduleKey, companyId],
                type: QueryTypes.SELECT
            });

            return {
                isReady: result.is_ready,
                missingDependencies: result.missing_dependencies || [],
                warnings: result.warnings || []
            };

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error checking dependencies:', error);
            return {
                isReady: true, // Fail-open para no bloquear
                missingDependencies: [],
                warnings: [{ type: 'error', message: 'No se pudieron verificar las dependencias' }]
            };
        }
    }

    /**
     * Obtener roles de un usuario
     *
     * @param {string} userId - UUID del usuario
     */
    static async getUserRoles(userId) {
        try {
            const roles = await sequelize.query(`
                SELECT rd.*, ura.scope_override, ura.is_primary
                FROM user_role_assignments ura
                JOIN role_definitions rd ON rd.id = ura.role_id
                WHERE ura.user_id = $1
                  AND ura.is_active = true
                  AND (ura.valid_from IS NULL OR ura.valid_from <= CURRENT_DATE)
                  AND (ura.valid_until IS NULL OR ura.valid_until >= CURRENT_DATE)
                ORDER BY rd.priority DESC
            `, {
                bind: [userId],
                type: QueryTypes.SELECT
            });

            return roles;

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error getting user roles:', error);
            return [];
        }
    }

    /**
     * Asignar rol a usuario
     *
     * @param {string} userId - UUID del usuario
     * @param {number} roleId - ID del rol
     * @param {Object} options - Opciones adicionales
     */
    static async assignRole(userId, roleId, options = {}) {
        try {
            const {
                scopeOverride = null,
                validFrom = null,
                validUntil = null,
                isPrimary = false,
                assignedBy = null
            } = options;

            // Si es primario, quitar primario de otros roles
            if (isPrimary) {
                await sequelize.query(`
                    UPDATE user_role_assignments
                    SET is_primary = false
                    WHERE user_id = $1
                `, { bind: [userId] });
            }

            const [result] = await sequelize.query(`
                INSERT INTO user_role_assignments (
                    user_id, role_id, scope_override, valid_from, valid_until,
                    is_primary, assigned_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (user_id, role_id) DO UPDATE SET
                    scope_override = EXCLUDED.scope_override,
                    valid_from = EXCLUDED.valid_from,
                    valid_until = EXCLUDED.valid_until,
                    is_primary = EXCLUDED.is_primary,
                    is_active = true,
                    deactivated_at = NULL
                RETURNING *
            `, {
                bind: [
                    userId,
                    roleId,
                    scopeOverride ? JSON.stringify(scopeOverride) : null,
                    validFrom,
                    validUntil,
                    isPrimary,
                    assignedBy
                ],
                type: QueryTypes.INSERT
            });

            return { success: true, assignment: result[0] };

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error assigning role:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Revocar rol de usuario
     *
     * @param {string} userId - UUID del usuario
     * @param {number} roleId - ID del rol
     * @param {string} revokedBy - UUID del usuario que revoca
     * @param {string} reason - Motivo de revocación
     */
    static async revokeRole(userId, roleId, revokedBy = null, reason = null) {
        try {
            await sequelize.query(`
                UPDATE user_role_assignments
                SET is_active = false,
                    deactivated_at = NOW(),
                    deactivated_by = $3,
                    deactivation_reason = $4
                WHERE user_id = $1 AND role_id = $2
            `, {
                bind: [userId, roleId, revokedBy, reason]
            });

            return { success: true };

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error revoking role:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener todos los roles (sistema + empresa)
     *
     * @param {number} companyId - ID de la empresa (null = solo sistema)
     */
    static async getAllRoles(companyId = null) {
        try {
            const roles = await sequelize.query(`
                SELECT *
                FROM role_definitions
                WHERE (company_id IS NULL OR company_id = $1)
                  AND is_active = true
                ORDER BY priority DESC, role_name
            `, {
                bind: [companyId],
                type: QueryTypes.SELECT
            });

            return roles;

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error getting roles:', error);
            return [];
        }
    }

    /**
     * Crear rol personalizado para empresa
     *
     * @param {number} companyId - ID de la empresa
     * @param {Object} roleData - Datos del rol
     */
    static async createRole(companyId, roleData) {
        try {
            const {
                roleKey,
                roleName,
                description,
                modulePermissions,
                specialPermissions = {},
                color = '#6c757d',
                icon = 'fa-user',
                createdBy = null
            } = roleData;

            const [result] = await sequelize.query(`
                INSERT INTO role_definitions (
                    company_id, role_key, role_name, description,
                    module_permissions, special_permissions,
                    category, color, icon, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, 'custom', $7, $8, $9)
                RETURNING *
            `, {
                bind: [
                    companyId,
                    roleKey,
                    roleName,
                    description,
                    JSON.stringify(modulePermissions),
                    JSON.stringify(specialPermissions),
                    color,
                    icon,
                    createdBy
                ],
                type: QueryTypes.INSERT
            });

            return { success: true, role: result[0] };

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error creating role:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Actualizar rol
     *
     * @param {number} roleId - ID del rol
     * @param {Object} roleData - Datos a actualizar
     */
    static async updateRole(roleId, roleData) {
        try {
            // Verificar que no sea rol de sistema
            const [role] = await sequelize.query(`
                SELECT is_system_role FROM role_definitions WHERE id = $1
            `, { bind: [roleId], type: QueryTypes.SELECT });

            if (role?.is_system_role) {
                return { success: false, error: 'No se pueden modificar roles del sistema' };
            }

            const updateFields = [];
            const values = [];
            let paramIndex = 1;

            const allowedFields = ['role_name', 'description', 'module_permissions', 'special_permissions', 'color', 'icon'];

            for (const field of allowedFields) {
                const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                if (roleData[camelField] !== undefined) {
                    updateFields.push(`${field} = $${paramIndex}`);
                    values.push(
                        field.includes('permissions')
                            ? JSON.stringify(roleData[camelField])
                            : roleData[camelField]
                    );
                    paramIndex++;
                }
            }

            if (updateFields.length === 0) {
                return { success: false, error: 'No hay campos para actualizar' };
            }

            values.push(roleId);

            await sequelize.query(`
                UPDATE role_definitions
                SET ${updateFields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramIndex}
            `, { bind: values });

            return { success: true };

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error updating role:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Eliminar rol personalizado
     *
     * @param {number} roleId - ID del rol
     */
    static async deleteRole(roleId) {
        try {
            // Verificar que no sea rol de sistema
            const [role] = await sequelize.query(`
                SELECT is_system_role FROM role_definitions WHERE id = $1
            `, { bind: [roleId], type: QueryTypes.SELECT });

            if (role?.is_system_role) {
                return { success: false, error: 'No se pueden eliminar roles del sistema' };
            }

            // Verificar que no tenga usuarios asignados
            const [assignments] = await sequelize.query(`
                SELECT COUNT(*) as count FROM user_role_assignments
                WHERE role_id = $1 AND is_active = true
            `, { bind: [roleId], type: QueryTypes.SELECT });

            if (parseInt(assignments.count) > 0) {
                return { success: false, error: 'El rol tiene usuarios asignados. Revoca las asignaciones primero.' };
            }

            // Soft delete
            await sequelize.query(`
                UPDATE role_definitions
                SET is_active = false, updated_at = NOW()
                WHERE id = $1
            `, { bind: [roleId] });

            return { success: true };

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error deleting role:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener empleados visibles para un asociado
     *
     * @param {string} associateUserId - UUID del usuario asociado
     * @param {number} companyId - ID de la empresa
     */
    static async getAssociateVisibleEmployees(associateUserId, companyId) {
        try {
            const employees = await sequelize.query(`
                SELECT * FROM get_associate_visible_employees($1, $2)
            `, {
                bind: [associateUserId, companyId],
                type: QueryTypes.SELECT
            });

            return employees.map(e => e.employee_id);

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error getting visible employees:', error);
            return [];
        }
    }

    /**
     * Verificar si usuario puede ver un empleado específico
     *
     * @param {string} userId - UUID del usuario que consulta
     * @param {number} companyId - ID de la empresa
     * @param {string} targetEmployeeId - UUID del empleado objetivo
     */
    static async canViewEmployee(userId, companyId, targetEmployeeId) {
        try {
            // Verificar acceso al módulo users
            const access = await this.checkAccess(userId, companyId, 'users', 'read');

            if (!access.allowed) {
                return false;
            }

            // Según el scope
            switch (access.scope) {
                case 'all':
                    return true;

                case 'own':
                    return userId === targetEmployeeId;

                case 'own_branch':
                    const [branchCheck] = await sequelize.query(`
                        SELECT 1 FROM users u1
                        JOIN users u2 ON u2.branch_id = u1.branch_id
                        WHERE u1.user_id = $1 AND u2.user_id = $2
                    `, { bind: [userId, targetEmployeeId], type: QueryTypes.SELECT });
                    return !!branchCheck;

                case 'own_department':
                    const [deptCheck] = await sequelize.query(`
                        SELECT 1 FROM users u1
                        JOIN users u2 ON u2.department_id = u1.department_id
                        WHERE u1.user_id = $1 AND u2.user_id = $2
                    `, { bind: [userId, targetEmployeeId], type: QueryTypes.SELECT });
                    return !!deptCheck;

                case 'assigned_only':
                    const visibleEmployees = await this.getAssociateVisibleEmployees(userId, companyId);
                    return visibleEmployees.includes(targetEmployeeId);

                default:
                    return false;
            }

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error checking employee visibility:', error);
            return false;
        }
    }

    /**
     * Registrar acceso en log de auditoría
     * @private
     */
    static async logAccess(userId, companyId, moduleKey, action, wasAllowed, reason, metadata = {}) {
        try {
            await sequelize.query(`
                INSERT INTO access_audit_log (
                    user_id, company_id, action, module_key, requested_action,
                    was_allowed, denial_reason, metadata
                ) VALUES ($1, $2, 'permission_check', $3, $4, $5, $6, $7)
            `, {
                bind: [
                    userId,
                    companyId,
                    moduleKey,
                    action,
                    wasAllowed,
                    wasAllowed ? null : reason,
                    JSON.stringify(metadata)
                ]
            });
        } catch (error) {
            // No fallar por error de log
            console.error('[ACCESS-CONTROL] Error logging access:', error);
        }
    }

    /**
     * Obtener ayuda contextual para un módulo/pantalla
     *
     * @param {string} moduleKey - Clave del módulo
     * @param {string} screenKey - Clave de la pantalla (opcional)
     */
    static async getContextualHelp(moduleKey, screenKey = 'main') {
        try {
            // Obtener ayuda del módulo
            const [module] = await sequelize.query(`
                SELECT help_title, help_description, help_getting_started, help_common_tasks
                FROM module_definitions
                WHERE module_key = $1
            `, { bind: [moduleKey], type: QueryTypes.SELECT });

            // Obtener tooltips y burbujas
            const tooltips = await sequelize.query(`
                SELECT *
                FROM contextual_help
                WHERE module_key = $1
                  AND (screen_key = $2 OR screen_key IS NULL)
                  AND is_active = true
                ORDER BY priority DESC
            `, {
                bind: [moduleKey, screenKey],
                type: QueryTypes.SELECT
            });

            return {
                module: module || {},
                tooltips: tooltips,
                hasHelp: !!module?.help_title || tooltips.length > 0
            };

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error getting contextual help:', error);
            return { module: {}, tooltips: [], hasHelp: false };
        }
    }

    /**
     * Obtener matriz de permisos para UI de administración
     *
     * @param {number} companyId - ID de la empresa
     */
    static async getPermissionsMatrix(companyId) {
        try {
            // Obtener módulos
            const modules = await sequelize.query(`
                SELECT module_key, module_name, category, available_actions
                FROM module_definitions
                WHERE is_active = true
                ORDER BY category, sort_order
            `, { type: QueryTypes.SELECT });

            // Obtener roles
            const roles = await sequelize.query(`
                SELECT id, role_key, role_name, module_permissions, is_system_role, color
                FROM role_definitions
                WHERE (company_id IS NULL OR company_id = $1)
                  AND is_active = true
                ORDER BY priority DESC
            `, { bind: [companyId], type: QueryTypes.SELECT });

            // Construir matriz
            const matrix = {};

            for (const module of modules) {
                matrix[module.module_key] = {
                    name: module.module_name,
                    category: module.category,
                    availableActions: module.available_actions,
                    roles: {}
                };

                for (const role of roles) {
                    const permissions = role.module_permissions || {};
                    const modulePerms = permissions[module.module_key] || permissions['*'];

                    matrix[module.module_key].roles[role.role_key] = {
                        actions: modulePerms?.actions || [],
                        scope: modulePerms?.scope || null,
                        isSystemRole: role.is_system_role
                    };
                }
            }

            return {
                modules,
                roles,
                matrix
            };

        } catch (error) {
            console.error('[ACCESS-CONTROL] Error getting permissions matrix:', error);
            return { modules: [], roles: [], matrix: {} };
        }
    }
}

module.exports = AccessControlService;
