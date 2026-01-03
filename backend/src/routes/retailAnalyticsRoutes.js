/**
 * Retail Analytics API Routes
 * Endpoints para el sistema de analytics predictivo de retail
 *
 * Módulos:
 *   - Market Basket Analysis
 *   - Demand Forecasting
 *   - Customer Segmentation (RFM)
 *   - ABC/XYZ Classification
 *   - Reorder Suggestions
 *   - Centralized Procurement
 *
 * @author Claude AI
 * @version 1.0.0
 * @date 2025-12-31
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const RetailAnalyticsService = require('../services/RetailAnalyticsService');

// Todas las rutas requieren autenticación
router.use(auth);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD & KPIs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/retail-analytics/dashboard
 * Obtener KPIs principales del dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const data = await RetailAnalyticsService.getDashboardKPIs(companyId);

        res.json({
            success: true,
            data,
            _meta: {
                algorithm: 'Real-time KPI Aggregation',
                source: 'retail_transactions, wms_products, retail_customer_metrics'
            }
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error en dashboard:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SINCRONIZACIÓN DE DATOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/retail-analytics/sync-transactions
 * Sincronizar transacciones desde SIAC
 */
router.post('/sync-transactions', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fromDate, toDate } = req.body;

        const result = await RetailAnalyticsService.syncTransactionsFromSIAC(
            companyId,
            fromDate ? new Date(fromDate) : null,
            toDate ? new Date(toDate) : null
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error en sync:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET BASKET ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/retail-analytics/basket-analysis/run
 * Ejecutar Market Basket Analysis
 */
router.post('/basket-analysis/run', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const options = req.body;

        const result = await RetailAnalyticsService.runMarketBasketAnalysis(companyId, options);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error en MBA:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/retail-analytics/basket-analysis/rules
 * Obtener reglas de asociación
 */
router.get('/basket-analysis/rules', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { limit, minLift, productId } = req.query;

        const result = await RetailAnalyticsService.getAssociationRules(companyId, {
            limit: parseInt(limit) || 50,
            minLift: parseFloat(minLift) || 1.0,
            productId: productId ? parseInt(productId) : null
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error obteniendo reglas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/retail-analytics/basket-analysis/product/:productId
 * Obtener productos frecuentemente comprados con un producto específico
 */
router.get('/basket-analysis/product/:productId', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const productId = parseInt(req.params.productId);

        const result = await RetailAnalyticsService.getAssociationRules(companyId, {
            productId,
            limit: 20,
            minLift: 1.2
        });

        res.json({
            success: true,
            data: result,
            _meta: {
                usage: 'Usar para cross-selling, recomendaciones, ubicación en góndola'
            }
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEMAND FORECASTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/retail-analytics/forecast/generate
 * Generar pronóstico de demanda para un producto
 */
router.post('/forecast/generate', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { productId, horizonDays, modelPreference } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, error: 'productId es requerido' });
        }

        const result = await RetailAnalyticsService.generateDemandForecast(companyId, productId, {
            horizonDays: horizonDays || 30,
            modelPreference: modelPreference || 'auto'
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error en forecast:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/retail-analytics/forecast/bulk
 * Generar pronósticos para múltiples productos
 */
router.post('/forecast/bulk', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { productIds, horizonDays } = req.body;

        if (!productIds || !Array.isArray(productIds)) {
            return res.status(400).json({ success: false, error: 'productIds array es requerido' });
        }

        const results = [];
        for (const productId of productIds.slice(0, 50)) { // Máximo 50
            try {
                const result = await RetailAnalyticsService.generateDemandForecast(
                    companyId,
                    productId,
                    { horizonDays: horizonDays || 30 }
                );
                results.push({ productId, success: true, ...result });
            } catch (err) {
                results.push({ productId, success: false, error: err.message });
            }
        }

        res.json({
            success: true,
            data: {
                processed: results.length,
                successful: results.filter(r => r.success).length,
                results
            }
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error en bulk forecast:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER SEGMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/retail-analytics/rfm/calculate
 * Calcular segmentación RFM
 */
router.post('/rfm/calculate', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const result = await RetailAnalyticsService.calculateRFMSegmentation(companyId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error en RFM:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/retail-analytics/rfm/segments
 * Obtener resumen de segmentos
 */
router.get('/rfm/segments', async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const { sequelize } = require('../config/database');
        const segments = await sequelize.query(`
            SELECT * FROM retail_customer_segments_summary
            WHERE company_id = $1
        `, {
            bind: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: { segments },
            _meta: {
                algorithm: 'RFM Analysis with Quintile Scoring',
                segments_description: {
                    champions: 'Mejores clientes - compran recientemente, frecuentemente y gastan mucho',
                    loyal: 'Clientes leales - compran regularmente',
                    at_risk: 'En riesgo - fueron buenos pero hace tiempo no compran',
                    lost: 'Perdidos - inactivos hace mucho tiempo'
                }
            }
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error obteniendo segmentos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/retail-analytics/rfm/customers/:segment
 * Obtener clientes de un segmento específico
 */
router.get('/rfm/customers/:segment', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const segment = req.params.segment;
        const { limit = 50, offset = 0 } = req.query;

        const { sequelize } = require('../config/database');
        const customers = await sequelize.query(`
            SELECT
                cm.customer_id,
                cm.customer_code,
                cm.customer_name,
                cm.rfm_score,
                cm.recency_score,
                cm.frequency_score,
                cm.monetary_score,
                cm.total_orders,
                cm.total_revenue,
                cm.last_purchase_date,
                cm.days_since_last_purchase,
                cm.predicted_clv,
                cm.churn_probability
            FROM retail_customer_metrics cm
            WHERE cm.company_id = $1
            AND cm.rfm_segment = $2
            ORDER BY cm.total_revenue DESC
            LIMIT $3 OFFSET $4
        `, {
            bind: [companyId, segment, parseInt(limit), parseInt(offset)],
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: { customers, segment, count: customers.length }
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ABC/XYZ CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/retail-analytics/abc-xyz/calculate
 * Calcular clasificación ABC/XYZ
 */
router.post('/abc-xyz/calculate', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { warehouseId } = req.body;

        const result = await RetailAnalyticsService.calculateABCXYZClassification(
            companyId,
            warehouseId || null
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error en ABC/XYZ:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/retail-analytics/abc-xyz/products
 * Obtener productos con clasificación
 */
router.get('/abc-xyz/products', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { abcClass, xyzClass, warehouseId, limit = 100 } = req.query;

        const { sequelize } = require('../config/database');
        let query = `
            SELECT * FROM retail_products_dashboard
            WHERE company_id = $1
        `;
        const bind = [companyId];
        let paramIndex = 2;

        if (abcClass) {
            query += ` AND abc_class = $${paramIndex++}`;
            bind.push(abcClass);
        }
        if (xyzClass) {
            query += ` AND xyz_class = $${paramIndex++}`;
            bind.push(xyzClass);
        }
        if (warehouseId) {
            query += ` AND warehouse_id = $${paramIndex++}`;
            bind.push(parseInt(warehouseId));
        }

        query += ` ORDER BY abc_class, xyz_class LIMIT $${paramIndex}`;
        bind.push(parseInt(limit));

        const products = await sequelize.query(query, {
            bind,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: { products, count: products.length },
            _meta: {
                algorithm: 'ABC (Pareto) + XYZ (Coefficient of Variation)',
                recommendations: {
                    'AX': 'JIT, reabastecimiento frecuente, pronóstico fácil',
                    'AY': 'Stock de seguridad medio',
                    'AZ': 'Stock de seguridad alto, difícil de pronosticar',
                    'CZ': 'Evaluar discontinuación'
                }
            }
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REORDER SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/retail-analytics/reorder/generate
 * Generar sugerencias de reorden
 */
router.post('/reorder/generate', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { warehouseId } = req.body;

        if (!warehouseId) {
            return res.status(400).json({ success: false, error: 'warehouseId es requerido' });
        }

        const result = await RetailAnalyticsService.generateReorderSuggestions(companyId, warehouseId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error en reorder:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/retail-analytics/reorder/suggestions
 * Obtener sugerencias de reorden pendientes
 */
router.get('/reorder/suggestions', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { warehouseId, urgency, supplierId, status = 'pending' } = req.query;

        const { sequelize } = require('../config/database');
        let query = `
            SELECT *
            FROM retail_reorder_suggestions
            WHERE company_id = $1
            AND status = $2
        `;
        const bind = [companyId, status];
        let paramIndex = 3;

        if (warehouseId) {
            query += ` AND warehouse_id = $${paramIndex++}`;
            bind.push(parseInt(warehouseId));
        }
        if (urgency) {
            query += ` AND order_urgency = $${paramIndex++}`;
            bind.push(urgency);
        }
        if (supplierId) {
            query += ` AND supplier_id = $${paramIndex++}`;
            bind.push(parseInt(supplierId));
        }

        query += ` ORDER BY
            CASE order_urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
            stockout_probability DESC`;

        const suggestions = await sequelize.query(query, {
            bind,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                suggestions,
                count: suggestions.length,
                summary: {
                    critical: suggestions.filter(s => s.order_urgency === 'critical').length,
                    urgent: suggestions.filter(s => s.order_urgency === 'urgent').length,
                    normal: suggestions.filter(s => s.order_urgency === 'normal').length
                }
            }
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/retail-analytics/reorder/approve
 * Aprobar sugerencias y crear orden de compra
 */
router.post('/reorder/approve', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { suggestionIds, supplierId } = req.body;

        if (!suggestionIds || !Array.isArray(suggestionIds) || suggestionIds.length === 0) {
            return res.status(400).json({ success: false, error: 'suggestionIds array es requerido' });
        }

        const { sequelize } = require('../config/database');

        // Actualizar estado de sugerencias
        await sequelize.query(`
            UPDATE retail_reorder_suggestions
            SET status = 'approved', approved_by = $1, approved_at = NOW()
            WHERE id = ANY($2::int[])
            AND company_id = $3
        `, {
            bind: [req.user.user_id, suggestionIds, companyId]
        });

        // TODO: Integrar con ProcurementService para crear orden de compra

        res.json({
            success: true,
            data: {
                approved: suggestionIds.length,
                message: 'Sugerencias aprobadas. Orden de compra pendiente de crear.'
            }
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error aprobando:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CENTRALIZED PROCUREMENT (Multi-Branch)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/retail-analytics/centralized/pending
 * Obtener solicitudes de sucursales pendientes de consolidar
 */
router.get('/centralized/pending', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const result = await RetailAnalyticsService.getPendingConsolidation(companyId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/retail-analytics/centralized/consolidate
 * Consolidar solicitudes de sucursales
 */
router.post('/centralized/consolidate', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { cediId, supplierId, requestIds } = req.body;

        if (!cediId || !supplierId) {
            return res.status(400).json({
                success: false,
                error: 'cediId y supplierId son requeridos'
            });
        }

        const result = await RetailAnalyticsService.consolidateBranchRequests(
            companyId,
            cediId,
            supplierId,
            requestIds || null
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error consolidando:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/retail-analytics/centralized/distribute
 * Crear distribuciones desde orden consolidada
 */
router.post('/centralized/distribute', async (req, res) => {
    try {
        const { consolidatedOrderId, locationId } = req.body;

        if (!consolidatedOrderId) {
            return res.status(400).json({
                success: false,
                error: 'consolidatedOrderId es requerido'
            });
        }

        const result = await RetailAnalyticsService.createDistributionsFromConsolidated(
            consolidatedOrderId,
            locationId || null
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error distribuyendo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/retail-analytics/centralized/network-stock
 * Obtener stock en toda la red de sucursales
 */
router.get('/centralized/network-stock', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { productId, categoryId, limit = 100 } = req.query;

        const { sequelize } = require('../config/database');
        let query = `
            SELECT * FROM retail_network_stock
            WHERE company_id = $1
        `;
        const bind = [companyId];
        let paramIndex = 2;

        if (productId) {
            query += ` AND product_id = $${paramIndex++}`;
            bind.push(parseInt(productId));
        }
        if (categoryId) {
            query += ` AND category_id = $${paramIndex++}`;
            bind.push(parseInt(categoryId));
        }

        query += ` LIMIT $${paramIndex}`;
        bind.push(parseInt(limit));

        const stock = await sequelize.query(query, {
            bind,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                stock,
                count: stock.length
            },
            _meta: {
                description: 'Stock de productos en toda la red de sucursales',
                usage: 'Visualizar disponibilidad, identificar desbalanceos, planificar transferencias'
            }
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/retail-analytics/config
 * Obtener configuración del módulo
 */
router.get('/config', async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const { sequelize } = require('../config/database');
        const config = await sequelize.query(`
            SELECT * FROM retail_analytics_config
            WHERE company_id = $1
        `, {
            bind: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: config[0] || {
                basket_analysis_enabled: true,
                demand_forecast_enabled: true,
                customer_segmentation_enabled: true,
                price_optimization_enabled: false,
                auto_reorder_enabled: false
            }
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/retail-analytics/config
 * Actualizar configuración del módulo
 */
router.put('/config', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const updates = req.body;

        const { sequelize } = require('../config/database');

        // Construir SET clause dinámicamente
        const allowedFields = [
            'basket_analysis_enabled', 'demand_forecast_enabled',
            'customer_segmentation_enabled', 'price_optimization_enabled',
            'auto_reorder_enabled', 'basket_min_support', 'basket_min_confidence',
            'forecast_horizon_days', 'reorder_safety_stock_service_level'
        ];

        const setClauses = [];
        const bind = [companyId];
        let paramIndex = 2;

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = $${paramIndex++}`);
                bind.push(updates[field]);
            }
        }

        if (setClauses.length > 0) {
            setClauses.push('updated_at = NOW()');
            await sequelize.query(`
                UPDATE retail_analytics_config
                SET ${setClauses.join(', ')}
                WHERE company_id = $1
            `, { bind });
        }

        res.json({
            success: true,
            message: 'Configuración actualizada'
        });
    } catch (error) {
        console.error('❌ [RetailAnalytics API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
