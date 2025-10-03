const { DataTypes, Sequelize } = require('sequelize');

// Configurar conexión directa para los modelos SIAC
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

/**
 * Modelo de Plantilla Fiscal por País
 * Configuración base de matriz impositiva
 */
const TaxTemplate = sequelize.define('TaxTemplate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    country: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    countryCode: {
        type: DataTypes.STRING(3),
        allowNull: false,
        unique: true,
        field: 'country_code'
    },
    templateName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'template_name'
    },

    // Configuración de identificación tributaria
    taxIdFormat: {
        type: DataTypes.STRING(50),
        field: 'tax_id_format'
    },
    taxIdFieldName: {
        type: DataTypes.STRING(50),
        defaultValue: 'CUIT',
        field: 'tax_id_field_name'
    },
    taxIdValidationRegex: {
        type: DataTypes.STRING(200),
        field: 'tax_id_validation_regex'
    },
    removeSeparators: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'remove_separators'
    },

    // Monedas
    currencies: {
        type: DataTypes.JSONB,
        defaultValue: ['ARS']
    },
    defaultCurrency: {
        type: DataTypes.STRING(3),
        defaultValue: 'ARS',
        field: 'default_currency'
    },

    // Estado
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'tax_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

/**
 * Modelo de Condiciones Impositivas
 */
const TaxCondition = sequelize.define('TaxCondition', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    taxTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: TaxTemplate,
            key: 'id'
        },
        field: 'tax_template_id'
    },
    conditionCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'condition_code'
    },
    conditionName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'condition_name'
    },
    description: {
        type: DataTypes.TEXT
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'display_order'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'tax_conditions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

/**
 * Modelo de Conceptos Impositivos
 */
const TaxConcept = sequelize.define('TaxConcept', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    taxTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: TaxTemplate,
            key: 'id'
        },
        field: 'tax_template_id'
    },
    conceptCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'concept_code'
    },
    conceptName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'concept_name'
    },
    description: {
        type: DataTypes.TEXT
    },
    calculationOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'calculation_order'
    },
    baseAmount: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'neto_final',
        field: 'base_amount'
    },
    conceptType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'tax',
        field: 'concept_type'
    },
    isPercentage: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_percentage'
    },
    isCompound: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_compound'
    },
    affectsTotal: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'affects_total'
    },
    isMandatory: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_mandatory'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'tax_concepts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

/**
 * Modelo de Alícuotas
 */
const TaxRate = sequelize.define('TaxRate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    taxConceptId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: TaxConcept,
            key: 'id'
        },
        field: 'tax_concept_id'
    },
    rateCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'rate_code'
    },
    rateName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'rate_name'
    },
    ratePercentage: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        field: 'rate_percentage',
        get() {
            const rawValue = this.getDataValue('ratePercentage');
            return rawValue ? parseFloat(rawValue).toFixed(2) : '0.00';
        }
    },
    minimumAmount: {
        type: DataTypes.DECIMAL(15, 4),
        defaultValue: 0,
        field: 'minimum_amount'
    },
    maximumAmount: {
        type: DataTypes.DECIMAL(15, 4),
        field: 'maximum_amount'
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_default'
    },
    applicableConditions: {
        type: DataTypes.JSONB,
        field: 'applicable_conditions'
    },
    dateFrom: {
        type: DataTypes.DATEONLY,
        field: 'date_from'
    },
    dateTo: {
        type: DataTypes.DATEONLY,
        field: 'date_to'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'tax_rates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

/**
 * Modelo de Configuración Fiscal por Empresa
 */
const CompanyTaxConfig = sequelize.define('CompanyTaxConfig', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'company_id'
    },
    taxTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: TaxTemplate,
            key: 'id'
        },
        field: 'tax_template_id'
    },

    // Configuración específica de la empresa
    customTaxId: {
        type: DataTypes.STRING(50),
        field: 'custom_tax_id'
    },
    customConditionCode: {
        type: DataTypes.STRING(20),
        field: 'custom_condition_code'
    },
    customCurrencies: {
        type: DataTypes.JSONB,
        field: 'custom_currencies'
    },
    conceptOverrides: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'concept_overrides'
    },

    // SIAC - Numeración específica
    facturaANumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'factura_a_numero'
    },
    facturaBNumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'factura_b_numero'
    },
    facturaCNumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'factura_c_numero'
    },
    remitoNumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'remito_numero'
    },
    reciboNumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'recibo_numero'
    },

    // SIAC - Configuración operativa
    puntoVenta: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'punto_venta'
    },
    actividadPrincipal: {
        type: DataTypes.STRING(200),
        field: 'actividad_principal'
    },
    descuentoMaximo: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        field: 'descuento_maximo'
    },
    recargoMaximo: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        field: 'recargo_maximo'
    },

    // Estado
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'company_tax_config',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Definir asociaciones
TaxTemplate.hasMany(TaxCondition, { foreignKey: 'tax_template_id', as: 'conditions' });
TaxTemplate.hasMany(TaxConcept, { foreignKey: 'tax_template_id', as: 'concepts' });
TaxTemplate.hasMany(CompanyTaxConfig, { foreignKey: 'tax_template_id', as: 'companyConfigs' });

TaxCondition.belongsTo(TaxTemplate, { foreignKey: 'tax_template_id', as: 'template' });

TaxConcept.belongsTo(TaxTemplate, { foreignKey: 'tax_template_id', as: 'template' });
TaxConcept.hasMany(TaxRate, { foreignKey: 'tax_concept_id', as: 'rates' });

TaxRate.belongsTo(TaxConcept, { foreignKey: 'tax_concept_id', as: 'concept' });

CompanyTaxConfig.belongsTo(TaxTemplate, { foreignKey: 'tax_template_id', as: 'template' });

/**
 * Métodos estáticos útiles
 */

// Obtener plantilla por código de país
TaxTemplate.getByCountryCode = async function(countryCode) {
    return await this.findOne({
        where: { countryCode, isActive: true },
        include: [
            {
                model: TaxCondition,
                as: 'conditions',
                where: { isActive: true },
                required: false,
                order: [['displayOrder', 'ASC']]
            },
            {
                model: TaxConcept,
                as: 'concepts',
                where: { isActive: true },
                required: false,
                include: [{
                    model: TaxRate,
                    as: 'rates',
                    where: { isActive: true },
                    required: false,
                    order: [['ratePercentage', 'ASC']]
                }],
                order: [['calculationOrder', 'ASC']]
            }
        ]
    });
};

// Obtener configuración completa de una empresa
CompanyTaxConfig.getCompanyConfig = async function(companyId) {
    return await this.findOne({
        where: { companyId, isActive: true },
        include: [{
            model: TaxTemplate,
            as: 'template',
            include: [
                {
                    model: TaxCondition,
                    as: 'conditions',
                    where: { isActive: true },
                    required: false
                },
                {
                    model: TaxConcept,
                    as: 'concepts',
                    where: { isActive: true },
                    required: false,
                    include: [{
                        model: TaxRate,
                        as: 'rates',
                        where: { isActive: true },
                        required: false
                    }]
                }
            ]
        }]
    });
};

module.exports = {
    TaxTemplate,
    TaxCondition,
    TaxConcept,
    TaxRate,
    CompanyTaxConfig
};