/**
 * Finance Responsible Config Model
 * Configuración del responsable de finanzas y escalamiento
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceResponsibleConfig = sequelize.define('FinanceResponsibleConfig', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: 'companies', key: 'company_id' }
        },
        // Responsable principal de finanzas
        finance_responsible_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        finance_responsible_position_id: {
            type: DataTypes.INTEGER,
            references: { model: 'positions', key: 'id' }
        },
        // Responsables de respaldo (para escalamiento)
        backup_responsibles: {
            type: DataTypes.ARRAY(DataTypes.UUID),
            defaultValue: []
        },
        // Configuración de escalamiento
        escalation_timeout_minutes: {
            type: DataTypes.INTEGER,
            defaultValue: 60
        },
        max_escalation_level: {
            type: DataTypes.INTEGER,
            defaultValue: 3
        },
        // Límites de autorización sin aprobación
        max_adjustment_without_approval: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0
        },
        max_egress_without_approval: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0
        },
        // Notificaciones
        notify_on_all_adjustments: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notify_on_all_egress: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notify_on_cash_discrepancy: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notify_threshold_percent: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 1.00
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'finance_responsible_config',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    FinanceResponsibleConfig.associate = (models) => {
        FinanceResponsibleConfig.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceResponsibleConfig.belongsTo(models.User, {
            foreignKey: 'finance_responsible_id',
            targetKey: 'user_id',
            as: 'financeResponsible'
        });
    };

    return FinanceResponsibleConfig;
};
