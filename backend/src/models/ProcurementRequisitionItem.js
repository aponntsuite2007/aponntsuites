/**
 * ProcurementRequisitionItem Model
 * Items de solicitud de compra con historial de proveedores
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementRequisitionItem = sequelize.define('ProcurementRequisitionItem', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        requisition_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_requisitions', key: 'id' }
        },
        line_number: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        item_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_items', key: 'id' }
        },
        item_code: {
            type: DataTypes.STRING(100)
        },
        item_description: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        specifications: {
            type: DataTypes.TEXT
        },
        quantity: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false
        },
        unit_of_measure: {
            type: DataTypes.STRING(50)
        },
        estimated_unit_price: {
            type: DataTypes.DECIMAL(15, 2)
        },
        estimated_total: {
            type: DataTypes.DECIMAL(15, 2)
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        suggested_supplier_id: {
            type: DataTypes.INTEGER,
            references: { model: 'wms_suppliers', key: 'id' }
        },
        suggested_supplier_name: {
            type: DataTypes.STRING(255)
        },
        supplier_history: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: '[{supplier_id, supplier_name, last_price, quality_score, delivery_score, last_order_date}]'
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            validate: { isIn: [['pending', 'in_rfq', 'quoted', 'ordered', 'received', 'cancelled']] }
        },
        ordered_quantity: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0
        },
        received_quantity: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'procurement_requisition_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['requisition_id', 'line_number'] },
            { fields: ['item_id'] }
        ]
    });

    // Calcular total estimado
    ProcurementRequisitionItem.prototype.calculateTotal = function() {
        if (this.estimated_unit_price && this.quantity) {
            this.estimated_total = parseFloat(this.estimated_unit_price) * parseFloat(this.quantity);
        }
        return this.estimated_total;
    };

    // Poblar historial de proveedores desde catálogo
    ProcurementRequisitionItem.prototype.populateSupplierHistory = async function(ProcurementItem) {
        if (!this.item_id) return;

        const item = await ProcurementItem.findByPk(this.item_id);
        if (item && item.historical_suppliers) {
            // Copiar top 5 proveedores
            this.supplier_history = item.historical_suppliers.slice(0, 5);
            await this.save();
        }
    };

    // Obtener items de una requisición
    ProcurementRequisitionItem.getByRequisition = async function(requisitionId) {
        return this.findAll({
            where: { requisition_id: requisitionId },
            order: [['line_number', 'ASC']]
        });
    };

    return ProcurementRequisitionItem;
};
