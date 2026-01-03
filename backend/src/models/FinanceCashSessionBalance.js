/**
 * Finance Cash Session Balance Model
 * Saldos por moneda dentro de una sesión de caja
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashSessionBalance = sequelize.define('FinanceCashSessionBalance', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        session_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_cash_register_sessions', key: 'id' }
        },
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
        // Saldos
        opening_balance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
            comment: 'Saldo inicial al abrir la sesión'
        },
        current_balance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
            comment: 'Saldo actual calculado'
        },
        closing_balance: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Saldo al cerrar la sesión (declarado)'
        },
        system_balance: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Saldo calculado por el sistema al cierre'
        },
        // Diferencia
        difference: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Diferencia entre declarado y sistema (puede ser positivo o negativo)'
        },
        // Totales del día por tipo
        total_income: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_expense: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_transfers_in: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_transfers_out: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_adjustments: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        // Conteo de billetes/monedas (para arqueo)
        cash_count_detail: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Detalle del arqueo: {100: 5, 500: 2, ...}'
        },
        // Estado
        is_reconciled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        reconciled_at: {
            type: DataTypes.DATE
        },
        reconciled_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_cash_session_balances',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['session_id', 'currency_id'] },
            { fields: ['session_id'] }
        ]
    });

    FinanceCashSessionBalance.associate = (models) => {
        FinanceCashSessionBalance.belongsTo(models.FinanceCashRegisterSession, {
            foreignKey: 'session_id',
            as: 'session'
        });
        FinanceCashSessionBalance.belongsTo(models.FinanceCurrency, {
            foreignKey: 'currency_id',
            as: 'currency'
        });
        FinanceCashSessionBalance.belongsTo(models.User, {
            foreignKey: 'reconciled_by',
            as: 'reconciler'
        });
    };

    return FinanceCashSessionBalance;
};
