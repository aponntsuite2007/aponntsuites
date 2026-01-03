/**
 * Finance Cash Adjustment Model
 * Ajustes de caja con workflow de autorización
 * Solo el responsable de finanzas puede aprobar
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashAdjustment = sequelize.define('FinanceCashAdjustment', {
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
            references: { model: 'finance_cash_register_sessions', key: 'id' }
        },
        adjustment_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        adjustment_date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        // Tipo de ajuste
        adjustment_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            validate: {
                isIn: [['positive', 'negative', 'exchange_diff', 'rounding', 'correction']]
            }
        },
        adjustment_reason: {
            type: DataTypes.STRING(100),
            allowNull: false
            // 'shortage', 'surplus', 'error_correction', 'exchange_adjustment', 'opening_balance', 'audit_finding'
        },
        // Montos
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'ARS'
        },
        amount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false
        },
        previous_balance: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false
        },
        new_balance: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false
        },
        // Documentación
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        supporting_document: {
            type: DataTypes.STRING(200)
        },
        // Workflow de autorización
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'approved', 'rejected', 'cancelled']]
            }
        },
        // Solicitante
        requested_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        requested_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        // Autorización por Responsable de Finanzas
        requires_finance_approval: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        finance_approver_id: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        finance_approved_at: {
            type: DataTypes.DATE
        },
        finance_approval_method: {
            type: DataTypes.STRING(20)
            // 'biometric', 'password', 'token'
        },
        finance_approval_notes: {
            type: DataTypes.TEXT
        },
        // Rechazo
        rejected_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        rejected_at: {
            type: DataTypes.DATE
        },
        rejection_reason: {
            type: DataTypes.TEXT
        },
        // Asiento contable
        journal_entry_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_journal_entries', key: 'id' }
        },
        // Auditoría
        ip_address: {
            type: DataTypes.STRING(45)
        },
        user_agent: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_cash_adjustments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['company_id', 'adjustment_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['finance_approver_id', 'status'] }
        ]
    });

    FinanceCashAdjustment.associate = (models) => {
        FinanceCashAdjustment.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCashAdjustment.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'cash_register_id',
            as: 'cashRegister'
        });
        FinanceCashAdjustment.belongsTo(models.User, {
            foreignKey: 'requested_by',
            targetKey: 'user_id',
            as: 'requestedByUser'
        });
        FinanceCashAdjustment.belongsTo(models.User, {
            foreignKey: 'finance_approver_id',
            targetKey: 'user_id',
            as: 'financeApprover'
        });
    };

    return FinanceCashAdjustment;
};
