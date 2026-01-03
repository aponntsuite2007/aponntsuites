/**
 * Finance Petty Cash Expense Model
 * Gastos de Fondo Fijo
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinancePettyCashExpense = sequelize.define('FinancePettyCashExpense', {
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
        expense_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        expense_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        has_receipt: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        receipt_type: {
            type: DataTypes.STRING(30)
        },
        receipt_number: {
            type: DataTypes.STRING(100)
        },
        receipt_date: {
            type: DataTypes.DATEONLY
        },
        vendor_name: {
            type: DataTypes.STRING(200)
        },
        vendor_tax_id: {
            type: DataTypes.STRING(20)
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'approved', 'rejected', 'replenished']]
            }
        },
        approved_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        approved_at: {
            type: DataTypes.DATE
        },
        rejection_reason: {
            type: DataTypes.TEXT
        },
        replenishment_id: {
            type: DataTypes.INTEGER
        },
        journal_entry_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_journal_entries', key: 'id' }
        },
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_petty_cash_expenses',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['company_id', 'expense_number'] }
        ]
    });

    FinancePettyCashExpense.associate = (models) => {
        FinancePettyCashExpense.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinancePettyCashExpense.belongsTo(models.FinancePettyCashFund, {
            foreignKey: 'fund_id',
            as: 'fund'
        });
        FinancePettyCashExpense.belongsTo(models.User, {
            foreignKey: 'approved_by',
            as: 'approvedByUser'
        });
        FinancePettyCashExpense.belongsTo(models.FinanceJournalEntry, {
            foreignKey: 'journal_entry_id',
            as: 'journalEntry'
        });
    };

    return FinancePettyCashExpense;
};
