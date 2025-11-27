/**
 * Modelo PayrollRun - Ejecuciones de liquidación
 * Sistema de Liquidación Parametrizable v3.0
 * SINCRONIZADO con esquema BD real
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollRun = sequelize.define('PayrollRun', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        branch_id: {
            type: DataTypes.INTEGER
        },
        run_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        run_name: {
            type: DataTypes.STRING(200)
        },
        period_year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        period_month: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        period_half: {
            type: DataTypes.INTEGER
        },
        period_week: {
            type: DataTypes.INTEGER
        },
        period_start: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        period_end: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        payment_date: {
            type: DataTypes.DATEONLY
        },
        total_employees: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        total_gross: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0
        },
        total_deductions: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0
        },
        total_net: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0
        },
        total_employer_cost: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'draft'
        },
        approved_by: {
            type: DataTypes.UUID
        },
        approved_at: {
            type: DataTypes.DATE
        },
        paid_at: {
            type: DataTypes.DATE
        },
        notes: {
            type: DataTypes.TEXT
        },
        created_by: {
            type: DataTypes.UUID
        }
    }, {
        tableName: 'payroll_runs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    PayrollRun.associate = (models) => {
        if (models.Company) {
            PayrollRun.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }
        if (models.CompanyBranch) {
            PayrollRun.belongsTo(models.CompanyBranch, {
                foreignKey: 'branch_id',
                as: 'branch'
            });
        }
        if (models.User) {
            PayrollRun.belongsTo(models.User, {
                foreignKey: 'created_by',
                as: 'creator'
            });
            PayrollRun.belongsTo(models.User, {
                foreignKey: 'approved_by',
                as: 'approver'
            });
        }
        if (models.PayrollRunDetail) {
            PayrollRun.hasMany(models.PayrollRunDetail, {
                foreignKey: 'run_id',
                as: 'details'
            });
        }
    };

    return PayrollRun;
};
