/**
 * Modelo: PayrollEntity
 * Entidades receptoras de deducciones (AFIP, Obras Sociales, Sindicatos, etc.)
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollEntity = sequelize.define('PayrollEntity', {
        entity_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,  // NULL = entidad global
            references: { model: 'companies', key: 'company_id' }
        },
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'payroll_countries', key: 'id' }
        },
        entity_code: {
            type: DataTypes.STRING(30),
            allowNull: false
        },
        entity_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        entity_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'TAX_AUTHORITY, SOCIAL_SECURITY, UNION, HEALTH_INSURANCE, PENSION_FUND, BANK, OTHER'
        },
        tax_id: {
            type: DataTypes.STRING(30),
            comment: 'CUIT de la entidad'
        },
        legal_name: DataTypes.STRING(200),
        address: DataTypes.TEXT,
        phone: DataTypes.STRING(50),
        email: DataTypes.STRING(100),
        website: DataTypes.STRING(200),

        // Datos bancarios
        bank_name: DataTypes.STRING(100),
        bank_account_number: DataTypes.STRING(50),
        bank_account_type: DataTypes.STRING(30),
        bank_cbu: DataTypes.STRING(30),
        bank_alias: DataTypes.STRING(100),

        // Configuracion de presentacion
        presentation_format: {
            type: DataTypes.STRING(50),
            comment: 'AFIP_SICOSS, AFIP_F931, CUSTOM, EXCEL, TXT'
        },
        presentation_frequency: {
            type: DataTypes.STRING(20),
            defaultValue: 'monthly'
        },
        presentation_deadline_day: DataTypes.INTEGER,

        settings: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },

        is_government: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'payroll_entities',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    PayrollEntity.associate = (models) => {
        PayrollEntity.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        PayrollEntity.belongsTo(models.PayrollCountry, {
            foreignKey: 'country_id',
            as: 'country'
        });
        PayrollEntity.hasMany(models.PayrollEntitySettlement, {
            foreignKey: 'entity_id',
            as: 'settlements'
        });
    };

    return PayrollEntity;
};
