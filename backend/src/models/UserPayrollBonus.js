/**
 * Modelo UserPayrollBonus - Bonificaciones adicionales por usuario
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserPayrollBonus = sequelize.define('UserPayrollBonus', {
        bonus_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'company_id'
            }
        },
        bonus_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        bonus_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        bonus_type: {
            type: DataTypes.STRING(20),
            defaultValue: 'fixed',
            comment: 'fixed, percentage, formula'
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Monto si es fixed'
        },
        percentage: {
            type: DataTypes.DECIMAL(8, 4),
            comment: 'Porcentaje si es percentage'
        },
        percentage_base: {
            type: DataTypes.STRING(50),
            comment: 'Base para porcentaje'
        },
        is_remunerative: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_taxable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        frequency: {
            type: DataTypes.STRING(20),
            defaultValue: 'monthly',
            comment: 'one_time, monthly, quarterly, yearly'
        },
        payment_month: {
            type: DataTypes.INTEGER,
            comment: 'Mes de pago si frequency = yearly (1-12)'
        },
        effective_from: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW
        },
        effective_to: {
            type: DataTypes.DATEONLY
        },
        reason: {
            type: DataTypes.TEXT
        },
        approved_by: {
            type: DataTypes.UUID,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        approved_at: {
            type: DataTypes.DATE
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'user_payroll_bonuses',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['user_id'] },
            { fields: ['company_id'] },
            { fields: ['is_active'] },
            { fields: ['frequency'] },
            { fields: ['user_id', 'effective_from'] }
        ]
    });

    UserPayrollBonus.associate = (models) => {
        // Pertenece a un usuario
        UserPayrollBonus.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });

        // Pertenece a una empresa
        UserPayrollBonus.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        // Aprobado por usuario
        UserPayrollBonus.belongsTo(models.User, {
            foreignKey: 'approved_by',
            as: 'approver'
        });
    };

    return UserPayrollBonus;
};
