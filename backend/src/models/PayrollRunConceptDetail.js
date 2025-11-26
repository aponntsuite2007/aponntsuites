/**
 * Modelo PayrollRunConceptDetail - Detalle de cada concepto calculado
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollRunConceptDetail = sequelize.define('PayrollRunConceptDetail', {
        concept_detail_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        detail_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_run_details',
                key: 'detail_id'
            }
        },
        concept_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'payroll_template_concepts',
                key: 'concept_id'
            }
        },
        concept_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        concept_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        concept_type: {
            type: DataTypes.STRING(30),
            comment: 'EARNING, DEDUCTION, NON_REMUN, EMPLOYER'
        },
        calculation_type: {
            type: DataTypes.STRING(20),
            comment: 'fixed, percentage, formula, hours, days'
        },
        base_amount: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Monto base usado para el cálculo'
        },
        rate: {
            type: DataTypes.DECIMAL(10, 4),
            comment: 'Tasa/porcentaje aplicado'
        },
        quantity: {
            type: DataTypes.DECIMAL(10, 2),
            comment: 'Cantidad (horas, días, unidades)'
        },
        calculated_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        is_remunerative: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_taxable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_override: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si viene de un override de usuario'
        },
        is_bonus: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si viene de bonificación adicional'
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 100
        },
        show_in_payslip: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        calculation_details: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Detalles del cálculo para auditoría'
        }
    }, {
        tableName: 'payroll_run_concept_details',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['detail_id'] },
            { fields: ['concept_id'] },
            { fields: ['concept_type'] },
            { fields: ['detail_id', 'concept_code'] }
        ]
    });

    PayrollRunConceptDetail.associate = (models) => {
        // Pertenece a un detalle de corrida
        PayrollRunConceptDetail.belongsTo(models.PayrollRunDetail, {
            foreignKey: 'detail_id',
            as: 'runDetail'
        });

        // Pertenece a un concepto de plantilla (opcional, puede ser bonus)
        PayrollRunConceptDetail.belongsTo(models.PayrollTemplateConcept, {
            foreignKey: 'concept_id',
            as: 'templateConcept'
        });
    };

    return PayrollRunConceptDetail;
};
