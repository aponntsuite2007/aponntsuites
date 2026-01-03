/**
 * ProcurementRfqItem Model
 * Items de solicitud de cotización
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementRfqItem = sequelize.define('ProcurementRfqItem', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        rfq_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_rfqs', key: 'id' }
        },
        requisition_item_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_requisition_items', key: 'id' }
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
        reference_price: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Precio referencia interno (oculto para proveedores)'
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        best_quote_price: {
            type: DataTypes.DECIMAL(15, 4),
            comment: 'Mejor precio recibido (auto-calculado)'
        },
        best_quote_supplier_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_suppliers', key: 'id' }
        },
        awarded_supplier_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_suppliers', key: 'id' }
        },
        awarded_price: {
            type: DataTypes.DECIMAL(15, 4)
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'procurement_rfq_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['rfq_id', 'line_number'] },
            { fields: ['item_id'] }
        ]
    });

    // Actualizar mejor cotización
    ProcurementRfqItem.prototype.updateBestQuote = async function(ProcurementRfqQuote) {
        const bestQuote = await ProcurementRfqQuote.findOne({
            where: { rfq_item_id: this.id },
            order: [['unit_price', 'ASC']],
            include: [{
                model: sequelize.models.ProcurementRfqSupplier,
                as: 'rfqSupplier',
                attributes: ['supplier_id']
            }]
        });

        if (bestQuote) {
            this.best_quote_price = bestQuote.unit_price;
            this.best_quote_supplier_id = bestQuote.rfqSupplier?.supplier_id;
            await this.save();
        }
    };

    // Adjudicar a un proveedor
    ProcurementRfqItem.prototype.awardTo = async function(supplierId, price) {
        this.awarded_supplier_id = supplierId;
        this.awarded_price = price;
        return this.save();
    };

    // Obtener comparativo de cotizaciones
    ProcurementRfqItem.prototype.getQuotesComparison = async function() {
        const query = `
            SELECT
                q.*,
                rs.supplier_id,
                s.trade_name as supplier_name,
                s.overall_score as supplier_score,
                CASE
                    WHEN :referencePrice > 0
                    THEN ((q.unit_price - :referencePrice) / :referencePrice * 100)
                    ELSE NULL
                END as vs_reference_percent
            FROM procurement_rfq_quotes q
            INNER JOIN procurement_rfq_suppliers rs ON rs.id = q.rfq_supplier_id
            INNER JOIN procurement_suppliers s ON s.id = rs.supplier_id
            WHERE q.rfq_item_id = :itemId
            ORDER BY q.unit_price ASC
        `;
        return sequelize.query(query, {
            replacements: {
                itemId: this.id,
                referencePrice: parseFloat(this.reference_price) || 0
            },
            type: sequelize.QueryTypes.SELECT
        });
    };

    // Obtener items de un RFQ
    ProcurementRfqItem.getByRfq = async function(rfqId) {
        return this.findAll({
            where: { rfq_id: rfqId },
            order: [['line_number', 'ASC']]
        });
    };

    return ProcurementRfqItem;
};
