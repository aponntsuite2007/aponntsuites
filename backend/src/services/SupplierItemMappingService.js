/**
 * SupplierItemMappingService
 * Servicio para gestionar el mapeo entre códigos de artículos de proveedores
 * y códigos internos del sistema WMS
 *
 * Resuelve el problema: "código OC 0001 → código remito proveedor 5522-36"
 *
 * Módulo Procurement - Gestión de Compras P2P
 */

const { Op } = require('sequelize');

class SupplierItemMappingService {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.models = sequelize.models;
    }

    // ========================================
    // BÚSQUEDA Y RESOLUCIÓN DE CÓDIGOS
    // ========================================

    /**
     * Buscar producto interno por código de proveedor
     * @param {number} companyId - ID de la empresa
     * @param {number} supplierId - ID del proveedor
     * @param {string} supplierCode - Código del proveedor
     * @returns {Object|null} Producto WMS encontrado o null
     */
    async findInternalProduct(companyId, supplierId, supplierCode) {
        try {
            const mapping = await this.models.ProcurementSupplierItemMapping.findOne({
                where: {
                    company_id: companyId,
                    supplier_id: supplierId,
                    supplier_item_code: supplierCode,
                    is_active: true
                }
            });

            if (!mapping) {
                return null;
            }

            // Buscar el producto WMS asociado
            const product = await this.models.WmsProduct?.findOne({
                where: {
                    id: mapping.internal_product_id,
                    company_id: companyId
                }
            });

            return {
                mapping,
                product,
                internalCode: mapping.internal_product_code,
                supplierCode: mapping.supplier_item_code,
                lastPrice: mapping.last_price,
                avgLeadTimeDays: mapping.avg_lead_time_days
            };
        } catch (error) {
            console.error('❌ [SupplierItemMapping] Error buscando producto interno:', error);
            throw error;
        }
    }

    /**
     * Buscar todos los proveedores que venden un producto interno
     * @param {number} companyId - ID de la empresa
     * @param {number} internalProductId - ID del producto interno
     * @returns {Array} Lista de proveedores con sus códigos y precios
     */
    async findSuppliersByProduct(companyId, internalProductId) {
        try {
            const mappings = await this.models.ProcurementSupplierItemMapping.findAll({
                where: {
                    company_id: companyId,
                    internal_product_id: internalProductId,
                    is_active: true
                },
                include: [{
                    model: this.models.ProcurementSupplier,
                    as: 'supplier',
                    attributes: ['id', 'legal_name', 'trade_name', 'status', 'overall_score']
                }],
                order: [
                    ['is_preferred', 'DESC'],
                    ['quality_rating', 'DESC'],
                    ['last_price', 'ASC']
                ]
            });

            return mappings.map(m => ({
                supplierId: m.supplier_id,
                supplierName: m.supplier?.trade_name || m.supplier?.legal_name,
                supplierCode: m.supplier_item_code,
                supplierDescription: m.supplier_item_description,
                lastPrice: m.last_price,
                currency: m.currency,
                minOrderQty: m.min_order_qty,
                avgLeadTimeDays: m.avg_lead_time_days,
                qualityRating: m.quality_rating,
                isPreferred: m.is_preferred,
                lastPurchaseDate: m.last_purchase_date,
                totalPurchased: m.total_qty_purchased,
                totalOrders: m.total_orders
            }));
        } catch (error) {
            console.error('❌ [SupplierItemMapping] Error buscando proveedores:', error);
            throw error;
        }
    }

    // ========================================
    // GESTIÓN DE MAPEOS
    // ========================================

    /**
     * Crear o actualizar mapeo de artículo proveedor
     * @param {Object} data - Datos del mapeo
     * @returns {Object} Mapeo creado/actualizado
     */
    async upsertMapping(data) {
        const {
            companyId,
            supplierId,
            supplierItemCode,
            supplierItemDescription,
            internalProductId,
            internalProductCode,
            conversionFactor = 1,
            minOrderQty,
            lastPrice,
            currency = 'ARS',
            avgLeadTimeDays,
            isPreferred = false,
            notes
        } = data;

        try {
            const [mapping, created] = await this.models.ProcurementSupplierItemMapping.findOrCreate({
                where: {
                    company_id: companyId,
                    supplier_id: supplierId,
                    supplier_item_code: supplierItemCode
                },
                defaults: {
                    supplier_item_description: supplierItemDescription,
                    internal_product_id: internalProductId,
                    internal_product_code: internalProductCode,
                    conversion_factor: conversionFactor,
                    min_order_qty: minOrderQty,
                    last_price: lastPrice,
                    currency,
                    avg_lead_time_days: avgLeadTimeDays,
                    is_preferred: isPreferred,
                    notes,
                    is_active: true
                }
            });

            if (!created) {
                // Actualizar si ya existe
                await mapping.update({
                    supplier_item_description: supplierItemDescription,
                    internal_product_id: internalProductId,
                    internal_product_code: internalProductCode,
                    conversion_factor: conversionFactor,
                    min_order_qty: minOrderQty,
                    last_price: lastPrice,
                    currency,
                    avg_lead_time_days: avgLeadTimeDays,
                    is_preferred: isPreferred,
                    notes,
                    is_active: true
                });
            }

            return { mapping, created };
        } catch (error) {
            console.error('❌ [SupplierItemMapping] Error en upsert:', error);
            throw error;
        }
    }

    /**
     * Importar mapeos masivamente desde Excel/CSV
     * @param {number} companyId - ID de la empresa
     * @param {number} supplierId - ID del proveedor
     * @param {Array} items - Array de items a importar
     * @returns {Object} Resultados de importación
     */
    async bulkImport(companyId, supplierId, items) {
        const results = {
            created: 0,
            updated: 0,
            errors: []
        };

        const transaction = await this.sequelize.transaction();

        try {
            for (const item of items) {
                try {
                    const { mapping, created } = await this.upsertMapping({
                        companyId,
                        supplierId,
                        supplierItemCode: item.supplierCode,
                        supplierItemDescription: item.supplierDescription,
                        internalProductId: item.internalProductId,
                        internalProductCode: item.internalProductCode,
                        conversionFactor: item.conversionFactor,
                        minOrderQty: item.minOrderQty,
                        lastPrice: item.lastPrice,
                        currency: item.currency
                    });

                    if (created) {
                        results.created++;
                    } else {
                        results.updated++;
                    }
                } catch (itemError) {
                    results.errors.push({
                        supplierCode: item.supplierCode,
                        error: itemError.message
                    });
                }
            }

            await transaction.commit();
            return results;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Desactivar mapeo (soft delete)
     * @param {number} mappingId - ID del mapeo
     * @returns {boolean} True si se desactivó
     */
    async deactivateMapping(mappingId) {
        try {
            const result = await this.models.ProcurementSupplierItemMapping.update(
                { is_active: false },
                { where: { id: mappingId } }
            );
            return result[0] > 0;
        } catch (error) {
            console.error('❌ [SupplierItemMapping] Error desactivando:', error);
            throw error;
        }
    }

    // ========================================
    // ACTUALIZACIÓN DE ESTADÍSTICAS
    // ========================================

    /**
     * Actualizar estadísticas después de una compra
     * @param {number} mappingId - ID del mapeo
     * @param {Object} purchaseData - Datos de la compra
     */
    async updatePurchaseStats(mappingId, purchaseData) {
        const {
            quantity,
            unitPrice,
            orderDate,
            deliveryDate
        } = purchaseData;

        try {
            const mapping = await this.models.ProcurementSupplierItemMapping.findByPk(mappingId);
            if (!mapping) return;

            // Calcular nuevo lead time si hay fecha de entrega
            let newAvgLeadTime = mapping.avg_lead_time_days;
            if (orderDate && deliveryDate) {
                const leadTimeDays = Math.ceil(
                    (new Date(deliveryDate) - new Date(orderDate)) / (1000 * 60 * 60 * 24)
                );
                // Promedio móvil ponderado (más peso al último)
                const weight = 0.3;
                newAvgLeadTime = mapping.avg_lead_time_days
                    ? Math.round(mapping.avg_lead_time_days * (1 - weight) + leadTimeDays * weight)
                    : leadTimeDays;
            }

            await mapping.update({
                last_price: unitPrice,
                last_purchase_date: new Date(),
                total_qty_purchased: (mapping.total_qty_purchased || 0) + quantity,
                total_orders: (mapping.total_orders || 0) + 1,
                avg_lead_time_days: newAvgLeadTime
            });
        } catch (error) {
            console.error('❌ [SupplierItemMapping] Error actualizando stats:', error);
            // No lanzar error, es actualización de estadísticas
        }
    }

    /**
     * Actualizar calificación de calidad después de recepción
     * @param {number} mappingId - ID del mapeo
     * @param {number} qualityScore - Puntaje de calidad (1-5)
     */
    async updateQualityRating(mappingId, qualityScore) {
        try {
            const mapping = await this.models.ProcurementSupplierItemMapping.findByPk(mappingId);
            if (!mapping) return;

            // Promedio móvil ponderado
            const weight = 0.2;
            const currentRating = mapping.quality_rating || 3;
            const newRating = currentRating * (1 - weight) + qualityScore * weight;

            await mapping.update({
                quality_rating: Math.round(newRating * 100) / 100
            });
        } catch (error) {
            console.error('❌ [SupplierItemMapping] Error actualizando calidad:', error);
        }
    }

    // ========================================
    // RESOLUCIÓN INTELIGENTE
    // ========================================

    /**
     * Resolver código de proveedor a producto interno con sugerencias
     * Usado durante la recepción de mercadería
     * @param {number} companyId - ID de la empresa
     * @param {number} supplierId - ID del proveedor
     * @param {string} supplierCode - Código del proveedor
     * @param {string} supplierDescription - Descripción del proveedor (opcional)
     * @returns {Object} Resultado con producto resuelto o sugerencias
     */
    async resolveSupplierCode(companyId, supplierId, supplierCode, supplierDescription = null) {
        try {
            // 1. Buscar mapeo exacto
            const exactMatch = await this.findInternalProduct(companyId, supplierId, supplierCode);
            if (exactMatch) {
                return {
                    resolved: true,
                    confidence: 1.0,
                    match: exactMatch,
                    suggestions: []
                };
            }

            // 2. Buscar mapeos similares del mismo proveedor
            const similarMappings = await this.models.ProcurementSupplierItemMapping.findAll({
                where: {
                    company_id: companyId,
                    supplier_id: supplierId,
                    is_active: true,
                    [Op.or]: [
                        { supplier_item_code: { [Op.iLike]: `%${supplierCode}%` } },
                        supplierDescription ? { supplier_item_description: { [Op.iLike]: `%${supplierDescription}%` } } : {}
                    ]
                },
                limit: 5
            });

            // 3. Buscar en el catálogo de productos WMS por descripción
            let productSuggestions = [];
            if (supplierDescription && this.models.WmsProduct) {
                productSuggestions = await this.models.WmsProduct.findAll({
                    where: {
                        company_id: companyId,
                        is_active: true,
                        [Op.or]: [
                            { name: { [Op.iLike]: `%${supplierDescription}%` } },
                            { sku: { [Op.iLike]: `%${supplierCode}%` } }
                        ]
                    },
                    limit: 5
                });
            }

            return {
                resolved: false,
                confidence: 0,
                match: null,
                suggestions: {
                    fromMappings: similarMappings.map(m => ({
                        mappingId: m.id,
                        supplierCode: m.supplier_item_code,
                        supplierDescription: m.supplier_item_description,
                        internalProductId: m.internal_product_id,
                        internalCode: m.internal_product_code
                    })),
                    fromCatalog: productSuggestions.map(p => ({
                        productId: p.id,
                        sku: p.sku,
                        name: p.name,
                        category: p.category
                    }))
                },
                message: 'Código de proveedor no encontrado. Seleccione un producto interno o cree un nuevo mapeo.'
            };
        } catch (error) {
            console.error('❌ [SupplierItemMapping] Error resolviendo código:', error);
            throw error;
        }
    }

    /**
     * Crear mapeo durante la recepción (on-the-fly)
     * Cuando el usuario selecciona manualmente el producto interno
     * @param {Object} data - Datos del mapeo
     * @returns {Object} Mapeo creado
     */
    async createMappingOnTheFly(data) {
        const { mapping } = await this.upsertMapping({
            companyId: data.companyId,
            supplierId: data.supplierId,
            supplierItemCode: data.supplierCode,
            supplierItemDescription: data.supplierDescription,
            internalProductId: data.internalProductId,
            internalProductCode: data.internalProductCode,
            lastPrice: data.unitPrice,
            currency: data.currency,
            notes: `Creado automáticamente durante recepción ${data.receiptNumber || ''}`
        });

        return mapping;
    }

    // ========================================
    // LISTADOS Y REPORTES
    // ========================================

    /**
     * Listar mapeos de un proveedor
     * @param {number} companyId - ID de la empresa
     * @param {number} supplierId - ID del proveedor
     * @param {Object} options - Opciones de paginación y filtros
     * @returns {Object} Lista paginada de mapeos
     */
    async listBySupplier(companyId, supplierId, options = {}) {
        const {
            page = 1,
            limit = 50,
            search = '',
            onlyActive = true
        } = options;

        const where = {
            company_id: companyId,
            supplier_id: supplierId
        };

        if (onlyActive) {
            where.is_active = true;
        }

        if (search) {
            where[Op.or] = [
                { supplier_item_code: { [Op.iLike]: `%${search}%` } },
                { supplier_item_description: { [Op.iLike]: `%${search}%` } },
                { internal_product_code: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows } = await this.models.ProcurementSupplierItemMapping.findAndCountAll({
            where,
            order: [['supplier_item_code', 'ASC']],
            limit,
            offset: (page - 1) * limit
        });

        return {
            items: rows,
            pagination: {
                page,
                limit,
                totalItems: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Obtener estadísticas de mapeos
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Estadísticas
     */
    async getStats(companyId) {
        try {
            const [stats] = await this.sequelize.query(`
                SELECT
                    COUNT(*) as total_mappings,
                    COUNT(DISTINCT supplier_id) as suppliers_with_mappings,
                    COUNT(DISTINCT internal_product_id) as products_mapped,
                    AVG(quality_rating) as avg_quality_rating,
                    SUM(total_orders) as total_orders,
                    COUNT(*) FILTER (WHERE is_preferred = true) as preferred_mappings,
                    COUNT(*) FILTER (WHERE last_purchase_date > NOW() - INTERVAL '30 days') as active_last_30_days
                FROM procurement_supplier_item_mappings
                WHERE company_id = :companyId AND is_active = true
            `, {
                replacements: { companyId },
                type: this.sequelize.QueryTypes.SELECT
            });

            return stats || {};
        } catch (error) {
            console.error('❌ [SupplierItemMapping] Error obteniendo stats:', error);
            return {};
        }
    }

    /**
     * Obtener productos sin mapear de un proveedor
     * (comparando órdenes de compra previas con mapeos existentes)
     * @param {number} companyId - ID de la empresa
     * @param {number} supplierId - ID del proveedor
     * @returns {Array} Productos sin mapear
     */
    async getUnmappedItems(companyId, supplierId) {
        try {
            const [items] = await this.sequelize.query(`
                SELECT DISTINCT
                    poi.item_description,
                    poi.item_code,
                    COUNT(*) as times_purchased
                FROM procurement_order_items poi
                JOIN procurement_orders po ON poi.order_id = po.id
                WHERE po.company_id = :companyId
                  AND po.supplier_id = :supplierId
                  AND poi.item_code IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM procurement_supplier_item_mappings psm
                      WHERE psm.company_id = :companyId
                        AND psm.supplier_id = :supplierId
                        AND psm.supplier_item_code = poi.item_code
                        AND psm.is_active = true
                  )
                GROUP BY poi.item_description, poi.item_code
                ORDER BY times_purchased DESC
                LIMIT 50
            `, {
                replacements: { companyId, supplierId },
                type: this.sequelize.QueryTypes.SELECT
            });

            return items || [];
        } catch (error) {
            console.error('❌ [SupplierItemMapping] Error obteniendo items sin mapear:', error);
            return [];
        }
    }

    // ========================================
    // CONVERSIÓN DE UNIDADES
    // ========================================

    /**
     * Convertir cantidad de proveedor a cantidad interna
     * @param {number} mappingId - ID del mapeo
     * @param {number} supplierQty - Cantidad del proveedor
     * @returns {number} Cantidad interna
     */
    async convertToInternalQty(mappingId, supplierQty) {
        const mapping = await this.models.ProcurementSupplierItemMapping.findByPk(mappingId);
        if (!mapping) {
            throw new Error('Mapeo no encontrado');
        }

        const conversionFactor = parseFloat(mapping.conversion_factor) || 1;
        return supplierQty * conversionFactor;
    }

    /**
     * Convertir cantidad interna a cantidad de proveedor
     * @param {number} mappingId - ID del mapeo
     * @param {number} internalQty - Cantidad interna
     * @returns {number} Cantidad del proveedor
     */
    async convertToSupplierQty(mappingId, internalQty) {
        const mapping = await this.models.ProcurementSupplierItemMapping.findByPk(mappingId);
        if (!mapping) {
            throw new Error('Mapeo no encontrado');
        }

        const conversionFactor = parseFloat(mapping.conversion_factor) || 1;
        return internalQty / conversionFactor;
    }

    // ========================================
    // MARCADO DE PREFERIDOS
    // ========================================

    /**
     * Establecer proveedor preferido para un producto
     * @param {number} companyId - ID de la empresa
     * @param {number} internalProductId - ID del producto interno
     * @param {number} supplierId - ID del proveedor a marcar como preferido
     */
    async setPreferredSupplier(companyId, internalProductId, supplierId) {
        const transaction = await this.sequelize.transaction();

        try {
            // Quitar preferido de todos los proveedores para este producto
            await this.models.ProcurementSupplierItemMapping.update(
                { is_preferred: false },
                {
                    where: {
                        company_id: companyId,
                        internal_product_id: internalProductId
                    },
                    transaction
                }
            );

            // Marcar el seleccionado como preferido
            await this.models.ProcurementSupplierItemMapping.update(
                { is_preferred: true },
                {
                    where: {
                        company_id: companyId,
                        internal_product_id: internalProductId,
                        supplier_id: supplierId
                    },
                    transaction
                }
            );

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = SupplierItemMappingService;
