/**
 * Modelo CompanyBranch - Sucursales de empresas
 * Sistema de Liquidación Parametrizable v3.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CompanyBranch = sequelize.define('CompanyBranch', {
        branch_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'company_id'
            }
        },
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_countries',
                key: 'country_id'
            }
        },
        branch_code: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        branch_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        state_province: {
            type: DataTypes.STRING(100),
            comment: 'Estado/Provincia para feriados regionales'
        },
        city: {
            type: DataTypes.STRING(100)
        },
        address: {
            type: DataTypes.TEXT
        },
        timezone: {
            type: DataTypes.STRING(50),
            defaultValue: 'America/Buenos_Aires'
        },
        is_headquarters: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si es la casa matriz'
        },
        default_template_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'payroll_templates',
                key: 'template_id'
            },
            comment: 'Plantilla de liquidación por defecto'
        },
        settings: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'company_branches',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id'] },
            { fields: ['country_id'] },
            { fields: ['company_id', 'branch_code'], unique: true },
            { fields: ['is_active'] }
        ]
    });

    CompanyBranch.associate = (models) => {
        // Pertenece a una empresa
        CompanyBranch.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        // Pertenece a un país
        CompanyBranch.belongsTo(models.PayrollCountry, {
            foreignKey: 'country_id',
            as: 'country'
        });

        // Tiene una plantilla por defecto
        CompanyBranch.belongsTo(models.PayrollTemplate, {
            foreignKey: 'default_template_id',
            as: 'defaultTemplate'
        });

        // Tiene muchos convenios (a través del país)
        // Las asociaciones de convenios se hacen a través del país

        // Tiene muchas ejecuciones de liquidación
        CompanyBranch.hasMany(models.PayrollRun, {
            foreignKey: 'branch_id',
            as: 'payrollRuns'
        });
    };

    return CompanyBranch;
};
