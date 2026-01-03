-- =================================================================
-- WMS SISTEMA DE TRANSFERENCIAS Y TRAZABILIDAD POR LOTES
-- =================================================================
-- Adaptado a estructura existente:
-- wms_stock (product_id, warehouse_id) → wms_stock_batches (stock_id, lot_number, expiry_date)
-- =================================================================

-- =============================================
-- 1. TIPOS DE DEPÓSITO (agregar showroom/salón)
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_warehouses' AND column_name = 'warehouse_category'
    ) THEN
        ALTER TABLE wms_warehouses ADD COLUMN warehouse_category VARCHAR(50) DEFAULT 'storage';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_warehouses' AND column_name = 'is_sales_point'
    ) THEN
        ALTER TABLE wms_warehouses ADD COLUMN is_sales_point BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =============================================
-- 2. PRODUCTOS - Control de Vencimiento
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_products' AND column_name = 'requires_expiry_control'
    ) THEN
        ALTER TABLE wms_products ADD COLUMN requires_expiry_control BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_products' AND column_name = 'expiry_alert_days'
    ) THEN
        ALTER TABLE wms_products ADD COLUMN expiry_alert_days INTEGER DEFAULT 30;
    END IF;
END $$;

-- =============================================
-- 3. TRANSFERENCIAS ENTRE DEPÓSITOS
-- =============================================

CREATE TABLE IF NOT EXISTS wms_transfers (
    id SERIAL PRIMARY KEY,
    transfer_number VARCHAR(50) NOT NULL UNIQUE,
    source_warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    destination_warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),

    status VARCHAR(30) NOT NULL DEFAULT 'draft',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    created_by UUID REFERENCES users(user_id),
    approved_by UUID REFERENCES users(user_id),
    dispatched_by UUID REFERENCES users(user_id),
    received_by UUID REFERENCES users(user_id),
    confirmed_by UUID REFERENCES users(user_id),
    cancelled_by UUID REFERENCES users(user_id),

    transfer_reason TEXT,
    cancellation_reason TEXT,
    rejection_reason TEXT,
    notes TEXT,
    reception_notes TEXT,

    priority VARCHAR(20) DEFAULT 'normal',
    expected_delivery_date DATE,

    fifo_warnings_ignored BOOLEAN DEFAULT FALSE,
    fifo_warning_details JSONB,

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_different_warehouses CHECK (source_warehouse_id != destination_warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_wms_transfers_status ON wms_transfers(status);
CREATE INDEX IF NOT EXISTS idx_wms_transfers_source ON wms_transfers(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_transfers_dest ON wms_transfers(destination_warehouse_id);

-- =============================================
-- 4. LÍNEAS DE TRANSFERENCIA (por lote)
-- =============================================

CREATE TABLE IF NOT EXISTS wms_transfer_lines (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER NOT NULL REFERENCES wms_transfers(id) ON DELETE CASCADE,

    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    source_stock_id INTEGER REFERENCES wms_stock(id),
    source_batch_id INTEGER REFERENCES wms_stock_batches(id),

    quantity_requested DECIMAL(15,4) NOT NULL,
    quantity_dispatched DECIMAL(15,4) DEFAULT 0,
    quantity_received DECIMAL(15,4) DEFAULT 0,
    quantity_confirmed DECIMAL(15,4) DEFAULT 0,

    quantity_difference DECIMAL(15,4) GENERATED ALWAYS AS (quantity_dispatched - quantity_received) STORED,
    difference_reason TEXT,

    source_location_id INTEGER REFERENCES wms_locations(id),
    destination_location_id INTEGER REFERENCES wms_locations(id),

    lot_number VARCHAR(100),
    expiry_date DATE,

    notes TEXT,
    line_status VARCHAR(20) DEFAULT 'pending',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_positive_qty CHECK (quantity_requested > 0)
);

CREATE INDEX IF NOT EXISTS idx_wms_transfer_lines_transfer ON wms_transfer_lines(transfer_id);
CREATE INDEX IF NOT EXISTS idx_wms_transfer_lines_product ON wms_transfer_lines(product_id);

-- =============================================
-- 5. RESERVAS DE STOCK (Bloqueo Concurrente)
-- =============================================

CREATE TABLE IF NOT EXISTS wms_stock_reservations (
    id SERIAL PRIMARY KEY,

    stock_id INTEGER NOT NULL REFERENCES wms_stock(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    location_id INTEGER REFERENCES wms_locations(id),

    quantity_reserved DECIMAL(15,4) NOT NULL,

    reserved_by UUID NOT NULL REFERENCES users(user_id),
    reservation_type VARCHAR(30) NOT NULL,
    reference_type VARCHAR(30),
    reference_id INTEGER,

    status VARCHAR(20) DEFAULT 'active',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_wms_reservations_stock ON wms_stock_reservations(stock_id);
CREATE INDEX IF NOT EXISTS idx_wms_reservations_batch ON wms_stock_reservations(batch_id);
CREATE INDEX IF NOT EXISTS idx_wms_reservations_status ON wms_stock_reservations(status);

-- =============================================
-- 6. HISTORIAL COMPLETO DE TRAZABILIDAD
-- =============================================

CREATE TABLE IF NOT EXISTS wms_product_lifecycle (
    id SERIAL PRIMARY KEY,

    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    stock_id INTEGER REFERENCES wms_stock(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    lot_number VARCHAR(100),

    event_type VARCHAR(50) NOT NULL,

    quantity DECIMAL(15,4) NOT NULL,
    quantity_before DECIMAL(15,4),
    quantity_after DECIMAL(15,4),

    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    location_id INTEGER REFERENCES wms_locations(id),

    reference_type VARCHAR(50),
    reference_id INTEGER,
    reference_number VARCHAR(100),

    source_warehouse_id INTEGER REFERENCES wms_warehouses(id),
    destination_warehouse_id INTEGER REFERENCES wms_warehouses(id),

    unit_cost DECIMAL(15,4),
    total_value DECIMAL(15,4),

    performed_by UUID REFERENCES users(user_id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),

    reason TEXT,
    notes TEXT,

    is_estimated BOOLEAN DEFAULT FALSE,
    estimation_method VARCHAR(50),

    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_wms_lifecycle_product ON wms_product_lifecycle(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_lifecycle_batch ON wms_product_lifecycle(batch_id);
CREATE INDEX IF NOT EXISTS idx_wms_lifecycle_event ON wms_product_lifecycle(event_type);
CREATE INDEX IF NOT EXISTS idx_wms_lifecycle_date ON wms_product_lifecycle(performed_at);

-- =============================================
-- 7. ALERTAS DE VENCIMIENTO
-- =============================================

CREATE TABLE IF NOT EXISTS wms_expiry_alerts (
    id SERIAL PRIMARY KEY,

    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    stock_id INTEGER NOT NULL REFERENCES wms_stock(id),
    batch_id INTEGER NOT NULL REFERENCES wms_stock_batches(id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),

    lot_number VARCHAR(100),
    expiry_date DATE NOT NULL,
    quantity_remaining DECIMAL(15,4),

    alert_type VARCHAR(30) NOT NULL,
    days_to_expiry INTEGER,

    status VARCHAR(20) DEFAULT 'pending',
    acknowledged_by UUID REFERENCES users(user_id),
    acknowledged_at TIMESTAMPTZ,
    resolution_notes TEXT,

    notification_sent BOOLEAN DEFAULT FALSE,
    notification_id INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_expiry_alerts_status ON wms_expiry_alerts(status);
CREATE INDEX IF NOT EXISTS idx_wms_expiry_alerts_date ON wms_expiry_alerts(expiry_date);

-- =============================================
-- 8. ALERTAS FIFO (cuando se ignora orden)
-- =============================================

CREATE TABLE IF NOT EXISTS wms_fifo_violations (
    id SERIAL PRIMARY KEY,

    transfer_id INTEGER REFERENCES wms_transfers(id),
    transfer_line_id INTEGER REFERENCES wms_transfer_lines(id),

    product_id INTEGER NOT NULL REFERENCES wms_products(id),

    selected_batch_id INTEGER REFERENCES wms_stock_batches(id),
    selected_lot_number VARCHAR(100),
    selected_expiry_date DATE,

    recommended_batch_id INTEGER REFERENCES wms_stock_batches(id),
    recommended_lot_number VARCHAR(100),
    recommended_expiry_date DATE,

    days_difference INTEGER,

    status VARCHAR(20) DEFAULT 'pending',
    ignored_by UUID REFERENCES users(user_id),
    ignored_at TIMESTAMPTZ,
    ignore_reason TEXT,

    notification_sent BOOLEAN DEFAULT FALSE,
    notification_id INTEGER,
    escalation_level INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_fifo_violations_transfer ON wms_fifo_violations(transfer_id);
CREATE INDEX IF NOT EXISTS idx_wms_fifo_violations_status ON wms_fifo_violations(status);

-- =============================================
-- 9. CONFIGURACIÓN DE AGENTES DE MONITOREO
-- =============================================

CREATE TABLE IF NOT EXISTS wms_monitoring_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    expiry_check_enabled BOOLEAN DEFAULT TRUE,
    expiry_check_interval_hours INTEGER DEFAULT 24,
    expiry_alert_days_default INTEGER DEFAULT 30,
    expiry_imminent_days INTEGER DEFAULT 7,

    fifo_enforcement_level VARCHAR(20) DEFAULT 'warn',
    fifo_apply_to_showroom_only BOOLEAN DEFAULT TRUE,

    alert_hierarchy JSONB DEFAULT '["warehouse_manager", "operations_supervisor", "operations_manager"]',

    last_expiry_check_at TIMESTAMPTZ,
    last_expiry_check_result JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id)
);

-- =============================================
-- 10. VENTAS ESTIMADAS FIFO (para salón)
-- =============================================

CREATE TABLE IF NOT EXISTS wms_sales_fifo_allocation (
    id SERIAL PRIMARY KEY,

    sale_id INTEGER,
    sale_line_id INTEGER,
    sale_date TIMESTAMPTZ NOT NULL,

    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    stock_id INTEGER NOT NULL REFERENCES wms_stock(id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),

    batch_id INTEGER REFERENCES wms_stock_batches(id),
    lot_number VARCHAR(100),

    quantity_allocated DECIMAL(15,4) NOT NULL,

    allocation_method VARCHAR(30) DEFAULT 'fifo_entry_date',

    allocated_at TIMESTAMPTZ DEFAULT NOW(),
    is_estimated BOOLEAN DEFAULT TRUE,

    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_wms_sales_fifo_product ON wms_sales_fifo_allocation(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_sales_fifo_batch ON wms_sales_fifo_allocation(batch_id);

-- =============================================
-- 11. FUNCIONES AUXILIARES
-- =============================================

-- Función: Obtener stock disponible (real - reservado)
CREATE OR REPLACE FUNCTION wms_get_available_stock(
    p_stock_id INTEGER,
    p_batch_id INTEGER DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_stock_real DECIMAL;
    v_reserved DECIMAL;
BEGIN
    IF p_batch_id IS NOT NULL THEN
        SELECT COALESCE(quantity, 0) INTO v_stock_real
        FROM wms_stock_batches WHERE id = p_batch_id;

        SELECT COALESCE(SUM(quantity_reserved), 0) INTO v_reserved
        FROM wms_stock_reservations
        WHERE batch_id = p_batch_id AND status = 'active';
    ELSE
        SELECT COALESCE(quantity_on_hand, 0) INTO v_stock_real
        FROM wms_stock WHERE id = p_stock_id;

        SELECT COALESCE(SUM(quantity_reserved), 0) INTO v_reserved
        FROM wms_stock_reservations
        WHERE stock_id = p_stock_id AND status = 'active';
    END IF;

    RETURN GREATEST(v_stock_real - v_reserved, 0);
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener lotes ordenados por FIFO
CREATE OR REPLACE FUNCTION wms_get_batches_fifo(
    p_stock_id INTEGER,
    p_order_by VARCHAR DEFAULT 'entry_date'
)
RETURNS TABLE (
    batch_id INTEGER,
    lot_number VARCHAR,
    expiry_date DATE,
    entry_date TIMESTAMPTZ,
    quantity_available DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sb.id as batch_id,
        sb.lot_number,
        sb.expiry_date,
        sb.received_date as entry_date,
        wms_get_available_stock(p_stock_id, sb.id) as quantity_available
    FROM wms_stock_batches sb
    WHERE sb.stock_id = p_stock_id
      AND sb.quantity > 0
      AND sb.status = 'active'
      AND wms_get_available_stock(p_stock_id, sb.id) > 0
    ORDER BY
        CASE WHEN p_order_by = 'expiry_date' THEN sb.expiry_date END ASC NULLS LAST,
        CASE WHEN p_order_by = 'entry_date' THEN sb.received_date END ASC;
END;
$$ LANGUAGE plpgsql;

-- Función: Verificar violación FIFO
CREATE OR REPLACE FUNCTION wms_check_fifo_violation(
    p_stock_id INTEGER,
    p_selected_batch_id INTEGER,
    p_destination_is_showroom BOOLEAN
)
RETURNS TABLE (
    has_violation BOOLEAN,
    recommended_batch_id INTEGER,
    recommended_lot_number VARCHAR,
    recommended_expiry_date DATE,
    days_difference INTEGER
) AS $$
DECLARE
    v_selected_expiry DATE;
    v_oldest_batch RECORD;
BEGIN
    IF NOT p_destination_is_showroom THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::VARCHAR, NULL::DATE, NULL::INTEGER;
        RETURN;
    END IF;

    SELECT expiry_date INTO v_selected_expiry
    FROM wms_stock_batches WHERE id = p_selected_batch_id;

    SELECT * INTO v_oldest_batch
    FROM wms_get_batches_fifo(p_stock_id, 'expiry_date')
    LIMIT 1;

    IF v_oldest_batch.batch_id IS NOT NULL AND v_oldest_batch.batch_id != p_selected_batch_id THEN
        RETURN QUERY SELECT
            TRUE,
            v_oldest_batch.batch_id,
            v_oldest_batch.lot_number,
            v_oldest_batch.expiry_date,
            (v_selected_expiry - v_oldest_batch.expiry_date)::INTEGER;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::VARCHAR, NULL::DATE, NULL::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función: Generar número de transferencia
CREATE OR REPLACE FUNCTION wms_generate_transfer_number(p_company_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR;
    v_sequence INTEGER;
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');

    SELECT COALESCE(MAX(
        CAST(NULLIF(SUBSTRING(transfer_number FROM 'TR-[0-9]{4}-([0-9]+)'), '') AS INTEGER)
    ), 0) + 1 INTO v_sequence
    FROM wms_transfers t
    JOIN wms_warehouses w ON t.source_warehouse_id = w.id
    JOIN wms_branches b ON w.branch_id = b.id
    WHERE b.company_id = p_company_id
      AND transfer_number LIKE 'TR-' || v_year || '-%';

    RETURN 'TR-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 12. VISTA: Stock con disponibilidad por lote
-- =============================================

CREATE OR REPLACE VIEW wms_stock_availability AS
SELECT
    s.id as stock_id,
    s.product_id,
    p.internal_code as sku,
    p.name as product_name,
    COALESCE(p.requires_expiry_control, FALSE) as requires_expiry_control,
    s.warehouse_id,
    w.name as warehouse_name,
    w.is_sales_point,
    sb.id as batch_id,
    sb.lot_number,
    sb.expiry_date,
    sb.quantity as batch_quantity,
    COALESCE(r.reserved_qty, 0) as reserved_quantity,
    sb.quantity - COALESCE(r.reserved_qty, 0) as available_quantity,
    sb.received_date as batch_entry_date,
    CASE
        WHEN sb.expiry_date IS NOT NULL THEN sb.expiry_date - CURRENT_DATE
        ELSE NULL
    END as days_to_expiry
FROM wms_stock s
JOIN wms_products p ON s.product_id = p.id
JOIN wms_warehouses w ON s.warehouse_id = w.id
LEFT JOIN wms_stock_batches sb ON sb.stock_id = s.id AND sb.status = 'active'
LEFT JOIN (
    SELECT batch_id, SUM(quantity_reserved) as reserved_qty
    FROM wms_stock_reservations
    WHERE status = 'active'
    GROUP BY batch_id
) r ON r.batch_id = sb.id
WHERE sb.quantity > 0 OR sb.id IS NULL;

-- =============================================
-- 13. CONFIGURACIÓN INICIAL
-- =============================================

INSERT INTO wms_monitoring_config (company_id)
SELECT DISTINCT b.company_id
FROM wms_branches b
WHERE NOT EXISTS (
    SELECT 1 FROM wms_monitoring_config mc WHERE mc.company_id = b.company_id
)
ON CONFLICT (company_id) DO NOTHING;

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'wms_transfers', 'wms_transfer_lines', 'wms_stock_reservations',
        'wms_product_lifecycle', 'wms_expiry_alerts', 'wms_fifo_violations',
        'wms_monitoring_config', 'wms_sales_fifo_allocation'
    );

    RAISE NOTICE 'Migración completada: % tablas de transferencias creadas', v_count;
END $$;
