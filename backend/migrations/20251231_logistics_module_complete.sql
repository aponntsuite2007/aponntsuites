-- ============================================================================
-- SIAC LOGISTICS MODULE - Migracion Completa
-- Fecha: 2025-12-31
-- Basado en mejores practicas de SAP EWM, Oracle WMS, Dynamics 365, Odoo 18
-- ============================================================================

-- ============================================================================
-- PARTE 1: WMS - WAREHOUSE MANAGEMENT SYSTEM
-- ============================================================================

-- 1.1 Tipos de Ubicacion (parametrizables)
CREATE TABLE IF NOT EXISTS logistics_location_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL, -- INTERNAL, CUSTOMER, SUPPLIER, TRANSIT, LOSS, PRODUCTION, QC

    -- Comportamiento
    affects_inventory BOOLEAN DEFAULT true,
    allows_negative BOOLEAN DEFAULT false,
    requires_lot BOOLEAN DEFAULT false,
    requires_serial BOOLEAN DEFAULT false,
    requires_expiry BOOLEAN DEFAULT false,

    -- Para zonas de picking
    is_pickable BOOLEAN DEFAULT true,
    is_puttable BOOLEAN DEFAULT true,

    -- Prioridad en rutas de almacen
    zone_sequence INTEGER DEFAULT 0,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_location_type UNIQUE(company_id, code)
);

-- 1.2 Almacenes
CREATE TABLE IF NOT EXISTS logistics_warehouses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'PROPIO', -- PROPIO, TERCERO, CONSIGNACION, TRANSITO, VIRTUAL

    -- Ubicacion fisica
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(50) DEFAULT 'Argentina',
    postal_code VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',

    -- Configuracion operativa
    operation_mode VARCHAR(30) DEFAULT 'STANDARD', -- STANDARD, CROSS_DOCK, FLOW_THROUGH, MIXED
    picking_strategy VARCHAR(30) DEFAULT 'FIFO', -- FIFO, LIFO, FEFO, MANUAL
    putaway_strategy VARCHAR(30) DEFAULT 'DIRECTED', -- DIRECTED, MANUAL, ABC_VELOCITY

    -- Capacidad
    total_area_m2 DECIMAL(12,2),
    storage_area_m2 DECIMAL(12,2),
    max_pallets INTEGER,
    max_sku INTEGER,

    -- Horarios de operacion
    working_days JSONB DEFAULT '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}',
    shift_start TIME DEFAULT '08:00',
    shift_end TIME DEFAULT '18:00',

    -- Integraciones
    wcs_integration BOOLEAN DEFAULT false,
    mhe_integration BOOLEAN DEFAULT false,

    -- Responsable
    manager_id INTEGER,
    manager_name VARCHAR(100),

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_warehouse_code UNIQUE(company_id, code)
);

-- 1.3 Configuracion de Operaciones por Almacen
CREATE TABLE IF NOT EXISTS logistics_warehouse_config (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL UNIQUE,

    -- RECEPCION (Inbound)
    inbound_steps INTEGER DEFAULT 1, -- 1, 2 o 3 pasos
    require_po_match BOOLEAN DEFAULT true,
    auto_putaway BOOLEAN DEFAULT false,
    require_inbound_qc BOOLEAN DEFAULT false,
    allow_over_receiving BOOLEAN DEFAULT false,
    over_receiving_tolerance DECIMAL(5,2) DEFAULT 0,

    -- ALMACENAMIENTO (Putaway)
    putaway_method VARCHAR(30) DEFAULT 'DIRECTED',
    use_abc_slotting BOOLEAN DEFAULT true,
    reserve_pick_locations BOOLEAN DEFAULT true,
    auto_replenish_pick BOOLEAN DEFAULT true,

    -- PICKING
    picking_method VARCHAR(30) DEFAULT 'WAVE', -- SINGLE, BATCH, WAVE, ZONE, CLUSTER
    wave_release_mode VARCHAR(20) DEFAULT 'MANUAL',
    default_wave_size INTEGER DEFAULT 50,
    allow_partial_pick BOOLEAN DEFAULT true,
    backorder_handling VARCHAR(20) DEFAULT 'CREATE',
    pick_confirmation VARCHAR(20) DEFAULT 'SCAN',

    -- PACKING
    packing_required BOOLEAN DEFAULT true,
    auto_cartonization BOOLEAN DEFAULT false,
    print_packing_slip BOOLEAN DEFAULT true,
    weight_verification BOOLEAN DEFAULT false,

    -- SHIPPING
    shipping_steps INTEGER DEFAULT 1,
    require_carrier_assignment BOOLEAN DEFAULT true,
    auto_route_assignment BOOLEAN DEFAULT false,
    staging_required BOOLEAN DEFAULT true,
    loading_verification BOOLEAN DEFAULT false,

    -- CROSS-DOCKING
    cross_dock_enabled BOOLEAN DEFAULT false,
    cross_dock_max_hours INTEGER DEFAULT 24,

    -- INVENTARIO
    cycle_count_enabled BOOLEAN DEFAULT true,
    cycle_count_frequency VARCHAR(20) DEFAULT 'WEEKLY',
    negative_inventory_allowed BOOLEAN DEFAULT false,
    lot_tracking_enabled BOOLEAN DEFAULT true,
    serial_tracking_enabled BOOLEAN DEFAULT false,
    expiry_tracking_enabled BOOLEAN DEFAULT true,

    -- ALERTAS
    low_stock_alert BOOLEAN DEFAULT true,
    expiry_alert_days INTEGER DEFAULT 30,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 1.4 Ubicaciones (granularidad configurable)
CREATE TABLE IF NOT EXISTS logistics_locations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    location_type_id INTEGER NOT NULL,

    -- Jerarquia: Almacen > Zona > Pasillo > Rack > Nivel > Posicion
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100),

    -- Estructura jerarquica
    parent_id INTEGER,
    zone_code VARCHAR(20),
    aisle VARCHAR(10),
    rack VARCHAR(10),
    level VARCHAR(10),
    position VARCHAR(10),

    -- Dimensiones
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    depth_cm DECIMAL(8,2),
    max_weight_kg DECIMAL(10,2),
    max_volume_m3 DECIMAL(10,4),

    -- Caracteristicas
    temperature_controlled BOOLEAN DEFAULT false,
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),
    humidity_controlled BOOLEAN DEFAULT false,
    hazmat_allowed BOOLEAN DEFAULT false,
    heavy_items BOOLEAN DEFAULT false,

    -- Para ABC/Velocity Slotting
    velocity_class VARCHAR(1) DEFAULT 'C', -- A, B, C
    pick_frequency INTEGER DEFAULT 0,
    golden_zone BOOLEAN DEFAULT false,

    -- Control
    current_sku_count INTEGER DEFAULT 0,
    current_qty DECIMAL(15,4) DEFAULT 0,
    last_movement_at TIMESTAMP,
    last_count_at TIMESTAMP,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_location_code UNIQUE(warehouse_id, code)
);

-- 1.5 Stock por Ubicacion (Quants)
CREATE TABLE IF NOT EXISTS logistics_quants (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),

    -- Trazabilidad
    lot_id INTEGER,
    lot_number VARCHAR(50),
    serial_number VARCHAR(100),
    expiry_date DATE,

    -- Cantidades
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(15,4) DEFAULT 0,

    -- Unidad de medida
    uom_id INTEGER,
    uom_code VARCHAR(20),

    -- Contenedor
    lpn VARCHAR(50),
    pallet_id INTEGER,

    -- Costo
    unit_cost DECIMAL(15,4),

    -- Fechas
    incoming_date DATE,
    last_movement_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 1.6 Movimientos de Inventario
CREATE TABLE IF NOT EXISTS logistics_inventory_movements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,

    -- Tipo de movimiento
    movement_type VARCHAR(30) NOT NULL,
    -- RECEIPT, PUTAWAY, PICK, PACK, SHIP, TRANSFER, ADJUSTMENT, COUNT, RETURN, CROSS_DOCK, PRODUCTION_IN, PRODUCTION_OUT, SCRAP

    -- Documento origen
    source_type VARCHAR(30),
    source_id INTEGER,
    source_number VARCHAR(50),

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),

    -- Cantidades
    quantity DECIMAL(15,4) NOT NULL,
    uom_id INTEGER,
    uom_code VARCHAR(20),

    -- Trazabilidad
    lot_number VARCHAR(50),
    serial_number VARCHAR(100),
    expiry_date DATE,

    -- Ubicaciones
    from_location_id INTEGER,
    from_location_code VARCHAR(50),
    to_location_id INTEGER,
    to_location_code VARCHAR(50),

    -- Contenedor/Pallet
    container_id INTEGER,
    container_code VARCHAR(50),
    lpn VARCHAR(50),

    -- Costos
    unit_cost DECIMAL(15,4),
    total_cost DECIMAL(15,4),

    -- Ejecucion
    planned_at TIMESTAMP,
    executed_at TIMESTAMP DEFAULT NOW(),
    executed_by INTEGER,
    executed_by_name VARCHAR(100),

    -- Estado
    status VARCHAR(20) DEFAULT 'COMPLETED',

    -- Tarea relacionada
    task_id INTEGER,
    wave_id INTEGER,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PARTE 2: PICKING, PACKING & SHIPPING
-- ============================================================================

-- 2.1 Waves (Oleadas de Picking)
CREATE TABLE IF NOT EXISTS logistics_waves (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,

    wave_number VARCHAR(30) NOT NULL,
    wave_type VARCHAR(20) DEFAULT 'STANDARD',

    -- Criterios de agrupacion
    grouping_criteria JSONB,

    -- Estado
    status VARCHAR(20) DEFAULT 'DRAFT',

    -- Estadisticas
    total_orders INTEGER DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    total_units DECIMAL(15,4) DEFAULT 0,
    total_picks INTEGER DEFAULT 0,

    -- Picking progress
    picks_completed INTEGER DEFAULT 0,
    picks_pending INTEGER DEFAULT 0,
    pick_percentage DECIMAL(5,2) DEFAULT 0,

    -- Tiempos
    planned_start TIMESTAMP,
    planned_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,

    -- Asignacion
    assigned_to INTEGER,
    assigned_to_name VARCHAR(100),

    released_at TIMESTAMP,
    released_by INTEGER,
    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_wave_number UNIQUE(warehouse_id, wave_number)
);

-- 2.2 Pick Lists
CREATE TABLE IF NOT EXISTS logistics_pick_lists (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    wave_id INTEGER,

    pick_list_number VARCHAR(30) NOT NULL,
    pick_type VARCHAR(20) DEFAULT 'ORDER',

    -- Documento origen
    source_type VARCHAR(30) NOT NULL,
    source_id INTEGER NOT NULL,
    source_number VARCHAR(50),

    -- Cliente destino
    customer_id INTEGER,
    customer_name VARCHAR(200),

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING',
    priority INTEGER DEFAULT 5,

    -- Asignacion
    assigned_to INTEGER,
    assigned_to_name VARCHAR(100),
    assigned_at TIMESTAMP,

    -- Progreso
    total_lines INTEGER DEFAULT 0,
    picked_lines INTEGER DEFAULT 0,
    total_qty DECIMAL(15,4) DEFAULT 0,
    picked_qty DECIMAL(15,4) DEFAULT 0,

    -- Tiempos
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Ubicacion de consolidacion
    staging_location_id INTEGER,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_pick_list UNIQUE(warehouse_id, pick_list_number)
);

-- 2.3 Pick List Lines
CREATE TABLE IF NOT EXISTS logistics_pick_list_lines (
    id SERIAL PRIMARY KEY,
    pick_list_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),

    -- Cantidades
    qty_requested DECIMAL(15,4) NOT NULL,
    qty_picked DECIMAL(15,4) DEFAULT 0,
    qty_short DECIMAL(15,4) DEFAULT 0,
    uom_id INTEGER,
    uom_code VARCHAR(20),

    -- Ubicacion sugerida
    suggested_location_id INTEGER,
    suggested_location_code VARCHAR(50),

    -- Ubicacion real de picking
    actual_location_id INTEGER,
    actual_location_code VARCHAR(50),

    -- Trazabilidad
    lot_number VARCHAR(50),
    serial_number VARCHAR(100),
    expiry_date DATE,

    -- LPN/Pallet
    source_lpn VARCHAR(50),
    target_lpn VARCHAR(50),

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING',

    -- Ejecucion
    picked_at TIMESTAMP,
    picked_by INTEGER,

    -- Secuencia de picking
    pick_sequence INTEGER,

    notes TEXT,

    CONSTRAINT uq_pick_line UNIQUE(pick_list_id, line_number)
);

-- 2.4 Pack Orders
CREATE TABLE IF NOT EXISTS logistics_pack_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,

    pack_number VARCHAR(30) NOT NULL,

    -- Origen
    pick_list_id INTEGER,
    source_type VARCHAR(30),
    source_id INTEGER,
    source_number VARCHAR(50),

    -- Cliente
    customer_id INTEGER,
    customer_name VARCHAR(200),
    ship_to_address TEXT,

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING',

    -- Packing station
    packing_station VARCHAR(30),

    -- Asignacion
    assigned_to INTEGER,
    assigned_to_name VARCHAR(100),

    -- Estadisticas
    total_items INTEGER DEFAULT 0,
    packed_items INTEGER DEFAULT 0,
    total_packages INTEGER DEFAULT 0,

    -- Peso y volumen total
    total_weight_kg DECIMAL(10,3),
    total_volume_m3 DECIMAL(10,4),

    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_pack_number UNIQUE(warehouse_id, pack_number)
);

-- 2.5 Packages (Bultos)
CREATE TABLE IF NOT EXISTS logistics_packages (
    id SERIAL PRIMARY KEY,
    pack_order_id INTEGER NOT NULL,

    -- Identificacion
    package_number VARCHAR(30) NOT NULL,
    tracking_number VARCHAR(100),
    lpn VARCHAR(50),

    -- Tipo de empaque
    package_type_id INTEGER,
    package_type_code VARCHAR(30),

    -- Dimensiones
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    weight_kg DECIMAL(10,3),
    dimensional_weight_kg DECIMAL(10,3),

    -- Estado
    status VARCHAR(20) DEFAULT 'OPEN',

    -- Carrier
    carrier_id INTEGER,
    carrier_code VARCHAR(30),
    service_type VARCHAR(50),

    -- Etiquetas
    label_printed BOOLEAN DEFAULT false,
    label_printed_at TIMESTAMP,

    closed_at TIMESTAMP,
    closed_by INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);

-- 2.6 Package Items
CREATE TABLE IF NOT EXISTS logistics_package_items (
    id SERIAL PRIMARY KEY,
    package_id INTEGER NOT NULL,

    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),

    quantity DECIMAL(15,4) NOT NULL,
    uom_id INTEGER,
    uom_code VARCHAR(20),

    lot_number VARCHAR(50),
    serial_number VARCHAR(100),

    pick_list_line_id INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PARTE 3: TMS - TRANSPORTATION MANAGEMENT SYSTEM
-- ============================================================================

-- 3.1 Carriers (Transportistas)
CREATE TABLE IF NOT EXISTS logistics_carriers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'EXTERNAL', -- OWN_FLEET, EXTERNAL, 3PL, COURIER

    -- Contacto
    contact_name VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(200),

    -- Fiscal
    tax_id VARCHAR(30),
    legal_name VARCHAR(200),

    -- Servicios
    services JSONB DEFAULT '["STANDARD"]',

    -- Cobertura
    coverage_zones JSONB,

    -- Costos base
    has_flat_rate BOOLEAN DEFAULT false,
    flat_rate DECIMAL(12,2),
    has_weight_rate BOOLEAN DEFAULT true,
    weight_rate_per_kg DECIMAL(10,4),
    has_volume_rate BOOLEAN DEFAULT false,
    volume_rate_per_m3 DECIMAL(10,4),
    min_charge DECIMAL(12,2),
    fuel_surcharge_pct DECIMAL(5,2) DEFAULT 0,

    -- Integracion
    api_enabled BOOLEAN DEFAULT false,
    api_url VARCHAR(500),
    api_key_encrypted TEXT,
    tracking_url_template VARCHAR(500),

    -- Performance
    avg_delivery_days DECIMAL(4,1),
    on_time_pct DECIMAL(5,2),
    damage_rate_pct DECIMAL(5,2),

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_carrier_code UNIQUE(company_id, code)
);

-- 3.2 Vehiculos
CREATE TABLE IF NOT EXISTS logistics_vehicles (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER,

    code VARCHAR(20) NOT NULL,
    plate_number VARCHAR(20) NOT NULL,
    type VARCHAR(30) NOT NULL, -- MOTORCYCLE, VAN, TRUCK_SMALL, TRUCK_MEDIUM, TRUCK_LARGE, TRAILER

    -- Caracteristicas
    brand VARCHAR(50),
    model VARCHAR(50),
    year INTEGER,
    color VARCHAR(30),

    -- Capacidad
    max_weight_kg DECIMAL(10,2),
    max_volume_m3 DECIMAL(10,4),
    max_pallets INTEGER,
    max_packages INTEGER,

    -- Restricciones
    refrigerated BOOLEAN DEFAULT false,
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),
    hazmat_certified BOOLEAN DEFAULT false,

    -- GPS/Tracking
    gps_device_id VARCHAR(100),
    last_known_lat DECIMAL(10,8),
    last_known_lng DECIMAL(11,8),
    last_gps_update TIMESTAMP,

    -- Documentacion
    insurance_expiry DATE,
    vtv_expiry DATE,

    -- Estado actual
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    current_driver_id INTEGER,
    current_route_id INTEGER,

    -- Metricas
    total_km DECIMAL(12,2) DEFAULT 0,
    avg_fuel_consumption DECIMAL(6,2),

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_vehicle_code UNIQUE(company_id, code),
    CONSTRAINT uq_vehicle_plate UNIQUE(plate_number)
);

-- 3.3 Drivers (Choferes)
CREATE TABLE IF NOT EXISTS logistics_drivers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    user_id INTEGER,

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,

    -- Documentos
    license_number VARCHAR(50),
    license_type VARCHAR(20),
    license_expiry DATE,
    dni VARCHAR(20),

    -- Contacto
    phone VARCHAR(50),
    email VARCHAR(100),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),

    -- Asignacion
    default_vehicle_id INTEGER,
    default_zone_ids JSONB,

    -- Disponibilidad
    status VARCHAR(20) DEFAULT 'AVAILABLE',

    -- Metricas
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2),

    -- App movil
    app_registered BOOLEAN DEFAULT false,
    app_device_id VARCHAR(100),
    last_app_activity TIMESTAMP,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_driver_code UNIQUE(company_id, code)
);

-- 3.4 Zonas de Entrega
CREATE TABLE IF NOT EXISTS logistics_delivery_zones (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER,

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,

    -- Tipo de zona
    zone_type VARCHAR(30) DEFAULT 'GEOGRAPHIC',

    -- Definicion geografica
    country VARCHAR(50) DEFAULT 'Argentina',
    province VARCHAR(100),
    city VARCHAR(100),
    localities JSONB,
    postal_codes JSONB,
    polygon_geojson JSONB,

    -- Dias de entrega (parametrizable)
    delivery_days JSONB DEFAULT '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}',

    -- Horarios
    delivery_time_from TIME DEFAULT '08:00',
    delivery_time_to TIME DEFAULT '18:00',

    -- Frecuencia
    frequency VARCHAR(20) DEFAULT 'DAILY',
    frequency_days JSONB,

    -- Carrier preferido
    default_carrier_id INTEGER,
    carrier_service_type VARCHAR(50),

    -- Costos
    delivery_cost DECIMAL(12,2),
    free_shipping_threshold DECIMAL(12,2),
    express_surcharge DECIMAL(12,2),

    -- Tiempos
    lead_time_hours INTEGER DEFAULT 24,
    cutoff_time TIME DEFAULT '14:00',

    -- Restricciones
    min_order_value DECIMAL(12,2),
    max_weight_kg DECIMAL(10,2),
    max_volume_m3 DECIMAL(10,4),

    -- Prioridad
    priority INTEGER DEFAULT 10,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_zone_code UNIQUE(company_id, warehouse_id, code)
);

-- 3.5 Configuracion de Zona por Cliente
CREATE TABLE IF NOT EXISTS logistics_customer_zone_config (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    zone_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,

    -- Override de dias
    custom_delivery_days JSONB,

    -- Override de horarios
    custom_time_from TIME,
    custom_time_to TIME,

    -- Prioridad especial
    priority_level INTEGER DEFAULT 5,

    -- Costos especiales
    custom_delivery_cost DECIMAL(12,2),
    custom_free_threshold DECIMAL(12,2),

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_customer_zone UNIQUE(customer_id, zone_id)
);

-- 3.6 Rutas
CREATE TABLE IF NOT EXISTS logistics_routes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,

    route_number VARCHAR(30) NOT NULL,
    route_date DATE NOT NULL,

    -- Tipo
    route_type VARCHAR(20) DEFAULT 'DELIVERY',

    -- Asignacion
    vehicle_id INTEGER,
    driver_id INTEGER,
    carrier_id INTEGER,

    -- Zonas de la ruta
    zone_ids JSONB,

    -- Estado
    status VARCHAR(20) DEFAULT 'DRAFT',

    -- Estadisticas planificadas
    planned_stops INTEGER DEFAULT 0,
    planned_packages INTEGER DEFAULT 0,
    planned_weight_kg DECIMAL(10,2),
    planned_distance_km DECIMAL(10,2),
    planned_duration_minutes INTEGER,

    -- Estadisticas reales
    actual_stops INTEGER DEFAULT 0,
    completed_stops INTEGER DEFAULT 0,
    failed_stops INTEGER DEFAULT 0,
    actual_packages INTEGER DEFAULT 0,
    actual_distance_km DECIMAL(10,2),

    -- Tiempos
    planned_departure TIMESTAMP,
    planned_return TIMESTAMP,
    actual_departure TIMESTAMP,
    actual_return TIMESTAMP,

    -- Carga
    loading_started_at TIMESTAMP,
    loading_completed_at TIMESTAMP,
    loaded_by INTEGER,

    -- Secuenciacion
    optimization_mode VARCHAR(20) DEFAULT 'DISTANCE',
    sequence_locked BOOLEAN DEFAULT false,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_route_number UNIQUE(company_id, route_number)
);

-- 3.7 Paradas de Ruta
CREATE TABLE IF NOT EXISTS logistics_route_stops (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL,

    sequence INTEGER NOT NULL,

    -- Tipo de parada
    stop_type VARCHAR(20) NOT NULL,

    -- Destino
    customer_id INTEGER,
    customer_name VARCHAR(200),
    address TEXT NOT NULL,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    -- Contacto
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    delivery_instructions TEXT,

    -- Documentos
    source_type VARCHAR(30),
    source_id INTEGER,
    source_number VARCHAR(50),

    -- Packages en esta parada
    package_ids JSONB,
    package_count INTEGER DEFAULT 0,
    total_weight_kg DECIMAL(10,2),

    -- Cobro (si aplica)
    collect_payment BOOLEAN DEFAULT false,
    payment_amount DECIMAL(15,2),
    payment_collected DECIMAL(15,2),
    payment_method VARCHAR(30),

    -- Ventana de tiempo
    time_window_from TIME,
    time_window_to TIME,

    -- Tiempos estimados
    eta TIMESTAMP,
    estimated_duration_minutes INTEGER DEFAULT 15,

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING',

    -- Ejecucion
    arrived_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- POD (Proof of Delivery)
    signature_captured BOOLEAN DEFAULT false,
    signature_data TEXT,
    photo_urls JSONB,
    recipient_name VARCHAR(100),
    recipient_dni VARCHAR(20),

    -- Resultado
    delivery_result VARCHAR(30),
    failure_reason TEXT,
    items_returned JSONB,

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_route_stop UNIQUE(route_id, sequence)
);

-- 3.8 Shipments (Envios)
CREATE TABLE IF NOT EXISTS logistics_shipments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,

    shipment_number VARCHAR(30) NOT NULL,

    -- Origen
    source_type VARCHAR(30) NOT NULL,
    source_id INTEGER NOT NULL,
    source_number VARCHAR(50),

    -- Cliente/Destino
    customer_id INTEGER,
    customer_name VARCHAR(200),
    ship_to_address TEXT,
    ship_to_city VARCHAR(100),
    ship_to_province VARCHAR(100),
    ship_to_country VARCHAR(50),
    ship_to_postal_code VARCHAR(20),
    ship_to_lat DECIMAL(10,8),
    ship_to_lng DECIMAL(11,8),

    -- Contacto destino
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),

    -- Carrier
    carrier_id INTEGER,
    carrier_code VARCHAR(30),
    carrier_service VARCHAR(50),
    tracking_number VARCHAR(100),

    -- Ruta
    route_id INTEGER,
    route_stop_id INTEGER,

    -- Packages
    package_count INTEGER DEFAULT 0,
    total_weight_kg DECIMAL(10,3),
    total_volume_m3 DECIMAL(10,4),

    -- Valor declarado
    declared_value DECIMAL(15,2),
    insurance_required BOOLEAN DEFAULT false,

    -- Costos
    shipping_cost DECIMAL(12,2),
    insurance_cost DECIMAL(12,2),

    -- Fechas
    ship_date DATE,
    promised_date DATE,
    delivered_date DATE,

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING',

    -- POD
    pod_captured BOOLEAN DEFAULT false,
    pod_signature TEXT,
    pod_photo_urls JSONB,
    pod_recipient_name VARCHAR(100),
    pod_timestamp TIMESTAMP,

    -- Incidencias
    has_incident BOOLEAN DEFAULT false,
    incident_type VARCHAR(30),
    incident_description TEXT,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_shipment_number UNIQUE(company_id, shipment_number)
);

-- 3.9 Tracking de Envios
CREATE TABLE IF NOT EXISTS logistics_shipment_tracking (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL,

    timestamp TIMESTAMP DEFAULT NOW(),
    status VARCHAR(30) NOT NULL,
    status_description VARCHAR(200),

    location VARCHAR(200),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    source VARCHAR(20) DEFAULT 'SYSTEM',

    notes TEXT
);

-- ============================================================================
-- PARTE 4: CONFIGURACION GLOBAL
-- ============================================================================

-- 4.1 Business Profiles
CREATE TABLE IF NOT EXISTS logistics_business_profiles (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL UNIQUE,

    -- Tipo de negocio principal
    business_type VARCHAR(30) NOT NULL DEFAULT 'DISTRIBUTOR',

    -- Features habilitados
    features JSONB DEFAULT '{
        "wms_enabled": true,
        "tms_enabled": true,
        "multi_warehouse": true,
        "multi_carrier": true,
        "own_fleet": false,
        "cross_docking": false,
        "wave_picking": true,
        "batch_picking": true,
        "zone_picking": false,
        "lot_tracking": true,
        "serial_tracking": false,
        "expiry_tracking": true,
        "returns_management": true,
        "cycle_counting": true,
        "pod_capture": true
    }',

    -- Configuracion de numeracion
    numbering JSONB DEFAULT '{
        "wave_prefix": "WV",
        "pick_list_prefix": "PL",
        "pack_order_prefix": "PK",
        "shipment_prefix": "SH",
        "route_prefix": "RT",
        "receipt_prefix": "RC"
    }',

    -- UoM por defecto
    default_weight_uom VARCHAR(10) DEFAULT 'kg',
    default_volume_uom VARCHAR(10) DEFAULT 'm3',
    default_length_uom VARCHAR(10) DEFAULT 'cm',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4.2 Configuracion de Producto para Logistica
CREATE TABLE IF NOT EXISTS logistics_product_config (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE,
    company_id INTEGER NOT NULL,

    -- Almacenamiento
    default_location_id INTEGER,
    storage_type VARCHAR(30) DEFAULT 'AMBIENT',
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),

    -- Handling
    requires_lot BOOLEAN DEFAULT false,
    requires_serial BOOLEAN DEFAULT false,
    requires_expiry BOOLEAN DEFAULT false,
    shelf_life_days INTEGER,
    expiry_alert_days INTEGER DEFAULT 30,

    -- Unidades
    storage_uom_id INTEGER,
    picking_uom_id INTEGER,
    units_per_pallet INTEGER,
    units_per_layer INTEGER,
    layers_per_pallet INTEGER,

    -- Dimensiones unitarias
    unit_length_cm DECIMAL(8,2),
    unit_width_cm DECIMAL(8,2),
    unit_height_cm DECIMAL(8,2),
    unit_weight_kg DECIMAL(10,4),
    unit_volume_m3 DECIMAL(10,6),

    -- Slotting
    velocity_class VARCHAR(1) DEFAULT 'C',
    pick_frequency DECIMAL(10,2) DEFAULT 0,
    preferred_zone VARCHAR(30),

    -- Restricciones
    stackable BOOLEAN DEFAULT true,
    max_stack_height INTEGER,
    fragile BOOLEAN DEFAULT false,
    hazmat BOOLEAN DEFAULT false,
    hazmat_class VARCHAR(20),

    -- Picking
    min_pick_qty DECIMAL(15,4) DEFAULT 1,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4.3 Reglas de Negocio
CREATE TABLE IF NOT EXISTS logistics_business_rules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER,

    rule_code VARCHAR(50) NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(30) NOT NULL,

    -- Condiciones
    conditions JSONB NOT NULL,

    -- Acciones
    actions JSONB NOT NULL,

    -- Prioridad
    priority INTEGER DEFAULT 100,

    active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_business_rule UNIQUE(company_id, rule_code)
);

-- 4.4 Tipos de Empaque
CREATE TABLE IF NOT EXISTS logistics_package_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,

    -- Dimensiones
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    max_weight_kg DECIMAL(10,2),
    tare_weight_kg DECIMAL(6,2) DEFAULT 0,

    -- Tipo
    is_pallet BOOLEAN DEFAULT false,
    is_box BOOLEAN DEFAULT true,
    is_envelope BOOLEAN DEFAULT false,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_package_type UNIQUE(company_id, code)
);

-- ============================================================================
-- PARTE 5: INDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_locations_warehouse ON logistics_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_locations_zone ON logistics_locations(zone_code);
CREATE INDEX IF NOT EXISTS idx_locations_velocity ON logistics_locations(velocity_class);

CREATE INDEX IF NOT EXISTS idx_quants_product ON logistics_quants(product_id);
CREATE INDEX IF NOT EXISTS idx_quants_location ON logistics_quants(location_id);
CREATE INDEX IF NOT EXISTS idx_quants_warehouse ON logistics_quants(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_quants_lot ON logistics_quants(lot_number);
CREATE INDEX IF NOT EXISTS idx_quants_expiry ON logistics_quants(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movements_warehouse ON logistics_inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_movements_product ON logistics_inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON logistics_inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_date ON logistics_inventory_movements(executed_at);
CREATE INDEX IF NOT EXISTS idx_movements_source ON logistics_inventory_movements(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_waves_warehouse ON logistics_waves(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_waves_status ON logistics_waves(status);
CREATE INDEX IF NOT EXISTS idx_waves_date ON logistics_waves(created_at);

CREATE INDEX IF NOT EXISTS idx_pick_lists_warehouse ON logistics_pick_lists(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_wave ON logistics_pick_lists(wave_id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_status ON logistics_pick_lists(status);

CREATE INDEX IF NOT EXISTS idx_shipments_company ON logistics_shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON logistics_shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON logistics_shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_route ON logistics_shipments(route_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON logistics_shipments(tracking_number);

CREATE INDEX IF NOT EXISTS idx_routes_warehouse ON logistics_routes(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON logistics_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_routes_status ON logistics_routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_driver ON logistics_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle ON logistics_routes(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON logistics_route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_status ON logistics_route_stops(status);
CREATE INDEX IF NOT EXISTS idx_route_stops_customer ON logistics_route_stops(customer_id);

CREATE INDEX IF NOT EXISTS idx_tracking_shipment ON logistics_shipment_tracking(shipment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_timestamp ON logistics_shipment_tracking(timestamp);

CREATE INDEX IF NOT EXISTS idx_zones_company ON logistics_delivery_zones(company_id);
CREATE INDEX IF NOT EXISTS idx_zones_warehouse ON logistics_delivery_zones(warehouse_id);

-- ============================================================================
-- PARTE 6: DATOS INICIALES
-- ============================================================================

-- Tipos de ubicacion por defecto
INSERT INTO logistics_location_types (company_id, code, name, category, zone_sequence, affects_inventory, is_pickable, is_puttable) VALUES
(1, 'RECEIVING', 'Zona de Recepcion', 'INTERNAL', 1, true, false, true),
(1, 'QC', 'Control de Calidad', 'INTERNAL', 2, true, false, true),
(1, 'BULK', 'Almacenamiento Bulk', 'INTERNAL', 3, true, true, true),
(1, 'RESERVE', 'Reserva/Stock', 'INTERNAL', 3, true, true, true),
(1, 'PICK', 'Zona de Picking', 'INTERNAL', 4, true, true, true),
(1, 'PACK', 'Zona de Empaque', 'INTERNAL', 5, true, false, true),
(1, 'STAGING', 'Staging/Despacho', 'INTERNAL', 6, true, false, true),
(1, 'SHIPPING', 'Zona de Carga', 'INTERNAL', 7, true, false, true),
(1, 'CROSS_DOCK', 'Cross-Docking', 'INTERNAL', 0, true, true, true),
(1, 'RETURNS', 'Devoluciones', 'INTERNAL', 0, true, false, true),
(1, 'DAMAGE', 'Productos Danados', 'LOSS', 0, false, false, true),
(1, 'CUSTOMER', 'Cliente (Virtual)', 'CUSTOMER', 99, false, false, false),
(1, 'SUPPLIER', 'Proveedor (Virtual)', 'SUPPLIER', 0, false, false, false),
(1, 'PRODUCTION', 'Produccion/Planta', 'PRODUCTION', 0, true, true, true),
(1, 'TRANSIT', 'En Transito', 'TRANSIT', 50, true, false, false)
ON CONFLICT (company_id, code) DO NOTHING;

-- Tipos de empaque por defecto
INSERT INTO logistics_package_types (company_id, code, name, length_cm, width_cm, height_cm, max_weight_kg, is_box, is_pallet) VALUES
(1, 'BOX_S', 'Caja Chica', 30, 20, 15, 5, true, false),
(1, 'BOX_M', 'Caja Mediana', 40, 30, 25, 15, true, false),
(1, 'BOX_L', 'Caja Grande', 60, 40, 40, 30, true, false),
(1, 'BOX_XL', 'Caja Extra Grande', 80, 60, 50, 50, true, false),
(1, 'ENVELOPE', 'Sobre', 35, 25, 3, 1, false, false),
(1, 'PALLET_STD', 'Pallet Standard', 120, 100, 15, 1000, false, true),
(1, 'PALLET_EUR', 'Pallet Europeo', 120, 80, 15, 800, false, true)
ON CONFLICT (company_id, code) DO NOTHING;

-- Business profile default
INSERT INTO logistics_business_profiles (company_id, business_type) VALUES
(1, 'DISTRIBUTOR')
ON CONFLICT (company_id) DO NOTHING;

SELECT 'Migracion SIAC Logistics completada exitosamente' as resultado;
