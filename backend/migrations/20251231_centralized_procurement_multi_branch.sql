-- ═══════════════════════════════════════════════════════════════════════════════
-- COMPRA CENTRALIZADA MULTI-SUCURSAL
-- Sistema de gestión de compras para empresas con múltiples sucursales
-- Fecha: 2025-12-31
--
-- Características:
--   - Consolidación de pedidos de múltiples sucursales
--   - Distribución automática a sucursales después de recepción
--   - Centro de distribución (CEDI) como punto de recepción central
--   - Transferencias automáticas entre depósitos
--   - Análisis de demanda consolidada
--
-- SSOT: Todas las tablas son multi-tenant con company_id
-- Integración: WMS, Procurement, Retail Analytics
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 1: ESTRUCTURA ORGANIZACIONAL MULTI-SUCURSAL                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 1.1 Tipos de ubicación/sucursal
CREATE TABLE IF NOT EXISTS retail_location_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    type_code VARCHAR(30) NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Características
    can_purchase BOOLEAN DEFAULT true, -- Puede generar pedidos de compra
    can_receive BOOLEAN DEFAULT true, -- Puede recibir mercadería
    can_sell BOOLEAN DEFAULT true, -- Puede vender al público
    is_distribution_center BOOLEAN DEFAULT false, -- Es CEDI

    -- Configuración
    default_warehouse_type VARCHAR(30),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, type_code)
);

-- Insertar tipos estándar
INSERT INTO retail_location_types (company_id, type_code, type_name, description, can_purchase, can_receive, can_sell, is_distribution_center)
SELECT
    c.id,
    t.type_code,
    t.type_name,
    t.description,
    t.can_purchase,
    t.can_receive,
    t.can_sell,
    t.is_distribution_center
FROM companies c
CROSS JOIN (VALUES
    ('cedi', 'Centro de Distribución', 'Centro de distribución central que recibe y distribuye a sucursales', true, true, false, true),
    ('store', 'Sucursal/Tienda', 'Punto de venta minorista', false, true, true, false),
    ('store_autonomous', 'Sucursal Autónoma', 'Sucursal con compra independiente', true, true, true, false),
    ('dark_store', 'Dark Store', 'Depósito para delivery sin atención al público', false, true, false, false),
    ('franchise', 'Franquicia', 'Punto de venta franquiciado', true, true, true, false)
) AS t(type_code, type_name, description, can_purchase, can_receive, can_sell, is_distribution_center)
WHERE NOT EXISTS (SELECT 1 FROM retail_location_types WHERE company_id = c.id)
ON CONFLICT (company_id, type_code) DO NOTHING;

-- 1.2 Sucursales/Ubicaciones
CREATE TABLE IF NOT EXISTS retail_locations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Identificación
    location_code VARCHAR(30) NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    location_type_id INTEGER REFERENCES retail_location_types(id),
    location_type VARCHAR(30), -- Backup si no usa la tabla de tipos

    -- Jerarquía
    parent_location_id INTEGER REFERENCES retail_locations(id), -- Para CEDI -> sucursales
    region_id INTEGER,
    zone_id INTEGER,

    -- Dirección
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Argentina',
    postal_code VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    -- Contacto
    manager_name VARCHAR(200),
    manager_email VARCHAR(200),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),

    -- Depósito asociado
    primary_warehouse_id INTEGER, -- wms_warehouses.id

    -- Configuración de compras
    procurement_mode VARCHAR(30) DEFAULT 'centralized',
    -- 'centralized': Compra vía CEDI
    -- 'autonomous': Compra directa
    -- 'hybrid': Algunos productos centralizados, otros directos
    autonomous_purchase_limit DECIMAL(15,2), -- Límite para compras autónomas
    requires_approval_above DECIMAL(15,2), -- Requiere aprobación sobre este monto

    -- CEDI asignado (para sucursales)
    assigned_cedi_id INTEGER REFERENCES retail_locations(id),
    delivery_priority INTEGER DEFAULT 5, -- 1-10, menor = más prioridad

    -- Horarios
    operating_hours JSONB DEFAULT '{}',
    -- {"monday": {"open": "08:00", "close": "20:00"}, ...}
    delivery_windows JSONB DEFAULT '[]',
    -- [{"day": 1, "from": "08:00", "to": "12:00"}, ...]

    -- Métricas (actualizadas por jobs)
    avg_monthly_sales DECIMAL(18,2),
    avg_monthly_orders INTEGER,
    avg_ticket DECIMAL(15,2),
    customer_count INTEGER,

    -- Estado
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'temporary_closed', 'opening_soon'
    opened_date DATE,
    closed_date DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, location_code)
);

CREATE INDEX idx_locations_company ON retail_locations(company_id, status);
CREATE INDEX idx_locations_cedi ON retail_locations(assigned_cedi_id);
CREATE INDEX idx_locations_parent ON retail_locations(parent_location_id);

COMMENT ON TABLE retail_locations IS 'Sucursales y centros de distribución de la empresa';
COMMENT ON COLUMN retail_locations.procurement_mode IS 'centralized: compra via CEDI, autonomous: compra directa, hybrid: mixto';
COMMENT ON COLUMN retail_locations.assigned_cedi_id IS 'Centro de distribución que abastece esta sucursal';

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 2: CONSOLIDACIÓN DE PEDIDOS                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 2.1 Solicitudes de sucursal (pedido interno)
CREATE TABLE IF NOT EXISTS retail_branch_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Sucursal solicitante
    requesting_location_id INTEGER NOT NULL REFERENCES retail_locations(id),
    requesting_warehouse_id INTEGER,

    -- Identificación
    request_number VARCHAR(50) NOT NULL,
    request_date TIMESTAMPTZ DEFAULT NOW(),
    needed_by_date DATE,
    priority VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'

    -- Origen
    origin_type VARCHAR(30) NOT NULL,
    -- 'manual': Ingresado manualmente por la sucursal
    -- 'auto_reorder': Generado por sistema de reorder
    -- 'forecast': Basado en pronóstico de demanda
    -- 'promotion': Para promoción planificada
    -- 'opening': Stock inicial de apertura

    -- Estado del flujo
    status VARCHAR(30) DEFAULT 'draft',
    -- 'draft': Borrador
    -- 'submitted': Enviado para consolidación
    -- 'consolidated': Incluido en orden de compra
    -- 'partially_fulfilled': Parcialmente entregado
    -- 'fulfilled': Completamente entregado
    -- 'cancelled': Cancelado

    -- Consolidación
    consolidated_order_id INTEGER, -- procurement_orders.id
    consolidated_at TIMESTAMPTZ,
    cedi_id INTEGER REFERENCES retail_locations(id),

    -- Totales
    total_items INTEGER DEFAULT 0,
    total_quantity DECIMAL(15,4) DEFAULT 0,
    estimated_value DECIMAL(18,2) DEFAULT 0,

    -- Notas
    notes TEXT,
    internal_notes TEXT,

    -- Usuario
    requested_by INTEGER,
    requested_by_name VARCHAR(200),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, request_number)
);

CREATE INDEX idx_branch_req_location ON retail_branch_requests(requesting_location_id, status);
CREATE INDEX idx_branch_req_company ON retail_branch_requests(company_id, request_date);
CREATE INDEX idx_branch_req_consolidated ON retail_branch_requests(consolidated_order_id);

-- 2.2 Items de solicitud de sucursal
CREATE TABLE IF NOT EXISTS retail_branch_request_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES retail_branch_requests(id) ON DELETE CASCADE,

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200),
    category_id INTEGER,

    -- Cantidad
    quantity_requested DECIMAL(15,4) NOT NULL,
    quantity_approved DECIMAL(15,4),
    quantity_dispatched DECIMAL(15,4) DEFAULT 0,
    quantity_received DECIMAL(15,4) DEFAULT 0,

    -- Unidades
    unit_of_measure VARCHAR(30),
    units_per_pack INTEGER DEFAULT 1,

    -- Cálculo (para priorización)
    current_stock DECIMAL(15,4),
    reorder_point DECIMAL(15,4),
    days_of_supply DECIMAL(10,2),
    forecast_demand_7d DECIMAL(15,4),

    -- Precio estimado
    estimated_unit_cost DECIMAL(12,2),
    estimated_line_total DECIMAL(15,2),

    -- Proveedor preferido (sugerencia)
    preferred_supplier_id INTEGER,
    preferred_supplier_name VARCHAR(200),

    -- Estado
    status VARCHAR(30) DEFAULT 'pending',
    -- 'pending', 'approved', 'rejected', 'consolidated', 'dispatched', 'received'
    rejection_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_branch_req_items_request ON retail_branch_request_items(request_id);
CREATE INDEX idx_branch_req_items_product ON retail_branch_request_items(product_id);

-- 2.3 Órdenes de compra consolidadas
CREATE TABLE IF NOT EXISTS retail_consolidated_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Centro de distribución que consolida
    cedi_location_id INTEGER NOT NULL REFERENCES retail_locations(id),
    receiving_warehouse_id INTEGER NOT NULL,

    -- Identificación
    consolidation_number VARCHAR(50) NOT NULL,
    consolidation_date TIMESTAMPTZ DEFAULT NOW(),

    -- Proveedor
    supplier_id INTEGER NOT NULL,
    supplier_name VARCHAR(200),

    -- Estado
    status VARCHAR(30) DEFAULT 'draft',
    -- 'draft': En preparación
    -- 'pending_approval': Pendiente aprobación
    -- 'approved': Aprobado, listo para enviar
    -- 'sent_to_supplier': Enviado al proveedor
    -- 'partially_received': Recepción parcial
    -- 'received': Recibido completamente
    -- 'distributing': En proceso de distribución a sucursales
    -- 'completed': Distribuido completamente
    -- 'cancelled': Cancelado

    -- Orden de compra generada
    procurement_order_id INTEGER, -- procurement_orders.id
    procurement_order_number VARCHAR(50),

    -- Sucursales incluidas
    branch_locations_count INTEGER DEFAULT 0,
    branch_requests JSONB DEFAULT '[]', -- Array de request_ids incluidos

    -- Totales
    total_items INTEGER DEFAULT 0,
    total_quantity DECIMAL(15,4) DEFAULT 0,
    subtotal DECIMAL(18,2) DEFAULT 0,
    tax_amount DECIMAL(18,2) DEFAULT 0,
    total_amount DECIMAL(18,2) DEFAULT 0,

    -- Fechas
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    distribution_start_date DATE,
    distribution_end_date DATE,

    -- Aprobación
    requires_approval BOOLEAN DEFAULT false,
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,

    -- Notas
    notes TEXT,

    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, consolidation_number)
);

CREATE INDEX idx_consol_orders_company ON retail_consolidated_orders(company_id, status);
CREATE INDEX idx_consol_orders_cedi ON retail_consolidated_orders(cedi_location_id, status);
CREATE INDEX idx_consol_orders_supplier ON retail_consolidated_orders(supplier_id);

-- 2.4 Items de orden consolidada con distribución
CREATE TABLE IF NOT EXISTS retail_consolidated_order_items (
    id SERIAL PRIMARY KEY,
    consolidated_order_id INTEGER NOT NULL REFERENCES retail_consolidated_orders(id) ON DELETE CASCADE,

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200),
    category_id INTEGER,

    -- Cantidad total consolidada
    total_quantity DECIMAL(15,4) NOT NULL,
    quantity_received DECIMAL(15,4) DEFAULT 0,
    quantity_distributed DECIMAL(15,4) DEFAULT 0,
    quantity_pending DECIMAL(15,4),

    -- Precio
    unit_cost DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,

    -- Distribución planificada por sucursal
    distribution_plan JSONB NOT NULL DEFAULT '[]',
    -- [{location_id, location_name, quantity_planned, quantity_dispatched, quantity_received, request_item_id}]

    -- Unidades
    unit_of_measure VARCHAR(30),
    units_per_pack INTEGER DEFAULT 1,

    -- Trazabilidad
    source_request_items JSONB DEFAULT '[]', -- Array de request_item_ids originales

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consol_items_order ON retail_consolidated_order_items(consolidated_order_id);
CREATE INDEX idx_consol_items_product ON retail_consolidated_order_items(product_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 3: DISTRIBUCIÓN A SUCURSALES                                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 3.1 Órdenes de distribución (desde CEDI a sucursal)
CREATE TABLE IF NOT EXISTS retail_distribution_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Origen (CEDI)
    source_location_id INTEGER NOT NULL REFERENCES retail_locations(id),
    source_warehouse_id INTEGER NOT NULL,

    -- Destino (Sucursal)
    destination_location_id INTEGER NOT NULL REFERENCES retail_locations(id),
    destination_warehouse_id INTEGER NOT NULL,

    -- Identificación
    distribution_number VARCHAR(50) NOT NULL,
    distribution_date TIMESTAMPTZ DEFAULT NOW(),

    -- Origen del pedido
    consolidated_order_id INTEGER REFERENCES retail_consolidated_orders(id),
    branch_request_id INTEGER REFERENCES retail_branch_requests(id),
    origin_type VARCHAR(30) NOT NULL,
    -- 'consolidated_order': Desde orden consolidada
    -- 'manual_transfer': Transferencia manual
    -- 'rebalance': Rebalanceo de stock
    -- 'emergency': Transferencia de emergencia

    -- Estado
    status VARCHAR(30) DEFAULT 'draft',
    -- 'draft': En preparación
    -- 'picking': En proceso de picking
    -- 'ready_to_ship': Listo para despacho
    -- 'in_transit': En tránsito
    -- 'delivered': Entregado
    -- 'received': Recibido y confirmado
    -- 'cancelled': Cancelado

    -- Totales
    total_items INTEGER DEFAULT 0,
    total_quantity DECIMAL(15,4) DEFAULT 0,
    total_value DECIMAL(18,2) DEFAULT 0,

    -- Transporte
    transport_type VARCHAR(30), -- 'own_fleet', 'third_party', 'pickup'
    carrier_name VARCHAR(100),
    vehicle_plate VARCHAR(20),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(50),
    tracking_number VARCHAR(100),

    -- Fechas
    scheduled_dispatch_date TIMESTAMPTZ,
    actual_dispatch_date TIMESTAMPTZ,
    scheduled_delivery_date TIMESTAMPTZ,
    actual_delivery_date TIMESTAMPTZ,

    -- Recepción
    received_by INTEGER,
    received_by_name VARCHAR(200),
    received_at TIMESTAMPTZ,
    reception_notes TEXT,

    -- Documentos
    dispatch_document_url VARCHAR(500),
    reception_document_url VARCHAR(500),

    -- WMS Transfer asociado
    wms_transfer_id INTEGER, -- wms_transfers.id

    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, distribution_number)
);

CREATE INDEX idx_distrib_orders_company ON retail_distribution_orders(company_id, status);
CREATE INDEX idx_distrib_orders_source ON retail_distribution_orders(source_location_id, status);
CREATE INDEX idx_distrib_orders_dest ON retail_distribution_orders(destination_location_id, status);

-- 3.2 Items de distribución
CREATE TABLE IF NOT EXISTS retail_distribution_order_items (
    id SERIAL PRIMARY KEY,
    distribution_order_id INTEGER NOT NULL REFERENCES retail_distribution_orders(id) ON DELETE CASCADE,

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200),
    category_id INTEGER,

    -- Cantidad
    quantity_requested DECIMAL(15,4) NOT NULL,
    quantity_picked DECIMAL(15,4) DEFAULT 0,
    quantity_shipped DECIMAL(15,4) DEFAULT 0,
    quantity_received DECIMAL(15,4) DEFAULT 0,
    quantity_damaged DECIMAL(15,4) DEFAULT 0,

    -- Lotes (si aplica)
    batch_allocations JSONB DEFAULT '[]',
    -- [{batch_number, lot_id, quantity, expiry_date}]

    -- Ubicación en CEDI
    source_location_code VARCHAR(50),
    source_bin_id INTEGER,

    -- Precio (valor de inventario)
    unit_cost DECIMAL(12,2),
    line_value DECIMAL(15,2),

    -- Estado
    status VARCHAR(30) DEFAULT 'pending',
    -- 'pending', 'picking', 'picked', 'shipped', 'received', 'partial_received'

    -- Discrepancias
    discrepancy_type VARCHAR(30), -- 'shortage', 'excess', 'damaged', 'wrong_product'
    discrepancy_notes TEXT,
    discrepancy_resolved BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_distrib_items_order ON retail_distribution_order_items(distribution_order_id);
CREATE INDEX idx_distrib_items_product ON retail_distribution_order_items(product_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 4: ANÁLISIS DE DEMANDA CONSOLIDADA                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 4.1 Demanda agregada por producto (multi-sucursal)
CREATE TABLE IF NOT EXISTS retail_consolidated_demand (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Período
    period_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    category_id INTEGER,

    -- Proveedor principal
    primary_supplier_id INTEGER,

    -- Demanda total de todas las sucursales
    total_demand_qty DECIMAL(18,4) NOT NULL,
    total_demand_value DECIMAL(18,2),

    -- Demanda por sucursal (breakdown)
    demand_by_location JSONB NOT NULL DEFAULT '{}',
    -- {"LOC-001": {"qty": 100, "value": 5000}, "LOC-002": {"qty": 50, "value": 2500}}

    -- Stock total en red
    total_network_stock DECIMAL(18,4),
    stock_by_location JSONB DEFAULT '{}',
    -- {"CEDI": 500, "LOC-001": 50, "LOC-002": 30}

    -- Métricas
    locations_with_demand INTEGER,
    locations_with_stockout INTEGER,
    network_days_of_supply DECIMAL(10,2),

    -- Para forecasting
    yoy_growth_rate DECIMAL(8,4), -- Year over year
    mom_growth_rate DECIMAL(8,4), -- Month over month
    trend_direction VARCHAR(20), -- 'up', 'down', 'stable'

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, period_date, period_type, product_id)
);

CREATE INDEX idx_consol_demand_company ON retail_consolidated_demand(company_id, period_date);
CREATE INDEX idx_consol_demand_product ON retail_consolidated_demand(company_id, product_id, period_date);

-- 4.2 Forecast de compra consolidada
CREATE TABLE IF NOT EXISTS retail_consolidated_purchase_forecast (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Período del forecast
    forecast_date DATE NOT NULL,
    forecast_horizon VARCHAR(20) NOT NULL, -- 'weekly', 'monthly', 'quarterly'

    -- Producto
    product_id INTEGER NOT NULL,
    product_code VARCHAR(50),
    category_id INTEGER,

    -- Proveedor
    supplier_id INTEGER NOT NULL,
    supplier_name VARCHAR(200),

    -- Cantidad total a comprar
    total_purchase_qty DECIMAL(18,4) NOT NULL,

    -- Distribución planificada por sucursal
    distribution_forecast JSONB NOT NULL DEFAULT '{}',
    -- {"LOC-001": {"qty": 100, "priority": 1}, "LOC-002": {"qty": 50, "priority": 2}}

    -- Stock actual en red
    current_network_stock DECIMAL(18,4),
    cedi_stock DECIMAL(18,4),

    -- Demanda pronosticada
    forecasted_demand_total DECIMAL(18,4),
    forecasted_demand_by_location JSONB DEFAULT '{}',

    -- Costo estimado
    estimated_unit_cost DECIMAL(12,2),
    estimated_total_cost DECIMAL(18,2),

    -- Timing óptimo
    optimal_order_date DATE,
    expected_delivery_date DATE,
    lead_time_days INTEGER,

    -- Modelo
    model_type VARCHAR(30),
    confidence_score DECIMAL(5,4),

    -- Estado
    status VARCHAR(20) DEFAULT 'active',
    -- 'active', 'converted_to_order', 'superseded', 'expired'
    converted_order_id INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, forecast_date, forecast_horizon, product_id, supplier_id)
);

CREATE INDEX idx_purchase_forecast_company ON retail_consolidated_purchase_forecast(company_id, forecast_date);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 5: FUNCIONES PARA COMPRA CENTRALIZADA                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 5.1 Función para consolidar solicitudes de sucursales
CREATE OR REPLACE FUNCTION retail_consolidate_branch_requests(
    p_company_id INTEGER,
    p_cedi_id INTEGER,
    p_supplier_id INTEGER,
    p_request_ids INTEGER[] DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_consolidated_id INTEGER;
    v_consolidation_number VARCHAR(50);
    v_total_items INTEGER := 0;
    v_total_qty DECIMAL(15,4) := 0;
    v_total_value DECIMAL(18,2) := 0;
BEGIN
    -- Generar número de consolidación
    v_consolidation_number := 'CONS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
        LPAD((SELECT COALESCE(MAX(id), 0) + 1 FROM retail_consolidated_orders)::TEXT, 5, '0');

    -- Crear orden consolidada
    INSERT INTO retail_consolidated_orders (
        company_id, cedi_location_id, receiving_warehouse_id,
        consolidation_number, supplier_id, supplier_name, status
    )
    SELECT
        p_company_id,
        p_cedi_id,
        l.primary_warehouse_id,
        v_consolidation_number,
        p_supplier_id,
        s.trade_name,
        'draft'
    FROM retail_locations l
    JOIN wms_suppliers s ON s.id = p_supplier_id
    WHERE l.id = p_cedi_id
    RETURNING id INTO v_consolidated_id;

    -- Agregar items consolidados
    INSERT INTO retail_consolidated_order_items (
        consolidated_order_id, product_id, product_code, product_name,
        category_id, total_quantity, unit_cost, line_total,
        unit_of_measure, distribution_plan, source_request_items
    )
    SELECT
        v_consolidated_id,
        ri.product_id,
        ri.product_code,
        ri.product_name,
        ri.category_id,
        SUM(ri.quantity_requested),
        COALESCE(pc.total_cost, ri.estimated_unit_cost, 0),
        SUM(ri.quantity_requested) * COALESCE(pc.total_cost, ri.estimated_unit_cost, 0),
        ri.unit_of_measure,
        jsonb_agg(jsonb_build_object(
            'location_id', r.requesting_location_id,
            'location_name', l.location_name,
            'quantity_planned', ri.quantity_requested,
            'quantity_dispatched', 0,
            'quantity_received', 0,
            'request_item_id', ri.id
        )),
        array_agg(ri.id)
    FROM retail_branch_request_items ri
    JOIN retail_branch_requests r ON ri.request_id = r.id
    JOIN retail_locations l ON r.requesting_location_id = l.id
    LEFT JOIN wms_product_costs pc ON ri.product_id = pc.product_id AND pc.is_current = true
    WHERE r.company_id = p_company_id
    AND r.status = 'submitted'
    AND ri.preferred_supplier_id = p_supplier_id
    AND (p_request_ids IS NULL OR r.id = ANY(p_request_ids))
    GROUP BY ri.product_id, ri.product_code, ri.product_name, ri.category_id,
             ri.unit_of_measure, pc.total_cost, ri.estimated_unit_cost;

    -- Actualizar solicitudes originales
    UPDATE retail_branch_requests
    SET
        status = 'consolidated',
        consolidated_order_id = v_consolidated_id,
        consolidated_at = NOW(),
        cedi_id = p_cedi_id
    WHERE company_id = p_company_id
    AND status = 'submitted'
    AND (p_request_ids IS NULL OR id = ANY(p_request_ids))
    AND id IN (
        SELECT DISTINCT r.id
        FROM retail_branch_requests r
        JOIN retail_branch_request_items ri ON r.id = ri.request_id
        WHERE ri.preferred_supplier_id = p_supplier_id
    );

    -- Actualizar items de solicitudes
    UPDATE retail_branch_request_items
    SET status = 'consolidated', quantity_approved = quantity_requested
    WHERE request_id IN (
        SELECT id FROM retail_branch_requests WHERE consolidated_order_id = v_consolidated_id
    );

    -- Calcular totales
    SELECT
        COUNT(*), SUM(total_quantity), SUM(line_total)
    INTO v_total_items, v_total_qty, v_total_value
    FROM retail_consolidated_order_items
    WHERE consolidated_order_id = v_consolidated_id;

    -- Actualizar orden consolidada con totales
    UPDATE retail_consolidated_orders
    SET
        total_items = v_total_items,
        total_quantity = v_total_qty,
        subtotal = v_total_value,
        total_amount = v_total_value,
        branch_locations_count = (
            SELECT COUNT(DISTINCT r.requesting_location_id)
            FROM retail_branch_requests r
            WHERE r.consolidated_order_id = v_consolidated_id
        ),
        branch_requests = (
            SELECT jsonb_agg(r.id)
            FROM retail_branch_requests r
            WHERE r.consolidated_order_id = v_consolidated_id
        )
    WHERE id = v_consolidated_id;

    RETURN v_consolidated_id;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Función para crear distribución desde orden consolidada
CREATE OR REPLACE FUNCTION retail_create_distribution_from_consolidated(
    p_consolidated_order_id INTEGER,
    p_location_id INTEGER DEFAULT NULL -- NULL = todas las sucursales
) RETURNS INTEGER AS $$
DECLARE
    v_distribution_id INTEGER;
    v_rec RECORD;
    v_dist_count INTEGER := 0;
BEGIN
    -- Iterar por cada sucursal en la distribución
    FOR v_rec IN
        SELECT DISTINCT
            co.company_id,
            co.cedi_location_id,
            l.primary_warehouse_id as source_warehouse_id,
            (d.elem->>'location_id')::INTEGER as dest_location_id,
            dl.primary_warehouse_id as dest_warehouse_id,
            d.elem->>'location_name' as dest_location_name
        FROM retail_consolidated_orders co
        JOIN retail_locations l ON co.cedi_location_id = l.id
        JOIN retail_consolidated_order_items coi ON co.id = coi.consolidated_order_id
        CROSS JOIN LATERAL jsonb_array_elements(coi.distribution_plan) as d(elem)
        JOIN retail_locations dl ON (d.elem->>'location_id')::INTEGER = dl.id
        WHERE co.id = p_consolidated_order_id
        AND (p_location_id IS NULL OR (d.elem->>'location_id')::INTEGER = p_location_id)
    LOOP
        -- Generar número de distribución
        INSERT INTO retail_distribution_orders (
            company_id, source_location_id, source_warehouse_id,
            destination_location_id, destination_warehouse_id,
            distribution_number, origin_type, consolidated_order_id, status
        ) VALUES (
            v_rec.company_id,
            v_rec.cedi_location_id,
            v_rec.source_warehouse_id,
            v_rec.dest_location_id,
            v_rec.dest_warehouse_id,
            'DIST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                LPAD((SELECT COALESCE(MAX(id), 0) + 1 FROM retail_distribution_orders)::TEXT, 6, '0'),
            'consolidated_order',
            p_consolidated_order_id,
            'draft'
        ) RETURNING id INTO v_distribution_id;

        -- Agregar items
        INSERT INTO retail_distribution_order_items (
            distribution_order_id, product_id, product_code, product_name,
            category_id, quantity_requested, unit_cost, line_value, status
        )
        SELECT
            v_distribution_id,
            coi.product_id,
            coi.product_code,
            coi.product_name,
            coi.category_id,
            (d.elem->>'quantity_planned')::DECIMAL,
            coi.unit_cost,
            (d.elem->>'quantity_planned')::DECIMAL * coi.unit_cost,
            'pending'
        FROM retail_consolidated_order_items coi
        CROSS JOIN LATERAL jsonb_array_elements(coi.distribution_plan) as d(elem)
        WHERE coi.consolidated_order_id = p_consolidated_order_id
        AND (d.elem->>'location_id')::INTEGER = v_rec.dest_location_id;

        -- Actualizar totales
        UPDATE retail_distribution_orders
        SET
            total_items = (SELECT COUNT(*) FROM retail_distribution_order_items WHERE distribution_order_id = v_distribution_id),
            total_quantity = (SELECT SUM(quantity_requested) FROM retail_distribution_order_items WHERE distribution_order_id = v_distribution_id),
            total_value = (SELECT SUM(line_value) FROM retail_distribution_order_items WHERE distribution_order_id = v_distribution_id)
        WHERE id = v_distribution_id;

        v_dist_count := v_dist_count + 1;
    END LOOP;

    -- Actualizar estado de orden consolidada
    IF v_dist_count > 0 THEN
        UPDATE retail_consolidated_orders
        SET status = 'distributing', distribution_start_date = CURRENT_DATE
        WHERE id = p_consolidated_order_id;
    END IF;

    RETURN v_dist_count;
END;
$$ LANGUAGE plpgsql;

-- 5.3 Función para calcular demanda consolidada
CREATE OR REPLACE FUNCTION retail_calculate_consolidated_demand(
    p_company_id INTEGER,
    p_period_date DATE,
    p_period_type VARCHAR DEFAULT 'daily'
) RETURNS INTEGER AS $$
DECLARE
    v_inserted INTEGER := 0;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    -- Determinar rango de fechas según tipo de período
    IF p_period_type = 'daily' THEN
        v_period_start := p_period_date;
        v_period_end := p_period_date;
    ELSIF p_period_type = 'weekly' THEN
        v_period_start := DATE_TRUNC('week', p_period_date)::DATE;
        v_period_end := v_period_start + INTERVAL '6 days';
    ELSIF p_period_type = 'monthly' THEN
        v_period_start := DATE_TRUNC('month', p_period_date)::DATE;
        v_period_end := (DATE_TRUNC('month', p_period_date) + INTERVAL '1 month - 1 day')::DATE;
    END IF;

    INSERT INTO retail_consolidated_demand (
        company_id, period_date, period_type, product_id, product_code,
        product_name, category_id, primary_supplier_id,
        total_demand_qty, total_demand_value, demand_by_location,
        locations_with_demand
    )
    SELECT
        p_company_id,
        p_period_date,
        p_period_type,
        rti.product_id,
        rti.product_code,
        rti.product_name,
        rti.category_id,
        p.supplier_id,
        SUM(rti.quantity),
        SUM(rti.line_total),
        jsonb_object_agg(
            l.location_code,
            jsonb_build_object('qty', SUM(rti.quantity), 'value', SUM(rti.line_total))
        ),
        COUNT(DISTINCT rt.branch_id)
    FROM retail_transaction_items rti
    JOIN retail_transactions rt ON rti.transaction_id = rt.id
    JOIN retail_locations l ON rt.branch_id = l.id
    LEFT JOIN wms_products p ON rti.product_id = p.id
    WHERE rt.company_id = p_company_id
    AND rt.transaction_date BETWEEN v_period_start AND v_period_end
    AND rti.product_id IS NOT NULL
    GROUP BY rti.product_id, rti.product_code, rti.product_name, rti.category_id, p.supplier_id
    ON CONFLICT (company_id, period_date, period_type, product_id) DO UPDATE SET
        total_demand_qty = EXCLUDED.total_demand_qty,
        total_demand_value = EXCLUDED.total_demand_value,
        demand_by_location = EXCLUDED.demand_by_location,
        locations_with_demand = EXCLUDED.locations_with_demand;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    RETURN v_inserted;
END;
$$ LANGUAGE plpgsql;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 6: VISTAS PARA COMPRA CENTRALIZADA                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 6.1 Vista de solicitudes pendientes de consolidar
CREATE OR REPLACE VIEW retail_pending_consolidation AS
SELECT
    r.company_id,
    ri.preferred_supplier_id as supplier_id,
    s.trade_name as supplier_name,
    COUNT(DISTINCT r.id) as requests_count,
    COUNT(DISTINCT r.requesting_location_id) as locations_count,
    COUNT(DISTINCT ri.product_id) as products_count,
    SUM(ri.quantity_requested) as total_quantity,
    SUM(ri.estimated_line_total) as estimated_value,
    MIN(r.needed_by_date) as earliest_needed_date,
    array_agg(DISTINCT r.id) as request_ids
FROM retail_branch_requests r
JOIN retail_branch_request_items ri ON r.id = ri.request_id
LEFT JOIN wms_suppliers s ON ri.preferred_supplier_id = s.id
WHERE r.status = 'submitted'
AND ri.status = 'pending'
GROUP BY r.company_id, ri.preferred_supplier_id, s.trade_name;

-- 6.2 Vista de estado de distribución por sucursal
CREATE OR REPLACE VIEW retail_distribution_status AS
SELECT
    co.company_id,
    co.id as consolidated_order_id,
    co.consolidation_number,
    co.status as order_status,
    l.id as location_id,
    l.location_code,
    l.location_name,
    COUNT(DISTINCT doi.product_id) as products_count,
    SUM(doi.quantity_requested) as qty_requested,
    SUM(doi.quantity_shipped) as qty_shipped,
    SUM(doi.quantity_received) as qty_received,
    SUM(doi.line_value) as total_value,
    do.status as distribution_status,
    do.scheduled_delivery_date,
    do.actual_delivery_date
FROM retail_consolidated_orders co
JOIN retail_consolidated_order_items coi ON co.id = coi.consolidated_order_id
CROSS JOIN LATERAL jsonb_array_elements(coi.distribution_plan) as dp(elem)
JOIN retail_locations l ON (dp.elem->>'location_id')::INTEGER = l.id
LEFT JOIN retail_distribution_orders do ON do.consolidated_order_id = co.id
    AND do.destination_location_id = l.id
LEFT JOIN retail_distribution_order_items doi ON do.id = doi.distribution_order_id
GROUP BY co.company_id, co.id, co.consolidation_number, co.status,
         l.id, l.location_code, l.location_name, do.status,
         do.scheduled_delivery_date, do.actual_delivery_date;

-- 6.3 Vista de stock en red
CREATE OR REPLACE VIEW retail_network_stock AS
SELECT
    w.company_id,
    p.id as product_id,
    p.internal_code as product_code,
    p.name as product_name,
    p.category_id,
    c.name as category_name,
    SUM(COALESCE(sm.available_quantity, 0)) as total_network_stock,
    jsonb_object_agg(
        l.location_code,
        COALESCE(sm.available_quantity, 0)
    ) as stock_by_location,
    COUNT(DISTINCT w.id) as warehouses_count,
    COUNT(DISTINCT CASE WHEN COALESCE(sm.available_quantity, 0) <= 0 THEN w.id END) as stockout_locations,
    COUNT(DISTINCT CASE WHEN COALESCE(sm.available_quantity, 0) <= p.reorder_point THEN w.id END) as low_stock_locations
FROM wms_products p
JOIN wms_warehouses w ON p.warehouse_id = w.id
LEFT JOIN wms_stock_movements sm ON p.id = sm.product_id AND sm.is_current = true
LEFT JOIN retail_locations l ON w.id = l.primary_warehouse_id
LEFT JOIN wms_categories c ON p.category_id = c.id
WHERE p.is_active = true
GROUP BY w.company_id, p.id, p.internal_code, p.name, p.category_id, c.name;

-- Comentarios
COMMENT ON FUNCTION retail_consolidate_branch_requests IS 'Consolida solicitudes de múltiples sucursales en una orden de compra centralizada';
COMMENT ON FUNCTION retail_create_distribution_from_consolidated IS 'Crea órdenes de distribución desde CEDI a sucursales a partir de orden consolidada';
COMMENT ON VIEW retail_pending_consolidation IS 'Vista de solicitudes de sucursales pendientes de consolidar, agrupadas por proveedor';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRACIÓN
-- Total de nuevas tablas: 10
-- Total de funciones: 3
-- Total de vistas: 3
-- ═══════════════════════════════════════════════════════════════════════════════
