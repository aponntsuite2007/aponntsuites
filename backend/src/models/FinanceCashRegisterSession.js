/**
 * Finance Cash Register Session Model
 * Sesiones de caja (apertura/cierre diario)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashRegisterSession = sequelize.define('FinanceCashRegisterSession', {
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
        session_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        session_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        opened_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        closed_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        opened_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        closed_at: {
            type: DataTypes.DATE
        },
        opening_amounts: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {}
        },
        expected_amounts: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        declared_amounts: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        differences: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        total_difference: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_sales: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_collections: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_payments: {
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
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'open',
            validate: {
                isIn: [['open', 'closing', 'pending_transfers', 'closed', 'audited']]
            }
        },
        has_pending_transfers: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        pending_transfer_ids: {
            type: DataTypes.ARRAY(DataTypes.INTEGER),
            defaultValue: []
        },
        requires_approval: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        approved_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        approved_at: {
            type: DataTypes.DATE
        },
        approval_notes: {
            type: DataTypes.TEXT
        },
        opening_notes: {
            type: DataTypes.TEXT
        },
        closing_notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_cash_register_sessions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'session_number'] },
            { fields: ['cash_register_id'] },
            { fields: ['session_date'] },
            { fields: ['status'] }
        ]
    });

    FinanceCashRegisterSession.associate = (models) => {
        FinanceCashRegisterSession.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCashRegisterSession.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'cash_register_id',
            as: 'cashRegister'
        });
        FinanceCashRegisterSession.belongsTo(models.User, {
            foreignKey: 'opened_by',
            as: 'openedByUser'
        });
        FinanceCashRegisterSession.belongsTo(models.User, {
            foreignKey: 'closed_by',
            as: 'closedByUser'
        });
        FinanceCashRegisterSession.hasMany(models.FinanceCashMovement, {
            foreignKey: 'session_id',
            as: 'movements'
        });
        FinanceCashRegisterSession.hasMany(models.FinanceCashCount, {
            foreignKey: 'session_id',
            as: 'counts'
        });
    };

    return FinanceCashRegisterSession;
};
