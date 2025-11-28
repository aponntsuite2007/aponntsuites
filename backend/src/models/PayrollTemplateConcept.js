/**
 * Modelo PayrollTemplateConcept - Conceptos de una plantilla de liquidación
 * Sistema de Liquidación Parametrizable v3.0
 *
 * ACTUALIZADO: Sincronizado con estructura real de BD (id como PK)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollTemplateConcept = sequelize.define('PayrollTemplateConcept', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        template_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_templates',
                key: 'id'
            }
        },
        concept_type_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'payroll_concept_types',
                key: 'type_id'
            }
        },
        concept_code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Código único dentro de la plantilla'
        },
        concept_name: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        short_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        calculation_type: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: 'fixed',
            comment: 'fixed, percentage, formula, hours, days'
        },
        default_value: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            comment: 'Valor por defecto'
        },
        percentage_base: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Base para el porcentaje: GROSS_SALARY, BASE_SALARY, etc.'
        },
        formula: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Fórmula JavaScript si calculation_type = formula'
        },
        min_value: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            comment: 'Valor mínimo (tope inferior)'
        },
        max_value: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            comment: 'Valor máximo (tope superior)'
        },
        cap_value: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            comment: 'Tope máximo aplicable'
        },
        applies_to_hourly: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        applies_to_monthly: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si es obligatorio por ley'
        },
        is_visible_receipt: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si aparece en recibo de sueldo'
        },
        is_editable_per_user: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si se puede personalizar por usuario'
        },
        employee_contribution_rate: {
            type: DataTypes.DECIMAL(8, 4),
            allowNull: true,
            comment: 'Tasa de aporte del empleado'
        },
        employer_contribution_rate: {
            type: DataTypes.DECIMAL(8, 4),
            allowNull: true,
            comment: 'Tasa de contribución patronal'
        },
        legal_reference: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Referencia legal (artículo de ley, CCT, etc.)'
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 100
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        entity_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Entidad receptora (AFIP, Sindicato, etc)'
        },
        entity_account_code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Código de cuenta de la entidad'
        }
    }, {
        tableName: 'payroll_template_concepts',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['template_id'] },
            { fields: ['concept_type_id'] },
            { fields: ['display_order'] },
            { fields: ['is_active'] }
        ]
    });

    PayrollTemplateConcept.associate = (models) => {
        // Pertenece a una plantilla
        PayrollTemplateConcept.belongsTo(models.PayrollTemplate, {
            foreignKey: 'template_id',
            as: 'template'
        });

        // Pertenece a un tipo de concepto
        PayrollTemplateConcept.belongsTo(models.PayrollConceptType, {
            foreignKey: 'concept_type_id',
            as: 'conceptType'
        });

        // Tiene muchos overrides de usuario
        PayrollTemplateConcept.hasMany(models.UserPayrollConceptOverride, {
            foreignKey: 'concept_id',
            as: 'userOverrides'
        });
    };

    return PayrollTemplateConcept;
};
