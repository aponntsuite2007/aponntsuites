/**
 * Finance Payment Method Model
 * Medios de Pago configurables por empresa
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinancePaymentMethod = sequelize.define('FinancePaymentMethod', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // NULL para plantillas globales
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
        method_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            validate: {
                isIn: [['cash', 'card', 'bank_transfer', 'check', 'digital_wallet', 'credit', 'other']]
            }
        },
        settlement_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: 'immediate'
        },
        settlement_days: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        settlement_account_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_bank_accounts', key: 'id' }
        },
        commission_percent: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        commission_fixed: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        tax_on_commission: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 21
        },
        requires_reference: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        requires_bank: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        requires_due_date: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        max_amount: {
            type: DataTypes.DECIMAL(15, 2)
        },
        external_processor: {
            type: DataTypes.STRING(50)
        },
        processor_config: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        allows_change: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        accepts_partial: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_payment_methods',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'code'] }
        ]
    });

    FinancePaymentMethod.associate = (models) => {
        FinancePaymentMethod.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinancePaymentMethod.belongsTo(models.FinanceBankAccount, {
            foreignKey: 'settlement_account_id',
            as: 'settlementAccount'
        });
    };

    return FinancePaymentMethod;
};
