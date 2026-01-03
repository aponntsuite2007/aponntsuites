-- ============================================
-- MIGRACIÓN: Sistema de Órdenes de Pago
-- Fecha: 2025-12-31
-- Descripción: Completa el circuito P2P (Procure-to-Pay)
-- ============================================

-- ============================================
-- TABLA: finance_payment_orders
-- Órdenes de Pago principales
-- ============================================
CREATE TABLE IF NOT EXISTS finance_payment_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),

    -- Identificación
    order_number VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Estado del workflow
    status VARCHAR(30) NOT NULL DEFAULT 'draft',

    -- Fechas de pago
    scheduled_payment_date DATE,
    actual_payment_date DATE,

    -- Totales
    total_amount DECIMAL(15,2) NOT NULL,
    total_retentions DECIMAL(15,2) DEFAULT 0,
    total_discounts DECIMAL(15,2) DEFAULT 0,
    net_payment_amount DECIMAL(15,2) NOT NULL,

    -- Moneda
    currency VARCHAR(3) DEFAULT 'ARS',
    exchange_rate DECIMAL(15,6) DEFAULT 1.000000,
    amount_in_base_currency DECIMAL(15,2),

    -- Beneficiario (proveedor)
    supplier_id INTEGER REFERENCES procurement_suppliers(id),
    supplier_name VARCHAR(200),
    supplier_cuit VARCHAR(20),
    supplier_bank_account JSONB DEFAULT '{}',

    -- Método de pago
    payment_method VARCHAR(30) NOT NULL,
    payment_details JSONB DEFAULT '{}',

    -- Autorización
    requires_authorization BOOLEAN DEFAULT true,
    authorization_level VARCHAR(30),
    authorization_amount_threshold DECIMAL(15,2),
    approvals JSONB DEFAULT '[]',

    -- Integración con Finance
    cash_register_id INTEGER REFERENCES finance_cash_registers(id),
    cash_movement_id INTEGER REFERENCES finance_cash_movements(id),
    journal_entry_id INTEGER,  -- FK agregado después si existe la tabla

    -- Notificaciones
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP,
    notification_email VARCHAR(200),

    -- Centro de costo
    cost_center_id INTEGER,  -- FK agregado después si existe la tabla

    -- Notas
    notes TEXT,
    internal_notes TEXT,

    -- Audit trail
    audit_trail JSONB DEFAULT '[]',

    -- Cancelación
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(user_id),
    cancellation_reason TEXT,

    -- Auditoría
    created_by UUID REFERENCES users(user_id),
    approved_by UUID REFERENCES users(user_id),
    executed_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uk_payment_order_number UNIQUE(company_id, order_number),
    CONSTRAINT chk_payment_status CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'scheduled',
        'executing', 'executed', 'cancelled'
    )),
    CONSTRAINT chk_payment_method CHECK (payment_method IN (
        'transfer', 'check', 'cash', 'multiple', 'credit_card', 'debit_card'
    ))
);

-- Índices para órdenes de pago
CREATE INDEX IF NOT EXISTS idx_payment_orders_company_status ON finance_payment_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_company_date ON finance_payment_orders(company_id, scheduled_payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_orders_supplier ON finance_payment_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_branch ON finance_payment_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created ON finance_payment_orders(created_at);

-- ============================================
-- TABLA: finance_payment_order_items
-- Items de Órdenes de Pago (facturas incluidas)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_payment_order_items (
    id SERIAL PRIMARY KEY,
    payment_order_id INTEGER NOT NULL REFERENCES finance_payment_orders(id) ON DELETE CASCADE,

    -- Factura de compra
    invoice_id INTEGER NOT NULL REFERENCES procurement_invoices(id),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    invoice_due_date DATE,
    invoice_total DECIMAL(15,2),
    invoice_pending DECIMAL(15,2),

    -- Monto a pagar
    amount_to_pay DECIMAL(15,2) NOT NULL,
    is_partial_payment BOOLEAN DEFAULT false,

    -- Retenciones (Argentina)
    retention_iibb DECIMAL(15,2) DEFAULT 0,
    retention_ganancias DECIMAL(15,2) DEFAULT 0,
    retention_iva DECIMAL(15,2) DEFAULT 0,
    retention_suss DECIMAL(15,2) DEFAULT 0,
    other_retentions DECIMAL(15,2) DEFAULT 0,
    retention_details JSONB DEFAULT '{}',

    -- Descuentos
    early_payment_discount DECIMAL(15,2) DEFAULT 0,
    other_discounts DECIMAL(15,2) DEFAULT 0,

    -- Totales calculados
    total_retentions DECIMAL(15,2) DEFAULT 0,
    total_discounts DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,

    -- Clasificación OLAP
    purchase_type VARCHAR(30),
    category_id INTEGER REFERENCES procurement_categories(id),

    -- Notas
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_purchase_type CHECK (purchase_type IS NULL OR purchase_type IN (
        'goods', 'services', 'assets', 'utilities', 'taxes', 'rent', 'other'
    ))
);

-- Índices para items
CREATE INDEX IF NOT EXISTS idx_payment_order_items_order ON finance_payment_order_items(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_order_items_invoice ON finance_payment_order_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_order_items_type ON finance_payment_order_items(purchase_type);
CREATE INDEX IF NOT EXISTS idx_payment_order_items_category ON finance_payment_order_items(category_id);

-- ============================================
-- TABLA: finance_checkbooks
-- Chequeras
-- ============================================
CREATE TABLE IF NOT EXISTS finance_checkbooks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    branch_id INTEGER REFERENCES branches(id),

    -- Identificación
    checkbook_number VARCHAR(50) NOT NULL,
    checkbook_code VARCHAR(20),

    -- Cuenta bancaria
    bank_account_id INTEGER REFERENCES finance_bank_accounts(id),
    bank_name VARCHAR(200),
    account_number VARCHAR(50),
    account_type VARCHAR(30),

    -- Moneda
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Rango de cheques
    first_check_number INTEGER NOT NULL,
    last_check_number INTEGER NOT NULL,
    current_check_number INTEGER NOT NULL,

    -- Contadores
    checks_total INTEGER,
    checks_used INTEGER DEFAULT 0,
    checks_voided INTEGER DEFAULT 0,
    checks_available INTEGER,

    -- Estado
    status VARCHAR(20) DEFAULT 'active',

    -- Fechas
    received_date DATE,
    activated_date DATE,
    expiry_date DATE,

    -- Ubicación
    location VARCHAR(200),
    assigned_to UUID REFERENCES users(user_id),

    -- Notas
    notes TEXT,

    -- Auditoría
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uk_checkbook_number UNIQUE(company_id, checkbook_number),
    CONSTRAINT chk_checkbook_status CHECK (status IN ('active', 'exhausted', 'cancelled', 'expired')),
    CONSTRAINT chk_check_range CHECK (last_check_number >= first_check_number)
);

-- Índices para chequeras
CREATE INDEX IF NOT EXISTS idx_checkbooks_company_status ON finance_checkbooks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_checkbooks_bank_account ON finance_checkbooks(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_checkbooks_assigned ON finance_checkbooks(assigned_to);

-- ============================================
-- TABLA: finance_issued_checks
-- Cheques Emitidos
-- ============================================
CREATE TABLE IF NOT EXISTS finance_issued_checks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),

    -- Chequera origen
    checkbook_id INTEGER NOT NULL REFERENCES finance_checkbooks(id),
    check_number INTEGER NOT NULL,

    -- Orden de pago
    payment_order_id INTEGER REFERENCES finance_payment_orders(id),

    -- Beneficiario
    beneficiary_name VARCHAR(200) NOT NULL,
    beneficiary_cuit VARCHAR(20),
    beneficiary_type VARCHAR(30),
    beneficiary_id INTEGER,

    -- Monto
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',
    amount_in_words TEXT,

    -- Fechas
    issue_date DATE NOT NULL,
    payment_date DATE,
    is_postdated BOOLEAN DEFAULT false,

    -- Tipo de cheque
    check_type VARCHAR(30) DEFAULT 'common',

    -- Estado
    status VARCHAR(20) DEFAULT 'issued',

    -- Tracking de entrega
    delivered_to VARCHAR(200),
    delivered_at TIMESTAMP,
    delivery_notes TEXT,

    -- Tracking de cobro
    cashed_at TIMESTAMP,
    cashed_bank VARCHAR(200),

    -- Si rebotó
    bounced_at TIMESTAMP,
    bounce_reason TEXT,
    bounce_code VARCHAR(10),

    -- Si fue reemplazado
    replacement_check_id INTEGER REFERENCES finance_issued_checks(id),

    -- Anulación
    voided_at TIMESTAMP,
    voided_by UUID REFERENCES users(user_id),
    void_reason TEXT,

    -- Integración
    cash_movement_id INTEGER REFERENCES finance_cash_movements(id),

    -- Notas
    notes TEXT,
    internal_notes TEXT,
    audit_trail JSONB DEFAULT '[]',

    -- Auditoría
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uk_check_number UNIQUE(checkbook_id, check_number),
    CONSTRAINT chk_check_status CHECK (status IN (
        'issued', 'delivered', 'cashed', 'bounced', 'voided', 'cancelled', 'replaced'
    )),
    CONSTRAINT chk_check_type CHECK (check_type IN ('common', 'certified', 'crossed', 'not_to_order'))
);

-- Índices para cheques emitidos
CREATE INDEX IF NOT EXISTS idx_issued_checks_company_status ON finance_issued_checks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_issued_checks_payment_order ON finance_issued_checks(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_issued_checks_beneficiary ON finance_issued_checks(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_issued_checks_payment_date ON finance_issued_checks(payment_date);
CREATE INDEX IF NOT EXISTS idx_issued_checks_status_date ON finance_issued_checks(status, payment_date);

-- ============================================
-- MATERIALIZED VIEW: mv_payment_forecast_cube
-- Cubo OLAP para previsión financiera
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS mv_payment_forecast_cube;

CREATE MATERIALIZED VIEW mv_payment_forecast_cube AS
SELECT
    po.company_id,
    po.branch_id,
    poi.category_id,
    poi.purchase_type,
    po.supplier_id,
    po.cost_center_id,

    -- Dimensiones de tiempo
    po.scheduled_payment_date AS payment_date,
    EXTRACT(YEAR FROM po.scheduled_payment_date) AS year,
    EXTRACT(MONTH FROM po.scheduled_payment_date) AS month,
    EXTRACT(WEEK FROM po.scheduled_payment_date) AS week,
    EXTRACT(DOW FROM po.scheduled_payment_date) AS day_of_week,
    TO_CHAR(po.scheduled_payment_date, 'YYYY-MM') AS year_month,
    TO_CHAR(po.scheduled_payment_date, 'IYYY-IW') AS year_week,

    -- Métricas
    COUNT(DISTINCT po.id) AS order_count,
    COUNT(poi.id) AS invoice_count,
    SUM(poi.amount_to_pay) AS gross_amount,
    SUM(COALESCE(poi.retention_iibb, 0) + COALESCE(poi.retention_ganancias, 0) +
        COALESCE(poi.retention_iva, 0) + COALESCE(poi.retention_suss, 0) +
        COALESCE(poi.other_retentions, 0)) AS total_retentions,
    SUM(COALESCE(poi.early_payment_discount, 0) + COALESCE(poi.other_discounts, 0)) AS total_discounts,
    SUM(poi.net_amount) AS net_amount,

    -- Estado
    po.status

FROM finance_payment_orders po
JOIN finance_payment_order_items poi ON poi.payment_order_id = po.id
WHERE po.status IN ('approved', 'scheduled', 'executing')
  AND po.scheduled_payment_date IS NOT NULL
GROUP BY
    po.company_id, po.branch_id, poi.category_id,
    poi.purchase_type, po.supplier_id, po.cost_center_id,
    po.scheduled_payment_date, po.status;

-- Índice único para refresh concurrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_payment_forecast_pk ON mv_payment_forecast_cube
    (company_id, COALESCE(payment_date, '1900-01-01'::date),
     COALESCE(supplier_id, 0), COALESCE(category_id, 0),
     COALESCE(purchase_type, ''), status);

-- Índices para queries OLAP
CREATE INDEX IF NOT EXISTS idx_mv_payment_forecast_company ON mv_payment_forecast_cube(company_id);
CREATE INDEX IF NOT EXISTS idx_mv_payment_forecast_date ON mv_payment_forecast_cube(payment_date);
CREATE INDEX IF NOT EXISTS idx_mv_payment_forecast_year_month ON mv_payment_forecast_cube(year_month);
CREATE INDEX IF NOT EXISTS idx_mv_payment_forecast_supplier ON mv_payment_forecast_cube(supplier_id);
CREATE INDEX IF NOT EXISTS idx_mv_payment_forecast_category ON mv_payment_forecast_cube(category_id);
CREATE INDEX IF NOT EXISTS idx_mv_payment_forecast_type ON mv_payment_forecast_cube(purchase_type);

-- ============================================
-- FUNCIÓN: refresh_payment_forecast_cube
-- Actualiza la vista materializada
-- ============================================
CREATE OR REPLACE FUNCTION refresh_payment_forecast_cube()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_payment_forecast_cube;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: get_payment_forecast_summary
-- Resumen de previsión financiera
-- ============================================
CREATE OR REPLACE FUNCTION get_payment_forecast_summary(
    p_company_id INTEGER,
    p_date_from DATE DEFAULT CURRENT_DATE,
    p_date_to DATE DEFAULT CURRENT_DATE + INTERVAL '90 days'
)
RETURNS TABLE (
    period_type TEXT,
    period_label TEXT,
    order_count BIGINT,
    invoice_count BIGINT,
    gross_amount NUMERIC,
    net_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    -- Por día (próximos 7 días)
    SELECT
        'day'::TEXT,
        TO_CHAR(payment_date, 'DD/MM/YYYY')::TEXT,
        SUM(mvc.order_count)::BIGINT,
        SUM(mvc.invoice_count)::BIGINT,
        SUM(mvc.gross_amount),
        SUM(mvc.net_amount)
    FROM mv_payment_forecast_cube mvc
    WHERE mvc.company_id = p_company_id
      AND mvc.payment_date BETWEEN p_date_from AND p_date_from + INTERVAL '7 days'
    GROUP BY payment_date
    ORDER BY payment_date

    UNION ALL

    -- Por semana
    SELECT
        'week'::TEXT,
        'Semana ' || EXTRACT(WEEK FROM payment_date)::TEXT,
        SUM(mvc.order_count)::BIGINT,
        SUM(mvc.invoice_count)::BIGINT,
        SUM(mvc.gross_amount),
        SUM(mvc.net_amount)
    FROM mv_payment_forecast_cube mvc
    WHERE mvc.company_id = p_company_id
      AND mvc.payment_date BETWEEN p_date_from AND p_date_to
    GROUP BY EXTRACT(WEEK FROM payment_date), EXTRACT(YEAR FROM payment_date)
    ORDER BY MIN(payment_date)

    UNION ALL

    -- Por mes
    SELECT
        'month'::TEXT,
        TO_CHAR(payment_date, 'Mon YYYY')::TEXT,
        SUM(mvc.order_count)::BIGINT,
        SUM(mvc.invoice_count)::BIGINT,
        SUM(mvc.gross_amount),
        SUM(mvc.net_amount)
    FROM mv_payment_forecast_cube mvc
    WHERE mvc.company_id = p_company_id
      AND mvc.payment_date BETWEEN p_date_from AND p_date_to
    GROUP BY TO_CHAR(payment_date, 'Mon YYYY'), EXTRACT(YEAR FROM payment_date), EXTRACT(MONTH FROM payment_date)
    ORDER BY MIN(payment_date);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: get_payment_orders_stats
-- Estadísticas de órdenes de pago
-- ============================================
CREATE OR REPLACE FUNCTION get_payment_orders_stats(
    p_company_id INTEGER,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    total_orders BIGINT,
    pending_approval BIGINT,
    scheduled BIGINT,
    executed BIGINT,
    cancelled BIGINT,
    total_amount NUMERIC,
    executed_amount NUMERIC,
    avg_days_to_pay NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE status = 'pending_approval')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'scheduled')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'executed')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT,
        COALESCE(SUM(net_payment_amount), 0),
        COALESCE(SUM(net_payment_amount) FILTER (WHERE status = 'executed'), 0),
        COALESCE(AVG(actual_payment_date - order_date) FILTER (WHERE status = 'executed'), 0)
    FROM finance_payment_orders
    WHERE company_id = p_company_id
      AND (p_date_from IS NULL OR order_date >= p_date_from)
      AND (p_date_to IS NULL OR order_date <= p_date_to);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: get_checks_portfolio_summary
-- Resumen de cartera de cheques
-- ============================================
CREATE OR REPLACE FUNCTION get_checks_portfolio_summary(p_company_id INTEGER)
RETURNS TABLE (
    total_issued BIGINT,
    total_delivered BIGINT,
    total_cashed BIGINT,
    total_bounced BIGINT,
    pending_amount NUMERIC,
    upcoming_7_days_amount NUMERIC,
    bounced_amount NUMERIC,
    bounce_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE status = 'issued')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'cashed')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'bounced')::BIGINT,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('issued', 'delivered')), 0),
        COALESCE(SUM(amount) FILTER (
            WHERE status IN ('issued', 'delivered')
              AND payment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        ), 0),
        COALESCE(SUM(amount) FILTER (WHERE status = 'bounced'), 0),
        CASE
            WHEN COUNT(*) FILTER (WHERE status IN ('cashed', 'bounced')) > 0
            THEN (COUNT(*) FILTER (WHERE status = 'bounced')::NUMERIC /
                  COUNT(*) FILTER (WHERE status IN ('cashed', 'bounced')) * 100)
            ELSE 0
        END
    FROM finance_issued_checks
    WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Actualizar timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_payment_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_order_update ON finance_payment_orders;
CREATE TRIGGER trg_payment_order_update
    BEFORE UPDATE ON finance_payment_orders
    FOR EACH ROW EXECUTE FUNCTION update_payment_order_timestamp();

DROP TRIGGER IF EXISTS trg_checkbook_update ON finance_checkbooks;
CREATE TRIGGER trg_checkbook_update
    BEFORE UPDATE ON finance_checkbooks
    FOR EACH ROW EXECUTE FUNCTION update_payment_order_timestamp();

DROP TRIGGER IF EXISTS trg_issued_check_update ON finance_issued_checks;
CREATE TRIGGER trg_issued_check_update
    BEFORE UPDATE ON finance_issued_checks
    FOR EACH ROW EXECUTE FUNCTION update_payment_order_timestamp();

-- ============================================
-- TRIGGER: Actualizar factura al ejecutar pago
-- ============================================
CREATE OR REPLACE FUNCTION update_invoice_on_payment_execution()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'executed' AND OLD.status != 'executed' THEN
        -- Actualizar cada factura incluida en la orden
        UPDATE procurement_invoices pi
        SET
            paid_amount = COALESCE(pi.paid_amount, 0) + poi.amount_to_pay,
            status = CASE
                WHEN COALESCE(pi.paid_amount, 0) + poi.amount_to_pay >= pi.total_amount THEN 'paid'
                ELSE 'partial'
            END,
            paid_at = CASE
                WHEN COALESCE(pi.paid_amount, 0) + poi.amount_to_pay >= pi.total_amount THEN NOW()
                ELSE pi.paid_at
            END
        FROM finance_payment_order_items poi
        WHERE poi.payment_order_id = NEW.id
          AND poi.invoice_id = pi.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_execution ON finance_payment_orders;
CREATE TRIGGER trg_payment_execution
    AFTER UPDATE ON finance_payment_orders
    FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment_execution();

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================
COMMENT ON TABLE finance_payment_orders IS 'Órdenes de Pago - Completa el circuito Procure-to-Pay';
COMMENT ON TABLE finance_payment_order_items IS 'Items de Órdenes de Pago - Facturas incluidas con retenciones';
COMMENT ON TABLE finance_checkbooks IS 'Chequeras - Gestión de cartera de cheques';
COMMENT ON TABLE finance_issued_checks IS 'Cheques Emitidos - Trazabilidad completa del ciclo de vida';
COMMENT ON MATERIALIZED VIEW mv_payment_forecast_cube IS 'Cubo OLAP para previsión financiera con drill-down multi-dimensional';

-- ============================================
-- GRANT DE PERMISOS (si se usa rol específico)
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT SELECT ON mv_payment_forecast_cube TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- ============================================
-- REFRESH INICIAL
-- ============================================
-- La vista se poblará cuando haya datos
-- SELECT refresh_payment_forecast_cube();

COMMIT;
