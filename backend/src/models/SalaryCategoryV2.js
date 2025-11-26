/**
 * Modelo SalaryCategoryV2 - Categorías salariales por convenio
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SalaryCategoryV2 = sequelize.define('SalaryCategoryV2', {
        category_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        agreement_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'labor_agreements_v2',
                key: 'agreement_id'
            }
        },
        category_code: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        category_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        base_salary: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Salario básico de la categoría'
        },
        hourly_rate: {
            type: DataTypes.DECIMAL(10, 2),
            comment: 'Valor hora calculado'
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: 'Nivel dentro de la categoría'
        },
        requires_degree: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        min_experience_years: {
            type: DataTypes.INTEGER,
            defaultValue: 0
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
        tableName: 'salary_categories_v2',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['agreement_id'] },
            { fields: ['agreement_id', 'category_code'], unique: true },
            { fields: ['is_active'] }
        ]
    });

    SalaryCategoryV2.associate = (models) => {
        // Pertenece a un convenio
        SalaryCategoryV2.belongsTo(models.LaborAgreementV2, {
            foreignKey: 'agreement_id',
            as: 'laborAgreement'
        });

        // Tiene muchas asignaciones de usuarios
        SalaryCategoryV2.hasMany(models.UserPayrollAssignment, {
            foreignKey: 'category_id',
            as: 'userAssignments'
        });
    };

    return SalaryCategoryV2;
};
