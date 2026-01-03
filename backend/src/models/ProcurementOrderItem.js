/**
 * ProcurementOrderItem Model
 * Items de orden de compra con tracking de recepción
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementOrderItem = sequelize.define('ProcurementOrderItem', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_orders', key: 'id' }
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
        quantity_ordered: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false
        },
        quantity_received: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0
        },
        quantity_pending: {
            type: DataTypes.VIRTUAL,
            get() {
                return parseFloat(this.quantity_ordered) - parseFloat(this.quantity_received || 0);
            }
        },
        unit_of_measure: {
            type: DataTypes.STRING(50)
        },
        unit_price: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false
        },
        discount_percent: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        total_price: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        reception_status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'partial', 'complete', 'rejected']]
            }
        },
        quality_check: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['passed', 'failed', 'pending', null]]
            }
        },
        quality_notes: {
            type: DataTypes.TEXT
        },
        rfq_quote_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_rfq_quotes', key: 'id' }
        },
        contract_item_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_contract_items', key: 'id' }
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'procurement_order_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['order_id', 'line_number'] },
            { fields: ['item_id'] }
        ]
    });

    // Calcular total con descuento
    ProcurementOrderItem.prototype.calculateTotal = function() {
        const subtotal = parseFloat(this.unit_price) * parseFloat(this.quantity_ordered);
        const discount = subtotal * (parseFloat(this.discount_percent) / 100);
        this.total_price = subtotal - discount;
        return this.total_price;
    };

    // Registrar recepción
    ProcurementOrderItem.prototype.receiveQuantity = async function(quantity, qualityCheck = null, notes = null) {
        const newReceived = parseFloat(this.quantity_received || 0) + parseFloat(quantity);
        const ordered = parseFloat(this.quantity_ordered);

        this.quantity_received = newReceived;

        if (newReceived >= ordered) {
            this.reception_status = 'complete';
        } else if (newReceived > 0) {
            this.reception_status = 'partial';
        }

        if (qualityCheck) {
            this.quality_check = qualityCheck;
        }
        if (notes) {
            this.quality_notes = notes;
        }

        return this.save();
    };

    // Rechazar item
    ProcurementOrderItem.prototype.reject = async function(reason) {
        this.reception_status = 'rejected';
        this.quality_check = 'failed';
        this.quality_notes = reason;
        return this.save();
    };

    // Obtener items de una orden
    ProcurementOrderItem.getByOrder = async function(orderId) {
        return this.findAll({
            where: { order_id: orderId },
            order: [['line_number', 'ASC']]
        });
    };

    // Obtener items pendientes de recepción
    ProcurementOrderItem.getPendingReception = async function(orderId) {
        const { Op } = sequelize.Sequelize;
        return this.findAll({
            where: {
                order_id: orderId,
                reception_status: { [Op.in]: ['pending', 'partial'] }
            },
            order: [['line_number', 'ASC']]
        });
    };

    // Verificar si todos los items están recibidos
    ProcurementOrderItem.allReceived = async function(orderId) {
        const pending = await this.count({
            where: {
                order_id: orderId,
                reception_status: { [sequelize.Sequelize.Op.ne]: 'complete' }
            }
        });
        return pending === 0;
    };

    // Calcular porcentaje de recepción de una orden
    ProcurementOrderItem.getReceptionPercent = async function(orderId) {
        const items = await this.findAll({ where: { order_id: orderId } });
        if (items.length === 0) return 0;

        let totalOrdered = 0;
        let totalReceived = 0;

        for (const item of items) {
            totalOrdered += parseFloat(item.quantity_ordered);
            totalReceived += parseFloat(item.quantity_received || 0);
        }

        return totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
    };

    return ProcurementOrderItem;
};
