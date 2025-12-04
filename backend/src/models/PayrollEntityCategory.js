/**
 * Modelo: PayrollEntityCategory
 * Categorías parametrizables de entidades de liquidación
 *
 * Reemplaza los entity_type hardcodeados por categorías dinámicas
 * que pueden ser globales, por país o por empresa.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollEntityCategory = sequelize.define('PayrollEntityCategory', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: true,  // NULL = global
            references: { model: 'payroll_countries', key: 'id' }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,  // NULL = no privado de empresa
            references: { model: 'companies', key: 'company_id' }
        },
        category_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        category_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        category_name_short: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        flow_direction: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'deduction',
            validate: {
                isIn: [['earning', 'deduction', 'employer_contribution', 'informative']]
            },
            comment: 'earning=ingreso, deduction=descuento empleado, employer_contribution=aporte patronal, informative=solo informativo'
        },
        icon_name: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Nombre del ícono para UI (ej: piggy-bank, heart, users)'
        },
        color_hex: {
            type: DataTypes.STRING(7),
            allowNull: true,
            comment: 'Color hexadecimal para badges (ej: #3B82F6)'
        },
        consolidation_group: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Agrupación para reportes (government, health, union, etc.)'
        },
        requires_tax_id: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si entidades de este tipo requieren identificación fiscal'
        },
        requires_bank_info: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si entidades de este tipo requieren datos bancarios'
        },
        default_presentation_format: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Formato de presentación por defecto'
        },
        presentation_entity_name: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'Nombre del organismo receptor (ej: AFIP en Argentina)'
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si es categoría del sistema (no editable/eliminable)'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'payroll_entity_categories',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    PayrollEntityCategory.associate = (models) => {
        // Relación con país
        PayrollEntityCategory.belongsTo(models.PayrollCountry, {
            foreignKey: 'country_id',
            as: 'country'
        });

        // Relación con empresa
        PayrollEntityCategory.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        // Relación con entidades
        PayrollEntityCategory.hasMany(models.PayrollEntity, {
            foreignKey: 'category_id',
            as: 'entities'
        });
    };

    return PayrollEntityCategory;
};
