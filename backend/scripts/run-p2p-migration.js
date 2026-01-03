/**
 * Script para ejecutar la migración del Portal de Proveedores P2P
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aedr15150302',
    database: 'attendance_system',
    connectionTimeoutMillis: 5000,
    query_timeout: 60000
});

// Migraciones separadas por partes
const migrations = [
    // PARTE 1: Portal Users
    `CREATE TABLE IF NOT EXISTS supplier_portal_users (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(30) DEFAULT 'sales',
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(30),
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        last_login TIMESTAMPTZ,
        login_count INTEGER DEFAULT 0,
        password_changed_at TIMESTAMPTZ,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // PARTE 2: Purchase Requisitions
    `CREATE TABLE IF NOT EXISTS purchase_requisitions (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        requisition_number VARCHAR(30) NOT NULL,
        source_type VARCHAR(30) NOT NULL DEFAULT 'manual',
        source_id INTEGER,
        department_id INTEGER,
        requested_by INTEGER,
        status VARCHAR(30) DEFAULT 'draft',
        priority VARCHAR(20) DEFAULT 'normal',
        required_date DATE,
        justification TEXT,
        total_estimated DECIMAL(15,2) DEFAULT 0,
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        rejected_by INTEGER,
        rejected_at TIMESTAMPTZ,
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, requisition_number)
    );`,

    `CREATE TABLE IF NOT EXISTS purchase_requisition_items (
        id SERIAL PRIMARY KEY,
        requisition_id INTEGER NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES wms_products(id),
        product_code VARCHAR(50),
        product_name VARCHAR(200) NOT NULL,
        description TEXT,
        quantity_requested DECIMAL(12,3) NOT NULL,
        unit_of_measure VARCHAR(20),
        estimated_unit_price DECIMAL(15,4),
        estimated_total DECIMAL(15,2),
        preferred_supplier_id INTEGER REFERENCES wms_suppliers(id),
        notes TEXT,
        status VARCHAR(30) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // PARTE 3: RFQ
    `CREATE TABLE IF NOT EXISTS request_for_quotations (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        rfq_number VARCHAR(30) NOT NULL,
        requisition_id INTEGER REFERENCES purchase_requisitions(id),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(30) DEFAULT 'draft',
        submission_deadline TIMESTAMPTZ NOT NULL,
        valid_until DATE,
        payment_terms VARCHAR(100),
        delivery_terms VARCHAR(200),
        delivery_address TEXT,
        requires_samples BOOLEAN DEFAULT false,
        min_suppliers INTEGER DEFAULT 1,
        evaluation_criteria JSONB DEFAULT '{}',
        created_by INTEGER,
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        cancelled_by INTEGER,
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        notes TEXT,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, rfq_number)
    );`,

    `CREATE TABLE IF NOT EXISTS rfq_items (
        id SERIAL PRIMARY KEY,
        rfq_id INTEGER NOT NULL REFERENCES request_for_quotations(id) ON DELETE CASCADE,
        requisition_item_id INTEGER REFERENCES purchase_requisition_items(id),
        product_id INTEGER REFERENCES wms_products(id),
        product_code VARCHAR(50),
        product_name VARCHAR(200) NOT NULL,
        specifications TEXT,
        quantity DECIMAL(12,3) NOT NULL,
        unit_of_measure VARCHAR(20),
        target_price DECIMAL(15,4),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS rfq_invitations (
        id SERIAL PRIMARY KEY,
        rfq_id INTEGER NOT NULL REFERENCES request_for_quotations(id) ON DELETE CASCADE,
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
        invitation_sent_at TIMESTAMPTZ,
        invitation_read_at TIMESTAMPTZ,
        status VARCHAR(30) DEFAULT 'pending',
        declined_reason TEXT,
        declined_at TIMESTAMPTZ,
        reminder_sent_at TIMESTAMPTZ,
        reminder_count INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(rfq_id, supplier_id)
    );`,

    // PARTE 4: Supplier Quotations
    `CREATE TABLE IF NOT EXISTS supplier_quotations (
        id SERIAL PRIMARY KEY,
        rfq_id INTEGER NOT NULL REFERENCES request_for_quotations(id),
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
        quotation_number VARCHAR(50),
        status VARCHAR(30) DEFAULT 'draft',
        currency VARCHAR(3) DEFAULT 'ARS',
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        valid_until DATE,
        delivery_days INTEGER,
        delivery_terms VARCHAR(200),
        payment_terms VARCHAR(100),
        warranty_terms TEXT,
        notes TEXT,
        attachments JSONB DEFAULT '[]',
        submitted_at TIMESTAMPTZ,
        submitted_by INTEGER,
        evaluation_score DECIMAL(5,2),
        evaluation_notes TEXT,
        is_winner BOOLEAN DEFAULT false,
        selected_at TIMESTAMPTZ,
        selected_by INTEGER,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(rfq_id, supplier_id)
    );`,

    `CREATE TABLE IF NOT EXISTS supplier_quotation_items (
        id SERIAL PRIMARY KEY,
        quotation_id INTEGER NOT NULL REFERENCES supplier_quotations(id) ON DELETE CASCADE,
        rfq_item_id INTEGER REFERENCES rfq_items(id),
        product_id INTEGER,
        product_code VARCHAR(50),
        product_name VARCHAR(200) NOT NULL,
        quantity DECIMAL(12,3) NOT NULL,
        unit_price DECIMAL(15,4) NOT NULL,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 21,
        line_subtotal DECIMAL(15,2),
        line_tax DECIMAL(15,2),
        line_total DECIMAL(15,2),
        delivery_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // PARTE 5: Purchase Orders
    `CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        po_number VARCHAR(30) NOT NULL,
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
        quotation_id INTEGER REFERENCES supplier_quotations(id),
        rfq_id INTEGER REFERENCES request_for_quotations(id),
        requisition_id INTEGER REFERENCES purchase_requisitions(id),
        status VARCHAR(30) DEFAULT 'draft',
        order_date DATE DEFAULT CURRENT_DATE,
        expected_delivery DATE,
        actual_delivery DATE,
        currency VARCHAR(3) DEFAULT 'ARS',
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        shipping_cost DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        payment_terms VARCHAR(100),
        delivery_terms VARCHAR(200),
        delivery_address TEXT,
        billing_address TEXT,
        payment_blocked BOOLEAN DEFAULT false,
        payment_block_reason TEXT,
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        cancelled_by INTEGER,
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        received_by INTEGER,
        received_at TIMESTAMPTZ,
        notes TEXT,
        internal_notes TEXT,
        attachments JSONB DEFAULT '[]',
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, po_number)
    );`,

    `CREATE TABLE IF NOT EXISTS purchase_order_items (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        quotation_item_id INTEGER REFERENCES supplier_quotation_items(id),
        product_id INTEGER REFERENCES wms_products(id),
        product_code VARCHAR(50),
        product_name VARCHAR(200) NOT NULL,
        description TEXT,
        quantity_ordered DECIMAL(12,3) NOT NULL,
        quantity_received DECIMAL(12,3) DEFAULT 0,
        quantity_pending DECIMAL(12,3) DEFAULT 0,
        unit_price DECIMAL(15,4) NOT NULL,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 21,
        line_subtotal DECIMAL(15,2),
        line_tax DECIMAL(15,2),
        line_total DECIMAL(15,2),
        expected_date DATE,
        status VARCHAR(30) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // PARTE 6: Goods Receipts
    `CREATE TABLE IF NOT EXISTS goods_receipts (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        receipt_number VARCHAR(30) NOT NULL,
        purchase_order_id INTEGER REFERENCES purchase_orders(id),
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
        warehouse_id INTEGER,
        receipt_date DATE DEFAULT CURRENT_DATE,
        delivery_note_number VARCHAR(50),
        delivery_note_date DATE,
        carrier VARCHAR(100),
        vehicle_plate VARCHAR(20),
        driver_name VARCHAR(100),
        status VARCHAR(30) DEFAULT 'pending',
        inspection_status VARCHAR(30) DEFAULT 'pending',
        inspection_notes TEXT,
        total_items INTEGER DEFAULT 0,
        total_quantity DECIMAL(12,3) DEFAULT 0,
        received_by INTEGER,
        inspected_by INTEGER,
        inspected_at TIMESTAMPTZ,
        notes TEXT,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, receipt_number)
    );`,

    `CREATE TABLE IF NOT EXISTS goods_receipt_items (
        id SERIAL PRIMARY KEY,
        receipt_id INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
        po_item_id INTEGER REFERENCES purchase_order_items(id),
        product_id INTEGER REFERENCES wms_products(id),
        product_code VARCHAR(50),
        product_name VARCHAR(200),
        quantity_expected DECIMAL(12,3),
        quantity_received DECIMAL(12,3) NOT NULL,
        quantity_accepted DECIMAL(12,3),
        quantity_rejected DECIMAL(12,3) DEFAULT 0,
        rejection_reason TEXT,
        batch_number VARCHAR(50),
        expiry_date DATE,
        location_id INTEGER,
        inspection_status VARCHAR(30) DEFAULT 'pending',
        inspection_notes TEXT,
        unit_cost DECIMAL(15,4),
        total_cost DECIMAL(15,2),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // PARTE 7: Supplier Invoices
    `CREATE TABLE IF NOT EXISTS supplier_invoices (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        invoice_number VARCHAR(50) NOT NULL,
        internal_number VARCHAR(30),
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
        purchase_order_id INTEGER REFERENCES purchase_orders(id),
        invoice_type VARCHAR(20) DEFAULT 'A',
        invoice_date DATE NOT NULL,
        due_date DATE,
        reception_date DATE DEFAULT CURRENT_DATE,
        currency VARCHAR(3) DEFAULT 'ARS',
        exchange_rate DECIMAL(12,6) DEFAULT 1,
        subtotal DECIMAL(15,2) NOT NULL,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        perception_amount DECIMAL(15,2) DEFAULT 0,
        retention_amount DECIMAL(15,2) DEFAULT 0,
        other_taxes DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) NOT NULL,
        amount_paid DECIMAL(15,2) DEFAULT 0,
        balance_due DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'pending',
        payment_status VARCHAR(30) DEFAULT 'pending',
        cae_number VARCHAR(20),
        cae_expiry DATE,
        verified_by INTEGER,
        verified_at TIMESTAMPTZ,
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        notes TEXT,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, internal_number)
    );`,

    `CREATE TABLE IF NOT EXISTS supplier_invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
        po_item_id INTEGER REFERENCES purchase_order_items(id),
        receipt_item_id INTEGER REFERENCES goods_receipt_items(id),
        product_id INTEGER REFERENCES wms_products(id),
        product_code VARCHAR(50),
        product_name VARCHAR(200),
        description TEXT,
        quantity DECIMAL(12,3) NOT NULL,
        unit_price DECIMAL(15,4) NOT NULL,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 21,
        line_subtotal DECIMAL(15,2),
        line_tax DECIMAL(15,2),
        line_total DECIMAL(15,2),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // PARTE 8: Claims
    `CREATE TABLE IF NOT EXISTS supplier_claims (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        claim_number VARCHAR(30) NOT NULL,
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
        purchase_order_id INTEGER REFERENCES purchase_orders(id),
        goods_receipt_id INTEGER REFERENCES goods_receipts(id),
        invoice_id INTEGER REFERENCES supplier_invoices(id),
        claim_type VARCHAR(30) NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(30) DEFAULT 'draft',
        requested_resolution VARCHAR(30),
        resolution_type VARCHAR(30),
        resolution_notes TEXT,
        total_claimed_amount DECIMAL(15,2) DEFAULT 0,
        total_approved_amount DECIMAL(15,2) DEFAULT 0,
        submitted_by INTEGER,
        submitted_at TIMESTAMPTZ,
        acknowledged_by INTEGER,
        acknowledged_at TIMESTAMPTZ,
        resolved_by INTEGER,
        resolved_at TIMESTAMPTZ,
        closed_by INTEGER,
        closed_at TIMESTAMPTZ,
        due_date DATE,
        description TEXT NOT NULL,
        attachments JSONB DEFAULT '[]',
        internal_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, claim_number)
    );`,

    `CREATE TABLE IF NOT EXISTS supplier_claim_items (
        id SERIAL PRIMARY KEY,
        claim_id INTEGER NOT NULL REFERENCES supplier_claims(id) ON DELETE CASCADE,
        po_item_id INTEGER REFERENCES purchase_order_items(id),
        receipt_item_id INTEGER REFERENCES goods_receipt_items(id),
        product_id INTEGER REFERENCES wms_products(id),
        product_code VARCHAR(50),
        product_name VARCHAR(200),
        quantity_affected DECIMAL(12,3) NOT NULL,
        unit_price DECIMAL(15,4),
        claimed_amount DECIMAL(15,2),
        approved_amount DECIMAL(15,2),
        defect_description TEXT NOT NULL,
        defect_type VARCHAR(50),
        evidence_photos JSONB DEFAULT '[]',
        resolution_type VARCHAR(30),
        replacement_quantity DECIMAL(12,3),
        credit_amount DECIMAL(15,2),
        status VARCHAR(30) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS supplier_claim_messages (
        id SERIAL PRIMARY KEY,
        claim_id INTEGER NOT NULL REFERENCES supplier_claims(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL,
        sender_id INTEGER NOT NULL,
        sender_name VARCHAR(100),
        message TEXT NOT NULL,
        attachments JSONB DEFAULT '[]',
        is_internal BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // PARTE 9: Replacement Receipts and Credit Notes
    `CREATE TABLE IF NOT EXISTS replacement_receipts (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        receipt_number VARCHAR(30) NOT NULL,
        claim_id INTEGER NOT NULL REFERENCES supplier_claims(id),
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
        warehouse_id INTEGER,
        receipt_date DATE DEFAULT CURRENT_DATE,
        delivery_note_number VARCHAR(50),
        status VARCHAR(30) DEFAULT 'pending',
        inspection_status VARCHAR(30) DEFAULT 'pending',
        inspection_notes TEXT,
        received_by INTEGER,
        inspected_by INTEGER,
        inspected_at TIMESTAMPTZ,
        accepted_at TIMESTAMPTZ,
        notes TEXT,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, receipt_number)
    );`,

    `CREATE TABLE IF NOT EXISTS replacement_receipt_items (
        id SERIAL PRIMARY KEY,
        receipt_id INTEGER NOT NULL REFERENCES replacement_receipts(id) ON DELETE CASCADE,
        claim_item_id INTEGER REFERENCES supplier_claim_items(id),
        product_id INTEGER REFERENCES wms_products(id),
        product_code VARCHAR(50),
        product_name VARCHAR(200),
        quantity_expected DECIMAL(12,3) NOT NULL,
        quantity_received DECIMAL(12,3),
        quantity_accepted DECIMAL(12,3),
        quantity_rejected DECIMAL(12,3) DEFAULT 0,
        rejection_reason TEXT,
        batch_number VARCHAR(50),
        expiry_date DATE,
        location_id INTEGER,
        inspection_status VARCHAR(30) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS supplier_credit_notes (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        credit_note_number VARCHAR(50) NOT NULL,
        internal_number VARCHAR(30),
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
        claim_id INTEGER REFERENCES supplier_claims(id),
        invoice_id INTEGER REFERENCES supplier_invoices(id),
        reason VARCHAR(50) NOT NULL,
        credit_note_date DATE NOT NULL,
        currency VARCHAR(3) DEFAULT 'ARS',
        subtotal DECIMAL(15,2) NOT NULL,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) NOT NULL,
        amount_applied DECIMAL(15,2) DEFAULT 0,
        balance DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        verified_by INTEGER,
        verified_at TIMESTAMPTZ,
        applied_to_invoice_id INTEGER,
        applied_at TIMESTAMPTZ,
        notes TEXT,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, internal_number)
    );`,

    `CREATE TABLE IF NOT EXISTS supplier_credit_note_items (
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
    );`,

    // PARTE 10: Payment Orders
    `CREATE TABLE IF NOT EXISTS payment_orders (
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
        net_amount DECIMAL(15,2) DEFAULT 0,
        payment_method VARCHAR(30),
        bank_account_id INTEGER,
        reference_number VARCHAR(50),
        status VARCHAR(30) DEFAULT 'draft',
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        paid_by INTEGER,
        paid_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        notes TEXT,
        attachments JSONB DEFAULT '[]',
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, payment_order_number)
    );`,

    `CREATE TABLE IF NOT EXISTS payment_order_invoices (
        id SERIAL PRIMARY KEY,
        payment_order_id INTEGER NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
        invoice_id INTEGER NOT NULL REFERENCES supplier_invoices(id),
        amount_to_pay DECIMAL(15,2) NOT NULL,
        retentions JSONB DEFAULT '[]',
        total_retentions DECIMAL(15,2) DEFAULT 0,
        net_amount DECIMAL(15,2),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS payment_order_credit_notes (
        id SERIAL PRIMARY KEY,
        payment_order_id INTEGER NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
        credit_note_id INTEGER NOT NULL REFERENCES supplier_credit_notes(id),
        amount_applied DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // PARTE 11: Supplier Offers
    `CREATE TABLE IF NOT EXISTS supplier_offers (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id) ON DELETE CASCADE,
        offer_number VARCHAR(30),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        offer_type VARCHAR(30) NOT NULL,
        valid_from DATE NOT NULL,
        valid_until DATE NOT NULL,
        min_order_amount DECIMAL(15,2),
        min_order_quantity DECIMAL(12,3),
        discount_type VARCHAR(20),
        discount_value DECIMAL(10,2),
        free_shipping BOOLEAN DEFAULT false,
        terms_conditions TEXT,
        target_companies JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'draft',
        submitted_at TIMESTAMPTZ,
        submitted_by INTEGER,
        approved_at TIMESTAMPTZ,
        approved_by INTEGER,
        rejection_reason TEXT,
        views_count INTEGER DEFAULT 0,
        clicks_count INTEGER DEFAULT 0,
        orders_generated INTEGER DEFAULT 0,
        revenue_generated DECIMAL(15,2) DEFAULT 0,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS supplier_offer_items (
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
    );`,

    `CREATE TABLE IF NOT EXISTS supplier_offer_views (
        id SERIAL PRIMARY KEY,
        offer_id INTEGER NOT NULL REFERENCES supplier_offers(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(company_id),
        user_id INTEGER,
        viewed_at TIMESTAMPTZ DEFAULT NOW(),
        view_date DATE DEFAULT CURRENT_DATE
    );`,

    // PARTE 12: Notifications
    `CREATE TABLE IF NOT EXISTS supplier_notifications (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id) ON DELETE CASCADE,
        company_id INTEGER REFERENCES companies(company_id),
        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        reference_type VARCHAR(30),
        reference_id INTEGER,
        priority VARCHAR(20) DEFAULT 'normal',
        action_url VARCHAR(500),
        action_required BOOLEAN DEFAULT false,
        action_deadline TIMESTAMPTZ,
        read_at TIMESTAMPTZ,
        email_sent BOOLEAN DEFAULT false,
        email_sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // PARTE 13: Monthly Stats
    `CREATE TABLE IF NOT EXISTS supplier_monthly_stats (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
        company_id INTEGER NOT NULL REFERENCES companies(company_id),
        year_month VARCHAR(7) NOT NULL,
        total_pos INTEGER DEFAULT 0,
        total_po_amount DECIMAL(15,2) DEFAULT 0,
        total_invoices INTEGER DEFAULT 0,
        total_invoice_amount DECIMAL(15,2) DEFAULT 0,
        total_credit_notes INTEGER DEFAULT 0,
        total_credit_amount DECIMAL(15,2) DEFAULT 0,
        total_claims INTEGER DEFAULT 0,
        claims_resolved INTEGER DEFAULT 0,
        avg_delivery_days DECIMAL(5,2),
        on_time_delivery_rate DECIMAL(5,2),
        quality_score DECIMAL(5,2),
        response_time_hours DECIMAL(8,2),
        calculated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(supplier_id, company_id, year_month)
    );`,

    // PARTE 14: Indexes
    `CREATE INDEX IF NOT EXISTS idx_spu_supplier ON supplier_portal_users(supplier_id);`,
    `CREATE INDEX IF NOT EXISTS idx_pr_company ON purchase_requisitions(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_pr_status ON purchase_requisitions(status);`,
    `CREATE INDEX IF NOT EXISTS idx_rfq_company ON request_for_quotations(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_rfq_status ON request_for_quotations(status);`,
    `CREATE INDEX IF NOT EXISTS idx_sq_rfq ON supplier_quotations(rfq_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sq_supplier ON supplier_quotations(supplier_id);`,
    `CREATE INDEX IF NOT EXISTS idx_po_company ON purchase_orders(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);`,
    `CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);`,
    `CREATE INDEX IF NOT EXISTS idx_gr_company ON goods_receipts(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_gr_po ON goods_receipts(purchase_order_id);`,
    `CREATE INDEX IF NOT EXISTS idx_si_company ON supplier_invoices(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_si_supplier ON supplier_invoices(supplier_id);`,
    `CREATE INDEX IF NOT EXISTS idx_si_po ON supplier_invoices(purchase_order_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sc_company ON supplier_claims(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sc_supplier ON supplier_claims(supplier_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sc_po ON supplier_claims(purchase_order_id);`,
    `CREATE INDEX IF NOT EXISTS idx_rr_claim ON replacement_receipts(claim_id);`,
    `CREATE INDEX IF NOT EXISTS idx_scn_claim ON supplier_credit_notes(claim_id);`,
    `CREATE INDEX IF NOT EXISTS idx_payord_company ON payment_orders(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_payord_supplier ON payment_orders(supplier_id);`,
    `CREATE INDEX IF NOT EXISTS idx_so_supplier ON supplier_offers(supplier_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sn_supplier ON supplier_notifications(supplier_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_sov_unique_daily ON supplier_offer_views(offer_id, company_id, view_date);`,

    // PARTE 15: Function and Trigger for blocking payment on claims
    `CREATE OR REPLACE FUNCTION block_payment_on_claim() RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.status = 'submitted' AND NEW.purchase_order_id IS NOT NULL THEN
            UPDATE purchase_orders
            SET payment_blocked = true,
                payment_block_reason = 'Reclamo pendiente: ' || NEW.claim_number
            WHERE id = NEW.purchase_order_id;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`,

    `DROP TRIGGER IF EXISTS trg_block_payment_on_claim ON supplier_claims;`,

    `CREATE TRIGGER trg_block_payment_on_claim
        AFTER INSERT OR UPDATE OF status ON supplier_claims
        FOR EACH ROW
        EXECUTE FUNCTION block_payment_on_claim();`,

    // PARTE 16: Function and Trigger for unblocking payment
    `CREATE OR REPLACE FUNCTION unblock_payment_on_resolution() RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
            IF NEW.purchase_order_id IS NOT NULL THEN
                IF NOT EXISTS (
                    SELECT 1 FROM supplier_claims
                    WHERE purchase_order_id = NEW.purchase_order_id
                    AND id != NEW.id
                    AND status NOT IN ('resolved', 'closed', 'cancelled')
                ) THEN
                    UPDATE purchase_orders
                    SET payment_blocked = false,
                        payment_block_reason = NULL
                    WHERE id = NEW.purchase_order_id;
                END IF;
            END IF;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`,

    `DROP TRIGGER IF EXISTS trg_unblock_payment_on_resolution ON supplier_claims;`,

    `CREATE TRIGGER trg_unblock_payment_on_resolution
        AFTER UPDATE OF status ON supplier_claims
        FOR EACH ROW
        EXECUTE FUNCTION unblock_payment_on_resolution();`
];

async function runMigration() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🏭 SUPPLIER PORTAL P2P - MIGRATION');
    console.log('═══════════════════════════════════════════════════════════');

    const client = await pool.connect();
    let successCount = 0;
    let errorCount = 0;

    try {
        for (let i = 0; i < migrations.length; i++) {
            const sql = migrations[i];
            const preview = sql.substring(0, 60).replace(/\n/g, ' ');

            try {
                await client.query(sql);
                console.log(`✅ [${i + 1}/${migrations.length}] ${preview}...`);
                successCount++;
            } catch (error) {
                if (error.code === '42P07' || error.message.includes('already exists')) {
                    console.log(`⚠️  [${i + 1}/${migrations.length}] Ya existe: ${preview}...`);
                    successCount++;
                } else {
                    console.log(`❌ [${i + 1}/${migrations.length}] Error: ${error.message}`);
                    errorCount++;
                }
            }
        }

        // Verify tables
        console.log('\n📊 Verificando tablas P2P...');
        const result = await client.query(`
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            AND (tablename LIKE 'supplier_%'
                OR tablename LIKE 'purchase_%'
                OR tablename LIKE 'payment_%'
                OR tablename LIKE 'rfq_%'
                OR tablename LIKE 'goods_%'
                OR tablename LIKE 'replacement_%')
            ORDER BY tablename
        `);

        console.log(`\n✅ Tablas P2P encontradas: ${result.rows.length}`);
        result.rows.forEach(row => {
            console.log(`   📦 ${row.tablename}`);
        });

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log(`✅ Exitosos: ${successCount} | ❌ Errores: ${errorCount}`);
        console.log('═══════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('Error fatal:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
