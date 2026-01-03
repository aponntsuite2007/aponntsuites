/**
 * Finance Cash Egress Request Model
 * Solicitudes de egreso con autorización jerárquica
 * Requiere autorización del supervisor inmediato + notificación a finanzas
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashEgressRequest = sequelize.define('FinanceCashEgressRequest', {
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
        // Identificación
        request_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        request_date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        // Tipo de egreso
        egress_type: {
            type: DataTypes.STRING(50),
            allowNull: false
            // 'manual_withdrawal', 'expense', 'supplier_payment', 'reimbursement', 'loan', 'other'
        },
        category: {
            type: DataTypes.STRING(100)
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
        payment_method_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_payment_methods', key: 'id' }
        },
        // Beneficiario
        beneficiary_type: {
            type: DataTypes.STRING(30)
            // 'employee', 'supplier', 'other'
        },
        beneficiary_id: {
            type: DataTypes.STRING(100)
        },
        beneficiary_name: {
            type: DataTypes.STRING(200)
        },
        beneficiary_document: {
            type: DataTypes.STRING(50)
        },
        // Documentación
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        justification: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        supporting_documents: {
            type: DataTypes.JSONB,
            defaultValue: []
            // [{filename, url, type}]
        },
        // Workflow de autorización jerárquica
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'supervisor_approved', 'finance_approved', 'executed', 'rejected', 'cancelled']]
            }
        },
        // Solicitante (operador de caja)
        requested_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        requested_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        // Aprobación del supervisor inmediato (según organigrama)
        supervisor_id: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        supervisor_approved_at: {
            type: DataTypes.DATE
        },
        supervisor_approval_method: {
            type: DataTypes.STRING(20)
            // 'biometric', 'password'
        },
        supervisor_notes: {
            type: DataTypes.TEXT
        },
        // Notificación/Aprobación del responsable de finanzas
        finance_responsible_id: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        finance_notified_at: {
            type: DataTypes.DATE
        },
        finance_approved_at: {
            type: DataTypes.DATE
        },
        finance_approval_method: {
            type: DataTypes.STRING(20)
        },
        finance_notes: {
            type: DataTypes.TEXT
        },
        // Escalamiento
        escalation_level: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        escalated_to: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        escalated_at: {
            type: DataTypes.DATE
        },
        escalation_reason: {
            type: DataTypes.TEXT
        },
        // Ejecución
        executed_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        executed_at: {
            type: DataTypes.DATE
        },
        execution_method: {
            type: DataTypes.STRING(20)
            // 'biometric', 'password'
        },
        movement_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_movements', key: 'id' }
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
        // Auditoría
        ip_address: {
            type: DataTypes.STRING(45)
        },
        audit_trail: {
            type: DataTypes.JSONB,
            defaultValue: []
            // [{timestamp, action, user_id, notes}]
        }
    }, {
        tableName: 'finance_cash_egress_requests',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['company_id', 'request_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['supervisor_id', 'status'] },
            { fields: ['finance_responsible_id', 'status'] }
        ]
    });

    FinanceCashEgressRequest.associate = (models) => {
        FinanceCashEgressRequest.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCashEgressRequest.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'cash_register_id',
            as: 'cashRegister'
        });
        FinanceCashEgressRequest.belongsTo(models.FinancePaymentMethod, {
            foreignKey: 'payment_method_id',
            as: 'paymentMethod'
        });
        FinanceCashEgressRequest.belongsTo(models.User, {
            foreignKey: 'requested_by',
            targetKey: 'user_id',
            as: 'requestedByUser'
        });
        FinanceCashEgressRequest.belongsTo(models.User, {
            foreignKey: 'supervisor_id',
            targetKey: 'user_id',
            as: 'supervisor'
        });
        FinanceCashEgressRequest.belongsTo(models.User, {
            foreignKey: 'finance_responsible_id',
            targetKey: 'user_id',
            as: 'financeResponsible'
        });
    };

    return FinanceCashEgressRequest;
};
