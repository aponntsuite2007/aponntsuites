/**
 * Modelo LaborAgreementV2 - Convenios colectivos de trabajo
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const LaborAgreementV2 = sequelize.define('LaborAgreementV2', {
        agreement_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_countries',
                key: 'country_id'
            }
        },
        agreement_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Ej: CCT-130/75, CCT-501/07'
        },
        agreement_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        legal_citation: {
            type: DataTypes.TEXT,
            comment: 'Referencia legal completa'
        },
        industry_sector: {
            type: DataTypes.STRING(100),
            comment: 'Sector/Industria que cubre'
        },
        union_name: {
            type: DataTypes.STRING(200),
            comment: 'Sindicato representante'
        },
        employer_association: {
            type: DataTypes.STRING(200),
            comment: 'Cámara/Asociación empresarial'
        },
        effective_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de entrada en vigencia'
        },
        expiration_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de vencimiento (null = vigente)'
        },
        base_salary_calculation: {
            type: DataTypes.STRING(20),
            defaultValue: 'monthly',
            comment: 'hourly, daily, monthly'
        },
        work_hours_week: {
            type: DataTypes.DECIMAL(4, 2),
            defaultValue: 40.00
        },
        vacation_days_formula: {
            type: DataTypes.TEXT,
            comment: 'Fórmula para calcular días de vacaciones'
        },
        seniority_bonus_formula: {
            type: DataTypes.TEXT,
            comment: 'Fórmula para antigüedad'
        },
        settings: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Configuraciones específicas del convenio'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'labor_agreements_v2',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['country_id'] },
            { fields: ['country_id', 'agreement_code'], unique: true },
            { fields: ['industry_sector'] },
            { fields: ['is_active'] }
        ]
    });

    LaborAgreementV2.associate = (models) => {
        // Pertenece a un país
        LaborAgreementV2.belongsTo(models.PayrollCountry, {
            foreignKey: 'country_id',
            as: 'country'
        });

        // Tiene muchas plantillas
        LaborAgreementV2.hasMany(models.PayrollTemplate, {
            foreignKey: 'agreement_id',
            as: 'templates'
        });

        // Tiene muchas categorías salariales
        LaborAgreementV2.hasMany(models.SalaryCategoryV2, {
            foreignKey: 'agreement_id',
            as: 'categories'
        });
    };

    return LaborAgreementV2;
};
