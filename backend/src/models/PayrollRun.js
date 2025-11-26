/**
 * Modelo PayrollRun - Ejecuciones de liquidación
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollRun = sequelize.define('PayrollRun', {
        run_id: {
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
        branch_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'company_branches',
                key: 'branch_id'
            }
        },
        template_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'payroll_templates',
                key: 'template_id'
            }
        },
        run_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Código único de la corrida'
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
            allowNull: false,
            comment: '1-12'
        },
        period_start: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        period_end: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        pay_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de pago'
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'draft',
            comment: 'draft, processing, completed, approved, paid, cancelled'
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
        processing_started_at: {
            type: DataTypes.DATE
        },
        processing_completed_at: {
            type: DataTypes.DATE
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
        notes: {
            type: DataTypes.TEXT
        },
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        created_by: {
            type: DataTypes.UUID,
            references: {
                model: 'users',
                key: 'user_id'
            }
        }
    }, {
        tableName: 'payroll_runs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id'] },
            { fields: ['branch_id'] },
            { fields: ['template_id'] },
            { fields: ['company_id', 'run_code'], unique: true },
            { fields: ['period_year', 'period_month'] },
            { fields: ['status'] }
        ]
    });

    PayrollRun.associate = (models) => {
        // Pertenece a una empresa
        PayrollRun.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        // Pertenece a una sucursal
        PayrollRun.belongsTo(models.CompanyBranch, {
            foreignKey: 'branch_id',
            as: 'branch'
        });

        // Pertenece a una plantilla
        PayrollRun.belongsTo(models.PayrollTemplate, {
            foreignKey: 'template_id',
            as: 'template'
        });

        // Usuario creador
        PayrollRun.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });

        // Usuario aprobador
        PayrollRun.belongsTo(models.User, {
            foreignKey: 'approved_by',
            as: 'approver'
        });

        // Tiene muchos detalles por empleado
        PayrollRun.hasMany(models.PayrollRunDetail, {
            foreignKey: 'run_id',
            as: 'details'
        });
    };

    return PayrollRun;
};
