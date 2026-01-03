/**
 * Finance Authorization Log Model
 * Registro de autorizaciones biométricas/contraseña
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceAuthorizationLog = sequelize.define('FinanceAuthorizationLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        // Operación autorizada
        operation_type: {
            type: DataTypes.STRING(50),
            allowNull: false
            // 'adjustment', 'egress', 'close_session', 'exchange', 'transfer_confirm'
        },
        operation_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        operation_table: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        // Usuario que autoriza
        authorizer_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        authorization_role: {
            type: DataTypes.STRING(50)
            // 'operator', 'supervisor', 'finance_responsible'
        },
        // Método de autorización
        authorization_method: {
            type: DataTypes.STRING(30),
            allowNull: false
            // 'biometric_fingerprint', 'biometric_face', 'password', '2fa_token', 'pin'
        },
        authorization_device: {
            type: DataTypes.STRING(100)
        },
        authorization_confidence: {
            type: DataTypes.DECIMAL(5, 2)
        },
        // Resultado
        authorization_result: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [['success', 'failed', 'timeout']]
            }
        },
        failure_reason: {
            type: DataTypes.TEXT
        },
        // Auditoría
        ip_address: {
            type: DataTypes.STRING(45)
        },
        user_agent: {
            type: DataTypes.TEXT
        },
        location_data: {
            type: DataTypes.JSONB
        }
    }, {
        tableName: 'finance_authorization_logs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { fields: ['operation_type', 'operation_id'] },
            { fields: ['authorizer_id', 'created_at'] }
        ]
    });

    FinanceAuthorizationLog.associate = (models) => {
        FinanceAuthorizationLog.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceAuthorizationLog.belongsTo(models.User, {
            foreignKey: 'authorizer_id',
            targetKey: 'user_id',
            as: 'authorizer'
        });
    };

    return FinanceAuthorizationLog;
};
