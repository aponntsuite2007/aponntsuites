/**
 * ProcurementRfqSupplier Model
 * Proveedores invitados a cotizar en un RFQ
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementRfqSupplier = sequelize.define('ProcurementRfqSupplier', {
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
        supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'wms_suppliers', key: 'id' }
        },
        invited_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        notification_id: {
            type: DataTypes.BIGINT,
            references: { model: 'notifications', key: 'id' }
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'viewed', 'declined', 'quoted']]
            }
        },
        viewed_at: {
            type: DataTypes.DATE
        },
        responded_at: {
            type: DataTypes.DATE
        },
        decline_reason: {
            type: DataTypes.TEXT
        },
        quote_total: {
            type: DataTypes.DECIMAL(15, 2)
        },
        quote_currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        quote_valid_until: {
            type: DataTypes.DATEONLY
        },
        quote_observations: {
            type: DataTypes.TEXT
        },
        quote_delivery_days: {
            type: DataTypes.INTEGER
        },
        quote_payment_terms: {
            type: DataTypes.TEXT
        },
        auto_score: {
            type: DataTypes.DECIMAL(5, 2),
            comment: 'Score automático calculado por el sistema'
        },
        is_awarded: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        awarded_items: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'IDs de items adjudicados a este proveedor'
        },
        awarded_total: {
            type: DataTypes.DECIMAL(15, 2)
        }
    }, {
        tableName: 'procurement_rfq_suppliers',
        timestamps: false,
        indexes: [
            { unique: true, fields: ['rfq_id', 'supplier_id'] },
            { fields: ['supplier_id'] },
            { fields: ['status'] }
        ]
    });

    // Marcar como visto
    ProcurementRfqSupplier.prototype.markViewed = async function() {
        if (!this.viewed_at) {
            this.viewed_at = new Date();
            this.status = 'viewed';
            return this.save();
        }
        return this;
    };

    // Declinar cotización
    ProcurementRfqSupplier.prototype.decline = async function(reason) {
        this.status = 'declined';
        this.decline_reason = reason;
        this.responded_at = new Date();
        return this.save();
    };

    // Enviar cotización
    ProcurementRfqSupplier.prototype.submitQuote = async function(quoteData) {
        this.status = 'quoted';
        this.responded_at = new Date();
        this.quote_total = quoteData.total;
        this.quote_currency = quoteData.currency || 'ARS';
        this.quote_valid_until = quoteData.valid_until;
        this.quote_observations = quoteData.observations;
        this.quote_delivery_days = quoteData.delivery_days;
        this.quote_payment_terms = quoteData.payment_terms;
        return this.save();
    };

    // Calcular score automático
    ProcurementRfqSupplier.prototype.calculateAutoScore = async function(ProcurementSupplier, allQuotes) {
        const supplier = await ProcurementSupplier.findByPk(this.supplier_id);
        if (!supplier) return 0;

        // Score basado en:
        // - 40% Precio competitivo (ranking)
        // - 30% Score histórico del proveedor
        // - 20% Días de entrega
        // - 10% Cumplimiento de términos

        let priceScore = 0;
        if (this.quote_total && allQuotes.length > 0) {
            const sortedByPrice = [...allQuotes].sort((a, b) =>
                parseFloat(a.quote_total) - parseFloat(b.quote_total)
            );
            const myRank = sortedByPrice.findIndex(q => q.id === this.id) + 1;
            priceScore = ((allQuotes.length - myRank + 1) / allQuotes.length) * 100;
        }

        const historicalScore = parseFloat(supplier.overall_score) || 50;

        let deliveryScore = 100;
        if (this.quote_delivery_days) {
            // Asumiendo que menos días es mejor, máximo 30 días
            deliveryScore = Math.max(0, 100 - (this.quote_delivery_days / 30 * 100));
        }

        const complianceScore = this.quote_payment_terms && this.quote_valid_until ? 100 : 50;

        this.auto_score = (
            priceScore * 0.4 +
            historicalScore * 0.3 +
            deliveryScore * 0.2 +
            complianceScore * 0.1
        );

        return this.save();
    };

    // Adjudicar items a este proveedor
    ProcurementRfqSupplier.prototype.awardItems = async function(itemIds, total) {
        this.is_awarded = true;
        this.awarded_items = itemIds;
        this.awarded_total = total;
        return this.save();
    };

    // Obtener proveedores por RFQ con info
    ProcurementRfqSupplier.getByRfqWithSupplierInfo = async function(rfqId, ProcurementSupplier) {
        return this.findAll({
            where: { rfq_id: rfqId },
            include: [{
                model: ProcurementSupplier,
                as: 'supplier',
                attributes: ['id', 'trade_name', 'legal_name', 'overall_score', 'contact_email']
            }],
            order: [['auto_score', 'DESC NULLS LAST']]
        });
    };

    // Obtener proveedores que cotizaron
    ProcurementRfqSupplier.getQuotedByRfq = async function(rfqId) {
        return this.findAll({
            where: { rfq_id: rfqId, status: 'quoted' },
            order: [['auto_score', 'DESC']]
        });
    };

    return ProcurementRfqSupplier;
};
