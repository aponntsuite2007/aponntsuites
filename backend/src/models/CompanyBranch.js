/**
 * Modelo CompanyBranch - Sucursales de empresas
 * Sistema de Liquidación Parametrizable v3.0
 * SINCRONIZADO con esquema BD real
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CompanyBranch = sequelize.define('CompanyBranch', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        branch_code: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        branch_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        address: {
            type: DataTypes.TEXT
        },
        city: {
            type: DataTypes.STRING(100)
        },
        state_province: {
            type: DataTypes.STRING(100)
        },
        postal_code: {
            type: DataTypes.STRING(20)
        },
        phone: {
            type: DataTypes.STRING(50)
        },
        email: {
            type: DataTypes.STRING(100)
        },
        local_tax_id: {
            type: DataTypes.STRING(50)
        },
        local_registration_number: {
            type: DataTypes.STRING(50)
        },
        local_labor_authority: {
            type: DataTypes.STRING(100)
        },
        default_pay_day: {
            type: DataTypes.INTEGER
        },
        pay_frequency_override: {
            type: DataTypes.STRING(20)
        },
        timezone: {
            type: DataTypes.STRING(50),
            defaultValue: 'America/Buenos_Aires'
        },
        is_headquarters: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'company_branches',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    CompanyBranch.associate = (models) => {
        if (models.Company) {
            CompanyBranch.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }
        if (models.PayrollCountry) {
            CompanyBranch.belongsTo(models.PayrollCountry, {
                foreignKey: 'country_id',
                as: 'country'
            });
        }
        if (models.PayrollRun) {
            CompanyBranch.hasMany(models.PayrollRun, {
                foreignKey: 'branch_id',
                as: 'payrollRuns'
            });
        }
    };

    return CompanyBranch;
};
