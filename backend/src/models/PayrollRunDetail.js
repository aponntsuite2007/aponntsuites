/**
 * Modelo PayrollRunDetail - Detalle de liquidación por empleado
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollRunDetail = sequelize.define('PayrollRunDetail', {
        detail_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        run_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_runs',
                key: 'run_id'
            }
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        assignment_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'user_payroll_assignment',
                key: 'assignment_id'
            }
        },
        base_salary: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        days_worked: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        hours_regular: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        hours_overtime_50: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        hours_overtime_100: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        hours_night: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        hours_holiday: {
            type: DataTypes.DECIMAL(8, 2),
            defaultValue: 0
        },
        days_absent: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        days_vacation: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        days_sick_leave: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        gross_salary: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_earnings: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_deductions: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_non_remunerative: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        net_salary: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        employer_cost: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'calculated',
            comment: 'calculated, reviewed, approved, paid, error'
        },
        error_message: {
            type: DataTypes.TEXT
        },
        calculation_log: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Log detallado del cálculo'
        },
        payslip_generated: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        payslip_url: {
            type: DataTypes.STRING(500)
        }
    }, {
        tableName: 'payroll_run_details',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['run_id'] },
            { fields: ['user_id'] },
            { fields: ['run_id', 'user_id'], unique: true },
            { fields: ['status'] }
        ]
    });

    PayrollRunDetail.associate = (models) => {
        // Pertenece a una corrida
        PayrollRunDetail.belongsTo(models.PayrollRun, {
            foreignKey: 'run_id',
            as: 'payrollRun'
        });

        // Pertenece a un usuario
        PayrollRunDetail.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });

        // Pertenece a una asignación
        PayrollRunDetail.belongsTo(models.UserPayrollAssignment, {
            foreignKey: 'assignment_id',
            as: 'assignment'
        });

        // Tiene muchos conceptos detallados
        PayrollRunDetail.hasMany(models.PayrollRunConceptDetail, {
            foreignKey: 'detail_id',
            as: 'concepts'
        });
    };

    return PayrollRunDetail;
};
