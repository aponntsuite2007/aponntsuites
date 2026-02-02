/**
 * Crear tablas de Procurement con SQL directo
 */
const { sequelize } = require('../src/config/database');

const SQL_TABLES = `
-- Proveedores
CREATE TABLE IF NOT EXISTS wms_suppliers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(50),
    contact_name VARCHAR(200),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Argentina',
    status VARCHAR(50) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    overall_score DECIMAL(3,2) DEFAULT 0,
    payment_terms VARCHAR(100),
    default_currency VARCHAR(3) DEFAULT 'ARS',
    portal_enabled BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Categorías
CREATE TABLE IF NOT EXISTS procurement_categories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    code VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    parent_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sectores
CREATE TABLE IF NOT EXISTS procurement_sectors (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    code VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    approver_user_id UUID,
    budget_limit DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Items
CREATE TABLE IF NOT EXISTS procurement_items (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER,
    unit_of_measure VARCHAR(50) DEFAULT 'unidad',
    default_price DECIMAL(15,4),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Requisiciones
CREATE TABLE IF NOT EXISTS procurement_requisitions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    requisition_number VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    sector_id INTEGER,
    requested_by UUID,
    required_date DATE,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'draft',
    justification TEXT,
    total_estimated DECIMAL(15,2) DEFAULT 0,
    approved_by UUID,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Items de Requisición
CREATE TABLE IF NOT EXISTS procurement_requisition_items (
    id SERIAL PRIMARY KEY,
    requisition_id INTEGER NOT NULL,
    item_id INTEGER,
    description TEXT NOT NULL,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
    unit_of_measure VARCHAR(50) DEFAULT 'unidad',
    estimated_price DECIMAL(15,4),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Órdenes de Compra
CREATE TABLE IF NOT EXISTS procurement_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    supplier_id INTEGER NOT NULL,
    requisition_id INTEGER,
    status VARCHAR(50) DEFAULT 'draft',
    order_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    currency VARCHAR(3) DEFAULT 'ARS',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    payment_terms VARCHAR(100),
    shipping_address TEXT,
    notes TEXT,
    sent_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Items de Orden
CREATE TABLE IF NOT EXISTS procurement_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    item_id INTEGER,
    description TEXT NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    unit_price DECIMAL(15,4) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    subtotal DECIMAL(15,2),
    received_qty DECIMAL(15,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Recepciones
CREATE TABLE IF NOT EXISTS procurement_receipts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    receipt_number VARCHAR(50) NOT NULL,
    order_id INTEGER,
    supplier_id INTEGER,
    receipt_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'pending',
    received_by UUID,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Items de Recepción
CREATE TABLE IF NOT EXISTS procurement_receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL,
    order_item_id INTEGER,
    quantity_received DECIMAL(15,4) NOT NULL,
    quality_status VARCHAR(50) DEFAULT 'accepted',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Facturas
CREATE TABLE IF NOT EXISTS procurement_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    supplier_id INTEGER NOT NULL,
    order_id INTEGER,
    receipt_id INTEGER,
    invoice_date DATE,
    due_date DATE,
    currency VARCHAR(3) DEFAULT 'ARS',
    subtotal DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    total DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    paid_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Pagos
CREATE TABLE IF NOT EXISTS procurement_payments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    payment_number VARCHAR(50),
    invoice_id INTEGER,
    supplier_id INTEGER,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',
    payment_method VARCHAR(50),
    reference VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RFQs
CREATE TABLE IF NOT EXISTS procurement_rfqs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    rfq_number VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    requisition_id INTEGER,
    status VARCHAR(50) DEFAULT 'draft',
    deadline DATE,
    currency VARCHAR(3) DEFAULT 'ARS',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Items de RFQ
CREATE TABLE IF NOT EXISTS procurement_rfq_items (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL,
    item_id INTEGER,
    description TEXT NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    unit_of_measure VARCHAR(50),
    specifications TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Proveedores invitados a RFQ
CREATE TABLE IF NOT EXISTS procurement_rfq_suppliers (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    invited_at TIMESTAMP DEFAULT NOW(),
    response_status VARCHAR(50) DEFAULT 'pending',
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cotizaciones
CREATE TABLE IF NOT EXISTS procurement_rfq_quotes (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    quote_number VARCHAR(50),
    total_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'ARS',
    validity_days INTEGER DEFAULT 30,
    delivery_days INTEGER,
    payment_terms VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'submitted',
    is_winner BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_wms_suppliers_company ON wms_suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_req_company_status ON procurement_requisitions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_po_company_status ON procurement_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_company_status ON procurement_invoices(company_id, status);
`;

async function createTables() {
    try {
        console.log('🔧 Creando tablas de Procurement...\n');

        await sequelize.authenticate();
        console.log('✅ Conexión OK\n');

        // Ejecutar SQL
        await sequelize.query(SQL_TABLES);
        console.log('✅ SQL ejecutado\n');

        // Verificar
        const [tables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema='public'
            AND (table_name LIKE 'procurement%' OR table_name = 'wms_suppliers')
            ORDER BY table_name
        `);

        console.log(`📋 ${tables.length} tablas creadas:`);
        tables.forEach(t => console.log(`   ✅ ${t.table_name}`));

        console.log('\n🎉 Completado!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

createTables();
