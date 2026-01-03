-- ============================================================================
-- SISTEMA DE GESTION DE COMPRAS Y PROVEEDORES - NIVEL ENTERPRISE
-- Migracion: 20251231_create_procurement_system.sql
-- Descripcion: Sistema P2P completo inspirado en SAP Ariba, Coupa, Oracle
-- ============================================================================

-- ============================================
-- 1. PROVEEDORES (Suppliers)
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_suppliers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Identificacion
    supplier_code VARCHAR(50) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    tax_id VARCHAR(50) NOT NULL,  -- CUIT/RUT/RFC/EIN

    -- Contacto Principal
    contact_name VARCHAR(200),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_position VARCHAR(100),

    -- Direccion
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Argentina',
    postal_code VARCHAR(20),

    -- Clasificacion
    supplier_type VARCHAR(50) DEFAULT 'both',  -- 'goods', 'services', 'both'
    industry_category VARCHAR(100),
    size_category VARCHAR(50),  -- 'micro', 'small', 'medium', 'large', 'enterprise'

    -- Estado y Aprobacion
    status VARCHAR(50) DEFAULT 'pending',  -- pending, active, suspended, blacklisted, inactive
    onboarding_status VARCHAR(50) DEFAULT 'pending',  -- pending, documents_pending, under_review, approved, rejected
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(user_id),
    suspension_reason TEXT,
    blacklist_reason TEXT,

    -- Scoring (actualizado automaticamente)
    overall_score DECIMAL(3,2) DEFAULT 0,  -- 0.00 a 5.00
    quality_score DECIMAL(3,2) DEFAULT 0,
    delivery_score DECIMAL(3,2) DEFAULT 0,
    price_score DECIMAL(3,2) DEFAULT 0,
    service_score DECIMAL(3,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0,  -- Porcentaje
    rejection_rate DECIMAL(5,2) DEFAULT 0,  -- Porcentaje

    -- Documentacion (JSONB arrays)
    documents JSONB DEFAULT '[]',
    -- [{type, name, url, uploaded_at, expires_at, verified, verified_by}]
    certifications JSONB DEFAULT '[]',
    -- [{name, issuer, number, issue_date, expiry_date, document_url}]

    -- Cuentas Bancarias (para pagos)
    bank_accounts JSONB DEFAULT '[]',
    -- [{bank_name, account_type, account_number, cbu, alias, currency, swift_code, is_primary, verified}]

    -- ESG / Sostenibilidad (ISO 20400)
    esg_score DECIMAL(3,2),
    esg_certifications JSONB DEFAULT '[]',
    environmental_rating VARCHAR(20),  -- 'A', 'B', 'C', 'D', 'F'
    social_rating VARCHAR(20),
    governance_rating VARCHAR(20),

    -- Configuracion
    default_payment_terms TEXT,
    default_payment_days INTEGER DEFAULT 30,
    default_currency VARCHAR(3) DEFAULT 'ARS',
    credit_limit DECIMAL(15,2),
    credit_used DECIMAL(15,2) DEFAULT 0,

    -- Portal de Proveedor
    portal_user_id UUID REFERENCES users(user_id),
    portal_enabled BOOLEAN DEFAULT false,
    last_portal_access TIMESTAMP,

    -- Auditoria
    audit_trail JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),
    updated_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, supplier_code),
    UNIQUE(company_id, tax_id)
);

CREATE INDEX idx_suppliers_company_status ON procurement_suppliers(company_id, status);
CREATE INDEX idx_suppliers_score ON procurement_suppliers(overall_score DESC);
CREATE INDEX idx_suppliers_tax_id ON procurement_suppliers(tax_id);

-- ============================================
-- 2. CATEGORIAS DE PRODUCTOS/SERVICIOS
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_categories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,  -- NULL = categoria global

    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES procurement_categories(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 1,
    path VARCHAR(500),  -- Ej: "1.2.3" para navegacion jerarquica

    -- Configuracion
    requires_approval BOOLEAN DEFAULT false,
    default_approval_workflow JSONB,
    budget_code VARCHAR(50),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, code)
);

CREATE INDEX idx_categories_parent ON procurement_categories(parent_id);
CREATE INDEX idx_categories_company ON procurement_categories(company_id);

-- ============================================
-- 3. CATALOGO DE PRODUCTOS/SERVICIOS
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_items (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    item_code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES procurement_categories(id) ON DELETE SET NULL,

    item_type VARCHAR(50) NOT NULL,  -- 'product', 'service', 'consumable', 'fixed_asset'
    unit_of_measure VARCHAR(50),  -- 'unit', 'kg', 'liter', 'hour', 'day', 'meter', 'box'

    -- Precios de Referencia
    reference_price DECIMAL(15,2),
    min_price DECIMAL(15,2),
    max_price DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'ARS',
    last_price_update TIMESTAMP,

    -- Proveedores Historicos (auto-actualizado)
    historical_suppliers JSONB DEFAULT '[]',
    -- [{supplier_id, supplier_name, last_price, last_date, total_orders, avg_delivery_days, quality_score}]
    preferred_supplier_id INTEGER REFERENCES procurement_suppliers(id),

    -- Especificaciones
    specifications JSONB DEFAULT '{}',
    -- {material, dimensions, weight, technical_specs, etc.}

    -- Imagenes
    images JSONB DEFAULT '[]',

    -- Control de Stock (opcional)
    track_stock BOOLEAN DEFAULT false,
    min_stock_level DECIMAL(15,4),
    reorder_point DECIMAL(15,4),
    reorder_quantity DECIMAL(15,4),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, item_code)
);

CREATE INDEX idx_items_category ON procurement_items(category_id);
CREATE INDEX idx_items_company ON procurement_items(company_id, is_active);
CREATE INDEX idx_items_search ON procurement_items USING gin(to_tsvector('spanish', name || ' ' || COALESCE(description, '')));

-- ============================================
-- 4. TIPOS DE CAMBIO (Multi-Moneda)
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_exchange_rates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,  -- NULL = tipo de cambio global

    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,6) NOT NULL,
    rate_date DATE NOT NULL,

    source VARCHAR(50) DEFAULT 'manual',  -- 'manual', 'bcra', 'api', 'bloomberg'
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, from_currency, to_currency, rate_date)
);

CREATE INDEX idx_exchange_rates_date ON procurement_exchange_rates(rate_date DESC);
CREATE INDEX idx_exchange_rates_currencies ON procurement_exchange_rates(from_currency, to_currency);

-- ============================================
-- 5. CONTRATOS MARCO
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_contracts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    contract_number VARCHAR(50) NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES procurement_suppliers(id),

    -- Tipo y Descripcion
    contract_type VARCHAR(50) NOT NULL,  -- 'framework', 'fixed_price', 'time_and_materials', 'blanket'
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Vigencia
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renew BOOLEAN DEFAULT false,
    renewal_terms TEXT,
    renewal_notice_days INTEGER DEFAULT 30,

    -- Montos
    total_amount DECIMAL(15,2),  -- NULL = sin limite
    consumed_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (COALESCE(total_amount, 999999999) - consumed_amount) STORED,
    currency VARCHAR(3) DEFAULT 'ARS',
    min_order_amount DECIMAL(15,2),

    -- Estado
    status VARCHAR(50) DEFAULT 'draft',
    -- draft, pending_approval, active, expired, terminated, renewed, suspended

    -- Condiciones Comerciales
    payment_terms TEXT,
    payment_days INTEGER DEFAULT 30,
    payment_method VARCHAR(50),  -- 'transfer', 'check', 'credit'
    delivery_terms TEXT,
    incoterm VARCHAR(10),  -- 'EXW', 'FOB', 'CIF', etc.
    penalty_clauses TEXT,
    warranty_terms TEXT,
    special_conditions TEXT,

    -- Documento del Contrato
    document_url TEXT,
    document_signed_at TIMESTAMP,
    document_signed_by UUID REFERENCES users(user_id),

    -- Aprobaciones
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(user_id),
    approval_notes TEXT,

    -- Notificaciones
    expiry_notified BOOLEAN DEFAULT false,
    expiry_notification_date TIMESTAMP,
    renewal_notified BOOLEAN DEFAULT false,
    renewal_notification_date TIMESTAMP,
    consumption_alert_percent DECIMAL(5,2) DEFAULT 80,  -- Alertar cuando se consume X%
    consumption_alerted BOOLEAN DEFAULT false,

    -- Auditoria
    audit_trail JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, contract_number)
);

CREATE INDEX idx_contracts_supplier ON procurement_contracts(supplier_id);
CREATE INDEX idx_contracts_status ON procurement_contracts(company_id, status);
CREATE INDEX idx_contracts_dates ON procurement_contracts(start_date, end_date);

-- ============================================
-- 6. ITEMS DE CONTRATO (Precios Pre-acordados)
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_contract_items (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES procurement_contracts(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES procurement_items(id) ON DELETE SET NULL,

    item_code VARCHAR(100),
    item_description VARCHAR(500) NOT NULL,
    unit_of_measure VARCHAR(50),

    -- Precio Acordado
    agreed_price DECIMAL(15,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Descuentos por Volumen
    volume_discounts JSONB DEFAULT '[]',
    -- [{min_qty: 100, discount_percent: 5}, {min_qty: 500, discount_percent: 10}]

    -- Control de Consumo
    max_quantity DECIMAL(15,4),  -- NULL = sin limite
    consumed_quantity DECIMAL(15,4) DEFAULT 0,
    remaining_quantity DECIMAL(15,4) GENERATED ALWAYS AS (COALESCE(max_quantity, 999999999) - consumed_quantity) STORED,

    -- Vigencia especifica del item (puede ser diferente al contrato)
    valid_from DATE,
    valid_until DATE,

    notes TEXT,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contract_items_contract ON procurement_contract_items(contract_id);
CREATE INDEX idx_contract_items_item ON procurement_contract_items(item_id);

-- ============================================
-- 7. SOLICITUDES DE COMPRA (Purchase Requisitions)
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_requisitions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    requisition_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Solicitante
    requester_id UUID NOT NULL REFERENCES users(user_id),
    requester_department_id INTEGER REFERENCES departments(id),
    requester_name VARCHAR(200),  -- Cache del nombre
    requester_email VARCHAR(255),  -- Cache del email

    -- Urgencia y Fechas
    priority VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
    required_date DATE,
    justification TEXT,

    -- Estado Workflow
    status VARCHAR(50) DEFAULT 'draft',
    -- draft, pending_approval, approved, rejected, in_quotation, quoted,
    -- in_purchase, partially_ordered, ordered, completed, cancelled

    current_approval_step INTEGER DEFAULT 1,
    max_approval_steps INTEGER DEFAULT 1,

    -- Totales (calculados)
    estimated_total DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'ARS',
    item_count INTEGER DEFAULT 0,

    -- Centro de Costo / Presupuesto
    cost_center VARCHAR(50),
    budget_code VARCHAR(50),
    project_code VARCHAR(50),

    -- Aprobaciones
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(user_id),
    rejection_reason TEXT,
    rejected_at TIMESTAMP,
    rejected_by UUID REFERENCES users(user_id),

    -- Workflow de Aprobacion
    approval_workflow JSONB DEFAULT '[]',
    -- [{step, role, user_id, user_name, status, action_at, comments}]

    -- Trazabilidad
    rfq_ids JSONB DEFAULT '[]',
    order_ids JSONB DEFAULT '[]',

    -- Notificaciones
    notification_id BIGINT,

    -- Auditoria
    audit_trail JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, requisition_number)
);

CREATE INDEX idx_requisitions_status ON procurement_requisitions(company_id, status);
CREATE INDEX idx_requisitions_requester ON procurement_requisitions(requester_id, status);
CREATE INDEX idx_requisitions_date ON procurement_requisitions(created_at DESC);

-- ============================================
-- 8. ITEMS DE SOLICITUD DE COMPRA
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_requisition_items (
    id SERIAL PRIMARY KEY,
    requisition_id INTEGER NOT NULL REFERENCES procurement_requisitions(id) ON DELETE CASCADE,

    line_number INTEGER NOT NULL,
    item_id INTEGER REFERENCES procurement_items(id) ON DELETE SET NULL,

    -- Datos del Item
    item_code VARCHAR(100),
    item_description VARCHAR(500) NOT NULL,
    specifications TEXT,

    quantity DECIMAL(15,4) NOT NULL,
    unit_of_measure VARCHAR(50),
    estimated_unit_price DECIMAL(15,2),
    estimated_total DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Proveedor Sugerido (opcional)
    suggested_supplier_id INTEGER REFERENCES procurement_suppliers(id),
    suggested_supplier_name VARCHAR(255),

    -- Historial de Proveedores (auto-poblado del catalogo)
    supplier_history JSONB DEFAULT '[]',
    -- [{supplier_id, supplier_name, last_price, quality_score, delivery_score, last_order_date}]

    -- Estado
    status VARCHAR(50) DEFAULT 'pending',  -- pending, in_rfq, quoted, ordered, received, cancelled
    ordered_quantity DECIMAL(15,4) DEFAULT 0,
    received_quantity DECIMAL(15,4) DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(requisition_id, line_number)
);

CREATE INDEX idx_req_items_requisition ON procurement_requisition_items(requisition_id);
CREATE INDEX idx_req_items_item ON procurement_requisition_items(item_id);

-- ============================================
-- 9. SOLICITUDES DE COTIZACION (RFQ)
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_rfqs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    rfq_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Origen
    requisition_id INTEGER REFERENCES procurement_requisitions(id) ON DELETE SET NULL,

    -- Fechas
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    valid_until DATE,

    -- Estado
    status VARCHAR(50) DEFAULT 'draft',
    -- draft, sent, in_progress, closed, evaluation, awarded, cancelled, expired

    -- Configuracion
    allow_partial_quotes BOOLEAN DEFAULT true,
    require_all_items BOOLEAN DEFAULT false,
    show_quantities BOOLEAN DEFAULT true,
    sealed_bids BOOLEAN DEFAULT false,  -- Las cotizaciones no se ven hasta el cierre

    -- Criterios de Evaluacion
    evaluation_criteria JSONB DEFAULT '[{"criterion": "price", "weight": 60}, {"criterion": "quality", "weight": 25}, {"criterion": "delivery", "weight": 15}]',

    -- Terminos
    payment_terms TEXT,
    delivery_terms TEXT,
    delivery_location TEXT,
    special_conditions TEXT,

    -- Resultado
    awarded_at TIMESTAMP,
    awarded_by UUID REFERENCES users(user_id),
    award_notes TEXT,

    -- Notificaciones
    notification_template_key VARCHAR(100) DEFAULT 'rfq_invitation',
    notification_sent_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,

    -- Estadisticas
    suppliers_invited INTEGER DEFAULT 0,
    suppliers_responded INTEGER DEFAULT 0,
    quotes_received INTEGER DEFAULT 0,

    -- Auditoria
    audit_trail JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, rfq_number)
);

CREATE INDEX idx_rfqs_status ON procurement_rfqs(company_id, status);
CREATE INDEX idx_rfqs_requisition ON procurement_rfqs(requisition_id);
CREATE INDEX idx_rfqs_dates ON procurement_rfqs(due_date, status);

-- ============================================
-- 10. ITEMS DE RFQ
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_rfq_items (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL REFERENCES procurement_rfqs(id) ON DELETE CASCADE,
    requisition_item_id INTEGER REFERENCES procurement_requisition_items(id) ON DELETE SET NULL,

    line_number INTEGER NOT NULL,
    item_code VARCHAR(100),
    item_description VARCHAR(500) NOT NULL,
    specifications TEXT,
    quantity DECIMAL(15,4) NOT NULL,
    unit_of_measure VARCHAR(50),

    -- Precio Referencia (oculto para proveedores)
    reference_price DECIMAL(15,2),
    target_price DECIMAL(15,2),  -- Precio objetivo

    -- Resultado
    awarded_supplier_id INTEGER REFERENCES procurement_suppliers(id),
    awarded_price DECIMAL(15,4),
    awarded_quantity DECIMAL(15,4),

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(rfq_id, line_number)
);

CREATE INDEX idx_rfq_items_rfq ON procurement_rfq_items(rfq_id);

-- ============================================
-- 11. PROVEEDORES INVITADOS A RFQ
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_rfq_suppliers (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL REFERENCES procurement_rfqs(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES procurement_suppliers(id),

    -- Estado de Invitacion
    invited_at TIMESTAMP DEFAULT NOW(),
    invitation_method VARCHAR(50) DEFAULT 'notification',  -- notification, email, manual
    notification_id BIGINT,

    -- Respuesta
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, viewed, declined, in_progress, quoted, late_quote
    viewed_at TIMESTAMP,
    responded_at TIMESTAMP,
    decline_reason TEXT,

    -- Cotizacion Global
    quote_total DECIMAL(15,2),
    quote_currency VARCHAR(3) DEFAULT 'ARS',
    quote_valid_until DATE,
    quote_observations TEXT,
    quote_delivery_days INTEGER,
    quote_payment_terms TEXT,
    quote_document_url TEXT,

    -- Evaluacion Automatica
    auto_score DECIMAL(5,2),  -- Calculado por el sistema
    price_score DECIMAL(5,2),
    quality_score DECIMAL(5,2),
    delivery_score DECIMAL(5,2),
    final_ranking INTEGER,

    -- Adjudicacion
    is_awarded BOOLEAN DEFAULT false,
    awarded_items JSONB DEFAULT '[]',  -- IDs de items adjudicados
    awarded_total DECIMAL(15,2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX idx_rfq_suppliers_rfq ON procurement_rfq_suppliers(rfq_id);
CREATE INDEX idx_rfq_suppliers_supplier ON procurement_rfq_suppliers(supplier_id);
CREATE INDEX idx_rfq_suppliers_status ON procurement_rfq_suppliers(status);

-- ============================================
-- 12. COTIZACIONES POR ITEM
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_rfq_quotes (
    id SERIAL PRIMARY KEY,
    rfq_supplier_id INTEGER NOT NULL REFERENCES procurement_rfq_suppliers(id) ON DELETE CASCADE,
    rfq_item_id INTEGER NOT NULL REFERENCES procurement_rfq_items(id) ON DELETE CASCADE,

    unit_price DECIMAL(15,4) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Detalles
    delivery_days INTEGER,
    min_order_quantity DECIMAL(15,4),
    observations TEXT,
    alternative_offered BOOLEAN DEFAULT false,
    alternative_description TEXT,

    -- Comparativo (calculado)
    price_ranking INTEGER,  -- 1 = mas barato
    vs_reference_percent DECIMAL(5,2),  -- +10% o -5% vs precio referencia
    vs_best_percent DECIMAL(5,2),  -- +10% o -5% vs mejor precio

    -- Adjudicacion
    is_awarded BOOLEAN DEFAULT false,
    awarded_quantity DECIMAL(15,4),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(rfq_supplier_id, rfq_item_id)
);

CREATE INDEX idx_rfq_quotes_supplier ON procurement_rfq_quotes(rfq_supplier_id);
CREATE INDEX idx_rfq_quotes_item ON procurement_rfq_quotes(rfq_item_id);

-- ============================================
-- 13. ORDENES DE COMPRA
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    order_number VARCHAR(50) NOT NULL,

    -- Origen
    rfq_id INTEGER REFERENCES procurement_rfqs(id) ON DELETE SET NULL,
    requisition_id INTEGER REFERENCES procurement_requisitions(id) ON DELETE SET NULL,
    contract_id INTEGER REFERENCES procurement_contracts(id) ON DELETE SET NULL,

    -- Proveedor
    supplier_id INTEGER NOT NULL REFERENCES procurement_suppliers(id),
    supplier_name VARCHAR(255),  -- Cache

    -- Fechas
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,

    -- Estado
    status VARCHAR(50) DEFAULT 'draft',
    -- draft, pending_approval, approved, sent, acknowledged, in_transit,
    -- partial_received, received, closed_complete, closed_incomplete,
    -- cancelled, disputed

    -- Totales
    subtotal DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Moneda Base (para reportes)
    base_currency VARCHAR(3) DEFAULT 'ARS',
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    total_in_base_currency DECIMAL(15,2),

    -- Terminos Comerciales
    payment_terms TEXT,
    payment_method VARCHAR(50),  -- 'transfer', 'check', 'credit', 'cash'
    payment_days INTEGER DEFAULT 30,
    incoterm VARCHAR(10),
    delivery_address TEXT,
    delivery_instructions TEXT,
    special_conditions TEXT,

    -- Aprobacion
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(user_id),
    approval_notes TEXT,
    rejection_reason TEXT,

    -- Envio al Proveedor
    sent_at TIMESTAMP,
    sent_method VARCHAR(50),  -- 'notification', 'email', 'manual'
    sent_notification_id BIGINT,
    acknowledged_at TIMESTAMP,
    acknowledgment_notes TEXT,

    -- Recepcion
    reception_status VARCHAR(50) DEFAULT 'pending',
    -- pending, partial, complete, rejected
    received_at TIMESTAMP,
    received_by UUID REFERENCES users(user_id),
    reception_notes TEXT,
    items_received INTEGER DEFAULT 0,
    items_rejected INTEGER DEFAULT 0,

    -- Facturacion
    invoice_status VARCHAR(50) DEFAULT 'pending',
    -- pending, partial, complete, mismatch
    invoiced_amount DECIMAL(15,2) DEFAULT 0,

    -- Pago
    payment_status VARCHAR(50) DEFAULT 'pending',
    -- pending, scheduled, partial_paid, paid, disputed
    paid_amount DECIMAL(15,2) DEFAULT 0,
    paid_at TIMESTAMP,

    -- Three-Way Matching
    matching_status VARCHAR(50) DEFAULT 'pending',
    -- pending, matched, discrepancy, approved_with_tolerance
    matching_discrepancy DECIMAL(15,2),

    -- Auditoria
    audit_trail JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, order_number)
);

CREATE INDEX idx_orders_supplier ON procurement_orders(supplier_id, status);
CREATE INDEX idx_orders_status ON procurement_orders(company_id, status);
CREATE INDEX idx_orders_date ON procurement_orders(order_date DESC);
CREATE INDEX idx_orders_payment ON procurement_orders(company_id, payment_status);

-- ============================================
-- 14. ITEMS DE ORDEN DE COMPRA
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES procurement_orders(id) ON DELETE CASCADE,

    line_number INTEGER NOT NULL,
    item_id INTEGER REFERENCES procurement_items(id) ON DELETE SET NULL,
    rfq_quote_id INTEGER REFERENCES procurement_rfq_quotes(id) ON DELETE SET NULL,
    contract_item_id INTEGER REFERENCES procurement_contract_items(id) ON DELETE SET NULL,

    item_code VARCHAR(100),
    item_description VARCHAR(500) NOT NULL,
    specifications TEXT,

    quantity_ordered DECIMAL(15,4) NOT NULL,
    quantity_received DECIMAL(15,4) DEFAULT 0,
    quantity_rejected DECIMAL(15,4) DEFAULT 0,
    quantity_invoiced DECIMAL(15,4) DEFAULT 0,
    unit_of_measure VARCHAR(50),

    unit_price DECIMAL(15,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(15,2) NOT NULL,

    -- Estado de Recepcion
    reception_status VARCHAR(50) DEFAULT 'pending',
    -- pending, partial, complete, rejected

    -- Control de Calidad
    quality_check VARCHAR(50) DEFAULT 'pending',  -- pending, passed, failed, conditional
    quality_notes TEXT,
    quality_checked_by UUID REFERENCES users(user_id),
    quality_checked_at TIMESTAMP,

    -- Entrega
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    delivery_notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(order_id, line_number)
);

CREATE INDEX idx_order_items_order ON procurement_order_items(order_id);
CREATE INDEX idx_order_items_item ON procurement_order_items(item_id);

-- ============================================
-- 15. RECEPCIONES DE MERCADERIA
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_receipts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    receipt_number VARCHAR(50) NOT NULL,
    order_id INTEGER NOT NULL REFERENCES procurement_orders(id),

    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID NOT NULL REFERENCES users(user_id),
    received_by_name VARCHAR(200),

    -- Estado
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, confirmed, rejected, partial

    -- Documentos del Proveedor
    delivery_note_number VARCHAR(100),
    delivery_note_date DATE,
    carrier_name VARCHAR(200),
    tracking_number VARCHAR(100),

    -- Ubicacion
    receiving_location VARCHAR(200),
    warehouse_id INTEGER,

    -- Observaciones
    general_observations TEXT,
    discrepancy_notes TEXT,

    -- Totales
    items_expected INTEGER DEFAULT 0,
    items_received INTEGER DEFAULT 0,
    items_rejected INTEGER DEFAULT 0,

    -- Notificacion al Solicitante
    notification_sent_at TIMESTAMP,
    notification_id BIGINT,

    -- Fotos/Evidencia
    photos JSONB DEFAULT '[]',

    -- Auditoria
    audit_trail JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, receipt_number)
);

CREATE INDEX idx_receipts_order ON procurement_receipts(order_id);
CREATE INDEX idx_receipts_date ON procurement_receipts(receipt_date DESC);

-- ============================================
-- 16. ITEMS DE RECEPCION
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES procurement_receipts(id) ON DELETE CASCADE,
    order_item_id INTEGER NOT NULL REFERENCES procurement_order_items(id),

    quantity_expected DECIMAL(15,4) NOT NULL,
    quantity_received DECIMAL(15,4) NOT NULL,
    quantity_rejected DECIMAL(15,4) DEFAULT 0,
    rejection_reason TEXT,

    -- Control de Calidad
    quality_status VARCHAR(50) DEFAULT 'pending',
    -- pending, approved, rejected, conditional
    quality_notes TEXT,
    quality_checked_by UUID REFERENCES users(user_id),
    quality_checked_at TIMESTAMP,

    -- Lote y Serie (si aplica)
    batch_number VARCHAR(100),
    serial_numbers JSONB DEFAULT '[]',
    expiry_date DATE,

    -- Ubicacion de Almacenamiento
    storage_location VARCHAR(100),

    -- Fotos/Evidencia
    photos JSONB DEFAULT '[]',

    observations TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(receipt_id, order_item_id)
);

CREATE INDEX idx_receipt_items_receipt ON procurement_receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_order_item ON procurement_receipt_items(order_item_id);

-- ============================================
-- 17. FACTURAS DE PROVEEDOR
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    invoice_number VARCHAR(100) NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES procurement_suppliers(id),
    supplier_name VARCHAR(255),  -- Cache

    -- Tipo de Comprobante
    invoice_type VARCHAR(50) DEFAULT 'A',  -- 'A', 'B', 'C', 'E' (segun regulacion local)
    cae_number VARCHAR(50),  -- Codigo de Autorizacion Electronica
    cae_expiry DATE,

    -- Ordenes Asociadas
    order_ids JSONB NOT NULL DEFAULT '[]',

    -- Datos de Factura
    invoice_date DATE NOT NULL,
    accounting_date DATE,
    due_date DATE NOT NULL,

    -- Montos
    subtotal DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    retention_amount DECIMAL(15,2) DEFAULT 0,  -- Retenciones
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Moneda Base
    base_currency VARCHAR(3) DEFAULT 'ARS',
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    total_in_base_currency DECIMAL(15,2),

    -- Three-Way Matching (Tolerancia 2%)
    matching_status VARCHAR(50) DEFAULT 'pending',
    -- pending, matched, discrepancy, approved_with_tolerance, rejected
    matching_discrepancy DECIMAL(15,2),
    matching_discrepancy_percent DECIMAL(5,2),
    matching_notes TEXT,
    tolerance_approved_by UUID REFERENCES users(user_id),
    tolerance_approved_at TIMESTAMP,

    -- Estado
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, verified, approved, scheduled, partial_paid, paid, rejected, disputed

    -- Documento Adjunto (cargado por proveedor)
    document_url TEXT,
    document_uploaded_at TIMESTAMP,
    document_format VARCHAR(20),  -- 'pdf', 'xml'

    -- Verificacion
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES users(user_id),
    verification_notes TEXT,

    -- Aprobacion para Pago
    approved_for_payment_at TIMESTAMP,
    approved_for_payment_by UUID REFERENCES users(user_id),
    rejection_reason TEXT,

    -- Pago
    payment_scheduled_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    payment_id INTEGER,  -- FK a procurement_payments

    -- Auditoria
    audit_trail JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, supplier_id, invoice_number)
);

CREATE INDEX idx_invoices_supplier ON procurement_invoices(supplier_id, status);
CREATE INDEX idx_invoices_status ON procurement_invoices(company_id, status);
CREATE INDEX idx_invoices_matching ON procurement_invoices(matching_status);
CREATE INDEX idx_invoices_payment ON procurement_invoices(company_id, payment_scheduled_date);

-- ============================================
-- 18. PAGOS A PROVEEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS procurement_payments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    payment_number VARCHAR(50) NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES procurement_suppliers(id),
    supplier_name VARCHAR(255),  -- Cache

    -- Facturas Incluidas
    invoice_ids JSONB NOT NULL,

    -- Monto
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Moneda Base
    base_currency VARCHAR(3) DEFAULT 'ARS',
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    total_in_base_currency DECIMAL(15,2),

    -- Cuenta Destino (copiada del proveedor)
    bank_account JSONB NOT NULL,
    -- {bank_name, account_type, account_number, cbu, alias, swift_code}

    -- Metodo
    payment_method VARCHAR(50) NOT NULL,
    -- 'wire_transfer', 'check', 'cash', 'credit_card'

    -- Estado
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, approved, processing, completed, failed, cancelled

    -- Aprobacion
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(user_id),
    approval_notes TEXT,

    -- Programacion y Ejecucion
    scheduled_date DATE,
    executed_at TIMESTAMP,
    executed_by UUID REFERENCES users(user_id),

    -- Referencia Bancaria
    bank_reference VARCHAR(100),
    bank_confirmation JSONB,
    transfer_receipt_url TEXT,

    -- Notificacion al Proveedor
    notification_sent_at TIMESTAMP,
    notification_id BIGINT,

    -- Error (si fallo)
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Auditoria
    audit_trail JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, payment_number)
);

CREATE INDEX idx_payments_supplier ON procurement_payments(supplier_id, status);
CREATE INDEX idx_payments_status ON procurement_payments(company_id, status, scheduled_date);
CREATE INDEX idx_payments_date ON procurement_payments(scheduled_date, status);

-- ============================================
-- FUNCIONES UTILITARIAS
-- ============================================

-- Funcion para generar numero de documento secuencial
CREATE OR REPLACE FUNCTION generate_procurement_number(
    p_company_id INTEGER,
    p_prefix VARCHAR(10),
    p_table_name VARCHAR(50)
) RETURNS VARCHAR(50) AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INTEGER;
    v_result VARCHAR(50);
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');

    -- Obtener siguiente secuencia
    EXECUTE format(
        'SELECT COALESCE(MAX(
            NULLIF(
                regexp_replace(%I, ''^.*-'', ''''),
                ''''
            )::INTEGER
        ), 0) + 1
        FROM %I
        WHERE company_id = $1
        AND %I LIKE $2',
        p_prefix || '_number',
        p_table_name,
        p_prefix || '_number'
    ) INTO v_sequence USING p_company_id, p_prefix || '-' || v_year || '-%';

    -- Formato: PREFIX-YYYY-NNNNNN
    v_result := p_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Funcion para calcular scoring de proveedor
CREATE OR REPLACE FUNCTION calculate_supplier_score(p_supplier_id INTEGER)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    v_quality DECIMAL(3,2);
    v_delivery DECIMAL(3,2);
    v_price DECIMAL(3,2);
    v_service DECIMAL(3,2);
    v_overall DECIMAL(3,2);
BEGIN
    SELECT
        quality_score,
        delivery_score,
        price_score,
        service_score
    INTO v_quality, v_delivery, v_price, v_service
    FROM procurement_suppliers
    WHERE id = p_supplier_id;

    -- Pesos: Quality 30%, Delivery 25%, Price 25%, Service 20%
    v_overall := (v_quality * 0.30) + (v_delivery * 0.25) + (v_price * 0.25) + (v_service * 0.20);

    UPDATE procurement_suppliers
    SET overall_score = v_overall,
        updated_at = NOW()
    WHERE id = p_supplier_id;

    RETURN v_overall;
END;
$$ LANGUAGE plpgsql;

-- Funcion para Three-Way Matching
CREATE OR REPLACE FUNCTION perform_three_way_match(p_invoice_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_order_total DECIMAL(15,2) := 0;
    v_received_total DECIMAL(15,2) := 0;
    v_discrepancy DECIMAL(15,2);
    v_discrepancy_percent DECIMAL(5,2);
    v_status VARCHAR(50);
    v_tolerance DECIMAL(5,2) := 2.0;  -- Tolerancia 2%
    v_block_threshold DECIMAL(5,2) := 10.0;  -- Bloquear si > 10%
BEGIN
    -- Obtener factura
    SELECT * INTO v_invoice FROM procurement_invoices WHERE id = p_invoice_id;

    -- Calcular total de ordenes
    SELECT COALESCE(SUM(oi.total_price), 0)
    INTO v_order_total
    FROM procurement_order_items oi
    JOIN procurement_orders o ON o.id = oi.order_id
    WHERE o.id = ANY(ARRAY(SELECT jsonb_array_elements_text(v_invoice.order_ids)::INTEGER));

    -- Calcular total recibido (basado en recepciones)
    SELECT COALESCE(SUM(ri.quantity_received * oi.unit_price), 0)
    INTO v_received_total
    FROM procurement_receipt_items ri
    JOIN procurement_order_items oi ON oi.id = ri.order_item_id
    JOIN procurement_receipts r ON r.id = ri.receipt_id
    JOIN procurement_orders o ON o.id = r.order_id
    WHERE o.id = ANY(ARRAY(SELECT jsonb_array_elements_text(v_invoice.order_ids)::INTEGER))
    AND ri.quality_status = 'approved';

    -- Calcular discrepancia
    v_discrepancy := ABS(v_invoice.total_amount - v_received_total);
    v_discrepancy_percent := (v_discrepancy / NULLIF(v_received_total, 0)) * 100;

    -- Determinar estado
    IF v_discrepancy = 0 THEN
        v_status := 'matched';
    ELSIF v_discrepancy_percent <= v_tolerance THEN
        v_status := 'approved_with_tolerance';
    ELSIF v_discrepancy_percent > v_block_threshold THEN
        v_status := 'rejected';
    ELSE
        v_status := 'discrepancy';
    END IF;

    -- Actualizar factura
    UPDATE procurement_invoices
    SET matching_status = v_status,
        matching_discrepancy = v_discrepancy,
        matching_discrepancy_percent = v_discrepancy_percent,
        updated_at = NOW()
    WHERE id = p_invoice_id;

    RETURN jsonb_build_object(
        'status', v_status,
        'order_total', v_order_total,
        'received_total', v_received_total,
        'invoice_total', v_invoice.total_amount,
        'discrepancy', v_discrepancy,
        'discrepancy_percent', v_discrepancy_percent,
        'tolerance', v_tolerance
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar totales de requisicion
CREATE OR REPLACE FUNCTION update_requisition_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE procurement_requisitions
    SET estimated_total = (
            SELECT COALESCE(SUM(estimated_total), 0)
            FROM procurement_requisition_items
            WHERE requisition_id = COALESCE(NEW.requisition_id, OLD.requisition_id)
        ),
        item_count = (
            SELECT COUNT(*)
            FROM procurement_requisition_items
            WHERE requisition_id = COALESCE(NEW.requisition_id, OLD.requisition_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.requisition_id, OLD.requisition_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_requisition_totals
AFTER INSERT OR UPDATE OR DELETE ON procurement_requisition_items
FOR EACH ROW EXECUTE FUNCTION update_requisition_totals();

-- Trigger para actualizar totales de orden
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE procurement_orders
    SET subtotal = (
            SELECT COALESCE(SUM(total_price), 0)
            FROM procurement_order_items
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);

    -- Recalcular total con impuestos
    UPDATE procurement_orders
    SET total_amount = subtotal + tax_amount + shipping_amount - discount_amount
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_order_totals
AFTER INSERT OR UPDATE OR DELETE ON procurement_order_items
FOR EACH ROW EXECUTE FUNCTION update_order_totals();

-- Trigger para actualizar cantidad recibida en items de orden
CREATE OR REPLACE FUNCTION update_order_item_received()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE procurement_order_items
    SET quantity_received = (
            SELECT COALESCE(SUM(quantity_received), 0)
            FROM procurement_receipt_items
            WHERE order_item_id = NEW.order_item_id
            AND quality_status IN ('approved', 'conditional')
        ),
        quantity_rejected = (
            SELECT COALESCE(SUM(quantity_rejected), 0)
            FROM procurement_receipt_items
            WHERE order_item_id = NEW.order_item_id
        ),
        updated_at = NOW()
    WHERE id = NEW.order_item_id;

    -- Actualizar estado de recepcion
    UPDATE procurement_order_items
    SET reception_status = CASE
        WHEN quantity_received >= quantity_ordered THEN 'complete'
        WHEN quantity_received > 0 THEN 'partial'
        ELSE 'pending'
    END
    WHERE id = NEW.order_item_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_order_item_received
AFTER INSERT OR UPDATE ON procurement_receipt_items
FOR EACH ROW EXECUTE FUNCTION update_order_item_received();

-- Trigger para actualizar consumo de contrato
CREATE OR REPLACE FUNCTION update_contract_consumption()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contract_item_id IS NOT NULL THEN
        UPDATE procurement_contract_items
        SET consumed_quantity = consumed_quantity + NEW.quantity_ordered,
            updated_at = NOW()
        WHERE id = NEW.contract_item_id;

        -- Actualizar consumo del contrato padre
        UPDATE procurement_contracts c
        SET consumed_amount = (
            SELECT COALESCE(SUM(ci.consumed_quantity * ci.agreed_price), 0)
            FROM procurement_contract_items ci
            WHERE ci.contract_id = c.id
        ),
        updated_at = NOW()
        WHERE id = (
            SELECT contract_id FROM procurement_contract_items
            WHERE id = NEW.contract_item_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_contract_consumption
AFTER INSERT ON procurement_order_items
FOR EACH ROW EXECUTE FUNCTION update_contract_consumption();

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Categorias globales
INSERT INTO procurement_categories (company_id, code, name, level, path) VALUES
    (NULL, 'GOODS', 'Bienes', 1, '1'),
    (NULL, 'SERVICES', 'Servicios', 1, '2'),
    (NULL, 'RAW_MATERIALS', 'Materias Primas', 2, '1.1'),
    (NULL, 'SUPPLIES', 'Insumos', 2, '1.2'),
    (NULL, 'EQUIPMENT', 'Equipamiento', 2, '1.3'),
    (NULL, 'OFFICE', 'Oficina', 2, '1.4'),
    (NULL, 'IT', 'Tecnologia', 2, '1.5'),
    (NULL, 'MAINTENANCE', 'Mantenimiento', 2, '2.1'),
    (NULL, 'CONSULTING', 'Consultoria', 2, '2.2'),
    (NULL, 'LOGISTICS', 'Logistica', 2, '2.3'),
    (NULL, 'PROFESSIONAL', 'Servicios Profesionales', 2, '2.4'),
    (NULL, 'CLEANING', 'Limpieza', 2, '2.5')
ON CONFLICT DO NOTHING;

-- Tipos de cambio iniciales (globales)
INSERT INTO procurement_exchange_rates (company_id, from_currency, to_currency, rate, rate_date, source) VALUES
    (NULL, 'USD', 'ARS', 1050.00, CURRENT_DATE, 'manual'),
    (NULL, 'EUR', 'ARS', 1150.00, CURRENT_DATE, 'manual'),
    (NULL, 'BRL', 'ARS', 175.00, CURRENT_DATE, 'manual'),
    (NULL, 'ARS', 'USD', 0.00095, CURRENT_DATE, 'manual'),
    (NULL, 'ARS', 'EUR', 0.00087, CURRENT_DATE, 'manual'),
    (NULL, 'ARS', 'BRL', 0.00571, CURRENT_DATE, 'manual')
ON CONFLICT DO NOTHING;

-- ============================================
-- COMENTARIOS DE DOCUMENTACION
-- ============================================

COMMENT ON TABLE procurement_suppliers IS 'Maestro de proveedores con scoring, documentacion y ESG';
COMMENT ON TABLE procurement_categories IS 'Categorias jerarquicas de productos/servicios';
COMMENT ON TABLE procurement_items IS 'Catalogo de productos/servicios con historial de proveedores';
COMMENT ON TABLE procurement_exchange_rates IS 'Tipos de cambio para operaciones multi-moneda';
COMMENT ON TABLE procurement_contracts IS 'Contratos marco con proveedores';
COMMENT ON TABLE procurement_contract_items IS 'Items de contrato con precios pre-acordados';
COMMENT ON TABLE procurement_requisitions IS 'Solicitudes de compra con workflow de aprobacion';
COMMENT ON TABLE procurement_requisition_items IS 'Items de solicitud de compra';
COMMENT ON TABLE procurement_rfqs IS 'Solicitudes de cotizacion (RFQ)';
COMMENT ON TABLE procurement_rfq_items IS 'Items de RFQ';
COMMENT ON TABLE procurement_rfq_suppliers IS 'Proveedores invitados a RFQ y sus cotizaciones';
COMMENT ON TABLE procurement_rfq_quotes IS 'Cotizaciones por item';
COMMENT ON TABLE procurement_orders IS 'Ordenes de compra';
COMMENT ON TABLE procurement_order_items IS 'Items de orden de compra';
COMMENT ON TABLE procurement_receipts IS 'Recepciones de mercaderia';
COMMENT ON TABLE procurement_receipt_items IS 'Items de recepcion';
COMMENT ON TABLE procurement_invoices IS 'Facturas de proveedor con three-way matching';
COMMENT ON TABLE procurement_payments IS 'Pagos a proveedores';

-- ============================================
-- FIN DE MIGRACION
-- ============================================
