-- ============================================================================
-- SISTEMA DE PRÉSTAMO DE HORAS (Hour Loan System)
-- Permite saldo negativo controlado con reglas de devolución
-- ============================================================================

-- 1. Agregar campos de préstamo a plantillas
ALTER TABLE hour_bank_templates
ADD COLUMN IF NOT EXISTS allow_hour_loans BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_loan_hours DECIMAL(6,2) DEFAULT 8.00,
ADD COLUMN IF NOT EXISTS loan_interest_rate DECIMAL(4,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS loan_repayment_priority VARCHAR(20) DEFAULT 'mandatory',
ADD COLUMN IF NOT EXISTS max_negative_balance DECIMAL(8,2) DEFAULT -16.00,
ADD COLUMN IF NOT EXISTS loan_warning_threshold DECIMAL(6,2) DEFAULT -8.00,
ADD COLUMN IF NOT EXISTS require_loan_justification BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS loan_approval_level VARCHAR(20) DEFAULT 'hr';

COMMENT ON COLUMN hour_bank_templates.allow_hour_loans IS 'Permite préstamos de horas (saldo negativo)';
COMMENT ON COLUMN hour_bank_templates.max_loan_hours IS 'Máximo de horas que se pueden pedir prestadas por solicitud';
COMMENT ON COLUMN hour_bank_templates.loan_interest_rate IS 'Tasa de interés del préstamo (0.10 = 10%, pides 2h debes 2.2h)';
COMMENT ON COLUMN hour_bank_templates.loan_repayment_priority IS 'mandatory=100% overtime salda deuda, partial=50%, flexible=empleado elige';
COMMENT ON COLUMN hour_bank_templates.max_negative_balance IS 'Límite máximo de saldo negativo (ej: -16 = máximo 16h de deuda)';
COMMENT ON COLUMN hour_bank_templates.loan_warning_threshold IS 'Umbral para alertar sobre deuda alta';
COMMENT ON COLUMN hour_bank_templates.require_loan_justification IS 'Requiere justificación para préstamos';
COMMENT ON COLUMN hour_bank_templates.loan_approval_level IS 'Nivel de aprobación: supervisor, hr, both';

-- 2. Agregar campo de tipo de transacción para préstamos
ALTER TABLE hour_bank_transactions
ADD COLUMN IF NOT EXISTS is_loan BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loan_original_hours DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS loan_interest_hours DECIMAL(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS loan_repaid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loan_repaid_at TIMESTAMP;

-- 3. Agregar indicador de préstamo en solicitudes
ALTER TABLE hour_bank_redemption_requests
ADD COLUMN IF NOT EXISTS is_loan_request BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loan_justification TEXT,
ADD COLUMN IF NOT EXISTS loan_total_debt DECIMAL(6,2);

-- 4. Crear tabla de seguimiento de préstamos
CREATE TABLE IF NOT EXISTS hour_bank_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    redemption_request_id UUID REFERENCES hour_bank_redemption_requests(id),

    -- Detalle del préstamo
    hours_borrowed DECIMAL(6,2) NOT NULL,
    interest_rate DECIMAL(4,2) DEFAULT 0,
    interest_hours DECIMAL(6,2) DEFAULT 0,
    total_to_repay DECIMAL(6,2) NOT NULL,
    hours_repaid DECIMAL(6,2) DEFAULT 0,
    balance_remaining DECIMAL(6,2) NOT NULL,

    -- Estado
    status VARCHAR(20) DEFAULT 'active',

    -- Fechas
    borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    fully_repaid_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_loan_status CHECK (status IN ('active', 'partial', 'repaid', 'overdue', 'written_off'))
);

CREATE INDEX IF NOT EXISTS idx_loans_user ON hour_bank_loans(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON hour_bank_loans(status) WHERE status = 'active';

-- 5. Actualizar función de validación para soportar préstamos
DROP FUNCTION IF EXISTS validate_redemption_request(INTEGER, UUID, DECIMAL, DATE);
CREATE OR REPLACE FUNCTION validate_redemption_request(
    p_company_id INTEGER,
    p_user_id UUID,
    p_hours_requested DECIMAL,
    p_scheduled_date DATE
) RETURNS TABLE (
    is_valid BOOLEAN,
    error_code VARCHAR,
    error_message TEXT,
    current_balance DECIMAL,
    available_for_redemption DECIMAL,
    pending_requests DECIMAL,
    max_per_event DECIMAL,
    is_loan BOOLEAN,
    loan_amount DECIMAL,
    total_debt_after DECIMAL
) AS $$
DECLARE
    v_template RECORD;
    v_balance DECIMAL;
    v_pending DECIMAL;
    v_available DECIMAL;
    v_is_loan BOOLEAN := false;
    v_loan_amount DECIMAL := 0;
    v_current_debt DECIMAL := 0;
    v_total_debt DECIMAL := 0;
BEGIN
    -- Obtener plantilla aplicable
    SELECT * INTO v_template
    FROM hour_bank_templates
    WHERE company_id = p_company_id
    AND is_enabled = true
    ORDER BY branch_id NULLS LAST
    LIMIT 1;

    IF v_template IS NULL THEN
        RETURN QUERY SELECT
            false, 'NO_TEMPLATE'::VARCHAR,
            'No hay plantilla de banco de horas configurada'::TEXT,
            0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 8::DECIMAL,
            false, 0::DECIMAL, 0::DECIMAL;
        RETURN;
    END IF;

    -- Obtener balance actual (puede ser negativo si hay préstamos)
    SELECT COALESCE(SUM(
        CASE WHEN transaction_type = 'accrual' THEN hours_final
             WHEN transaction_type IN ('usage', 'redemption') THEN -hours_final
             ELSE 0
        END
    ), 0) INTO v_balance
    FROM hour_bank_transactions
    WHERE company_id = p_company_id AND user_id = p_user_id
    AND status = 'completed';

    -- Obtener solicitudes pendientes
    SELECT COALESCE(SUM(hours_requested), 0) INTO v_pending
    FROM hour_bank_redemption_requests
    WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND status IN ('pending_supervisor', 'approved_supervisor', 'approved');

    -- Calcular disponible (balance - pendientes)
    v_available := v_balance - v_pending;

    -- Validar fecha futura
    IF p_scheduled_date <= CURRENT_DATE THEN
        RETURN QUERY SELECT
            false, 'INVALID_DATE'::VARCHAR,
            'La fecha debe ser futura'::TEXT,
            v_balance, v_available, v_pending,
            COALESCE(v_template.max_hours_per_redemption, 8)::DECIMAL,
            false, 0::DECIMAL, 0::DECIMAL;
        RETURN;
    END IF;

    -- Para validación (p_hours_requested = 0), retornar info
    IF p_hours_requested = 0 THEN
        RETURN QUERY SELECT
            true, NULL::VARCHAR, NULL::TEXT,
            v_balance, v_available, v_pending,
            COALESCE(v_template.max_hours_per_redemption, 8)::DECIMAL,
            false, 0::DECIMAL, v_balance;
        RETURN;
    END IF;

    -- Validar máximo por evento
    IF p_hours_requested > COALESCE(v_template.max_hours_per_redemption, 8) THEN
        RETURN QUERY SELECT
            false, 'EXCEEDS_MAX_PER_EVENT'::VARCHAR,
            format('Máximo %s horas por solicitud', v_template.max_hours_per_redemption)::TEXT,
            v_balance, v_available, v_pending,
            COALESCE(v_template.max_hours_per_redemption, 8)::DECIMAL,
            false, 0::DECIMAL, 0::DECIMAL;
        RETURN;
    END IF;

    -- Verificar si es préstamo (solicita más de lo disponible)
    IF p_hours_requested > v_available THEN
        -- ¿Están habilitados los préstamos?
        IF NOT COALESCE(v_template.allow_hour_loans, false) THEN
            RETURN QUERY SELECT
                false, 'INSUFFICIENT_BALANCE'::VARCHAR,
                format('Saldo insuficiente. Disponible: %s horas', v_available)::TEXT,
                v_balance, v_available, v_pending,
                COALESCE(v_template.max_hours_per_redemption, 8)::DECIMAL,
                false, 0::DECIMAL, 0::DECIMAL;
            RETURN;
        END IF;

        -- Calcular préstamo necesario
        v_loan_amount := p_hours_requested - GREATEST(v_available, 0);
        v_is_loan := true;

        -- Verificar límite de préstamo por evento
        IF v_loan_amount > COALESCE(v_template.max_loan_hours, 8) THEN
            RETURN QUERY SELECT
                false, 'EXCEEDS_LOAN_LIMIT'::VARCHAR,
                format('Préstamo máximo: %s horas. Solicitando: %s',
                    v_template.max_loan_hours, v_loan_amount)::TEXT,
                v_balance, v_available, v_pending,
                COALESCE(v_template.max_hours_per_redemption, 8)::DECIMAL,
                true, v_loan_amount, 0::DECIMAL;
            RETURN;
        END IF;

        -- Calcular deuda total después del préstamo
        v_current_debt := CASE WHEN v_balance < 0 THEN ABS(v_balance) ELSE 0 END;
        v_total_debt := v_current_debt + v_loan_amount + v_pending;

        -- Verificar límite de saldo negativo total
        IF (v_balance - p_hours_requested) < COALESCE(v_template.max_negative_balance, -16) THEN
            RETURN QUERY SELECT
                false, 'EXCEEDS_NEGATIVE_LIMIT'::VARCHAR,
                format('Límite de deuda alcanzado. Máximo: %s horas. Deuda actual: %s',
                    ABS(v_template.max_negative_balance), v_current_debt)::TEXT,
                v_balance, v_available, v_pending,
                COALESCE(v_template.max_hours_per_redemption, 8)::DECIMAL,
                true, v_loan_amount, v_total_debt;
            RETURN;
        END IF;

        -- Préstamo válido
        RETURN QUERY SELECT
            true, 'LOAN_APPROVED'::VARCHAR,
            format('Préstamo de %s horas aprobado. Deuda total: %s', v_loan_amount, v_total_debt)::TEXT,
            v_balance, v_available, v_pending,
            COALESCE(v_template.max_hours_per_redemption, 8)::DECIMAL,
            true, v_loan_amount, v_total_debt;
        RETURN;
    END IF;

    -- Canje normal (sin préstamo)
    RETURN QUERY SELECT
        true, NULL::VARCHAR, NULL::TEXT,
        v_balance, v_available, v_pending,
        COALESCE(v_template.max_hours_per_redemption, 8)::DECIMAL,
        false, 0::DECIMAL, CASE WHEN v_balance < 0 THEN ABS(v_balance) ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para procesar pago de préstamos con horas extras
CREATE OR REPLACE FUNCTION process_loan_repayment(
    p_company_id INTEGER,
    p_user_id UUID,
    p_overtime_hours DECIMAL
) RETURNS TABLE (
    hours_to_bank DECIMAL,
    hours_to_repay DECIMAL,
    loans_affected INTEGER,
    remaining_debt DECIMAL,
    message TEXT
) AS $$
DECLARE
    v_template RECORD;
    v_hours_for_repayment DECIMAL;
    v_hours_for_bank DECIMAL;
    v_loan RECORD;
    v_repaid_count INTEGER := 0;
    v_remaining DECIMAL;
    v_total_remaining_debt DECIMAL;
BEGIN
    -- Obtener plantilla
    SELECT * INTO v_template
    FROM hour_bank_templates
    WHERE company_id = p_company_id AND is_enabled = true
    LIMIT 1;

    -- Calcular distribución según política
    IF v_template.loan_repayment_priority = 'mandatory' THEN
        v_hours_for_repayment := p_overtime_hours; -- 100% para pagar deuda
    ELSIF v_template.loan_repayment_priority = 'partial' THEN
        v_hours_for_repayment := p_overtime_hours * 0.5; -- 50% para deuda
    ELSE
        v_hours_for_repayment := p_overtime_hours * 0.25; -- 25% mínimo
    END IF;

    v_remaining := v_hours_for_repayment;

    -- Procesar préstamos activos (FIFO - primero los más antiguos)
    FOR v_loan IN
        SELECT * FROM hour_bank_loans
        WHERE company_id = p_company_id
        AND user_id = p_user_id
        AND status IN ('active', 'partial')
        ORDER BY borrowed_at
    LOOP
        IF v_remaining <= 0 THEN
            EXIT;
        END IF;

        -- Calcular cuánto podemos pagar de este préstamo
        DECLARE
            v_payment DECIMAL;
        BEGIN
            v_payment := LEAST(v_remaining, v_loan.balance_remaining);

            -- Actualizar préstamo
            UPDATE hour_bank_loans
            SET
                hours_repaid = hours_repaid + v_payment,
                balance_remaining = balance_remaining - v_payment,
                status = CASE
                    WHEN balance_remaining - v_payment <= 0 THEN 'repaid'
                    ELSE 'partial'
                END,
                fully_repaid_at = CASE
                    WHEN balance_remaining - v_payment <= 0 THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_loan.id;

            v_remaining := v_remaining - v_payment;
            v_repaid_count := v_repaid_count + 1;
        END;
    END LOOP;

    -- Calcular horas que van al banco (después de pagar deuda)
    v_hours_for_bank := p_overtime_hours - (v_hours_for_repayment - v_remaining);

    -- Obtener deuda total restante
    SELECT COALESCE(SUM(balance_remaining), 0) INTO v_total_remaining_debt
    FROM hour_bank_loans
    WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND status IN ('active', 'partial');

    RETURN QUERY SELECT
        v_hours_for_bank,
        v_hours_for_repayment - v_remaining,
        v_repaid_count,
        v_total_remaining_debt,
        CASE
            WHEN v_total_remaining_debt = 0 THEN 'Deuda saldada completamente'
            WHEN v_repaid_count > 0 THEN format('Pagados %s préstamos. Deuda restante: %s horas', v_repaid_count, v_total_remaining_debt)
            ELSE 'Sin préstamos pendientes'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 7. Vista de estado de préstamos por empleado
CREATE OR REPLACE VIEW v_employee_loan_status AS
SELECT
    l.company_id,
    l.user_id,
    u."firstName" || ' ' || u."lastName" as employee_name,
    u.legajo,
    COUNT(*) FILTER (WHERE l.status IN ('active', 'partial')) as active_loans,
    COALESCE(SUM(l.hours_borrowed) FILTER (WHERE l.status IN ('active', 'partial')), 0) as total_borrowed,
    COALESCE(SUM(l.hours_repaid) FILTER (WHERE l.status IN ('active', 'partial')), 0) as total_repaid,
    COALESCE(SUM(l.balance_remaining) FILTER (WHERE l.status IN ('active', 'partial')), 0) as current_debt,
    MIN(l.borrowed_at) FILTER (WHERE l.status IN ('active', 'partial')) as oldest_loan_date,
    COUNT(*) FILTER (WHERE l.status = 'repaid') as loans_repaid
FROM hour_bank_loans l
JOIN users u ON u.user_id = l.user_id
GROUP BY l.company_id, l.user_id, u."firstName", u."lastName", u.legajo;

-- 8. Habilitar préstamos en plantilla por defecto (opcional)
UPDATE hour_bank_templates
SET
    allow_hour_loans = true,
    max_loan_hours = 8.00,
    loan_interest_rate = 0.00,
    max_negative_balance = -16.00,
    loan_warning_threshold = -8.00
WHERE is_enabled = true;

SELECT 'Sistema de préstamos de horas instalado correctamente' as result;
