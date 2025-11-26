/**
 * Modelo PayrollConceptType - Tipos de conceptos de nómina
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollConceptType = sequelize.define('PayrollConceptType', {
        type_id: {
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
        type_name_es: {
            type: DataTypes.STRING(100),
            comment: 'Nombre en español'
        },
        description: {
            type: DataTypes.TEXT
        },
        is_earning: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si es un ingreso (vs deducción)'
        },
        is_deduction: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si es una deducción'
        },
        is_remunerative: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si es remunerativo (aplican deducciones)'
        },
        is_employer_cost: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si es costo empleador (no aparece en recibo)'
        },
        affects_net_pay: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si afecta el sueldo neto'
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 100,
            comment: 'Orden de visualización'
        },
        icon: {
            type: DataTypes.STRING(50),
            comment: 'Icono para UI'
        },
        color_class: {
            type: DataTypes.STRING(50),
            comment: 'Clase CSS de color'
        }
    }, {
        tableName: 'payroll_concept_types',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['type_code'], unique: true },
            { fields: ['is_earning'] },
            { fields: ['is_deduction'] },
            { fields: ['display_order'] }
        ]
    });

    PayrollConceptType.associate = (models) => {
        // Tiene muchos conceptos de plantilla
        PayrollConceptType.hasMany(models.PayrollTemplateConcept, {
            foreignKey: 'concept_type_id',
            as: 'templateConcepts'
        });
    };

    return PayrollConceptType;
};
