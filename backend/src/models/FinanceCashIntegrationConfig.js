/**
 * Finance Cash Integration Config Model
 * Configuración PLUG-AND-PLAY para integrar módulos con cajas
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashIntegrationConfig = sequelize.define('FinanceCashIntegrationConfig', {
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
        // Módulo que integra
        source_module: {
            type: DataTypes.STRING(50),
            allowNull: false
            // 'billing', 'warehouse', 'collections', 'payments', 'siac', etc.
        },
        // Caja por defecto para este módulo
        default_register_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_registers', key: 'id' }
        },
        // Comportamiento
        auto_create_movement: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        requires_register_selection: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        // Mapeo de tipos de documento a tipos de movimiento
        document_type_mapping: {
            type: DataTypes.JSONB,
            defaultValue: {}
            // {"invoice": "sale", "credit_note": "adjustment_neg", "receipt": "collection"}
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'finance_cash_integration_config',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'source_module'] }
        ]
    });

    FinanceCashIntegrationConfig.associate = (models) => {
        FinanceCashIntegrationConfig.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCashIntegrationConfig.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'default_register_id',
            as: 'defaultRegister'
        });
    };

    return FinanceCashIntegrationConfig;
};
