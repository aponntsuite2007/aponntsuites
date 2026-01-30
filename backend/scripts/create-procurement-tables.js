/**
 * Script para crear tablas de Procurement con FK correctas
 * Usa company_id en lugar de id para referencias a companies
 */
const { sequelize } = require('../src/config/database');

async function createProcurementTables() {
    console.log('🚀 Creando tablas de Procurement...\n');

    const tables = [
        // 1. SUPPLIERS
        `CREATE TABLE IF NOT EXISTS procurement_suppliers (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
            supplier_code VARCHAR(50) NOT NULL,
            legal_name VARCHAR(255) NOT NULL,
            trade_name VARCHAR(255),
            tax_id VARCHAR(50) NOT NULL,
            contact_name VARCHAR(200),
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),
            address TEXT,
            city VARCHAR(100),
            province VARCHAR(100),
            country VARCHAR(100) DEFAULT 'Argentina',
            supplier_type VARCHAR(50) DEFAULT 'both',
            status VARCHAR(50) DEFAULT 'pending',
            onboarding_status VARCHAR(50) DEFAULT 'pending',
            overall_score DECIMAL(3,2) DEFAULT 0,
            quality_score DECIMAL(3,2) DEFAULT 0,
            delivery_score DECIMAL(3,2) DEFAULT 0,
            price_score DECIMAL(3,2) DEFAULT 0,
            service_score DECIMAL(3,2) DEFAULT 0,
            total_orders INTEGER DEFAULT 0,
            total_amount DECIMAL(15,2) DEFAULT 0,
            on_time_delivery_rate DECIMAL(5,2) DEFAULT 0,
            rejection_rate DECIMAL(5,2) DEFAULT 0,
            documents JSONB DEFAULT '[]',
            bank_accounts JSONB DEFAULT '[]',
            default_payment_days INTEGER DEFAULT 30,
            portal_enabled BOOLEAN DEFAULT false,
            audit_trail JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(company_id, supplier_code),
            UNIQUE(company_id, tax_id)
        )`,

        // 2. CATEGORIES
        `CREATE TABLE IF NOT EXISTS procurement_categories (
            id SERIAL PRIMARY KEY,
            company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            parent_id INTEGER REFERENCES procurement_categories(id),
            level INTEGER DEFAULT 1,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(company_id, code)
        )`,

        // 3. ITEMS CATALOG
        `CREATE TABLE IF NOT EXISTS procurement_items (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
            item_code VARCHAR(100) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category_id INTEGER REFERENCES procurement_categories(id),
            item_type VARCHAR(50) NOT NULL DEFAULT 'product',
            unit_of_measure VARCHAR(50),
            reference_price DECIMAL(15,2),
            min_price DECIMAL(15,2),
            max_price DECIMAL(15,2),
            supplier_history JSONB DEFAULT '[]',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(company_id, item_code)
        )`,

        // 4. REQUISITIONS
        `CREATE TABLE IF NOT EXISTS procurement_requisitions (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
            requisition_number VARCHAR(50) NOT NULL,
            requester_id UUID REFERENCES users(user_id),
            department_id INTEGER,
            cost_center_id INTEGER,
            status VARCHAR(50) DEFAULT 'draft',
            priority VARCHAR(20) DEFAULT 'normal',
            required_date DATE,
            justification TEXT,
            estimated_total DECIMAL(15,2) DEFAULT 0,
            currency VARCHAR(3) DEFAULT 'ARS',
            current_approval_step INTEGER DEFAULT 0,
            max_approval_steps INTEGER DEFAULT 1,
            approved_by UUID REFERENCES users(user_id),
            approved_at TIMESTAMP,
            rejection_reason TEXT,
            modified_after_approval BOOLEAN DEFAULT false,
            reauthorization_required BOOLEAN DEFAULT false,
            audit_trail JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(company_id, requisition_number)
        )`,

        // 5. REQUISITION ITEMS
        `CREATE TABLE IF NOT EXISTS procurement_requisition_items (
            id SERIAL PRIMARY KEY,
            requisition_id INTEGER NOT NULL REFERENCES procurement_requisitions(id) ON DELETE CASCADE,
            item_id INTEGER REFERENCES procurement_items(id),
            item_code VARCHAR(100),
            description TEXT NOT NULL,
            quantity DECIMAL(15,3) NOT NULL,
            unit_of_measure VARCHAR(50),
            estimated_unit_price DECIMAL(15,2),
            estimated_total DECIMAL(15,2),
            specifications TEXT,
            preferred_supplier_id INTEGER REFERENCES procurement_suppliers(id),
            created_at TIMESTAMP DEFAULT NOW()
        )`,

        // 6. ORDER ITEMS
        `CREATE TABLE IF NOT EXISTS procurement_order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES procurement_orders(id) ON DELETE CASCADE,
            requisition_item_id INTEGER REFERENCES procurement_requisition_items(id),
            item_id INTEGER REFERENCES procurement_items(id),
            item_code VARCHAR(100),
            description TEXT NOT NULL,
            quantity DECIMAL(15,3) NOT NULL,
            unit_price DECIMAL(15,2) NOT NULL,
            line_total DECIMAL(15,2),
            qty_received DECIMAL(15,3) DEFAULT 0,
            qty_accepted DECIMAL(15,3) DEFAULT 0,
            qty_rejected DECIMAL(15,3) DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )`,

        // 7. RECEIPTS
        `CREATE TABLE IF NOT EXISTS procurement_receipts (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
            receipt_number VARCHAR(50) NOT NULL,
            order_id INTEGER REFERENCES procurement_orders(id),
            receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
            received_by UUID REFERENCES users(user_id),
            delivery_note_number VARCHAR(100),
            carrier_name VARCHAR(200),
            status VARCHAR(50) DEFAULT 'pending',
            quality_status VARCHAR(50) DEFAULT 'pending',
            quality_notes TEXT,
            quality_checked_by UUID REFERENCES users(user_id),
            quality_checked_at TIMESTAMP,
            general_observations TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(company_id, receipt_number)
        )`,

        // 8. RECEIPT ITEMS
        `CREATE TABLE IF NOT EXISTS procurement_receipt_items (
            id SERIAL PRIMARY KEY,
            receipt_id INTEGER NOT NULL REFERENCES procurement_receipts(id) ON DELETE CASCADE,
            order_item_id INTEGER REFERENCES procurement_order_items(id),
            qty_received DECIMAL(15,3) NOT NULL,
            qty_accepted DECIMAL(15,3),
            qty_rejected DECIMAL(15,3) DEFAULT 0,
            rejection_reason TEXT,
            lot_number VARCHAR(100),
            expiry_date DATE,
            created_at TIMESTAMP DEFAULT NOW()
        )`,

        // 9. PAYMENTS
        `CREATE TABLE IF NOT EXISTS procurement_payments (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
            payment_number VARCHAR(50) NOT NULL,
            supplier_id INTEGER REFERENCES procurement_suppliers(id),
            invoice_ids JSONB DEFAULT '[]',
            total_amount DECIMAL(15,2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'ARS',
            status VARCHAR(50) DEFAULT 'pending',
            payment_method VARCHAR(50),
            scheduled_date DATE,
            payment_date DATE,
            bank_reference VARCHAR(100),
            approved_by UUID REFERENCES users(user_id),
            approved_at TIMESTAMP,
            executed_by UUID REFERENCES users(user_id),
            executed_at TIMESTAMP,
            journal_entry_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(company_id, payment_number)
        )`,

        // 10. APPROVAL CONFIG
        `CREATE TABLE IF NOT EXISTS procurement_approval_configs (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
            document_type VARCHAR(50) NOT NULL,
            min_amount DECIMAL(15,2) DEFAULT 0,
            max_amount DECIMAL(15,2),
            approval_level INTEGER DEFAULT 1,
            can_approve_roles JSONB DEFAULT '[]',
            can_approve_users JSONB DEFAULT '[]',
            requires_justification BOOLEAN DEFAULT false,
            requires_budget_check BOOLEAN DEFAULT true,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW()
        )`,

        // 11. ACCOUNTING CONFIG
        `CREATE TABLE IF NOT EXISTS procurement_accounting_configs (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
            purchase_type VARCHAR(50) NOT NULL,
            category_id INTEGER REFERENCES procurement_categories(id),
            expense_account_id INTEGER,
            asset_account_id INTEGER,
            liability_account_id INTEGER,
            tax_account_id INTEGER,
            capitalize_threshold DECIMAL(15,2) DEFAULT 50000,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW()
        )`,

        // 12. RFQ (Request for Quotation)
        `CREATE TABLE IF NOT EXISTS procurement_rfqs (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
            rfq_number VARCHAR(50) NOT NULL,
            requisition_id INTEGER REFERENCES procurement_requisitions(id),
            status VARCHAR(50) DEFAULT 'draft',
            issue_date DATE,
            due_date DATE,
            valid_until DATE,
            allow_partial_quotes BOOLEAN DEFAULT true,
            payment_terms TEXT,
            delivery_terms TEXT,
            awarded_at TIMESTAMP,
            awarded_by UUID REFERENCES users(user_id),
            award_reason TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(company_id, rfq_number)
        )`,

        // 13. RFQ QUOTES
        `CREATE TABLE IF NOT EXISTS procurement_rfq_quotes (
            id SERIAL PRIMARY KEY,
            rfq_id INTEGER NOT NULL REFERENCES procurement_rfqs(id) ON DELETE CASCADE,
            supplier_id INTEGER NOT NULL REFERENCES procurement_suppliers(id),
            status VARCHAR(50) DEFAULT 'pending',
            quote_date DATE,
            quoted_total DECIMAL(15,2),
            lead_time_days INTEGER,
            validity_days INTEGER,
            terms TEXT,
            quality_score DECIMAL(5,2),
            delivery_score DECIMAL(5,2),
            price_score DECIMAL(5,2),
            total_score DECIMAL(5,2),
            price_ranking INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )`,

        // 14. SUPPLIER ITEM MAPPING (for price history)
        `CREATE TABLE IF NOT EXISTS procurement_supplier_item_mappings (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
            supplier_id INTEGER NOT NULL REFERENCES procurement_suppliers(id),
            item_id INTEGER NOT NULL REFERENCES procurement_items(id),
            supplier_item_code VARCHAR(100),
            supplier_item_name VARCHAR(255),
            last_price DECIMAL(15,2),
            last_purchase_date DATE,
            total_qty_purchased DECIMAL(15,3) DEFAULT 0,
            total_amount_purchased DECIMAL(15,2) DEFAULT 0,
            avg_delivery_days INTEGER,
            quality_rating DECIMAL(3,2),
            price_history JSONB DEFAULT '[]',
            is_preferred BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(company_id, supplier_id, item_id)
        )`,

        // 15. PURCHASE HISTORY (for analytics)
        `CREATE TABLE IF NOT EXISTS procurement_purchase_history (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
            order_id INTEGER REFERENCES procurement_orders(id),
            supplier_id INTEGER REFERENCES procurement_suppliers(id),
            item_id INTEGER REFERENCES procurement_items(id),
            purchase_date DATE NOT NULL,
            quantity DECIMAL(15,3),
            unit_price DECIMAL(15,2),
            total_amount DECIMAL(15,2),
            delivery_days INTEGER,
            quality_score DECIMAL(3,2),
            on_time BOOLEAN,
            created_at TIMESTAMP DEFAULT NOW()
        )`
    ];

    let success = 0, errors = 0;

    for (const sql of tables) {
        try {
            await sequelize.query(sql);
            const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
            console.log('✅', match ? match[1] : 'tabla');
            success++;
        } catch (e) {
            if (e.message.includes('already exists') || e.message.includes('ya existe')) {
                const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
                console.log('⏭️', match ? match[1] : 'tabla', '(ya existe)');
                success++;
            } else {
                const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
                console.log('❌', match ? match[1] : 'error', '-', e.message.substring(0, 60));
                errors++;
            }
        }
    }

    // Create indexes
    console.log('\n📇 Creando índices...');
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_proc_suppliers_score ON procurement_suppliers(overall_score DESC)',
        'CREATE INDEX IF NOT EXISTS idx_proc_requisitions_status ON procurement_requisitions(company_id, status)',
        'CREATE INDEX IF NOT EXISTS idx_proc_orders_supplier ON procurement_orders(supplier_id)',
        'CREATE INDEX IF NOT EXISTS idx_proc_receipts_order ON procurement_receipts(order_id)',
        'CREATE INDEX IF NOT EXISTS idx_proc_history_supplier ON procurement_purchase_history(supplier_id, item_id)',
        'CREATE INDEX IF NOT EXISTS idx_proc_history_date ON procurement_purchase_history(purchase_date DESC)',
        'CREATE INDEX IF NOT EXISTS idx_proc_mapping_supplier ON procurement_supplier_item_mappings(supplier_id)'
    ];

    for (const idx of indexes) {
        try {
            await sequelize.query(idx);
        } catch (e) {
            // Ignore index errors
        }
    }

    console.log('\n📊 Resumen:');
    console.log('  ✅ Tablas creadas/existentes:', success);
    console.log('  ❌ Errores:', errors);

    await sequelize.close();
}

createProcurementTables().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
