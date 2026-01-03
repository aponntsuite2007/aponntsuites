/**
 * ProcurementReceiptItem Model
 * Items de recepción con detalle de cantidades y calidad
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementReceiptItem = sequelize.define('ProcurementReceiptItem', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        receipt_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_receipts', key: 'id' }
        },
        order_item_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_order_items', key: 'id' }
        },
        quantity_received: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false
        },
        quantity_rejected: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0
        },
        quantity_accepted: {
            type: DataTypes.VIRTUAL,
            get() {
                return parseFloat(this.quantity_received) - parseFloat(this.quantity_rejected || 0);
            }
        },
        rejection_reason: {
            type: DataTypes.TEXT
        },
        quality_status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'approved', 'rejected', 'conditional']]
            }
        },
        quality_notes: {
            type: DataTypes.TEXT
        },
        quality_score: {
            type: DataTypes.DECIMAL(3, 2),
            comment: 'Score de calidad 0-100'
        },
        batch_number: {
            type: DataTypes.STRING(100),
            comment: 'Número de lote'
        },
        expiry_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de vencimiento si aplica'
        },
        serial_numbers: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Números de serie si aplica'
        },
        storage_location: {
            type: DataTypes.STRING(100)
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'procurement_receipt_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['receipt_id', 'order_item_id'] },
            { fields: ['order_item_id'] }
        ]
    });

    // Aprobar calidad del item
    ProcurementReceiptItem.prototype.approveQuality = async function(score = null, notes = '') {
        this.quality_status = 'approved';
        if (score !== null) this.quality_score = score;
        this.quality_notes = notes;
        return this.save();
    };

    // Rechazar item
    ProcurementReceiptItem.prototype.reject = async function(quantity, reason) {
        this.quantity_rejected = quantity;
        this.rejection_reason = reason;
        this.quality_status = 'rejected';
        return this.save();
    };

    // Aprobación condicional
    ProcurementReceiptItem.prototype.conditionalApproval = async function(conditions, score = null) {
        this.quality_status = 'conditional';
        this.quality_notes = conditions;
        if (score !== null) this.quality_score = score;
        return this.save();
    };

    // Obtener items de una recepción
    ProcurementReceiptItem.getByReceipt = async function(receiptId) {
        return this.findAll({
            where: { receipt_id: receiptId },
            order: [['id', 'ASC']]
        });
    };

    // Obtener historial de recepciones de un item de orden
    ProcurementReceiptItem.getHistoryByOrderItem = async function(orderItemId) {
        return this.findAll({
            where: { order_item_id: orderItemId },
            include: [{
                model: sequelize.models.ProcurementReceipt,
                as: 'receipt',
                attributes: ['id', 'receipt_number', 'receipt_date', 'status']
            }],
            order: [['created_at', 'DESC']]
        });
    };

    // Calcular total recibido de un item de orden
    ProcurementReceiptItem.getTotalReceived = async function(orderItemId) {
        const result = await this.findAll({
            where: { order_item_id: orderItemId },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('quantity_received')), 'total_received'],
                [sequelize.fn('SUM', sequelize.col('quantity_rejected')), 'total_rejected']
            ],
            raw: true
        });

        return {
            total_received: parseFloat(result[0]?.total_received) || 0,
            total_rejected: parseFloat(result[0]?.total_rejected) || 0,
            total_accepted: (parseFloat(result[0]?.total_received) || 0) - (parseFloat(result[0]?.total_rejected) || 0)
        };
    };

    // Calcular score promedio de calidad
    ProcurementReceiptItem.getAverageQualityScore = async function(supplierId, itemId = null) {
        const query = `
            SELECT AVG(ri.quality_score) as avg_score, COUNT(*) as count
            FROM procurement_receipt_items ri
            INNER JOIN procurement_receipts r ON r.id = ri.receipt_id
            INNER JOIN procurement_orders o ON o.id = r.order_id
            WHERE o.supplier_id = :supplierId
              AND ri.quality_score IS NOT NULL
              ${itemId ? 'AND ri.order_item_id IN (SELECT id FROM procurement_order_items WHERE item_id = :itemId)' : ''}
        `;
        const [result] = await sequelize.query(query, {
            replacements: { supplierId, itemId },
            type: sequelize.QueryTypes.SELECT
        });

        return {
            average_score: parseFloat(result?.avg_score) || 0,
            count: parseInt(result?.count) || 0
        };
    };

    return ProcurementReceiptItem;
};
