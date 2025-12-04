/**
 * DependencyEvaluation Model
 * Historial de evaluación de dependencias durante liquidación (auditoría)
 * Registra por qué un concepto se aplicó o no
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const DependencyEvaluation = sequelize.define('DependencyEvaluation', {
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
        payroll_run_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'FK a payroll_runs (cuando exista)'
        },
        payroll_period: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'Período: 2024-12 formato YYYY-MM'
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            },
            comment: 'Empleado evaluado'
        },
        concept_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_template_concepts',
                key: 'id'
            }
        },
        dependency_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'company_dependencies',
                key: 'id'
            }
        },
        evaluation_result: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            comment: 'TRUE = cumple, FALSE = no cumple'
        },
        evaluation_details: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Detalles de la evaluación: familiares evaluados, documentos encontrados, etc.'
        },
        action_taken: {
            type: DataTypes.ENUM('APPLIED', 'SKIPPED', 'REDUCED', 'WARNED'),
            allowNull: true,
            comment: 'Qué se hizo con el concepto'
        },
        original_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            comment: 'Monto original del concepto'
        },
        final_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            comment: 'Monto después de aplicar dependencias'
        },
        reduction_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Si hubo reducción, por qué'
        },
        evaluated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'dependency_evaluations',
        timestamps: false,
        underscored: true
    });

    DependencyEvaluation.associate = (models) => {
        DependencyEvaluation.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        DependencyEvaluation.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'employee'
        });

        DependencyEvaluation.belongsTo(models.PayrollTemplateConcept, {
            foreignKey: 'concept_id',
            as: 'concept'
        });

        DependencyEvaluation.belongsTo(models.CompanyDependency, {
            foreignKey: 'dependency_id',
            as: 'dependency'
        });
    };

    return DependencyEvaluation;
};
