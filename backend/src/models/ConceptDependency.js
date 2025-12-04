/**
 * ConceptDependency Model
 * Vinculación entre conceptos de liquidación y sus dependencias
 * Un concepto puede tener múltiples dependencias que debe cumplir
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ConceptDependency = sequelize.define('ConceptDependency', {
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
        concept_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_template_concepts',
                key: 'id'
            },
            comment: 'El concepto de liquidación'
        },
        dependency_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'company_dependencies',
                key: 'id'
            },
            comment: 'La dependencia que debe cumplir'
        },
        on_failure: {
            type: DataTypes.ENUM('SKIP', 'REDUCE_PROPORTIONAL', 'WARN_ONLY'),
            defaultValue: 'SKIP',
            comment: 'Qué hacer si no se cumple: SKIP=no aplicar, REDUCE=proporcional, WARN=advertir'
        },
        failure_message: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Mensaje si falla: "Falta {dependency_name} para {family_member}"'
        },
        multiplier_mode: {
            type: DataTypes.ENUM('NONE', 'PER_VALID', 'FIXED'),
            defaultValue: 'NONE',
            comment: 'NONE=binario, PER_VALID=por cada válido, FIXED=monto fijo'
        },
        evaluation_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Orden de evaluación (menor = primero)'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'concept_dependencies',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['concept_id', 'dependency_id']
            }
        ]
    });

    ConceptDependency.associate = (models) => {
        ConceptDependency.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        ConceptDependency.belongsTo(models.PayrollTemplateConcept, {
            foreignKey: 'concept_id',
            as: 'concept'
        });

        ConceptDependency.belongsTo(models.CompanyDependency, {
            foreignKey: 'dependency_id',
            as: 'dependency'
        });
    };

    return ConceptDependency;
};
