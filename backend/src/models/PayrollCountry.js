/**
 * Modelo PayrollCountry - Países con configuración de nómina
 * Sistema de Liquidación Parametrizable v3.0
 * SINCRONIZADO con esquema BD real
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollCountry = sequelize.define('PayrollCountry', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        country_code: {
            type: DataTypes.STRING(3),
            allowNull: false,
            unique: true
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
        decimal_places: {
            type: DataTypes.INTEGER,
            defaultValue: 2
        },
        thousand_separator: {
            type: DataTypes.STRING(1),
            defaultValue: ','
        },
        decimal_separator: {
            type: DataTypes.STRING(1),
            defaultValue: '.'
        },
        labor_law_name: {
            type: DataTypes.STRING(100)
        },
        labor_law_reference: {
            type: DataTypes.STRING(255)
        },
        collective_agreement_name: {
            type: DataTypes.STRING(100)
        },
        default_pay_frequency: {
            type: DataTypes.STRING(20),
            defaultValue: 'monthly'
        },
        fiscal_year_start_month: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        aguinaldo_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        aguinaldo_frequency: {
            type: DataTypes.STRING(20)
        },
        vacation_calculation_method: {
            type: DataTypes.STRING(50)
        },
        tax_id_name: {
            type: DataTypes.STRING(50)
        },
        tax_id_format: {
            type: DataTypes.STRING(50)
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'payroll_countries',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    PayrollCountry.associate = (models) => {
        if (models.CompanyBranch) {
            PayrollCountry.hasMany(models.CompanyBranch, {
                foreignKey: 'country_id',
                as: 'branches'
            });
        }
        if (models.LaborAgreementV2) {
            PayrollCountry.hasMany(models.LaborAgreementV2, {
                foreignKey: 'country_id',
                as: 'laborAgreements'
            });
        }
    };

    return PayrollCountry;
};
