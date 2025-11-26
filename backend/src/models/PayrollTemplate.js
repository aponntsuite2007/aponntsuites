/**
 * Modelo PayrollTemplate - Plantillas de liquidación
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollTemplate = sequelize.define('PayrollTemplate', {
        template_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'company_id'
            }
        },
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_countries',
                key: 'country_id'
            }
        },
        agreement_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'labor_agreements_v2',
                key: 'agreement_id'
            },
            comment: 'Convenio colectivo aplicable'
        },
        template_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        template_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        pay_frequency: {
            type: DataTypes.STRING(20),
            defaultValue: 'monthly',
            comment: 'weekly, biweekly, monthly'
        },
        calculation_base: {
            type: DataTypes.STRING(20),
            defaultValue: 'monthly',
            comment: 'hourly, daily, monthly'
        },
        work_hours_day: {
            type: DataTypes.DECIMAL(4, 2),
            defaultValue: 8.00
        },
        work_days_week: {
            type: DataTypes.INTEGER,
            defaultValue: 5
        },
        overtime_calculation: {
            type: DataTypes.JSONB,
            defaultValue: {
                threshold_daily: 8,
                threshold_weekly: 40,
                multiplier_50: 1.5,
                multiplier_100: 2.0
            }
        },
        rounding_rules: {
            type: DataTypes.JSONB,
            defaultValue: {
                hours: 2,
                amounts: 2,
                round_method: 'half_up'
            }
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        effective_from: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW
        },
        effective_to: {
            type: DataTypes.DATEONLY,
            comment: 'Null = vigente'
        },
        is_default: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Plantilla por defecto para nuevos empleados'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        created_by: {
            type: DataTypes.UUID,
            references: {
                model: 'users',
                key: 'user_id'
            }
        }
    }, {
        tableName: 'payroll_templates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id'] },
            { fields: ['country_id'] },
            { fields: ['agreement_id'] },
            { fields: ['company_id', 'template_code'], unique: true },
            { fields: ['is_default'] },
            { fields: ['is_active'] }
        ]
    });

    PayrollTemplate.associate = (models) => {
        // Pertenece a una empresa
        PayrollTemplate.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        // Pertenece a un país
        PayrollTemplate.belongsTo(models.PayrollCountry, {
            foreignKey: 'country_id',
            as: 'country'
        });

        // Pertenece a un convenio
        PayrollTemplate.belongsTo(models.LaborAgreementV2, {
            foreignKey: 'agreement_id',
            as: 'laborAgreement'
        });

        // Tiene muchos conceptos
        PayrollTemplate.hasMany(models.PayrollTemplateConcept, {
            foreignKey: 'template_id',
            as: 'concepts'
        });

        // Tiene muchas asignaciones a usuarios
        PayrollTemplate.hasMany(models.UserPayrollAssignment, {
            foreignKey: 'template_id',
            as: 'userAssignments'
        });

        // Tiene muchas ejecuciones
        PayrollTemplate.hasMany(models.PayrollRun, {
            foreignKey: 'template_id',
            as: 'payrollRuns'
        });

        // Usuario creador
        PayrollTemplate.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });
    };

    return PayrollTemplate;
};
