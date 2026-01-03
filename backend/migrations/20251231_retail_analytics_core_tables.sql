-- ═══════════════════════════════════════════════════════════════════════════════
-- RETAIL ANALYTICS - CORE TABLES (Simplified Version)
-- Fecha: 2025-12-31
-- Solo tablas core sin dependencias de procurement
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 1: EXTENSIONES A WMS_PRODUCTS                                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
    -- Planograma / Gondola
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'gondola_section') THEN
        ALTER TABLE wms_products ADD COLUMN gondola_section VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'shelf_level') THEN
        ALTER TABLE wms_products ADD COLUMN shelf_level INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'facing_count') THEN
        ALTER TABLE wms_products ADD COLUMN facing_count INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'shelf_depth_units') THEN
        ALTER TABLE wms_products ADD COLUMN shelf_depth_units INTEGER DEFAULT 3;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'display_type') THEN
        ALTER TABLE wms_products ADD COLUMN display_type VARCHAR(30) DEFAULT 'standard';
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
        ALTER TABLE wms_products ADD COLUMN order_multiple DECIMAL(12,3) DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'lead_time_days') THEN
        ALTER TABLE wms_products ADD COLUMN lead_time_days INTEGER DEFAULT 7;
    END IF;

    -- Estacionalidad
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'is_seasonal') THEN
        ALTER TABLE wms_products ADD COLUMN is_seasonal BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'season_start_month') THEN
        ALTER TABLE wms_products ADD COLUMN season_start_month INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'season_end_month') THEN
        ALTER TABLE wms_products ADD COLUMN season_end_month INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'seasonality_factor') THEN
        ALTER TABLE wms_products ADD COLUMN seasonality_factor JSONB DEFAULT '{}';
    END IF;

    -- Clasificación ABC/XYZ
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'abc_class') THEN
        ALTER TABLE wms_products ADD COLUMN abc_class CHAR(1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'xyz_class') THEN
        ALTER TABLE wms_products ADD COLUMN xyz_class CHAR(1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'abc_xyz_last_calculated') THEN
        ALTER TABLE wms_products ADD COLUMN abc_xyz_last_calculated TIMESTAMPTZ;
    END IF;

    -- Métricas calculadas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'avg_daily_sales') THEN
        ALTER TABLE wms_products ADD COLUMN avg_daily_sales DECIMAL(12,4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'sales_velocity') THEN
        ALTER TABLE wms_products ADD COLUMN sales_velocity DECIMAL(10,4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'days_of_supply') THEN
        ALTER TABLE wms_products ADD COLUMN days_of_supply DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_products' AND column_name = 'stockout_probability') THEN
        ALTER TABLE wms_products ADD COLUMN stockout_probability DECIMAL(5,4);
    END IF;
END $$;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 2: EXTENSIONES A WMS_SUPPLIERS                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

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
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'order_cutoff_time') THEN
        ALTER TABLE wms_suppliers ADD COLUMN order_cutoff_time TIME;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'last_visit_date') THEN
        ALTER TABLE wms_suppliers ADD COLUMN last_visit_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'next_expected_visit') THEN
        ALTER TABLE wms_suppliers ADD COLUMN next_expected_visit DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'product_categories') THEN
        ALTER TABLE wms_suppliers ADD COLUMN product_categories JSONB DEFAULT '[]';
    END IF;
END $$;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 3: TABLAS DE TRANSACCIONES RETAIL                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Transacciones agregadas para basket analysis
CREATE TABLE IF NOT EXISTS retail_transactions (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    transaction_time TIME,
    source_type VARCHAR(20) DEFAULT 'siac',
    source_id VARCHAR(50),
    pos_id VARCHAR(20),
    customer_id INTEGER,
    customer_type VARCHAR(20),
    total_items INTEGER DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_total DECIMAL(15,2) DEFAULT 0,
    tax_total DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    payment_method VARCHAR(30),
    day_of_week INTEGER,
    hour_of_day INTEGER,
    is_weekend BOOLEAN DEFAULT false,
    is_holiday BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_trans_company_date ON retail_transactions(company_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_retail_trans_customer ON retail_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_retail_trans_dow ON retail_transactions(company_id, day_of_week);

-- Items de transacciones para basket analysis
CREATE TABLE IF NOT EXISTS retail_transaction_items (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES retail_transactions(id) ON DELETE CASCADE,
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    category_id INTEGER,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(15,4),
    discount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_items_trans ON retail_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_retail_items_product ON retail_transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_retail_items_category ON retail_transaction_items(category_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 4: REGLAS DE ASOCIACIÓN (MARKET BASKET)                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS retail_association_rules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    antecedent_items JSONB NOT NULL,
    consequent_items JSONB NOT NULL,
    antecedent_products TEXT[],
    consequent_products TEXT[],
    support DECIMAL(8,6) NOT NULL,
    confidence DECIMAL(8,6) NOT NULL,
    lift DECIMAL(10,4),
    leverage DECIMAL(10,6),
    conviction DECIMAL(10,4),
    transaction_count INTEGER,
    algorithm VARCHAR(30) DEFAULT 'fp_growth',
    calculation_date TIMESTAMPTZ DEFAULT NOW(),
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assoc_company_active ON retail_association_rules(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_assoc_support ON retail_association_rules(support DESC);
CREATE INDEX IF NOT EXISTS idx_assoc_confidence ON retail_association_rules(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_assoc_lift ON retail_association_rules(lift DESC);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 5: FORECASTING DE DEMANDA                                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS retail_demand_forecasts (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    product_id INTEGER,
    warehouse_id INTEGER,
    location_id INTEGER,
    forecast_date DATE NOT NULL,
    forecast_horizon_days INTEGER DEFAULT 7,
    predicted_quantity DECIMAL(12,3) NOT NULL,
    predicted_revenue DECIMAL(15,2),
    confidence_lower DECIMAL(12,3),
    confidence_upper DECIMAL(12,3),
    confidence_level DECIMAL(5,4) DEFAULT 0.95,
    algorithm VARCHAR(50) NOT NULL,
    algorithm_params JSONB DEFAULT '{}',
    model_accuracy DECIMAL(8,6),
    mae DECIMAL(12,4),
    rmse DECIMAL(12,4),
    mape DECIMAL(8,4),
    seasonality_applied BOOLEAN DEFAULT false,
    seasonality_factor DECIMAL(6,4),
    trend_component DECIMAL(12,4),
    factors_considered JSONB DEFAULT '{}',
    calculation_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_company_product ON retail_demand_forecasts(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_forecast_date ON retail_demand_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_forecast_active ON retail_demand_forecasts(is_active);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 6: MÉTRICAS DE CLIENTES (RFM)                                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS retail_customer_metrics (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL,
    rfm_recency_days INTEGER,
    rfm_frequency INTEGER,
    rfm_monetary DECIMAL(15,2),
    rfm_r_score INTEGER CHECK (rfm_r_score BETWEEN 1 AND 5),
    rfm_f_score INTEGER CHECK (rfm_f_score BETWEEN 1 AND 5),
    rfm_m_score INTEGER CHECK (rfm_m_score BETWEEN 1 AND 5),
    rfm_segment VARCHAR(30),
    clv_predicted DECIMAL(15,2),
    clv_confidence DECIMAL(5,4),
    first_purchase_date DATE,
    last_purchase_date DATE,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    avg_order_value DECIMAL(15,2),
    avg_days_between_orders DECIMAL(10,2),
    preferred_payment_method VARCHAR(30),
    preferred_day_of_week INTEGER,
    preferred_hour INTEGER,
    top_categories JSONB DEFAULT '[]',
    top_products JSONB DEFAULT '[]',
    churn_probability DECIMAL(5,4),
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_metrics_company ON retail_customer_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_segment ON retail_customer_metrics(rfm_segment);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_churn ON retail_customer_metrics(churn_probability DESC);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 7: SEGMENTOS DE CLIENTES                                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS retail_customer_segments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    segment_code VARCHAR(30) NOT NULL,
    segment_name VARCHAR(100) NOT NULL,
    segment_type VARCHAR(20) DEFAULT 'rfm',
    definition_rules JSONB NOT NULL,
    description TEXT,
    characteristics TEXT[],
    recommended_actions TEXT[],
    color_code VARCHAR(10),
    priority_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, segment_code)
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 8: SUGERENCIAS DE REORDEN                                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS retail_reorder_suggestions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    warehouse_id INTEGER,
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    supplier_id INTEGER,
    supplier_name VARCHAR(200),
    current_stock DECIMAL(12,3),
    reorder_point DECIMAL(12,3),
    safety_stock DECIMAL(12,3),
    max_stock DECIMAL(12,3),
    suggested_quantity DECIMAL(12,3) NOT NULL,
    min_order_quantity DECIMAL(12,3),
    order_multiple DECIMAL(12,3),
    estimated_unit_cost DECIMAL(15,4),
    estimated_total DECIMAL(15,2),
    days_of_supply DECIMAL(10,2),
    avg_daily_sales DECIMAL(12,4),
    lead_time_days INTEGER,
    expected_stockout_date DATE,
    urgency_level VARCHAR(20) DEFAULT 'normal',
    reason TEXT,
    algorithm_used VARCHAR(50),
    algorithm_info JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by INTEGER,
    reviewed_at TIMESTAMPTZ,
    order_created BOOLEAN DEFAULT false,
    order_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reorder_company_status ON retail_reorder_suggestions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_reorder_urgency ON retail_reorder_suggestions(urgency_level);
CREATE INDEX IF NOT EXISTS idx_reorder_supplier ON retail_reorder_suggestions(supplier_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 9: PATRONES DE ESTACIONALIDAD                                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS retail_seasonality_patterns (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    product_id INTEGER,
    category_id INTEGER,
    pattern_type VARCHAR(30) NOT NULL,
    pattern_period VARCHAR(20),
    pattern_data JSONB NOT NULL,
    strength DECIMAL(6,4),
    peak_periods JSONB,
    low_periods JSONB,
    calculation_date TIMESTAMPTZ DEFAULT NOW(),
    data_start_date DATE,
    data_end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_season_company_product ON retail_seasonality_patterns(company_id, product_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 10: CONFIGURACIÓN DEL MÓDULO                                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS retail_analytics_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    basket_min_support DECIMAL(6,4) DEFAULT 0.01,
    basket_min_confidence DECIMAL(6,4) DEFAULT 0.3,
    basket_max_items INTEGER DEFAULT 5,
    forecast_default_algorithm VARCHAR(30) DEFAULT 'simple_exponential',
    forecast_horizon_days INTEGER DEFAULT 7,
    forecast_confidence_level DECIMAL(5,4) DEFAULT 0.95,
    rfm_recency_days INTEGER DEFAULT 365,
    rfm_custom_thresholds JSONB DEFAULT '{}',
    abc_a_threshold DECIMAL(5,4) DEFAULT 0.80,
    abc_b_threshold DECIMAL(5,4) DEFAULT 0.95,
    xyz_x_threshold DECIMAL(6,4) DEFAULT 0.20,
    xyz_y_threshold DECIMAL(6,4) DEFAULT 0.50,
    reorder_auto_suggest BOOLEAN DEFAULT true,
    reorder_lead_time_buffer INTEGER DEFAULT 2,
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency_hours INTEGER DEFAULT 24,
    last_sync TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id)
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 11: HISTORIAL DE STOCKOUTS                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS retail_stockout_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    warehouse_id INTEGER,
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    stockout_start TIMESTAMPTZ NOT NULL,
    stockout_end TIMESTAMPTZ,
    duration_hours DECIMAL(10,2),
    estimated_lost_sales DECIMAL(15,2),
    estimated_lost_units DECIMAL(12,3),
    detection_method VARCHAR(30),
    root_cause VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stockout_company_product ON retail_stockout_history(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stockout_date ON retail_stockout_history(stockout_start);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 12: TABLAS PARA COMPRA CENTRALIZADA MULTI-BRANCH                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Tipos de ubicación
CREATE TABLE IF NOT EXISTS retail_location_types (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(30) NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    can_be_cedi BOOLEAN DEFAULT false,
    can_request_products BOOLEAN DEFAULT true,
    can_receive_distributions BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO retail_location_types (type_code, type_name, description, can_be_cedi, can_request_products, can_receive_distributions) VALUES
    ('cedi', 'Centro de Distribución', 'Centro de distribución principal', true, true, false),
    ('store', 'Tienda/Sucursal', 'Tienda física que recibe productos del CEDI', false, true, true),
    ('store_autonomous', 'Tienda Autónoma', 'Tienda que compra directo a proveedores', false, true, true),
    ('dark_store', 'Dark Store', 'Almacén para entregas online', false, true, true),
    ('franchise', 'Franquicia', 'Punto de venta franquiciado', false, true, true)
ON CONFLICT (type_code) DO NOTHING;

-- Ubicaciones (sucursales, CEDIs, etc)
CREATE TABLE IF NOT EXISTS retail_locations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    location_code VARCHAR(30) NOT NULL,
    location_name VARCHAR(200) NOT NULL,
    location_type_id INTEGER REFERENCES retail_location_types(id),
    parent_location_id INTEGER REFERENCES retail_locations(id),
    assigned_cedi_id INTEGER REFERENCES retail_locations(id),
    primary_warehouse_id INTEGER,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(50),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(30),
    contact_email VARCHAR(100),
    procurement_mode VARCHAR(20) DEFAULT 'centralized',
    min_order_amount DECIMAL(15,2),
    delivery_schedule JSONB DEFAULT '{}',
    auto_request_enabled BOOLEAN DEFAULT false,
    auto_request_threshold_days INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, location_code)
);

CREATE INDEX IF NOT EXISTS idx_locations_company ON retail_locations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_locations_cedi ON retail_locations(assigned_cedi_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON retail_locations(parent_location_id);

-- Solicitudes de sucursales
CREATE TABLE IF NOT EXISTS retail_branch_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES retail_locations(id),
    request_number VARCHAR(30) NOT NULL,
    request_type VARCHAR(20) DEFAULT 'regular',
    request_date DATE NOT NULL,
    needed_date DATE,
    priority VARCHAR(20) DEFAULT 'normal',
    total_items INTEGER DEFAULT 0,
    estimated_total DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    submitted_by INTEGER,
    approved_at TIMESTAMPTZ,
    approved_by INTEGER,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    consolidated_order_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, request_number)
);

CREATE INDEX IF NOT EXISTS idx_branch_req_company_status ON retail_branch_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_branch_req_location ON retail_branch_requests(location_id);

-- Items de solicitudes
CREATE TABLE IF NOT EXISTS retail_branch_request_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES retail_branch_requests(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    category_id INTEGER,
    quantity_requested DECIMAL(12,3) NOT NULL,
    quantity_approved DECIMAL(12,3),
    unit_of_measure VARCHAR(20),
    estimated_unit_cost DECIMAL(15,4),
    current_stock DECIMAL(12,3),
    min_stock DECIMAL(12,3),
    max_stock DECIMAL(12,3),
    avg_daily_sales DECIMAL(12,4),
    days_of_supply DECIMAL(10,2),
    preferred_supplier_id INTEGER,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branch_req_items_request ON retail_branch_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_branch_req_items_product ON retail_branch_request_items(product_id);

-- Órdenes consolidadas
CREATE TABLE IF NOT EXISTS retail_consolidated_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    cedi_location_id INTEGER NOT NULL REFERENCES retail_locations(id),
    warehouse_id INTEGER,
    consolidation_number VARCHAR(30) NOT NULL,
    supplier_id INTEGER,
    supplier_name VARCHAR(200),
    consolidation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_locations INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    total_quantity DECIMAL(15,3) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    purchase_order_id INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, consolidation_number)
);

CREATE INDEX IF NOT EXISTS idx_consolidated_company_status ON retail_consolidated_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_consolidated_supplier ON retail_consolidated_orders(supplier_id);

-- Items consolidados
CREATE TABLE IF NOT EXISTS retail_consolidated_order_items (
    id SERIAL PRIMARY KEY,
    consolidated_order_id INTEGER NOT NULL REFERENCES retail_consolidated_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    category_id INTEGER,
    total_quantity DECIMAL(12,3) NOT NULL,
    unit_cost DECIMAL(15,4),
    line_total DECIMAL(15,2),
    unit_of_measure VARCHAR(20),
    distribution_plan JSONB DEFAULT '{}',
    source_request_items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cons_items_order ON retail_consolidated_order_items(consolidated_order_id);

-- Órdenes de distribución
CREATE TABLE IF NOT EXISTS retail_distribution_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    consolidated_order_id INTEGER REFERENCES retail_consolidated_orders(id),
    from_location_id INTEGER NOT NULL REFERENCES retail_locations(id),
    to_location_id INTEGER NOT NULL REFERENCES retail_locations(id),
    distribution_number VARCHAR(30) NOT NULL,
    distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_delivery_date DATE,
    total_items INTEGER DEFAULT 0,
    total_quantity DECIMAL(15,3) DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    received_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, distribution_number)
);

CREATE INDEX IF NOT EXISTS idx_dist_orders_company ON retail_distribution_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_dist_orders_from ON retail_distribution_orders(from_location_id);
CREATE INDEX IF NOT EXISTS idx_dist_orders_to ON retail_distribution_orders(to_location_id);

-- Items de distribución
CREATE TABLE IF NOT EXISTS retail_distribution_order_items (
    id SERIAL PRIMARY KEY,
    distribution_order_id INTEGER NOT NULL REFERENCES retail_distribution_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    quantity_planned DECIMAL(12,3) NOT NULL,
    quantity_shipped DECIMAL(12,3),
    quantity_received DECIMAL(12,3),
    unit_cost DECIMAL(15,4),
    batch_number VARCHAR(50),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dist_items_order ON retail_distribution_order_items(distribution_order_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 13: VISTA DE STOCK EN RED                                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE VIEW retail_network_stock AS
SELECT
    l.company_id,
    l.id as location_id,
    l.location_code,
    l.location_name,
    lt.type_code as location_type,
    p.id as product_id,
    p.internal_code as product_code,
    p.name as product_name,
    COALESCE(s.quantity_on_hand, 0) as current_stock,
    p.reorder_point,
    p.safety_stock,
    p.max_stock,
    p.avg_daily_sales,
    CASE
        WHEN p.avg_daily_sales > 0 THEN COALESCE(s.quantity_on_hand, 0) / p.avg_daily_sales
        ELSE NULL
    END as days_of_supply,
    CASE
        WHEN COALESCE(s.quantity_on_hand, 0) <= COALESCE(p.safety_stock, 0) THEN 'critical'
        WHEN COALESCE(s.quantity_on_hand, 0) <= COALESCE(p.reorder_point, 0) THEN 'low'
        WHEN COALESCE(s.quantity_on_hand, 0) >= COALESCE(p.max_stock, 999999) THEN 'overstock'
        ELSE 'normal'
    END as stock_status
FROM retail_locations l
JOIN retail_location_types lt ON l.location_type_id = lt.id
CROSS JOIN wms_products p
LEFT JOIN wms_stock s ON s.product_id = p.id AND s.warehouse_id = l.primary_warehouse_id
WHERE l.status = 'active';

COMMENT ON TABLE retail_transactions IS 'Transacciones agregadas de ventas para análisis de canasta';
COMMENT ON TABLE retail_association_rules IS 'Reglas de asociación calculadas por FP-Growth';
COMMENT ON TABLE retail_demand_forecasts IS 'Predicciones de demanda por producto';
COMMENT ON TABLE retail_customer_metrics IS 'Métricas RFM y CLV por cliente';
COMMENT ON TABLE retail_reorder_suggestions IS 'Sugerencias automáticas de reorden';
COMMENT ON TABLE retail_locations IS 'Sucursales, CEDIs y puntos de venta';
COMMENT ON TABLE retail_branch_requests IS 'Solicitudes de productos por sucursal';
COMMENT ON TABLE retail_consolidated_orders IS 'Órdenes consolidadas de múltiples sucursales';
COMMENT ON TABLE retail_distribution_orders IS 'Órdenes de distribución CEDI a sucursales';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE MIGRACIÓN CORE
-- ═══════════════════════════════════════════════════════════════════════════════
