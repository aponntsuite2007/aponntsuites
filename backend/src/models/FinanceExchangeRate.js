/**
 * Finance Exchange Rate Model
 * Historial de tipos de cambio por moneda
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceExchangeRate = sequelize.define('FinanceExchangeRate', {
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
        currency_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_currencies', key: 'id' }
        },
        currency_code: {
            type: DataTypes.STRING(3),
            allowNull: false,
            comment: 'Código ISO de la moneda'
        },
        // Tipos de cambio
        buy_rate: {
            type: DataTypes.DECIMAL(15, 6),
            allowNull: false,
            comment: 'Tipo de cambio compra'
        },
        sell_rate: {
            type: DataTypes.DECIMAL(15, 6),
            allowNull: false,
            comment: 'Tipo de cambio venta'
        },
        mid_rate: {
            type: DataTypes.DECIMAL(15, 6),
            allowNull: false,
            comment: 'Tipo de cambio medio (promedio)'
        },
        // Fecha efectiva
        effective_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Fecha en que aplica este tipo de cambio'
        },
        effective_time: {
            type: DataTypes.TIME,
            defaultValue: '00:00:00',
            comment: 'Hora en que aplica (para intradía)'
        },
        // Fuente
        source: {
            type: DataTypes.STRING(50),
            defaultValue: 'manual',
            validate: {
                isIn: [['manual', 'bcra', 'bna', 'dolarhoy', 'api_external', 'automatic']]
            }
        },
        source_reference: {
            type: DataTypes.STRING(200),
            comment: 'Referencia o URL de la fuente'
        },
        // Auditoría
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_exchange_rates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['company_id', 'currency_id', 'effective_date', 'effective_time'] },
            { fields: ['company_id', 'currency_code', 'effective_date'] },
            { fields: ['effective_date'] }
        ]
    });

    FinanceExchangeRate.associate = (models) => {
        FinanceExchangeRate.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceExchangeRate.belongsTo(models.FinanceCurrency, {
            foreignKey: 'currency_id',
            as: 'currency'
        });
        FinanceExchangeRate.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });
    };

    return FinanceExchangeRate;
};
