/**
 * Modelo UserPayrollConceptOverride - Sobrescrituras de conceptos por usuario
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserPayrollConceptOverride = sequelize.define('UserPayrollConceptOverride', {
        override_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        assignment_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'user_payroll_assignment',
                key: 'assignment_id'
            }
        },
        concept_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_template_concepts',
                key: 'concept_id'
            }
        },
        override_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'replace',
            comment: 'replace, add, multiply, disable'
        },
        fixed_amount: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Monto fijo override'
        },
        percentage_value: {
            type: DataTypes.DECIMAL(8, 4),
            comment: 'Porcentaje override'
        },
        is_remunerative: {
            type: DataTypes.BOOLEAN,
            comment: 'Override del flag remunerativo'
        },
        reason: {
            type: DataTypes.TEXT,
            comment: 'Motivo del override'
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
        effective_from: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW
        },
        effective_to: {
            type: DataTypes.DATEONLY
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'user_payroll_concept_overrides',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['assignment_id'] },
            { fields: ['concept_id'] },
            { fields: ['is_active'] },
            { fields: ['assignment_id', 'concept_id', 'effective_from'] }
        ]
    });

    UserPayrollConceptOverride.associate = (models) => {
        // Pertenece a una asignación
        UserPayrollConceptOverride.belongsTo(models.UserPayrollAssignment, {
            foreignKey: 'assignment_id',
            as: 'assignment'
        });

        // Pertenece a un concepto
        UserPayrollConceptOverride.belongsTo(models.PayrollTemplateConcept, {
            foreignKey: 'concept_id',
            as: 'concept'
        });

        // Aprobado por usuario
        UserPayrollConceptOverride.belongsTo(models.User, {
            foreignKey: 'approved_by',
            as: 'approver'
        });
    };

    return UserPayrollConceptOverride;
};
