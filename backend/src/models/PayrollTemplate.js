/**
 * Modelo PayrollTemplate - Plantillas de liquidación
 * Sistema de Liquidación Parametrizable v3.0
 * SINCRONIZADO con esquema BD real (29 columnas)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollTemplate = sequelize.define('PayrollTemplate', {
        id: {
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
            allowNull: true,
            references: {
                model: 'payroll_countries',
                key: 'id'
            }
        },
        branch_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'company_branches',
                key: 'id'
            }
        },
        labor_agreement_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'labor_agreements_v2',
                key: 'id'
            }
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
            type: DataTypes.TEXT,
            allowNull: true
        },
        pay_frequency: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'monthly',
            comment: 'weekly, biweekly, monthly'
        },
        calculation_basis: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'monthly',
            comment: 'hourly, daily, monthly'
        },
        work_hours_per_day: {
            type: DataTypes.DECIMAL(4, 2),
            allowNull: true,
            defaultValue: 8.00
        },
        work_days_per_week: {
            type: DataTypes.DECIMAL(3, 1),
            allowNull: true,
            defaultValue: 5
        },
        work_hours_per_month: {
            type: DataTypes.DECIMAL(6, 2),
            allowNull: true,
            defaultValue: 200
        },
        overtime_50_after_hours: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 8
        },
        overtime_100_after_hours: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 12
        },
        night_shift_start: {
            type: DataTypes.TIME,
            allowNull: true
        },
        night_shift_end: {
            type: DataTypes.TIME,
            allowNull: true
        },
        round_to_cents: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true
        },
        round_method: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: 'half_up'
        },
        receipt_header: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        receipt_legal_text: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        receipt_footer: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        version: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 1
        },
        is_current_version: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true
        },
        parent_template_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'payroll_templates',
                key: 'id'
            }
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
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
            { fields: ['labor_agreement_id'] },
            { fields: ['company_id', 'template_code'], unique: true },
            { fields: ['is_active'] }
        ]
    });

    PayrollTemplate.associate = (models) => {
        // Pertenece a una empresa
        if (models.Company) {
            PayrollTemplate.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }

        // Pertenece a un país
        if (models.PayrollCountry) {
            PayrollTemplate.belongsTo(models.PayrollCountry, {
                foreignKey: 'country_id',
                as: 'country'
            });
        }

        // Pertenece a una sucursal
        if (models.CompanyBranch) {
            PayrollTemplate.belongsTo(models.CompanyBranch, {
                foreignKey: 'branch_id',
                as: 'branch'
            });
        }

        // Pertenece a un convenio colectivo (IMPORTANTE para config salarial)
        if (models.LaborAgreementV2) {
            PayrollTemplate.belongsTo(models.LaborAgreementV2, {
                foreignKey: 'labor_agreement_id',
                as: 'laborAgreement'
            });
        }

        // Tiene muchos conceptos
        if (models.PayrollTemplateConcept) {
            PayrollTemplate.hasMany(models.PayrollTemplateConcept, {
                foreignKey: 'template_id',
                as: 'concepts'
            });
        }

        // Versiones (self-referential para versionamiento)
        PayrollTemplate.belongsTo(PayrollTemplate, {
            foreignKey: 'parent_template_id',
            as: 'parentTemplate'
        });
        PayrollTemplate.hasMany(PayrollTemplate, {
            foreignKey: 'parent_template_id',
            as: 'childVersions'
        });

        // Usuario creador
        if (models.User) {
            PayrollTemplate.belongsTo(models.User, {
                foreignKey: 'created_by',
                as: 'creator'
            });
        }
    };

    return PayrollTemplate;
};
