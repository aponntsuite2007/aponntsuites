/**
 * Finance Currency Exchange Model
 * Operaciones de cambio de moneda en caja
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCurrencyExchange = sequelize.define('FinanceCurrencyExchange', {
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
        cash_register_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_cash_registers', key: 'id' }
        },
        session_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_cash_register_sessions', key: 'id' }
        },
        // Número de operación
        exchange_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        exchange_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        // Tipo de operación
        exchange_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [['buy', 'sell']]
            },
            comment: 'buy: cliente compra moneda extranjera, sell: cliente vende moneda extranjera'
        },
        // Moneda origen (la que entrega el cliente)
        from_currency_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_currencies', key: 'id' }
        },
        from_currency_code: {
            type: DataTypes.STRING(3),
            allowNull: false
        },
        from_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Monto que entrega el cliente'
        },
        // Moneda destino (la que recibe el cliente)
        to_currency_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_currencies', key: 'id' }
        },
        to_currency_code: {
            type: DataTypes.STRING(3),
            allowNull: false
        },
        to_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Monto que recibe el cliente'
        },
        // Tipo de cambio aplicado
        exchange_rate: {
            type: DataTypes.DECIMAL(15, 6),
            allowNull: false,
            comment: 'Tipo de cambio aplicado'
        },
        rate_type: {
            type: DataTypes.STRING(20),
            defaultValue: 'sell',
            validate: {
                isIn: [['buy', 'sell', 'mid', 'custom']]
            }
        },
        // Spread/comisión
        spread_percent: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            comment: 'Porcentaje de spread aplicado'
        },
        commission_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Comisión cobrada (si aplica)'
        },
        // Cliente (opcional)
        client_type: {
            type: DataTypes.STRING(30),
            validate: {
                isIn: [['individual', 'company', 'employee', 'walk_in']]
            }
        },
        client_id: {
            type: DataTypes.INTEGER
        },
        client_name: {
            type: DataTypes.STRING(200)
        },
        client_document: {
            type: DataTypes.STRING(50)
        },
        // Movimientos generados
        movement_in_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_movements', key: 'id' },
            comment: 'Movimiento de entrada (from_currency)'
        },
        movement_out_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_movements', key: 'id' },
            comment: 'Movimiento de salida (to_currency)'
        },
        // Descripción
        description: {
            type: DataTypes.TEXT
        },
        // Estado
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'completed',
            validate: {
                isIn: [['completed', 'cancelled', 'reversed']]
            }
        },
        cancelled_at: {
            type: DataTypes.DATE
        },
        cancelled_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        cancellation_reason: {
            type: DataTypes.TEXT
        },
        // Auditoría
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_currency_exchanges',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['company_id', 'exchange_number'] },
            { fields: ['session_id'] },
            { fields: ['cash_register_id', 'exchange_date'] },
            { fields: ['from_currency_code', 'to_currency_code'] }
        ]
    });

    FinanceCurrencyExchange.associate = (models) => {
        FinanceCurrencyExchange.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCurrencyExchange.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'cash_register_id',
            as: 'cashRegister'
        });
        FinanceCurrencyExchange.belongsTo(models.FinanceCashRegisterSession, {
            foreignKey: 'session_id',
            as: 'session'
        });
        FinanceCurrencyExchange.belongsTo(models.FinanceCurrency, {
            foreignKey: 'from_currency_id',
            as: 'fromCurrency'
        });
        FinanceCurrencyExchange.belongsTo(models.FinanceCurrency, {
            foreignKey: 'to_currency_id',
            as: 'toCurrency'
        });
        FinanceCurrencyExchange.belongsTo(models.FinanceCashMovement, {
            foreignKey: 'movement_in_id',
            as: 'movementIn'
        });
        FinanceCurrencyExchange.belongsTo(models.FinanceCashMovement, {
            foreignKey: 'movement_out_id',
            as: 'movementOut'
        });
        FinanceCurrencyExchange.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        FinanceCurrencyExchange.belongsTo(models.User, {
            foreignKey: 'cancelled_by',
            as: 'canceller'
        });
    };

    return FinanceCurrencyExchange;
};
