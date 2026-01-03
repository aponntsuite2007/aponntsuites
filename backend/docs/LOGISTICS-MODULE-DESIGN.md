# SIAC Logistics Module - Diseño Completo

## Basado en investigación de ERPs líderes del mercado

### Fuentes de Investigación
- [SAP S/4HANA Extended Warehouse Management 2025](https://community.sap.com/t5/supply-chain-management-blog-posts-by-sap/sap-extended-warehouse-management-for-sap-s-4hana-cloud-private-edition/ba-p/14238170)
- [SAP Logistics Management Module 2025](https://community.sap.com/t5/supply-chain-management-blog-posts-by-members/sap-s-new-logistics-management-module-a-cloud-native-approach-to-smarter/ba-p/14241187)
- [Oracle Cloud SCM Warehouse Management](https://www.oracle.com/scm/logistics/warehouse-management/)
- [Oracle Transportation Management 2024](https://www.oracle.com/europe/news/announcement/oracle-introduces-new-supply-chain-logistics-capabilities-2024-02-13/)
- [Microsoft Dynamics 365 Supply Chain Management 2024](https://learn.microsoft.com/en-us/dynamics365/release-plan/2024wave2/finance-supply-chain/dynamics365-supply-chain-management/)
- [Odoo 18 Inventory Management](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management.html)
- [Priority ERP Wholesale & Logistics](https://www.priority-software.com/erp/wholesale-logistics/)
- [Gartner WMS Reviews 2024](https://www.gartner.com/reviews/market/warehouse-management-systems)

---

## 1. VISIÓN GENERAL

### 1.1 Objetivo
Módulo de logística **100% parametrizable** que se adapte a cualquier tipo de negocio:
- **Distribuidoras** (mayoristas, minoristas)
- **Fábricas** (manufactura discreta, proceso, ETO)
- **3PL** (operadores logísticos terceros)
- **E-commerce** (fulfillment B2C)
- **Retail** (multi-tienda, cross-docking)
- **Agro/Alimentos** (trazabilidad, FEFO, cadena de frío)
- **Farmacéutico** (lotes, vencimientos, serialización)

### 1.2 Submódulos Principales

```
SIAC LOGISTICS
├── WMS (Warehouse Management System)
│   ├── Almacenes y Ubicaciones
│   ├── Recepción (Inbound)
│   ├── Almacenamiento (Putaway)
│   ├── Picking/Packing/Shipping
│   ├── Cross-docking
│   ├── Control de Inventario
│   └── Slotting y Optimización
│
├── TMS (Transportation Management System)
│   ├── Gestión de Flota
│   ├── Planificación de Rutas
│   ├── Zonas de Entrega
│   ├── Programación de Entregas
│   ├── Tracking en Tiempo Real
│   └── Proof of Delivery (POD)
│
├── Integración Producción (para fábricas)
│   ├── Logística Inbound (materias primas)
│   ├── Intralogística (WIP)
│   └── Logística Outbound (producto terminado)
│
└── Configuración Global
    ├── Parámetros por Empresa
    ├── Parámetros por Almacén
    ├── Parámetros por Tipo de Producto
    └── Workflows Configurables
```

---

## 2. WMS - WAREHOUSE MANAGEMENT SYSTEM

### 2.1 Maestro de Almacenes

#### Tabla: `logistics_warehouses`
```sql
CREATE TABLE logistics_warehouses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- PROPIO, TERCERO, CONSIGNACION, TRANSITO, VIRTUAL

    -- Ubicación física
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(50),
    postal_code VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',

    -- Configuración operativa
    operation_mode VARCHAR(30) DEFAULT 'STANDARD', -- STANDARD, CROSS_DOCK, FLOW_THROUGH, MIXED
    picking_strategy VARCHAR(30) DEFAULT 'FIFO', -- FIFO, LIFO, FEFO, MANUAL
    putaway_strategy VARCHAR(30) DEFAULT 'DIRECTED', -- DIRECTED, MANUAL, ABC_VELOCITY

    -- Capacidad
    total_area_m2 DECIMAL(12,2),
    storage_area_m2 DECIMAL(12,2),
    max_pallets INTEGER,
    max_sku INTEGER,

    -- Horarios de operación
    working_days JSONB, -- {"mon": true, "tue": true, ...}
    shift_start TIME,
    shift_end TIME,

    -- Integraciones
    wcs_integration BOOLEAN DEFAULT false, -- Warehouse Control System
    mhe_integration BOOLEAN DEFAULT false, -- Material Handling Equipment

    -- Responsables
    manager_id INTEGER,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_warehouse_code UNIQUE(company_id, code)
);
```

### 2.2 Zonas y Ubicaciones (Locations)

#### Tipos de Ubicación (parametrizables)
```sql
CREATE TABLE logistics_location_types (
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

    -- Prioridad en rutas de almacén
    zone_sequence INTEGER DEFAULT 0, -- 1=IN, 2=QC, 3=BULK, 4=PICK, 5=PACK, 6=SHIP

    active BOOLEAN DEFAULT true,
    CONSTRAINT uq_location_type UNIQUE(company_id, code)
);

-- Datos default
INSERT INTO logistics_location_types (company_id, code, name, category, zone_sequence) VALUES
(1, 'RECEIVING', 'Zona de Recepción', 'INTERNAL', 1),
(1, 'QC', 'Control de Calidad', 'INTERNAL', 2),
(1, 'BULK', 'Almacenamiento Bulk', 'INTERNAL', 3),
(1, 'RESERVE', 'Reserva/Stock', 'INTERNAL', 3),
(1, 'PICK', 'Zona de Picking', 'INTERNAL', 4),
(1, 'PACK', 'Zona de Empaque', 'INTERNAL', 5),
(1, 'STAGING', 'Staging/Despacho', 'INTERNAL', 6),
(1, 'SHIPPING', 'Zona de Carga', 'INTERNAL', 7),
(1, 'CROSS_DOCK', 'Cross-Docking', 'INTERNAL', 0),
(1, 'RETURNS', 'Devoluciones', 'INTERNAL', 0),
(1, 'DAMAGE', 'Productos Dañados', 'LOSS', 0),
(1, 'CUSTOMER', 'Cliente (Virtual)', 'CUSTOMER', 99),
(1, 'SUPPLIER', 'Proveedor (Virtual)', 'SUPPLIER', 0),
(1, 'PRODUCTION', 'Producción/Planta', 'PRODUCTION', 0),
(1, 'TRANSIT', 'En Tránsito', 'TRANSIT', 50);
```

#### Ubicaciones (granularidad configurable)
```sql
CREATE TABLE logistics_locations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES logistics_warehouses(id),
    location_type_id INTEGER NOT NULL REFERENCES logistics_location_types(id),

    -- Jerarquía: Almacén > Zona > Pasillo > Rack > Nivel > Posición
    code VARCHAR(50) NOT NULL, -- Ej: "A-01-02-03" (Pasillo A, Rack 01, Nivel 02, Pos 03)
    name VARCHAR(100),

    -- Estructura jerárquica
    parent_id INTEGER REFERENCES logistics_locations(id),
    zone_code VARCHAR(20), -- Agrupador de zona
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

    -- Características
    temperature_controlled BOOLEAN DEFAULT false,
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),
    humidity_controlled BOOLEAN DEFAULT false,
    hazmat_allowed BOOLEAN DEFAULT false,
    heavy_items BOOLEAN DEFAULT false,

    -- Para ABC/Velocity Slotting
    velocity_class VARCHAR(1), -- A, B, C
    pick_frequency INTEGER DEFAULT 0, -- Picks por día/semana
    golden_zone BOOLEAN DEFAULT false, -- Altura óptima picking

    -- Control
    current_sku_count INTEGER DEFAULT 0,
    current_qty DECIMAL(15,4) DEFAULT 0,
    last_movement_at TIMESTAMP,
    last_count_at TIMESTAMP,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_location_code UNIQUE(warehouse_id, code)
);

-- Índices para búsqueda rápida
CREATE INDEX idx_locations_warehouse ON logistics_locations(warehouse_id);
CREATE INDEX idx_locations_zone ON logistics_locations(zone_code);
CREATE INDEX idx_locations_velocity ON logistics_locations(velocity_class);
```

### 2.3 Configuración de Operaciones por Almacén

```sql
CREATE TABLE logistics_warehouse_config (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL UNIQUE REFERENCES logistics_warehouses(id),

    -- RECEPCIÓN (Inbound)
    inbound_steps INTEGER DEFAULT 1, -- 1, 2 o 3 pasos
    require_po_match BOOLEAN DEFAULT true, -- Requiere orden de compra
    auto_putaway BOOLEAN DEFAULT false,
    require_inbound_qc BOOLEAN DEFAULT false,
    allow_over_receiving BOOLEAN DEFAULT false,
    over_receiving_tolerance DECIMAL(5,2) DEFAULT 0, -- % tolerancia

    -- ALMACENAMIENTO (Putaway)
    putaway_method VARCHAR(30) DEFAULT 'DIRECTED', -- DIRECTED, MANUAL, CLOSEST_EMPTY
    use_abc_slotting BOOLEAN DEFAULT true,
    reserve_pick_locations BOOLEAN DEFAULT true,
    auto_replenish_pick BOOLEAN DEFAULT true,

    -- PICKING
    picking_method VARCHAR(30) DEFAULT 'WAVE', -- SINGLE, BATCH, WAVE, ZONE, CLUSTER
    wave_release_mode VARCHAR(20) DEFAULT 'MANUAL', -- MANUAL, SCHEDULED, AUTO
    default_wave_size INTEGER DEFAULT 50,
    allow_partial_pick BOOLEAN DEFAULT true,
    backorder_handling VARCHAR(20) DEFAULT 'CREATE', -- CREATE, CANCEL, WAIT
    pick_confirmation VARCHAR(20) DEFAULT 'SCAN', -- SCAN, MANUAL, VOICE

    -- PACKING
    packing_required BOOLEAN DEFAULT true,
    auto_cartonization BOOLEAN DEFAULT false,
    print_packing_slip BOOLEAN DEFAULT true,
    weight_verification BOOLEAN DEFAULT false,

    -- SHIPPING
    shipping_steps INTEGER DEFAULT 1, -- 1, 2 o 3 pasos
    require_carrier_assignment BOOLEAN DEFAULT true,
    auto_route_assignment BOOLEAN DEFAULT false,
    staging_required BOOLEAN DEFAULT true,
    loading_verification BOOLEAN DEFAULT false,

    -- CROSS-DOCKING
    cross_dock_enabled BOOLEAN DEFAULT false,
    cross_dock_max_hours INTEGER DEFAULT 24,

    -- INVENTARIO
    cycle_count_enabled BOOLEAN DEFAULT true,
    cycle_count_frequency VARCHAR(20) DEFAULT 'WEEKLY', -- DAILY, WEEKLY, MONTHLY, ABC_BASED
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
```

### 2.4 Movimientos de Inventario

```sql
CREATE TABLE logistics_inventory_movements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,

    -- Tipo de movimiento
    movement_type VARCHAR(30) NOT NULL,
    -- RECEIPT, PUTAWAY, PICK, PACK, SHIP, TRANSFER, ADJUSTMENT,
    -- COUNT, RETURN, CROSS_DOCK, PRODUCTION_IN, PRODUCTION_OUT, SCRAP

    -- Documento origen
    source_type VARCHAR(30), -- PURCHASE_ORDER, SALES_ORDER, TRANSFER_ORDER, PRODUCTION_ORDER, MANUAL
    source_id INTEGER,
    source_number VARCHAR(50),

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),

    -- Cantidades
    quantity DECIMAL(15,4) NOT NULL,
    uom_id INTEGER NOT NULL,
    uom_code VARCHAR(20),

    -- Trazabilidad
    lot_number VARCHAR(50),
    serial_number VARCHAR(100),
    expiry_date DATE,

    -- Ubicaciones
    from_location_id INTEGER REFERENCES logistics_locations(id),
    from_location_code VARCHAR(50),
    to_location_id INTEGER REFERENCES logistics_locations(id),
    to_location_code VARCHAR(50),

    -- Contenedor/Pallet
    container_id INTEGER,
    container_code VARCHAR(50),
    lpn VARCHAR(50), -- License Plate Number

    -- Costos
    unit_cost DECIMAL(15,4),
    total_cost DECIMAL(15,4),

    -- Ejecución
    planned_at TIMESTAMP,
    executed_at TIMESTAMP DEFAULT NOW(),
    executed_by INTEGER NOT NULL,
    executed_by_name VARCHAR(100),

    -- Estado
    status VARCHAR(20) DEFAULT 'COMPLETED', -- PLANNED, IN_PROGRESS, COMPLETED, CANCELLED

    -- Tarea relacionada
    task_id INTEGER,
    wave_id INTEGER,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices críticos para performance
CREATE INDEX idx_movements_warehouse ON logistics_inventory_movements(warehouse_id);
CREATE INDEX idx_movements_product ON logistics_inventory_movements(product_id);
CREATE INDEX idx_movements_type ON logistics_inventory_movements(movement_type);
CREATE INDEX idx_movements_date ON logistics_inventory_movements(executed_at);
CREATE INDEX idx_movements_lot ON logistics_inventory_movements(lot_number);
CREATE INDEX idx_movements_source ON logistics_inventory_movements(source_type, source_id);
```

### 2.5 Stock por Ubicación (Quants - estilo Odoo)

```sql
CREATE TABLE logistics_quants (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL REFERENCES logistics_locations(id),

    -- Producto
    product_id INTEGER NOT NULL,

    -- Trazabilidad
    lot_id INTEGER,
    lot_number VARCHAR(50),
    serial_number VARCHAR(100),
    expiry_date DATE,

    -- Cantidades
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(15,4) DEFAULT 0,
    available_quantity DECIMAL(15,4) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,

    -- Unidad de medida
    uom_id INTEGER NOT NULL,

    -- Contenedor
    lpn VARCHAR(50),
    pallet_id INTEGER,

    -- Costo (para valorización)
    unit_cost DECIMAL(15,4),

    -- Fechas
    incoming_date DATE, -- Fecha de ingreso al sistema
    last_movement_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Un quant por combinación única
    CONSTRAINT uq_quant UNIQUE(location_id, product_id, lot_id, COALESCE(serial_number, ''))
);

CREATE INDEX idx_quants_product ON logistics_quants(product_id);
CREATE INDEX idx_quants_location ON logistics_quants(location_id);
CREATE INDEX idx_quants_warehouse ON logistics_quants(warehouse_id);
CREATE INDEX idx_quants_available ON logistics_quants(available_quantity) WHERE available_quantity > 0;
CREATE INDEX idx_quants_expiry ON logistics_quants(expiry_date) WHERE expiry_date IS NOT NULL;
```

---

## 3. PICKING, PACKING & SHIPPING

### 3.1 Waves (Oleadas de Picking)

```sql
CREATE TABLE logistics_waves (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,

    wave_number VARCHAR(30) NOT NULL,
    wave_type VARCHAR(20) DEFAULT 'STANDARD', -- STANDARD, EXPRESS, CONSOLIDATED, STORE_REPLENISH

    -- Criterios de agrupación (parametrizables)
    grouping_criteria JSONB,
    -- Ej: {"carrier": "ANDREANI", "zone": "NORTE", "priority": "HIGH"}

    -- Estado
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED

    -- Estadísticas
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

    -- Asignación
    assigned_to INTEGER,
    assigned_to_name VARCHAR(100),

    released_at TIMESTAMP,
    released_by INTEGER,
    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_wave_number UNIQUE(warehouse_id, wave_number)
);
```

### 3.2 Pick Lists

```sql
CREATE TABLE logistics_pick_lists (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    wave_id INTEGER REFERENCES logistics_waves(id),

    pick_list_number VARCHAR(30) NOT NULL,
    pick_type VARCHAR(20) DEFAULT 'ORDER', -- ORDER, BATCH, ZONE, CLUSTER

    -- Documento origen
    source_type VARCHAR(30) NOT NULL, -- SALES_ORDER, TRANSFER_ORDER, PRODUCTION_ORDER
    source_id INTEGER NOT NULL,
    source_number VARCHAR(50),

    -- Cliente destino (para picking directo)
    customer_id INTEGER,
    customer_name VARCHAR(200),

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, PARTIAL, CANCELLED
    priority INTEGER DEFAULT 5, -- 1-10, 1=más urgente

    -- Asignación
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

    -- Ubicación de consolidación
    staging_location_id INTEGER,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_pick_list UNIQUE(warehouse_id, pick_list_number)
);

CREATE TABLE logistics_pick_list_lines (
    id SERIAL PRIMARY KEY,
    pick_list_id INTEGER NOT NULL REFERENCES logistics_pick_lists(id),
    line_number INTEGER NOT NULL,

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),

    -- Cantidades
    qty_requested DECIMAL(15,4) NOT NULL,
    qty_picked DECIMAL(15,4) DEFAULT 0,
    qty_short DECIMAL(15,4) DEFAULT 0, -- Faltante
    uom_id INTEGER NOT NULL,

    -- Ubicación sugerida
    suggested_location_id INTEGER,
    suggested_location_code VARCHAR(50),

    -- Ubicación real de picking
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
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PICKED, PARTIAL, SHORT, CANCELLED

    -- Ejecución
    picked_at TIMESTAMP,
    picked_by INTEGER,

    -- Secuencia de picking (optimizada por ruta)
    pick_sequence INTEGER,

    notes TEXT,

    CONSTRAINT uq_pick_line UNIQUE(pick_list_id, line_number)
);
```

### 3.3 Packing

```sql
CREATE TABLE logistics_pack_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,

    pack_number VARCHAR(30) NOT NULL,

    -- Origen
    pick_list_id INTEGER REFERENCES logistics_pick_lists(id),
    source_type VARCHAR(30),
    source_id INTEGER,
    source_number VARCHAR(50),

    -- Cliente
    customer_id INTEGER,
    customer_name VARCHAR(200),
    ship_to_address TEXT,

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED

    -- Packing station
    packing_station VARCHAR(30),

    -- Asignación
    assigned_to INTEGER,
    assigned_to_name VARCHAR(100),

    -- Estadísticas
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

CREATE TABLE logistics_packages (
    id SERIAL PRIMARY KEY,
    pack_order_id INTEGER NOT NULL REFERENCES logistics_pack_orders(id),

    -- Identificación
    package_number VARCHAR(30) NOT NULL,
    tracking_number VARCHAR(100), -- Del carrier
    lpn VARCHAR(50),

    -- Tipo de empaque
    package_type_id INTEGER,
    package_type_code VARCHAR(30), -- BOX, PALLET, ENVELOPE, TUBE, etc.

    -- Dimensiones
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    weight_kg DECIMAL(10,3),
    dimensional_weight_kg DECIMAL(10,3),

    -- Estado
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED, SHIPPED, DELIVERED

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

CREATE TABLE logistics_package_items (
    id SERIAL PRIMARY KEY,
    package_id INTEGER NOT NULL REFERENCES logistics_packages(id),

    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),

    quantity DECIMAL(15,4) NOT NULL,
    uom_id INTEGER NOT NULL,

    lot_number VARCHAR(50),
    serial_number VARCHAR(100),

    -- De qué pick line vino
    pick_list_line_id INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. TMS - TRANSPORTATION MANAGEMENT SYSTEM

### 4.1 Maestro de Transportistas/Carriers

```sql
CREATE TABLE logistics_carriers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- OWN_FLEET, EXTERNAL, 3PL, COURIER

    -- Contacto
    contact_name VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(200),

    -- Fiscal
    tax_id VARCHAR(30),
    legal_name VARCHAR(200),

    -- Servicios
    services JSONB, -- ["STANDARD", "EXPRESS", "SAME_DAY", "COLD_CHAIN"]

    -- Cobertura
    coverage_zones JSONB, -- ["CABA", "GBA", "INTERIOR"]

    -- Costos base
    has_flat_rate BOOLEAN DEFAULT false,
    flat_rate DECIMAL(12,2),
    has_weight_rate BOOLEAN DEFAULT true,
    weight_rate_per_kg DECIMAL(10,4),
    has_volume_rate BOOLEAN DEFAULT false,
    volume_rate_per_m3 DECIMAL(10,4),
    min_charge DECIMAL(12,2),
    fuel_surcharge_pct DECIMAL(5,2) DEFAULT 0,

    -- Integración
    api_enabled BOOLEAN DEFAULT false,
    api_url VARCHAR(500),
    api_key_encrypted TEXT,
    tracking_url_template VARCHAR(500), -- https://carrier.com/track/{tracking_number}

    -- Performance
    avg_delivery_days DECIMAL(4,1),
    on_time_pct DECIMAL(5,2),
    damage_rate_pct DECIMAL(5,2),

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_carrier_code UNIQUE(company_id, code)
);
```

### 4.2 Flota Propia (Vehículos)

```sql
CREATE TABLE logistics_vehicles (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER, -- Base del vehículo

    code VARCHAR(20) NOT NULL,
    plate_number VARCHAR(20) NOT NULL,
    type VARCHAR(30) NOT NULL, -- MOTORCYCLE, VAN, TRUCK_SMALL, TRUCK_MEDIUM, TRUCK_LARGE, TRAILER

    -- Características
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

    -- Documentación
    insurance_expiry DATE,
    vtv_expiry DATE, -- Verificación Técnica Vehicular

    -- Estado actual
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, IN_ROUTE, MAINTENANCE, OUT_OF_SERVICE
    current_driver_id INTEGER,
    current_route_id INTEGER,

    -- Métricas
    total_km DECIMAL(12,2) DEFAULT 0,
    avg_fuel_consumption DECIMAL(6,2), -- L/100km

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_vehicle_code UNIQUE(company_id, code),
    CONSTRAINT uq_vehicle_plate UNIQUE(plate_number)
);

CREATE TABLE logistics_drivers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    user_id INTEGER, -- Link a usuarios del sistema

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,

    -- Documentos
    license_number VARCHAR(50),
    license_type VARCHAR(20), -- A, B1, B2, C, D, E
    license_expiry DATE,
    dni VARCHAR(20),

    -- Contacto
    phone VARCHAR(50),
    email VARCHAR(100),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),

    -- Asignación
    default_vehicle_id INTEGER REFERENCES logistics_vehicles(id),
    default_zone_ids JSONB, -- Zonas habituales de trabajo

    -- Disponibilidad
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, ON_ROUTE, OFF_DUTY, VACATION, SICK

    -- Métricas
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2),

    -- App móvil
    app_registered BOOLEAN DEFAULT false,
    app_device_id VARCHAR(100),
    last_app_activity TIMESTAMP,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_driver_code UNIQUE(company_id, code)
);
```

### 4.3 Zonas de Entrega (Delivery Zones)

```sql
CREATE TABLE logistics_delivery_zones (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER REFERENCES logistics_warehouses(id), -- De qué almacén se despacha

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,

    -- Tipo de zona
    zone_type VARCHAR(30) DEFAULT 'GEOGRAPHIC', -- GEOGRAPHIC, POSTAL_CODE, CUSTOM, POLYGON

    -- Definición geográfica
    country VARCHAR(50),
    province VARCHAR(100),
    city VARCHAR(100),
    localities JSONB, -- ["Palermo", "Recoleta", "Belgrano"]
    postal_codes JSONB, -- ["1425", "1426", "1427"]
    polygon_geojson JSONB, -- GeoJSON para zonas custom

    -- Días de entrega (parametrizable)
    delivery_days JSONB DEFAULT '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}',

    -- Horarios
    delivery_time_from TIME,
    delivery_time_to TIME,

    -- Frecuencia
    frequency VARCHAR(20) DEFAULT 'DAILY', -- DAILY, WEEKLY, BIWEEKLY, MONTHLY, CUSTOM
    frequency_days JSONB, -- Para WEEKLY: ["mon", "wed", "fri"]

    -- Carrier preferido
    default_carrier_id INTEGER REFERENCES logistics_carriers(id),
    carrier_service_type VARCHAR(50),

    -- Costos
    delivery_cost DECIMAL(12,2),
    free_shipping_threshold DECIMAL(12,2),
    express_surcharge DECIMAL(12,2),

    -- Tiempos
    lead_time_hours INTEGER DEFAULT 24, -- Horas desde pedido hasta entrega
    cutoff_time TIME, -- Hora límite para entrega día siguiente

    -- Restricciones
    min_order_value DECIMAL(12,2),
    max_weight_kg DECIMAL(10,2),
    max_volume_m3 DECIMAL(10,4),

    -- Prioridad (para overlapping zones)
    priority INTEGER DEFAULT 10,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_zone_code UNIQUE(company_id, warehouse_id, code)
);

-- Configuración específica de zona por cliente
CREATE TABLE logistics_customer_zone_config (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    zone_id INTEGER NOT NULL REFERENCES logistics_delivery_zones(id),

    -- Override de días
    custom_delivery_days JSONB,

    -- Override de horarios
    custom_time_from TIME,
    custom_time_to TIME,

    -- Prioridad especial
    priority_level INTEGER DEFAULT 5, -- 1-10

    -- Costos especiales
    custom_delivery_cost DECIMAL(12,2),
    custom_free_threshold DECIMAL(12,2),

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_customer_zone UNIQUE(customer_id, zone_id)
);
```

### 4.4 Rutas y Hojas de Ruta

```sql
CREATE TABLE logistics_routes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,

    route_number VARCHAR(30) NOT NULL,
    route_date DATE NOT NULL,

    -- Tipo
    route_type VARCHAR(20) DEFAULT 'DELIVERY', -- DELIVERY, PICKUP, MIXED, TRANSFER

    -- Asignación
    vehicle_id INTEGER REFERENCES logistics_vehicles(id),
    driver_id INTEGER REFERENCES logistics_drivers(id),
    carrier_id INTEGER REFERENCES logistics_carriers(id), -- Si es tercero

    -- Zona(s) de la ruta
    zone_ids JSONB,

    -- Estado
    status VARCHAR(20) DEFAULT 'DRAFT',
    -- DRAFT, PLANNED, RELEASED, LOADING, IN_PROGRESS, COMPLETED, CANCELLED

    -- Estadísticas planificadas
    planned_stops INTEGER DEFAULT 0,
    planned_packages INTEGER DEFAULT 0,
    planned_weight_kg DECIMAL(10,2),
    planned_distance_km DECIMAL(10,2),
    planned_duration_minutes INTEGER,

    -- Estadísticas reales
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

    -- Secuenciación
    optimization_mode VARCHAR(20) DEFAULT 'DISTANCE', -- DISTANCE, TIME, PRIORITY, MANUAL
    sequence_locked BOOLEAN DEFAULT false, -- Si el usuario fijó la secuencia

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_route_number UNIQUE(company_id, route_number)
);

CREATE TABLE logistics_route_stops (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES logistics_routes(id),

    sequence INTEGER NOT NULL, -- Orden de visita

    -- Tipo de parada
    stop_type VARCHAR(20) NOT NULL, -- DELIVERY, PICKUP, RETURN, COLLECT_PAYMENT

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
    source_type VARCHAR(30), -- SALES_ORDER, INVOICE, RETURN_ORDER
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
    eta TIMESTAMP, -- Estimated Time of Arrival
    estimated_duration_minutes INTEGER DEFAULT 15,

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING, IN_TRANSIT, ARRIVED, COMPLETED, PARTIAL, FAILED, SKIPPED

    -- Ejecución
    arrived_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- POD (Proof of Delivery)
    signature_captured BOOLEAN DEFAULT false,
    signature_data TEXT,
    photo_urls JSONB,
    recipient_name VARCHAR(100),
    recipient_dni VARCHAR(20),

    -- Resultado
    delivery_result VARCHAR(30), -- DELIVERED, PARTIAL, REFUSED, ABSENT, WRONG_ADDRESS
    failure_reason TEXT,
    items_returned JSONB, -- Productos devueltos

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_route_stop UNIQUE(route_id, sequence)
);
```

### 4.5 Shipments (Envíos)

```sql
CREATE TABLE logistics_shipments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,

    shipment_number VARCHAR(30) NOT NULL,

    -- Origen
    source_type VARCHAR(30) NOT NULL, -- SALES_ORDER, TRANSFER_ORDER, RETURN
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
    carrier_id INTEGER REFERENCES logistics_carriers(id),
    carrier_code VARCHAR(30),
    carrier_service VARCHAR(50),
    tracking_number VARCHAR(100),

    -- Ruta (si es flota propia)
    route_id INTEGER REFERENCES logistics_routes(id),
    route_stop_id INTEGER REFERENCES logistics_route_stops(id),

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
    -- PENDING, READY_TO_SHIP, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, RETURNED, CANCELLED

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

    CONSTRAINT uq_shipment_number UNIQUE(company_id, shipment_number)
);

-- Tracking history
CREATE TABLE logistics_shipment_tracking (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES logistics_shipments(id),

    timestamp TIMESTAMP DEFAULT NOW(),
    status VARCHAR(30) NOT NULL,
    status_description VARCHAR(200),

    location VARCHAR(200),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    -- Origen del evento
    source VARCHAR(20) DEFAULT 'SYSTEM', -- SYSTEM, CARRIER_API, DRIVER_APP, MANUAL

    notes TEXT
);

CREATE INDEX idx_tracking_shipment ON logistics_shipment_tracking(shipment_id);
CREATE INDEX idx_tracking_timestamp ON logistics_shipment_tracking(timestamp);
```

---

## 5. CONFIGURACIÓN GLOBAL PARAMETRIZABLE

### 5.1 Parámetros por Tipo de Negocio

```sql
CREATE TABLE logistics_business_profiles (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL UNIQUE,

    -- Tipo de negocio principal
    business_type VARCHAR(30) NOT NULL,
    -- DISTRIBUTOR, WHOLESALER, MANUFACTURER, RETAILER, 3PL, ECOMMERCE, PHARMA, FOOD, OTHER

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
        "voice_picking": false,
        "lot_tracking": true,
        "serial_tracking": false,
        "expiry_tracking": true,
        "temperature_tracking": false,
        "hazmat_handling": false,
        "kitting": false,
        "assembly": false,
        "returns_management": true,
        "cycle_counting": true,
        "slotting_optimization": false,
        "labor_management": false,
        "billing_integration": true,
        "pod_capture": true,
        "route_optimization": false
    }',

    -- Configuración de numeración
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

    -- Workflows
    inbound_workflow JSONB DEFAULT '{
        "steps": 1,
        "require_po": true,
        "require_qc": false,
        "auto_putaway": false
    }',

    outbound_workflow JSONB DEFAULT '{
        "steps": 2,
        "picking_method": "WAVE",
        "packing_required": true,
        "shipping_confirmation": true
    }',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Configuraciones específicas de producto para logística
CREATE TABLE logistics_product_config (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE,
    company_id INTEGER NOT NULL,

    -- Almacenamiento
    default_location_id INTEGER,
    storage_type VARCHAR(30), -- AMBIENT, REFRIGERATED, FROZEN, HAZMAT
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
    velocity_class VARCHAR(1) DEFAULT 'C', -- A, B, C
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
    pick_uom_id INTEGER,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Reglas de Negocio Configurables

```sql
CREATE TABLE logistics_business_rules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    warehouse_id INTEGER, -- NULL = aplica a todos

    rule_code VARCHAR(50) NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(30) NOT NULL,
    -- ALLOCATION, PUTAWAY, PICKING, WAVE_RELEASE, CARRIER_SELECTION, ROUTE_ASSIGNMENT

    -- Condiciones (JSON con operadores)
    conditions JSONB NOT NULL,
    -- Ej: {"and": [{"field": "order.priority", "op": ">=", "value": 8}, {"field": "order.carrier", "op": "=", "value": "EXPRESS"}]}

    -- Acciones
    actions JSONB NOT NULL,
    -- Ej: {"assign_wave": "EXPRESS", "priority": 1}

    -- Prioridad (menor = primero)
    priority INTEGER DEFAULT 100,

    active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_business_rule UNIQUE(company_id, rule_code)
);

-- Ejemplo de reglas:
INSERT INTO logistics_business_rules (company_id, rule_code, rule_name, rule_type, conditions, actions) VALUES
(1, 'EXPRESS_PRIORITY', 'Priorizar pedidos Express', 'WAVE_RELEASE',
 '{"and": [{"field": "order.shipping_method", "op": "=", "value": "EXPRESS"}]}',
 '{"wave_priority": 1, "separate_wave": true}'),

(1, 'COLD_CHAIN_ROUTE', 'Asignar vehículo refrigerado', 'CARRIER_SELECTION',
 '{"or": [{"field": "product.storage_type", "op": "=", "value": "REFRIGERATED"}, {"field": "product.storage_type", "op": "=", "value": "FROZEN"}]}',
 '{"require_vehicle_type": "REFRIGERATED", "carrier_service": "COLD_CHAIN"}'),

(1, 'HIGH_VALUE_SECURITY', 'Seguro obligatorio alto valor', 'CARRIER_SELECTION',
 '{"field": "order.total", "op": ">=", "value": 100000}',
 '{"require_insurance": true, "require_signature": true}');
```

---

## 6. INTEGRACIONES

### 6.1 Con SIAC Commercial (Facturación)

```
Factura Emitida → Trigger → Crear Shipment pendiente
Remito Emitido → Trigger → Actualizar estado shipment
Cobro registrado → Trigger → Cerrar COD en ruta
```

### 6.2 Con Producción (Fábricas)

```
Orden de Producción liberada → Reservar materiales en WMS
Picking de materiales → Transferir a ubicación PRODUCTION
Producción terminada → Receipt de producto terminado
```

### 6.3 Con Compras

```
Orden de Compra confirmada → Crear Receipt esperado
Recepción física → Validar vs OC, crear movimientos
Devolución a proveedor → Crear shipment de salida
```

---

## 7. REPORTES Y KPIs

### 7.1 KPIs de Almacén

| KPI | Fórmula | Target |
|-----|---------|--------|
| Fill Rate | Líneas completas / Líneas totales | > 98% |
| Order Accuracy | Pedidos sin error / Total pedidos | > 99.5% |
| Inventory Accuracy | Conteo real / Conteo sistema | > 99% |
| On-Time Shipping | Envíos a tiempo / Total envíos | > 95% |
| Picks per Hour | Total picks / Horas trabajadas | Variable |
| Putaway Accuracy | Putaways correctos / Total | > 99% |
| Space Utilization | Ubicaciones usadas / Total ubicaciones | 70-85% |
| Dock-to-Stock Time | Tiempo promedio recepción a ubicación | < 4 hrs |

### 7.2 KPIs de Transporte

| KPI | Fórmula | Target |
|-----|---------|--------|
| On-Time Delivery | Entregas a tiempo / Total entregas | > 95% |
| First Attempt Delivery | Exitosas primer intento / Total | > 90% |
| Cost per Delivery | Costo total / Entregas | Minimizar |
| Vehicle Utilization | Capacidad usada / Capacidad total | > 80% |
| Route Efficiency | Distancia planificada / Distancia real | > 95% |
| POD Capture Rate | PODs capturados / Entregas | 100% |
| Returns Rate | Devoluciones / Entregas | < 3% |
| Customer Claims | Reclamos / Entregas | < 1% |

---

## 8. PRÓXIMOS PASOS

### Fase 1: Core WMS
1. Crear tablas de almacenes, ubicaciones, tipos de ubicación
2. Implementar CRUD de configuración
3. Movimientos de inventario básicos
4. Quants (stock por ubicación)

### Fase 2: Picking/Packing/Shipping
1. Waves y Pick Lists
2. Packing con packages
3. Generación de shipments

### Fase 3: TMS
1. Carriers y vehículos
2. Zonas de entrega
3. Rutas y hojas de ruta
4. Tracking y POD

### Fase 4: Optimización
1. Slotting automático (ABC)
2. Optimización de rutas
3. Wave release automático
4. Integración carriers API

---

## 9. RESUMEN EJECUTIVO

Este diseño incorpora las mejores prácticas de:

| ERP | Features Incorporados |
|-----|----------------------|
| **SAP EWM** | Zone-based routing, Wave management, Task interleaving, Labor management |
| **Oracle WMS** | Cross-docking, Cartonization, Multi-channel fulfillment, 3PL support |
| **Dynamics 365** | AI-driven forecasting, Copilot assistance, Mobile-first, Real-time visibility |
| **Odoo 18** | Location hierarchy, Automatic replenishment, Barcode integration, Multi-step operations |
| **Manhattan/Körber** | Slotting optimization, Voice picking, Performance analytics |

### Ventajas Competitivas del Diseño

1. **100% Parametrizable**: Cada empresa configura su workflow
2. **Multi-Industry**: Adapta a distribuidoras, fábricas, 3PL, e-commerce
3. **Escalable**: Desde 1 almacén pequeño hasta red de DCs
4. **Mobile-First**: Diseñado para operación con dispositivos móviles
5. **Integrado**: Conecta con SIAC Commercial, Producción, Compras
6. **Trazabilidad Completa**: Lotes, seriales, vencimientos
7. **Delivery Zones Flexibles**: Días, horarios, carriers por zona
8. **Multi-Carrier**: Flota propia + terceros + couriers
