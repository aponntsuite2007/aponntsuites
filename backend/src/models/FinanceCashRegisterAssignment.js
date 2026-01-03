/**
 * Finance Cash Register Assignment Model
 * Asignación de usuarios a cajas
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashRegisterAssignment = sequelize.define('FinanceCashRegisterAssignment', {
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
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        assignment_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [['primary', 'backup', 'supervisor']]
            }
        },
        can_open: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        can_close: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        can_transfer_out: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        can_transfer_in: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        can_void: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        can_view_other_sessions: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        max_void_amount: {
            type: DataTypes.DECIMAL(15, 2)
        },
        valid_from: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW
        },
        valid_until: {
            type: DataTypes.DATEONLY
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        assigned_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_cash_register_assignments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['cash_register_id', 'user_id', 'assignment_type'] }
        ]
    });

    FinanceCashRegisterAssignment.associate = (models) => {
        FinanceCashRegisterAssignment.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCashRegisterAssignment.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'cash_register_id',
            as: 'cashRegister'
        });
        FinanceCashRegisterAssignment.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    return FinanceCashRegisterAssignment;
};
