/**
 * Finance Cash Movement Model
 * Movimientos de caja - PLUG-AND-PLAY con todos los módulos
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashMovement = sequelize.define('FinanceCashMovement', {
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
        session_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_cash_register_sessions', key: 'id' }
        },
        cash_register_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_cash_registers', key: 'id' }
        },
        movement_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        movement_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        movement_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            validate: {
                isIn: [[
                    'sale', 'collection', 'payment', 'expense',
                    'transfer_in', 'transfer_out', 'withdrawal', 'deposit',
                    'adjustment_pos', 'adjustment_neg', 'opening',
                    // Tipos adicionales para dashboard ejecutivo
                    'income', 'change_income', 'manual_income', 'manual_expense',
                    'exchange_in', 'exchange_out', 'egress_approved'
                ]]
            }
        },
        direction: {
            type: DataTypes.STRING(10),
            allowNull: false,
            validate: {
                isIn: [['in', 'out']]
            }
        },
        payment_method_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_payment_methods', key: 'id' }
        },
        // Multi-Currency Support
        currency_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_currencies', key: 'id' },
            comment: 'Moneda del movimiento'
        },
        currency_code: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS',
            comment: 'Código ISO de la moneda para referencia rápida'
        },
        exchange_rate: {
            type: DataTypes.DECIMAL(15, 6),
            defaultValue: 1.000000,
            comment: 'Tipo de cambio al momento del movimiento'
        },
        amount_in_base_currency: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Monto convertido a moneda base de la empresa'
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        commission_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        net_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        payment_reference: {
            type: DataTypes.STRING(100)
        },
        payment_bank: {
            type: DataTypes.STRING(100)
        },
        payment_due_date: {
            type: DataTypes.DATEONLY
        },
        // PLUG-AND-PLAY: Origen del movimiento
        source_module: {
            type: DataTypes.STRING(50)
        },
        source_document_type: {
            type: DataTypes.STRING(50)
        },
        source_document_id: {
            type: DataTypes.INTEGER
        },
        source_document_number: {
            type: DataTypes.STRING(100)
        },
        // Tercero relacionado
        third_party_type: {
            type: DataTypes.STRING(30)
        },
        third_party_id: {
            type: DataTypes.INTEGER
        },
        third_party_name: {
            type: DataTypes.STRING(200)
        },
        description: {
            type: DataTypes.TEXT
        },
        transfer_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_transfers', key: 'id' }
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'active',
            validate: {
                isIn: [['active', 'voided', 'pending']]
            }
        },
        voided_at: {
            type: DataTypes.DATE
        },
        voided_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        void_reason: {
            type: DataTypes.TEXT
        },
        journal_entry_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_journal_entries', key: 'id' }
        },
        is_posted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_cash_movements',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['company_id', 'movement_number'] },
            { fields: ['session_id'] },
            { fields: ['cash_register_id'] },
            { fields: ['movement_type'] },
            { fields: ['movement_date'] },
            { fields: ['source_module', 'source_document_id'] }
        ]
    });

    FinanceCashMovement.associate = (models) => {
        FinanceCashMovement.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCashMovement.belongsTo(models.FinanceCashRegisterSession, {
            foreignKey: 'session_id',
            as: 'session'
        });
        FinanceCashMovement.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'cash_register_id',
            as: 'cashRegister'
        });
        FinanceCashMovement.belongsTo(models.FinancePaymentMethod, {
            foreignKey: 'payment_method_id',
            as: 'paymentMethod'
        });
        FinanceCashMovement.belongsTo(models.FinanceCashTransfer, {
            foreignKey: 'transfer_id',
            as: 'transfer'
        });
        FinanceCashMovement.belongsTo(models.FinanceJournalEntry, {
            foreignKey: 'journal_entry_id',
            as: 'journalEntry'
        });
    };

    return FinanceCashMovement;
};
