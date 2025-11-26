/**
 * Modelo PayrollCountry - Países con configuración de nómina
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollCountry = sequelize.define('PayrollCountry', {
        country_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        country_code: {
            type: DataTypes.STRING(3),
            allowNull: false,
            unique: true,
            comment: 'Código ISO 3166-1 alpha-3'
        },
        country_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        currency_code: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'USD'
        },
        currency_symbol: {
            type: DataTypes.STRING(5),
            defaultValue: '$'
        },
        tax_id_name: {
            type: DataTypes.STRING(50),
            comment: 'Nombre del identificador fiscal (CUIL, RUT, RFC, etc.)'
        },
        tax_id_format: {
            type: DataTypes.STRING(50),
            comment: 'Formato regex del identificador fiscal'
        },
        labor_agreement_name: {
            type: DataTypes.STRING(100),
            defaultValue: 'Convenio Colectivo',
            comment: 'Nombre local de convenios laborales (CCT, Contrato Colectivo, etc.)'
        },
        default_work_hours_week: {
            type: DataTypes.DECIMAL(4, 2),
            defaultValue: 40.00
        },
        default_work_days_week: {
            type: DataTypes.INTEGER,
            defaultValue: 5
        },
        overtime_multiplier_50: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 1.50,
            comment: 'Multiplicador hora extra 50%'
        },
        overtime_multiplier_100: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 2.00,
            comment: 'Multiplicador hora extra 100%'
        },
        night_shift_multiplier: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 1.20,
            comment: 'Adicional nocturno'
        },
        holiday_multiplier: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 2.00,
            comment: 'Multiplicador día feriado'
        },
        settings: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Configuraciones adicionales específicas del país'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'payroll_countries',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['country_code'], unique: true },
            { fields: ['is_active'] }
        ]
    });

    PayrollCountry.associate = (models) => {
        // Una país tiene muchas sucursales
        PayrollCountry.hasMany(models.CompanyBranch, {
            foreignKey: 'country_id',
            as: 'branches'
        });

        // Un país tiene muchos convenios
        PayrollCountry.hasMany(models.LaborAgreementV2, {
            foreignKey: 'country_id',
            as: 'laborAgreements'
        });

        // Un país tiene muchas plantillas
        PayrollCountry.hasMany(models.PayrollTemplate, {
            foreignKey: 'country_id',
            as: 'templates'
        });
    };

    return PayrollCountry;
};
