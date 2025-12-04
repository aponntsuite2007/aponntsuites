/**
 * Modelo PayrollConceptType - Tipos de conceptos de nómina
 * Sistema de Liquidación Parametrizable v5.0 UNIVERSAL
 *
 * ARQUITECTURA:
 * - 4 clasificaciones base universales (GROSS_EARNING, EMPLOYEE_DEDUCTION, EMPLOYER_CONTRIBUTION, INFORMATIVE)
 * - Comportamiento parametrizable (is_remunerative, is_pre_tax, is_mandatory, etc.)
 * - Tasas configurables por país (employee_rate, employer_rate)
 * - Sistema de ayuda contextual integrado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollConceptType = sequelize.define('PayrollConceptType', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // === IDENTIFICACIÓN ===
        type_code: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true
        },
        type_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },

        // === SCOPE (País/Empresa) ===
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'payroll_countries', key: 'id' },
            comment: 'NULL = universal, value = específico de país'
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'companies', key: 'company_id' },
            comment: 'NULL = global, value = específico de empresa'
        },

        // === CLASIFICACIÓN BASE ===
        classification_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'payroll_concept_classifications', key: 'id' },
            comment: 'FK a clasificación universal (GROSS_EARNING, EMPLOYEE_DEDUCTION, etc.)'
        },

        // === COMPORTAMIENTO FISCAL Y LEGAL ===
        is_remunerative: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Cuenta como parte de la remuneración para otros cálculos'
        },
        is_taxable: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Sujeto a impuesto a las ganancias/renta'
        },
        is_pre_tax: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Se descuenta ANTES del cálculo de impuestos'
        },
        is_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Es obligatorio por ley'
        },
        is_social_security_base: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Cuenta para base de seguridad social'
        },

        // === PROPORCIONALIDAD ===
        is_proportional_to_time: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Se prorratea por días/horas trabajadas'
        },
        is_one_time: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Es un pago único (no recurrente)'
        },

        // === LEGACY (mantener para compatibilidad) ===
        affects_gross: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        affects_net: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_deduction: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_employer_cost: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        // === TASAS POR DEFECTO ===
        default_employee_rate: {
            type: DataTypes.DECIMAL(8, 4),
            defaultValue: 0,
            comment: 'Porcentaje por defecto que paga el empleado'
        },
        default_employer_rate: {
            type: DataTypes.DECIMAL(8, 4),
            defaultValue: 0,
            comment: 'Porcentaje por defecto que paga el empleador'
        },
        rate_ceiling: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            comment: 'Tope máximo de la tasa'
        },

        // === BASE DE CÁLCULO ===
        calculation_base_type: {
            type: DataTypes.STRING(30),
            defaultValue: 'GROSS',
            comment: 'Base para calcular: GROSS, NET, BASIC, TAXABLE, SOCIAL_SECURITY_BASE, CUSTOM'
        },

        // === SISTEMA DE AYUDA CONTEXTUAL ===
        help_tooltip: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'Texto corto de ayuda (tooltip)'
        },
        help_detailed: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Explicación detallada (modal de ayuda)'
        },
        legal_reference: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Referencia legal (ley, artículo, decreto)'
        },
        examples_by_country: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Ejemplos por país: {"ARG": "Ej: 11%", "MEX": "Ej: 1.125%"}'
        },

        // === UI ===
        icon_name: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Nombre del ícono para UI'
        },
        color_hex: {
            type: DataTypes.STRING(7),
            allowNull: true,
            comment: 'Color para badges/etiquetas'
        },
        names_by_locale: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Nombre localizado: {"es": "...", "en": "...", "pt": "..."}'
        },

        // === ORDEN Y ESTADO ===
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 100
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'payroll_concept_types',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    PayrollConceptType.associate = (models) => {
        // Relación con clasificación
        if (models.PayrollConceptClassification) {
            PayrollConceptType.belongsTo(models.PayrollConceptClassification, {
                foreignKey: 'classification_id',
                as: 'classification'
            });
        }

        // Relación con país
        if (models.PayrollCountry) {
            PayrollConceptType.belongsTo(models.PayrollCountry, {
                foreignKey: 'country_id',
                as: 'country'
            });
        }

        // Relación con empresa
        if (models.Company) {
            PayrollConceptType.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }

        // Conceptos de plantilla que usan este tipo
        if (models.PayrollTemplateConcept) {
            PayrollConceptType.hasMany(models.PayrollTemplateConcept, {
                foreignKey: 'concept_type_id',
                as: 'templateConcepts'
            });
        }
    };

    return PayrollConceptType;
};
