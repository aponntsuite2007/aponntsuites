/**
 * FinanceDimension Model
 * Dimensiones contables para análisis multidimensional (Sage Intacct style)
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceDimension = sequelize.define('FinanceDimension', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        dimension_number: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                max: 8
            },
            comment: 'Número de dimensión 1-8'
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        parent_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_dimensions', key: 'id' }
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        sort_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Metadata adicional configurable'
        }
    }, {
        tableName: 'finance_dimensions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'dimension_number', 'code'] },
            { fields: ['company_id', 'dimension_number', 'is_active'] },
            { fields: ['parent_id'] }
        ]
    });

    // Nombres de dimensiones por defecto
    FinanceDimension.DIMENSION_NAMES = {
        1: 'Sucursal',
        2: 'Producto/Servicio',
        3: 'Canal',
        4: 'Cliente Tipo',
        5: 'Región',
        6: 'Campaña',
        7: 'Contrato',
        8: 'Personalizada'
    };

    // Obtener valores de una dimensión
    FinanceDimension.getByNumber = async function(companyId, dimensionNumber) {
        return this.findAll({
            where: {
                company_id: companyId,
                dimension_number: dimensionNumber,
                is_active: true
            },
            order: [['sort_order', 'ASC'], ['name', 'ASC']]
        });
    };

    // Obtener jerarquía de una dimensión
    FinanceDimension.getHierarchy = async function(companyId, dimensionNumber, parentId = null) {
        const dimensions = await this.findAll({
            where: {
                company_id: companyId,
                dimension_number: dimensionNumber,
                parent_id: parentId,
                is_active: true
            },
            order: [['sort_order', 'ASC'], ['name', 'ASC']]
        });

        const result = [];
        for (const dim of dimensions) {
            const children = await this.getHierarchy(companyId, dimensionNumber, dim.id);
            result.push({
                ...dim.toJSON(),
                children
            });
        }

        return result;
    };

    // Obtener todas las dimensiones configuradas
    FinanceDimension.getConfigured = async function(companyId) {
        const result = {};

        for (let i = 1; i <= 8; i++) {
            const values = await this.getByNumber(companyId, i);
            if (values.length > 0) {
                result[i] = {
                    name: this.DIMENSION_NAMES[i],
                    values
                };
            }
        }

        return result;
    };

    // Buscar por código
    FinanceDimension.findByCode = async function(companyId, dimensionNumber, code) {
        return this.findOne({
            where: {
                company_id: companyId,
                dimension_number: dimensionNumber,
                code: code
            }
        });
    };

    // Crear valores iniciales para una dimensión
    FinanceDimension.seedDimension = async function(companyId, dimensionNumber, values) {
        const created = [];

        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            created.push(await this.create({
                company_id: companyId,
                dimension_number: dimensionNumber,
                code: value.code,
                name: value.name,
                description: value.description || null,
                parent_id: value.parent_id || null,
                sort_order: i,
                metadata: value.metadata || {}
            }));
        }

        return created;
    };

    return FinanceDimension;
};
