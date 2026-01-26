/**
 * ProcurementSupplierItemMapping Model
 * Mapeo de códigos de artículos proveedor vs interno (SKU Cross-Reference)
 * Módulo Procurement - Gestión de Compras P2P
 *
 * Permite vincular los códigos de productos del proveedor con los códigos internos
 * de la empresa, facilitando la recepción y el tracking de compras.
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementSupplierItemMapping = sequelize.define('ProcurementSupplierItemMapping', {
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
        supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'wms_suppliers', key: 'id' }
        },

        // Código del proveedor
        supplier_item_code: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        supplier_item_description: {
            type: DataTypes.STRING(500)
        },
        supplier_barcode: {
            type: DataTypes.STRING(50)
        },
        supplier_unit_of_measure: {
            type: DataTypes.STRING(20),
            comment: 'UN, KG, LT, MT, CAJA, etc.'
        },

        // Código interno
        internal_item_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'wms',
            validate: { isIn: [['wms', 'procurement']] },
            comment: 'wms = wms_products, procurement = procurement_items'
        },
        internal_item_id: {
            type: DataTypes.INTEGER,
            comment: 'FK dinámico según internal_item_type'
        },

        // Conversión de unidad
        conversion_factor: {
            type: DataTypes.DECIMAL(15, 6),
            defaultValue: 1,
            comment: 'Ej: 1 caja proveedor = 12 unidades internas'
        },
        internal_unit_of_measure: {
            type: DataTypes.STRING(20)
        },

        // Precios de referencia
        last_purchase_price: {
            type: DataTypes.DECIMAL(15, 4)
        },
        last_purchase_currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        last_purchase_date: {
            type: DataTypes.DATEONLY
        },
        average_price: {
            type: DataTypes.DECIMAL(15, 4)
        },
        min_price: {
            type: DataTypes.DECIMAL(15, 4)
        },
        max_price: {
            type: DataTypes.DECIMAL(15, 4)
        },

        // Historial de compras
        total_purchases: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        total_quantity: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0
        },
        total_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },

        // Calidad
        quality_rating: {
            type: DataTypes.DECIMAL(3, 2),
            comment: '0.00 a 5.00'
        },
        rejection_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        rejection_rate: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },

        // Lead time
        average_lead_time_days: {
            type: DataTypes.INTEGER
        },
        min_lead_time_days: {
            type: DataTypes.INTEGER
        },
        max_lead_time_days: {
            type: DataTypes.INTEGER
        },

        // Estado
        is_preferred: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Artículo preferido de este proveedor'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        notes: {
            type: DataTypes.TEXT
        },
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'procurement_supplier_item_mappings',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'supplier_id', 'supplier_item_code'] },
            { fields: ['company_id', 'is_active'] },
            { fields: ['supplier_id'] },
            { fields: ['internal_item_type', 'internal_item_id'] },
            { fields: ['supplier_item_code'] }
        ]
    });

    // Buscar mapeo por código de proveedor
    ProcurementSupplierItemMapping.findBySupplierCode = async function(companyId, supplierId, supplierCode) {
        return this.findOne({
            where: {
                company_id: companyId,
                supplier_id: supplierId,
                supplier_item_code: supplierCode,
                is_active: true
            }
        });
    };

    // Buscar todos los proveedores que ofrecen un artículo interno
    ProcurementSupplierItemMapping.findSuppliersByInternalItem = async function(companyId, itemType, itemId) {
        return this.findAll({
            where: {
                company_id: companyId,
                internal_item_type: itemType,
                internal_item_id: itemId,
                is_active: true
            },
            order: [
                ['is_preferred', 'DESC'],
                ['quality_rating', 'DESC'],
                ['last_purchase_price', 'ASC']
            ]
        });
    };

    // Obtener ranking de proveedores para un artículo
    ProcurementSupplierItemMapping.getSupplierRanking = async function(companyId, itemType, itemId, criteria = 'balanced') {
        const mappings = await this.findAll({
            where: {
                company_id: companyId,
                internal_item_type: itemType,
                internal_item_id: itemId,
                is_active: true
            }
        });

        // Calcular score según criterio
        const scored = mappings.map(m => {
            let score = 0;
            const data = m.toJSON();

            switch (criteria) {
                case 'price':
                    // Menor precio = mayor score
                    score = data.last_purchase_price ? (1 / data.last_purchase_price) * 1000 : 0;
                    break;
                case 'quality':
                    score = parseFloat(data.quality_rating) || 0;
                    break;
                case 'delivery':
                    // Menor tiempo = mayor score
                    score = data.average_lead_time_days ? (30 / data.average_lead_time_days) : 0;
                    break;
                case 'balanced':
                default:
                    // 40% precio, 35% calidad, 25% entrega
                    const priceScore = data.last_purchase_price ? (1 / data.last_purchase_price) * 1000 : 0;
                    const qualityScore = parseFloat(data.quality_rating) || 0;
                    const deliveryScore = data.average_lead_time_days ? (30 / data.average_lead_time_days) : 0;
                    score = (priceScore * 0.4) + (qualityScore * 0.35) + (deliveryScore * 0.25);
                    break;
            }

            return { ...data, recommendation_score: score };
        });

        return scored.sort((a, b) => b.recommendation_score - a.recommendation_score);
    };

    // Actualizar estadísticas después de una compra
    ProcurementSupplierItemMapping.prototype.updatePurchaseStats = async function(quantity, price, currency = 'ARS') {
        const newTotal = parseFloat(this.total_quantity || 0) + quantity;
        const newAmount = parseFloat(this.total_amount || 0) + (quantity * price);
        const newCount = (this.total_purchases || 0) + 1;

        // Calcular nuevo promedio
        const newAverage = newAmount / newTotal;

        this.total_purchases = newCount;
        this.total_quantity = newTotal;
        this.total_amount = newAmount;
        this.average_price = newAverage;
        this.last_purchase_price = price;
        this.last_purchase_currency = currency;
        this.last_purchase_date = new Date();

        // Actualizar min/max
        if (!this.min_price || price < parseFloat(this.min_price)) {
            this.min_price = price;
        }
        if (!this.max_price || price > parseFloat(this.max_price)) {
            this.max_price = price;
        }

        return this.save();
    };

    // Actualizar calificación de calidad
    ProcurementSupplierItemMapping.prototype.updateQualityRating = async function(rating, wasRejected = false) {
        const currentRating = parseFloat(this.quality_rating) || 0;
        const totalRatings = this.total_purchases || 1;

        // Promedio ponderado
        this.quality_rating = ((currentRating * (totalRatings - 1)) + rating) / totalRatings;

        if (wasRejected) {
            this.rejection_count = (this.rejection_count || 0) + 1;
            this.rejection_rate = (this.rejection_count / totalRatings) * 100;
        }

        return this.save();
    };

    // Actualizar tiempos de entrega
    ProcurementSupplierItemMapping.prototype.updateLeadTime = async function(days) {
        const currentAvg = this.average_lead_time_days || days;
        const count = this.total_purchases || 1;

        this.average_lead_time_days = Math.round(((currentAvg * (count - 1)) + days) / count);

        if (!this.min_lead_time_days || days < this.min_lead_time_days) {
            this.min_lead_time_days = days;
        }
        if (!this.max_lead_time_days || days > this.max_lead_time_days) {
            this.max_lead_time_days = days;
        }

        return this.save();
    };

    // Buscar o crear mapeo
    ProcurementSupplierItemMapping.findOrCreateMapping = async function(companyId, supplierId, supplierCode, data = {}) {
        const [mapping, created] = await this.findOrCreate({
            where: {
                company_id: companyId,
                supplier_id: supplierId,
                supplier_item_code: supplierCode
            },
            defaults: {
                company_id: companyId,
                supplier_id: supplierId,
                supplier_item_code: supplierCode,
                ...data
            }
        });

        return { mapping, created };
    };

    return ProcurementSupplierItemMapping;
};
