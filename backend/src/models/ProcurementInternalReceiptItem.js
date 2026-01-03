/**
 * ProcurementInternalReceiptItem Model
 * Items del documento interno de recepción (Remito Interno)
 * Módulo Procurement - Gestión de Compras P2P
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementInternalReceiptItem = sequelize.define('ProcurementInternalReceiptItem', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        internal_receipt_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_internal_receipts', key: 'id' }
        },

        // Línea
        line_number: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        // Artículo interno
        internal_item_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: { isIn: [['wms', 'procurement']] },
            comment: 'wms = wms_products, procurement = procurement_items'
        },
        internal_item_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        item_code: {
            type: DataTypes.STRING(100)
        },
        item_description: {
            type: DataTypes.STRING(500)
        },

        // Código del proveedor (para referencia)
        supplier_item_code: {
            type: DataTypes.STRING(100)
        },
        supplier_item_description: {
            type: DataTypes.STRING(500)
        },

        // Cantidades
        quantity_expected: {
            type: DataTypes.DECIMAL(15, 4)
        },
        quantity_received: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false
        },
        quantity_rejected: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0
        },
        unit_of_measure: {
            type: DataTypes.STRING(20),
            allowNull: false
        },

        // Ubicación
        warehouse_id: {
            type: DataTypes.INTEGER,
            comment: 'Puede ser diferente al del encabezado'
        },
        location_code: {
            type: DataTypes.STRING(50),
            comment: 'Ubicación específica en el depósito'
        },

        // Lote y vencimiento
        lot_number: {
            type: DataTypes.STRING(50)
        },
        expiry_date: {
            type: DataTypes.DATEONLY
        },
        serial_numbers: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // Calidad
        quality_status: {
            type: DataTypes.STRING(20),
            defaultValue: 'approved',
            validate: { isIn: [['approved', 'rejected', 'quarantine']] }
        },
        rejection_reason: {
            type: DataTypes.TEXT
        },

        // Costo
        unit_cost: {
            type: DataTypes.DECIMAL(15, 4)
        },
        total_cost: {
            type: DataTypes.DECIMAL(15, 2)
        },

        // Stock
        stock_entry_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a wms_stock cuando se registra'
        },

        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'procurement_internal_receipt_items',
        timestamps: false,
        indexes: [
            { unique: true, fields: ['internal_receipt_id', 'line_number'] },
            { fields: ['internal_receipt_id'] },
            { fields: ['internal_item_type', 'internal_item_id'] },
            { fields: ['lot_number'] }
        ]
    });

    // Calcular total cost
    ProcurementInternalReceiptItem.prototype.calculateTotalCost = function() {
        if (this.unit_cost && this.quantity_received) {
            this.total_cost = parseFloat(this.quantity_received) * parseFloat(this.unit_cost);
        }
        return this;
    };

    // Hook para calcular total cost antes de guardar
    ProcurementInternalReceiptItem.beforeSave((item) => {
        item.calculateTotalCost();
    });

    // Aprobar calidad
    ProcurementInternalReceiptItem.prototype.approveQuality = async function() {
        this.quality_status = 'approved';
        this.rejection_reason = null;
        return this.save();
    };

    // Rechazar por calidad
    ProcurementInternalReceiptItem.prototype.rejectQuality = async function(reason) {
        this.quality_status = 'rejected';
        this.rejection_reason = reason;
        return this.save();
    };

    // Enviar a cuarentena
    ProcurementInternalReceiptItem.prototype.sendToQuarantine = async function(reason) {
        this.quality_status = 'quarantine';
        this.rejection_reason = reason;
        return this.save();
    };

    // Obtener items por recepción
    ProcurementInternalReceiptItem.getByReceipt = async function(receiptId) {
        return this.findAll({
            where: { internal_receipt_id: receiptId },
            order: [['line_number', 'ASC']]
        });
    };

    // Obtener siguiente número de línea
    ProcurementInternalReceiptItem.getNextLineNumber = async function(receiptId) {
        const last = await this.findOne({
            where: { internal_receipt_id: receiptId },
            order: [['line_number', 'DESC']]
        });
        return (last?.line_number || 0) + 1;
    };

    return ProcurementInternalReceiptItem;
};
