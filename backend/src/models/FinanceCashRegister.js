/**
 * Finance Cash Register Model
 * Cajas: individuales, principal, fondos fijos, bóveda
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashRegister = sequelize.define('FinanceCashRegister', {
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
        register_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            validate: {
                isIn: [['individual', 'main', 'petty_cash', 'vault']]
            }
        },
        parent_register_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_registers', key: 'id' }
        },
        branch_id: {
            type: DataTypes.INTEGER
        },
        location: {
            type: DataTypes.STRING(200)
        },
        default_opening_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        max_cash_amount: {
            type: DataTypes.DECIMAL(15, 2)
        },
        requires_count_on_close: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        requires_supervisor_approval: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        auto_transfer_to_main: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        allowed_payment_methods: {
            type: DataTypes.ARRAY(DataTypes.INTEGER),
            defaultValue: []
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_open: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        current_session_id: {
            type: DataTypes.INTEGER
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        cash_account_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        difference_account_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_cash_registers',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'code'] },
            { fields: ['register_type'] },
            { fields: ['parent_register_id'] }
        ]
    });

    FinanceCashRegister.associate = (models) => {
        FinanceCashRegister.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCashRegister.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'parent_register_id',
            as: 'parentRegister'
        });
        FinanceCashRegister.hasMany(models.FinanceCashRegister, {
            foreignKey: 'parent_register_id',
            as: 'childRegisters'
        });
        FinanceCashRegister.belongsTo(models.FinanceChartOfAccounts, {
            foreignKey: 'cash_account_id',
            as: 'cashAccount'
        });
        FinanceCashRegister.hasMany(models.FinanceCashRegisterAssignment, {
            foreignKey: 'cash_register_id',
            as: 'assignments'
        });
        FinanceCashRegister.hasMany(models.FinanceCashRegisterSession, {
            foreignKey: 'cash_register_id',
            as: 'sessions'
        });
    };

    return FinanceCashRegister;
};
