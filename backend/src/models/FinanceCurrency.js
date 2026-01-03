/**
 * Finance Currency Model
 * Monedas disponibles en el sistema
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCurrency = sequelize.define('FinanceCurrency', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // MULTI-TENANT: Cada empresa puede tener sus propias monedas configuradas
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        code: {
            type: DataTypes.STRING(3),
            allowNull: false,
            comment: 'ISO 4217 currency code (ARS, USD, EUR, etc.)'
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        symbol: {
            type: DataTypes.STRING(10),
            allowNull: false
        },
        decimal_places: {
            type: DataTypes.INTEGER,
            defaultValue: 2
        },
        // Tipo de cambio actual respecto a la moneda base
        exchange_rate: {
            type: DataTypes.DECIMAL(15, 6),
            defaultValue: 1.000000,
            comment: 'Tipo de cambio respecto a moneda base de la empresa'
        },
        // Moneda por defecto de la empresa
        is_default: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si es la moneda base de la empresa'
        },
        // Última actualización del tipo de cambio
        last_rate_update: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            comment: 'Última actualización del exchange_rate'
        },
        // Fuente del tipo de cambio
        rate_source: {
            type: DataTypes.STRING(50),
            defaultValue: 'manual',
            validate: {
                isIn: [['manual', 'bcra', 'api_external', 'automatic']]
            }
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_currencies',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'code'] },
            { fields: ['company_id', 'is_default'] },
            { fields: ['is_active'] }
        ]
    });

    FinanceCurrency.associate = (models) => {
        FinanceCurrency.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCurrency.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });
    };

    return FinanceCurrency;
};
