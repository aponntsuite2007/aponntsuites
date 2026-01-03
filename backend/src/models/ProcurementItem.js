/**
 * ProcurementItem Model
 * Catálogo de productos/servicios con historial de proveedores
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementItem = sequelize.define('ProcurementItem', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'id' }
        },
        item_code: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        category_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_categories', key: 'id' }
        },
        item_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: { isIn: [['product', 'service', 'consumable', 'fixed_asset']] }
        },
        unit_of_measure: {
            type: DataTypes.STRING(50)
        },
        reference_price: {
            type: DataTypes.DECIMAL(15, 2)
        },
        min_price: {
            type: DataTypes.DECIMAL(15, 2)
        },
        max_price: {
            type: DataTypes.DECIMAL(15, 2)
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        last_price_update: {
            type: DataTypes.DATE
        },
        historical_suppliers: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: '[{supplier_id, supplier_name, last_price, last_date, total_orders, avg_delivery_days, quality_score}]'
        },
        preferred_supplier_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_suppliers', key: 'id' }
        },
        specifications: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        images: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        track_stock: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        min_stock_level: {
            type: DataTypes.DECIMAL(15, 4)
        },
        reorder_point: {
            type: DataTypes.DECIMAL(15, 4)
        },
        reorder_quantity: {
            type: DataTypes.DECIMAL(15, 4)
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        created_by: {
            type: DataTypes.UUID
        }
    }, {
        tableName: 'procurement_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'item_code'] },
            { fields: ['category_id'] },
            { fields: ['company_id', 'is_active'] }
        ]
    });

    // Buscar items con filtros
    ProcurementItem.search = async function(companyId, filters = {}) {
        const { Op } = sequelize.Sequelize;
        const where = { company_id: companyId, is_active: true };

        if (filters.categoryId) where.category_id = filters.categoryId;
        if (filters.itemType) where.item_type = filters.itemType;
        if (filters.search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${filters.search}%` } },
                { item_code: { [Op.iLike]: `%${filters.search}%` } },
                { description: { [Op.iLike]: `%${filters.search}%` } }
            ];
        }

        return this.findAndCountAll({
            where,
            order: [[filters.sortBy || 'name', filters.sortOrder || 'ASC']],
            limit: filters.limit || 50,
            offset: filters.offset || 0
        });
    };

    // Actualizar historial de proveedor
    ProcurementItem.prototype.updateSupplierHistory = async function(supplierData) {
        const history = this.historical_suppliers || [];
        const existingIndex = history.findIndex(h => h.supplier_id === supplierData.supplier_id);

        if (existingIndex >= 0) {
            history[existingIndex] = { ...history[existingIndex], ...supplierData, last_date: new Date().toISOString() };
        } else {
            history.push({ ...supplierData, last_date: new Date().toISOString() });
        }

        // Ordenar por total_orders desc
        history.sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0));

        this.historical_suppliers = history;
        return this.save();
    };

    return ProcurementItem;
};
