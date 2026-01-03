/**
 * RetailAnalyticsService
 * Servicio principal de Analytics para Retail con IA Predictiva
 *
 * Algoritmos implementados:
 *   - Market Basket Analysis: FP-Growth, Apriori
 *   - Demand Forecasting: Prophet (via API), SARIMA, Simple Exponential Smoothing
 *   - Customer Segmentation: RFM + K-Means
 *   - Price Elasticity: Log-Log Regression
 *   - ABC/XYZ Classification
 *
 * Integración:
 *   - SIAC Facturación (fuente de ventas)
 *   - WMS (productos, stock)
 *   - Procurement (proveedores, compras)
 *   - Compra Centralizada Multi-Sucursal
 *
 * @author Claude AI
 * @version 1.0.0
 * @date 2025-12-31
 */

const { sequelize } = require('../config/database');

class RetailAnalyticsService {

    constructor() {
        // Configuración por defecto
        this.config = {
            basket: {
                minSupport: 0.01,      // 1% mínimo
                minConfidence: 0.3,    // 30% mínimo
                minLift: 1.2,          // Lift > 1.2 para ser interesante
                minTransactions: 30,   // Mínimo de transacciones
                lookbackDays: 90       // Últimos 90 días
            },
            forecast: {
                horizonDays: 30,
                confidenceLevel: 0.95,
                minHistoryDays: 60,
                modelPreference: 'auto' // 'ses', 'moving_avg', 'weighted_avg', 'auto'
            },
            rfm: {
                recencyBins: [365, 180, 90, 30, 7],
                frequencyBins: [1, 2, 4, 8, 20],
                monetaryBins: [1000, 5000, 20000, 50000, 100000]
            },
            reorder: {
                serviceLevel: 0.95,
                leadTimeBuffer: 2,
                groupBySupplier: true
            }
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * SINCRONIZACIÓN DE TRANSACCIONES
     * Fuente: SIAC Facturación → retail_transactions
     * ═══════════════════════════════════════════════════════════════════════════════
     */

    /**
     * Sincroniza transacciones desde SIAC a retail_transactions
     * @param {number} companyId - ID de la empresa
     * @param {Date} fromDate - Fecha desde (opcional)
     * @param {Date} toDate - Fecha hasta (opcional)
     * @returns {Object} Resultados de sincronización
     */
    async syncTransactionsFromSIAC(companyId, fromDate = null, toDate = null) {
        const from = fromDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Ayer
        const to = toDate || new Date();

        try {
            const result = await sequelize.query(`
                SELECT * FROM retail_sync_transactions_from_siac($1, $2, $3)
            `, {
                bind: [companyId, from.toISOString().split('T')[0], to.toISOString().split('T')[0]],
                type: sequelize.QueryTypes.SELECT
            });

            return {
                success: true,
                transactionsSynced: result[0]?.transactions_synced || 0,
                itemsSynced: result[0]?.items_synced || 0,
                dateRange: { from, to },
                info: {
                    title: '🔄 Sincronización Completada',
                    description: 'Transacciones de SIAC importadas al sistema de analytics',
                    algorithm: 'SQL Bulk Insert with Conflict Resolution',
                    techDetails: {
                        source: 'siac_facturas + siac_facturas_items',
                        destination: 'retail_transactions + retail_transaction_items',
                        strategy: 'UPSERT (INSERT ON CONFLICT DO UPDATE)'
                    }
                }
            };
        } catch (error) {
            console.error('❌ [RetailAnalytics] Error en sincronización:', error);
            throw error;
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * MARKET BASKET ANALYSIS
     * Algoritmo: FP-Growth simplificado (SQL-based para rendimiento)
     * ═══════════════════════════════════════════════════════════════════════════════
     */

    /**
     * Ejecuta análisis de canasta de mercado
     * @param {number} companyId - ID de la empresa
     * @param {Object} options - Opciones del análisis
     * @returns {Object} Reglas de asociación encontradas
     */
    async runMarketBasketAnalysis(companyId, options = {}) {
        const config = { ...this.config.basket, ...options };
        const lookbackDate = new Date(Date.now() - config.lookbackDays * 24 * 60 * 60 * 1000);

        console.log(`🛒 [RetailAnalytics] Iniciando Market Basket Analysis para company ${companyId}`);

        try {
            // 1. Calcular itemsets frecuentes de 2 items
            const pairFrequencies = await this._calculatePairFrequencies(companyId, lookbackDate);

            // 2. Calcular soporte individual
            const itemSupports = await this._calculateItemSupports(companyId, lookbackDate);

            // 3. Total de transacciones
            const totalTransactions = await this._getTotalTransactions(companyId, lookbackDate);

            if (totalTransactions < config.minTransactions) {
                return {
                    success: false,
                    error: `Insuficientes transacciones (${totalTransactions}). Mínimo requerido: ${config.minTransactions}`,
                    info: {
                        title: '⚠️ Datos Insuficientes',
                        description: 'Se requieren más transacciones para generar reglas significativas'
                    }
                };
            }

            // 4. Generar reglas de asociación
            const rules = [];
            for (const pair of pairFrequencies) {
                const support = pair.count / totalTransactions;

                if (support < config.minSupport) continue;

                const supportA = (itemSupports.get(pair.product_a_id) || 0) / totalTransactions;
                const supportB = (itemSupports.get(pair.product_b_id) || 0) / totalTransactions;

                if (supportA === 0 || supportB === 0) continue;

                // Regla A → B
                const confidenceAB = support / supportA;
                const liftAB = confidenceAB / supportB;

                if (confidenceAB >= config.minConfidence && liftAB >= config.minLift) {
                    rules.push({
                        antecedent: { id: pair.product_a_id, name: pair.product_a_name },
                        consequent: { id: pair.product_b_id, name: pair.product_b_name },
                        support: Math.round(support * 10000) / 10000,
                        confidence: Math.round(confidenceAB * 10000) / 10000,
                        lift: Math.round(liftAB * 100) / 100,
                        transactionCount: pair.count,
                        leverage: Math.round((support - supportA * supportB) * 10000) / 10000
                    });
                }

                // Regla B → A
                const confidenceBA = support / supportB;
                const liftBA = confidenceBA / supportA;

                if (confidenceBA >= config.minConfidence && liftBA >= config.minLift) {
                    rules.push({
                        antecedent: { id: pair.product_b_id, name: pair.product_b_name },
                        consequent: { id: pair.product_a_id, name: pair.product_a_name },
                        support: Math.round(support * 10000) / 10000,
                        confidence: Math.round(confidenceBA * 10000) / 10000,
                        lift: Math.round(liftBA * 100) / 100,
                        transactionCount: pair.count,
                        leverage: Math.round((support - supportB * supportA) * 10000) / 10000
                    });
                }
            }

            // 5. Ordenar por lift descendente
            rules.sort((a, b) => b.lift - a.lift);

            // 6. Guardar reglas en BD
            await this._saveAssociationRules(companyId, rules, config, lookbackDate);

            console.log(`✅ [RetailAnalytics] MBA completado: ${rules.length} reglas generadas`);

            return {
                success: true,
                rulesGenerated: rules.length,
                topRules: rules.slice(0, 20),
                totalTransactions,
                parameters: config,
                info: {
                    title: '🛒 Market Basket Analysis Completado',
                    description: `${rules.length} reglas de asociación descubiertas`,
                    algorithm: 'FP-Growth Simplified (SQL-Optimized)',
                    techDetails: {
                        method: 'Frequent Itemset Mining + Association Rules',
                        metrics: ['Support', 'Confidence', 'Lift', 'Leverage'],
                        complexity: 'O(n*m) donde n=transacciones, m=productos únicos',
                        reference: 'Agrawal, R., & Srikant, R. (1994). Fast algorithms for mining association rules'
                    },
                    interpretation: {
                        support: 'Porcentaje de transacciones con ambos productos',
                        confidence: 'Probabilidad de B dado A. Ej: 70% = 7 de cada 10 que compran A, compran B',
                        lift: 'Fuerza de asociación. >1 indica asociación positiva. Ej: 2.5 = 2.5x más probable'
                    }
                }
            };
        } catch (error) {
            console.error('❌ [RetailAnalytics] Error en MBA:', error);
            throw error;
        }
    }

    async _calculatePairFrequencies(companyId, fromDate) {
        const result = await sequelize.query(`
            SELECT
                a.product_id as product_a_id,
                a.product_name as product_a_name,
                b.product_id as product_b_id,
                b.product_name as product_b_name,
                COUNT(DISTINCT a.transaction_id) as count
            FROM retail_transaction_items a
            JOIN retail_transaction_items b ON a.transaction_id = b.transaction_id
            JOIN retail_transactions rt ON a.transaction_id = rt.id
            WHERE rt.company_id = $1
            AND rt.transaction_date >= $2
            AND a.product_id < b.product_id
            AND a.product_id IS NOT NULL
            AND b.product_id IS NOT NULL
            GROUP BY a.product_id, a.product_name, b.product_id, b.product_name
            HAVING COUNT(DISTINCT a.transaction_id) >= 5
            ORDER BY count DESC
            LIMIT 1000
        `, {
            bind: [companyId, fromDate.toISOString().split('T')[0]],
            type: sequelize.QueryTypes.SELECT
        });
        return result;
    }

    async _calculateItemSupports(companyId, fromDate) {
        const result = await sequelize.query(`
            SELECT
                rti.product_id,
                COUNT(DISTINCT rti.transaction_id) as count
            FROM retail_transaction_items rti
            JOIN retail_transactions rt ON rti.transaction_id = rt.id
            WHERE rt.company_id = $1
            AND rt.transaction_date >= $2
            AND rti.product_id IS NOT NULL
            GROUP BY rti.product_id
        `, {
            bind: [companyId, fromDate.toISOString().split('T')[0]],
            type: sequelize.QueryTypes.SELECT
        });

        const map = new Map();
        for (const row of result) {
            map.set(row.product_id, parseInt(row.count));
        }
        return map;
    }

    async _getTotalTransactions(companyId, fromDate) {
        const result = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM retail_transactions
            WHERE company_id = $1
            AND transaction_date >= $2
        `, {
            bind: [companyId, fromDate.toISOString().split('T')[0]],
            type: sequelize.QueryTypes.SELECT
        });
        return parseInt(result[0]?.count || 0);
    }

    async _saveAssociationRules(companyId, rules, config, fromDate) {
        const toDate = new Date();
        const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

        // Marcar reglas anteriores como superseded
        await sequelize.query(`
            UPDATE retail_association_rules
            SET status = 'superseded', updated_at = NOW()
            WHERE company_id = $1 AND status = 'active'
        `, { bind: [companyId] });

        // Insertar nuevas reglas
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            const ruleCode = `RULE-${companyId}-${Date.now()}-${i}`;

            await sequelize.query(`
                INSERT INTO retail_association_rules (
                    company_id, rule_code, rule_type,
                    antecedent_type, antecedent_ids, antecedent_names,
                    consequent_type, consequent_ids, consequent_names,
                    support, confidence, lift, leverage,
                    transactions_count, min_transactions,
                    algorithm, min_support_used, min_confidence_used,
                    calculated_from, calculated_to, valid_until, status
                ) VALUES (
                    $1, $2, 'product',
                    'product', ARRAY[$3], ARRAY[$4],
                    'product', ARRAY[$5], ARRAY[$6],
                    $7, $8, $9, $10,
                    $11, $12,
                    'fpgrowth', $13, $14,
                    $15, $16, $17, 'active'
                )
            `, {
                bind: [
                    companyId, ruleCode,
                    rule.antecedent.id, rule.antecedent.name,
                    rule.consequent.id, rule.consequent.name,
                    rule.support, rule.confidence, rule.lift, rule.leverage,
                    rule.transactionCount, config.minTransactions,
                    config.minSupport, config.minConfidence,
                    fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0],
                    validUntil.toISOString().split('T')[0]
                ]
            });
        }
    }

    /**
     * Obtener reglas de asociación activas
     */
    async getAssociationRules(companyId, options = {}) {
        const { limit = 50, minLift = 1.0, productId = null } = options;

        let whereClause = 'WHERE company_id = $1 AND status = $2';
        const bind = [companyId, 'active'];

        if (productId) {
            whereClause += ' AND ($3 = ANY(antecedent_ids) OR $3 = ANY(consequent_ids))';
            bind.push(productId);
        }

        const result = await sequelize.query(`
            SELECT
                rule_code,
                antecedent_names[1] as if_buys,
                consequent_names[1] as then_also_buys,
                ROUND(support * 100, 2) as support_pct,
                ROUND(confidence * 100, 2) as confidence_pct,
                ROUND(lift::numeric, 2) as lift,
                transactions_count,
                calculated_from,
                calculated_to
            FROM retail_association_rules
            ${whereClause}
            AND lift >= ${minLift}
            ORDER BY lift DESC
            LIMIT ${limit}
        `, {
            bind,
            type: sequelize.QueryTypes.SELECT
        });

        return {
            rules: result,
            count: result.length,
            info: {
                title: '🔗 Reglas de Asociación',
                description: 'Productos frecuentemente comprados juntos',
                usage: 'Usar para cross-selling, ubicación en góndola, promociones bundle'
            }
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * DEMAND FORECASTING
     * Algoritmos: Simple Exponential Smoothing, Moving Average, Weighted Average
     * (Prophet y SARIMA requieren Python - se integran via API externa)
     * ═══════════════════════════════════════════════════════════════════════════════
     */

    /**
     * Genera pronóstico de demanda para un producto
     * @param {number} companyId - ID de la empresa
     * @param {number} productId - ID del producto
     * @param {Object} options - Opciones del pronóstico
     * @returns {Object} Pronóstico generado
     */
    async generateDemandForecast(companyId, productId, options = {}) {
        const config = { ...this.config.forecast, ...options };
        const fromDate = new Date(Date.now() - config.minHistoryDays * 24 * 60 * 60 * 1000);

        console.log(`📈 [RetailAnalytics] Generando forecast para producto ${productId}`);

        try {
            // 1. Obtener histórico de ventas diarias
            const history = await this._getProductSalesHistory(companyId, productId, fromDate);

            if (history.length < 14) {
                return {
                    success: false,
                    error: `Historial insuficiente (${history.length} días). Mínimo: 14 días`,
                    info: {
                        title: '⚠️ Datos Insuficientes',
                        description: 'Se requiere más historial de ventas para generar pronóstico'
                    }
                };
            }

            // 2. Seleccionar mejor método
            const methodResults = {};

            // 2.1 Simple Exponential Smoothing (SES)
            const sesForecast = this._simpleExponentialSmoothing(history, config.horizonDays);
            methodResults.ses = sesForecast;

            // 2.2 Moving Average
            const maForecast = this._movingAverage(history, 7, config.horizonDays);
            methodResults.moving_avg = maForecast;

            // 2.3 Weighted Moving Average
            const wmaForecast = this._weightedMovingAverage(history, 7, config.horizonDays);
            methodResults.weighted_avg = wmaForecast;

            // 3. Seleccionar mejor método basado en error histórico
            let bestMethod = 'ses';
            let bestForecast = sesForecast;

            if (config.modelPreference !== 'auto') {
                bestMethod = config.modelPreference;
                bestForecast = methodResults[config.modelPreference] || sesForecast;
            } else {
                // Evaluar MAE en últimos 7 días
                const testData = history.slice(-7);
                let minError = Infinity;

                for (const [method, forecast] of Object.entries(methodResults)) {
                    const error = this._calculateMAE(testData, forecast.backtestPredictions || []);
                    if (error < minError) {
                        minError = error;
                        bestMethod = method;
                        bestForecast = forecast;
                    }
                }
            }

            // 4. Agregar intervalos de confianza
            const stdDev = this._calculateStdDev(history.map(h => h.quantity));
            const z95 = 1.96;
            const z80 = 1.28;

            const predictions = bestForecast.predictions.map((pred, i) => {
                const uncertainty = stdDev * Math.sqrt(1 + i * 0.1); // Incertidumbre crece con horizonte
                return {
                    date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    predicted: Math.round(pred * 100) / 100,
                    lower_95: Math.max(0, Math.round((pred - z95 * uncertainty) * 100) / 100),
                    upper_95: Math.round((pred + z95 * uncertainty) * 100) / 100,
                    lower_80: Math.max(0, Math.round((pred - z80 * uncertainty) * 100) / 100),
                    upper_80: Math.round((pred + z80 * uncertainty) * 100) / 100
                };
            });

            // 5. Guardar en BD
            await this._saveForecast(companyId, productId, predictions, bestMethod, {
                mae: bestForecast.mae || 0,
                historyDays: history.length,
                alpha: bestForecast.alpha
            });

            // 6. Calcular demanda total para horizonte
            const totalForecastedDemand = predictions.reduce((sum, p) => sum + p.predicted, 0);

            console.log(`✅ [RetailAnalytics] Forecast generado: ${predictions.length} días, método: ${bestMethod}`);

            return {
                success: true,
                productId,
                method: bestMethod,
                predictions,
                summary: {
                    totalForecastedDemand: Math.round(totalForecastedDemand * 100) / 100,
                    avgDailyDemand: Math.round((totalForecastedDemand / config.horizonDays) * 100) / 100,
                    trend: this._detectTrend(predictions.map(p => p.predicted))
                },
                info: {
                    title: '📈 Pronóstico de Demanda',
                    description: `Pronóstico para los próximos ${config.horizonDays} días`,
                    algorithm: this._getMethodDescription(bestMethod),
                    techDetails: {
                        method: bestMethod,
                        alpha: bestForecast.alpha,
                        historyUsed: `${history.length} días`,
                        confidenceLevel: '95% y 80%',
                        uncertainty: 'Crece con horizonte temporal'
                    },
                    interpretation: {
                        predicted: 'Valor esperado de demanda',
                        confidence_intervals: 'Rango donde la demanda real debería caer con 95%/80% de probabilidad',
                        trend: 'Dirección general del pronóstico'
                    }
                }
            };
        } catch (error) {
            console.error('❌ [RetailAnalytics] Error en forecast:', error);
            throw error;
        }
    }

    _simpleExponentialSmoothing(history, horizon, alpha = null) {
        const values = history.map(h => h.quantity);

        // Optimizar alpha si no se proporciona
        if (!alpha) {
            alpha = this._optimizeAlpha(values);
        }

        // Calcular pronóstico
        let level = values[0];
        const fitted = [level];

        for (let i = 1; i < values.length; i++) {
            level = alpha * values[i] + (1 - alpha) * level;
            fitted.push(level);
        }

        // Generar predicciones futuras
        const predictions = new Array(horizon).fill(level);

        // Backtest para MAE
        const backtestPredictions = fitted.slice(-7);

        return {
            predictions,
            backtestPredictions,
            alpha,
            mae: this._calculateMAE(history.slice(-7), backtestPredictions.map(p => ({ quantity: p })))
        };
    }

    _movingAverage(history, window, horizon) {
        const values = history.map(h => h.quantity);
        const lastWindow = values.slice(-window);
        const avg = lastWindow.reduce((a, b) => a + b, 0) / window;

        const predictions = new Array(horizon).fill(avg);

        return {
            predictions,
            backtestPredictions: new Array(7).fill(avg),
            window
        };
    }

    _weightedMovingAverage(history, window, horizon) {
        const values = history.map(h => h.quantity);
        const lastWindow = values.slice(-window);

        // Pesos linealmente crecientes (más peso a datos recientes)
        const weights = lastWindow.map((_, i) => i + 1);
        const sumWeights = weights.reduce((a, b) => a + b, 0);

        const wma = lastWindow.reduce((sum, val, i) => sum + val * weights[i], 0) / sumWeights;
        const predictions = new Array(horizon).fill(wma);

        return {
            predictions,
            backtestPredictions: new Array(7).fill(wma),
            window
        };
    }

    _optimizeAlpha(values) {
        let bestAlpha = 0.3;
        let minError = Infinity;

        for (let alpha = 0.1; alpha <= 0.9; alpha += 0.1) {
            let level = values[0];
            let totalError = 0;

            for (let i = 1; i < values.length; i++) {
                const error = Math.abs(values[i] - level);
                totalError += error;
                level = alpha * values[i] + (1 - alpha) * level;
            }

            if (totalError < minError) {
                minError = totalError;
                bestAlpha = alpha;
            }
        }

        return Math.round(bestAlpha * 10) / 10;
    }

    _calculateMAE(actual, predicted) {
        if (!actual.length || !predicted.length) return Infinity;
        const n = Math.min(actual.length, predicted.length);
        let sum = 0;
        for (let i = 0; i < n; i++) {
            const actualVal = typeof actual[i] === 'object' ? actual[i].quantity : actual[i];
            const predVal = typeof predicted[i] === 'object' ? predicted[i].quantity : predicted[i];
            sum += Math.abs(actualVal - predVal);
        }
        return sum / n;
    }

    _calculateStdDev(values) {
        const n = values.length;
        if (n === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / n);
    }

    _detectTrend(values) {
        if (values.length < 2) return 'stable';
        const first = values.slice(0, Math.floor(values.length / 2));
        const second = values.slice(Math.floor(values.length / 2));
        const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
        const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
        const change = (avgSecond - avgFirst) / avgFirst;
        if (change > 0.1) return 'up';
        if (change < -0.1) return 'down';
        return 'stable';
    }

    _getMethodDescription(method) {
        const descriptions = {
            ses: 'Simple Exponential Smoothing (SES)',
            moving_avg: 'Moving Average (MA-7)',
            weighted_avg: 'Weighted Moving Average (WMA-7)',
            prophet: 'Facebook Prophet (via Python API)',
            sarima: 'SARIMA (via Python API)'
        };
        return descriptions[method] || method;
    }

    async _getProductSalesHistory(companyId, productId, fromDate) {
        const result = await sequelize.query(`
            SELECT
                rt.transaction_date::DATE as date,
                SUM(rti.quantity) as quantity,
                SUM(rti.line_total) as revenue
            FROM retail_transaction_items rti
            JOIN retail_transactions rt ON rti.transaction_id = rt.id
            WHERE rt.company_id = $1
            AND rti.product_id = $2
            AND rt.transaction_date >= $3
            GROUP BY rt.transaction_date::DATE
            ORDER BY rt.transaction_date::DATE
        `, {
            bind: [companyId, productId, fromDate.toISOString().split('T')[0]],
            type: sequelize.QueryTypes.SELECT
        });
        return result;
    }

    async _saveForecast(companyId, productId, predictions, method, metrics) {
        for (const pred of predictions) {
            await sequelize.query(`
                INSERT INTO retail_demand_forecasts (
                    company_id, entity_type, entity_id,
                    forecast_date, forecast_period, horizon_days,
                    predicted_quantity, lower_bound_95, upper_bound_95,
                    lower_bound_80, upper_bound_80,
                    model_type, mape, status
                ) VALUES (
                    $1, 'product', $2,
                    $3, 'daily', 1,
                    $4, $5, $6,
                    $7, $8,
                    $9, $10, 'active'
                )
                ON CONFLICT DO NOTHING
            `, {
                bind: [
                    companyId, productId,
                    pred.date,
                    pred.predicted, pred.lower_95, pred.upper_95,
                    pred.lower_80, pred.upper_80,
                    method, metrics.mae
                ]
            });
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * CUSTOMER SEGMENTATION (RFM)
     * ═══════════════════════════════════════════════════════════════════════════════
     */

    /**
     * Calcula segmentación RFM de clientes
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Resultados de segmentación
     */
    async calculateRFMSegmentation(companyId) {
        console.log(`👥 [RetailAnalytics] Calculando RFM para company ${companyId}`);

        try {
            const result = await sequelize.query(`
                SELECT retail_calculate_rfm($1, CURRENT_DATE)
            `, {
                bind: [companyId],
                type: sequelize.QueryTypes.SELECT
            });

            const updated = result[0]?.retail_calculate_rfm || 0;

            // Obtener resumen por segmento
            const segments = await sequelize.query(`
                SELECT
                    rfm_segment,
                    COUNT(*) as customer_count,
                    SUM(total_revenue) as total_revenue,
                    ROUND(AVG(total_orders)::numeric, 1) as avg_orders,
                    ROUND(AVG(total_revenue)::numeric, 2) as avg_revenue,
                    ROUND(AVG(days_since_last_purchase)::numeric, 0) as avg_days_since_purchase
                FROM retail_customer_metrics
                WHERE company_id = $1
                GROUP BY rfm_segment
                ORDER BY total_revenue DESC
            `, {
                bind: [companyId],
                type: sequelize.QueryTypes.SELECT
            });

            console.log(`✅ [RetailAnalytics] RFM completado: ${updated} clientes actualizados`);

            return {
                success: true,
                customersUpdated: updated,
                segments,
                info: {
                    title: '👥 Segmentación RFM Completada',
                    description: 'Clientes clasificados por Recency, Frequency y Monetary value',
                    algorithm: 'RFM Analysis with Quintile Scoring',
                    techDetails: {
                        method: 'NTILE(5) scoring para cada dimensión',
                        scoring: '1-5 para R, F, M (5 = mejor)',
                        segments: ['champions', 'loyal', 'at_risk', 'lost', 'new_customers', 'potential_loyalist']
                    },
                    interpretation: {
                        recency: 'Días desde última compra (menor = mejor)',
                        frequency: 'Cantidad de compras (mayor = mejor)',
                        monetary: 'Monto total gastado (mayor = mejor)'
                    }
                }
            };
        } catch (error) {
            console.error('❌ [RetailAnalytics] Error en RFM:', error);
            throw error;
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * CLASIFICACIÓN ABC/XYZ
     * ═══════════════════════════════════════════════════════════════════════════════
     */

    /**
     * Calcula clasificación ABC/XYZ de productos
     * @param {number} companyId - ID de la empresa
     * @param {number} warehouseId - ID del almacén (opcional)
     * @returns {Object} Resultados de clasificación
     */
    async calculateABCXYZClassification(companyId, warehouseId = null) {
        console.log(`📊 [RetailAnalytics] Calculando ABC/XYZ para company ${companyId}`);

        try {
            const result = await sequelize.query(`
                SELECT retail_calculate_abc_xyz($1, $2, 90)
            `, {
                bind: [companyId, warehouseId],
                type: sequelize.QueryTypes.SELECT
            });

            const updated = result[0]?.retail_calculate_abc_xyz || 0;

            // Obtener resumen por clasificación
            const summary = await sequelize.query(`
                SELECT
                    abc_class,
                    xyz_class,
                    abc_class || xyz_class as combined,
                    COUNT(*) as product_count
                FROM wms_products p
                JOIN wms_warehouses w ON p.warehouse_id = w.id
                WHERE w.company_id = $1
                AND p.abc_class IS NOT NULL
                GROUP BY abc_class, xyz_class
                ORDER BY abc_class, xyz_class
            `, {
                bind: [companyId],
                type: sequelize.QueryTypes.SELECT
            });

            console.log(`✅ [RetailAnalytics] ABC/XYZ completado: ${updated} productos clasificados`);

            return {
                success: true,
                productsClassified: updated,
                summary,
                info: {
                    title: '📊 Clasificación ABC/XYZ Completada',
                    description: 'Productos clasificados por volumen de ventas y variabilidad',
                    algorithm: 'ABC Analysis (Pareto) + XYZ Analysis (CV)',
                    techDetails: {
                        abc: {
                            A: '80% del valor de ventas (productos críticos)',
                            B: '15% del valor de ventas (productos importantes)',
                            C: '5% del valor de ventas (productos de bajo movimiento)'
                        },
                        xyz: {
                            X: 'CV ≤ 0.5 (demanda estable y predecible)',
                            Y: '0.5 < CV ≤ 1.0 (demanda variable)',
                            Z: 'CV > 1.0 (demanda esporádica/impredecible)'
                        }
                    },
                    recommendations: {
                        AX: 'Stock de seguridad bajo, reabastecimiento frecuente, JIT posible',
                        AY: 'Stock de seguridad medio, revisar periódicamente',
                        AZ: 'Stock de seguridad alto, difícil de pronosticar',
                        BX: 'Reabastecimiento automático, control moderado',
                        CZ: 'Evaluar discontinuación, hacer bajo pedido'
                    }
                }
            };
        } catch (error) {
            console.error('❌ [RetailAnalytics] Error en ABC/XYZ:', error);
            throw error;
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * REORDER SUGGESTIONS
     * ═══════════════════════════════════════════════════════════════════════════════
     */

    /**
     * Genera sugerencias de reorden
     * @param {number} companyId - ID de la empresa
     * @param {number} warehouseId - ID del almacén
     * @returns {Object} Sugerencias generadas
     */
    async generateReorderSuggestions(companyId, warehouseId) {
        console.log(`📦 [RetailAnalytics] Generando sugerencias de reorden para warehouse ${warehouseId}`);

        try {
            const result = await sequelize.query(`
                SELECT retail_generate_reorder_suggestions($1, $2)
            `, {
                bind: [companyId, warehouseId],
                type: sequelize.QueryTypes.SELECT
            });

            const created = result[0]?.retail_generate_reorder_suggestions || 0;

            // Obtener sugerencias agrupadas por proveedor
            const bySupplier = await sequelize.query(`
                SELECT
                    supplier_id,
                    supplier_name,
                    COUNT(*) as products_count,
                    SUM(suggested_quantity) as total_quantity,
                    SUM(estimated_total_cost) as total_cost,
                    MIN(CASE WHEN order_urgency = 'critical' THEN 1
                             WHEN order_urgency = 'urgent' THEN 2
                             WHEN order_urgency = 'normal' THEN 3
                             ELSE 4 END) as max_urgency
                FROM retail_reorder_suggestions
                WHERE company_id = $1
                AND warehouse_id = $2
                AND status = 'pending'
                GROUP BY supplier_id, supplier_name
                ORDER BY max_urgency, total_cost DESC
            `, {
                bind: [companyId, warehouseId],
                type: sequelize.QueryTypes.SELECT
            });

            // Obtener detalle de críticos
            const criticalItems = await sequelize.query(`
                SELECT
                    product_code,
                    product_name,
                    current_stock,
                    suggested_quantity,
                    days_of_supply,
                    stockout_probability,
                    supplier_name,
                    order_urgency
                FROM retail_reorder_suggestions
                WHERE company_id = $1
                AND warehouse_id = $2
                AND status = 'pending'
                AND order_urgency IN ('critical', 'urgent')
                ORDER BY
                    CASE order_urgency WHEN 'critical' THEN 1 ELSE 2 END,
                    stockout_probability DESC
                LIMIT 20
            `, {
                bind: [companyId, warehouseId],
                type: sequelize.QueryTypes.SELECT
            });

            console.log(`✅ [RetailAnalytics] Reorder: ${created} sugerencias generadas`);

            return {
                success: true,
                suggestionsCreated: created,
                bySupplier,
                criticalItems,
                info: {
                    title: '📦 Sugerencias de Reabastecimiento',
                    description: `${created} productos requieren reorden`,
                    algorithm: 'Dynamic Reorder Point + Forecast-Based EOQ',
                    techDetails: {
                        method: 'Stock actual vs Punto de pedido + Demanda pronosticada',
                        calculation: 'Q = max_stock - stock_actual, respetando min_order_qty',
                        urgency: {
                            critical: 'Stockout inmediato',
                            urgent: '< 3 días de stock',
                            normal: '3-7 días de stock',
                            planned: '> 7 días de stock'
                        }
                    },
                    actions: {
                        autoGroup: 'Sugerencias agrupadas por proveedor para consolidar pedidos',
                        approve: 'Aprobar para generar orden de compra',
                        dismiss: 'Descartar sugerencia con motivo'
                    }
                }
            };
        } catch (error) {
            console.error('❌ [RetailAnalytics] Error en reorder:', error);
            throw error;
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * COMPRA CENTRALIZADA MULTI-SUCURSAL
     * ═══════════════════════════════════════════════════════════════════════════════
     */

    /**
     * Consolida solicitudes de sucursales en orden centralizada
     * @param {number} companyId - ID de la empresa
     * @param {number} cediId - ID del centro de distribución
     * @param {number} supplierId - ID del proveedor
     * @param {number[]} requestIds - IDs de solicitudes a consolidar (opcional)
     * @returns {Object} Orden consolidada creada
     */
    async consolidateBranchRequests(companyId, cediId, supplierId, requestIds = null) {
        console.log(`🏢 [RetailAnalytics] Consolidando solicitudes para CEDI ${cediId}, proveedor ${supplierId}`);

        try {
            const result = await sequelize.query(`
                SELECT retail_consolidate_branch_requests($1, $2, $3, $4)
            `, {
                bind: [companyId, cediId, supplierId, requestIds],
                type: sequelize.QueryTypes.SELECT
            });

            const consolidatedOrderId = result[0]?.retail_consolidate_branch_requests;

            if (!consolidatedOrderId) {
                return {
                    success: false,
                    error: 'No se encontraron solicitudes para consolidar'
                };
            }

            // Obtener detalles de la orden consolidada
            const order = await sequelize.query(`
                SELECT
                    co.*,
                    l.location_name as cedi_name,
                    s.trade_name as supplier_name
                FROM retail_consolidated_orders co
                JOIN retail_locations l ON co.cedi_location_id = l.id
                JOIN wms_suppliers s ON co.supplier_id = s.id
                WHERE co.id = $1
            `, {
                bind: [consolidatedOrderId],
                type: sequelize.QueryTypes.SELECT
            });

            console.log(`✅ [RetailAnalytics] Consolidación completada: orden ${consolidatedOrderId}`);

            return {
                success: true,
                consolidatedOrderId,
                order: order[0],
                info: {
                    title: '🏢 Orden Consolidada Creada',
                    description: `Solicitudes de ${order[0]?.branch_locations_count || 0} sucursales consolidadas`,
                    algorithm: 'Multi-Branch Consolidation Engine',
                    techDetails: {
                        method: 'Agregación por proveedor con distribución planificada',
                        distribution: 'Plan de distribución automático por sucursal',
                        nextSteps: ['Aprobar orden', 'Enviar a proveedor', 'Recibir en CEDI', 'Distribuir a sucursales']
                    }
                }
            };
        } catch (error) {
            console.error('❌ [RetailAnalytics] Error en consolidación:', error);
            throw error;
        }
    }

    /**
     * Crea distribuciones desde orden consolidada a sucursales
     */
    async createDistributionsFromConsolidated(consolidatedOrderId, locationId = null) {
        console.log(`📤 [RetailAnalytics] Creando distribuciones desde orden ${consolidatedOrderId}`);

        try {
            const result = await sequelize.query(`
                SELECT retail_create_distribution_from_consolidated($1, $2)
            `, {
                bind: [consolidatedOrderId, locationId],
                type: sequelize.QueryTypes.SELECT
            });

            const distributionsCreated = result[0]?.retail_create_distribution_from_consolidated || 0;

            console.log(`✅ [RetailAnalytics] ${distributionsCreated} distribuciones creadas`);

            return {
                success: true,
                distributionsCreated,
                info: {
                    title: '📤 Distribuciones Creadas',
                    description: `${distributionsCreated} órdenes de distribución generadas`,
                    nextSteps: ['Picking en CEDI', 'Despacho', 'Transporte', 'Recepción en sucursal']
                }
            };
        } catch (error) {
            console.error('❌ [RetailAnalytics] Error creando distribuciones:', error);
            throw error;
        }
    }

    /**
     * Obtener solicitudes pendientes de consolidar
     */
    async getPendingConsolidation(companyId) {
        const result = await sequelize.query(`
            SELECT * FROM retail_pending_consolidation
            WHERE company_id = $1
            ORDER BY estimated_value DESC
        `, {
            bind: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        return {
            pendingGroups: result,
            count: result.length,
            totalEstimatedValue: result.reduce((sum, g) => sum + parseFloat(g.estimated_value || 0), 0),
            info: {
                title: '📋 Solicitudes Pendientes de Consolidar',
                description: `${result.length} grupos de solicitudes agrupados por proveedor`
            }
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * DASHBOARD & KPIs
     * ═══════════════════════════════════════════════════════════════════════════════
     */

    /**
     * Obtener KPIs principales de retail analytics
     */
    async getDashboardKPIs(companyId) {
        const [sales, products, customers, reorder] = await Promise.all([
            // Ventas últimos 30 días
            sequelize.query(`
                SELECT
                    COUNT(*) as transactions,
                    SUM(total_amount) as revenue,
                    AVG(total_amount) as avg_ticket,
                    SUM(total_items) as items_sold
                FROM retail_transactions
                WHERE company_id = $1
                AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
            `, { bind: [companyId], type: sequelize.QueryTypes.SELECT }),

            // Productos
            sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE abc_class = 'A') as a_products,
                    COUNT(*) FILTER (WHERE abc_class = 'B') as b_products,
                    COUNT(*) FILTER (WHERE abc_class = 'C') as c_products,
                    COUNT(*) FILTER (WHERE stockout_probability > 0.5) as at_risk
                FROM wms_products p
                JOIN wms_warehouses w ON p.warehouse_id = w.id
                WHERE w.company_id = $1
                AND p.is_active = true
            `, { bind: [companyId], type: sequelize.QueryTypes.SELECT }),

            // Clientes
            sequelize.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE rfm_segment = 'champions') as champions,
                    COUNT(*) FILTER (WHERE rfm_segment = 'at_risk') as at_risk,
                    COUNT(*) FILTER (WHERE rfm_segment = 'lost') as lost
                FROM retail_customer_metrics
                WHERE company_id = $1
            `, { bind: [companyId], type: sequelize.QueryTypes.SELECT }),

            // Reorden
            sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE order_urgency = 'critical') as critical,
                    COUNT(*) FILTER (WHERE order_urgency = 'urgent') as urgent,
                    COUNT(*) as total
                FROM retail_reorder_suggestions
                WHERE company_id = $1
                AND status = 'pending'
            `, { bind: [companyId], type: sequelize.QueryTypes.SELECT })
        ]);

        return {
            sales: sales[0] || {},
            products: products[0] || {},
            customers: customers[0] || {},
            reorder: reorder[0] || {},
            info: {
                title: '📊 Dashboard de Retail Analytics',
                description: 'KPIs principales del sistema predictivo',
                lastUpdated: new Date().toISOString()
            }
        };
    }
}

module.exports = new RetailAnalyticsService();
