-- ═══════════════════════════════════════════════════════════════════════════════
-- RETAIL ANALYTICS & PREDICTIVE SYSTEM
-- Sistema Predictivo para Retail con IA
-- Fecha: 2025-12-31
--
-- Algoritmos implementados:
--   - Demand Forecasting: Prophet, SARIMA, XGBoost
--   - Market Basket: FP-Growth, Apriori
--   - Customer Segmentation: RFM + K-Means
--   - Price Optimization: Q-Learning
--   - Planogram: AI-Shelf Optimization
--
-- SSOT: Todas las tablas son multi-tenant con company_id
-- Integración: WMS, Procurement, SIAC Facturación, Finance
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 1: EXTENSIONES A TABLAS EXISTENTES                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 1.1 Extensión WMS_PRODUCTS: Campos para Planograma y Retail
DO $$
BEGIN
    -- Planograma / Gondola
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'gondola_section') THEN
        ALTER TABLE wms_products ADD COLUMN gondola_section VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'shelf_level') THEN
        ALTER TABLE wms_products ADD COLUMN shelf_level INTEGER; -- 1=floor, 2-5=shelves, 6=top
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'facing_count') THEN
        ALTER TABLE wms_products ADD COLUMN facing_count INTEGER DEFAULT 1; -- Cantidad de frentes visibles
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'shelf_depth_units') THEN
        ALTER TABLE wms_products ADD COLUMN shelf_depth_units INTEGER DEFAULT 3; -- Unidades en profundidad
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'display_type') THEN
        ALTER TABLE wms_products ADD COLUMN display_type VARCHAR(30) DEFAULT 'standard';
        -- standard, hanging, refrigerated, frozen, promotional, end_cap
    END IF;

    -- Reorder / Stock inteligente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'reorder_point') THEN
        ALTER TABLE wms_products ADD COLUMN reorder_point DECIMAL(12,3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'safety_stock') THEN
        ALTER TABLE wms_products ADD COLUMN safety_stock DECIMAL(12,3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'max_stock') THEN
        ALTER TABLE wms_products ADD COLUMN max_stock DECIMAL(12,3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'min_order_qty') THEN
        ALTER TABLE wms_products ADD COLUMN min_order_qty DECIMAL(12,3) DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'order_multiple') THEN
        ALTER TABLE wms_products ADD COLUMN order_multiple DECIMAL(12,3) DEFAULT 1; -- Multiplo de compra
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'lead_time_days') THEN
        ALTER TABLE wms_products ADD COLUMN lead_time_days INTEGER DEFAULT 7;
    END IF;

    -- Estacionalidad
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'is_seasonal') THEN
        ALTER TABLE wms_products ADD COLUMN is_seasonal BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'season_start_month') THEN
        ALTER TABLE wms_products ADD COLUMN season_start_month INTEGER; -- 1-12
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'season_end_month') THEN
        ALTER TABLE wms_products ADD COLUMN season_end_month INTEGER; -- 1-12
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'seasonality_factor') THEN
        ALTER TABLE wms_products ADD COLUMN seasonality_factor JSONB DEFAULT '{}';
        -- {"1": 0.5, "2": 0.6, "12": 2.5} - factor por mes
    END IF;

    -- Clasificación ABC/XYZ
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'abc_class') THEN
        ALTER TABLE wms_products ADD COLUMN abc_class CHAR(1); -- A, B, C
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'xyz_class') THEN
        ALTER TABLE wms_products ADD COLUMN xyz_class CHAR(1); -- X, Y, Z
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'abc_xyz_last_calculated') THEN
        ALTER TABLE wms_products ADD COLUMN abc_xyz_last_calculated TIMESTAMPTZ;
    END IF;

    -- Métricas calculadas (actualizadas por jobs)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'avg_daily_sales') THEN
        ALTER TABLE wms_products ADD COLUMN avg_daily_sales DECIMAL(12,4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'sales_velocity') THEN
        ALTER TABLE wms_products ADD COLUMN sales_velocity DECIMAL(10,4); -- Units per day
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'days_of_supply') THEN
        ALTER TABLE wms_products ADD COLUMN days_of_supply DECIMAL(10,2); -- Stock actual / velocity
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'stockout_probability') THEN
        ALTER TABLE wms_products ADD COLUMN stockout_probability DECIMAL(5,4); -- 0.0000 - 1.0000
    END IF;
END $$;

COMMENT ON COLUMN wms_products.gondola_section IS 'Sección de góndola (ej: A1, B2, PROMO-1)';
COMMENT ON COLUMN wms_products.shelf_level IS 'Nivel de estante: 1=piso, 2-5=estantes, 6=tope';
COMMENT ON COLUMN wms_products.facing_count IS 'Cantidad de frentes visibles en góndola';
COMMENT ON COLUMN wms_products.abc_class IS 'Clasificación ABC por volumen de ventas: A=80%, B=15%, C=5%';
COMMENT ON COLUMN wms_products.xyz_class IS 'Clasificación XYZ por variabilidad: X=estable, Y=variable, Z=esporádico';

-- 1.2 Extensión WMS_SUPPLIERS: Campos para Retail Analytics
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'visit_frequency_days') THEN
        ALTER TABLE wms_suppliers ADD COLUMN visit_frequency_days INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'avg_lead_time_days') THEN
        ALTER TABLE wms_suppliers ADD COLUMN avg_lead_time_days DECIMAL(5,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'lead_time_std_dev') THEN
        ALTER TABLE wms_suppliers ADD COLUMN lead_time_std_dev DECIMAL(5,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'min_order_amount') THEN
        ALTER TABLE wms_suppliers ADD COLUMN min_order_amount DECIMAL(15,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'delivery_days') THEN
        ALTER TABLE wms_suppliers ADD COLUMN delivery_days VARCHAR(20) DEFAULT '1,2,3,4,5';
        -- Días de entrega: 1=lun, 7=dom, separados por coma
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'order_cutoff_time') THEN
        ALTER TABLE wms_suppliers ADD COLUMN order_cutoff_time TIME;
        -- Hora límite para pedido del día
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'last_visit_date') THEN
        ALTER TABLE wms_suppliers ADD COLUMN last_visit_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'next_expected_visit') THEN
        ALTER TABLE wms_suppliers ADD COLUMN next_expected_visit DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'product_categories') THEN
        ALTER TABLE wms_suppliers ADD COLUMN product_categories JSONB DEFAULT '[]';
        -- Array de category_ids que provee
    END IF;
END $$;

COMMENT ON COLUMN wms_suppliers.visit_frequency_days IS 'Frecuencia de visita del proveedor en días (calculado automáticamente)';
COMMENT ON COLUMN wms_suppliers.avg_lead_time_days IS 'Lead time promedio desde pedido a entrega';
COMMENT ON COLUMN wms_suppliers.delivery_days IS 'Días de entrega: 1=lunes a 7=domingo, separados por coma';

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 2: MARKET BASKET ANALYSIS                                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 2.1 Tabla de transacciones agregadas para análisis
CREATE TABLE IF NOT EXISTS retail_transactions (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    branch_id INTEGER, -- Si hay múltiples sucursales

    -- Identificación de transacción
    transaction_id VARCHAR(100) NOT NULL, -- ID original de siac_facturas
    transaction_date DATE NOT NULL,
    transaction_time TIME,
    transaction_datetime TIMESTAMPTZ NOT NULL,

    -- Cliente (si disponible)
    customer_id INTEGER,
    customer_segment VARCHAR(50),
    is_member BOOLEAN DEFAULT false,

    -- Datos de la transacción
    total_items INTEGER NOT NULL,
    total_quantity DECIMAL(12,3) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,

    -- Métrica de basket
    avg_item_price DECIMAL(12,2),
    items_per_category JSONB DEFAULT '{}', -- {"bebidas": 3, "carnes": 1}

    -- Contexto
    payment_method VARCHAR(50),
    cashier_id INTEGER,
    pos_id INTEGER,

    -- Para ML
    day_of_week INTEGER, -- 1=lun, 7=dom
    week_of_year INTEGER,
    month INTEGER,
    is_holiday BOOLEAN DEFAULT false,
    is_weekend BOOLEAN DEFAULT false,
    hour_of_day INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, transaction_id)
);

CREATE INDEX idx_retail_trans_company_date ON retail_transactions(company_id, transaction_date);
CREATE INDEX idx_retail_trans_customer ON retail_transactions(company_id, customer_id);
CREATE INDEX idx_retail_trans_datetime ON retail_transactions(company_id, transaction_datetime);

-- 2.2 Items de transacción (para basket analysis)
CREATE TABLE IF NOT EXISTS retail_transaction_items (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES retail_transactions(id) ON DELETE CASCADE,

    product_id INTEGER, -- wms_products.id
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200),
    category_id INTEGER,
    category_name VARCHAR(100),
    brand_id INTEGER,
    brand_name VARCHAR(100),

    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,

    -- Para análisis
    is_promoted BOOLEAN DEFAULT false,
    promotion_id INTEGER,
    margin_percent DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trans_items_transaction ON retail_transaction_items(transaction_id);
CREATE INDEX idx_trans_items_product ON retail_transaction_items(product_id);
CREATE INDEX idx_trans_items_category ON retail_transaction_items(category_id);

-- 2.3 Reglas de asociación (resultado del análisis)
CREATE TABLE IF NOT EXISTS retail_association_rules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    branch_id INTEGER,

    -- Identificación de la regla
    rule_code VARCHAR(50) NOT NULL,
    rule_type VARCHAR(30) DEFAULT 'product', -- 'product', 'category', 'brand'

    -- Antecedente (IF)
    antecedent_type VARCHAR(30) NOT NULL, -- 'product', 'category', 'brand'
    antecedent_ids INTEGER[] NOT NULL, -- Array de IDs
    antecedent_names TEXT[], -- Nombres para visualización
    antecedent_count INTEGER DEFAULT 1,

    -- Consecuente (THEN)
    consequent_type VARCHAR(30) NOT NULL,
    consequent_ids INTEGER[] NOT NULL,
    consequent_names TEXT[],
    consequent_count INTEGER DEFAULT 1,

    -- Métricas de la regla
    support DECIMAL(10,8) NOT NULL, -- % de transacciones con ambos
    confidence DECIMAL(10,8) NOT NULL, -- P(B|A)
    lift DECIMAL(10,4) NOT NULL, -- confidence / P(B)
    leverage DECIMAL(10,8), -- support - P(A)*P(B)
    conviction DECIMAL(10,4), -- (1-P(B))/(1-confidence)

    -- Conteos
    antecedent_support DECIMAL(10,8), -- % transacciones con antecedente
    consequent_support DECIMAL(10,8), -- % transacciones con consecuente
    transactions_count INTEGER, -- Número de transacciones con la regla

    -- Calidad y estado
    min_transactions INTEGER DEFAULT 30, -- Mínimo para ser significativo
    is_significant BOOLEAN DEFAULT true,
    is_actionable BOOLEAN DEFAULT true, -- Para cross-selling

    -- Temporal
    calculated_from DATE,
    calculated_to DATE,
    valid_until DATE, -- Cuándo recalcular

    -- Algoritmo usado
    algorithm VARCHAR(30) DEFAULT 'fpgrowth', -- 'apriori', 'fpgrowth', 'eclat'
    min_support_used DECIMAL(10,8),
    min_confidence_used DECIMAL(10,8),

    -- Estado
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'superseded'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, rule_code)
);

CREATE INDEX idx_assoc_rules_company ON retail_association_rules(company_id, status);
CREATE INDEX idx_assoc_rules_lift ON retail_association_rules(company_id, lift DESC);
CREATE INDEX idx_assoc_rules_antecedent ON retail_association_rules USING GIN(antecedent_ids);

COMMENT ON TABLE retail_association_rules IS 'Reglas de asociación del Market Basket Analysis usando FP-Growth/Apriori';
COMMENT ON COLUMN retail_association_rules.lift IS 'Lift > 1 indica asociación positiva. Ej: Carne→Vino con lift 2.5 significa 2.5x más probable';
COMMENT ON COLUMN retail_association_rules.support IS 'Porcentaje de transacciones que contienen ambos items';
COMMENT ON COLUMN retail_association_rules.confidence IS 'Probabilidad de B dado A. Ej: 70% de quienes compran carne compran vino';

-- 2.4 Itemsets frecuentes (para referencia)
CREATE TABLE IF NOT EXISTS retail_frequent_itemsets (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    itemset_type VARCHAR(30) DEFAULT 'product',
    item_ids INTEGER[] NOT NULL,
    item_names TEXT[],
    itemset_size INTEGER NOT NULL,

    support DECIMAL(10,8) NOT NULL,
    transaction_count INTEGER NOT NULL,

    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until DATE,

    UNIQUE(company_id, itemset_type, item_ids)
);

CREATE INDEX idx_freq_itemsets_company ON retail_frequent_itemsets(company_id);
CREATE INDEX idx_freq_itemsets_support ON retail_frequent_itemsets(support DESC);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 3: DEMAND FORECASTING                                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 3.1 Historial de ventas agregado (para forecasting)
CREATE TABLE IF NOT EXISTS retail_sales_history (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    branch_id INTEGER,
    warehouse_id INTEGER,

    -- Granularidad
    aggregation_level VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Producto o categoría
    entity_type VARCHAR(20) NOT NULL, -- 'product', 'category', 'brand', 'total'
    entity_id INTEGER, -- NULL para total
    entity_code VARCHAR(50),
    entity_name VARCHAR(200),

    -- Métricas de ventas
    total_quantity DECIMAL(15,4) NOT NULL,
    total_revenue DECIMAL(18,2) NOT NULL,
    total_cost DECIMAL(18,2),
    total_margin DECIMAL(18,2),
    margin_percent DECIMAL(5,2),

    transaction_count INTEGER NOT NULL,
    unique_customers INTEGER,
    avg_basket_size DECIMAL(10,2),

    -- Stock info (snapshot al final del período)
    ending_stock DECIMAL(15,4),
    stockout_days INTEGER DEFAULT 0,
    fill_rate DECIMAL(5,4), -- % de demanda satisfecha

    -- Precios
    avg_selling_price DECIMAL(12,2),
    min_selling_price DECIMAL(12,2),
    max_selling_price DECIMAL(12,2),

    -- Promociones
    promoted_quantity DECIMAL(15,4) DEFAULT 0,
    promotion_revenue DECIMAL(18,2) DEFAULT 0,

    -- Features para ML
    day_of_week INTEGER, -- Para daily
    week_of_year INTEGER,
    month_of_year INTEGER,
    is_holiday_period BOOLEAN DEFAULT false,
    weather_condition VARCHAR(20), -- 'sunny', 'rainy', 'cold', 'hot'

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, branch_id, warehouse_id, aggregation_level, period_start, entity_type, entity_id)
);

CREATE INDEX idx_sales_hist_company ON retail_sales_history(company_id, aggregation_level, period_start);
CREATE INDEX idx_sales_hist_product ON retail_sales_history(company_id, entity_type, entity_id, period_start);

-- 3.2 Forecasts de demanda
CREATE TABLE IF NOT EXISTS retail_demand_forecasts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    branch_id INTEGER,
    warehouse_id INTEGER,

    -- Qué se pronostica
    entity_type VARCHAR(20) NOT NULL,
    entity_id INTEGER,
    entity_code VARCHAR(50),
    entity_name VARCHAR(200),

    -- Período del pronóstico
    forecast_date DATE NOT NULL,
    forecast_period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    horizon_days INTEGER NOT NULL, -- Cuántos días hacia adelante

    -- Pronóstico
    predicted_quantity DECIMAL(15,4) NOT NULL,
    predicted_revenue DECIMAL(18,2),

    -- Intervalos de confianza
    lower_bound_95 DECIMAL(15,4),
    upper_bound_95 DECIMAL(15,4),
    lower_bound_80 DECIMAL(15,4),
    upper_bound_80 DECIMAL(15,4),

    -- Componentes (si el modelo los proporciona)
    trend_component DECIMAL(15,4),
    seasonal_component DECIMAL(15,4),
    holiday_component DECIMAL(15,4),

    -- Métricas del modelo
    model_type VARCHAR(30) NOT NULL, -- 'prophet', 'sarima', 'xgboost', 'lstm', 'ensemble'
    model_version VARCHAR(20),
    mape DECIMAL(8,4), -- Mean Absolute Percentage Error
    rmse DECIMAL(15,4), -- Root Mean Square Error
    mae DECIMAL(15,4), -- Mean Absolute Error
    confidence_score DECIMAL(5,4), -- 0-1

    -- Estado
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'superseded', 'actual_recorded'
    actual_quantity DECIMAL(15,4), -- Llenado después del período
    actual_revenue DECIMAL(18,2),
    forecast_error DECIMAL(10,4), -- (actual - predicted) / actual

    -- Cuándo se generó
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    model_trained_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forecasts_company ON retail_demand_forecasts(company_id, forecast_date, entity_type);
CREATE INDEX idx_forecasts_product ON retail_demand_forecasts(company_id, entity_id, forecast_date);

COMMENT ON TABLE retail_demand_forecasts IS 'Pronósticos de demanda usando Prophet/SARIMA/XGBoost';
COMMENT ON COLUMN retail_demand_forecasts.model_type IS 'Algoritmo: prophet (Facebook), sarima (statsmodels), xgboost, lstm (deep learning), ensemble';
COMMENT ON COLUMN retail_demand_forecasts.mape IS 'Mean Absolute Percentage Error - menor es mejor, típicamente 10-30%';

-- 3.3 Patrones de estacionalidad detectados
CREATE TABLE IF NOT EXISTS retail_seasonality_patterns (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    entity_type VARCHAR(20) NOT NULL,
    entity_id INTEGER,
    entity_name VARCHAR(200),

    -- Tipo de patrón
    pattern_type VARCHAR(30) NOT NULL, -- 'weekly', 'monthly', 'yearly', 'holiday', 'event'
    pattern_name VARCHAR(100),

    -- Definición del patrón
    pattern_definition JSONB NOT NULL,
    -- weekly: {"1": 0.8, "2": 1.0, "5": 1.3, "6": 1.5, "7": 1.4}
    -- monthly: {"1": 0.9, "12": 2.5}
    -- yearly: {"start_week": 48, "end_week": 52, "factor": 2.0}
    -- holiday: {"event": "christmas", "days_before": 7, "days_after": 2, "factor": 3.0}

    -- Métricas
    avg_factor DECIMAL(6,3), -- Factor promedio sobre baseline
    max_factor DECIMAL(6,3),
    min_factor DECIMAL(6,3),
    pattern_strength DECIMAL(5,4), -- 0-1, qué tan fuerte es el patrón

    -- Validación
    samples_count INTEGER,
    last_observed DATE,
    confidence_score DECIMAL(5,4),

    -- Estado
    is_active BOOLEAN DEFAULT true,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by INTEGER, -- user_id si fue verificado manualmente

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, entity_type, entity_id, pattern_type, pattern_name)
);

COMMENT ON TABLE retail_seasonality_patterns IS 'Patrones de estacionalidad detectados automáticamente';
COMMENT ON COLUMN retail_seasonality_patterns.pattern_definition IS 'Definición del patrón en formato JSON según tipo';

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 4: CUSTOMER SEGMENTATION (RFM + Clustering)                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 4.1 Métricas de cliente
CREATE TABLE IF NOT EXISTS retail_customer_metrics (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL, -- siac_clientes.id
    customer_code VARCHAR(50),
    customer_name VARCHAR(200),

    -- RFM Scores (1-5 cada uno)
    recency_score INTEGER, -- Cuándo fue la última compra
    frequency_score INTEGER, -- Cuántas veces compra
    monetary_score INTEGER, -- Cuánto gasta
    rfm_score VARCHAR(5), -- Combinado: "555", "111", etc.
    rfm_segment VARCHAR(50), -- 'champions', 'loyal', 'at_risk', 'lost', etc.

    -- Métricas absolutas
    first_purchase_date DATE,
    last_purchase_date DATE,
    days_since_last_purchase INTEGER,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(18,2) DEFAULT 0,
    total_items_purchased DECIMAL(15,4) DEFAULT 0,
    avg_order_value DECIMAL(15,2),
    avg_items_per_order DECIMAL(10,2),
    avg_days_between_orders DECIMAL(10,2),

    -- Tendencias
    revenue_trend VARCHAR(20), -- 'growing', 'stable', 'declining'
    frequency_trend VARCHAR(20),
    revenue_growth_rate DECIMAL(8,4), -- % cambio últimos 3 meses vs anteriores

    -- Predicciones (BG-NBD + Gamma-Gamma)
    predicted_clv DECIMAL(18,2), -- Customer Lifetime Value
    clv_confidence DECIMAL(5,4),
    churn_probability DECIMAL(5,4), -- Probabilidad de abandono
    expected_purchases_next_90_days DECIMAL(10,4),

    -- Categorías preferidas
    top_categories JSONB DEFAULT '[]', -- [{category_id, name, revenue, percent}]
    top_brands JSONB DEFAULT '[]',
    purchase_patterns JSONB DEFAULT '{}', -- {preferred_day, preferred_time, payment_method}

    -- Cluster asignado
    cluster_id INTEGER,
    cluster_name VARCHAR(100),
    cluster_assigned_at TIMESTAMPTZ,

    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, customer_id)
);

CREATE INDEX idx_customer_metrics_company ON retail_customer_metrics(company_id, rfm_segment);
CREATE INDEX idx_customer_metrics_clv ON retail_customer_metrics(company_id, predicted_clv DESC);
CREATE INDEX idx_customer_metrics_churn ON retail_customer_metrics(company_id, churn_probability DESC);

COMMENT ON TABLE retail_customer_metrics IS 'Métricas y segmentación de clientes usando RFM + CLV Prediction';
COMMENT ON COLUMN retail_customer_metrics.rfm_segment IS 'Segmentos: champions, loyal_customers, potential_loyalists, new_customers, promising, need_attention, about_to_sleep, at_risk, cannot_lose, hibernating, lost';
COMMENT ON COLUMN retail_customer_metrics.predicted_clv IS 'Customer Lifetime Value predicho usando BG-NBD + Gamma-Gamma';

-- 4.2 Definición de segmentos
CREATE TABLE IF NOT EXISTS retail_customer_segments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    segment_code VARCHAR(50) NOT NULL,
    segment_name VARCHAR(100) NOT NULL,
    segment_type VARCHAR(30) NOT NULL, -- 'rfm', 'behavioral', 'demographic', 'custom', 'ml_cluster'

    -- Definición
    definition_rules JSONB NOT NULL,
    -- RFM: {"rfm_pattern": "5..-..-.."}
    -- Behavioral: {"min_orders": 10, "min_revenue": 50000}
    -- ML: {"cluster_id": 3, "algorithm": "kmeans"}

    -- Descripción
    description TEXT,
    characteristics TEXT[], -- Array de características
    recommended_actions TEXT[], -- Acciones recomendadas

    -- Métricas del segmento
    customer_count INTEGER DEFAULT 0,
    total_revenue DECIMAL(18,2) DEFAULT 0,
    avg_clv DECIMAL(15,2),
    avg_order_value DECIMAL(15,2),

    -- Visualización
    color_code VARCHAR(7), -- #HEX
    icon VARCHAR(50),
    priority_order INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, segment_code)
);

-- Insertar segmentos RFM estándar
INSERT INTO retail_customer_segments (company_id, segment_code, segment_name, segment_type, definition_rules, description, characteristics, recommended_actions, color_code, priority_order)
SELECT
    c.company_id,
    s.segment_code,
    s.segment_name,
    'rfm',
    s.definition_rules::JSONB,
    s.description,
    s.characteristics,
    s.recommended_actions,
    s.color_code,
    s.priority_order
FROM companies c
CROSS JOIN (VALUES
    ('champions', 'Champions', '{"rfm_pattern": "[45][45][45]"}', 'Compraron recientemente, compran frecuentemente y gastan mucho', ARRAY['Alta frecuencia', 'Alto valor', 'Recientes'], ARRAY['Programa VIP', 'Early access', 'Solicitar reviews'], '#28a745', 1),
    ('loyal', 'Loyal Customers', '{"rfm_pattern": "[34][45][34]"}', 'Compran regularmente con buen ticket', ARRAY['Frecuencia consistente', 'Buen valor'], ARRAY['Cross-sell', 'Upsell', 'Programa de lealtad'], '#17a2b8', 2),
    ('potential_loyalist', 'Potential Loyalists', '{"rfm_pattern": "[45][23][23]"}', 'Clientes recientes con potencial', ARRAY['Compraron recientemente', 'Frecuencia media'], ARRAY['Engagement campaigns', 'Membership offers'], '#6f42c1', 3),
    ('new_customers', 'New Customers', '{"rfm_pattern": "[45][1][1]"}', 'Compraron recientemente por primera vez', ARRAY['Primera compra reciente'], ARRAY['Onboarding', 'Welcome offers', 'Product education'], '#007bff', 4),
    ('at_risk', 'At Risk', '{"rfm_pattern": "[12][45][45]"}', 'Compraban mucho pero hace tiempo no vuelven', ARRAY['Fueron frecuentes', 'Alto valor histórico', 'Inactivos'], ARRAY['Reactivation campaign', 'Win-back offers', 'Personal outreach'], '#fd7e14', 5),
    ('cant_lose', 'Cannot Lose', '{"rfm_pattern": "[12][34][45]"}', 'Clientes VIP que están alejándose', ARRAY['Muy alto valor', 'Alejándose'], ARRAY['Win-back urgente', 'Survey de satisfacción', 'Llamada personal'], '#dc3545', 6),
    ('hibernating', 'Hibernating', '{"rfm_pattern": "[12][12][23]"}', 'Baja actividad reciente, valor medio', ARRAY['Inactivos', 'Valor medio'], ARRAY['Re-engagement', 'Special offers'], '#6c757d', 7),
    ('lost', 'Lost', '{"rfm_pattern": "[1][1][12]"}', 'No compran hace mucho, bajo valor', ARRAY['Inactivos largo tiempo', 'Bajo valor'], ARRAY['Ignorar o campaña masiva económica'], '#495057', 8)
) AS s(segment_code, segment_name, definition_rules, description, characteristics, recommended_actions, color_code, priority_order)
WHERE NOT EXISTS (SELECT 1 FROM retail_customer_segments WHERE company_id = c.company_id)
ON CONFLICT (company_id, segment_code) DO NOTHING;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 5: REORDER & STOCKOUT MANAGEMENT                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 5.1 Sugerencias de reorden
CREATE TABLE IF NOT EXISTS retail_reorder_suggestions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    branch_id INTEGER,
    warehouse_id INTEGER NOT NULL,

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200),
    category_id INTEGER,
    category_name VARCHAR(100),

    -- Proveedor sugerido
    supplier_id INTEGER,
    supplier_name VARCHAR(200),
    supplier_code VARCHAR(50),

    -- Situación actual
    current_stock DECIMAL(15,4) NOT NULL,
    reorder_point DECIMAL(15,4),
    safety_stock DECIMAL(15,4),
    days_of_supply DECIMAL(10,2),

    -- Sugerencia
    suggested_quantity DECIMAL(15,4) NOT NULL,
    suggested_order_date DATE NOT NULL,
    expected_delivery_date DATE,
    order_urgency VARCHAR(20) NOT NULL, -- 'critical', 'urgent', 'normal', 'planned'

    -- Cálculo
    forecasted_demand_30d DECIMAL(15,4),
    stockout_probability DECIMAL(5,4),
    calculation_method VARCHAR(50), -- 'eoq', 'min_max', 'dynamic', 'ml_based'

    -- Costo estimado
    estimated_unit_cost DECIMAL(12,2),
    estimated_total_cost DECIMAL(15,2),
    last_purchase_price DECIMAL(12,2),

    -- Estado
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'ordered', 'dismissed', 'auto_ordered'
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    order_id INTEGER, -- procurement_orders.id si se creó
    dismissed_reason TEXT,

    -- Agrupación para pedido conjunto
    grouping_key VARCHAR(100), -- Para agrupar por proveedor/fecha
    can_group BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ -- Cuándo la sugerencia ya no es válida
);

CREATE INDEX idx_reorder_company ON retail_reorder_suggestions(company_id, warehouse_id, status);
CREATE INDEX idx_reorder_urgency ON retail_reorder_suggestions(company_id, order_urgency, suggested_order_date);
CREATE INDEX idx_reorder_supplier ON retail_reorder_suggestions(company_id, supplier_id, status);
CREATE INDEX idx_reorder_grouping ON retail_reorder_suggestions(company_id, grouping_key, status);

COMMENT ON TABLE retail_reorder_suggestions IS 'Sugerencias automáticas de reabastecimiento basadas en demanda pronosticada';
COMMENT ON COLUMN retail_reorder_suggestions.order_urgency IS 'critical: stockout inmediato, urgent: <3 días, normal: 3-7 días, planned: >7 días';
COMMENT ON COLUMN retail_reorder_suggestions.calculation_method IS 'eoq: Economic Order Quantity, min_max: Min-Max, dynamic: basado en forecast ML';

-- 5.2 Eventos de stockout
CREATE TABLE IF NOT EXISTS retail_stockout_events (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    branch_id INTEGER,
    warehouse_id INTEGER NOT NULL,

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200),
    category_id INTEGER,

    -- Período de stockout
    stockout_start TIMESTAMPTZ NOT NULL,
    stockout_end TIMESTAMPTZ,
    duration_hours DECIMAL(10,2),
    duration_days DECIMAL(10,2),

    -- Impacto
    estimated_lost_sales DECIMAL(15,4), -- Unidades
    estimated_lost_revenue DECIMAL(18,2), -- Dinero
    affected_transactions INTEGER, -- Transacciones donde se buscó
    substitution_occurred BOOLEAN DEFAULT false,
    substitution_product_id INTEGER,

    -- Causa
    stockout_cause VARCHAR(50), -- 'supplier_delay', 'demand_spike', 'forecast_error', 'reorder_failure', 'unknown'
    root_cause_analysis TEXT,

    -- Resolución
    resolution_type VARCHAR(30), -- 'replenishment', 'emergency_order', 'substitute', 'discontinued'
    resolution_notes TEXT,
    resolved_by INTEGER,

    -- Métricas de detección
    detected_via VARCHAR(30), -- 'pos_alert', 'daily_check', 'customer_complaint', 'auto_monitor'
    time_to_detect_hours DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stockout_company ON retail_stockout_events(company_id, stockout_start);
CREATE INDEX idx_stockout_product ON retail_stockout_events(company_id, product_id, stockout_start);

-- 5.3 Historial de cálculo de parámetros de stock
CREATE TABLE IF NOT EXISTS retail_stock_parameters_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,

    -- Parámetros calculados
    reorder_point DECIMAL(15,4),
    safety_stock DECIMAL(15,4),
    max_stock DECIMAL(15,4),
    economic_order_qty DECIMAL(15,4),

    -- Inputs del cálculo
    avg_daily_demand DECIMAL(12,4),
    demand_std_dev DECIMAL(12,4),
    lead_time_days DECIMAL(10,2),
    lead_time_std_dev DECIMAL(10,2),
    service_level_target DECIMAL(5,4), -- 0.95 = 95%
    holding_cost_percent DECIMAL(5,4),
    order_cost DECIMAL(12,2),

    -- Método
    calculation_method VARCHAR(50), -- 'static', 'dynamic', 'ml_optimized'
    model_details JSONB,

    -- Resultados anteriores (para comparar)
    previous_reorder_point DECIMAL(15,4),
    previous_safety_stock DECIMAL(15,4),

    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ,
    valid_until DATE
);

CREATE INDEX idx_stock_params_product ON retail_stock_parameters_log(company_id, product_id, calculated_at DESC);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 6: PRICE OPTIMIZATION                                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 6.1 Elasticidad de precios
CREATE TABLE IF NOT EXISTS retail_price_elasticity (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    entity_type VARCHAR(20) NOT NULL, -- 'product', 'category', 'brand'
    entity_id INTEGER NOT NULL,
    entity_name VARCHAR(200),

    -- Elasticidad calculada
    price_elasticity DECIMAL(8,4) NOT NULL, -- Negativo para demanda normal
    elasticity_type VARCHAR(20), -- 'elastic' (|e|>1), 'inelastic' (|e|<1), 'unit_elastic'

    -- Intervalo de confianza
    elasticity_lower DECIMAL(8,4),
    elasticity_upper DECIMAL(8,4),
    confidence_level DECIMAL(5,4),

    -- Cross-elasticity (con productos relacionados)
    cross_elasticities JSONB DEFAULT '[]',
    -- [{related_product_id, elasticity, relationship: 'substitute'|'complement'}]

    -- Datos del análisis
    observations_count INTEGER,
    price_range_analyzed JSONB, -- {min_price, max_price, avg_price}
    date_range_analyzed JSONB, -- {start_date, end_date}

    -- Precio óptimo sugerido
    optimal_price DECIMAL(12,2),
    optimal_price_for_revenue DECIMAL(12,2),
    optimal_price_for_margin DECIMAL(12,2),

    -- Método
    model_type VARCHAR(30), -- 'linear_regression', 'log_log', 'ml_model'
    r_squared DECIMAL(8,6),
    model_details JSONB,

    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until DATE,

    UNIQUE(company_id, entity_type, entity_id)
);

COMMENT ON TABLE retail_price_elasticity IS 'Elasticidad precio-demanda calculada para optimización de precios';
COMMENT ON COLUMN retail_price_elasticity.price_elasticity IS 'Elasticidad: -1.5 significa que +10% precio = -15% demanda';

-- 6.2 Historial de cambios de precio (para análisis)
CREATE TABLE IF NOT EXISTS retail_price_changes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),

    -- Precio anterior y nuevo
    old_price DECIMAL(12,2) NOT NULL,
    new_price DECIMAL(12,2) NOT NULL,
    price_change_percent DECIMAL(8,4),

    -- Contexto
    change_reason VARCHAR(50), -- 'cost_increase', 'competitor', 'promotion', 'optimization', 'seasonal'
    change_notes TEXT,
    changed_by INTEGER,

    -- Fecha efectiva
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,

    -- Impacto observado (llenado después)
    sales_before_30d DECIMAL(15,4),
    sales_after_30d DECIMAL(15,4),
    sales_change_percent DECIMAL(8,4),
    revenue_before_30d DECIMAL(18,2),
    revenue_after_30d DECIMAL(18,2),
    revenue_change_percent DECIMAL(8,4),

    -- Para promociones
    is_promotion BOOLEAN DEFAULT false,
    promotion_id INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_changes_product ON retail_price_changes(company_id, product_id, effective_from);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 7: PLANOGRAM & SHELF OPTIMIZATION                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 7.1 Secciones de góndola
CREATE TABLE IF NOT EXISTS retail_gondola_sections (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    branch_id INTEGER,

    section_code VARCHAR(50) NOT NULL,
    section_name VARCHAR(100) NOT NULL,
    section_type VARCHAR(30) DEFAULT 'standard', -- 'standard', 'refrigerated', 'frozen', 'end_cap', 'promotional'

    -- Dimensiones
    width_cm INTEGER,
    height_cm INTEGER,
    depth_cm INTEGER,
    shelf_count INTEGER DEFAULT 5,

    -- Ubicación
    aisle VARCHAR(20),
    position_in_aisle INTEGER,
    floor_zone VARCHAR(20), -- 'front', 'middle', 'back'

    -- Categoría principal
    primary_category_id INTEGER,
    category_name VARCHAR(100),

    -- Tráfico
    traffic_level VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
    avg_daily_visitors INTEGER,

    -- Configuración
    temperature_controlled BOOLEAN DEFAULT false,
    requires_lighting BOOLEAN DEFAULT true,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, branch_id, section_code)
);

-- 7.2 Posiciones de productos en planograma
CREATE TABLE IF NOT EXISTS retail_planogram_positions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    branch_id INTEGER,
    section_id INTEGER NOT NULL REFERENCES retail_gondola_sections(id) ON DELETE CASCADE,

    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),

    -- Posición
    shelf_level INTEGER NOT NULL, -- 1=piso, N=tope
    position_from_left INTEGER NOT NULL, -- Posición horizontal

    -- Espacio asignado
    facing_count INTEGER DEFAULT 1,
    depth_units INTEGER DEFAULT 3,
    total_capacity INTEGER, -- facing * depth

    -- Métricas de rendimiento
    sales_per_facing DECIMAL(12,2),
    revenue_per_cm2 DECIMAL(10,4),
    turns_per_week DECIMAL(8,2),

    -- Optimización AI
    is_ai_optimized BOOLEAN DEFAULT false,
    optimization_score DECIMAL(5,4), -- 0-1
    suggested_facing INTEGER, -- Sugerencia de AI
    suggested_position INTEGER,

    -- Vigencia
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_planogram_section ON retail_planogram_positions(section_id);
CREATE INDEX idx_planogram_product ON retail_planogram_positions(company_id, product_id);

-- 7.3 Historial de rendimiento por posición
CREATE TABLE IF NOT EXISTS retail_shelf_performance (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    section_id INTEGER NOT NULL,
    shelf_level INTEGER NOT NULL,
    position INTEGER NOT NULL,
    product_id INTEGER NOT NULL,

    -- Período
    period_date DATE NOT NULL,

    -- Métricas
    units_sold DECIMAL(12,3),
    revenue DECIMAL(15,2),
    margin DECIMAL(15,2),
    transactions_count INTEGER,

    -- Comparación
    units_vs_avg DECIMAL(8,4), -- % vs promedio del producto
    revenue_vs_avg DECIMAL(8,4),

    -- Posición anterior (si hubo cambio)
    previous_shelf_level INTEGER,
    previous_position INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shelf_perf_period ON retail_shelf_performance(company_id, period_date);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 8: MODELO DE EJECUCIÓN Y JOBS                                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 8.1 Jobs de analytics programados
CREATE TABLE IF NOT EXISTS retail_analytics_jobs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE, -- NULL = global

    job_type VARCHAR(50) NOT NULL,
    -- 'sync_transactions', 'basket_analysis', 'demand_forecast', 'rfm_calculation',
    -- 'reorder_suggestions', 'abc_xyz_classification', 'elasticity_calculation',
    -- 'supplier_metrics', 'stockout_detection', 'price_optimization'

    job_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Programación
    schedule_cron VARCHAR(100), -- Cron expression
    schedule_description VARCHAR(100), -- "Diario a las 3am"

    -- Parámetros
    job_parameters JSONB DEFAULT '{}',

    -- Estado
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    last_run_status VARCHAR(20), -- 'success', 'failed', 'running'
    last_run_duration_seconds INTEGER,
    last_error TEXT,
    next_run_at TIMESTAMPTZ,

    -- Estadísticas
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    avg_duration_seconds INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.2 Log de ejecuciones
CREATE TABLE IF NOT EXISTS retail_analytics_job_runs (
    id BIGSERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES retail_analytics_jobs(id) ON DELETE CASCADE,
    company_id INTEGER,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_seconds INTEGER,

    status VARCHAR(20) NOT NULL DEFAULT 'running',
    records_processed INTEGER,
    records_created INTEGER,
    records_updated INTEGER,

    error_message TEXT,
    error_details JSONB,

    -- Métricas específicas del job
    job_metrics JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_runs_job ON retail_analytics_job_runs(job_id, started_at DESC);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 9: CONFIGURACIÓN DEL MÓDULO                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 9.1 Configuración de analytics por empresa
CREATE TABLE IF NOT EXISTS retail_analytics_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Módulos habilitados
    basket_analysis_enabled BOOLEAN DEFAULT true,
    demand_forecast_enabled BOOLEAN DEFAULT true,
    customer_segmentation_enabled BOOLEAN DEFAULT true,
    price_optimization_enabled BOOLEAN DEFAULT false,
    planogram_optimization_enabled BOOLEAN DEFAULT false,
    auto_reorder_enabled BOOLEAN DEFAULT false,

    -- Configuración de Market Basket
    basket_min_support DECIMAL(10,8) DEFAULT 0.01, -- 1%
    basket_min_confidence DECIMAL(10,8) DEFAULT 0.3, -- 30%
    basket_min_lift DECIMAL(6,4) DEFAULT 1.5,
    basket_min_transactions INTEGER DEFAULT 30,
    basket_lookback_days INTEGER DEFAULT 90,

    -- Configuración de Forecasting
    forecast_model_preference VARCHAR(30) DEFAULT 'auto', -- 'prophet', 'sarima', 'xgboost', 'auto'
    forecast_horizon_days INTEGER DEFAULT 30,
    forecast_confidence_level DECIMAL(5,4) DEFAULT 0.95,
    forecast_min_history_days INTEGER DEFAULT 90,

    -- Configuración de RFM
    rfm_recency_bins INTEGER[] DEFAULT '{365,180,90,30,7}',
    rfm_frequency_bins INTEGER[] DEFAULT '{1,2,4,8,20}',
    rfm_monetary_bins DECIMAL[] DEFAULT '{1000,5000,20000,50000,100000}',

    -- Configuración de Reorder
    reorder_safety_stock_service_level DECIMAL(5,4) DEFAULT 0.95,
    reorder_lead_time_buffer_days INTEGER DEFAULT 2,
    reorder_auto_group_by_supplier BOOLEAN DEFAULT true,
    reorder_min_order_value DECIMAL(15,2) DEFAULT 0,

    -- Alertas
    stockout_alert_threshold_days DECIMAL(5,2) DEFAULT 3,
    slow_mover_threshold_days INTEGER DEFAULT 60,

    -- Integración
    sync_transactions_realtime BOOLEAN DEFAULT false,
    sync_interval_minutes INTEGER DEFAULT 60,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id)
);

-- Insertar configuración por defecto para empresas existentes
INSERT INTO retail_analytics_config (company_id)
SELECT company_id FROM companies
WHERE NOT EXISTS (SELECT 1 FROM retail_analytics_config WHERE company_id = companies.company_id)
ON CONFLICT (company_id) DO NOTHING;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 10: FUNCIONES Y TRIGGERS                                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 10.1 Función para sincronizar transacciones desde SIAC
CREATE OR REPLACE FUNCTION retail_sync_transactions_from_siac(
    p_company_id INTEGER,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
) RETURNS TABLE(transactions_synced INTEGER, items_synced INTEGER) AS $$
DECLARE
    v_trans_count INTEGER := 0;
    v_items_count INTEGER := 0;
    v_from DATE;
    v_to DATE;
BEGIN
    v_from := COALESCE(p_from_date, CURRENT_DATE - INTERVAL '1 day');
    v_to := COALESCE(p_to_date, CURRENT_DATE);

    -- Insertar transacciones desde siac_facturas
    INSERT INTO retail_transactions (
        company_id, transaction_id, transaction_date, transaction_time,
        transaction_datetime, customer_id, total_items, total_quantity,
        subtotal, discount_amount, tax_amount, total_amount,
        payment_method, day_of_week, week_of_year, month, is_weekend, hour_of_day
    )
    SELECT
        pv.company_id,
        f.id::TEXT,
        f.fecha_factura::DATE,
        f.fecha_factura::TIME,
        f.fecha_factura,
        f.cliente_id,
        (SELECT COUNT(*) FROM siac_facturas_items WHERE factura_id = f.id),
        (SELECT COALESCE(SUM(cantidad), 0) FROM siac_facturas_items WHERE factura_id = f.id),
        f.subtotal,
        COALESCE(f.descuento_importe, 0),
        COALESCE(f.total_iva, 0),
        f.total,
        COALESCE(f.forma_pago, 'efectivo'),
        EXTRACT(ISODOW FROM f.fecha_factura)::INTEGER,
        EXTRACT(WEEK FROM f.fecha_factura)::INTEGER,
        EXTRACT(MONTH FROM f.fecha_factura)::INTEGER,
        EXTRACT(ISODOW FROM f.fecha_factura) IN (6, 7),
        EXTRACT(HOUR FROM f.fecha_factura)::INTEGER
    FROM siac_facturas f
    JOIN siac_cajas c ON f.caja_id = c.id
    JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
    WHERE pv.company_id = p_company_id
    AND f.fecha_factura::DATE BETWEEN v_from AND v_to
    AND f.estado != 'ANULADA'
    ON CONFLICT (company_id, transaction_id) DO UPDATE SET
        total_quantity = EXCLUDED.total_quantity,
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW();

    GET DIAGNOSTICS v_trans_count = ROW_COUNT;

    -- Insertar items
    INSERT INTO retail_transaction_items (
        transaction_id, product_id, product_code, product_name,
        category_id, category_name, quantity, unit_price,
        discount_percent, discount_amount, line_total
    )
    SELECT
        rt.id,
        fi.producto_id,
        fi.producto_codigo,
        fi.producto_descripcion,
        NULL, -- category_id
        fi.categoria_producto,
        fi.cantidad,
        fi.precio_unitario,
        COALESCE(fi.descuento_porcentaje, 0),
        COALESCE(fi.descuento_importe, 0),
        fi.total_item
    FROM siac_facturas_items fi
    JOIN siac_facturas f ON fi.factura_id = f.id
    JOIN siac_cajas c ON f.caja_id = c.id
    JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
    JOIN retail_transactions rt ON rt.transaction_id = f.id::TEXT AND rt.company_id = pv.company_id
    WHERE pv.company_id = p_company_id
    AND f.fecha_factura::DATE BETWEEN v_from AND v_to
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_items_count = ROW_COUNT;

    RETURN QUERY SELECT v_trans_count, v_items_count;
END;
$$ LANGUAGE plpgsql;

-- 10.2 Función para calcular RFM
CREATE OR REPLACE FUNCTION retail_calculate_rfm(
    p_company_id INTEGER,
    p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
    v_updated INTEGER := 0;
    v_config retail_analytics_config%ROWTYPE;
BEGIN
    -- Obtener configuración
    SELECT * INTO v_config FROM retail_analytics_config WHERE company_id = p_company_id;

    -- Calcular métricas base
    WITH customer_metrics AS (
        SELECT
            rt.customer_id,
            MAX(rt.transaction_date) as last_purchase,
            COUNT(DISTINCT rt.id) as total_orders,
            SUM(rt.total_amount) as total_revenue,
            p_as_of_date - MAX(rt.transaction_date) as days_since_last
        FROM retail_transactions rt
        WHERE rt.company_id = p_company_id
        AND rt.customer_id IS NOT NULL
        AND rt.transaction_date <= p_as_of_date
        GROUP BY rt.customer_id
    ),
    rfm_scores AS (
        SELECT
            customer_id,
            last_purchase,
            total_orders,
            total_revenue,
            days_since_last,
            NTILE(5) OVER (ORDER BY days_since_last DESC) as recency_score,
            NTILE(5) OVER (ORDER BY total_orders ASC) as frequency_score,
            NTILE(5) OVER (ORDER BY total_revenue ASC) as monetary_score
        FROM customer_metrics
    )
    INSERT INTO retail_customer_metrics (
        company_id, customer_id,
        recency_score, frequency_score, monetary_score,
        rfm_score, rfm_segment,
        last_purchase_date, days_since_last_purchase,
        total_orders, total_revenue,
        calculated_at
    )
    SELECT
        p_company_id,
        customer_id,
        recency_score,
        frequency_score,
        monetary_score,
        recency_score::TEXT || frequency_score::TEXT || monetary_score::TEXT,
        CASE
            WHEN recency_score >= 4 AND frequency_score >= 4 AND monetary_score >= 4 THEN 'champions'
            WHEN recency_score >= 3 AND frequency_score >= 4 THEN 'loyal'
            WHEN recency_score >= 4 AND frequency_score <= 2 THEN 'new_customers'
            WHEN recency_score <= 2 AND frequency_score >= 4 AND monetary_score >= 4 THEN 'at_risk'
            WHEN recency_score <= 2 AND frequency_score >= 3 AND monetary_score >= 4 THEN 'cant_lose'
            WHEN recency_score <= 2 AND frequency_score <= 2 THEN 'lost'
            ELSE 'average'
        END,
        last_purchase,
        days_since_last,
        total_orders,
        total_revenue,
        NOW()
    FROM rfm_scores
    ON CONFLICT (company_id, customer_id) DO UPDATE SET
        recency_score = EXCLUDED.recency_score,
        frequency_score = EXCLUDED.frequency_score,
        monetary_score = EXCLUDED.monetary_score,
        rfm_score = EXCLUDED.rfm_score,
        rfm_segment = EXCLUDED.rfm_segment,
        last_purchase_date = EXCLUDED.last_purchase_date,
        days_since_last_purchase = EXCLUDED.days_since_last_purchase,
        total_orders = EXCLUDED.total_orders,
        total_revenue = EXCLUDED.total_revenue,
        calculated_at = NOW(),
        updated_at = NOW();

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- 10.3 Función para calcular clasificación ABC/XYZ
CREATE OR REPLACE FUNCTION retail_calculate_abc_xyz(
    p_company_id INTEGER,
    p_warehouse_id INTEGER DEFAULT NULL,
    p_lookback_days INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    WITH product_sales AS (
        SELECT
            rti.product_id,
            SUM(rti.line_total) as total_revenue,
            SUM(rti.quantity) as total_qty,
            STDDEV(rti.quantity) / NULLIF(AVG(rti.quantity), 0) as cv -- Coefficient of Variation
        FROM retail_transaction_items rti
        JOIN retail_transactions rt ON rti.transaction_id = rt.id
        WHERE rt.company_id = p_company_id
        AND rt.transaction_date >= CURRENT_DATE - p_lookback_days
        GROUP BY rti.product_id
    ),
    abc_ranked AS (
        SELECT
            product_id,
            total_revenue,
            cv,
            SUM(total_revenue) OVER (ORDER BY total_revenue DESC) as cumulative_revenue,
            SUM(total_revenue) OVER () as total_total_revenue
        FROM product_sales
    ),
    classifications AS (
        SELECT
            product_id,
            CASE
                WHEN cumulative_revenue <= total_total_revenue * 0.80 THEN 'A'
                WHEN cumulative_revenue <= total_total_revenue * 0.95 THEN 'B'
                ELSE 'C'
            END as abc_class,
            CASE
                WHEN cv IS NULL THEN 'Z'
                WHEN cv <= 0.5 THEN 'X'
                WHEN cv <= 1.0 THEN 'Y'
                ELSE 'Z'
            END as xyz_class
        FROM abc_ranked
    )
    UPDATE wms_products p
    SET
        abc_class = c.abc_class,
        xyz_class = c.xyz_class,
        abc_xyz_last_calculated = NOW()
    FROM classifications c
    WHERE p.id = c.product_id
    AND (p_warehouse_id IS NULL OR p.warehouse_id = p_warehouse_id);

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- 10.4 Función para generar sugerencias de reorden
CREATE OR REPLACE FUNCTION retail_generate_reorder_suggestions(
    p_company_id INTEGER,
    p_warehouse_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_created INTEGER := 0;
BEGIN
    -- Marcar sugerencias anteriores como expiradas
    UPDATE retail_reorder_suggestions
    SET status = 'expired', expires_at = NOW()
    WHERE company_id = p_company_id
    AND warehouse_id = p_warehouse_id
    AND status = 'pending';

    -- Generar nuevas sugerencias
    INSERT INTO retail_reorder_suggestions (
        company_id, warehouse_id, product_id, product_code, product_name,
        category_id, supplier_id, supplier_name,
        current_stock, reorder_point, safety_stock, days_of_supply,
        suggested_quantity, suggested_order_date, expected_delivery_date,
        order_urgency, forecasted_demand_30d, stockout_probability,
        calculation_method, estimated_unit_cost, estimated_total_cost,
        grouping_key
    )
    SELECT
        p.warehouse_id,
        w.id as warehouse_id,
        p.id,
        p.internal_code,
        p.name,
        p.category_id,
        p.supplier_id,
        s.trade_name,
        COALESCE(sm.available_quantity, 0),
        p.reorder_point,
        p.safety_stock,
        p.days_of_supply,
        -- Suggested quantity: hasta max_stock o EOQ
        GREATEST(
            COALESCE(p.max_stock, p.reorder_point * 3) - COALESCE(sm.available_quantity, 0),
            COALESCE(p.min_order_qty, 1)
        ),
        CURRENT_DATE,
        CURRENT_DATE + COALESCE(p.lead_time_days, 7),
        CASE
            WHEN COALESCE(sm.available_quantity, 0) <= 0 THEN 'critical'
            WHEN p.days_of_supply < 3 THEN 'urgent'
            WHEN p.days_of_supply < 7 THEN 'normal'
            ELSE 'planned'
        END,
        p.avg_daily_sales * 30,
        p.stockout_probability,
        'dynamic',
        pc.total_cost,
        pc.total_cost * GREATEST(
            COALESCE(p.max_stock, p.reorder_point * 3) - COALESCE(sm.available_quantity, 0),
            COALESCE(p.min_order_qty, 1)
        ),
        'SUPP-' || p.supplier_id || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD')
    FROM wms_products p
    JOIN wms_warehouses w ON p.warehouse_id = w.id
    LEFT JOIN wms_stock_movements sm ON p.id = sm.product_id AND sm.is_current = true
    LEFT JOIN wms_product_costs pc ON p.id = pc.product_id AND pc.is_current = true
    LEFT JOIN wms_suppliers s ON p.supplier_id = s.id
    WHERE w.company_id = p_company_id
    AND (p_warehouse_id IS NULL OR w.id = p_warehouse_id)
    AND p.is_active = true
    AND COALESCE(sm.available_quantity, 0) <= COALESCE(p.reorder_point, 0)
    AND p.reorder_point > 0;

    GET DIAGNOSTICS v_created = ROW_COUNT;

    RETURN v_created;
END;
$$ LANGUAGE plpgsql;

-- 10.5 Trigger para actualizar frecuencia de visita del proveedor
CREATE OR REPLACE FUNCTION retail_update_supplier_visit_frequency()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular frecuencia promedio de visita basada en recepciones
    UPDATE wms_suppliers s
    SET
        visit_frequency_days = (
            SELECT ROUND(AVG(days_between))::INTEGER
            FROM (
                SELECT
                    receipt_date - LAG(receipt_date) OVER (ORDER BY receipt_date) as days_between
                FROM procurement_receipts
                WHERE supplier_id = NEW.supplier_id
                AND company_id = NEW.company_id
                ORDER BY receipt_date DESC
                LIMIT 10
            ) t
            WHERE days_between IS NOT NULL
        ),
        last_visit_date = NEW.receipt_date,
        next_expected_visit = NEW.receipt_date + INTERVAL '1 day' * COALESCE(s.visit_frequency_days, 7),
        avg_lead_time_days = (
            SELECT ROUND(AVG(EXTRACT(EPOCH FROM (r.receipt_date - o.order_date)) / 86400)::NUMERIC, 1)
            FROM procurement_receipts r
            JOIN procurement_orders o ON r.order_id = o.id
            WHERE r.supplier_id = NEW.supplier_id
            AND r.company_id = NEW.company_id
            ORDER BY r.receipt_date DESC
            LIMIT 20
        )
    WHERE s.id = NEW.supplier_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_supplier_visit ON procurement_receipts;
CREATE TRIGGER trg_update_supplier_visit
    AFTER INSERT ON procurement_receipts
    FOR EACH ROW
    EXECUTE FUNCTION retail_update_supplier_visit_frequency();

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 11: VISTAS ÚTILES                                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 11.1 Vista de productos con métricas de retail
CREATE OR REPLACE VIEW retail_products_dashboard AS
SELECT
    p.id,
    p.warehouse_id,
    w.company_id,
    p.internal_code,
    p.name,
    p.category_id,
    c.name as category_name,
    p.brand_id,
    b.name as brand_name,

    -- Stock
    COALESCE(sm.available_quantity, 0) as current_stock,
    p.reorder_point,
    p.safety_stock,
    p.max_stock,
    p.days_of_supply,

    -- Clasificación
    p.abc_class,
    p.xyz_class,
    p.abc_class || p.xyz_class as abc_xyz_combined,

    -- Ventas
    p.avg_daily_sales,
    p.sales_velocity,
    p.stockout_probability,

    -- Estacionalidad
    p.is_seasonal,
    p.season_start_month,
    p.season_end_month,

    -- Planograma
    p.gondola_section,
    p.shelf_level,
    p.facing_count,

    -- Estado
    CASE
        WHEN COALESCE(sm.available_quantity, 0) <= 0 THEN 'stockout'
        WHEN COALESCE(sm.available_quantity, 0) <= p.safety_stock THEN 'critical'
        WHEN COALESCE(sm.available_quantity, 0) <= p.reorder_point THEN 'reorder'
        WHEN COALESCE(sm.available_quantity, 0) >= p.max_stock THEN 'overstock'
        ELSE 'ok'
    END as stock_status

FROM wms_products p
JOIN wms_warehouses w ON p.warehouse_id = w.id
LEFT JOIN wms_categories c ON p.category_id = c.id
LEFT JOIN wms_brands b ON p.brand_id = b.id
LEFT JOIN wms_stock_movements sm ON p.id = sm.product_id AND sm.is_current = true
WHERE p.is_active = true;

-- 11.2 Vista de reglas de asociación top
CREATE OR REPLACE VIEW retail_top_association_rules AS
SELECT
    r.company_id,
    r.rule_code,
    array_to_string(r.antecedent_names, ', ') as if_buys,
    array_to_string(r.consequent_names, ', ') as then_also_buys,
    ROUND(r.support * 100, 2) as support_pct,
    ROUND(r.confidence * 100, 2) as confidence_pct,
    ROUND(r.lift, 2) as lift,
    r.transactions_count,
    r.algorithm,
    r.calculated_from,
    r.calculated_to
FROM retail_association_rules r
WHERE r.status = 'active'
AND r.is_actionable = true
ORDER BY r.lift DESC;

-- 11.3 Vista de clientes por segmento
CREATE OR REPLACE VIEW retail_customer_segments_summary AS
SELECT
    cm.company_id,
    cm.rfm_segment,
    COUNT(*) as customer_count,
    SUM(cm.total_revenue) as total_revenue,
    AVG(cm.total_orders) as avg_orders,
    AVG(cm.total_revenue) as avg_revenue,
    AVG(cm.predicted_clv) as avg_clv,
    AVG(cm.churn_probability) as avg_churn_probability
FROM retail_customer_metrics cm
GROUP BY cm.company_id, cm.rfm_segment
ORDER BY cm.company_id, total_revenue DESC;

-- Comentarios finales
COMMENT ON FUNCTION retail_sync_transactions_from_siac IS 'Sincroniza transacciones desde SIAC Facturación a las tablas de retail analytics';
COMMENT ON FUNCTION retail_calculate_rfm IS 'Calcula scores RFM y segmenta clientes';
COMMENT ON FUNCTION retail_calculate_abc_xyz IS 'Clasifica productos en ABC (volumen) y XYZ (variabilidad)';
COMMENT ON FUNCTION retail_generate_reorder_suggestions IS 'Genera sugerencias automáticas de reabastecimiento';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRACIÓN
-- Total de nuevas tablas: 18
-- Total de columnas agregadas a tablas existentes: ~25
-- Total de funciones: 5
-- Total de triggers: 1
-- Total de vistas: 3
-- ═══════════════════════════════════════════════════════════════════════════════
