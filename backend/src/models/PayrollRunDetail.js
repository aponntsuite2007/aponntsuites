/**
 * Modelo PayrollRunDetail - Detalle de liquidación por empleado
 * Sistema de Liquidación Parametrizable v3.0
 * SINCRONIZADO con esquema BD real
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollRunDetail = sequelize.define('PayrollRunDetail', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        run_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        assignment_id: {
            type: DataTypes.INTEGER
        },
        worked_days: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        worked_hours: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        overtime_50_hours: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        overtime_100_hours: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        night_hours: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        absent_days: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        gross_earnings: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        non_remunerative: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_deductions: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        net_salary: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        employer_contributions: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        earnings_detail: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        deductions_detail: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        employer_detail: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'calculated'
        },
        error_message: {
            type: DataTypes.TEXT
        },
        receipt_number: {
            type: DataTypes.STRING(100)
        },
        receipt_generated_at: {
            type: DataTypes.DATE
        },
        receipt_url: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'payroll_run_details',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    PayrollRunDetail.associate = (models) => {
        if (models.PayrollRun) {
            PayrollRunDetail.belongsTo(models.PayrollRun, {
                foreignKey: 'run_id',
                as: 'payrollRun'
            });
        }

        if (models.User) {
            PayrollRunDetail.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user'
            });
        }

        if (models.UserPayrollAssignment) {
            PayrollRunDetail.belongsTo(models.UserPayrollAssignment, {
                foreignKey: 'assignment_id',
                as: 'assignment'
            });
        }
    };

    return PayrollRunDetail;
};
