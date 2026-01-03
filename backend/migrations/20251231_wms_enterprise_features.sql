-- ═══════════════════════════════════════════════════════════════════════════════
-- WMS ENTERPRISE FEATURES - Funcionalidades de Clase Mundial
-- Fecha: 2025-12-31
-- Versión: 3.0 - World-Class WMS
--
-- CARACTERÍSTICAS ENTERPRISE:
-- ✅ Cross-Docking - Recepción directa a despacho
-- ✅ Wave Planning - Planificación de oleadas de picking
-- ✅ Slotting Optimization - Optimización de ubicaciones
-- ✅ Task Interleaving - Intercalado de tareas
-- ✅ Labor Management - Productividad del personal
-- ✅ Dock Scheduling - Programación de muelles
-- ✅ Yard Management - Gestión del patio
-- ✅ Catch Weight - Productos con peso variable
-- ✅ Serial Number Tracking - Seguimiento por número de serie
-- ✅ Quality Control - Control de calidad
-- ✅ Returns Management (RMA) - Gestión de devoluciones
-- ✅ Kit/Assembly - Armado de kits
-- ✅ Cubing & Cartonization - Optimización de embalaje
-- ✅ Automation Ready - Preparado para AGV, AS/RS, Pick-to-Light
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. CROSS-DOCKING
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_crossdock_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    rule_code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Criterios de activación
    product_ids UUID[], -- Productos específicos
    category_ids UUID[], -- Categorías
    supplier_ids UUID[], -- Proveedores
    customer_ids UUID[], -- Clientes destino

    -- Configuración
    crossdock_type VARCHAR(30) NOT NULL, -- FLOW_THROUGH, MERGE, OPPORTUNISTIC
    priority INTEGER DEFAULT 50,
    max_staging_hours INTEGER DEFAULT 24, -- Máximo tiempo en staging

    -- Condiciones
    min_quantity DECIMAL(15,4),
    require_matching_order BOOLEAN DEFAULT true, -- Requiere orden de venta existente
    allow_partial BOOLEAN DEFAULT true,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, rule_code)
);

-- Operaciones de cross-dock activas
CREATE TABLE IF NOT EXISTS wms_crossdock_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    operation_code VARCHAR(30) NOT NULL UNIQUE,
    rule_id UUID REFERENCES wms_crossdock_rules(id),

    -- Recepción
    receipt_document_id UUID,
    receipt_document_number VARCHAR(50),
    supplier_id UUID,
    received_at TIMESTAMPTZ,

    -- Despacho
    shipment_document_id UUID,
    shipment_document_number VARCHAR(50),
    customer_id UUID,
    ship_by TIMESTAMPTZ,

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, STAGING, PROCESSING, SHIPPED, CANCELLED
    staging_location_id UUID REFERENCES wms_locations(id),

    -- Tiempos
    staged_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. WAVE PLANNING - Planificación de Oleadas de Picking
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_wave_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID REFERENCES wms_warehouses(id),

    template_code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Criterios de agrupación
    group_by_carrier BOOLEAN DEFAULT false,
    group_by_route BOOLEAN DEFAULT false,
    group_by_customer BOOLEAN DEFAULT false,
    group_by_ship_date BOOLEAN DEFAULT true,
    group_by_zone BOOLEAN DEFAULT true,

    -- Límites
    max_orders_per_wave INTEGER DEFAULT 100,
    max_lines_per_wave INTEGER DEFAULT 500,
    max_units_per_wave DECIMAL(15,4),
    max_weight_per_wave DECIMAL(15,4),
    max_volume_per_wave DECIMAL(15,4),

    -- Priorización
    priority_rules JSONB, -- [{field: 'ship_date', order: 'ASC'}, {field: 'priority', order: 'DESC'}]

    -- Automatización
    auto_release BOOLEAN DEFAULT false,
    auto_release_time TIME,
    release_lead_time_hours INTEGER DEFAULT 4,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, warehouse_id, template_code)
);

CREATE TABLE IF NOT EXISTS wms_waves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),
    template_id UUID REFERENCES wms_wave_templates(id),

    wave_number VARCHAR(30) NOT NULL UNIQUE,

    -- Estado
    status VARCHAR(20) DEFAULT 'PLANNED', -- PLANNED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED

    -- Contenido
    order_count INTEGER DEFAULT 0,
    line_count INTEGER DEFAULT 0,
    total_units DECIMAL(15,4) DEFAULT 0,
    total_weight DECIMAL(15,4) DEFAULT 0,
    total_volume DECIMAL(15,4) DEFAULT 0,

    -- Tiempos
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,

    -- Progreso
    lines_picked INTEGER DEFAULT 0,
    units_picked DECIMAL(15,4) DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,

    -- Recursos asignados
    assigned_pickers INTEGER[],
    pick_zones UUID[],

    released_by INTEGER REFERENCES users(user_id),
    released_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. SLOTTING OPTIMIZATION - Optimización de Ubicaciones
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_slotting_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),

    profile_code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,

    -- Criterios de optimización (peso de cada factor)
    velocity_weight DECIMAL(5,2) DEFAULT 40, -- Rotación
    ergonomics_weight DECIMAL(5,2) DEFAULT 25, -- Ergonomía (altura, acceso)
    affinity_weight DECIMAL(5,2) DEFAULT 20, -- Productos que se piden juntos
    size_weight DECIMAL(5,2) DEFAULT 15, -- Tamaño del producto

    -- Configuración
    golden_zone_levels VARCHAR[], -- Niveles ergonómicos preferidos (ej: 'B', 'C')
    max_pick_height_cm INTEGER DEFAULT 150,
    min_pick_height_cm INTEGER DEFAULT 30,
    reserve_forward_ratio DECIMAL(3,2) DEFAULT 0.3, -- 30% forward picking

    -- Restricciones
    respect_product_groups BOOLEAN DEFAULT true, -- Mantener familias juntas
    respect_hazmat_rules BOOLEAN DEFAULT true,
    respect_temperature_zones BOOLEAN DEFAULT true,

    -- Automatización
    auto_reslot_frequency_days INTEGER DEFAULT 30,
    min_velocity_change_to_reslot DECIMAL(5,2) DEFAULT 20, -- % cambio en velocidad

    is_active BOOLEAN DEFAULT true,
    last_optimization_at TIMESTAMPTZ,
    next_optimization_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, warehouse_id, profile_code)
);

-- Recomendaciones de slotting
CREATE TABLE IF NOT EXISTS wms_slotting_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    profile_id UUID NOT NULL REFERENCES wms_slotting_profiles(id),

    product_id UUID NOT NULL REFERENCES wms_products(id),

    -- Ubicación actual
    current_location_id UUID REFERENCES wms_locations(id),
    current_zone_id UUID REFERENCES wms_zones(id),

    -- Ubicación recomendada
    recommended_location_id UUID REFERENCES wms_locations(id),
    recommended_zone_id UUID REFERENCES wms_zones(id),

    -- Scores
    velocity_score DECIMAL(5,2),
    ergonomics_score DECIMAL(5,2),
    affinity_score DECIMAL(5,2),
    size_score DECIMAL(5,2),
    total_score DECIMAL(5,2),

    -- Beneficio esperado
    expected_pick_time_reduction_percentage DECIMAL(5,2),
    expected_travel_reduction_percentage DECIMAL(5,2),

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, EXECUTED, REJECTED

    recommendation_reason TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    executed_by INTEGER REFERENCES users(user_id),
    executed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. LABOR MANAGEMENT - Gestión de Productividad
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_labor_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),

    standard_code VARCHAR(30) NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- RECEIVING, PUTAWAY, PICKING, PACKING, SHIPPING, REPLENISHMENT, COUNTING

    -- Estándares de tiempo (en segundos)
    base_time_seconds INTEGER NOT NULL, -- Tiempo base por tarea
    time_per_unit_seconds DECIMAL(10,4), -- Tiempo adicional por unidad
    time_per_line_seconds DECIMAL(10,4), -- Tiempo adicional por línea
    travel_time_per_meter_seconds DECIMAL(10,4) DEFAULT 1.5,

    -- Factores de ajuste
    weight_factor DECIMAL(5,4) DEFAULT 1, -- Factor por peso
    volume_factor DECIMAL(5,4) DEFAULT 1, -- Factor por volumen
    fragile_factor DECIMAL(5,4) DEFAULT 1.2, -- Factor para productos frágiles

    -- Niveles de performance
    target_units_per_hour DECIMAL(10,2),
    minimum_units_per_hour DECIMAL(10,2),
    excellent_units_per_hour DECIMAL(10,2),

    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, warehouse_id, standard_code, task_type)
);

-- Registro de tareas del personal
CREATE TABLE IF NOT EXISTS wms_labor_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),

    -- Usuario
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    shift_date DATE NOT NULL,

    -- Tarea
    task_type VARCHAR(50) NOT NULL,
    task_id UUID, -- ID del documento/orden relacionado
    standard_id UUID REFERENCES wms_labor_standards(id),

    -- Ubicaciones
    from_location_id UUID REFERENCES wms_locations(id),
    to_location_id UUID REFERENCES wms_locations(id),
    distance_meters DECIMAL(10,2),

    -- Métricas
    lines_processed INTEGER DEFAULT 0,
    units_processed DECIMAL(15,4) DEFAULT 0,
    weight_processed DECIMAL(15,4) DEFAULT 0,

    -- Tiempos
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    idle_time_seconds INTEGER DEFAULT 0,

    -- Performance
    expected_duration_seconds INTEGER,
    performance_percentage DECIMAL(5,2), -- actual vs expected

    -- Interrupciones
    interruptions JSONB DEFAULT '[]', -- [{reason, start, end, duration}]

    device_id VARCHAR(100),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resumen de productividad por usuario/día
CREATE TABLE IF NOT EXISTS wms_labor_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),

    user_id INTEGER NOT NULL REFERENCES users(user_id),
    summary_date DATE NOT NULL,

    -- Tiempo
    shift_start TIMESTAMPTZ,
    shift_end TIMESTAMPTZ,
    total_shift_minutes INTEGER,
    productive_minutes INTEGER,
    idle_minutes INTEGER,
    break_minutes INTEGER,

    -- Tareas
    total_tasks INTEGER DEFAULT 0,
    tasks_by_type JSONB, -- {PICKING: 45, PUTAWAY: 12, ...}

    -- Volumen
    total_lines INTEGER DEFAULT 0,
    total_units DECIMAL(15,4) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,

    -- Performance
    avg_performance_percentage DECIMAL(5,2),
    units_per_hour DECIMAL(10,2),
    lines_per_hour DECIMAL(10,2),

    -- Comparación con estándares
    vs_standard_percentage DECIMAL(5,2),
    vs_team_avg_percentage DECIMAL(5,2),

    -- Rankings
    daily_rank INTEGER,
    weekly_rank INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, warehouse_id, user_id, summary_date)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. DOCK & YARD MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_docks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),

    dock_number VARCHAR(20) NOT NULL,
    dock_type VARCHAR(20) NOT NULL, -- RECEIVING, SHIPPING, BOTH

    -- Características físicas
    height_cm INTEGER,
    width_cm INTEGER,
    has_leveler BOOLEAN DEFAULT true,
    has_shelter BOOLEAN DEFAULT true,
    is_refrigerated BOOLEAN DEFAULT false,

    -- Capacidad
    max_trailer_length_m DECIMAL(5,2),
    supports_container BOOLEAN DEFAULT false,

    -- Estado
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, OCCUPIED, MAINTENANCE, BLOCKED
    current_appointment_id UUID,

    equipment_ids UUID[], -- Montacargas asignados

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, warehouse_id, dock_number)
);

-- Citas de dock
CREATE TABLE IF NOT EXISTS wms_dock_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),

    appointment_number VARCHAR(30) NOT NULL UNIQUE,
    appointment_type VARCHAR(20) NOT NULL, -- INBOUND, OUTBOUND

    -- Dock y timing
    dock_id UUID REFERENCES wms_docks(id),
    scheduled_arrival TIMESTAMPTZ NOT NULL,
    scheduled_departure TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 60,

    -- Transportista
    carrier_id UUID,
    carrier_name VARCHAR(200),
    driver_name VARCHAR(200),
    driver_phone VARCHAR(50),
    vehicle_plate VARCHAR(20),
    trailer_number VARCHAR(50),

    -- Documentos
    document_type VARCHAR(30), -- PO, SO, TRANSFER
    document_ids UUID[],
    document_numbers VARCHAR[],

    -- Carga
    expected_pallets INTEGER,
    expected_weight DECIMAL(15,4),
    is_hazmat BOOLEAN DEFAULT false,
    is_refrigerated BOOLEAN DEFAULT false,

    -- Estado
    status VARCHAR(20) DEFAULT 'SCHEDULED', -- SCHEDULED, CHECKED_IN, DOCKED, IN_PROGRESS, COMPLETED, NO_SHOW, CANCELLED
    check_in_at TIMESTAMPTZ,
    dock_assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Real vs Plan
    actual_pallets INTEGER,
    actual_weight DECIMAL(15,4),
    variance_reason TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yard locations (patio)
CREATE TABLE IF NOT EXISTS wms_yard_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),

    location_code VARCHAR(30) NOT NULL,
    location_type VARCHAR(20) NOT NULL, -- PARKING, STAGING, CONTAINER, TRAILER_DROP

    -- Coordenadas
    row_number VARCHAR(10),
    spot_number VARCHAR(10),
    gps_latitude DECIMAL(10,7),
    gps_longitude DECIMAL(10,7),

    -- Capacidad
    max_trailer_length_m DECIMAL(5,2),
    is_refrigerated BOOLEAN DEFAULT false,
    has_power BOOLEAN DEFAULT false,

    -- Estado
    status VARCHAR(20) DEFAULT 'EMPTY', -- EMPTY, OCCUPIED, RESERVED
    current_vehicle_plate VARCHAR(20),
    current_trailer_number VARCHAR(50),
    occupied_since TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, warehouse_id, location_code)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. CATCH WEIGHT - Productos con Peso Variable
-- ═══════════════════════════════════════════════════════════════════════════════

-- Configuración de catch weight por producto
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS is_catch_weight BOOLEAN DEFAULT false;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS catch_weight_type VARCHAR(20) CHECK (catch_weight_type IN ('FIXED', 'VARIABLE', 'AVERAGE'));
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS nominal_weight DECIMAL(15,4);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS min_weight DECIMAL(15,4);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS max_weight DECIMAL(15,4);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS tolerance_percentage DECIMAL(5,2) DEFAULT 5;

-- Registro de pesos capturados
CREATE TABLE IF NOT EXISTS wms_catch_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    product_id UUID NOT NULL REFERENCES wms_products(id),
    batch_id UUID REFERENCES wms_batches(id),
    serial_number VARCHAR(100),

    -- Peso capturado
    captured_weight DECIMAL(15,4) NOT NULL,
    weight_unit VARCHAR(10) DEFAULT 'kg',

    -- Contexto
    captured_at_operation VARCHAR(30), -- RECEIVING, SHIPPING, INVENTORY
    document_id UUID,
    document_number VARCHAR(50),

    -- Dispositivo
    scale_id VARCHAR(100),
    captured_by INTEGER REFERENCES users(user_id),
    captured_at TIMESTAMPTZ DEFAULT NOW(),

    -- Validación
    is_within_tolerance BOOLEAN,
    variance_from_nominal DECIMAL(10,4),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. SERIAL NUMBER TRACKING
-- ═══════════════════════════════════════════════════════════════════════════════

-- Configuración de serialización por producto
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS is_serialized BOOLEAN DEFAULT false;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS serial_mask VARCHAR(100); -- Formato esperado
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS require_serial_on_receipt BOOLEAN DEFAULT false;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS require_serial_on_ship BOOLEAN DEFAULT false;

-- Registro de números de serie
CREATE TABLE IF NOT EXISTS wms_serial_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    product_id UUID NOT NULL REFERENCES wms_products(id),
    serial_number VARCHAR(100) NOT NULL,

    -- Estado
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, RESERVED, SOLD, RETURNED, SCRAPPED

    -- Ubicación actual
    warehouse_id UUID REFERENCES wms_warehouses(id),
    location_id UUID REFERENCES wms_locations(id),
    batch_id UUID REFERENCES wms_batches(id),

    -- Información del producto
    manufacturing_date DATE,
    warranty_expiry_date DATE,
    firmware_version VARCHAR(50),

    -- Historial de propiedad
    customer_id UUID,
    sold_at TIMESTAMPTZ,
    sales_document_number VARCHAR(50),

    -- Trazabilidad
    received_at TIMESTAMPTZ,
    receipt_document_number VARCHAR(50),
    supplier_id UUID,

    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, product_id, serial_number)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. QUALITY CONTROL
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_qc_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    template_code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Aplicabilidad
    inspection_point VARCHAR(30) NOT NULL, -- RECEIVING, PUTAWAY, PICKING, SHIPPING, RETURN
    product_categories UUID[],
    supplier_ids UUID[],

    -- Configuración de muestreo
    sampling_type VARCHAR(20) DEFAULT 'PERCENTAGE', -- ALL, PERCENTAGE, AQL, SKIP_LOT
    sampling_percentage DECIMAL(5,2),
    aql_level VARCHAR(10), -- I, II, III, S1, S2, S3, S4
    aql_acceptable_quality_limit DECIMAL(5,2),

    -- Checkpoints
    checkpoints JSONB NOT NULL, -- [{code, name, type: 'BOOLEAN'|'NUMERIC'|'TEXT', required, min, max}]

    -- Acciones
    on_pass_action VARCHAR(30) DEFAULT 'CONTINUE', -- CONTINUE, MOVE_TO_LOCATION
    on_fail_action VARCHAR(30) DEFAULT 'HOLD', -- HOLD, REJECT, RETURN_TO_SUPPLIER
    hold_location_id UUID REFERENCES wms_locations(id),
    reject_location_id UUID REFERENCES wms_locations(id),

    requires_photo BOOLEAN DEFAULT false,
    requires_signature BOOLEAN DEFAULT false,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, template_code)
);

CREATE TABLE IF NOT EXISTS wms_qc_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    template_id UUID NOT NULL REFERENCES wms_qc_templates(id),

    inspection_number VARCHAR(30) NOT NULL UNIQUE,

    -- Contexto
    inspection_point VARCHAR(30) NOT NULL,
    document_type VARCHAR(30),
    document_id UUID,
    document_number VARCHAR(50),

    -- Producto
    product_id UUID NOT NULL REFERENCES wms_products(id),
    batch_id UUID REFERENCES wms_batches(id),
    serial_numbers VARCHAR[],

    -- Cantidades
    total_quantity DECIMAL(15,4) NOT NULL,
    sample_quantity DECIMAL(15,4),
    passed_quantity DECIMAL(15,4),
    failed_quantity DECIMAL(15,4),

    -- Resultado
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, PASSED, FAILED, ON_HOLD
    overall_result VARCHAR(20), -- PASS, FAIL, CONDITIONAL_PASS

    -- Respuestas
    checkpoint_results JSONB, -- {checkpoint_code: {value, passed, notes}}

    -- Evidencia
    photos JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',

    -- Inspector
    inspected_by INTEGER REFERENCES users(user_id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Disposición
    disposition VARCHAR(30),
    disposition_location_id UUID REFERENCES wms_locations(id),
    disposition_by INTEGER REFERENCES users(user_id),
    disposition_at TIMESTAMPTZ,
    disposition_notes TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. RETURNS MANAGEMENT (RMA)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_return_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    return_type VARCHAR(20) NOT NULL, -- CUSTOMER, SUPPLIER
    requires_inspection BOOLEAN DEFAULT true,
    default_disposition VARCHAR(30), -- RESTOCK, REFURBISH, SCRAP, RETURN_TO_VENDOR

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS wms_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),

    return_number VARCHAR(30) NOT NULL UNIQUE,
    return_type VARCHAR(20) NOT NULL, -- CUSTOMER, SUPPLIER

    -- Origen
    customer_id UUID,
    supplier_id UUID,
    original_document_type VARCHAR(30),
    original_document_id UUID,
    original_document_number VARCHAR(50),

    -- Motivo
    reason_id UUID REFERENCES wms_return_reasons(id),
    reason_notes TEXT,

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RECEIVED, INSPECTING, PROCESSED, CLOSED, CANCELLED

    -- Recepción
    received_at TIMESTAMPTZ,
    received_by INTEGER REFERENCES users(user_id),
    staging_location_id UUID REFERENCES wms_locations(id),

    -- Totales
    expected_lines INTEGER DEFAULT 0,
    received_lines INTEGER DEFAULT 0,
    total_expected_quantity DECIMAL(15,4) DEFAULT 0,
    total_received_quantity DECIMAL(15,4) DEFAULT 0,

    -- Valor
    total_value DECIMAL(15,2) DEFAULT 0,
    credit_issued DECIMAL(15,2) DEFAULT 0,

    -- Tracking
    carrier_name VARCHAR(100),
    tracking_number VARCHAR(100),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wms_return_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES wms_returns(id),

    product_id UUID NOT NULL REFERENCES wms_products(id),
    batch_id UUID REFERENCES wms_batches(id),
    serial_numbers VARCHAR[],

    -- Cantidades
    expected_quantity DECIMAL(15,4) NOT NULL,
    received_quantity DECIMAL(15,4) DEFAULT 0,

    -- Inspección
    inspection_id UUID REFERENCES wms_qc_inspections(id),
    condition_code VARCHAR(20), -- NEW, LIKE_NEW, GOOD, FAIR, DAMAGED, DEFECTIVE

    -- Disposición
    disposition VARCHAR(30), -- RESTOCK, REFURBISH, SCRAP, RETURN_TO_VENDOR
    disposition_quantity DECIMAL(15,4),
    disposition_location_id UUID REFERENCES wms_locations(id),
    disposition_by INTEGER REFERENCES users(user_id),
    disposition_at TIMESTAMPTZ,

    -- Valor
    unit_value DECIMAL(15,4),
    total_value DECIMAL(15,2),
    credit_percentage DECIMAL(5,2) DEFAULT 100,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. KIT/ASSEMBLY MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_kit_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    kit_product_id UUID NOT NULL REFERENCES wms_products(id), -- El producto "kit"
    kit_code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Tipo
    kit_type VARCHAR(20) DEFAULT 'STANDARD', -- STANDARD, CONFIGURABLE, PROMOTIONAL

    -- Configuración
    assembly_time_minutes INTEGER DEFAULT 10,
    requires_workstation BOOLEAN DEFAULT false,
    workstation_ids UUID[],

    -- Instrucciones
    assembly_instructions TEXT,
    instruction_document_url VARCHAR(500),

    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, kit_code)
);

CREATE TABLE IF NOT EXISTS wms_kit_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kit_id UUID NOT NULL REFERENCES wms_kit_definitions(id),

    component_product_id UUID NOT NULL REFERENCES wms_products(id),
    quantity DECIMAL(15,4) NOT NULL,

    -- Opcionalidad
    is_required BOOLEAN DEFAULT true,
    is_substitutable BOOLEAN DEFAULT false,
    substitute_product_ids UUID[],

    -- Secuencia de ensamble
    sequence_number INTEGER DEFAULT 0,
    assembly_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Órdenes de ensamble
CREATE TABLE IF NOT EXISTS wms_assembly_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),

    order_number VARCHAR(30) NOT NULL UNIQUE,
    kit_id UUID NOT NULL REFERENCES wms_kit_definitions(id),

    -- Cantidades
    quantity_ordered DECIMAL(15,4) NOT NULL,
    quantity_assembled DECIMAL(15,4) DEFAULT 0,

    -- Estado
    status VARCHAR(20) DEFAULT 'PLANNED', -- PLANNED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED

    -- Programación
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,

    -- Recursos
    workstation_id UUID,
    assigned_to INTEGER REFERENCES users(user_id),

    -- Destino
    output_location_id UUID REFERENCES wms_locations(id),
    output_batch_id UUID REFERENCES wms_batches(id),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. CUBING & CARTONIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_carton_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    carton_code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,

    -- Dimensiones internas
    length_cm DECIMAL(10,2) NOT NULL,
    width_cm DECIMAL(10,2) NOT NULL,
    height_cm DECIMAL(10,2) NOT NULL,
    volume_cm3 DECIMAL(15,2),

    -- Peso
    empty_weight_kg DECIMAL(10,4),
    max_weight_kg DECIMAL(10,4),

    -- Costo
    unit_cost DECIMAL(15,4),

    -- Restricciones
    stackable BOOLEAN DEFAULT true,
    max_stack_height INTEGER DEFAULT 5,
    fragile_content_allowed BOOLEAN DEFAULT true,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, carton_code)
);

-- Recomendaciones de empaque
CREATE TABLE IF NOT EXISTS wms_packing_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Orden
    order_id UUID,
    order_number VARCHAR(50),

    -- Recomendación
    recommended_cartons JSONB NOT NULL, -- [{carton_type_id, quantity, contents: [{product_id, quantity}]}]

    -- Métricas
    total_cartons INTEGER,
    total_volume_used_cm3 DECIMAL(15,2),
    volume_utilization_percentage DECIMAL(5,2),
    total_weight_kg DECIMAL(15,4),
    estimated_shipping_cost DECIMAL(15,2),

    -- Estado
    status VARCHAR(20) DEFAULT 'SUGGESTED', -- SUGGESTED, ACCEPTED, MODIFIED, EXECUTED

    -- Modificaciones
    actual_cartons JSONB, -- Si el usuario modificó la recomendación

    generated_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_by INTEGER REFERENCES users(user_id),
    accepted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. AUTOMATION INTEGRATION (AGV, AS/RS, Pick-to-Light)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_automation_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id),

    device_code VARCHAR(50) NOT NULL,
    device_type VARCHAR(30) NOT NULL, -- AGV, ASRS, PICK_TO_LIGHT, CONVEYOR, SORTER, ROBOT_ARM
    device_name VARCHAR(100),

    -- Conexión
    connection_type VARCHAR(20), -- TCP, REST_API, MQTT, OPC_UA
    connection_endpoint VARCHAR(500),
    connection_port INTEGER,
    authentication_config JSONB,

    -- Estado
    status VARCHAR(20) DEFAULT 'OFFLINE', -- ONLINE, OFFLINE, ERROR, MAINTENANCE
    last_heartbeat TIMESTAMPTZ,
    last_error TEXT,

    -- Capacidades
    capabilities JSONB, -- {can_pick: true, can_putaway: true, max_weight: 50, zones: [...]}

    -- Zona de operación
    operating_zone_ids UUID[],
    home_location_id UUID REFERENCES wms_locations(id),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, warehouse_id, device_code)
);

-- Comandos a dispositivos
CREATE TABLE IF NOT EXISTS wms_automation_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    device_id UUID NOT NULL REFERENCES wms_automation_devices(id),

    command_type VARCHAR(50) NOT NULL, -- MOVE_TO, PICK, PUTAWAY, TRANSFER, STOP, RESUME
    command_payload JSONB NOT NULL,

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SENT, ACKNOWLEDGED, EXECUTING, COMPLETED, FAILED, CANCELLED

    -- Tiempos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Resultado
    result_payload JSONB,
    error_message TEXT,

    -- Tarea relacionada
    task_id UUID REFERENCES wms_labor_tasks(id),

    priority INTEGER DEFAULT 50,
    expires_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. ÍNDICES ENTERPRISE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_wms_wave_status ON wms_waves(status) WHERE status IN ('PLANNED', 'RELEASED', 'IN_PROGRESS');
CREATE INDEX IF NOT EXISTS idx_wms_dock_appt_date ON wms_dock_appointments(scheduled_arrival);
CREATE INDEX IF NOT EXISTS idx_wms_dock_appt_status ON wms_dock_appointments(status) WHERE status IN ('SCHEDULED', 'CHECKED_IN', 'DOCKED');
CREATE INDEX IF NOT EXISTS idx_wms_labor_tasks_user ON wms_labor_tasks(user_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_wms_serial_status ON wms_serial_numbers(status, product_id);
CREATE INDEX IF NOT EXISTS idx_wms_qc_pending ON wms_qc_inspections(status) WHERE status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX IF NOT EXISTS idx_wms_returns_status ON wms_returns(status) WHERE status IN ('PENDING', 'RECEIVED', 'INSPECTING');
CREATE INDEX IF NOT EXISTS idx_wms_assembly_status ON wms_assembly_orders(status) WHERE status IN ('PLANNED', 'RELEASED', 'IN_PROGRESS');
CREATE INDEX IF NOT EXISTS idx_wms_automation_status ON wms_automation_commands(status) WHERE status IN ('PENDING', 'SENT', 'EXECUTING');

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- MENSAJE DE CONFIRMACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'WMS ENTERPRISE FEATURES - Migración completada';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Funcionalidades Enterprise agregadas:';
    RAISE NOTICE '  ✅ Cross-Docking - Recepción directa a despacho';
    RAISE NOTICE '  ✅ Wave Planning - Oleadas de picking optimizadas';
    RAISE NOTICE '  ✅ Slotting Optimization - Ubicaciones inteligentes';
    RAISE NOTICE '  ✅ Labor Management - Productividad del personal';
    RAISE NOTICE '  ✅ Dock Scheduling - Programación de muelles';
    RAISE NOTICE '  ✅ Yard Management - Gestión del patio';
    RAISE NOTICE '  ✅ Catch Weight - Productos peso variable';
    RAISE NOTICE '  ✅ Serial Number Tracking - Trazabilidad por serie';
    RAISE NOTICE '  ✅ Quality Control - Inspecciones y QC';
    RAISE NOTICE '  ✅ Returns Management - Gestión de devoluciones';
    RAISE NOTICE '  ✅ Kit/Assembly - Armado de kits';
    RAISE NOTICE '  ✅ Cubing/Cartonization - Optimización de empaque';
    RAISE NOTICE '  ✅ Automation Ready - Integración AGV/AS-RS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;
