/**
 * Finance Petty Cash Fund Model
 * Fondos Fijos por departamento
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinancePettyCashFund = sequelize.define('FinancePettyCashFund', {
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
        code: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        custodian_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        department_id: {
            type: DataTypes.INTEGER,
            references: { model: 'departments', key: 'id' }
        },
        fund_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        current_balance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        max_expense_amount: {
            type: DataTypes.DECIMAL(15, 2)
        },
        replenishment_threshold: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 20
        },
        allowed_expense_categories: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        fund_account_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        expense_account_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        main_register_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_registers', key: 'id' }
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        last_replenishment_date: {
            type: DataTypes.DATEONLY
        },
        last_replenishment_amount: {
            type: DataTypes.DECIMAL(15, 2)
        },
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_petty_cash_funds',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'code'] }
        ]
    });

    FinancePettyCashFund.associate = (models) => {
        FinancePettyCashFund.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinancePettyCashFund.belongsTo(models.User, {
            foreignKey: 'custodian_id',
            as: 'custodian'
        });
        FinancePettyCashFund.belongsTo(models.Department, {
            foreignKey: 'department_id',
            as: 'department'
        });
        FinancePettyCashFund.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'main_register_id',
            as: 'mainRegister'
        });
        FinancePettyCashFund.hasMany(models.FinancePettyCashExpense, {
            foreignKey: 'fund_id',
            as: 'expenses'
        });
    };

    return FinancePettyCashFund;
};
