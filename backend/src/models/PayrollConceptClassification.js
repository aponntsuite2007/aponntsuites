/**
 * Modelo PayrollConceptClassification - Clasificaciones base universales
 * Sistema de Liquidación Parametrizable v5.0
 *
 * Las 4 clasificaciones fundamentales (inmutables):
 * 1. GROSS_EARNING      - Suma al bruto del empleado (+1)
 * 2. EMPLOYEE_DEDUCTION - Resta del sueldo del empleado (-1)
 * 3. EMPLOYER_CONTRIBUTION - Paga el empleador, no afecta sueldo empleado (0)
 * 4. INFORMATIVE        - Solo informativo, sin efecto monetario (0)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollConceptClassification = sequelize.define('PayrollConceptClassification', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        classification_code: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true
        },

        classification_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        // Descripciones multi-idioma
        descriptions: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Descripciones localizadas: {"en": "...", "es": "...", "pt": "..."}'
        },

        // Efecto en la liquidación
        sign: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '+1 = suma, -1 = resta, 0 = sin efecto monetario'
        },

        affects_employee_net: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Afecta el neto del empleado'
        },

        affects_employer_cost: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Afecta el costo del empleador'
        },

        // Orden de cálculo
        calculation_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Orden en que se calculan (1=earnings, 2=deductions, 3=employer, 4=info)'
        },

        is_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si es del sistema (no editable)'
        }
    }, {
        tableName: 'payroll_concept_classifications',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    PayrollConceptClassification.associate = (models) => {
        // Tipos de concepto que usan esta clasificación
        if (models.PayrollConceptType) {
            PayrollConceptClassification.hasMany(models.PayrollConceptType, {
                foreignKey: 'classification_id',
                as: 'conceptTypes'
            });
        }
    };

    return PayrollConceptClassification;
};
