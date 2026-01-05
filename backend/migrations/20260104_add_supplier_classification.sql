-- =====================================================
-- CLASIFICACIÓN DE PROVEEDORES - Estándar vs Asociado Aponnt
-- =====================================================
-- Fecha: 2026-01-04
-- Propósito: Diferenciar proveedores normales de asociados marketplace Aponnt
-- =====================================================

BEGIN;

-- Agregar columna de tipo de proveedor
ALTER TABLE wms_suppliers
ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(30) DEFAULT 'standard' CHECK (supplier_type IN ('standard', 'aponnt_associate')),
ADD COLUMN IF NOT EXISTS is_aponnt_associate BOOLEAN GENERATED ALWAYS AS (supplier_type = 'aponnt_associate') STORED,
ADD COLUMN IF NOT EXISTS aponnt_commission_percent DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS associate_category VARCHAR(50);

-- Comentarios
COMMENT ON COLUMN wms_suppliers.supplier_type IS 'Tipo de proveedor: standard (empresa gestiona) o aponnt_associate (marketplace Aponnt)';
COMMENT ON COLUMN wms_suppliers.is_aponnt_associate IS 'Columna computada: true si es asociado de Aponnt';
COMMENT ON COLUMN wms_suppliers.aponnt_commission_percent IS 'Porcentaje de comisión que cobra Aponnt por cada factura (solo asociados)';
COMMENT ON COLUMN wms_suppliers.associate_category IS 'Categoría del asociado: medical, legal, accounting, engineering, etc.';

-- Índice para búsquedas rápidas de asociados
CREATE INDEX IF NOT EXISTS idx_wms_suppliers_type ON wms_suppliers(supplier_type);
CREATE INDEX IF NOT EXISTS idx_wms_suppliers_associate_category ON wms_suppliers(associate_category) WHERE supplier_type = 'aponnt_associate';

-- Tabla de relaciones empresa-asociado (multi-empresa)
CREATE TABLE IF NOT EXISTS company_associate_contracts (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    associate_id INTEGER NOT NULL REFERENCES wms_suppliers(id) ON DELETE CASCADE,

    -- Estado del contrato
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),

    -- Fechas
    contract_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    contract_end_date DATE,

    -- Términos comerciales específicos por empresa
    hourly_rate DECIMAL(10,2),
    monthly_retainer DECIMAL(10,2),
    payment_terms VARCHAR(50) DEFAULT 'NET_30',

    -- Empleados asignados (eventual)
    assigned_employees JSONB DEFAULT '[]',

    -- Notas internas
    notes TEXT,

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by INTEGER,

    -- Constraint: Un asociado puede tener múltiples contratos con diferentes empresas
    UNIQUE(company_id, associate_id)
);

-- Índices para performance
CREATE INDEX idx_company_associate_contracts_company ON company_associate_contracts(company_id);
CREATE INDEX idx_company_associate_contracts_associate ON company_associate_contracts(associate_id);
CREATE INDEX idx_company_associate_contracts_status ON company_associate_contracts(status);

-- Comentarios
COMMENT ON TABLE company_associate_contracts IS 'Contratos entre empresas y asociados de Aponnt (un asociado puede trabajar para múltiples empresas)';
COMMENT ON COLUMN company_associate_contracts.assigned_employees IS 'IDs de empleados que pueden solicitar servicios del asociado (JSON array)';

-- Tabla de facturación con comisión Aponnt
CREATE TABLE IF NOT EXISTS associate_invoices (
    id BIGSERIAL PRIMARY KEY,
    associate_id INTEGER NOT NULL REFERENCES wms_suppliers(id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    contract_id BIGINT REFERENCES company_associate_contracts(id),

    -- Datos de factura
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,

    -- Montos
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,

    -- Comisión Aponnt
    aponnt_commission_percent DECIMAL(5,2) NOT NULL,
    aponnt_commission_amount DECIMAL(12,2) NOT NULL,

    -- Monto neto para el asociado (total - comisión Aponnt)
    net_amount_associate DECIMAL(12,2) NOT NULL,

    -- Estado de pago
    payment_status VARCHAR(30) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid_to_aponnt', 'paid_to_associate', 'partial', 'overdue')),

    -- Pagos
    company_payment_date TIMESTAMPTZ,  -- Cuando la empresa le paga a Aponnt
    aponnt_payment_date TIMESTAMPTZ,   -- Cuando Aponnt le paga al asociado

    -- Referencia a payment_order (si existe)
    payment_order_id BIGINT REFERENCES finance_payment_orders(id),

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(invoice_number, associate_id)
);

-- Índices
CREATE INDEX idx_associate_invoices_associate ON associate_invoices(associate_id);
CREATE INDEX idx_associate_invoices_company ON associate_invoices(company_id);
CREATE INDEX idx_associate_invoices_status ON associate_invoices(payment_status);
CREATE INDEX idx_associate_invoices_dates ON associate_invoices(invoice_date, due_date);

-- Comentarios
COMMENT ON TABLE associate_invoices IS 'Facturas de asociados Aponnt con comisión automática';
COMMENT ON COLUMN associate_invoices.aponnt_commission_amount IS 'Monto que se queda Aponnt (empresa paga total, Aponnt transfiere net_amount_associate al asociado)';
COMMENT ON COLUMN associate_invoices.net_amount_associate IS 'Monto neto que recibe el asociado después de comisión Aponnt';

-- Función para calcular comisión Aponnt
CREATE OR REPLACE FUNCTION calculate_aponnt_commission()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular comisión
    NEW.aponnt_commission_amount := NEW.total * (NEW.aponnt_commission_percent / 100);

    -- Calcular neto para asociado
    NEW.net_amount_associate := NEW.total - NEW.aponnt_commission_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-calcular comisión
CREATE TRIGGER trg_calculate_aponnt_commission
BEFORE INSERT OR UPDATE ON associate_invoices
FOR EACH ROW
EXECUTE FUNCTION calculate_aponnt_commission();

-- Vista consolidada de asociados con sus empresas
CREATE OR REPLACE VIEW v_associates_companies AS
SELECT
    ws.id as associate_id,
    ws.name as associate_name,
    ws.associate_category,
    ws.aponnt_commission_percent,
    c.company_id,
    c.name as company_name,
    cac.status as contract_status,
    cac.contract_start_date,
    cac.contract_end_date,
    cac.hourly_rate,
    cac.monthly_retainer,
    COUNT(DISTINCT ai.id) as total_invoices,
    COALESCE(SUM(ai.total), 0) as total_billed,
    COALESCE(SUM(ai.aponnt_commission_amount), 0) as total_commission_aponnt,
    COALESCE(SUM(ai.net_amount_associate), 0) as total_net_associate
FROM wms_suppliers ws
JOIN company_associate_contracts cac ON ws.id = cac.associate_id
JOIN companies c ON cac.company_id = c.company_id
LEFT JOIN associate_invoices ai ON ws.id = ai.associate_id AND c.company_id = ai.company_id
WHERE ws.supplier_type = 'aponnt_associate'
GROUP BY ws.id, ws.name, ws.associate_category, ws.aponnt_commission_percent,
         c.company_id, c.name, cac.status, cac.contract_start_date, cac.contract_end_date,
         cac.hourly_rate, cac.monthly_retainer;

COMMENT ON VIEW v_associates_companies IS 'Vista de asociados Aponnt con todas sus empresas contratantes y facturación';

COMMIT;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de clasificación de proveedores creado exitosamente';
    RAISE NOTICE '   📋 Tipos: standard (empresa) | aponnt_associate (marketplace)';
    RAISE NOTICE '   🏢 Tabla company_associate_contracts: Multi-empresa para asociados';
    RAISE NOTICE '   💰 Tabla associate_invoices: Facturación con comisión Aponnt';
    RAISE NOTICE '   🔄 Trigger automático: Calcula comisión en cada factura';
    RAISE NOTICE '   📊 Vista v_associates_companies: Dashboard de asociados';
END $$;
