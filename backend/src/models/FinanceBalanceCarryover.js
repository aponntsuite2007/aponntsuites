/**
 * Finance Balance Carryover Model
 * Arrastre de saldos entre cierres de caja
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceBalanceCarryover = sequelize.define('FinanceBalanceCarryover', {
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
        // Sesión origen y destino
        from_session_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_cash_register_sessions', key: 'id' },
            comment: 'Sesión que cierra'
        },
        to_session_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_register_sessions', key: 'id' },
            comment: 'Sesión que abre (puede ser NULL hasta que se abra)'
        },
        // Moneda y monto
        currency_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_currencies', key: 'id' }
        },
        currency_code: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'ARS'
        },
        carryover_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Monto arrastrado a la siguiente sesión'
        },
        // Tipo de cambio al momento del arrastre
        exchange_rate: {
            type: DataTypes.DECIMAL(15, 6),
            defaultValue: 1.000000
        },
        amount_in_base_currency: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Monto convertido a moneda base'
        },
        // Fechas
        carryover_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        applied_at: {
            type: DataTypes.DATE,
            comment: 'Cuando se aplicó al abrir nueva sesión'
        },
        // Estado
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'applied', 'cancelled', 'adjusted']]
            },
            comment: 'pending: esperando nueva sesión, applied: ya se usó'
        },
        // Detalles adicionales
        closing_notes: {
            type: DataTypes.TEXT,
            comment: 'Notas del operador al cerrar'
        },
        opening_notes: {
            type: DataTypes.TEXT,
            comment: 'Notas del operador al abrir'
        },
        // Auditoría
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        applied_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_cash_balance_carryover',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id', 'cash_register_id'] },
            { fields: ['from_session_id'] },
            { fields: ['to_session_id'] },
            { fields: ['status', 'carryover_date'] }
        ]
    });

    FinanceBalanceCarryover.associate = (models) => {
        FinanceBalanceCarryover.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceBalanceCarryover.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'cash_register_id',
            as: 'cashRegister'
        });
        FinanceBalanceCarryover.belongsTo(models.FinanceCashRegisterSession, {
            foreignKey: 'from_session_id',
            as: 'fromSession'
        });
        FinanceBalanceCarryover.belongsTo(models.FinanceCashRegisterSession, {
            foreignKey: 'to_session_id',
            as: 'toSession'
        });
        FinanceBalanceCarryover.belongsTo(models.FinanceCurrency, {
            foreignKey: 'currency_id',
            as: 'currency'
        });
        FinanceBalanceCarryover.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        FinanceBalanceCarryover.belongsTo(models.User, {
            foreignKey: 'applied_by',
            as: 'applier'
        });
    };

    return FinanceBalanceCarryover;
};
