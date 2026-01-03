-- ═══════════════════════════════════════════════════════════════════════════════
-- SUPPLIER PORTAL & P2P (PROCURE-TO-PAY) COMPLETE SYSTEM
-- Sistema completo de gestión de proveedores con portal descentralizado
-- Fecha: 2025-12-31
--
-- Flujo completo:
--   1. Requisición (manual o desde reorder suggestions)
--   2. RFQ (Request for Quotation) → Notificación a proveedores
--   3. Cotizaciones de proveedores (via portal)
--   4. Comparación y selección
--   5. Orden de Compra
--   6. Recepción de mercadería
--   7. Factura del proveedor
--   8. Reclamos (si aplica) → Bloquea pago
--   9. Resolución (Reemplazo/NC)
--   10. Orden de Pago
--
-- SSOT: Multi-tenant con company_id
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 1: EXTENSIÓN DE PROVEEDORES PARA PORTAL                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 1.1 Credenciales de acceso al portal de proveedores
CREATE TABLE IF NOT EXISTS supplier_portal_users (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(30),
    position VARCHAR(100), -- Cargo: Vendedor, Gerente, etc.
    role VARCHAR(30) DEFAULT 'sales', -- admin, sales, viewer
    is_primary_contact BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    verification_token VARCHAR(100),
    reset_token VARCHAR(100),
    reset_token_expires TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_supplier_portal_supplier ON supplier_portal_users(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_portal_email ON supplier_portal_users(email);

-- 1.2 Extensión de wms_suppliers para portal
DO $$
BEGIN
    -- Portal habilitado
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'portal_enabled') THEN
        ALTER TABLE wms_suppliers ADD COLUMN portal_enabled BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'portal_activated_at') THEN
        ALTER TABLE wms_suppliers ADD COLUMN portal_activated_at TIMESTAMPTZ;
    END IF;
    -- Datos bancarios para pagos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'bank_name') THEN
        ALTER TABLE wms_suppliers ADD COLUMN bank_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'bank_account_type') THEN
        ALTER TABLE wms_suppliers ADD COLUMN bank_account_type VARCHAR(30); -- CC, CA, etc
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'bank_account_number') THEN
        ALTER TABLE wms_suppliers ADD COLUMN bank_account_number VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'bank_cbu') THEN
        ALTER TABLE wms_suppliers ADD COLUMN bank_cbu VARCHAR(30);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'bank_alias') THEN
        ALTER TABLE wms_suppliers ADD COLUMN bank_alias VARCHAR(50);
    END IF;
    -- Scoring y estadísticas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'rating_score') THEN
        ALTER TABLE wms_suppliers ADD COLUMN rating_score DECIMAL(3,2) DEFAULT 0; -- 0.00 - 5.00
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'total_orders') THEN
        ALTER TABLE wms_suppliers ADD COLUMN total_orders INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'total_amount') THEN
        ALTER TABLE wms_suppliers ADD COLUMN total_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'on_time_delivery_rate') THEN
        ALTER TABLE wms_suppliers ADD COLUMN on_time_delivery_rate DECIMAL(5,2) DEFAULT 0; -- %
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'quality_rate') THEN
        ALTER TABLE wms_suppliers ADD COLUMN quality_rate DECIMAL(5,2) DEFAULT 100; -- %
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wms_suppliers' AND column_name = 'claims_count') THEN
        ALTER TABLE wms_suppliers ADD COLUMN claims_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 2: REQUISICIONES DE COMPRA                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 2.1 Requisiciones de compra (origen de todo el proceso)
CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    requisition_number VARCHAR(30) NOT NULL,
    source_type VARCHAR(30) NOT NULL, -- manual, reorder_suggestion, branch_request, consolidated
    source_id INTEGER, -- ID de la fuente (reorder_suggestion_id, branch_request_id, etc)
    warehouse_id INTEGER,
    department_id INTEGER,
    title VARCHAR(200),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    needed_date DATE,
    estimated_total DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'draft', -- draft, pending_approval, approved, rfq_sent, quoted, ordered, completed, cancelled
    requested_by INTEGER, -- user_id
    requested_at TIMESTAMPTZ,
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    rejected_by INTEGER,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, requisition_number)
);

CREATE INDEX IF NOT EXISTS idx_pr_company_status ON purchase_requisitions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_pr_source ON purchase_requisitions(source_type, source_id);

-- 2.2 Items de requisición
CREATE TABLE IF NOT EXISTS purchase_requisition_items (
    id SERIAL PRIMARY KEY,
    requisition_id INTEGER NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity DECIMAL(12,3) NOT NULL,
    unit_of_measure VARCHAR(20),
    estimated_unit_price DECIMAL(15,4),
    estimated_total DECIMAL(15,2),
    preferred_supplier_id INTEGER REFERENCES wms_suppliers(id),
    specifications TEXT, -- Especificaciones técnicas
    current_stock DECIMAL(12,3),
    reorder_point DECIMAL(12,3),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pri_requisition ON purchase_requisition_items(requisition_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 3: REQUEST FOR QUOTATION (RFQ) - SOLICITUD DE COTIZACIÓN                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 3.1 Solicitudes de cotización
CREATE TABLE IF NOT EXISTS request_for_quotations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    rfq_number VARCHAR(30) NOT NULL,
    requisition_id INTEGER REFERENCES purchase_requisitions(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    rfq_type VARCHAR(20) DEFAULT 'standard', -- standard, urgent, sealed (sobre cerrado)
    quotation_deadline TIMESTAMPTZ NOT NULL, -- Fecha límite para cotizar
    delivery_deadline DATE, -- Fecha requerida de entrega
    delivery_address TEXT,
    payment_terms_required VARCHAR(100), -- Condiciones de pago requeridas
    warranty_required VARCHAR(100),
    evaluation_criteria JSONB DEFAULT '{"price": 60, "quality": 20, "delivery": 20}', -- Criterios de evaluación %
    allow_partial_quotation BOOLEAN DEFAULT true, -- Permite cotizar parcialmente
    allow_alternatives BOOLEAN DEFAULT false, -- Permite productos alternativos
    requires_samples BOOLEAN DEFAULT false,
    min_suppliers_required INTEGER DEFAULT 1,
    status VARCHAR(30) DEFAULT 'draft', -- draft, published, in_progress, evaluation, awarded, cancelled
    published_at TIMESTAMPTZ,
    published_by INTEGER,
    closed_at TIMESTAMPTZ,
    awarded_at TIMESTAMPTZ,
    awarded_by INTEGER,
    cancellation_reason TEXT,
    notes TEXT,
    internal_notes TEXT, -- Notas internas no visibles para proveedores
    attachments JSONB DEFAULT '[]', -- [{name, url, type}]
    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, rfq_number)
);

CREATE INDEX IF NOT EXISTS idx_rfq_company_status ON request_for_quotations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_rfq_deadline ON request_for_quotations(quotation_deadline);

-- 3.2 Items del RFQ
CREATE TABLE IF NOT EXISTS rfq_items (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL REFERENCES request_for_quotations(id) ON DELETE CASCADE,
    requisition_item_id INTEGER REFERENCES purchase_requisition_items(id),
    item_number INTEGER NOT NULL,
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    specifications TEXT,
    quantity DECIMAL(12,3) NOT NULL,
    unit_of_measure VARCHAR(20),
    target_price DECIMAL(15,4), -- Precio objetivo (no siempre visible)
    show_target_price BOOLEAN DEFAULT false,
    allow_alternatives BOOLEAN DEFAULT false,
    required BOOLEAN DEFAULT true, -- Item obligatorio o opcional
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfqi_rfq ON rfq_items(rfq_id);

-- 3.3 Invitaciones a proveedores
CREATE TABLE IF NOT EXISTS rfq_invitations (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL REFERENCES request_for_quotations(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
    invitation_sent_at TIMESTAMPTZ,
    invitation_method VARCHAR(20) DEFAULT 'email', -- email, portal, both
    email_sent_to VARCHAR(255),
    viewed_at TIMESTAMPTZ, -- Cuando el proveedor vio la invitación
    responded BOOLEAN DEFAULT false,
    response_date TIMESTAMPTZ,
    declined BOOLEAN DEFAULT false,
    decline_reason TEXT,
    quotation_id INTEGER, -- Se llena cuando el proveedor cotiza
    reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_rfqi_rfq_supplier ON rfq_invitations(rfq_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfqi_supplier ON rfq_invitations(supplier_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 4: COTIZACIONES DE PROVEEDORES                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 4.1 Cotizaciones (ofertas de proveedores)
CREATE TABLE IF NOT EXISTS supplier_quotations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    rfq_id INTEGER NOT NULL REFERENCES request_for_quotations(id),
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
    quotation_number VARCHAR(30) NOT NULL,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    payment_terms VARCHAR(200),
    delivery_terms VARCHAR(200),
    delivery_days INTEGER, -- Días para entregar
    warranty_terms VARCHAR(200),
    notes TEXT,
    supplier_notes TEXT, -- Notas del proveedor
    attachments JSONB DEFAULT '[]',
    is_partial BOOLEAN DEFAULT false, -- Cotización parcial
    is_alternative BOOLEAN DEFAULT false, -- Incluye alternativas
    status VARCHAR(30) DEFAULT 'draft', -- draft, submitted, under_review, accepted, rejected, expired
    submitted_at TIMESTAMPTZ,
    submitted_by INTEGER, -- supplier_portal_user_id
    reviewed_at TIMESTAMPTZ,
    reviewed_by INTEGER, -- user_id de la empresa
    acceptance_notes TEXT,
    rejection_reason TEXT,
    score_price DECIMAL(5,2), -- Puntuación precio (calculada)
    score_quality DECIMAL(5,2), -- Puntuación calidad
    score_delivery DECIMAL(5,2), -- Puntuación entrega
    score_total DECIMAL(5,2), -- Puntuación total
    rank INTEGER, -- Ranking entre cotizaciones del RFQ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, quotation_number)
);

CREATE INDEX IF NOT EXISTS idx_sq_rfq ON supplier_quotations(rfq_id);
CREATE INDEX IF NOT EXISTS idx_sq_supplier ON supplier_quotations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sq_status ON supplier_quotations(status);

-- 4.2 Items de cotización
CREATE TABLE IF NOT EXISTS supplier_quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES supplier_quotations(id) ON DELETE CASCADE,
    rfq_item_id INTEGER REFERENCES rfq_items(id),
    item_number INTEGER NOT NULL,
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    is_alternative BOOLEAN DEFAULT false, -- Es producto alternativo
    alternative_for_item_id INTEGER, -- Si es alternativo, a qué item reemplaza
    quantity DECIMAL(12,3) NOT NULL,
    unit_of_measure VARCHAR(20),
    unit_price DECIMAL(15,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 21,
    line_total DECIMAL(15,2),
    delivery_days INTEGER,
    availability VARCHAR(50), -- in_stock, 3_days, 1_week, etc
    brand VARCHAR(100),
    origin VARCHAR(50),
    warranty VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sqi_quotation ON supplier_quotation_items(quotation_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 5: ÓRDENES DE COMPRA                                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 5.1 Órdenes de compra
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    po_number VARCHAR(30) NOT NULL,
    quotation_id INTEGER REFERENCES supplier_quotations(id),
    requisition_id INTEGER REFERENCES purchase_requisitions(id),
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
    warehouse_id INTEGER,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    delivery_address TEXT,
    currency VARCHAR(3) DEFAULT 'ARS',
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    payment_terms VARCHAR(200),
    delivery_terms VARCHAR(200),
    status VARCHAR(30) DEFAULT 'draft', -- draft, pending_approval, approved, sent, confirmed, partial_received, received, invoiced, completed, cancelled
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    sent_method VARCHAR(20), -- email, portal, manual
    confirmed_by_supplier BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMPTZ,
    received_complete BOOLEAN DEFAULT false,
    received_at TIMESTAMPTZ,
    invoiced BOOLEAN DEFAULT false,
    invoice_id INTEGER,
    payment_blocked BOOLEAN DEFAULT false, -- Bloqueado por reclamo
    payment_block_reason TEXT,
    cancellation_reason TEXT,
    notes TEXT,
    internal_notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, po_number)
);

CREATE INDEX IF NOT EXISTS idx_po_company_status ON purchase_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_payment_blocked ON purchase_orders(payment_blocked) WHERE payment_blocked = true;

-- 5.2 Items de orden de compra
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    quotation_item_id INTEGER REFERENCES supplier_quotation_items(id),
    item_number INTEGER NOT NULL,
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity_ordered DECIMAL(12,3) NOT NULL,
    quantity_received DECIMAL(12,3) DEFAULT 0,
    quantity_pending DECIMAL(12,3) DEFAULT 0,
    unit_of_measure VARCHAR(20),
    unit_price DECIMAL(15,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 21,
    line_total DECIMAL(15,2),
    expected_delivery_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, partial, received, cancelled
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 6: RECEPCIÓN DE MERCADERÍA                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 6.1 Recepciones de mercadería (Goods Receipt)
CREATE TABLE IF NOT EXISTS goods_receipts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    receipt_number VARCHAR(30) NOT NULL,
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
    warehouse_id INTEGER,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_time TIME DEFAULT CURRENT_TIME,
    delivery_note_number VARCHAR(50), -- Número de remito del proveedor
    delivery_note_date DATE,
    carrier_name VARCHAR(100),
    vehicle_plate VARCHAR(20),
    driver_name VARCHAR(100),
    total_items INTEGER DEFAULT 0,
    total_quantity DECIMAL(15,3) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, completed, with_issues
    quality_check_required BOOLEAN DEFAULT false,
    quality_check_status VARCHAR(20), -- pending, passed, failed, partial
    received_by INTEGER, -- user_id
    verified_by INTEGER,
    notes TEXT,
    issues_found TEXT,
    attachments JSONB DEFAULT '[]', -- Fotos, documentos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_gr_company ON goods_receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_gr_po ON goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_gr_supplier ON goods_receipts(supplier_id);

-- 6.2 Items recibidos
CREATE TABLE IF NOT EXISTS goods_receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    po_item_id INTEGER REFERENCES purchase_order_items(id),
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    quantity_expected DECIMAL(12,3),
    quantity_received DECIMAL(12,3) NOT NULL,
    quantity_accepted DECIMAL(12,3),
    quantity_rejected DECIMAL(12,3) DEFAULT 0,
    unit_of_measure VARCHAR(20),
    batch_number VARCHAR(50),
    serial_numbers JSONB DEFAULT '[]',
    expiry_date DATE,
    manufacturing_date DATE,
    location_id INTEGER, -- Ubicación destino
    quality_status VARCHAR(20) DEFAULT 'pending', -- pending, passed, failed, partial
    rejection_reason TEXT,
    unit_price DECIMAL(15,4),
    line_total DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gri_receipt ON goods_receipt_items(receipt_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 7: FACTURAS DE PROVEEDORES                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 7.1 Facturas de proveedores
CREATE TABLE IF NOT EXISTS supplier_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    internal_number VARCHAR(30) NOT NULL, -- Número interno
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    goods_receipt_id INTEGER REFERENCES goods_receipts(id),
    invoice_type VARCHAR(20) NOT NULL, -- A, B, C, M, E (tipos AFIP)
    invoice_number VARCHAR(30) NOT NULL, -- Número de factura del proveedor
    invoice_point_of_sale VARCHAR(10), -- Punto de venta
    invoice_date DATE NOT NULL,
    due_date DATE,
    cae VARCHAR(20), -- CAE de AFIP
    cae_expiry DATE,
    currency VARCHAR(3) DEFAULT 'ARS',
    exchange_rate DECIMAL(10,4) DEFAULT 1,
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    taxable_base DECIMAL(15,2) DEFAULT 0,
    iva_21 DECIMAL(15,2) DEFAULT 0,
    iva_10_5 DECIMAL(15,2) DEFAULT 0,
    iva_27 DECIMAL(15,2) DEFAULT 0,
    other_taxes DECIMAL(15,2) DEFAULT 0,
    perceptions DECIMAL(15,2) DEFAULT 0,
    retentions DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pending', -- pending, verified, approved, partial_paid, paid, disputed, cancelled
    payment_blocked BOOLEAN DEFAULT false,
    payment_block_reason TEXT,
    verified_by INTEGER,
    verified_at TIMESTAMPTZ,
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, internal_number)
);

CREATE INDEX IF NOT EXISTS idx_si_company_status ON supplier_invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_si_supplier ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_si_po ON supplier_invoices(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_si_due_date ON supplier_invoices(due_date);

-- 7.2 Items de factura
CREATE TABLE IF NOT EXISTS supplier_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
    po_item_id INTEGER REFERENCES purchase_order_items(id),
    gr_item_id INTEGER REFERENCES goods_receipt_items(id),
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    description TEXT,
    quantity DECIMAL(12,3) NOT NULL,
    unit_of_measure VARCHAR(20),
    unit_price DECIMAL(15,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 21,
    line_subtotal DECIMAL(15,2),
    line_tax DECIMAL(15,2),
    line_total DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sii_invoice ON supplier_invoice_items(invoice_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 8: SISTEMA DE RECLAMOS                                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 8.1 Reclamos a proveedores
CREATE TABLE IF NOT EXISTS supplier_claims (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    claim_number VARCHAR(30) NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    goods_receipt_id INTEGER REFERENCES goods_receipts(id),
    invoice_id INTEGER REFERENCES supplier_invoices(id),
    claim_type VARCHAR(30) NOT NULL, -- defective_product, wrong_product, missing_quantity, damaged, quality_issue, price_discrepancy, other
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    resolution_deadline DATE,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, critical
    description TEXT NOT NULL,
    total_affected_amount DECIMAL(15,2) DEFAULT 0,
    total_affected_quantity DECIMAL(12,3) DEFAULT 0,
    requested_resolution VARCHAR(30), -- replacement, credit_note, refund, discount, other
    status VARCHAR(30) DEFAULT 'draft', -- draft, submitted, acknowledged, in_progress, resolved, rejected, escalated, closed
    submitted_at TIMESTAMPTZ,
    submitted_by INTEGER,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by_supplier BOOLEAN DEFAULT false,
    supplier_response TEXT,
    supplier_response_date TIMESTAMPTZ,
    resolution_type VARCHAR(30), -- replacement, credit_note, refund, partial_credit, discount, no_action
    resolution_amount DECIMAL(15,2),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    attachments JSONB DEFAULT '[]', -- Fotos de productos, documentos
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, claim_number)
);

CREATE INDEX IF NOT EXISTS idx_sc_company_status ON supplier_claims(company_id, status);
CREATE INDEX IF NOT EXISTS idx_sc_supplier ON supplier_claims(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sc_po ON supplier_claims(purchase_order_id);

-- 8.2 Items del reclamo
CREATE TABLE IF NOT EXISTS supplier_claim_items (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES supplier_claims(id) ON DELETE CASCADE,
    po_item_id INTEGER REFERENCES purchase_order_items(id),
    gr_item_id INTEGER REFERENCES goods_receipt_items(id),
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    quantity_affected DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(15,4),
    total_affected DECIMAL(15,2),
    defect_type VARCHAR(50),
    defect_description TEXT,
    batch_number VARCHAR(50),
    serial_numbers JSONB DEFAULT '[]',
    photos JSONB DEFAULT '[]', -- URLs de fotos del defecto
    resolution_status VARCHAR(20) DEFAULT 'pending', -- pending, resolved, rejected
    resolution_type VARCHAR(30),
    resolution_quantity DECIMAL(12,3),
    resolution_amount DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sci_claim ON supplier_claim_items(claim_id);

-- 8.3 Historial de comunicación del reclamo
CREATE TABLE IF NOT EXISTS supplier_claim_messages (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES supplier_claims(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- company, supplier
    sender_user_id INTEGER,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scm_claim ON supplier_claim_messages(claim_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 9: REEMPLAZOS Y NOTAS DE CRÉDITO                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 9.1 Recepciones de reemplazo
CREATE TABLE IF NOT EXISTS replacement_receipts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    receipt_number VARCHAR(30) NOT NULL,
    claim_id INTEGER NOT NULL REFERENCES supplier_claims(id),
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
    warehouse_id INTEGER,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_note_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending', -- pending, received, verified, completed
    received_by INTEGER,
    verified_by INTEGER,
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_rr_claim ON replacement_receipts(claim_id);

-- 9.2 Items de reemplazo
CREATE TABLE IF NOT EXISTS replacement_receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES replacement_receipts(id) ON DELETE CASCADE,
    claim_item_id INTEGER REFERENCES supplier_claim_items(id),
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    quantity_expected DECIMAL(12,3),
    quantity_received DECIMAL(12,3) NOT NULL,
    batch_number VARCHAR(50),
    expiry_date DATE,
    quality_status VARCHAR(20) DEFAULT 'pending',
    location_id INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rri_receipt ON replacement_receipt_items(receipt_id);

-- 9.3 Notas de crédito de proveedores
CREATE TABLE IF NOT EXISTS supplier_credit_notes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    internal_number VARCHAR(30) NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
    claim_id INTEGER REFERENCES supplier_claims(id),
    invoice_id INTEGER REFERENCES supplier_invoices(id), -- Factura que afecta
    credit_note_type VARCHAR(20) NOT NULL, -- A, B, C (tipo fiscal)
    credit_note_number VARCHAR(30) NOT NULL, -- Número del proveedor
    credit_note_point_of_sale VARCHAR(10),
    credit_note_date DATE NOT NULL,
    cae VARCHAR(20),
    cae_expiry DATE,
    reason VARCHAR(50) NOT NULL, -- claim_resolution, price_adjustment, quantity_adjustment, other
    description TEXT,
    currency VARCHAR(3) DEFAULT 'ARS',
    subtotal DECIMAL(15,2) DEFAULT 0,
    iva_21 DECIMAL(15,2) DEFAULT 0,
    iva_10_5 DECIMAL(15,2) DEFAULT 0,
    other_taxes DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    amount_applied DECIMAL(15,2) DEFAULT 0, -- Monto ya aplicado a facturas/pagos
    balance DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, applied, cancelled
    verified_by INTEGER,
    verified_at TIMESTAMPTZ,
    applied_to_invoice_id INTEGER,
    applied_at TIMESTAMPTZ,
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, internal_number)
);

CREATE INDEX IF NOT EXISTS idx_scn_company ON supplier_credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_scn_supplier ON supplier_credit_notes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_scn_claim ON supplier_credit_notes(claim_id);

-- 9.4 Items de nota de crédito
CREATE TABLE IF NOT EXISTS supplier_credit_note_items (
    id SERIAL PRIMARY KEY,
    credit_note_id INTEGER NOT NULL REFERENCES supplier_credit_notes(id) ON DELETE CASCADE,
    claim_item_id INTEGER REFERENCES supplier_claim_items(id),
    invoice_item_id INTEGER REFERENCES supplier_invoice_items(id),
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(15,4) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 21,
    line_subtotal DECIMAL(15,2),
    line_tax DECIMAL(15,2),
    line_total DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scni_cn ON supplier_credit_note_items(credit_note_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 10: ÓRDENES DE PAGO                                                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 10.1 Órdenes de pago
CREATE TABLE IF NOT EXISTS payment_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    payment_order_number VARCHAR(30) NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
    payment_date DATE,
    scheduled_date DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',
    total_invoices DECIMAL(15,2) DEFAULT 0,
    total_credit_notes DECIMAL(15,2) DEFAULT 0,
    total_retentions DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) DEFAULT 0, -- invoices - credit_notes - retentions
    payment_method VARCHAR(30), -- transfer, check, cash, credit_card
    bank_account_id INTEGER,
    reference_number VARCHAR(50), -- Número de transferencia/cheque
    status VARCHAR(30) DEFAULT 'draft', -- draft, pending_approval, approved, scheduled, processing, paid, cancelled
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    paid_by INTEGER,
    paid_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    notes TEXT,
    attachments JSONB DEFAULT '[]', -- Comprobantes de pago
    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, payment_order_number)
);

CREATE INDEX IF NOT EXISTS idx_payor_company_status ON payment_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payor_supplier ON payment_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payor_scheduled ON payment_orders(scheduled_date);

-- 10.2 Detalle de facturas en la orden de pago
CREATE TABLE IF NOT EXISTS payment_order_invoices (
    id SERIAL PRIMARY KEY,
    payment_order_id INTEGER NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES supplier_invoices(id),
    amount_to_pay DECIMAL(15,2) NOT NULL,
    retentions JSONB DEFAULT '[]', -- [{type, rate, amount}]
    total_retentions DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2), -- amount_to_pay - retentions
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poi_po ON payment_order_invoices(payment_order_id);

-- 10.3 Notas de crédito aplicadas
CREATE TABLE IF NOT EXISTS payment_order_credit_notes (
    id SERIAL PRIMARY KEY,
    payment_order_id INTEGER NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    credit_note_id INTEGER NOT NULL REFERENCES supplier_credit_notes(id),
    amount_applied DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pocn_po ON payment_order_credit_notes(payment_order_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 11: OFERTAS Y PROMOCIONES DE PROVEEDORES                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 11.1 Ofertas/promociones de proveedores
CREATE TABLE IF NOT EXISTS supplier_offers (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id) ON DELETE CASCADE,
    offer_number VARCHAR(30),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    offer_type VARCHAR(30) NOT NULL, -- discount, bundle, volume, seasonal, clearance, new_product
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    min_order_amount DECIMAL(15,2),
    min_order_quantity DECIMAL(12,3),
    discount_type VARCHAR(20), -- percentage, fixed, price
    discount_value DECIMAL(10,2),
    free_shipping BOOLEAN DEFAULT false,
    terms_conditions TEXT,
    target_companies JSONB DEFAULT '[]', -- [] = todas, [1,2,3] = específicas
    status VARCHAR(20) DEFAULT 'draft', -- draft, pending_approval, active, expired, cancelled
    submitted_at TIMESTAMPTZ,
    submitted_by INTEGER, -- supplier_portal_user_id
    approved_at TIMESTAMPTZ,
    approved_by INTEGER, -- user_id empresa
    rejection_reason TEXT,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    orders_generated INTEGER DEFAULT 0,
    revenue_generated DECIMAL(15,2) DEFAULT 0,
    attachments JSONB DEFAULT '[]', -- Catálogos, imágenes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_so_supplier ON supplier_offers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_so_status ON supplier_offers(status);
CREATE INDEX IF NOT EXISTS idx_so_dates ON supplier_offers(valid_from, valid_until);

-- 11.2 Productos en oferta
CREATE TABLE IF NOT EXISTS supplier_offer_items (
    id SERIAL PRIMARY KEY,
    offer_id INTEGER NOT NULL REFERENCES supplier_offers(id) ON DELETE CASCADE,
    product_id INTEGER,
    product_code VARCHAR(50),
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    regular_price DECIMAL(15,4),
    offer_price DECIMAL(15,4) NOT NULL,
    discount_percent DECIMAL(5,2),
    min_quantity DECIMAL(12,3) DEFAULT 1,
    max_quantity DECIMAL(12,3),
    available_stock DECIMAL(12,3),
    unit_of_measure VARCHAR(20),
    image_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soi_offer ON supplier_offer_items(offer_id);

-- 11.3 Visualizaciones de ofertas
CREATE TABLE IF NOT EXISTS supplier_offer_views (
    id SERIAL PRIMARY KEY,
    offer_id INTEGER NOT NULL REFERENCES supplier_offers(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    user_id INTEGER,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    view_date DATE DEFAULT CURRENT_DATE
);

-- Índice único para una vista por empresa por día
CREATE UNIQUE INDEX IF NOT EXISTS idx_sov_unique_daily ON supplier_offer_views(offer_id, company_id, view_date);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 12: NOTIFICACIONES DEL PORTAL                                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 12.1 Notificaciones para proveedores
CREATE TABLE IF NOT EXISTS supplier_notifications (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(company_id), -- Empresa que origina
    notification_type VARCHAR(50) NOT NULL, -- rfq_invitation, po_received, payment_scheduled, claim_received, etc
    title VARCHAR(200) NOT NULL,
    message TEXT,
    reference_type VARCHAR(30), -- rfq, purchase_order, claim, payment, etc
    reference_id INTEGER,
    priority VARCHAR(20) DEFAULT 'normal',
    action_url VARCHAR(500),
    action_required BOOLEAN DEFAULT false,
    action_deadline TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sn_supplier ON supplier_notifications(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sn_read ON supplier_notifications(supplier_id, read_at) WHERE read_at IS NULL;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 13: ESTADÍSTICAS Y MÉTRICAS                                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 13.1 Estadísticas mensuales por proveedor
CREATE TABLE IF NOT EXISTS supplier_monthly_stats (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    on_time_deliveries INTEGER DEFAULT 0,
    late_deliveries INTEGER DEFAULT 0,
    on_time_rate DECIMAL(5,2),
    total_claims INTEGER DEFAULT 0,
    claims_amount DECIMAL(15,2) DEFAULT 0,
    quality_rate DECIMAL(5,2),
    avg_response_time_hours DECIMAL(10,2), -- Tiempo promedio respuesta RFQ
    quotations_submitted INTEGER DEFAULT 0,
    quotations_won INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2),
    credit_notes_received INTEGER DEFAULT 0,
    credit_notes_amount DECIMAL(15,2) DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(supplier_id, company_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_sms_supplier ON supplier_monthly_stats(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sms_period ON supplier_monthly_stats(year, month);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 14: TRIGGERS Y FUNCIONES                                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 14.1 Función para generar números secuenciales
CREATE OR REPLACE FUNCTION generate_document_number(
    p_company_id INTEGER,
    p_prefix VARCHAR(10),
    p_table_name VARCHAR(50),
    p_column_name VARCHAR(50)
) RETURNS VARCHAR(30) AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INTEGER;
    v_result VARCHAR(30);
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    EXECUTE format(
        'SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM %L) AS INTEGER)), 0) + 1
         FROM %I
         WHERE company_id = $1
         AND %I LIKE $2',
        p_column_name,
        p_prefix || '-' || v_year || '-%',
        p_table_name,
        p_column_name
    ) INTO v_sequence USING p_company_id, p_prefix || '-' || v_year || '-%';

    v_result := p_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 14.2 Trigger para bloquear pago cuando hay reclamo
CREATE OR REPLACE FUNCTION block_payment_on_claim() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'submitted' AND NEW.purchase_order_id IS NOT NULL THEN
        UPDATE purchase_orders
        SET payment_blocked = true,
            payment_block_reason = 'Reclamo pendiente: ' || NEW.claim_number,
            updated_at = NOW()
        WHERE id = NEW.purchase_order_id;

        IF NEW.invoice_id IS NOT NULL THEN
            UPDATE supplier_invoices
            SET payment_blocked = true,
                payment_block_reason = 'Reclamo pendiente: ' || NEW.claim_number,
                updated_at = NOW()
            WHERE id = NEW.invoice_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_payment_on_claim ON supplier_claims;
CREATE TRIGGER trg_block_payment_on_claim
    AFTER INSERT OR UPDATE OF status ON supplier_claims
    FOR EACH ROW
    EXECUTE FUNCTION block_payment_on_claim();

-- 14.3 Trigger para desbloquear pago cuando se resuelve reclamo
CREATE OR REPLACE FUNCTION unblock_payment_on_resolution() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
        -- Verificar si hay otros reclamos pendientes para la misma OC
        IF NOT EXISTS (
            SELECT 1 FROM supplier_claims
            WHERE purchase_order_id = NEW.purchase_order_id
            AND id != NEW.id
            AND status NOT IN ('resolved', 'closed', 'rejected')
        ) THEN
            UPDATE purchase_orders
            SET payment_blocked = false,
                payment_block_reason = NULL,
                updated_at = NOW()
            WHERE id = NEW.purchase_order_id;

            UPDATE supplier_invoices
            SET payment_blocked = false,
                payment_block_reason = NULL,
                updated_at = NOW()
            WHERE purchase_order_id = NEW.purchase_order_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unblock_payment_on_resolution ON supplier_claims;
CREATE TRIGGER trg_unblock_payment_on_resolution
    AFTER UPDATE OF status ON supplier_claims
    FOR EACH ROW
    EXECUTE FUNCTION unblock_payment_on_resolution();

-- 14.4 Función para crear requisición desde reorder_suggestion
CREATE OR REPLACE FUNCTION create_requisition_from_reorder(
    p_reorder_ids INTEGER[],
    p_company_id INTEGER,
    p_user_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_requisition_id INTEGER;
    v_requisition_number VARCHAR(30);
BEGIN
    -- Generar número
    v_requisition_number := generate_document_number(p_company_id, 'REQ', 'purchase_requisitions', 'requisition_number');

    -- Crear requisición
    INSERT INTO purchase_requisitions (
        company_id, requisition_number, source_type, title, priority, status, requested_by, requested_at
    ) VALUES (
        p_company_id, v_requisition_number, 'reorder_suggestion',
        'Reposición automática - ' || TO_CHAR(NOW(), 'DD/MM/YYYY'),
        'normal', 'draft', p_user_id, NOW()
    ) RETURNING id INTO v_requisition_id;

    -- Agregar items
    INSERT INTO purchase_requisition_items (
        requisition_id, product_id, product_code, product_name, quantity,
        unit_of_measure, estimated_unit_price, estimated_total,
        preferred_supplier_id, current_stock, reorder_point
    )
    SELECT
        v_requisition_id,
        rs.product_id,
        rs.product_code,
        rs.product_name,
        rs.suggested_quantity,
        'UN',
        rs.estimated_unit_cost,
        rs.estimated_total,
        rs.supplier_id,
        rs.current_stock,
        rs.reorder_point
    FROM retail_reorder_suggestions rs
    WHERE rs.id = ANY(p_reorder_ids)
    AND rs.company_id = p_company_id;

    -- Marcar sugerencias como procesadas
    UPDATE retail_reorder_suggestions
    SET status = 'approved', reviewed_at = NOW(), reviewed_by = p_user_id
    WHERE id = ANY(p_reorder_ids);

    RETURN v_requisition_id;
END;
$$ LANGUAGE plpgsql;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 15: VISTAS ÚTILES                                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 15.1 Vista de estado de cuenta del proveedor
CREATE OR REPLACE VIEW supplier_account_statement AS
SELECT
    s.id as supplier_id,
    s.name as supplier_name,
    s.company_id,
    COALESCE(inv.total_invoiced, 0) as total_invoiced,
    COALESCE(inv.total_paid, 0) as total_paid,
    COALESCE(cn.total_credits, 0) as total_credits,
    COALESCE(inv.total_invoiced, 0) - COALESCE(inv.total_paid, 0) - COALESCE(cn.total_credits, 0) as balance_due,
    COALESCE(inv.invoices_pending, 0) as invoices_pending,
    COALESCE(inv.oldest_due_date, NULL) as oldest_due_date,
    COALESCE(claims.open_claims, 0) as open_claims,
    COALESCE(claims.claims_amount, 0) as claims_blocked_amount
FROM wms_suppliers s
LEFT JOIN (
    SELECT supplier_id, company_id,
           SUM(total_amount) as total_invoiced,
           SUM(amount_paid) as total_paid,
           COUNT(*) FILTER (WHERE status IN ('pending', 'verified', 'approved')) as invoices_pending,
           MIN(due_date) FILTER (WHERE status IN ('pending', 'verified', 'approved')) as oldest_due_date
    FROM supplier_invoices
    GROUP BY supplier_id, company_id
) inv ON inv.supplier_id = s.id AND inv.company_id = s.company_id
LEFT JOIN (
    SELECT supplier_id, company_id,
           SUM(total_amount) as total_credits
    FROM supplier_credit_notes
    WHERE status = 'verified'
    GROUP BY supplier_id, company_id
) cn ON cn.supplier_id = s.id AND cn.company_id = s.company_id
LEFT JOIN (
    SELECT supplier_id, company_id,
           COUNT(*) as open_claims,
           SUM(total_affected_amount) as claims_amount
    FROM supplier_claims
    WHERE status NOT IN ('resolved', 'closed', 'rejected')
    GROUP BY supplier_id, company_id
) claims ON claims.supplier_id = s.id AND claims.company_id = s.company_id;

-- 15.2 Vista de RFQs pendientes para proveedor
CREATE OR REPLACE VIEW supplier_pending_rfqs AS
SELECT
    ri.supplier_id,
    r.company_id,
    c.name as company_name,
    r.id as rfq_id,
    r.rfq_number,
    r.title,
    r.quotation_deadline,
    r.delivery_deadline,
    ri.invitation_sent_at,
    ri.viewed_at,
    ri.responded,
    ri.quotation_id,
    CASE
        WHEN ri.quotation_id IS NOT NULL THEN 'quoted'
        WHEN ri.declined THEN 'declined'
        WHEN r.quotation_deadline < NOW() THEN 'expired'
        WHEN ri.viewed_at IS NOT NULL THEN 'viewed'
        ELSE 'pending'
    END as invitation_status,
    (SELECT COUNT(*) FROM rfq_items WHERE rfq_id = r.id) as total_items
FROM rfq_invitations ri
JOIN request_for_quotations r ON r.id = ri.rfq_id
JOIN companies c ON c.company_id = r.company_id
WHERE r.status IN ('published', 'in_progress');

COMMENT ON TABLE supplier_portal_users IS 'Usuarios del portal de proveedores';
COMMENT ON TABLE purchase_requisitions IS 'Requisiciones de compra - origen del proceso P2P';
COMMENT ON TABLE request_for_quotations IS 'Solicitudes de cotización enviadas a proveedores';
COMMENT ON TABLE supplier_quotations IS 'Cotizaciones/ofertas recibidas de proveedores';
COMMENT ON TABLE purchase_orders IS 'Órdenes de compra aprobadas';
COMMENT ON TABLE goods_receipts IS 'Recepción de mercadería';
COMMENT ON TABLE supplier_invoices IS 'Facturas de proveedores';
COMMENT ON TABLE supplier_claims IS 'Reclamos a proveedores por defectos/diferencias';
COMMENT ON TABLE supplier_credit_notes IS 'Notas de crédito de proveedores';
COMMENT ON TABLE payment_orders IS 'Órdenes de pago a proveedores';
COMMENT ON TABLE supplier_offers IS 'Ofertas y promociones de proveedores';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE MIGRACIÓN P2P
-- ═══════════════════════════════════════════════════════════════════════════════
