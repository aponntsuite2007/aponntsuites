/**
 * Modelo: EppCatalog
 * Catalogo de EPP especifico por empresa con vida util y certificaciones
 *
 * @version 1.0.0
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const EppCatalog = sequelize.define('EppCatalog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'epp_categories', key: 'id' }
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Codigo interno del EPP: CASCO-01, GUANTE-NITRILO-M'
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: 'Nombre descriptivo del EPP'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        brand: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '3M, MSA, Honeywell, etc.'
        },
        model: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        certifications: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            comment: '["EN 397", "ANSI Z89.1", "IRAM 3620"]'
        },
        default_lifespan_days: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Vida util en dias: 365, 180, etc.'
        },
        lifespan_unit: {
            type: DataTypes.STRING(20),
            defaultValue: 'days',
            comment: 'days, months, uses'
        },
        max_uses: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Para EPP con vida util por usos'
        },
        available_sizes: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null,
            comment: '["S", "M", "L", "XL"] o null si no aplica'
        },
        unit_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        min_stock_alert: {
            type: DataTypes.INTEGER,
            defaultValue: 5
        },
        usage_instructions: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        maintenance_instructions: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        storage_instructions: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        disposal_instructions: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        procedure_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Instructivo de uso vinculado (SSOT)'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'epp_catalog',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'code'] }
        ]
    });

    EppCatalog.associate = (models) => {
        if (models.Company) {
            EppCatalog.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }

        if (models.EppCategory) {
            EppCatalog.belongsTo(models.EppCategory, {
                foreignKey: 'category_id',
                as: 'category'
            });
        }

        if (models.EppRoleRequirement) {
            EppCatalog.hasMany(models.EppRoleRequirement, {
                foreignKey: 'epp_catalog_id',
                as: 'roleRequirements'
            });
        }

        if (models.EppDelivery) {
            EppCatalog.hasMany(models.EppDelivery, {
                foreignKey: 'epp_catalog_id',
                as: 'deliveries'
            });
        }
    };

    return EppCatalog;
};
