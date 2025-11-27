/**
 * Modelo PayrollConceptType - Tipos de conceptos de nómina
 * Sistema de Liquidación Parametrizable v3.0
 * SINCRONIZADO con esquema BD real
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollConceptType = sequelize.define('PayrollConceptType', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
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
        affects_gross: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        affects_net: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_taxable: {
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
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 100
        }
    }, {
        tableName: 'payroll_concept_types',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false  // La tabla solo tiene created_at
    });

    PayrollConceptType.associate = (models) => {
        if (models.PayrollTemplateConcept) {
            PayrollConceptType.hasMany(models.PayrollTemplateConcept, {
                foreignKey: 'concept_type_id',
                as: 'templateConcepts'
            });
        }
    };

    return PayrollConceptType;
};
