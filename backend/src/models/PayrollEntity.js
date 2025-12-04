/**
 * Modelo: PayrollEntity
 * Entidades receptoras de deducciones/contribuciones
 *
 * 100% PARAMETRIZABLE:
 * - company_id = NULL → Entidad global (visible para todas las empresas)
 * - company_id = X → Entidad privada de la empresa X
 * - category_id → Tipo de entidad (parametrizable, no hardcodeado)
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
        // NUEVO: FK a categoría parametrizable
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'payroll_entity_categories', key: 'id' },
            comment: 'Categoría parametrizable (reemplaza entity_type)'
        },
        entity_code: {
            type: DataTypes.STRING(30),
            allowNull: false
        },
        entity_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        // NUEVO: nombre corto para UI compacta
        entity_short_name: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        // LEGACY: mantener para compatibilidad, pero usar category_id
        entity_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'LEGACY - Usar category_id. TAX_AUTHORITY, SOCIAL_SECURITY, UNION, etc.'
        },
        tax_id: {
            type: DataTypes.STRING(30),
            comment: 'Identificación fiscal de la entidad (CUIT, RFC, RUT, etc.)'
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

        // Configuración de presentación
        presentation_format: {
            type: DataTypes.STRING(50),
            comment: 'Formato de archivo para presentación'
        },
        presentation_frequency: {
            type: DataTypes.STRING(20),
            defaultValue: 'monthly'
        },
        presentation_deadline_day: DataTypes.INTEGER,

        // NUEVO: campos para afiliación
        requires_employee_affiliation: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si requiere número de afiliación del empleado'
        },
        affiliation_id_name: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Nombre del campo de afiliación (ej: N° Afiliado, CUIL)'
        },

        // NUEVO: documentación
        calculation_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Notas sobre cómo se calcula (ayuda al usuario)'
        },
        legal_reference: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Referencia legal (ley, artículo, decreto)'
        },

        settings: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Configuración adicional flexible'
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
        // NUEVA ASOCIACIÓN: con categoría
        PayrollEntity.belongsTo(models.PayrollEntityCategory, {
            foreignKey: 'category_id',
            as: 'category'
        });
        PayrollEntity.hasMany(models.PayrollEntitySettlement, {
            foreignKey: 'entity_id',
            as: 'settlements'
        });
        // Conceptos que tienen esta entidad como destino
        PayrollEntity.hasMany(models.PayrollTemplateConcept, {
            foreignKey: 'entity_id',
            as: 'concepts'
        });
    };

    return PayrollEntity;
};
