-- =========================================================
-- PARTNER COMMISSIONS SYSTEM
-- Sistema de comisiones que Aponnt cobra a los asociados
-- por el trabajo realizado a traves de la plataforma
-- =========================================================

-- 1. Tabla de configuracion de comisiones por asociado
CREATE TABLE IF NOT EXISTS partner_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    -- Tipo de comision
    commission_type VARCHAR(30) NOT NULL DEFAULT 'percentage',
    -- 'percentage' = % de cada facturacion
    -- 'fixed_per_case' = monto fijo por caso completado
    -- 'monthly_fee' = cuota mensual fija
    -- 'tiered' = escalonado segun volumen

    -- Valores de comision
    percentage DECIMAL(5,2) DEFAULT 15.00, -- Porcentaje (para 'percentage')
    fixed_amount DECIMAL(10,2) DEFAULT 0, -- Monto fijo (para 'fixed_per_case' o 'monthly_fee')

    -- Configuracion de escalonado (para 'tiered')
    tiered_config JSONB DEFAULT NULL,
    -- Ejemplo: [{"from":0,"to":10,"percentage":15},{"from":11,"to":50,"percentage":12},{"from":51,"percentage":10}]

    -- Estado
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE DEFAULT NULL,

    -- Metadata
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT partner_commissions_type_check CHECK (
        commission_type IN ('percentage', 'fixed_per_case', 'monthly_fee', 'tiered')
    ),
    CONSTRAINT partner_commissions_percentage_check CHECK (
        percentage >= 0 AND percentage <= 100
    )
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_id
    ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_active
    ON partner_commissions(partner_id, is_active) WHERE is_active = true;

-- 2. Tabla de transacciones de comision
CREATE TABLE IF NOT EXISTS partner_commission_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    partner_commission_id UUID REFERENCES partner_commissions(id) ON DELETE SET NULL,

    -- Referencia al trabajo realizado
    reference_type VARCHAR(50) NOT NULL, -- 'absence_case', 'medical_visit', 'consultation', etc.
    reference_id UUID NOT NULL, -- ID del caso/visita/consulta
    company_id INTEGER REFERENCES companies(company_id),

    -- Montos
    billable_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Monto facturado al cliente
    commission_percentage DECIMAL(5,2) NOT NULL, -- % aplicado
    commission_amount DECIMAL(12,2) NOT NULL, -- Monto de comision para Aponnt
    net_amount DECIMAL(12,2) NOT NULL, -- Monto neto para el asociado

    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' = pendiente de pago
    -- 'invoiced' = facturado al asociado
    -- 'paid' = pagado por el asociado
    -- 'cancelled' = cancelado

    -- Fechas
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoiced_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,

    -- Facturacion
    invoice_number VARCHAR(50),
    payment_reference VARCHAR(100),
    payment_method VARCHAR(30),

    -- Metadata
    description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pct_status_check CHECK (
        status IN ('pending', 'invoiced', 'paid', 'cancelled')
    ),
    CONSTRAINT pct_amounts_check CHECK (
        billable_amount >= 0 AND commission_amount >= 0 AND net_amount >= 0
    )
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_pct_partner_id ON partner_commission_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_pct_status ON partner_commission_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pct_date ON partner_commission_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_pct_reference ON partner_commission_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_pct_company ON partner_commission_transactions(company_id);

-- 3. Tabla de resumen mensual de comisiones
CREATE TABLE IF NOT EXISTS partner_commission_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    -- Periodo
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,

    -- Totales
    total_cases INTEGER NOT NULL DEFAULT 0,
    total_billable DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_net DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Por estado
    pending_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    invoiced_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Estado del resumen
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    -- 'open' = mes en curso, abierto a cambios
    -- 'closed' = mes cerrado, solo lectura
    -- 'settled' = liquidado completamente

    closed_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pcs_unique_period UNIQUE (partner_id, year, month),
    CONSTRAINT pcs_month_check CHECK (month >= 1 AND month <= 12)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_pcs_partner_period ON partner_commission_summaries(partner_id, year, month);
CREATE INDEX IF NOT EXISTS idx_pcs_status ON partner_commission_summaries(status);

-- 4. Funcion para calcular comision
CREATE OR REPLACE FUNCTION calculate_partner_commission(
    p_partner_id UUID,
    p_billable_amount DECIMAL
) RETURNS TABLE (
    commission_id UUID,
    commission_type VARCHAR,
    percentage DECIMAL,
    fixed_amount DECIMAL,
    calculated_commission DECIMAL
) AS $$
DECLARE
    v_config partner_commissions%ROWTYPE;
BEGIN
    -- Obtener configuracion activa del partner
    SELECT * INTO v_config
    FROM partner_commissions
    WHERE partner_id = p_partner_id
      AND is_active = true
      AND effective_from <= CURRENT_DATE
      AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_config.id IS NULL THEN
        -- Sin configuracion, usar default 15%
        RETURN QUERY SELECT
            NULL::UUID,
            'percentage'::VARCHAR,
            15.00::DECIMAL,
            0::DECIMAL,
            (p_billable_amount * 0.15)::DECIMAL;
    ELSE
        CASE v_config.commission_type
            WHEN 'percentage' THEN
                RETURN QUERY SELECT
                    v_config.id,
                    v_config.commission_type,
                    v_config.percentage,
                    v_config.fixed_amount,
                    (p_billable_amount * v_config.percentage / 100)::DECIMAL;
            WHEN 'fixed_per_case' THEN
                RETURN QUERY SELECT
                    v_config.id,
                    v_config.commission_type,
                    v_config.percentage,
                    v_config.fixed_amount,
                    v_config.fixed_amount;
            ELSE
                -- Default to percentage
                RETURN QUERY SELECT
                    v_config.id,
                    v_config.commission_type,
                    COALESCE(v_config.percentage, 15.00),
                    v_config.fixed_amount,
                    (p_billable_amount * COALESCE(v_config.percentage, 15.00) / 100)::DECIMAL;
        END CASE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Funcion para actualizar resumen mensual
CREATE OR REPLACE FUNCTION update_partner_commission_summary(
    p_partner_id UUID,
    p_year INTEGER,
    p_month INTEGER
) RETURNS VOID AS $$
BEGIN
    INSERT INTO partner_commission_summaries (
        partner_id, year, month,
        total_cases, total_billable, total_commission, total_net,
        pending_amount, invoiced_amount, paid_amount
    )
    SELECT
        p_partner_id,
        p_year,
        p_month,
        COUNT(*)::INTEGER,
        COALESCE(SUM(billable_amount), 0),
        COALESCE(SUM(commission_amount), 0),
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'invoiced' THEN commission_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0)
    FROM partner_commission_transactions
    WHERE partner_id = p_partner_id
      AND EXTRACT(YEAR FROM transaction_date) = p_year
      AND EXTRACT(MONTH FROM transaction_date) = p_month
      AND status != 'cancelled'
    ON CONFLICT (partner_id, year, month)
    DO UPDATE SET
        total_cases = EXCLUDED.total_cases,
        total_billable = EXCLUDED.total_billable,
        total_commission = EXCLUDED.total_commission,
        total_net = EXCLUDED.total_net,
        pending_amount = EXCLUDED.pending_amount,
        invoiced_amount = EXCLUDED.invoiced_amount,
        paid_amount = EXCLUDED.paid_amount,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para actualizar resumen al insertar/actualizar transacciones
CREATE OR REPLACE FUNCTION trigger_update_commission_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_partner_commission_summary(
            OLD.partner_id,
            EXTRACT(YEAR FROM OLD.transaction_date)::INTEGER,
            EXTRACT(MONTH FROM OLD.transaction_date)::INTEGER
        );
        RETURN OLD;
    ELSE
        PERFORM update_partner_commission_summary(
            NEW.partner_id,
            EXTRACT(YEAR FROM NEW.transaction_date)::INTEGER,
            EXTRACT(MONTH FROM NEW.transaction_date)::INTEGER
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_commission_summary ON partner_commission_transactions;
CREATE TRIGGER trg_update_commission_summary
    AFTER INSERT OR UPDATE OR DELETE ON partner_commission_transactions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_commission_summary();

-- 7. Vista para dashboard de comisiones
CREATE OR REPLACE VIEW v_partner_commission_dashboard AS
SELECT
    p.id as partner_id,
    p.first_name || ' ' || p.last_name as partner_name,
    p.specialty,
    p.email,
    pc.commission_type,
    pc.percentage as current_percentage,
    COALESCE(pcs_current.total_cases, 0) as cases_this_month,
    COALESCE(pcs_current.total_billable, 0) as billable_this_month,
    COALESCE(pcs_current.total_commission, 0) as commission_this_month,
    COALESCE(pcs_current.pending_amount, 0) as pending_this_month,
    COALESCE((
        SELECT SUM(commission_amount)
        FROM partner_commission_transactions
        WHERE partner_id = p.id AND status = 'pending'
    ), 0) as total_pending,
    COALESCE((
        SELECT SUM(commission_amount)
        FROM partner_commission_transactions
        WHERE partner_id = p.id AND status = 'paid'
    ), 0) as total_paid
FROM partners p
LEFT JOIN partner_commissions pc ON p.id = pc.partner_id AND pc.is_active = true
LEFT JOIN partner_commission_summaries pcs_current ON p.id = pcs_current.partner_id
    AND pcs_current.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND pcs_current.month = EXTRACT(MONTH FROM CURRENT_DATE)
WHERE p.is_active = true;

-- Mensaje de finalizacion
DO $$
BEGIN
    RAISE NOTICE 'Partner Commissions System created successfully';
END $$;
