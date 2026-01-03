-- ═══════════════════════════════════════════════════════════════════════════════
-- WMS ADVANCED & ENTERPRISE FEATURES - CORRECTED VERSION
-- Fecha: 2025-12-31
-- Versión: 3.0 - Tipos corregidos para compatibilidad con tablas existentes
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. EXTENSIONES DE CONFIGURACIÓN DE ALMACENES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS rotation_policy VARCHAR(10) DEFAULT 'FIFO' CHECK (rotation_policy IN ('FIFO', 'LIFO', 'FEFO'));
ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS auto_rotation_enabled BOOLEAN DEFAULT true;
ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS storage_cost_per_m3_day DECIMAL(15,4) DEFAULT 0;
ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS capital_cost_rate_annual DECIMAL(5,4) DEFAULT 0.12;
ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(20) DEFAULT 'LINEAR';
ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS max_days_without_rotation INTEGER DEFAULT 90;
ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS alert_days_before_expiry INTEGER DEFAULT 30;
ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS require_approval_for_adjustments BOOLEAN DEFAULT true;
ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS min_approval_amount DECIMAL(15,2) DEFAULT 1000;

-- Extensiones de productos para catch weight y serialización
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS is_catch_weight BOOLEAN DEFAULT false;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS catch_weight_type VARCHAR(20);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS nominal_weight DECIMAL(15,4);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS min_weight DECIMAL(15,4);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS max_weight DECIMAL(15,4);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS weight_tolerance_pct DECIMAL(5,2) DEFAULT 5;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS is_serialized BOOLEAN DEFAULT false;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS serial_mask VARCHAR(100);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS require_serial_on_receipt BOOLEAN DEFAULT false;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS require_serial_on_ship BOOLEAN DEFAULT false;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS volume_m3 DECIMAL(10,6);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. CONDICIONES DE CONSERVACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_conservation_conditions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    zone_id INTEGER REFERENCES wms_warehouse_zones(id),
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),
    min_humidity DECIMAL(5,2),
    max_humidity DECIMAL(5,2),
    requires_refrigeration BOOLEAN DEFAULT false,
    requires_freezing BOOLEAN DEFAULT false,
    light_sensitive BOOLEAN DEFAULT false,
    max_lux_exposure INTEGER,
    monitoring_interval_minutes INTEGER DEFAULT 60,
    alert_on_deviation BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. TRAZABILIDAD COMPLETA
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_traceability_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    trace_code VARCHAR(50) NOT NULL UNIQUE,
    movement_type VARCHAR(30) NOT NULL,
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    serial_number VARCHAR(100),
    quantity DECIMAL(15,4) NOT NULL,
    unit_id INTEGER REFERENCES wms_units_of_measure(id),
    from_warehouse_id INTEGER REFERENCES wms_warehouses(id),
    from_zone_id INTEGER REFERENCES wms_warehouse_zones(id),
    from_location_id INTEGER REFERENCES wms_locations(id),
    to_warehouse_id INTEGER REFERENCES wms_warehouses(id),
    to_zone_id INTEGER REFERENCES wms_warehouse_zones(id),
    to_location_id INTEGER REFERENCES wms_locations(id),
    source_document_type VARCHAR(50),
    source_document_id INTEGER,
    source_document_number VARCHAR(50),
    unit_cost_at_movement DECIMAL(15,4),
    total_cost_at_movement DECIMAL(15,2),
    temperature_at_movement DECIMAL(5,2),
    humidity_at_movement DECIMAL(5,2),
    performed_by INTEGER REFERENCES users(user_id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    device_info JSONB,
    requires_approval BOOLEAN DEFAULT false,
    approved_by INTEGER REFERENCES users(user_id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_trace_product ON wms_traceability_log(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_trace_batch ON wms_traceability_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_wms_trace_date ON wms_traceability_log(performed_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. RAZONES DE AJUSTE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_adjustment_reasons (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    adjustment_type VARCHAR(20) NOT NULL,
    requires_approval BOOLEAN DEFAULT true,
    requires_evidence BOOLEAN DEFAULT false,
    affects_cost BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- Datos iniciales
INSERT INTO wms_adjustment_reasons (company_id, code, name, adjustment_type, requires_approval)
VALUES
    (11, 'DAMAGED', 'Producto Dañado', 'DECREASE', true),
    (11, 'EXPIRED', 'Producto Vencido', 'DECREASE', true),
    (11, 'THEFT', 'Robo/Hurto', 'DECREASE', true),
    (11, 'COUNT_ERROR', 'Error de Conteo', 'BOTH', true),
    (11, 'FOUND', 'Producto Encontrado', 'INCREASE', false),
    (11, 'SAMPLING', 'Muestra/Degustación', 'DECREASE', false),
    (11, 'INTERNAL_USE', 'Uso Interno', 'DECREASE', true),
    (11, 'WRITE_OFF', 'Baja Definitiva', 'DECREASE', true)
ON CONFLICT (company_id, code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. INVENTARIOS PROGRAMADOS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_inventory_schedules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    schedule_code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    inventory_type VARCHAR(30) NOT NULL,
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    zone_ids INTEGER[],
    category_ids INTEGER[],
    product_ids INTEGER[],
    abc_classification CHAR(1),
    frequency VARCHAR(20) NOT NULL,
    day_of_week INTEGER,
    day_of_month INTEGER,
    start_time TIME,
    estimated_duration_hours DECIMAL(5,2),
    requires_blind_count BOOLEAN DEFAULT false,
    requires_double_count BOOLEAN DEFAULT false,
    tolerance_percentage DECIMAL(5,2) DEFAULT 2.0,
    auto_adjust_within_tolerance BOOLEAN DEFAULT false,
    require_approval_for_adjustments BOOLEAN DEFAULT true,
    notify_days_before INTEGER DEFAULT 3,
    notify_users INTEGER[],
    is_active BOOLEAN DEFAULT true,
    last_execution_date TIMESTAMPTZ,
    next_execution_date TIMESTAMPTZ,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wms_inventory_executions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    schedule_id INTEGER REFERENCES wms_inventory_schedules(id),
    execution_code VARCHAR(30) NOT NULL UNIQUE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PENDING',
    assigned_counters INTEGER[],
    supervisor_id INTEGER REFERENCES users(user_id),
    total_locations INTEGER DEFAULT 0,
    counted_locations INTEGER DEFAULT 0,
    total_products INTEGER DEFAULT 0,
    counted_products INTEGER DEFAULT 0,
    products_with_difference INTEGER DEFAULT 0,
    total_theoretical_value DECIMAL(15,2) DEFAULT 0,
    total_counted_value DECIMAL(15,2) DEFAULT 0,
    total_difference_value DECIMAL(15,2) DEFAULT 0,
    difference_percentage DECIMAL(5,2),
    requires_approval BOOLEAN DEFAULT true,
    approved_by INTEGER REFERENCES users(user_id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wms_inventory_counts (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER NOT NULL REFERENCES wms_inventory_executions(id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    zone_id INTEGER REFERENCES wms_warehouse_zones(id),
    location_id INTEGER REFERENCES wms_locations(id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    theoretical_quantity DECIMAL(15,4) NOT NULL,
    counted_quantity DECIMAL(15,4),
    second_count_quantity DECIMAL(15,4),
    final_quantity DECIMAL(15,4),
    difference_quantity DECIMAL(15,4),
    unit_cost DECIMAL(15,4),
    theoretical_value DECIMAL(15,2),
    counted_value DECIMAL(15,2),
    difference_value DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'PENDING',
    first_counter_id INTEGER REFERENCES users(user_id),
    first_count_at TIMESTAMPTZ,
    second_counter_id INTEGER REFERENCES users(user_id),
    second_count_at TIMESTAMPTZ,
    adjustment_reason_id INTEGER REFERENCES wms_adjustment_reasons(id),
    adjustment_notes TEXT,
    adjusted_by INTEGER REFERENCES users(user_id),
    adjusted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. SISTEMA DE APROBACIONES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_approval_workflows (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    workflow_code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    document_type VARCHAR(50) NOT NULL,
    min_amount DECIMAL(15,2),
    max_amount DECIMAL(15,2),
    approval_levels JSONB NOT NULL,
    require_all_levels BOOLEAN DEFAULT false,
    allow_self_approval BOOLEAN DEFAULT false,
    auto_approve_timeout_hours INTEGER,
    escalate_after_hours INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, workflow_code)
);

CREATE TABLE IF NOT EXISTS wms_approval_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    workflow_id INTEGER NOT NULL REFERENCES wms_approval_workflows(id),
    document_type VARCHAR(50) NOT NULL,
    document_id INTEGER NOT NULL,
    document_number VARCHAR(50),
    amount DECIMAL(15,2),
    quantity DECIMAL(15,4),
    description TEXT,
    justification TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    current_level INTEGER DEFAULT 1,
    requested_by INTEGER NOT NULL REFERENCES users(user_id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_by INTEGER REFERENCES users(user_id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. MÉTRICAS DE ROTACIÓN Y ANOMALÍAS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_rotation_metrics (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    opening_stock DECIMAL(15,4) DEFAULT 0,
    closing_stock DECIMAL(15,4) DEFAULT 0,
    average_stock DECIMAL(15,4) DEFAULT 0,
    total_receipts DECIMAL(15,4) DEFAULT 0,
    total_shipments DECIMAL(15,4) DEFAULT 0,
    opening_value DECIMAL(15,2) DEFAULT 0,
    closing_value DECIMAL(15,2) DEFAULT 0,
    average_value DECIMAL(15,2) DEFAULT 0,
    cost_of_goods_sold DECIMAL(15,2) DEFAULT 0,
    inventory_turnover_ratio DECIMAL(10,4),
    days_inventory_outstanding DECIMAL(10,2),
    days_without_movement INTEGER DEFAULT 0,
    storage_cost DECIMAL(15,2) DEFAULT 0,
    capital_cost DECIMAL(15,2) DEFAULT 0,
    depreciation_cost DECIMAL(15,2) DEFAULT 0,
    total_holding_cost DECIMAL(15,2) DEFAULT 0,
    is_slow_moving BOOLEAN DEFAULT false,
    is_dead_stock BOOLEAN DEFAULT false,
    is_overstock BOOLEAN DEFAULT false,
    anomaly_score DECIMAL(5,2) DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id, period_start, period_end, period_type)
);

CREATE TABLE IF NOT EXISTS wms_abc_classification (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    abc_class CHAR(1),
    value_percentage DECIMAL(5,2),
    cumulative_value_percentage DECIMAL(5,2),
    xyz_class CHAR(1),
    demand_coefficient_variation DECIMAL(10,4),
    combined_class VARCHAR(2),
    recommended_reorder_policy VARCHAR(30),
    recommended_safety_stock DECIMAL(15,4),
    recommended_reorder_point DECIMAL(15,4),
    recommended_reorder_quantity DECIMAL(15,4),
    analysis_date DATE NOT NULL,
    analysis_period_months INTEGER DEFAULT 12,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id, analysis_date)
);

CREATE TABLE IF NOT EXISTS wms_anomaly_alerts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    anomaly_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM',
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    metric_name VARCHAR(100),
    metric_value DECIMAL(15,4),
    threshold_value DECIMAL(15,4),
    deviation_percentage DECIMAL(10,2),
    stock_quantity DECIMAL(15,4),
    stock_value DECIMAL(15,2),
    potential_loss DECIMAL(15,2),
    holding_cost_monthly DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'OPEN',
    recommended_action VARCHAR(50),
    recommended_action_details JSONB,
    assigned_to INTEGER REFERENCES users(user_id),
    acknowledged_by INTEGER REFERENCES users(user_id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES users(user_id),
    resolved_at TIMESTAMPTZ,
    resolution_action VARCHAR(100),
    resolution_notes TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. PLAN DE REPOSICIÓN INTELIGENTE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_replenishment_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    replenishment_method VARCHAR(30) DEFAULT 'MIN_MAX',
    min_stock DECIMAL(15,4),
    max_stock DECIMAL(15,4),
    reorder_point DECIMAL(15,4),
    reorder_quantity DECIMAL(15,4),
    ordering_cost DECIMAL(15,2),
    holding_cost_rate DECIMAL(5,4),
    safety_stock_method VARCHAR(30) DEFAULT 'STATISTICAL',
    safety_stock_fixed DECIMAL(15,4),
    service_level_target DECIMAL(5,2) DEFAULT 95.00,
    lead_time_days INTEGER DEFAULT 7,
    lead_time_variability_days INTEGER DEFAULT 2,
    demand_variability_percentage DECIMAL(5,2),
    min_order_quantity DECIMAL(15,4),
    max_order_quantity DECIMAL(15,4),
    order_multiple DECIMAL(15,4),
    preferred_supplier_id INTEGER REFERENCES wms_suppliers(id),
    max_storage_capacity DECIMAL(15,4),
    is_active BOOLEAN DEFAULT true,
    auto_generate_orders BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true,
    last_review_date DATE,
    next_review_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS wms_demand_forecasts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    forecast_date DATE NOT NULL,
    forecast_period VARCHAR(20) NOT NULL,
    forecast_method VARCHAR(50),
    forecasted_quantity DECIMAL(15,4) NOT NULL,
    confidence_level DECIMAL(5,2),
    lower_bound DECIMAL(15,4),
    upper_bound DECIMAL(15,4),
    actual_quantity DECIMAL(15,4),
    forecast_error DECIMAL(15,4),
    mape DECIMAL(10,4),
    seasonality_factor DECIMAL(10,4),
    trend_factor DECIMAL(10,4),
    external_factors JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id, forecast_date, forecast_period)
);

CREATE TABLE IF NOT EXISTS wms_replenishment_suggestions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    suggestion_type VARCHAR(30) NOT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    current_stock DECIMAL(15,4),
    suggested_quantity DECIMAL(15,4),
    optimal_quantity DECIMAL(15,4),
    suggested_supplier_id INTEGER REFERENCES wms_suppliers(id),
    days_of_stock_current INTEGER,
    days_of_stock_after INTEGER,
    expected_demand_next_30_days DECIMAL(15,4),
    stockout_probability DECIMAL(5,2),
    estimated_order_cost DECIMAL(15,2),
    current_holding_cost_monthly DECIMAL(15,2),
    projected_holding_cost_monthly DECIMAL(15,2),
    potential_stockout_cost DECIMAL(15,2),
    net_benefit DECIMAL(15,2),
    space_utilization_current DECIMAL(5,2),
    space_utilization_after DECIMAL(5,2),
    capital_efficiency_improvement DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'PENDING',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    reviewed_by INTEGER REFERENCES users(user_id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. KPIs Y ESTADÍSTICAS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_kpi_snapshots (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    snapshot_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    total_sku_count INTEGER DEFAULT 0,
    active_sku_count INTEGER DEFAULT 0,
    total_stock_value DECIMAL(15,2) DEFAULT 0,
    avg_inventory_turnover DECIMAL(10,4),
    avg_days_inventory DECIMAL(10,2),
    slow_moving_sku_count INTEGER DEFAULT 0,
    dead_stock_sku_count INTEGER DEFAULT 0,
    dead_stock_value DECIMAL(15,2) DEFAULT 0,
    total_storage_capacity_m3 DECIMAL(15,2),
    used_storage_m3 DECIMAL(15,2),
    space_utilization_percentage DECIMAL(5,2),
    inventory_accuracy_percentage DECIMAL(5,2),
    total_storage_cost DECIMAL(15,2) DEFAULT 0,
    total_capital_cost DECIMAL(15,2) DEFAULT 0,
    total_depreciation DECIMAL(15,2) DEFAULT 0,
    total_holding_cost DECIMAL(15,2) DEFAULT 0,
    fill_rate_percentage DECIMAL(5,2),
    stockout_count INTEGER DEFAULT 0,
    near_expiry_sku_count INTEGER DEFAULT 0,
    near_expiry_value DECIMAL(15,2) DEFAULT 0,
    expired_sku_count INTEGER DEFAULT 0,
    expired_value DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, warehouse_id, snapshot_date, period_type)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. SERIAL NUMBERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_serial_numbers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    serial_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    location_id INTEGER REFERENCES wms_locations(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    manufacturing_date DATE,
    warranty_expiry_date DATE,
    customer_id INTEGER,
    sold_at TIMESTAMPTZ,
    sales_document_number VARCHAR(50),
    received_at TIMESTAMPTZ,
    receipt_document_number VARCHAR(50),
    supplier_id INTEGER REFERENCES wms_suppliers(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, product_id, serial_number)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. QUALITY CONTROL
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_qc_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    template_code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    inspection_point VARCHAR(30) NOT NULL,
    sampling_type VARCHAR(20) DEFAULT 'PERCENTAGE',
    sampling_percentage DECIMAL(5,2),
    checkpoints JSONB NOT NULL,
    on_pass_action VARCHAR(30) DEFAULT 'CONTINUE',
    on_fail_action VARCHAR(30) DEFAULT 'HOLD',
    requires_photo BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, template_code)
);

CREATE TABLE IF NOT EXISTS wms_qc_inspections (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    template_id INTEGER REFERENCES wms_qc_templates(id),
    inspection_number VARCHAR(30) NOT NULL UNIQUE,
    inspection_point VARCHAR(30) NOT NULL,
    document_type VARCHAR(30),
    document_id INTEGER,
    document_number VARCHAR(50),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    total_quantity DECIMAL(15,4) NOT NULL,
    sample_quantity DECIMAL(15,4),
    passed_quantity DECIMAL(15,4),
    failed_quantity DECIMAL(15,4),
    status VARCHAR(20) DEFAULT 'PENDING',
    overall_result VARCHAR(20),
    checkpoint_results JSONB,
    photos JSONB DEFAULT '[]',
    inspected_by INTEGER REFERENCES users(user_id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    disposition VARCHAR(30),
    disposition_notes TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. RETURNS MANAGEMENT (RMA)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_return_reasons (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    return_type VARCHAR(20) NOT NULL,
    requires_inspection BOOLEAN DEFAULT true,
    default_disposition VARCHAR(30),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS wms_returns (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    return_number VARCHAR(30) NOT NULL UNIQUE,
    return_type VARCHAR(20) NOT NULL,
    customer_id INTEGER,
    supplier_id INTEGER REFERENCES wms_suppliers(id),
    original_document_number VARCHAR(50),
    reason_id INTEGER REFERENCES wms_return_reasons(id),
    reason_notes TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    received_at TIMESTAMPTZ,
    received_by INTEGER REFERENCES users(user_id),
    expected_lines INTEGER DEFAULT 0,
    received_lines INTEGER DEFAULT 0,
    total_expected_quantity DECIMAL(15,4) DEFAULT 0,
    total_received_quantity DECIMAL(15,4) DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    credit_issued DECIMAL(15,2) DEFAULT 0,
    carrier_name VARCHAR(100),
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. LABOR MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_labor_standards (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    standard_code VARCHAR(30) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    base_time_seconds INTEGER NOT NULL,
    time_per_unit_seconds DECIMAL(10,4),
    time_per_line_seconds DECIMAL(10,4),
    travel_time_per_meter_seconds DECIMAL(10,4) DEFAULT 1.5,
    target_units_per_hour DECIMAL(10,2),
    minimum_units_per_hour DECIMAL(10,2),
    excellent_units_per_hour DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, warehouse_id, standard_code, task_type)
);

CREATE TABLE IF NOT EXISTS wms_labor_tasks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    shift_date DATE NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    task_id INTEGER,
    standard_id INTEGER REFERENCES wms_labor_standards(id),
    from_location_id INTEGER REFERENCES wms_locations(id),
    to_location_id INTEGER REFERENCES wms_locations(id),
    distance_meters DECIMAL(10,2),
    lines_processed INTEGER DEFAULT 0,
    units_processed DECIMAL(15,4) DEFAULT 0,
    weight_processed DECIMAL(15,4) DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    idle_time_seconds INTEGER DEFAULT 0,
    expected_duration_seconds INTEGER,
    performance_percentage DECIMAL(5,2),
    interruptions JSONB DEFAULT '[]',
    device_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wms_labor_summary (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    summary_date DATE NOT NULL,
    shift_start TIMESTAMPTZ,
    shift_end TIMESTAMPTZ,
    total_shift_minutes INTEGER,
    productive_minutes INTEGER,
    idle_minutes INTEGER,
    total_tasks INTEGER DEFAULT 0,
    tasks_by_type JSONB,
    total_lines INTEGER DEFAULT 0,
    total_units DECIMAL(15,4) DEFAULT 0,
    avg_performance_percentage DECIMAL(5,2),
    units_per_hour DECIMAL(10,2),
    lines_per_hour DECIMAL(10,2),
    vs_standard_percentage DECIMAL(5,2),
    daily_rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, warehouse_id, user_id, summary_date)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 14. DOCK SCHEDULING
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_docks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    dock_number VARCHAR(20) NOT NULL,
    dock_type VARCHAR(20) NOT NULL,
    height_cm INTEGER,
    width_cm INTEGER,
    has_leveler BOOLEAN DEFAULT true,
    is_refrigerated BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, warehouse_id, dock_number)
);

CREATE TABLE IF NOT EXISTS wms_dock_appointments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    appointment_number VARCHAR(30) NOT NULL UNIQUE,
    appointment_type VARCHAR(20) NOT NULL,
    dock_id INTEGER REFERENCES wms_docks(id),
    scheduled_arrival TIMESTAMPTZ NOT NULL,
    scheduled_departure TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 60,
    carrier_name VARCHAR(200),
    driver_name VARCHAR(200),
    driver_phone VARCHAR(50),
    vehicle_plate VARCHAR(20),
    expected_pallets INTEGER,
    expected_weight DECIMAL(15,4),
    status VARCHAR(20) DEFAULT 'SCHEDULED',
    check_in_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    actual_pallets INTEGER,
    actual_weight DECIMAL(15,4),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 15. WAVE PLANNING
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_wave_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    template_code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    group_by_carrier BOOLEAN DEFAULT false,
    group_by_route BOOLEAN DEFAULT false,
    group_by_customer BOOLEAN DEFAULT false,
    group_by_ship_date BOOLEAN DEFAULT true,
    group_by_zone BOOLEAN DEFAULT true,
    max_orders_per_wave INTEGER DEFAULT 100,
    max_lines_per_wave INTEGER DEFAULT 500,
    auto_release BOOLEAN DEFAULT false,
    auto_release_time TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, warehouse_id, template_code)
);

CREATE TABLE IF NOT EXISTS wms_waves (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    template_id INTEGER REFERENCES wms_wave_templates(id),
    wave_number VARCHAR(30) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'PLANNED',
    order_count INTEGER DEFAULT 0,
    line_count INTEGER DEFAULT 0,
    total_units DECIMAL(15,4) DEFAULT 0,
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    lines_picked INTEGER DEFAULT 0,
    units_picked DECIMAL(15,4) DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    assigned_pickers INTEGER[],
    released_by INTEGER REFERENCES users(user_id),
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 16. CROSS-DOCKING
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_crossdock_rules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    rule_code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    crossdock_type VARCHAR(30) NOT NULL,
    product_ids INTEGER[],
    category_ids INTEGER[],
    priority INTEGER DEFAULT 50,
    max_staging_hours INTEGER DEFAULT 24,
    require_matching_order BOOLEAN DEFAULT true,
    allow_partial BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, rule_code)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 17. ÍNDICES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_wms_trace_product ON wms_traceability_log(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_trace_date ON wms_traceability_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_wms_rotation_product ON wms_rotation_metrics(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_anomaly_status ON wms_anomaly_alerts(status) WHERE status IN ('OPEN', 'ACKNOWLEDGED');
CREATE INDEX IF NOT EXISTS idx_wms_repl_status ON wms_replenishment_suggestions(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_wms_labor_user ON wms_labor_tasks(user_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_wms_wave_status ON wms_waves(status) WHERE status IN ('PLANNED', 'RELEASED', 'IN_PROGRESS');
CREATE INDEX IF NOT EXISTS idx_wms_dock_appt ON wms_dock_appointments(scheduled_arrival);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONFIRMACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'WMS ADVANCED & ENTERPRISE FEATURES - Migración completada';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Funcionalidades implementadas:';
    RAISE NOTICE '  ✅ Trazabilidad completa con audit trail';
    RAISE NOTICE '  ✅ FIFO/LIFO/FEFO configurable por almacén';
    RAISE NOTICE '  ✅ Inventarios programados con aprobaciones';
    RAISE NOTICE '  ✅ Detección de anomalías (stock parado, depreciación)';
    RAISE NOTICE '  ✅ Plan de reposición inteligente con forecast';
    RAISE NOTICE '  ✅ Clasificación ABC/XYZ automática';
    RAISE NOTICE '  ✅ KPIs y estadísticas consolidadas';
    RAISE NOTICE '  ✅ Serial number tracking';
    RAISE NOTICE '  ✅ Quality control con inspecciones';
    RAISE NOTICE '  ✅ Returns management (RMA)';
    RAISE NOTICE '  ✅ Labor management y productividad';
    RAISE NOTICE '  ✅ Dock scheduling';
    RAISE NOTICE '  ✅ Wave planning';
    RAISE NOTICE '  ✅ Cross-docking';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;
