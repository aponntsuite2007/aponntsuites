/**
 * Finance Cash Transfer Model
 * Transferencias entre cajas con workflow de confirmación
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashTransfer = sequelize.define('FinanceCashTransfer', {
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
        transfer_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        transfer_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        // Cajas involucradas
        source_register_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_cash_registers', key: 'id' }
        },
        source_session_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_register_sessions', key: 'id' }
        },
        destination_register_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_cash_registers', key: 'id' }
        },
        destination_session_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_register_sessions', key: 'id' }
        },
        payment_method_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_payment_methods', key: 'id' }
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        transfer_details: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        description: {
            type: DataTypes.TEXT
        },
        reason: {
            type: DataTypes.STRING(100)
        },
        // WORKFLOW DE CONFIRMACIÓN
        status: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'confirmed', 'rejected', 'cancelled', 'reversed']]
            }
        },
        // Usuario que inicia
        initiated_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        initiated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        // Usuario que confirma/rechaza
        responded_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        responded_at: {
            type: DataTypes.DATE
        },
        response_notes: {
            type: DataTypes.TEXT
        },
        // Reversión
        reversed_at: {
            type: DataTypes.DATE
        },
        reversal_movement_id: {
            type: DataTypes.INTEGER
        },
        // Bloqueos
        blocks_source_close: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        blocks_destination_close: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        // Movimientos generados
        source_movement_id: {
            type: DataTypes.INTEGER
        },
        destination_movement_id: {
            type: DataTypes.INTEGER
        }
    }, {
        tableName: 'finance_cash_transfers',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'transfer_number'] },
            { fields: ['source_register_id'] },
            { fields: ['destination_register_id'] },
            { fields: ['status'] },
            { fields: ['transfer_date'] }
        ]
    });

    FinanceCashTransfer.associate = (models) => {
        FinanceCashTransfer.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCashTransfer.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'source_register_id',
            as: 'sourceRegister'
        });
        FinanceCashTransfer.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'destination_register_id',
            as: 'destinationRegister'
        });
        FinanceCashTransfer.belongsTo(models.FinanceCashRegisterSession, {
            foreignKey: 'source_session_id',
            as: 'sourceSession'
        });
        FinanceCashTransfer.belongsTo(models.FinanceCashRegisterSession, {
            foreignKey: 'destination_session_id',
            as: 'destinationSession'
        });
        FinanceCashTransfer.belongsTo(models.FinancePaymentMethod, {
            foreignKey: 'payment_method_id',
            as: 'paymentMethod'
        });
        FinanceCashTransfer.belongsTo(models.User, {
            foreignKey: 'initiated_by',
            as: 'initiatedByUser'
        });
        FinanceCashTransfer.belongsTo(models.User, {
            foreignKey: 'responded_by',
            as: 'respondedByUser'
        });
    };

    return FinanceCashTransfer;
};
