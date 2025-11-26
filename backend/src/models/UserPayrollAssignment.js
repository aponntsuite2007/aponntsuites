/**
 * Modelo UserPayrollAssignment - Asignación de plantilla y configuración de nómina a usuarios
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserPayrollAssignment = sequelize.define('UserPayrollAssignment', {
        assignment_id: {
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
        template_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_templates',
                key: 'template_id'
            }
        },
        category_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'salary_categories_v2',
                key: 'category_id'
            },
            comment: 'Categoría salarial del convenio'
        },
        branch_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'company_branches',
                key: 'branch_id'
            }
        },
        base_salary: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Salario base del empleado'
        },
        salary_type: {
            type: DataTypes.STRING(20),
            defaultValue: 'monthly',
            comment: 'hourly, daily, monthly'
        },
        bank_name: {
            type: DataTypes.STRING(100)
        },
        bank_account_number: {
            type: DataTypes.STRING(50)
        },
        bank_account_type: {
            type: DataTypes.STRING(20),
            comment: 'savings, checking'
        },
        payment_method: {
            type: DataTypes.STRING(20),
            defaultValue: 'bank_transfer',
            comment: 'bank_transfer, check, cash'
        },
        tax_id: {
            type: DataTypes.STRING(20),
            comment: 'CUIL/CUIT/RUT/RFC según país'
        },
        hire_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de ingreso (para antigüedad)'
        },
        seniority_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha para cálculo de antigüedad (si difiere de hire_date)'
        },
        termination_date: {
            type: DataTypes.DATEONLY
        },
        work_schedule: {
            type: DataTypes.JSONB,
            defaultValue: {
                type: 'full_time',
                hours_per_week: 40,
                days_per_week: 5
            }
        },
        effective_from: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW
        },
        effective_to: {
            type: DataTypes.DATEONLY
        },
        notes: {
            type: DataTypes.TEXT
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'user_payroll_assignment',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['user_id'] },
            { fields: ['template_id'] },
            { fields: ['category_id'] },
            { fields: ['branch_id'] },
            { fields: ['is_active'] },
            { fields: ['user_id', 'effective_from'] }
        ]
    });

    UserPayrollAssignment.associate = (models) => {
        // Pertenece a un usuario
        UserPayrollAssignment.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });

        // Pertenece a una plantilla
        UserPayrollAssignment.belongsTo(models.PayrollTemplate, {
            foreignKey: 'template_id',
            as: 'template'
        });

        // Pertenece a una categoría
        UserPayrollAssignment.belongsTo(models.SalaryCategoryV2, {
            foreignKey: 'category_id',
            as: 'category'
        });

        // Pertenece a una sucursal
        UserPayrollAssignment.belongsTo(models.CompanyBranch, {
            foreignKey: 'branch_id',
            as: 'branch'
        });

        // Tiene muchos overrides de conceptos
        UserPayrollAssignment.hasMany(models.UserPayrollConceptOverride, {
            foreignKey: 'assignment_id',
            as: 'conceptOverrides'
        });
    };

    return UserPayrollAssignment;
};
