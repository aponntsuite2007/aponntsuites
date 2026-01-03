/**
 * ProcurementCategory Model
 * Categorías jerárquicas de productos/servicios
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementCategory = sequelize.define('ProcurementCategory', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // NULL = categoría global
            references: { model: 'companies', key: 'id' }
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        parent_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_categories', key: 'id' }
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        path: {
            type: DataTypes.STRING(500),
            comment: 'Ej: 1.2.3 para navegación jerárquica'
        },
        requires_approval: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        default_approval_workflow: {
            type: DataTypes.JSONB
        },
        budget_code: {
            type: DataTypes.STRING(50)
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'procurement_categories',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'code'] },
            { fields: ['parent_id'] }
        ]
    });

    // Obtener categorías de una empresa (incluye globales)
    ProcurementCategory.getByCompany = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        return this.findAll({
            where: {
                [Op.or]: [
                    { company_id: companyId },
                    { company_id: null }
                ],
                is_active: true
            },
            order: [['level', 'ASC'], ['name', 'ASC']]
        });
    };

    // Obtener árbol jerárquico
    ProcurementCategory.getTree = async function(companyId) {
        const categories = await this.getByCompany(companyId);
        const buildTree = (items, parentId = null) => {
            return items
                .filter(item => item.parent_id === parentId)
                .map(item => ({
                    ...item.toJSON(),
                    children: buildTree(items, item.id)
                }));
        };
        return buildTree(categories);
    };

    return ProcurementCategory;
};
