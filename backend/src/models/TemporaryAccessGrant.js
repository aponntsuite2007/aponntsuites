/**
 * ============================================================================
 * MODELO: TemporaryAccessGrant
 * ============================================================================
 * Sistema de accesos temporales digitales para:
 * - Auditores externos
 * - Asesores y consultores
 * - Médicos no asociados
 * - Contratistas IT
 * - Personal temporal
 *
 * Diferente a "visitors" (acceso físico a kioscos)
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TemporaryAccessGrant = sequelize.define('TemporaryAccessGrant', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'id'
            }
        },

        // Información del usuario temporal
        fullName: {
            type: DataTypes.STRING(200),
            allowNull: false,
            field: 'full_name'
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                isEmail: true
            }
        },
        dni: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        organization: {
            type: DataTypes.STRING(200),
            allowNull: true
        },

        // Tipo de acceso
        accessType: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'external_auditor',
            field: 'access_type',
            validate: {
                isIn: [['external_auditor', 'external_advisor', 'external_doctor',
                        'consultant', 'contractor', 'temp_staff', 'custom']]
            }
        },

        // Credenciales
        username: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'password_hash'
        },
        tempPasswordPlain: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'temp_password_plain'
        },

        // Permisos
        allowedModules: {
            type: DataTypes.JSONB,
            defaultValue: [],
            field: 'allowed_modules'
        },
        permissionLevel: {
            type: DataTypes.STRING(20),
            defaultValue: 'read_only',
            field: 'permission_level',
            validate: {
                isIn: [['read_only', 'read_write', 'custom']]
            }
        },
        customPermissions: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'custom_permissions'
        },

        // Restricciones de seguridad
        allowedIpRanges: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: true,
            field: 'allowed_ip_ranges'
        },
        maxConcurrentSessions: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            field: 'max_concurrent_sessions'
        },
        requirePasswordChange: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'require_password_change'
        },
        twoFactorEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'two_factor_enabled'
        },

        // Vigencia
        validFrom: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'valid_from'
        },
        validUntil: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'valid_until'
        },
        autoRevokeOnExpiry: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'auto_revoke_on_expiry'
        },

        // Estado
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'active', 'expired', 'revoked', 'suspended']]
            }
        },

        // Flags de uso
        firstLoginAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'first_login_at'
        },
        lastLoginAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_login_at'
        },
        passwordChanged: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'password_changed'
        },
        passwordChangedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'password_changed_at'
        },
        totalLogins: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_logins'
        },
        failedLoginAttempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'failed_login_attempts'
        },
        lastFailedLoginAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_failed_login_at'
        },

        // Auditoría
        createdBy: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'created_by',
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        approvedBy: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'approved_by',
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        approvedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'approved_at'
        },
        revokedBy: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'revoked_by',
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        revokedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'revoked_at'
        },
        revocationReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'revocation_reason'
        },

        // Notas
        purpose: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        internalNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'internal_notes'
        },

        // Metadata
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {}
        }
    }, {
        tableName: 'temporary_access_grants',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',

        indexes: [
            { fields: ['company_id'] },
            { fields: ['username'], where: { status: 'active' } },
            { fields: ['email'] },
            { fields: ['status', 'company_id'] },
            { fields: ['valid_from', 'valid_until'], where: { status: 'active' } },
            { fields: ['access_type', 'company_id'] }
        ]
    });

    // ========================================================================
    // MÉTODOS DE INSTANCIA
    // ========================================================================

    /**
     * Verifica si el acceso está vigente
     */
    TemporaryAccessGrant.prototype.isValid = function() {
        const now = new Date();
        return (
            this.status === 'active' &&
            now >= new Date(this.validFrom) &&
            now <= new Date(this.validUntil)
        );
    };

    /**
     * Calcula días restantes de vigencia
     */
    TemporaryAccessGrant.prototype.getDaysRemaining = function() {
        const now = new Date();
        const until = new Date(this.validUntil);
        const diffMs = until - now;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    };

    /**
     * Verifica si está por expirar (< 7 días)
     */
    TemporaryAccessGrant.prototype.isExpiringSoon = function() {
        return this.getDaysRemaining() <= 7 && this.getDaysRemaining() > 0;
    };

    /**
     * Verifica si tiene permiso para un módulo específico
     */
    TemporaryAccessGrant.prototype.hasModuleAccess = function(moduleKey) {
        return this.allowedModules && this.allowedModules.includes(moduleKey);
    };

    /**
     * JSON seguro (sin contraseña)
     */
    TemporaryAccessGrant.prototype.toSafeJSON = function() {
        const values = { ...this.get() };
        delete values.passwordHash;
        delete values.tempPasswordPlain;
        return values;
    };

    // ========================================================================
    // MÉTODOS ESTÁTICOS
    // ========================================================================

    /**
     * Buscar accesos activos de una empresa
     */
    TemporaryAccessGrant.getActiveByCompany = async function(companyId) {
        return await this.findAll({
            where: {
                companyId,
                status: 'active'
            },
            order: [['validUntil', 'ASC']]
        });
    };

    /**
     * Buscar por username
     */
    TemporaryAccessGrant.findByUsername = async function(username) {
        return await this.findOne({ where: { username } });
    };

    /**
     * Revocar acceso
     */
    TemporaryAccessGrant.prototype.revoke = async function(revokedByUserId, reason) {
        this.status = 'revoked';
        this.revokedBy = revokedByUserId;
        this.revokedAt = new Date();
        this.revocationReason = reason;
        return await this.save();
    };

    /**
     * Activar acceso
     */
    TemporaryAccessGrant.prototype.activate = async function(approvedByUserId) {
        this.status = 'active';
        this.approvedBy = approvedByUserId;
        this.approvedAt = new Date();
        return await this.save();
    };

    // ========================================================================
    // ASOCIACIONES (se definen en database.js)
    // ========================================================================
    TemporaryAccessGrant.associate = (models) => {
        TemporaryAccessGrant.belongsTo(models.Company, {
            foreignKey: 'companyId',
            as: 'company'
        });

        TemporaryAccessGrant.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator'
        });

        TemporaryAccessGrant.belongsTo(models.User, {
            foreignKey: 'approvedBy',
            as: 'approver'
        });

        TemporaryAccessGrant.belongsTo(models.User, {
            foreignKey: 'revokedBy',
            as: 'revoker'
        });

        TemporaryAccessGrant.hasMany(models.TemporaryAccessActivityLog, {
            foreignKey: 'grantId',
            as: 'activityLogs'
        });
    };

    return TemporaryAccessGrant;
};
