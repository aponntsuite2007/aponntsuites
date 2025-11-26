/**
 * Modelo PayrollTemplateConcept - Conceptos de una plantilla de liquidación
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollTemplateConcept = sequelize.define('PayrollTemplateConcept', {
        concept_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        template_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_templates',
                key: 'template_id'
            }
        },
        concept_type_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_concept_types',
                key: 'type_id'
            }
        },
        concept_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Código único dentro de la plantilla'
        },
        concept_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        calculation_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'fixed',
            comment: 'fixed, percentage, formula, hours, days'
        },
        fixed_amount: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Monto fijo si calculation_type = fixed'
        },
        percentage_value: {
            type: DataTypes.DECIMAL(8, 4),
            comment: 'Porcentaje si calculation_type = percentage'
        },
        percentage_base: {
            type: DataTypes.STRING(50),
            comment: 'Base para el porcentaje: GROSS_SALARY, BASE_SALARY, etc.'
        },
        formula: {
            type: DataTypes.TEXT,
            comment: 'Fórmula JavaScript si calculation_type = formula'
        },
        min_value: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Valor mínimo (tope inferior)'
        },
        max_value: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Valor máximo (tope superior)'
        },
        applies_to_overtime: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        applies_to_holidays: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        applies_to_absences: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        proportional_to_days: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si se calcula proporcional a días trabajados'
        },
        requires_seniority_months: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Meses de antigüedad requeridos'
        },
        legal_reference: {
            type: DataTypes.STRING(200),
            comment: 'Referencia legal (artículo de ley, CCT, etc.)'
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 100
        },
        show_in_payslip: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si aparece en recibo de sueldo'
        },
        is_taxable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si está sujeto a impuestos'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'payroll_template_concepts',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['template_id'] },
            { fields: ['concept_type_id'] },
            { fields: ['template_id', 'concept_code'], unique: true },
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
