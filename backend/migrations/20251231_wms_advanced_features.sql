-- ============================================================================
-- WMS ADVANCED FEATURES - Llevando el sistema al máximo nivel
-- Features: ABC/XYZ Analysis, Inventory Optimization, Quality Holds,
--           Cycle Counting, Cross-Docking, Demand Forecasting
-- ============================================================================

-- ============================================================================
-- 1. CLASIFICACIÓN ABC/XYZ DE INVENTARIO
-- ABC: Por valor (A=80% valor, B=15%, C=5%)
-- XYZ: Por volatilidad de demanda (X=estable, Y=moderado, Z=errático)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_inventory_classification (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    abc_class CHAR(1) CHECK (abc_class IN ('A', 'B', 'C')),
    xyz_class CHAR(1) CHECK (xyz_class IN ('X', 'Y', 'Z')),
    combined_class VARCHAR(2) GENERATED ALWAYS AS (abc_class || xyz_class) STORED,
    annual_consumption_value DECIMAL(15,2),
    demand_variability DECIMAL(5,4),
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculation_period_months INTEGER DEFAULT 12,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wms_inv_class_company ON wms_inventory_classification(company_id);
CREATE INDEX IF NOT EXISTS idx_wms_inv_class_abc ON wms_inventory_classification(abc_class);
CREATE INDEX IF NOT EXISTS idx_wms_inv_class_combined ON wms_inventory_classification(combined_class);

-- ============================================================================
-- 2. PUNTOS DE REORDEN Y STOCK DE SEGURIDAD
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_reorder_points (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    reorder_point DECIMAL(15,4) NOT NULL,
    safety_stock DECIMAL(15,4) NOT NULL,
    economic_order_qty DECIMAL(15,4),
    max_stock_level DECIMAL(15,4),
    lead_time_days INTEGER DEFAULT 7,
    service_level DECIMAL(5,4) DEFAULT 0.95,
    avg_daily_demand DECIMAL(15,4),
    demand_std_deviation DECIMAL(15,4),
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auto_generate_po BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_wms_reorder_warehouse ON wms_reorder_points(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_reorder_product ON wms_reorder_points(product_id);

-- ============================================================================
-- 3. QUALITY HOLDS (RETENCIÓN POR CALIDAD)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_quality_holds (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    batch_id INTEGER NOT NULL REFERENCES wms_stock_batches(id),
    hold_reason VARCHAR(100) NOT NULL,
    hold_type VARCHAR(50) CHECK (hold_type IN ('inspection', 'quarantine', 'recall', 'customer_complaint', 'regulatory', 'internal', 'other')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'released', 'rejected', 'expired')),
    quantity_held DECIMAL(15,4) NOT NULL,
    placed_by UUID REFERENCES users(user_id),
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_by UUID REFERENCES users(user_id),
    released_at TIMESTAMP,
    release_notes TEXT,
    inspection_required BOOLEAN DEFAULT TRUE,
    inspection_result TEXT,
    disposition VARCHAR(50),
    disposition_notes TEXT,
    reference_document VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wms_quality_holds_batch ON wms_quality_holds(batch_id);
CREATE INDEX IF NOT EXISTS idx_wms_quality_holds_status ON wms_quality_holds(status);
CREATE INDEX IF NOT EXISTS idx_wms_quality_holds_company ON wms_quality_holds(company_id, status);

-- ============================================================================
-- 4. CYCLE COUNTING (CONTEO CÍCLICO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_cycle_count_plans (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    count_frequency VARCHAR(20) CHECK (count_frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
    abc_class_filter CHAR(1)[],
    zone_filter INTEGER[],
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    tolerance_percentage DECIMAL(5,2) DEFAULT 2.00,
    auto_adjust_small_variances BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wms_cycle_counts (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES wms_cycle_count_plans(id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    count_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    scheduled_date DATE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    counted_by UUID REFERENCES users(user_id),
    verified_by UUID REFERENCES users(user_id),
    total_items INTEGER DEFAULT 0,
    items_counted INTEGER DEFAULT 0,
    discrepancies_found INTEGER DEFAULT 0,
    discrepancies_resolved INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wms_cycle_count_lines (
    id SERIAL PRIMARY KEY,
    count_id INTEGER NOT NULL REFERENCES wms_cycle_counts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    location_id INTEGER REFERENCES wms_locations(id),
    expected_quantity DECIMAL(15,4) NOT NULL,
    counted_quantity DECIMAL(15,4),
    variance DECIMAL(15,4) GENERATED ALWAYS AS (COALESCE(counted_quantity, 0) - expected_quantity) STORED,
    variance_percentage DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'counted', 'verified', 'adjusted', 'investigated')),
    counted_at TIMESTAMP,
    adjustment_type VARCHAR(20),
    adjustment_reason TEXT,
    investigation_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wms_cycle_counts_warehouse ON wms_cycle_counts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_cycle_count_lines_count ON wms_cycle_count_lines(count_id);

-- ============================================================================
-- 5. CROSS-DOCKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_cross_dock_operations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    operation_number VARCHAR(50) NOT NULL UNIQUE,
    receiving_dock_id INTEGER REFERENCES wms_locations(id),
    shipping_dock_id INTEGER REFERENCES wms_locations(id),
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'receiving', 'staging', 'shipping', 'completed', 'cancelled')),
    inbound_reference VARCHAR(100),
    outbound_reference VARCHAR(100),
    expected_arrival TIMESTAMP,
    actual_arrival TIMESTAMP,
    expected_departure TIMESTAMP,
    actual_departure TIMESTAMP,
    priority INTEGER DEFAULT 5,
    special_handling_instructions TEXT,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wms_cross_dock_lines (
    id SERIAL PRIMARY KEY,
    operation_id INTEGER NOT NULL REFERENCES wms_cross_dock_operations(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    quantity DECIMAL(15,4) NOT NULL,
    received_quantity DECIMAL(15,4) DEFAULT 0,
    shipped_quantity DECIMAL(15,4) DEFAULT 0,
    destination_customer VARCHAR(200),
    destination_address TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wms_cross_dock_company ON wms_cross_dock_operations(company_id, status);

-- ============================================================================
-- 6. DEMAND FORECASTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_demand_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    period_type VARCHAR(10) CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    actual_demand DECIMAL(15,4) NOT NULL,
    units_sold DECIMAL(15,4),
    revenue DECIMAL(15,2),
    num_transactions INTEGER,
    avg_transaction_size DECIMAL(15,4),
    stockout_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wms_demand_history_unique
ON wms_demand_history(company_id, product_id, COALESCE(warehouse_id, 0), period_type, period_start);

CREATE TABLE IF NOT EXISTS wms_demand_forecasts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    forecast_method VARCHAR(50),
    period_type VARCHAR(10) CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    forecast_quantity DECIMAL(15,4) NOT NULL,
    confidence_level DECIMAL(5,2),
    lower_bound DECIMAL(15,4),
    upper_bound DECIMAL(15,4),
    actual_quantity DECIMAL(15,4),
    forecast_error DECIMAL(15,4),
    mape DECIMAL(5,2),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(50),
    notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wms_demand_forecast_unique
ON wms_demand_forecasts(company_id, product_id, COALESCE(warehouse_id, 0), period_type, period_start, COALESCE(forecast_method, ''));

CREATE INDEX IF NOT EXISTS idx_wms_demand_history_product ON wms_demand_history(product_id, period_start);
CREATE INDEX IF NOT EXISTS idx_wms_demand_forecast_product ON wms_demand_forecasts(product_id, period_start);

-- ============================================================================
-- 7. INVENTORY VALUATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_inventory_valuation (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    valuation_date DATE NOT NULL,
    valuation_method VARCHAR(20) CHECK (valuation_method IN ('FIFO', 'LIFO', 'WAVG', 'SPECIFIC')),
    quantity_on_hand DECIMAL(15,4) NOT NULL,
    unit_cost DECIMAL(15,4) NOT NULL,
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity_on_hand * unit_cost) STORED,
    currency VARCHAR(3) DEFAULT 'ARS',
    previous_valuation_id INTEGER REFERENCES wms_inventory_valuation(id),
    adjustment_amount DECIMAL(15,2),
    adjustment_reason TEXT,
    calculated_by UUID REFERENCES users(user_id),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, product_id, warehouse_id, valuation_date)
);

CREATE INDEX IF NOT EXISTS idx_wms_valuation_date ON wms_inventory_valuation(valuation_date DESC);

-- ============================================================================
-- 8. PICKING OPTIMIZATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_pick_waves (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    wave_number VARCHAR(50) NOT NULL UNIQUE,
    wave_type VARCHAR(20) CHECK (wave_type IN ('zone', 'batch', 'cluster', 'single')),
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'released', 'in_progress', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 5,
    planned_start TIMESTAMP,
    actual_start TIMESTAMP,
    planned_end TIMESTAMP,
    actual_end TIMESTAMP,
    total_picks INTEGER DEFAULT 0,
    completed_picks INTEGER DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    completed_lines INTEGER DEFAULT 0,
    assigned_pickers UUID[],
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    optimization_score DECIMAL(5,2),
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wms_pick_tasks (
    id SERIAL PRIMARY KEY,
    wave_id INTEGER REFERENCES wms_pick_waves(id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    source_location_id INTEGER REFERENCES wms_locations(id),
    destination_location_id INTEGER REFERENCES wms_locations(id),
    quantity_required DECIMAL(15,4) NOT NULL,
    quantity_picked DECIMAL(15,4) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'short', 'cancelled')),
    sequence_number INTEGER,
    assigned_to UUID REFERENCES users(user_id),
    picked_at TIMESTAMP,
    order_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wms_pick_waves_warehouse ON wms_pick_waves(warehouse_id, status);
CREATE INDEX IF NOT EXISTS idx_wms_pick_tasks_wave ON wms_pick_tasks(wave_id);
CREATE INDEX IF NOT EXISTS idx_wms_pick_tasks_assigned ON wms_pick_tasks(assigned_to, status);

-- ============================================================================
-- 9. KPI METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_kpi_snapshots (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(20) CHECK (snapshot_type IN ('daily', 'weekly', 'monthly')),
    inventory_accuracy DECIMAL(5,2),
    order_accuracy DECIMAL(5,2),
    picking_accuracy DECIMAL(5,2),
    orders_processed INTEGER,
    lines_picked INTEGER,
    units_picked DECIMAL(15,4),
    picks_per_hour DECIMAL(10,2),
    lines_per_hour DECIMAL(10,2),
    space_utilization_pct DECIMAL(5,2),
    location_utilization_pct DECIMAL(5,2),
    dead_stock_value DECIMAL(15,2),
    expired_stock_value DECIMAL(15,2),
    expiring_soon_value DECIMAL(15,2),
    inventory_turns DECIMAL(10,2),
    days_of_supply DECIMAL(10,2),
    fill_rate DECIMAL(5,2),
    stockout_rate DECIMAL(5,2),
    receiving_dock_to_stock_hours DECIMAL(10,2),
    receipts_processed INTEGER,
    labor_hours DECIMAL(10,2),
    cost_per_unit_handled DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, warehouse_id, snapshot_date, snapshot_type)
);

CREATE INDEX IF NOT EXISTS idx_wms_kpi_date ON wms_kpi_snapshots(snapshot_date DESC);

-- ============================================================================
-- FUNCIONES DE CLASIFICACIÓN ABC
-- ============================================================================

CREATE OR REPLACE FUNCTION wms_calculate_abc_classification(p_company_id INTEGER, p_months INTEGER DEFAULT 12)
RETURNS TABLE(
    product_id INTEGER,
    annual_value DECIMAL(15,2),
    cumulative_pct DECIMAL(5,2),
    abc_class CHAR(1)
) AS $$
BEGIN
    RETURN QUERY
    WITH product_values AS (
        SELECT
            sm.product_id,
            SUM(ABS(sm.quantity) * COALESCE(sm.unit_cost, 0)) as total_value
        FROM wms_stock_movements sm
        JOIN wms_products p ON sm.product_id = p.id
        JOIN wms_stock s ON sm.stock_id = s.id
        JOIN wms_warehouses w ON s.warehouse_id = w.id
        JOIN wms_branches b ON w.branch_id = b.id
        WHERE b.company_id = p_company_id
        AND sm.movement_type IN ('sale', 'consumption', 'outbound')
        AND sm.created_at >= CURRENT_DATE - (p_months * INTERVAL '1 month')
        GROUP BY sm.product_id
    ),
    ranked AS (
        SELECT
            pv.product_id,
            pv.total_value as annual_value,
            SUM(pv.total_value) OVER (ORDER BY pv.total_value DESC) /
                NULLIF(SUM(pv.total_value) OVER (), 0) * 100 as cumulative_pct
        FROM product_values pv
    )
    SELECT
        r.product_id,
        r.annual_value,
        r.cumulative_pct::DECIMAL(5,2),
        CASE
            WHEN r.cumulative_pct <= 80 THEN 'A'
            WHEN r.cumulative_pct <= 95 THEN 'B'
            ELSE 'C'
        END::CHAR(1) as abc_class
    FROM ranked r
    ORDER BY r.annual_value DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN PARA CALCULAR PUNTOS DE REORDEN
-- ============================================================================

CREATE OR REPLACE FUNCTION wms_calculate_reorder_point(
    p_product_id INTEGER,
    p_warehouse_id INTEGER,
    p_lead_time_days INTEGER DEFAULT 7,
    p_service_level DECIMAL DEFAULT 0.95
)
RETURNS TABLE(
    reorder_point DECIMAL(15,4),
    safety_stock DECIMAL(15,4),
    avg_daily_demand DECIMAL(15,4),
    demand_std_dev DECIMAL(15,4)
) AS $$
DECLARE
    z_score DECIMAL;
BEGIN
    z_score := CASE
        WHEN p_service_level >= 0.99 THEN 2.33
        WHEN p_service_level >= 0.98 THEN 2.05
        WHEN p_service_level >= 0.97 THEN 1.88
        WHEN p_service_level >= 0.96 THEN 1.75
        WHEN p_service_level >= 0.95 THEN 1.65
        WHEN p_service_level >= 0.90 THEN 1.28
        ELSE 1.00
    END;

    RETURN QUERY
    WITH daily_demand AS (
        SELECT
            DATE(sm.created_at) as demand_date,
            SUM(ABS(sm.quantity)) as daily_qty
        FROM wms_stock_movements sm
        JOIN wms_stock s ON sm.stock_id = s.id
        WHERE s.product_id = p_product_id
        AND s.warehouse_id = p_warehouse_id
        AND sm.movement_type IN ('sale', 'consumption', 'outbound')
        AND sm.created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY DATE(sm.created_at)
    ),
    stats AS (
        SELECT
            COALESCE(AVG(daily_qty), 0) as avg_demand,
            COALESCE(STDDEV(daily_qty), 0) as std_demand
        FROM daily_demand
    )
    SELECT
        (s.avg_demand * p_lead_time_days + z_score * s.std_demand * SQRT(p_lead_time_days))::DECIMAL(15,4),
        (z_score * s.std_demand * SQRT(p_lead_time_days))::DECIMAL(15,4),
        s.avg_demand::DECIMAL(15,4),
        s.std_demand::DECIMAL(15,4)
    FROM stats s;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VISTA: STOCK EN RIESGO
-- ============================================================================

CREATE OR REPLACE VIEW wms_at_risk_inventory AS
SELECT
    s.id as stock_id,
    p.id as product_id,
    p.name as product_name,
    p.internal_code as sku,
    w.id as warehouse_id,
    w.name as warehouse_name,
    b.company_id,
    s.quantity_on_hand,
    0 as unit_cost,
    0 as stock_value,
    COALESCE(last_movement.last_move_date, s.created_at) as last_movement_date,
    CURRENT_DATE - COALESCE(last_movement.last_move_date, s.created_at::date) as days_since_movement,
    CASE
        WHEN CURRENT_DATE - COALESCE(last_movement.last_move_date, s.created_at::date) > 365 THEN 'dead_stock'
        WHEN CURRENT_DATE - COALESCE(last_movement.last_move_date, s.created_at::date) > 180 THEN 'very_slow'
        WHEN CURRENT_DATE - COALESCE(last_movement.last_move_date, s.created_at::date) > 90 THEN 'slow_moving'
        ELSE 'active'
    END as risk_category,
    ic.abc_class,
    ic.xyz_class
FROM wms_stock s
JOIN wms_products p ON s.product_id = p.id
JOIN wms_warehouses w ON s.warehouse_id = w.id
JOIN wms_branches b ON w.branch_id = b.id
LEFT JOIN wms_inventory_classification ic ON ic.product_id = p.id AND ic.company_id = b.company_id
LEFT JOIN LATERAL (
    SELECT MAX(sm.created_at::date) as last_move_date
    FROM wms_stock_movements sm
    WHERE sm.stock_id = s.id
) last_movement ON TRUE
WHERE s.quantity_on_hand > 0;

-- ============================================================================
-- VISTA: KPIs EN TIEMPO REAL
-- ============================================================================

CREATE OR REPLACE VIEW wms_realtime_kpis AS
SELECT
    b.company_id,
    w.id as warehouse_id,
    w.name as warehouse_name,
    COUNT(DISTINCT s.product_id) as unique_products,
    COALESCE(SUM(s.quantity_on_hand), 0) as total_units,
    0 as total_inventory_value,
    0 as locations_used,
    0 as total_locations,
    COUNT(sb.id) FILTER (WHERE sb.expiry_date <= CURRENT_DATE) as expired_batches,
    COUNT(sb.id) FILTER (WHERE sb.expiry_date > CURRENT_DATE AND sb.expiry_date <= CURRENT_DATE + 30) as expiring_30_days,
    (SELECT COUNT(*) FROM wms_transfers t WHERE t.company_id = b.company_id AND t.status IN ('pending', 'approved')) as pending_transfers,
    (SELECT COUNT(*) FROM wms_quality_holds qh WHERE qh.company_id = b.company_id AND qh.status = 'active') as active_holds,
    (SELECT COUNT(*) FROM wms_recall_requests r WHERE r.company_id = b.company_id AND r.status NOT IN ('closed', 'cancelled')) as active_recalls
FROM wms_warehouses w
JOIN wms_branches b ON w.branch_id = b.id
LEFT JOIN wms_stock s ON s.warehouse_id = w.id
LEFT JOIN wms_products p ON s.product_id = p.id
LEFT JOIN wms_stock_batches sb ON sb.stock_id = s.id
WHERE w.is_active = TRUE
GROUP BY b.company_id, w.id, w.name;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
    v_tables INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tables
    FROM information_schema.tables
    WHERE table_name LIKE 'wms_%' AND table_schema = 'public';

    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '       WMS ADVANCED FEATURES - INSTALACION COMPLETA            ';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Total tablas WMS: %', v_tables;
    RAISE NOTICE '';
    RAISE NOTICE 'NUEVAS CAPACIDADES:';
    RAISE NOTICE '  - Clasificacion ABC/XYZ de inventario';
    RAISE NOTICE '  - Puntos de reorden automaticos';
    RAISE NOTICE '  - Stock de seguridad calculado';
    RAISE NOTICE '  - Quality Holds (retencion por calidad)';
    RAISE NOTICE '  - Cycle Counting (conteo ciclico)';
    RAISE NOTICE '  - Cross-Docking';
    RAISE NOTICE '  - Demand Forecasting';
    RAISE NOTICE '  - Inventory Valuation (FIFO/LIFO/WAVG)';
    RAISE NOTICE '  - Pick Wave Optimization';
    RAISE NOTICE '  - KPI Dashboards en tiempo real';
    RAISE NOTICE '================================================================';
END $$;
