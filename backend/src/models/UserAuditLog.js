/**
 * ============================================================================
 * MODELO: UserAuditLog - Historial de Cambios de Usuarios
 * ============================================================================
 *
 * Registra TODOS los cambios realizados en datos de usuarios:
 * - Quién hizo el cambio (changed_by_user_id)
 * - Cuándo (created_at)
 * - Qué campo cambió (field_name)
 * - Valor anterior y nuevo (old_value, new_value)
 * - Tipo de acción (CREATE, UPDATE, DELETE, etc.)
 *
 * @version 1.0.0
 * @date 2025-01-25
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserAuditLog = sequelize.define('UserAuditLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // Usuario que fue modificado (UUID porque users.user_id es UUID)
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: 'ID del usuario que fue modificado (UUID)'
        },

        // Usuario que realizó el cambio (NULL = sistema)
        changed_by_user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'ID del usuario que realizó el cambio (NULL = sistema)'
        },

        // Empresa (multi-tenant)
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'ID de la empresa'
        },

        // Tipo de acción
        action: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [[
                    'CREATE',
                    'UPDATE',
                    'DELETE',
                    'ACTIVATE',
                    'DEACTIVATE',
                    'PASSWORD_RESET',
                    'ROLE_CHANGE',
                    'DEPARTMENT_CHANGE',
                    'SHIFT_ASSIGN',
                    'SHIFT_REMOVE',
                    'BRANCH_CHANGE',
                    'LOGIN',
                    'LOGOUT',
                    'LOGIN_FAILED',
                    'BIOMETRIC_REGISTER',
                    'CONSENT_GIVEN',
                    'CONSENT_REVOKED',
                    'GPS_CONFIG_CHANGE',
                    'PROFILE_UPDATE',
                    'BULK_UPDATE'
                ]]
            },
            comment: 'Tipo de acción realizada'
        },

        // Campo específico que cambió
        field_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Nombre del campo que fue modificado'
        },

        // Valores antes y después
        old_value: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Valor anterior del campo'
        },

        new_value: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Nuevo valor del campo'
        },

        // Descripción legible
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Descripción legible del cambio'
        },

        // Metadata adicional (JSON)
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
            comment: 'Información adicional en formato JSON'
        },

        // IP y user agent
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: 'IP desde donde se realizó el cambio'
        },

        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User agent del navegador'
        }
    }, {
        tableName: 'user_audit_logs',
        timestamps: true,
        updatedAt: false, // Solo createdAt, los logs no se actualizan
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['company_id'] },
            { fields: ['changed_by_user_id'] },
            { fields: ['action'] },
            { fields: ['created_at'] },
            { fields: ['field_name'] },
            {
                fields: ['user_id', 'created_at'],
                name: 'idx_user_audit_logs_user_date'
            }
        ],
        comment: 'Registro de auditoría de todos los cambios en usuarios'
    });

    // Asociaciones
    UserAuditLog.associate = (models) => {
        // Usuario que fue modificado
        UserAuditLog.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'targetUser'
        });

        // Usuario que hizo el cambio
        UserAuditLog.belongsTo(models.User, {
            foreignKey: 'changed_by_user_id',
            as: 'changedByUser'
        });

        // Empresa
        UserAuditLog.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
    };

    // =========================================================================
    // MÉTODOS ESTÁTICOS - Helper functions
    // =========================================================================

    /**
     * Registrar un cambio en usuario
     */
    UserAuditLog.logChange = async function(params) {
        const {
            userId,
            changedByUserId,
            companyId,
            action,
            fieldName = null,
            oldValue = null,
            newValue = null,
            description = null,
            metadata = {},
            ipAddress = null,
            userAgent = null
        } = params;

        // Generar descripción automática si no se provee
        let autoDescription = description;
        if (!autoDescription) {
            autoDescription = UserAuditLog.generateDescription(action, fieldName, oldValue, newValue);
        }

        return await UserAuditLog.create({
            user_id: userId,
            changed_by_user_id: changedByUserId,
            company_id: companyId,
            action,
            field_name: fieldName,
            old_value: oldValue !== null ? String(oldValue) : null,
            new_value: newValue !== null ? String(newValue) : null,
            description: autoDescription,
            metadata,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    };

    /**
     * Registrar múltiples cambios de una sola vez (para UPDATE con varios campos)
     */
    UserAuditLog.logMultipleChanges = async function(params) {
        const {
            userId,
            changedByUserId,
            companyId,
            changes, // Array de { fieldName, oldValue, newValue }
            ipAddress = null,
            userAgent = null
        } = params;

        const logs = [];

        for (const change of changes) {
            if (change.oldValue !== change.newValue) {
                const log = await UserAuditLog.logChange({
                    userId,
                    changedByUserId,
                    companyId,
                    action: 'UPDATE',
                    fieldName: change.fieldName,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    ipAddress,
                    userAgent
                });
                logs.push(log);
            }
        }

        return logs;
    };

    /**
     * Obtener historial de un usuario (MULTI-TENANT)
     */
    UserAuditLog.getHistory = async function(userId, companyId, options = {}) {
        const { limit = 100, offset = 0, action = null } = options;

        const where = {
            user_id: userId,
            company_id: companyId  // MULTI-TENANT: Filtrar por empresa
        };
        if (action) where.action = action;

        return await UserAuditLog.findAll({
            where,
            include: [
                {
                    model: sequelize.models.User,
                    as: 'changedByUser',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });
    };

    /**
     * Obtener estadísticas de cambios de un usuario (MULTI-TENANT)
     */
    UserAuditLog.getStats = async function(userId, companyId) {
        const [results] = await sequelize.query(`
            SELECT
                COUNT(*) as total_changes,
                MIN(created_at) as first_change,
                MAX(created_at) as last_change,
                (
                    SELECT jsonb_object_agg(action, cnt)
                    FROM (
                        SELECT action, COUNT(*) as cnt
                        FROM user_audit_logs
                        WHERE user_id = :userId AND company_id = :companyId
                        GROUP BY action
                    ) sub
                ) as changes_by_action
            FROM user_audit_logs
            WHERE user_id = :userId AND company_id = :companyId
        `, {
            replacements: { userId, companyId },
            type: sequelize.QueryTypes.SELECT
        });

        return results;
    };

    /**
     * Generar descripción legible automáticamente
     */
    UserAuditLog.generateDescription = function(action, fieldName, oldValue, newValue) {
        const fieldLabels = {
            'firstName': 'Nombre',
            'lastName': 'Apellido',
            'email': 'Email',
            'phone': 'Teléfono',
            'role': 'Rol',
            'isActive': 'Estado',
            'departmentId': 'Departamento',
            'address': 'Dirección',
            'birthDate': 'Fecha de nacimiento',
            'hireDate': 'Fecha de contratación',
            'employeeId': 'ID de empleado',
            'allowOutsideRadius': 'Permitir fuera de radio GPS',
            'defaultBranchId': 'Sucursal por defecto'
        };

        const actionLabels = {
            'CREATE': 'Usuario creado',
            'UPDATE': 'Campo actualizado',
            'DELETE': 'Usuario eliminado',
            'ACTIVATE': 'Usuario activado',
            'DEACTIVATE': 'Usuario desactivado',
            'PASSWORD_RESET': 'Contraseña reseteada',
            'ROLE_CHANGE': 'Rol cambiado',
            'DEPARTMENT_CHANGE': 'Departamento cambiado',
            'SHIFT_ASSIGN': 'Turno asignado',
            'SHIFT_REMOVE': 'Turno removido',
            'BRANCH_CHANGE': 'Sucursal cambiada',
            'LOGIN': 'Inicio de sesión',
            'LOGOUT': 'Cierre de sesión',
            'LOGIN_FAILED': 'Intento de login fallido',
            'BIOMETRIC_REGISTER': 'Registro biométrico',
            'CONSENT_GIVEN': 'Consentimiento otorgado',
            'CONSENT_REVOKED': 'Consentimiento revocado',
            'GPS_CONFIG_CHANGE': 'Configuración GPS cambiada',
            'PROFILE_UPDATE': 'Perfil actualizado',
            'BULK_UPDATE': 'Actualización masiva'
        };

        const label = fieldLabels[fieldName] || fieldName;
        const actionLabel = actionLabels[action] || action;

        if (action === 'UPDATE' && fieldName) {
            return `${label}: "${oldValue || '(vacío)'}" → "${newValue || '(vacío)'}"`;
        }

        return actionLabel;
    };

    return UserAuditLog;
};
