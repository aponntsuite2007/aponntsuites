/**
 * Finance Petty Cash Replenishment Model
 * Reposiciones de Fondo Fijo
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinancePettyCashReplenishment = sequelize.define('FinancePettyCashReplenishment', {
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
        fund_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_petty_cash_funds', key: 'id' }
        },
        replenishment_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        replenishment_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        period_from: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        period_to: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        expense_ids: {
            type: DataTypes.ARRAY(DataTypes.INTEGER),
            allowNull: false
        },
        expense_count: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        total_expenses: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        replenishment_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        source_register_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_registers', key: 'id' }
        },
        source_movement_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_movements', key: 'id' }
        },
        payment_method_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_payment_methods', key: 'id' }
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'approved', 'paid', 'cancelled']]
            }
        },
        requested_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        requested_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        approved_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        approved_at: {
            type: DataTypes.DATE
        },
        paid_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        paid_at: {
            type: DataTypes.DATE
        },
        journal_entry_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_journal_entries', key: 'id' }
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_petty_cash_replenishments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['company_id', 'replenishment_number'] }
        ]
    });

    FinancePettyCashReplenishment.associate = (models) => {
        FinancePettyCashReplenishment.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinancePettyCashReplenishment.belongsTo(models.FinancePettyCashFund, {
            foreignKey: 'fund_id',
            as: 'fund'
        });
        FinancePettyCashReplenishment.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'source_register_id',
            as: 'sourceRegister'
        });
        FinancePettyCashReplenishment.belongsTo(models.FinancePaymentMethod, {
            foreignKey: 'payment_method_id',
            as: 'paymentMethod'
        });
        FinancePettyCashReplenishment.belongsTo(models.User, {
            foreignKey: 'requested_by',
            as: 'requestedByUser'
        });
    };

    return FinancePettyCashReplenishment;
};
