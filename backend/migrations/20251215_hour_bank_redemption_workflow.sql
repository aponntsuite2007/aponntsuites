-- ============================================================================
-- SISTEMA DE CANJE DE HORAS - WORKFLOW DE APROBACIÓN MULTINIVEL
-- ============================================================================
-- Fecha: 2025-12-15
-- Descripción: Sistema completo de solicitud, aprobación y ejecución de canje
--              de horas del banco con integración a asistencia
-- ============================================================================

-- ============================================================================
-- TABLA: hour_bank_redemption_requests
-- Solicitudes de canje de horas del banco
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_redemption_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    user_id UUID NOT NULL REFERENCES users(user_id),

    -- Horas solicitadas
    hours_requested DECIMAL(6,2) NOT NULL CHECK (hours_requested > 0),

    -- Fecha programada para usar las horas
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME,  -- Hora de inicio (si es salida temprana)
    scheduled_end_time TIME,    -- Hora de fin (si es entrada tarde)
    redemption_type VARCHAR(20) DEFAULT 'early_departure', -- early_departure, late_arrival, full_day, partial

    -- Balance al momento de la solicitud
    balance_at_request DECIMAL(8,2) NOT NULL,

    -- Estado del workflow
    status VARCHAR(30) DEFAULT 'pending_supervisor',
    -- Estados posibles:
    -- pending_supervisor: Esperando aprobación del supervisor
    -- approved_supervisor: Aprobado por supervisor, esperando HR
    -- pending_hr: Esperando aprobación de HR
    -- approved: Totalmente aprobado
    -- rejected_supervisor: Rechazado por supervisor
    -- rejected_hr: Rechazado por HR
    -- cancelled: Cancelado por el empleado
    -- executed: Ejecutado (las horas fueron usadas)
    -- expired: Expirado (no se usó en la fecha programada)

    -- Workflow de aprobación
    supervisor_id UUID REFERENCES users(user_id),
    supervisor_decision VARCHAR(20), -- approved, rejected
    supervisor_decision_at TIMESTAMP,
    supervisor_comments TEXT,

    hr_approver_id UUID REFERENCES users(user_id),
    hr_decision VARCHAR(20), -- approved, rejected
    hr_decision_at TIMESTAMP,
    hr_comments TEXT,

    -- Motivo de la solicitud
    reason TEXT,

    -- Ejecución
    executed_at TIMESTAMP,
    actual_hours_used DECIMAL(6,2),
    execution_notes TEXT,

    -- Transacción generada
    transaction_id UUID REFERENCES hour_bank_transactions(id),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_redemption_type CHECK (redemption_type IN ('early_departure', 'late_arrival', 'full_day', 'partial')),
    CONSTRAINT valid_status CHECK (status IN ('pending_supervisor', 'approved_supervisor', 'pending_hr', 'approved', 'rejected_supervisor', 'rejected_hr', 'cancelled', 'executed', 'expired')),
    CONSTRAINT scheduled_date_future CHECK (scheduled_date >= CURRENT_DATE OR status IN ('executed', 'expired', 'cancelled'))
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_redemption_company ON hour_bank_redemption_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_redemption_user ON hour_bank_redemption_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_status ON hour_bank_redemption_requests(status);
CREATE INDEX IF NOT EXISTS idx_redemption_date ON hour_bank_redemption_requests(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_redemption_supervisor ON hour_bank_redemption_requests(supervisor_id, status);

-- ============================================================================
-- TABLA: hour_bank_redemption_history
-- Historial de cambios de estado de las solicitudes
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_redemption_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES hour_bank_redemption_requests(id) ON DELETE CASCADE,

    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,

    changed_by UUID REFERENCES users(user_id),
    changed_by_role VARCHAR(50), -- employee, supervisor, hr, system

    comments TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_redemption_history_request ON hour_bank_redemption_history(request_id);

-- ============================================================================
-- TABLA: hour_bank_scheduled_redemptions
-- Vista de redenciones programadas para el día (para integración con asistencia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_scheduled_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES hour_bank_redemption_requests(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    user_id UUID NOT NULL REFERENCES users(user_id),

    scheduled_date DATE NOT NULL,
    hours_approved DECIMAL(6,2) NOT NULL,

    -- Horarios calculados según turno del empleado
    expected_checkout_time TIME,  -- Si es salida temprana
    expected_checkin_time TIME,   -- Si es entrada tarde
    shift_id UUID REFERENCES shifts(id),

    -- Estado de ejecución
    is_executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP,
    actual_checkout_time TIME,
    actual_checkin_time TIME,

    -- Validación de cumplimiento
    compliance_status VARCHAR(20) DEFAULT 'pending',
    -- pending: Esperando el día
    -- compliant: Salió/entró en horario correcto
    -- early: Salió antes de lo permitido
    -- late: Salió después de lo esperado
    -- no_show: No se presentó

    deviation_minutes INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheduled_redemption_date ON hour_bank_scheduled_redemptions(scheduled_date, company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_redemption_user ON hour_bank_scheduled_redemptions(user_id, scheduled_date);

-- ============================================================================
-- FUNCIÓN: Validar solicitud de canje contra políticas
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_redemption_request(
    p_company_id INTEGER,
    p_user_id UUID,
    p_hours_requested DECIMAL,
    p_scheduled_date DATE
) RETURNS TABLE (
    is_valid BOOLEAN,
    error_code VARCHAR(50),
    error_message TEXT,
    current_balance DECIMAL,
    max_per_event DECIMAL,
    available_for_redemption DECIMAL,
    pending_requests DECIMAL
) AS $$
DECLARE
    v_balance DECIMAL;
    v_max_per_event DECIMAL;
    v_pending DECIMAL;
    v_template RECORD;
    v_available DECIMAL;
BEGIN
    -- Obtener balance actual
    SELECT COALESCE(SUM(
        CASE WHEN transaction_type = 'accrual' THEN hours_final
             WHEN transaction_type IN ('usage', 'redemption') THEN -hours_final
             ELSE 0
        END
    ), 0) INTO v_balance
    FROM hour_bank_transactions
    WHERE company_id = p_company_id AND user_id = p_user_id
    AND status = 'completed';

    -- Obtener horas pendientes de aprobación/ejecución
    SELECT COALESCE(SUM(hours_requested), 0) INTO v_pending
    FROM hour_bank_redemption_requests
    WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND status IN ('pending_supervisor', 'approved_supervisor', 'pending_hr', 'approved');

    -- Calcular disponible real
    v_available := v_balance - v_pending;

    -- Obtener plantilla de políticas
    SELECT * INTO v_template
    FROM hour_bank_templates
    WHERE company_id = p_company_id
    AND is_active = true
    ORDER BY branch_id NULLS LAST, id DESC
    LIMIT 1;

    -- Si no hay plantilla, usar valores por defecto
    IF v_template IS NULL THEN
        v_max_per_event := 8.0; -- Default 8 horas
    ELSE
        v_max_per_event := COALESCE(v_template.max_hours_per_redemption, 8.0);
    END IF;

    -- Validación 1: Balance insuficiente
    IF v_available < p_hours_requested THEN
        RETURN QUERY SELECT
            false,
            'INSUFFICIENT_BALANCE'::VARCHAR,
            format('Balance disponible insuficiente. Disponible: %.1f horas, Solicitado: %.1f horas', v_available, p_hours_requested),
            v_balance,
            v_max_per_event,
            v_available,
            v_pending;
        RETURN;
    END IF;

    -- Validación 2: Excede máximo por evento
    IF p_hours_requested > v_max_per_event THEN
        RETURN QUERY SELECT
            false,
            'EXCEEDS_MAX_PER_EVENT'::VARCHAR,
            format('Excede el máximo permitido por evento. Máximo: %.1f horas, Solicitado: %.1f horas', v_max_per_event, p_hours_requested),
            v_balance,
            v_max_per_event,
            v_available,
            v_pending;
        RETURN;
    END IF;

    -- Validación 3: Fecha en el pasado
    IF p_scheduled_date < CURRENT_DATE THEN
        RETURN QUERY SELECT
            false,
            'PAST_DATE'::VARCHAR,
            'La fecha programada no puede ser en el pasado',
            v_balance,
            v_max_per_event,
            v_available,
            v_pending;
        RETURN;
    END IF;

    -- Validación 4: Ya tiene solicitud para ese día
    IF EXISTS (
        SELECT 1 FROM hour_bank_redemption_requests
        WHERE company_id = p_company_id
        AND user_id = p_user_id
        AND scheduled_date = p_scheduled_date
        AND status NOT IN ('rejected_supervisor', 'rejected_hr', 'cancelled', 'expired')
    ) THEN
        RETURN QUERY SELECT
            false,
            'DUPLICATE_DATE'::VARCHAR,
            'Ya existe una solicitud pendiente o aprobada para esta fecha',
            v_balance,
            v_max_per_event,
            v_available,
            v_pending;
        RETURN;
    END IF;

    -- Todo válido
    RETURN QUERY SELECT
        true,
        NULL::VARCHAR,
        NULL::TEXT,
        v_balance,
        v_max_per_event,
        v_available,
        v_pending;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Obtener supervisor inmediato del empleado
-- ============================================================================
CREATE OR REPLACE FUNCTION get_immediate_supervisor(
    p_company_id INTEGER,
    p_user_id UUID
) RETURNS TABLE (
    supervisor_id UUID,
    supervisor_name TEXT,
    supervisor_email VARCHAR
) AS $$
DECLARE
    v_supervisor RECORD;
BEGIN
    -- Buscar jefe de departamento del empleado
    SELECT
        u.user_id,
        u."firstName" || ' ' || u."lastName" as sup_name,
        u.email as sup_email
    INTO v_supervisor
    FROM users u
    JOIN departments d ON d.manager_id = u.user_id
    WHERE d.id = (
        SELECT emp.department_id
        FROM users emp
        WHERE emp.user_id = p_user_id AND emp.company_id = p_company_id
    )
    AND u.user_id != p_user_id
    AND u.is_active = true
    LIMIT 1;

    IF v_supervisor IS NOT NULL THEN
        RETURN QUERY SELECT v_supervisor.user_id, v_supervisor.sup_name, v_supervisor.sup_email;
        RETURN;
    END IF;

    -- Si no tiene jefe de departamento, buscar cualquier admin/supervisor de la empresa
    SELECT
        u.user_id,
        u."firstName" || ' ' || u."lastName" as sup_name,
        u.email as sup_email
    INTO v_supervisor
    FROM users u
    WHERE u.company_id = p_company_id
    AND u.role IN ('admin', 'supervisor', 'rrhh')
    AND u.user_id != p_user_id
    AND u.is_active = true
    ORDER BY
        CASE u.role
            WHEN 'supervisor' THEN 1
            WHEN 'rrhh' THEN 2
            WHEN 'admin' THEN 3
        END
    LIMIT 1;

    IF v_supervisor IS NOT NULL THEN
        RETURN QUERY SELECT v_supervisor.user_id, v_supervisor.sup_name, v_supervisor.sup_email;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Calcular horario de salida según horas canjeadas
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_redemption_checkout_time(
    p_user_id UUID,
    p_scheduled_date DATE,
    p_hours_to_redeem DECIMAL
) RETURNS TABLE (
    shift_id UUID,
    shift_name VARCHAR,
    normal_checkout TIME,
    adjusted_checkout TIME,
    hours_to_work DECIMAL,
    hours_redeemed DECIMAL
) AS $$
DECLARE
    v_shift RECORD;
    v_checkout INTERVAL;
BEGIN
    -- Obtener turno del empleado para ese día (via user_shifts)
    SELECT s.* INTO v_shift
    FROM shifts s
    JOIN user_shifts us ON us.shift_id = s.id
    WHERE us.user_id = p_user_id
    LIMIT 1;

    IF v_shift IS NULL THEN
        -- Sin turno asignado, usar horario default 9-18
        RETURN QUERY SELECT
            NULL::UUID,
            'Sin turno'::VARCHAR,
            '18:00'::TIME,
            ('18:00'::TIME - (p_hours_to_redeem || ' hours')::INTERVAL)::TIME,
            8.0::DECIMAL,
            p_hours_to_redeem;
        RETURN;
    END IF;

    -- Calcular hora de salida ajustada
    v_checkout := v_shift."endTime"::TIME - (p_hours_to_redeem || ' hours')::INTERVAL;

    RETURN QUERY SELECT
        v_shift.id,
        v_shift.name,
        v_shift."endTime"::TIME,
        v_checkout::TIME,
        EXTRACT(EPOCH FROM (v_shift."endTime"::TIME - v_shift."startTime"::TIME))/3600 - p_hours_to_redeem,
        p_hours_to_redeem;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Procesar checkout con canje de horas
-- ============================================================================
CREATE OR REPLACE FUNCTION process_redemption_checkout(
    p_user_id UUID,
    p_company_id INTEGER,
    p_checkout_time TIME,
    p_checkout_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    has_redemption BOOLEAN,
    request_id UUID,
    hours_approved DECIMAL,
    expected_checkout TIME,
    actual_checkout TIME,
    deviation_minutes INTEGER,
    compliance_status VARCHAR,
    message TEXT
) AS $$
DECLARE
    v_scheduled RECORD;
    v_deviation INTEGER;
    v_status VARCHAR;
    v_msg TEXT;
BEGIN
    -- Buscar si tiene canje programado para hoy
    SELECT sr.*, rr.hours_requested
    INTO v_scheduled
    FROM hour_bank_scheduled_redemptions sr
    JOIN hour_bank_redemption_requests rr ON rr.id = sr.request_id
    WHERE sr.user_id = p_user_id
    AND sr.company_id = p_company_id
    AND sr.scheduled_date = p_checkout_date
    AND sr.is_executed = false
    AND rr.status = 'approved';

    IF v_scheduled IS NULL THEN
        -- No tiene canje programado
        RETURN QUERY SELECT
            false,
            NULL::UUID,
            NULL::DECIMAL,
            NULL::TIME,
            p_checkout_time,
            NULL::INTEGER,
            NULL::VARCHAR,
            'Sin canje programado para hoy'::TEXT;
        RETURN;
    END IF;

    -- Calcular desviación en minutos
    v_deviation := EXTRACT(EPOCH FROM (p_checkout_time - v_scheduled.expected_checkout_time))/60;

    -- Determinar estado de cumplimiento
    IF ABS(v_deviation) <= 5 THEN
        v_status := 'compliant';
        v_msg := 'Salida en horario correcto según canje autorizado';
    ELSIF v_deviation < -5 THEN
        v_status := 'early';
        v_msg := format('Salida %d minutos antes de lo autorizado', ABS(v_deviation));
    ELSE
        v_status := 'late';
        v_msg := format('Salida %d minutos después de lo esperado', v_deviation);
    END IF;

    -- Actualizar registro de canje programado
    UPDATE hour_bank_scheduled_redemptions
    SET
        is_executed = true,
        executed_at = CURRENT_TIMESTAMP,
        actual_checkout_time = p_checkout_time,
        compliance_status = v_status,
        deviation_minutes = v_deviation,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_scheduled.id;

    -- Si cumplió correctamente, marcar solicitud como ejecutada
    IF v_status = 'compliant' THEN
        UPDATE hour_bank_redemption_requests
        SET
            status = 'executed',
            executed_at = CURRENT_TIMESTAMP,
            actual_hours_used = v_scheduled.hours_approved,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_scheduled.request_id;

        -- Registrar transacción de uso
        INSERT INTO hour_bank_transactions (
            company_id, user_id, transaction_type, hours_final, hours_raw, conversion_rate,
            description, status, source_type, source_request_id
        ) VALUES (
            p_company_id, p_user_id, 'redemption', v_scheduled.hours_approved, v_scheduled.hours_approved, 1.0,
            format('Canje ejecutado - Solicitud #%s', v_scheduled.request_id),
            'completed', 'redemption', v_scheduled.request_id
        );
    END IF;

    RETURN QUERY SELECT
        true,
        v_scheduled.request_id,
        v_scheduled.hours_approved,
        v_scheduled.expected_checkout_time,
        p_checkout_time,
        v_deviation,
        v_status,
        v_msg;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Obtener resumen de cuenta corriente del empleado
-- ============================================================================
CREATE OR REPLACE FUNCTION get_hour_bank_account_statement(
    p_company_id INTEGER,
    p_user_id UUID,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
) RETURNS TABLE (
    transaction_date DATE,
    transaction_type VARCHAR,
    description TEXT,
    hours_debit DECIMAL,
    hours_credit DECIMAL,
    balance_after DECIMAL,
    status VARCHAR,
    reference_type VARCHAR,
    reference_id UUID
) AS $$
DECLARE
    v_running_balance DECIMAL := 0;
BEGIN
    RETURN QUERY
    WITH movements AS (
        -- Transacciones normales
        SELECT
            t.created_at::DATE as tx_date,
            t.transaction_type as tx_type,
            t.description as tx_desc,
            CASE WHEN t.transaction_type IN ('usage', 'redemption', 'adjustment') AND t.hours_final < 0
                 THEN ABS(t.hours_final) ELSE 0 END as debit,
            CASE WHEN t.transaction_type = 'accrual' OR t.hours_final > 0
                 THEN t.hours_final ELSE 0 END as credit,
            t.status as tx_status,
            t.source_type as ref_type,
            t.source_request_id as ref_id,
            t.created_at as order_date
        FROM hour_bank_transactions t
        WHERE t.company_id = p_company_id
        AND t.user_id = p_user_id
        AND t.status = 'completed'
        AND (p_from_date IS NULL OR t.created_at::DATE >= p_from_date)
        AND (p_to_date IS NULL OR t.created_at::DATE <= p_to_date)

        UNION ALL

        -- Solicitudes de canje pendientes (reservadas)
        SELECT
            r.created_at::DATE,
            'reserved'::VARCHAR,
            format('Canje solicitado para %s - %s', r.scheduled_date, r.status),
            r.hours_requested,
            0,
            r.status,
            'redemption_request',
            r.id,
            r.created_at
        FROM hour_bank_redemption_requests r
        WHERE r.company_id = p_company_id
        AND r.user_id = p_user_id
        AND r.status IN ('pending_supervisor', 'approved_supervisor', 'pending_hr', 'approved')
        AND (p_from_date IS NULL OR r.created_at::DATE >= p_from_date)
        AND (p_to_date IS NULL OR r.created_at::DATE <= p_to_date)
    )
    SELECT
        m.tx_date,
        m.tx_type,
        m.tx_desc,
        m.debit,
        m.credit,
        SUM(m.credit - m.debit) OVER (ORDER BY m.order_date, m.ref_id) as running_balance,
        m.tx_status,
        m.ref_type,
        m.ref_id
    FROM movements m
    ORDER BY m.order_date DESC, m.ref_id DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AGREGAR COLUMNA max_hours_per_redemption A PLANTILLAS SI NO EXISTE
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hour_bank_templates' AND column_name = 'max_hours_per_redemption'
    ) THEN
        ALTER TABLE hour_bank_templates ADD COLUMN max_hours_per_redemption DECIMAL(4,1) DEFAULT 8.0;
        COMMENT ON COLUMN hour_bank_templates.max_hours_per_redemption IS 'Máximo de horas que se pueden canjear por evento';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hour_bank_templates' AND column_name = 'min_hours_per_redemption'
    ) THEN
        ALTER TABLE hour_bank_templates ADD COLUMN min_hours_per_redemption DECIMAL(4,1) DEFAULT 1.0;
        COMMENT ON COLUMN hour_bank_templates.min_hours_per_redemption IS 'Mínimo de horas que se pueden canjear por evento';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hour_bank_templates' AND column_name = 'advance_notice_days'
    ) THEN
        ALTER TABLE hour_bank_templates ADD COLUMN advance_notice_days INTEGER DEFAULT 2;
        COMMENT ON COLUMN hour_bank_templates.advance_notice_days IS 'Días de anticipación mínimos para solicitar canje';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hour_bank_templates' AND column_name = 'requires_hr_approval'
    ) THEN
        ALTER TABLE hour_bank_templates ADD COLUMN requires_hr_approval BOOLEAN DEFAULT true;
        COMMENT ON COLUMN hour_bank_templates.requires_hr_approval IS 'Si requiere aprobación de RRHH además del supervisor';
    END IF;
END $$;

-- ============================================================================
-- VISTA: Solicitudes pendientes de aprobación por supervisor
-- ============================================================================
CREATE OR REPLACE VIEW v_pending_supervisor_approvals AS
SELECT
    r.id as request_id,
    r.company_id,
    r.user_id,
    u."firstName" || ' ' || u."lastName" as employee_name,
    u.legajo,
    d.name as department_name,
    r.hours_requested,
    r.scheduled_date,
    r.redemption_type,
    r.reason,
    r.balance_at_request,
    r.created_at as requested_at,
    r.supervisor_id,
    sup."firstName" || ' ' || sup."lastName" as supervisor_name
FROM hour_bank_redemption_requests r
JOIN users u ON u.user_id = r.user_id
LEFT JOIN departments d ON d.id = u.department_id
LEFT JOIN users sup ON sup.user_id = r.supervisor_id
WHERE r.status = 'pending_supervisor';

-- ============================================================================
-- VISTA: Solicitudes pendientes de aprobación por HR
-- ============================================================================
CREATE OR REPLACE VIEW v_pending_hr_approvals AS
SELECT
    r.id as request_id,
    r.company_id,
    r.user_id,
    u."firstName" || ' ' || u."lastName" as employee_name,
    u.legajo,
    d.name as department_name,
    r.hours_requested,
    r.scheduled_date,
    r.redemption_type,
    r.reason,
    r.balance_at_request,
    r.supervisor_id,
    sup."firstName" || ' ' || sup."lastName" as supervisor_name,
    r.supervisor_decision_at,
    r.supervisor_comments,
    r.created_at as requested_at
FROM hour_bank_redemption_requests r
JOIN users u ON u.user_id = r.user_id
LEFT JOIN departments d ON d.id = u.department_id
LEFT JOIN users sup ON sup.user_id = r.supervisor_id
WHERE r.status = 'approved_supervisor';

-- ============================================================================
-- TRIGGER: Registrar historial de cambios de estado
-- ============================================================================
CREATE OR REPLACE FUNCTION log_redemption_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO hour_bank_redemption_history (
            request_id, previous_status, new_status,
            changed_by, changed_by_role, comments
        ) VALUES (
            NEW.id, OLD.status, NEW.status,
            COALESCE(NEW.hr_approver_id, NEW.supervisor_id, NEW.user_id),
            CASE
                WHEN NEW.status LIKE '%hr%' THEN 'hr'
                WHEN NEW.status LIKE '%supervisor%' THEN 'supervisor'
                WHEN NEW.status = 'cancelled' THEN 'employee'
                ELSE 'system'
            END,
            COALESCE(NEW.hr_comments, NEW.supervisor_comments)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_redemption_status_log ON hour_bank_redemption_requests;
CREATE TRIGGER trg_redemption_status_log
    AFTER UPDATE ON hour_bank_redemption_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_redemption_status_change();

-- ============================================================================
-- TRIGGER: Crear registro de canje programado al aprobar
-- ============================================================================
CREATE OR REPLACE FUNCTION create_scheduled_redemption()
RETURNS TRIGGER AS $$
DECLARE
    v_checkout RECORD;
BEGIN
    -- Solo cuando pasa a estado 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Calcular horario de salida
        SELECT * INTO v_checkout
        FROM calculate_redemption_checkout_time(NEW.user_id, NEW.scheduled_date, NEW.hours_requested);

        -- Crear registro de canje programado
        INSERT INTO hour_bank_scheduled_redemptions (
            request_id, company_id, user_id, scheduled_date,
            hours_approved, expected_checkout_time, shift_id
        ) VALUES (
            NEW.id, NEW.company_id, NEW.user_id, NEW.scheduled_date,
            NEW.hours_requested, v_checkout.adjusted_checkout, v_checkout.shift_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_scheduled_redemption ON hour_bank_redemption_requests;
CREATE TRIGGER trg_create_scheduled_redemption
    AFTER UPDATE ON hour_bank_redemption_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_scheduled_redemption();

-- ============================================================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_redemption ON hour_bank_transactions(source_type, source_request_id) WHERE source_type = 'redemption';

COMMENT ON TABLE hour_bank_redemption_requests IS 'Solicitudes de canje de horas del banco con workflow de aprobación';
COMMENT ON TABLE hour_bank_redemption_history IS 'Historial de cambios de estado de las solicitudes de canje';
COMMENT ON TABLE hour_bank_scheduled_redemptions IS 'Canjes programados para integración con sistema de asistencia';
