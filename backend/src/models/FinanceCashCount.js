/**
 * Finance Cash Count Model
 * Arqueos de caja (apertura, cierre, sorpresa, auditoría)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashCount = sequelize.define('FinanceCashCount', {
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
        count_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [['opening', 'closing', 'audit', 'surprise']]
            }
        },
        count_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        counted_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        supervised_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        // Detalle de conteo efectivo por denominación
        cash_denominations: {
            type: DataTypes.JSONB,
            defaultValue: {}
            // {"bills": {"1000": 5, "500": 10}, "coins": {"50": 10, "10": 20}}
        },
        // Totales por medio de pago
        totals_by_method: {
            type: DataTypes.JSONB,
            defaultValue: {}
            // {"CASH": 25000, "DEBIT": 150000, "CHECK": 50000}
        },
        // Cheques detallados
        checks_detail: {
            type: DataTypes.JSONB,
            defaultValue: []
            // [{"number": "001", "bank": "Galicia", "amount": 50000, "due_date": "2025-02-01"}]
        },
        // Vouchers/Comprobantes
        vouchers_detail: {
            type: DataTypes.JSONB,
            defaultValue: []
            // [{"type": "DEBIT", "batch": "001", "count": 15, "amount": 150000}]
        },
        total_declared: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        total_expected: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        difference: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        difference_percent: {
            type: DataTypes.DECIMAL(5, 2)
        },
        difference_justified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        difference_reason: {
            type: DataTypes.TEXT
        },
        difference_approved_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_cash_counts',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['session_id', 'count_type'] }
        ]
    });

    FinanceCashCount.associate = (models) => {
        FinanceCashCount.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCashCount.belongsTo(models.FinanceCashRegisterSession, {
            foreignKey: 'session_id',
            as: 'session'
        });
        FinanceCashCount.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'cash_register_id',
            as: 'cashRegister'
        });
        FinanceCashCount.belongsTo(models.User, {
            foreignKey: 'counted_by',
            as: 'countedByUser'
        });
        FinanceCashCount.belongsTo(models.User, {
            foreignKey: 'supervised_by',
            as: 'supervisedByUser'
        });
    };

    return FinanceCashCount;
};
