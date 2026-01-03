/**
 * ============================================================================
 * MODELO: TemporaryAccessActivityLog
 * ============================================================================
 * Log de actividades de usuarios con accesos temporales
 * Para auditoría y monitoreo de seguridad
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TemporaryAccessActivityLog = sequelize.define('TemporaryAccessActivityLog', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        grantId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'grant_id',
            references: {
                model: 'temporary_access_grants',
                key: 'id'
            }
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

        // Actividad
        activityType: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'activity_type'
            // Valores: 'login_success', 'login_failed', 'logout', 'access_denied',
            //          'module_accessed', 'data_viewed', 'data_modified', 'password_changed'
        },
        moduleAccessed: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'module_accessed'
        },
        actionPerformed: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'action_performed'
        },

        // Contexto técnico
        ipAddress: {
            type: DataTypes.INET,
            allowNull: true,
            field: 'ip_address'
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'user_agent'
        },
        sessionId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'session_id'
        },

        // Datos
        requestDetails: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'request_details'
        },
        responseStatus: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'response_status'
        },

        // Metadata
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {}
        }
    }, {
        tableName: 'temporary_access_activity_log',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: false, // Solo created_at

        indexes: [
            { fields: ['grant_id', { attribute: 'created_at', order: 'DESC' }] },
            { fields: ['company_id', { attribute: 'created_at', order: 'DESC' }] },
            { fields: ['activity_type', { attribute: 'created_at', order: 'DESC' }] }
        ]
    });

    // ========================================================================
    // MÉTODOS ESTÁTICOS
    // ========================================================================

    /**
     * Registrar actividad
     */
    TemporaryAccessActivityLog.logActivity = async function(data) {
        return await this.create({
            grantId: data.grantId,
            companyId: data.companyId,
            activityType: data.activityType,
            moduleAccessed: data.moduleAccessed || null,
            actionPerformed: data.actionPerformed || null,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null,
            sessionId: data.sessionId || null,
            requestDetails: data.requestDetails || {},
            responseStatus: data.responseStatus || null,
            metadata: data.metadata || {}
        });
    };

    /**
     * Obtener actividad reciente de un grant
     */
    TemporaryAccessActivityLog.getRecentByGrant = async function(grantId, limit = 50) {
        return await this.findAll({
            where: { grantId },
            order: [['created_at', 'DESC']],
            limit
        });
    };

    /**
     * Obtener actividad reciente de una empresa
     */
    TemporaryAccessActivityLog.getRecentByCompany = async function(companyId, limit = 100) {
        return await this.findAll({
            where: { companyId },
            order: [['created_at', 'DESC']],
            limit,
            include: [{
                model: sequelize.models.TemporaryAccessGrant,
                as: 'grant',
                attributes: ['id', 'fullName', 'username', 'accessType']
            }]
        });
    };

    /**
     * Obtener actividad sospechosa (logins fallidos, accesos denegados)
     */
    TemporaryAccessActivityLog.getSuspiciousActivity = async function(companyId, hours = 24) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        return await this.findAll({
            where: {
                companyId,
                activityType: ['login_failed', 'access_denied'],
                created_at: { [sequelize.Sequelize.Op.gte]: since }
            },
            order: [['created_at', 'DESC']]
        });
    };

    // ========================================================================
    // ASOCIACIONES
    // ========================================================================
    TemporaryAccessActivityLog.associate = (models) => {
        TemporaryAccessActivityLog.belongsTo(models.TemporaryAccessGrant, {
            foreignKey: 'grantId',
            as: 'grant'
        });

        TemporaryAccessActivityLog.belongsTo(models.Company, {
            foreignKey: 'companyId',
            as: 'company'
        });
    };

    return TemporaryAccessActivityLog;
};
