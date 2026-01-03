-- ═══════════════════════════════════════════════════════════════════════════════
-- PROCUREMENT P2P COMPLETE SYSTEM - Sistema Completo de Compras Procure-to-Pay
-- Migración: 20251231_procurement_p2p_complete_system.sql
-- Autor: Claude Code
-- Descripción: Completa el ciclo P2P con:
--   - Campos faltantes (branch_id, sector_id, accounting_account_id)
--   - Mapeo de códigos proveedor vs interno (SKU cross-reference)
--   - Documento de recepción interno (remito interno)
--   - Integración con Finance (plan de cuentas, centros de costo)
--   - Integración con Warehouse (depósitos, stock)
--   - Selección inteligente de proveedores
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 1: SECTORES/ÁREAS ORGANIZACIONALES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Sectores dentro de departamentos
CREATE TABLE IF NOT EXISTS procurement_sectors (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Responsable
    manager_id UUID REFERENCES users(user_id),

    -- Jerarquía
    parent_sector_id INTEGER REFERENCES procurement_sectors(id),
    level INTEGER DEFAULT 1,
    path VARCHAR(500), -- '1.2.3' para queries jerárquicas

    -- Configuración
    default_cost_center_id INTEGER, -- FK a finance_cost_centers si existe
    default_budget_code VARCHAR(50),

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_procurement_sectors_company ON procurement_sectors(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_procurement_sectors_department ON procurement_sectors(department_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 2: MAPEO DE ARTÍCULOS PROVEEDOR VS INTERNO (SKU Cross-Reference)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tabla de mapeo de códigos de proveedor a códigos internos
CREATE TABLE IF NOT EXISTS procurement_supplier_item_mappings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES procurement_suppliers(id) ON DELETE CASCADE,

    -- Código del proveedor
    supplier_item_code VARCHAR(100) NOT NULL,
    supplier_item_description VARCHAR(500),
    supplier_barcode VARCHAR(50),
    supplier_unit_of_measure VARCHAR(20), -- 'UN', 'KG', 'LT', 'MT', etc.

    -- Código interno (puede ser wms_products o procurement_items)
    internal_item_type VARCHAR(20) NOT NULL DEFAULT 'wms', -- 'wms' o 'procurement'
    internal_item_id INTEGER, -- FK dinámico según tipo

    -- Conversión de unidad si es diferente
    conversion_factor DECIMAL(15,6) DEFAULT 1, -- Ej: 1 caja proveedor = 12 unidades internas
    internal_unit_of_measure VARCHAR(20),

    -- Precios de referencia
    last_purchase_price DECIMAL(15,4),
    last_purchase_currency VARCHAR(3) DEFAULT 'ARS',
    last_purchase_date DATE,
    average_price DECIMAL(15,4),
    min_price DECIMAL(15,4),
    max_price DECIMAL(15,4),

    -- Historial de compras
    total_purchases INTEGER DEFAULT 0,
    total_quantity DECIMAL(15,4) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,

    -- Calidad
    quality_rating DECIMAL(3,2), -- 0.00 a 5.00
    rejection_count INTEGER DEFAULT 0,
    rejection_rate DECIMAL(5,2) DEFAULT 0,

    -- Lead time
    average_lead_time_days INTEGER,
    min_lead_time_days INTEGER,
    max_lead_time_days INTEGER,

    -- Estado
    is_preferred BOOLEAN DEFAULT false, -- Artículo preferido de este proveedor
    is_active BOOLEAN DEFAULT true,

    -- Notas
    notes TEXT,

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, supplier_id, supplier_item_code)
);

CREATE INDEX IF NOT EXISTS idx_supplier_item_mappings_company ON procurement_supplier_item_mappings(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_supplier_item_mappings_supplier ON procurement_supplier_item_mappings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_item_mappings_internal ON procurement_supplier_item_mappings(internal_item_type, internal_item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_item_mappings_code ON procurement_supplier_item_mappings(supplier_item_code);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 3: ALTERACIONES A TABLAS EXISTENTES DE PROCUREMENT
-- ═══════════════════════════════════════════════════════════════════════════════

-- Agregar campos a procurement_requisitions
ALTER TABLE procurement_requisitions
    ADD COLUMN IF NOT EXISTS branch_id INTEGER,
    ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES procurement_sectors(id),
    ADD COLUMN IF NOT EXISTS finance_cost_center_id INTEGER, -- FK a finance_cost_centers
    ADD COLUMN IF NOT EXISTS finance_account_id INTEGER, -- FK a finance_chart_of_accounts (imputación contable)
    ADD COLUMN IF NOT EXISTS delivery_warehouse_id INTEGER, -- FK a wms_warehouses (destino)
    ADD COLUMN IF NOT EXISTS observations TEXT,
    ADD COLUMN IF NOT EXISTS internal_notes TEXT,
    ADD COLUMN IF NOT EXISTS urgency_reason TEXT,
    ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- Agregar campos a procurement_requisition_items
ALTER TABLE procurement_requisition_items
    ADD COLUMN IF NOT EXISTS supplier_item_mapping_id INTEGER REFERENCES procurement_supplier_item_mappings(id),
    ADD COLUMN IF NOT EXISTS internal_item_type VARCHAR(20), -- 'wms' o 'procurement'
    ADD COLUMN IF NOT EXISTS internal_item_id INTEGER,
    ADD COLUMN IF NOT EXISTS specifications TEXT,
    ADD COLUMN IF NOT EXISTS delivery_warehouse_id INTEGER; -- Warehouse específico para este ítem

-- Agregar campos a procurement_orders (Órdenes de Compra)
ALTER TABLE procurement_orders
    ADD COLUMN IF NOT EXISTS branch_id INTEGER,
    ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES procurement_sectors(id),
    ADD COLUMN IF NOT EXISTS finance_cost_center_id INTEGER,
    ADD COLUMN IF NOT EXISTS finance_account_id INTEGER,
    ADD COLUMN IF NOT EXISTS delivery_warehouse_id INTEGER,
    ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS incoterm VARCHAR(10), -- 'FOB', 'CIF', 'EXW', etc.
    ADD COLUMN IF NOT EXISTS insurance_required BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS insurance_details JSONB,
    ADD COLUMN IF NOT EXISTS quality_inspection_required BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS quality_inspection_notes TEXT;

-- Agregar campos a procurement_order_items
ALTER TABLE procurement_order_items
    ADD COLUMN IF NOT EXISTS supplier_item_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS supplier_item_mapping_id INTEGER REFERENCES procurement_supplier_item_mappings(id),
    ADD COLUMN IF NOT EXISTS internal_item_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS internal_item_id INTEGER,
    ADD COLUMN IF NOT EXISTS delivery_warehouse_id INTEGER,
    ADD COLUMN IF NOT EXISTS promised_delivery_date DATE;

-- Agregar campos a procurement_receipts (Recepciones)
ALTER TABLE procurement_receipts
    ADD COLUMN IF NOT EXISTS document_type VARCHAR(30) DEFAULT 'delivery_note', -- 'delivery_note', 'invoice', 'internal'
    ADD COLUMN IF NOT EXISTS supplier_document_number VARCHAR(100), -- Número de remito/factura del proveedor
    ADD COLUMN IF NOT EXISTS supplier_document_date DATE,
    ADD COLUMN IF NOT EXISTS warehouse_id INTEGER, -- FK a wms_warehouses
    ADD COLUMN IF NOT EXISTS internal_receipt_id INTEGER, -- FK a internal_receipt si se creó
    ADD COLUMN IF NOT EXISTS quality_inspection_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'passed', 'failed', 'partial'
    ADD COLUMN IF NOT EXISTS quality_inspection_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS quality_inspector_id UUID REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS quality_inspection_notes TEXT,
    ADD COLUMN IF NOT EXISTS stock_movement_id INTEGER; -- FK a wms_stock_movements cuando se integra

-- Agregar campos a procurement_receipt_items
ALTER TABLE procurement_receipt_items
    ADD COLUMN IF NOT EXISTS supplier_item_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS internal_item_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS internal_item_id INTEGER,
    ADD COLUMN IF NOT EXISTS warehouse_id INTEGER,
    ADD COLUMN IF NOT EXISTS location_code VARCHAR(50), -- Ubicación en el depósito
    ADD COLUMN IF NOT EXISTS lot_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS expiry_date DATE,
    ADD COLUMN IF NOT EXISTS serial_numbers JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS quality_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'quarantine'
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS stock_entry_id INTEGER; -- FK a wms_stock cuando se registra

-- Agregar campos a procurement_invoices
ALTER TABLE procurement_invoices
    ADD COLUMN IF NOT EXISTS branch_id INTEGER,
    ADD COLUMN IF NOT EXISTS finance_cost_center_id INTEGER,
    ADD COLUMN IF NOT EXISTS finance_account_id INTEGER,
    ADD COLUMN IF NOT EXISTS journal_entry_id INTEGER; -- FK a finance_journal_entries cuando se contabiliza

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 4: DOCUMENTO DE RECEPCIÓN INTERNO (Remito Interno)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Remito interno cuando no hay documento del proveedor
CREATE TABLE IF NOT EXISTS procurement_internal_receipts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Identificación
    receipt_number VARCHAR(50) NOT NULL,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Referencia a la recepción principal
    procurement_receipt_id INTEGER REFERENCES procurement_receipts(id) ON DELETE CASCADE,

    -- Origen
    origin_type VARCHAR(30) NOT NULL, -- 'purchase_order', 'transfer', 'return', 'adjustment', 'production'
    origin_document_id INTEGER, -- ID del documento origen
    origin_document_number VARCHAR(100),

    -- Proveedor (si aplica)
    supplier_id INTEGER REFERENCES procurement_suppliers(id),

    -- Destino
    warehouse_id INTEGER NOT NULL, -- FK a wms_warehouses

    -- Transporte
    carrier_name VARCHAR(200),
    carrier_document VARCHAR(100),
    vehicle_plate VARCHAR(20),
    driver_name VARCHAR(200),
    driver_document VARCHAR(50),

    -- Totales
    total_items INTEGER DEFAULT 0,
    total_quantity DECIMAL(15,4) DEFAULT 0,
    total_weight DECIMAL(15,4),
    total_volume DECIMAL(15,4),

    -- Estado
    status VARCHAR(30) DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'posted', 'cancelled'

    -- Aprobación
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMPTZ,

    -- Contabilización
    posted_by UUID REFERENCES users(user_id),
    posted_at TIMESTAMPTZ,
    stock_movement_id INTEGER, -- FK a wms_stock_movements

    -- Observaciones
    observations TEXT,
    internal_notes TEXT,

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_internal_receipts_company ON procurement_internal_receipts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_internal_receipts_warehouse ON procurement_internal_receipts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_internal_receipts_date ON procurement_internal_receipts(receipt_date);

-- Items del remito interno
CREATE TABLE IF NOT EXISTS procurement_internal_receipt_items (
    id SERIAL PRIMARY KEY,
    internal_receipt_id INTEGER NOT NULL REFERENCES procurement_internal_receipts(id) ON DELETE CASCADE,

    -- Línea
    line_number INTEGER NOT NULL,

    -- Artículo interno
    internal_item_type VARCHAR(20) NOT NULL, -- 'wms' o 'procurement'
    internal_item_id INTEGER NOT NULL,
    item_code VARCHAR(100),
    item_description VARCHAR(500),

    -- Código del proveedor (para referencia)
    supplier_item_code VARCHAR(100),
    supplier_item_description VARCHAR(500),

    -- Cantidades
    quantity_expected DECIMAL(15,4),
    quantity_received DECIMAL(15,4) NOT NULL,
    quantity_rejected DECIMAL(15,4) DEFAULT 0,
    unit_of_measure VARCHAR(20) NOT NULL,

    -- Ubicación
    warehouse_id INTEGER, -- Puede ser diferente al del encabezado
    location_code VARCHAR(50),

    -- Lote y vencimiento
    lot_number VARCHAR(50),
    expiry_date DATE,
    serial_numbers JSONB DEFAULT '[]',

    -- Calidad
    quality_status VARCHAR(20) DEFAULT 'approved', -- 'approved', 'rejected', 'quarantine'
    rejection_reason TEXT,

    -- Costo
    unit_cost DECIMAL(15,4),
    total_cost DECIMAL(15,2),

    -- Stock
    stock_entry_id INTEGER, -- FK a wms_stock

    -- Notas
    notes TEXT,

    UNIQUE(internal_receipt_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_internal_receipt_items_receipt ON procurement_internal_receipt_items(internal_receipt_id);
CREATE INDEX IF NOT EXISTS idx_internal_receipt_items_item ON procurement_internal_receipt_items(internal_item_type, internal_item_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 5: HISTORIAL DE COMPRAS POR PROVEEDOR (Para selección inteligente)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Vista materializada para análisis de proveedores
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_supplier_purchase_analytics AS
SELECT
    s.company_id,
    s.id AS supplier_id,
    s.legal_name AS supplier_name,
    s.status AS supplier_status,
    s.overall_score,
    s.quality_score,
    s.delivery_score,
    s.price_score,

    -- Métricas de compras
    COUNT(DISTINCT o.id) AS total_orders,
    COUNT(DISTINCT CASE WHEN o.status IN ('received', 'closed_complete') THEN o.id END) AS completed_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) AS cancelled_orders,

    -- Montos
    COALESCE(SUM(o.total_amount), 0) AS total_purchased_amount,
    COALESCE(AVG(o.total_amount), 0) AS avg_order_amount,

    -- Tiempos de entrega
    AVG(EXTRACT(DAY FROM (r.received_at - o.sent_at))) AS avg_delivery_days,
    MIN(EXTRACT(DAY FROM (r.received_at - o.sent_at))) AS min_delivery_days,
    MAX(EXTRACT(DAY FROM (r.received_at - o.sent_at))) AS max_delivery_days,

    -- Entregas a tiempo
    COUNT(CASE WHEN r.received_at <= o.expected_delivery_date THEN 1 END)::DECIMAL /
        NULLIF(COUNT(r.id), 0) * 100 AS on_time_delivery_rate,

    -- Rechazos
    COALESCE(SUM(ri.quantity_rejected), 0) AS total_rejected_quantity,
    COALESCE(SUM(ri.quantity_received), 0) AS total_received_quantity,

    -- Última actividad
    MAX(o.order_date) AS last_order_date,
    MAX(r.received_at) AS last_delivery_date

FROM procurement_suppliers s
LEFT JOIN procurement_orders o ON s.id = o.supplier_id
LEFT JOIN procurement_receipts r ON o.id = r.order_id
LEFT JOIN procurement_receipt_items ri ON r.id = ri.receipt_id
WHERE s.status = 'active'
GROUP BY s.company_id, s.id, s.legal_name, s.status, s.overall_score, s.quality_score, s.delivery_score, s.price_score;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_supplier_analytics ON mv_supplier_purchase_analytics(company_id, supplier_id);

-- Vista materializada para análisis de items por proveedor
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_supplier_item_analytics AS
SELECT
    m.company_id,
    m.supplier_id,
    m.internal_item_type,
    m.internal_item_id,
    m.supplier_item_code,

    -- Métricas
    m.total_purchases,
    m.total_quantity,
    m.total_amount,
    m.average_price,
    m.last_purchase_price,
    m.last_purchase_date,
    m.quality_rating,
    m.rejection_rate,
    m.average_lead_time_days,
    m.is_preferred,

    -- Ranking por precio (1 = más barato)
    ROW_NUMBER() OVER (
        PARTITION BY m.company_id, m.internal_item_type, m.internal_item_id
        ORDER BY m.last_purchase_price ASC NULLS LAST
    ) AS price_rank,

    -- Ranking por calidad (1 = mejor)
    ROW_NUMBER() OVER (
        PARTITION BY m.company_id, m.internal_item_type, m.internal_item_id
        ORDER BY m.quality_rating DESC NULLS LAST
    ) AS quality_rank,

    -- Ranking por tiempo de entrega (1 = más rápido)
    ROW_NUMBER() OVER (
        PARTITION BY m.company_id, m.internal_item_type, m.internal_item_id
        ORDER BY m.average_lead_time_days ASC NULLS LAST
    ) AS delivery_rank

FROM procurement_supplier_item_mappings m
WHERE m.is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_item_analytics ON mv_supplier_item_analytics(company_id, supplier_id, internal_item_type, internal_item_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 6: CONFIGURACIÓN DE APROBACIONES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Configuración de niveles de aprobación por empresa
CREATE TABLE IF NOT EXISTS procurement_approval_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    document_type VARCHAR(30) NOT NULL, -- 'requisition', 'order', 'receipt', 'invoice', 'payment'

    -- Umbral de monto
    min_amount DECIMAL(15,2) DEFAULT 0,
    max_amount DECIMAL(15,2), -- NULL = sin límite

    -- Nivel requerido
    approval_level INTEGER NOT NULL, -- 1, 2, 3, 4...
    approval_role VARCHAR(50) NOT NULL, -- 'supervisor', 'area_manager', 'finance', 'management', 'board'
    approval_role_name VARCHAR(100),

    -- Puede ser aprobado por
    can_approve_roles JSONB DEFAULT '[]', -- ['admin', 'finance_manager']
    can_approve_users JSONB DEFAULT '[]', -- [uuid1, uuid2]

    -- Configuración adicional
    requires_justification BOOLEAN DEFAULT false,
    requires_budget_check BOOLEAN DEFAULT false,
    auto_approve_if_budget_ok BOOLEAN DEFAULT false,

    -- Notificaciones
    notify_on_pending BOOLEAN DEFAULT true,
    notify_on_approved BOOLEAN DEFAULT true,
    notify_on_rejected BOOLEAN DEFAULT true,
    notification_users JSONB DEFAULT '[]',

    -- Estado
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, document_type, approval_level)
);

-- Insertar configuración por defecto
INSERT INTO procurement_approval_config (company_id, document_type, min_amount, max_amount, approval_level, approval_role, approval_role_name) VALUES
    (1, 'requisition', 0, 50000, 1, 'supervisor', 'Supervisor Directo'),
    (1, 'requisition', 50000, 200000, 2, 'area_manager', 'Jefe de Área'),
    (1, 'requisition', 200000, 500000, 3, 'management', 'Gerencia'),
    (1, 'requisition', 500000, NULL, 4, 'board', 'Directorio'),
    (1, 'order', 0, 100000, 1, 'purchasing', 'Compras'),
    (1, 'order', 100000, 500000, 2, 'finance', 'Finanzas'),
    (1, 'order', 500000, NULL, 3, 'management', 'Gerencia')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 7: INTEGRACIÓN CON FINANCE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Configuración de cuentas contables por tipo de compra
CREATE TABLE IF NOT EXISTS procurement_accounting_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Tipo de compra
    purchase_type VARCHAR(30) NOT NULL, -- 'goods', 'services', 'assets', 'consumables', 'raw_materials'

    -- Categoría (opcional, para mayor detalle)
    category_id INTEGER REFERENCES procurement_categories(id),

    -- Cuentas contables por defecto
    expense_account_id INTEGER, -- FK a finance_chart_of_accounts - Gasto
    asset_account_id INTEGER, -- FK a finance_chart_of_accounts - Activo (si capitaliza)
    liability_account_id INTEGER, -- FK a finance_chart_of_accounts - Proveedor
    tax_account_id INTEGER, -- FK a finance_chart_of_accounts - IVA Crédito Fiscal

    -- Centro de costo por defecto
    default_cost_center_id INTEGER, -- FK a finance_cost_centers

    -- Configuración
    capitalize_threshold DECIMAL(15,2), -- Monto mínimo para capitalizar como activo
    depreciation_method VARCHAR(30), -- 'straight_line', 'declining_balance', etc.
    useful_life_months INTEGER,

    -- Estado
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, purchase_type, category_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 8: FUNCIONES HELPER
-- ═══════════════════════════════════════════════════════════════════════════════

-- Función para obtener proveedores sugeridos para un item
CREATE OR REPLACE FUNCTION get_suggested_suppliers(
    p_company_id INTEGER,
    p_internal_item_type VARCHAR(20),
    p_internal_item_id INTEGER,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    supplier_id INTEGER,
    supplier_name VARCHAR(255),
    supplier_code VARCHAR(50),
    supplier_item_code VARCHAR(100),
    last_price DECIMAL(15,4),
    avg_price DECIMAL(15,4),
    quality_rating DECIMAL(3,2),
    delivery_days INTEGER,
    total_purchases INTEGER,
    price_rank INTEGER,
    quality_rank INTEGER,
    delivery_rank INTEGER,
    overall_recommendation_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sia.supplier_id,
        s.legal_name AS supplier_name,
        s.supplier_code,
        sia.supplier_item_code,
        sia.last_purchase_price AS last_price,
        sia.average_price AS avg_price,
        sia.quality_rating,
        sia.average_lead_time_days AS delivery_days,
        sia.total_purchases,
        sia.price_rank::INTEGER,
        sia.quality_rank::INTEGER,
        sia.delivery_rank::INTEGER,
        -- Score ponderado: 40% precio, 35% calidad, 25% entrega
        (
            (1.0 / NULLIF(sia.price_rank, 0) * 40) +
            (1.0 / NULLIF(sia.quality_rank, 0) * 35) +
            (1.0 / NULLIF(sia.delivery_rank, 0) * 25)
        )::DECIMAL(5,2) AS overall_recommendation_score
    FROM mv_supplier_item_analytics sia
    JOIN procurement_suppliers s ON sia.supplier_id = s.id
    WHERE sia.company_id = p_company_id
      AND sia.internal_item_type = p_internal_item_type
      AND sia.internal_item_id = p_internal_item_id
      AND s.status = 'active'
    ORDER BY overall_recommendation_score DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de remito interno
CREATE OR REPLACE FUNCTION generate_internal_receipt_number(p_company_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_number VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    SELECT COALESCE(MAX(
        CASE
            WHEN receipt_number ~ ('^RI-' || v_year || '-[0-9]+$')
            THEN CAST(SUBSTRING(receipt_number FROM 'RI-' || v_year || '-([0-9]+)$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO v_sequence
    FROM procurement_internal_receipts
    WHERE company_id = p_company_id;

    v_number := 'RI-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');

    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar disponibilidad presupuestaria
CREATE OR REPLACE FUNCTION check_budget_availability(
    p_company_id INTEGER,
    p_cost_center_id INTEGER,
    p_account_id INTEGER,
    p_amount DECIMAL(15,2),
    p_fiscal_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
    has_budget BOOLEAN,
    budget_amount DECIMAL(15,2),
    executed_amount DECIMAL(15,2),
    available_amount DECIMAL(15,2),
    percentage_used DECIMAL(5,2)
) AS $$
DECLARE
    v_fiscal_year INTEGER;
    v_budget DECIMAL(15,2);
    v_executed DECIMAL(15,2);
BEGIN
    v_fiscal_year := COALESCE(p_fiscal_year, EXTRACT(YEAR FROM CURRENT_DATE));

    -- Obtener presupuesto (si existe la tabla finance_budget_lines)
    BEGIN
        SELECT COALESCE(bl.annual_total, 0)
        INTO v_budget
        FROM finance_budget_lines bl
        JOIN finance_budgets b ON bl.budget_id = b.id
        WHERE b.company_id = p_company_id
          AND b.fiscal_year = v_fiscal_year
          AND b.status = 'active'
          AND bl.account_id = p_account_id
          AND (bl.cost_center_id = p_cost_center_id OR bl.cost_center_id IS NULL)
        LIMIT 1;
    EXCEPTION
        WHEN undefined_table THEN
            v_budget := NULL;
    END;

    -- Obtener ejecutado (si existe la tabla finance_journal_entry_lines)
    BEGIN
        SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
        INTO v_executed
        FROM finance_journal_entry_lines jel
        JOIN finance_journal_entries je ON jel.journal_entry_id = je.id
        WHERE je.company_id = p_company_id
          AND je.fiscal_year = v_fiscal_year
          AND je.status = 'posted'
          AND jel.account_id = p_account_id
          AND (jel.cost_center_id = p_cost_center_id OR jel.cost_center_id IS NULL);
    EXCEPTION
        WHEN undefined_table THEN
            v_executed := 0;
    END;

    IF v_budget IS NULL THEN
        -- Sin presupuesto configurado, siempre disponible
        RETURN QUERY SELECT true, NULL::DECIMAL(15,2), v_executed, NULL::DECIMAL(15,2), NULL::DECIMAL(5,2);
    ELSE
        RETURN QUERY SELECT
            (v_budget - v_executed) >= p_amount,
            v_budget,
            v_executed,
            v_budget - v_executed,
            CASE WHEN v_budget > 0 THEN (v_executed / v_budget * 100) ELSE 0 END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para refrescar vistas materializadas
CREATE OR REPLACE FUNCTION refresh_procurement_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_supplier_purchase_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_supplier_item_analytics;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 9: TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Trigger para actualizar estadísticas de mapeo al recibir mercadería
CREATE OR REPLACE FUNCTION update_supplier_item_mapping_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.supplier_item_mapping_id IS NOT NULL THEN
        UPDATE procurement_supplier_item_mappings
        SET
            total_purchases = total_purchases + 1,
            total_quantity = total_quantity + COALESCE(NEW.quantity_received, 0),
            last_purchase_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = NEW.supplier_item_mapping_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_supplier_item_mapping_stats ON procurement_receipt_items;
CREATE TRIGGER trg_update_supplier_item_mapping_stats
    AFTER INSERT ON procurement_receipt_items
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_item_mapping_stats();

-- Trigger para actualizar sector path
CREATE OR REPLACE FUNCTION update_sector_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path VARCHAR(500);
BEGIN
    IF NEW.parent_sector_id IS NOT NULL THEN
        SELECT path INTO parent_path FROM procurement_sectors WHERE id = NEW.parent_sector_id;
        NEW.path := COALESCE(parent_path, '') || '.' || NEW.id::TEXT;
        NEW.level := (LENGTH(NEW.path) - LENGTH(REPLACE(NEW.path, '.', ''))) + 1;
    ELSE
        NEW.path := NEW.id::TEXT;
        NEW.level := 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_sector_path ON procurement_sectors;
CREATE TRIGGER trg_update_sector_path
    BEFORE INSERT OR UPDATE ON procurement_sectors
    FOR EACH ROW
    EXECUTE FUNCTION update_sector_path();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 10: ÍNDICES ADICIONALES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_requisitions_branch ON procurement_requisitions(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requisitions_sector ON procurement_requisitions(sector_id) WHERE sector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requisitions_finance_cc ON procurement_requisitions(finance_cost_center_id) WHERE finance_cost_center_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_branch ON procurement_orders(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_sector ON procurement_orders(sector_id) WHERE sector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_finance_cc ON procurement_orders(finance_cost_center_id) WHERE finance_cost_center_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_receipts_warehouse ON procurement_receipts(warehouse_id) WHERE warehouse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_document_type ON procurement_receipts(document_type);

CREATE INDEX IF NOT EXISTS idx_receipt_items_internal ON procurement_receipt_items(internal_item_type, internal_item_id)
    WHERE internal_item_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 11: COMENTARIOS DE DOCUMENTACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE procurement_sectors IS 'Sectores organizacionales para clasificación de requisiciones y órdenes de compra';
COMMENT ON TABLE procurement_supplier_item_mappings IS 'Mapeo entre códigos de artículos del proveedor y códigos internos (SKU cross-reference)';
COMMENT ON TABLE procurement_internal_receipts IS 'Documento interno de recepción cuando no hay remito/factura del proveedor';
COMMENT ON TABLE procurement_approval_config IS 'Configuración de niveles de aprobación por tipo de documento y monto';
COMMENT ON TABLE procurement_accounting_config IS 'Configuración de cuentas contables por tipo de compra';

COMMENT ON FUNCTION get_suggested_suppliers IS 'Retorna proveedores sugeridos para un artículo basado en historial de compras, precio, calidad y tiempo de entrega';
COMMENT ON FUNCTION generate_internal_receipt_number IS 'Genera número secuencial único para remitos internos';
COMMENT ON FUNCTION check_budget_availability IS 'Verifica disponibilidad presupuestaria para una compra';
COMMENT ON FUNCTION refresh_procurement_analytics IS 'Refresca las vistas materializadas de analytics de procurement';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════
