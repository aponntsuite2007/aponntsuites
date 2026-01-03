/**
 * ProcurementRfqQuote Model
 * Cotizaciones por item de cada proveedor
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementRfqQuote = sequelize.define('ProcurementRfqQuote', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        rfq_supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_rfq_suppliers', key: 'id' }
        },
        rfq_item_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_rfq_items', key: 'id' }
        },
        unit_price: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false
        },
        total_price: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        delivery_days: {
            type: DataTypes.INTEGER
        },
        observations: {
            type: DataTypes.TEXT
        },
        price_ranking: {
            type: DataTypes.INTEGER,
            comment: '1 = más barato'
        },
        vs_reference_percent: {
            type: DataTypes.DECIMAL(5, 2),
            comment: 'Variación vs precio referencia (+10% o -5%)'
        }
    }, {
        tableName: 'procurement_rfq_quotes',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['rfq_supplier_id', 'rfq_item_id'] },
            { fields: ['rfq_item_id', 'unit_price'] }
        ]
    });

    // Calcular ranking y variación vs referencia
    ProcurementRfqQuote.prototype.calculateRanking = async function(referencePrice) {
        // Obtener todas las cotizaciones para este item
        const allQuotes = await ProcurementRfqQuote.findAll({
            where: { rfq_item_id: this.rfq_item_id },
            order: [['unit_price', 'ASC']]
        });

        // Calcular ranking
        const ranking = allQuotes.findIndex(q => q.id === this.id) + 1;
        this.price_ranking = ranking;

        // Calcular variación vs referencia
        if (referencePrice && parseFloat(referencePrice) > 0) {
            const variance = ((parseFloat(this.unit_price) - parseFloat(referencePrice)) / parseFloat(referencePrice)) * 100;
            this.vs_reference_percent = parseFloat(variance.toFixed(2));
        }

        return this.save();
    };

    // Obtener cotizaciones de un proveedor para un RFQ
    ProcurementRfqQuote.getBySupplier = async function(rfqSupplierId) {
        return this.findAll({
            where: { rfq_supplier_id: rfqSupplierId },
            order: [['created_at', 'ASC']]
        });
    };

    // Obtener todas las cotizaciones para un item
    ProcurementRfqQuote.getByItem = async function(rfqItemId) {
        return this.findAll({
            where: { rfq_item_id: rfqItemId },
            order: [['unit_price', 'ASC']]
        });
    };

    // Obtener comparativo completo de un RFQ
    ProcurementRfqQuote.getFullComparison = async function(rfqId) {
        const query = `
            SELECT
                ri.id as item_id,
                ri.line_number,
                ri.item_description,
                ri.quantity,
                ri.unit_of_measure,
                ri.reference_price,
                s.id as supplier_id,
                s.trade_name as supplier_name,
                s.overall_score as supplier_score,
                q.unit_price,
                q.total_price,
                q.currency,
                q.delivery_days,
                q.price_ranking,
                q.vs_reference_percent,
                rs.auto_score as supplier_rfq_score
            FROM procurement_rfq_items ri
            CROSS JOIN procurement_rfq_suppliers rs
            INNER JOIN procurement_suppliers s ON s.id = rs.supplier_id
            LEFT JOIN procurement_rfq_quotes q ON q.rfq_item_id = ri.id AND q.rfq_supplier_id = rs.id
            WHERE ri.rfq_id = :rfqId AND rs.rfq_id = :rfqId
            ORDER BY ri.line_number, q.unit_price ASC NULLS LAST
        `;
        return sequelize.query(query, {
            replacements: { rfqId },
            type: sequelize.QueryTypes.SELECT
        });
    };

    // Actualizar rankings de todas las cotizaciones de un item
    ProcurementRfqQuote.updateItemRankings = async function(rfqItemId, referencePrice) {
        const quotes = await this.findAll({
            where: { rfq_item_id: rfqItemId },
            order: [['unit_price', 'ASC']]
        });

        for (let i = 0; i < quotes.length; i++) {
            quotes[i].price_ranking = i + 1;
            if (referencePrice && parseFloat(referencePrice) > 0) {
                const variance = ((parseFloat(quotes[i].unit_price) - parseFloat(referencePrice)) / parseFloat(referencePrice)) * 100;
                quotes[i].vs_reference_percent = parseFloat(variance.toFixed(2));
            }
            await quotes[i].save();
        }

        return quotes;
    };

    return ProcurementRfqQuote;
};
