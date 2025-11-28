/**
 * Modelo LaborAgreementV2 - Convenios colectivos de trabajo
 * Sistema de Liquidación Parametrizable v3.0
 *
 * ACTUALIZADO: Sincronizado con estructura real de BD (id, code, name, etc)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const LaborAgreementV2 = sequelize.define('LaborAgreementV2', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'payroll_countries',
                key: 'country_id'
            }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Ej: CCT-130/75, CCT-501/07'
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        short_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        industry: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Sector/Industria que cubre'
        },
        legal_references: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Referencias legales'
        },
        effective_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de entrada en vigencia'
        },
        expiration_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de vencimiento (null = vigente)'
        },
        base_work_hours_weekly: {
            type: DataTypes.DECIMAL(4, 2),
            defaultValue: 40.00
        },
        base_work_hours_daily: {
            type: DataTypes.DECIMAL(4, 2),
            defaultValue: 8.00
        },
        overtime_threshold_daily: {
            type: DataTypes.DECIMAL(4, 2),
            defaultValue: 8.00
        },
        overtime_50_multiplier: {
            type: DataTypes.DECIMAL(4, 2),
            defaultValue: 1.50
        },
        overtime_100_multiplier: {
            type: DataTypes.DECIMAL(4, 2),
            defaultValue: 2.00
        },
        night_shift_multiplier: {
            type: DataTypes.DECIMAL(4, 2),
            defaultValue: 1.00
        },
        vacation_days_by_seniority: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Días de vacaciones por antigüedad'
        },
        receipt_legal_text: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        receipt_footer_text: {
            type: DataTypes.TEXT,
            allowNull: true
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
            { fields: ['company_id'] },
            { fields: ['is_active'] }
        ]
    });

    LaborAgreementV2.associate = (models) => {
        // Pertenece a un país
        LaborAgreementV2.belongsTo(models.PayrollCountry, {
            foreignKey: 'country_id',
            as: 'country'
        });

        // Tiene muchas plantillas (FK es labor_agreement_id en payroll_templates)
        LaborAgreementV2.hasMany(models.PayrollTemplate, {
            foreignKey: 'labor_agreement_id',
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
