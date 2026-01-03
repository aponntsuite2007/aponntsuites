-- ============================================================================
-- EXPANSIÓN SISTEMA DE CAJAS ENTERPRISE
-- Multi-Moneda, Ajustes, Autorizaciones Jerárquicas, Dashboard Ejecutivo
-- ============================================================================

-- ============================================================================
-- 1. MONEDAS Y TIPOS DE CAMBIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,           -- 'ARS', 'USD', 'EUR', 'BRL'
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,               -- '$', 'US$', '€', 'R$'
    decimal_places INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar monedas comunes
INSERT INTO finance_currencies (code, name, symbol, display_order) VALUES
('ARS', 'Peso Argentino', '$', 1),
('USD', 'Dólar Estadounidense', 'US$', 2),
('EUR', 'Euro', '€', 3),
('BRL', 'Real Brasileño', 'R$', 4),
('UYU', 'Peso Uruguayo', '$U', 5),
('CLP', 'Peso Chileno', 'CLP$', 6),
('PYG', 'Guaraní Paraguayo', '₲', 7),
('BOB', 'Boliviano', 'Bs', 8),
('PEN', 'Sol Peruano', 'S/', 9),
('COP', 'Peso Colombiano', 'COL$', 10),
('MXN', 'Peso Mexicano', 'MX$', 11),
('GBP', 'Libra Esterlina', '£', 12),
('CHF', 'Franco Suizo', 'CHF', 13),
('JPY', 'Yen Japonés', '¥', 14),
('CNY', 'Yuan Chino', '¥', 15)
ON CONFLICT (code) DO NOTHING;

-- Tipos de cambio
CREATE TABLE IF NOT EXISTS finance_exchange_rates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),  -- NULL = global
    from_currency VARCHAR(3) NOT NULL REFERENCES finance_currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES finance_currencies(code),
    rate DECIMAL(18, 8) NOT NULL,
    rate_date DATE NOT NULL,
    rate_type VARCHAR(20) DEFAULT 'official',    -- 'official', 'blue', 'mep', 'ccl', 'custom'
    source VARCHAR(100),                          -- 'bcra', 'dolar_hoy', 'manual'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, from_currency, to_currency, rate_date, rate_type)
);

CREATE INDEX idx_exchange_rates_lookup ON finance_exchange_rates(from_currency, to_currency, rate_date);

-- ============================================================================
-- 2. EXPANDIR CAJAS PARA MULTI-MONEDA
-- ============================================================================

-- Agregar soporte multi-moneda a cajas
ALTER TABLE finance_cash_registers ADD COLUMN IF NOT EXISTS
    allowed_currencies VARCHAR(3)[] DEFAULT ARRAY['ARS'];

ALTER TABLE finance_cash_registers ADD COLUMN IF NOT EXISTS
    primary_currency VARCHAR(3) DEFAULT 'ARS' REFERENCES finance_currencies(code);

-- Saldos por moneda en la caja
CREATE TABLE IF NOT EXISTS finance_cash_register_balances (
    id SERIAL PRIMARY KEY,
    cash_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL REFERENCES finance_currencies(code),
    current_balance DECIMAL(18, 2) DEFAULT 0,
    last_movement_at TIMESTAMP,
    last_adjustment_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(cash_register_id, currency)
);

-- Saldos por moneda en sesiones
CREATE TABLE IF NOT EXISTS finance_cash_session_balances (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES finance_cash_register_sessions(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL REFERENCES finance_currencies(code),
    opening_balance DECIMAL(18, 2) DEFAULT 0,
    current_balance DECIMAL(18, 2) DEFAULT 0,
    closing_balance DECIMAL(18, 2),
    total_income DECIMAL(18, 2) DEFAULT 0,
    total_expense DECIMAL(18, 2) DEFAULT 0,
    total_adjustments DECIMAL(18, 2) DEFAULT 0,
    difference DECIMAL(18, 2),

    UNIQUE(session_id, currency)
);

-- Agregar moneda a movimientos
ALTER TABLE finance_cash_movements ADD COLUMN IF NOT EXISTS
    currency VARCHAR(3) DEFAULT 'ARS' REFERENCES finance_currencies(code);

ALTER TABLE finance_cash_movements ADD COLUMN IF NOT EXISTS
    exchange_rate DECIMAL(18, 8);

ALTER TABLE finance_cash_movements ADD COLUMN IF NOT EXISTS
    amount_in_base_currency DECIMAL(18, 2);

-- ============================================================================
-- 3. SISTEMA DE AJUSTES CON AUTORIZACIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_cash_adjustments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    cash_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id),
    session_id INTEGER REFERENCES finance_cash_register_sessions(id),

    -- Identificación
    adjustment_number VARCHAR(50) NOT NULL,
    adjustment_date TIMESTAMP DEFAULT NOW(),

    -- Tipo de ajuste
    adjustment_type VARCHAR(30) NOT NULL,        -- 'positive', 'negative', 'exchange_diff', 'rounding', 'correction'
    adjustment_reason VARCHAR(100) NOT NULL,     -- 'shortage', 'surplus', 'error_correction', 'exchange_adjustment', 'opening_balance', 'audit_finding'

    -- Montos
    currency VARCHAR(3) NOT NULL REFERENCES finance_currencies(code),
    amount DECIMAL(18, 2) NOT NULL,
    previous_balance DECIMAL(18, 2) NOT NULL,
    new_balance DECIMAL(18, 2) NOT NULL,

    -- Documentación
    description TEXT NOT NULL,
    supporting_document VARCHAR(200),            -- Referencia a documento de respaldo

    -- Workflow de autorización
    status VARCHAR(30) DEFAULT 'pending',        -- 'pending', 'approved', 'rejected', 'cancelled'

    -- Solicitante
    requested_by UUID NOT NULL REFERENCES users(user_id),
    requested_at TIMESTAMP DEFAULT NOW(),

    -- Autorización (Responsable de Finanzas)
    requires_finance_approval BOOLEAN DEFAULT true,
    finance_approver_id UUID REFERENCES users(user_id),
    finance_approved_at TIMESTAMP,
    finance_approval_method VARCHAR(20),         -- 'biometric', 'password', 'token'
    finance_approval_notes TEXT,

    -- Rechazo
    rejected_by UUID REFERENCES users(user_id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,

    -- Asiento contable generado
    journal_entry_id INTEGER REFERENCES finance_journal_entries(id),

    -- Auditoría
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, adjustment_number)
);

CREATE INDEX idx_adjustments_status ON finance_cash_adjustments(company_id, status);
CREATE INDEX idx_adjustments_finance ON finance_cash_adjustments(finance_approver_id, status);

-- ============================================================================
-- 4. SOLICITUDES DE EGRESO CON AUTORIZACIÓN JERÁRQUICA
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_cash_egress_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    cash_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id),
    session_id INTEGER REFERENCES finance_cash_register_sessions(id),

    -- Identificación
    request_number VARCHAR(50) NOT NULL,
    request_date TIMESTAMP DEFAULT NOW(),

    -- Tipo de egreso
    egress_type VARCHAR(50) NOT NULL,            -- 'manual_withdrawal', 'expense', 'supplier_payment', 'reimbursement', 'loan', 'other'
    category VARCHAR(100),

    -- Montos
    currency VARCHAR(3) NOT NULL REFERENCES finance_currencies(code),
    amount DECIMAL(18, 2) NOT NULL,
    payment_method_id INTEGER REFERENCES finance_payment_methods(id),

    -- Beneficiario
    beneficiary_type VARCHAR(30),                -- 'employee', 'supplier', 'other'
    beneficiary_id VARCHAR(100),
    beneficiary_name VARCHAR(200),
    beneficiary_document VARCHAR(50),

    -- Documentación
    description TEXT NOT NULL,
    justification TEXT NOT NULL,                 -- Justificación obligatoria
    supporting_documents JSONB DEFAULT '[]',     -- [{filename, url, type}]

    -- Workflow de autorización jerárquica
    status VARCHAR(30) DEFAULT 'pending',        -- 'pending', 'supervisor_approved', 'finance_approved', 'executed', 'rejected', 'cancelled'

    -- Solicitante (operador de caja)
    requested_by UUID NOT NULL REFERENCES users(user_id),
    requested_at TIMESTAMP DEFAULT NOW(),

    -- Aprobación del supervisor inmediato (según organigrama)
    supervisor_id UUID REFERENCES users(user_id),
    supervisor_approved_at TIMESTAMP,
    supervisor_approval_method VARCHAR(20),      -- 'biometric', 'password'
    supervisor_notes TEXT,

    -- Notificación/Aprobación del responsable de finanzas
    finance_responsible_id UUID REFERENCES users(user_id),
    finance_notified_at TIMESTAMP,
    finance_approved_at TIMESTAMP,
    finance_approval_method VARCHAR(20),
    finance_notes TEXT,

    -- Escalamiento
    escalation_level INTEGER DEFAULT 0,          -- 0=normal, 1=primer escalamiento, 2=segundo, etc.
    escalated_to UUID REFERENCES users(user_id),
    escalated_at TIMESTAMP,
    escalation_reason TEXT,

    -- Ejecución
    executed_by UUID REFERENCES users(user_id),
    executed_at TIMESTAMP,
    execution_method VARCHAR(20),                -- 'biometric', 'password'
    movement_id INTEGER REFERENCES finance_cash_movements(id),

    -- Rechazo
    rejected_by UUID REFERENCES users(user_id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,

    -- Auditoría
    ip_address VARCHAR(45),
    audit_trail JSONB DEFAULT '[]',              -- [{timestamp, action, user_id, notes}]
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, request_number)
);

CREATE INDEX idx_egress_requests_status ON finance_cash_egress_requests(company_id, status);
CREATE INDEX idx_egress_requests_supervisor ON finance_cash_egress_requests(supervisor_id, status);
CREATE INDEX idx_egress_requests_finance ON finance_cash_egress_requests(finance_responsible_id, status);

-- ============================================================================
-- 5. CONFIGURACIÓN DE RESPONSABLES DE FINANZAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_responsible_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),

    -- Responsable principal de finanzas
    finance_responsible_id UUID NOT NULL REFERENCES users(user_id),
    finance_responsible_position_id INTEGER REFERENCES positions(id),

    -- Responsables de respaldo (para escalamiento)
    backup_responsibles UUID[] DEFAULT ARRAY[]::UUID[],

    -- Configuración de escalamiento
    escalation_timeout_minutes INTEGER DEFAULT 60,  -- Tiempo antes de escalar
    max_escalation_level INTEGER DEFAULT 3,

    -- Límites de autorización
    max_adjustment_without_approval DECIMAL(18, 2) DEFAULT 0,  -- 0 = siempre requiere
    max_egress_without_approval DECIMAL(18, 2) DEFAULT 0,

    -- Notificaciones
    notify_on_all_adjustments BOOLEAN DEFAULT true,
    notify_on_all_egress BOOLEAN DEFAULT true,
    notify_on_cash_discrepancy BOOLEAN DEFAULT true,
    notify_threshold_percent DECIMAL(5, 2) DEFAULT 1.00,  -- Notificar si diferencia > 1%

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id)
);

-- ============================================================================
-- 6. ARRASTRE DE SALDO ENTRE CIERRES
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_cash_balance_carryover (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    cash_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id),

    -- Sesión que cierra y sesión que abre
    closing_session_id INTEGER NOT NULL REFERENCES finance_cash_register_sessions(id),
    opening_session_id INTEGER REFERENCES finance_cash_register_sessions(id),  -- NULL hasta que se abra

    -- Saldos por moneda
    currency VARCHAR(3) NOT NULL REFERENCES finance_currencies(code),
    closing_balance DECIMAL(18, 2) NOT NULL,
    carried_balance DECIMAL(18, 2) NOT NULL,     -- Puede diferir si hay ajuste
    adjustment_amount DECIMAL(18, 2) DEFAULT 0,
    adjustment_id INTEGER REFERENCES finance_cash_adjustments(id),

    -- Detalles
    closing_date TIMESTAMP NOT NULL,
    closing_user_id UUID NOT NULL REFERENCES users(user_id),
    opening_date TIMESTAMP,
    opening_user_id UUID REFERENCES users(user_id),

    -- Estado
    status VARCHAR(20) DEFAULT 'pending',        -- 'pending', 'carried', 'adjusted'

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(closing_session_id, currency)
);

-- ============================================================================
-- 7. CAMBIO DE MONEDA (INGRESOS DE CAMBIO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_currency_exchanges (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    cash_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id),
    session_id INTEGER REFERENCES finance_cash_register_sessions(id),

    -- Identificación
    exchange_number VARCHAR(50) NOT NULL,
    exchange_date TIMESTAMP DEFAULT NOW(),

    -- Monedas
    from_currency VARCHAR(3) NOT NULL REFERENCES finance_currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES finance_currencies(code),

    -- Montos
    from_amount DECIMAL(18, 2) NOT NULL,
    to_amount DECIMAL(18, 2) NOT NULL,
    exchange_rate DECIMAL(18, 8) NOT NULL,
    rate_type VARCHAR(20) DEFAULT 'custom',      -- 'official', 'blue', 'custom'

    -- Comisión/Spread
    commission_amount DECIMAL(18, 2) DEFAULT 0,
    spread_percent DECIMAL(5, 2) DEFAULT 0,

    -- Cliente (si aplica)
    client_name VARCHAR(200),
    client_document VARCHAR(50),

    -- Movimientos generados
    egress_movement_id INTEGER REFERENCES finance_cash_movements(id),
    income_movement_id INTEGER REFERENCES finance_cash_movements(id),

    -- Auditoría
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, exchange_number)
);

-- ============================================================================
-- 8. VERIFICACIÓN BIOMÉTRICA/CONTRASEÑA
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_authorization_logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),

    -- Operación autorizada
    operation_type VARCHAR(50) NOT NULL,         -- 'adjustment', 'egress', 'close_session', 'exchange'
    operation_id INTEGER NOT NULL,
    operation_table VARCHAR(100) NOT NULL,

    -- Usuario que autoriza
    authorizer_id UUID NOT NULL REFERENCES users(user_id),
    authorization_role VARCHAR(50),              -- 'operator', 'supervisor', 'finance_responsible'

    -- Método de autorización
    authorization_method VARCHAR(30) NOT NULL,   -- 'biometric_fingerprint', 'biometric_face', 'password', '2fa_token', 'pin'
    authorization_device VARCHAR(100),           -- ID del dispositivo biométrico
    authorization_confidence DECIMAL(5, 2),      -- % de confianza para biométrico

    -- Resultado
    authorization_result VARCHAR(20) NOT NULL,   -- 'success', 'failed', 'timeout'
    failure_reason TEXT,

    -- Auditoría
    ip_address VARCHAR(45),
    user_agent TEXT,
    location_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auth_logs_operation ON finance_authorization_logs(operation_type, operation_id);
CREATE INDEX idx_auth_logs_user ON finance_authorization_logs(authorizer_id, created_at);

-- ============================================================================
-- 9. DASHBOARD EJECUTIVO - VISTAS MATERIALIZADAS
-- ============================================================================

-- Vista consolidada de todas las cajas por empresa
CREATE OR REPLACE VIEW finance_dashboard_registers_summary AS
SELECT
    cr.company_id,
    cr.id AS register_id,
    cr.code AS register_code,
    cr.name AS register_name,
    cr.register_type,
    cr.is_active,
    crs.id AS current_session_id,
    crs.status AS session_status,
    crs.opened_by,
    crs.opened_at,
    COALESCE(
        (SELECT jsonb_object_agg(currency, current_balance)
         FROM finance_cash_register_balances
         WHERE cash_register_id = cr.id),
        '{}'::jsonb
    ) AS balances_by_currency,
    (SELECT COUNT(*) FROM finance_cash_transfers
     WHERE destination_register_id = cr.id AND status = 'pending') AS pending_incoming_transfers,
    (SELECT COUNT(*) FROM finance_cash_transfers
     WHERE source_register_id = cr.id AND status = 'pending') AS pending_outgoing_transfers,
    (SELECT COUNT(*) FROM finance_cash_egress_requests
     WHERE cash_register_id = cr.id AND status IN ('pending', 'supervisor_approved')) AS pending_egress_requests
FROM finance_cash_registers cr
LEFT JOIN finance_cash_register_sessions crs
    ON cr.current_session_id = crs.id;

-- Vista de movimientos consolidados por día/moneda/método
CREATE OR REPLACE VIEW finance_dashboard_daily_summary AS
SELECT
    cm.company_id,
    DATE(cm.movement_date) AS movement_day,
    cm.currency,
    cm.movement_type,
    pm.name AS payment_method,
    COUNT(*) AS transaction_count,
    SUM(cm.amount) AS total_amount,
    SUM(CASE WHEN cm.movement_type = 'income' THEN cm.amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN cm.movement_type = 'expense' THEN cm.amount ELSE 0 END) AS total_expense,
    SUM(CASE WHEN cm.movement_type = 'transfer_in' THEN cm.amount ELSE 0 END) AS total_transfer_in,
    SUM(CASE WHEN cm.movement_type = 'transfer_out' THEN cm.amount ELSE 0 END) AS total_transfer_out
FROM finance_cash_movements cm
LEFT JOIN finance_payment_methods pm ON cm.payment_method_id = pm.id
GROUP BY cm.company_id, DATE(cm.movement_date), cm.currency, cm.movement_type, pm.name;

-- Vista de ajustes pendientes de aprobación
CREATE OR REPLACE VIEW finance_dashboard_pending_approvals AS
SELECT
    'adjustment' AS type,
    ca.id,
    ca.company_id,
    ca.adjustment_number AS reference_number,
    ca.adjustment_type,
    ca.currency,
    ca.amount,
    ca.description,
    ca.status,
    ca.requested_by,
    ca.requested_at,
    u.name AS requester_name,
    cr.name AS register_name
FROM finance_cash_adjustments ca
JOIN users u ON ca.requested_by = u.user_id
JOIN finance_cash_registers cr ON ca.cash_register_id = cr.id
WHERE ca.status = 'pending'

UNION ALL

SELECT
    'egress' AS type,
    cer.id,
    cer.company_id,
    cer.request_number AS reference_number,
    cer.egress_type AS adjustment_type,
    cer.currency,
    cer.amount,
    cer.description,
    cer.status,
    cer.requested_by,
    cer.requested_at,
    u.name AS requester_name,
    cr.name AS register_name
FROM finance_cash_egress_requests cer
JOIN users u ON cer.requested_by = u.user_id
JOIN finance_cash_registers cr ON cer.cash_register_id = cr.id
WHERE cer.status IN ('pending', 'supervisor_approved');

-- ============================================================================
-- 10. FUNCIONES DE NEGOCIO
-- ============================================================================

-- Función para obtener el responsable de finanzas (con escalamiento)
CREATE OR REPLACE FUNCTION get_finance_responsible(
    p_company_id INTEGER,
    p_escalation_level INTEGER DEFAULT 0
) RETURNS UUID AS $$
DECLARE
    v_responsible_id UUID;
    v_backup_responsibles UUID[];
BEGIN
    SELECT finance_responsible_id, backup_responsibles
    INTO v_responsible_id, v_backup_responsibles
    FROM finance_responsible_config
    WHERE company_id = p_company_id AND is_active = true;

    IF v_responsible_id IS NULL THEN
        -- Si no hay config, buscar en organigrama alguien con rol de finanzas
        SELECT u.user_id INTO v_responsible_id
        FROM users u
        JOIN positions p ON u.position_id = p.id
        WHERE u.company_id = p_company_id
          AND (p.name ILIKE '%finanz%' OR p.name ILIKE '%finance%' OR p.name ILIKE '%tesor%')
          AND u.is_active = true
        ORDER BY p.hierarchy_level ASC
        LIMIT 1;
    END IF;

    -- Si hay escalamiento, usar backup
    IF p_escalation_level > 0 AND v_backup_responsibles IS NOT NULL THEN
        IF array_length(v_backup_responsibles, 1) >= p_escalation_level THEN
            v_responsible_id := v_backup_responsibles[p_escalation_level];
        END IF;
    END IF;

    RETURN v_responsible_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener supervisor inmediato según organigrama
CREATE OR REPLACE FUNCTION get_immediate_supervisor(
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_supervisor_id UUID;
    v_department_id INTEGER;
    v_position_level INTEGER;
BEGIN
    -- Obtener departamento y nivel del usuario
    SELECT u.department_id, p.hierarchy_level
    INTO v_department_id, v_position_level
    FROM users u
    LEFT JOIN positions p ON u.position_id = p.id
    WHERE u.user_id = p_user_id;

    -- Buscar supervisor en el mismo departamento o superior
    SELECT u.user_id INTO v_supervisor_id
    FROM users u
    LEFT JOIN positions p ON u.position_id = p.id
    WHERE u.department_id = v_department_id
      AND u.user_id != p_user_id
      AND u.is_active = true
      AND (p.hierarchy_level < v_position_level OR p.is_supervisor = true)
    ORDER BY p.hierarchy_level ASC
    LIMIT 1;

    -- Si no hay en el departamento, buscar jefe del departamento
    IF v_supervisor_id IS NULL THEN
        SELECT d.manager_id INTO v_supervisor_id
        FROM departments d
        WHERE d.id = v_department_id;
    END IF;

    RETURN v_supervisor_id;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular saldo actual por moneda
CREATE OR REPLACE FUNCTION get_register_balance_by_currency(
    p_register_id INTEGER,
    p_currency VARCHAR(3) DEFAULT 'ARS'
) RETURNS DECIMAL(18, 2) AS $$
DECLARE
    v_balance DECIMAL(18, 2);
BEGIN
    SELECT current_balance INTO v_balance
    FROM finance_cash_register_balances
    WHERE cash_register_id = p_register_id AND currency = p_currency;

    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Función para arrastrar saldo al cerrar sesión
CREATE OR REPLACE FUNCTION carry_over_session_balance(
    p_closing_session_id INTEGER
) RETURNS void AS $$
DECLARE
    v_record RECORD;
BEGIN
    FOR v_record IN
        SELECT
            csb.session_id,
            csb.currency,
            csb.closing_balance,
            crs.cash_register_id,
            crs.company_id,
            crs.closed_by
        FROM finance_cash_session_balances csb
        JOIN finance_cash_register_sessions crs ON csb.session_id = crs.id
        WHERE csb.session_id = p_closing_session_id
    LOOP
        -- Actualizar balance de la caja
        INSERT INTO finance_cash_register_balances (cash_register_id, currency, current_balance, updated_at)
        VALUES (v_record.cash_register_id, v_record.currency, v_record.closing_balance, NOW())
        ON CONFLICT (cash_register_id, currency)
        DO UPDATE SET
            current_balance = EXCLUDED.current_balance,
            last_movement_at = NOW(),
            updated_at = NOW();

        -- Registrar carryover
        INSERT INTO finance_cash_balance_carryover (
            company_id, cash_register_id, closing_session_id,
            currency, closing_balance, carried_balance,
            closing_date, closing_user_id, status
        ) VALUES (
            v_record.company_id, v_record.cash_register_id, v_record.session_id,
            v_record.currency, v_record.closing_balance, v_record.closing_balance,
            NOW(), v_record.closed_by, 'pending'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para arrastrar saldo al cerrar sesión
CREATE OR REPLACE FUNCTION trigger_session_close_carryover()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'closed' AND OLD.status = 'open' THEN
        PERFORM carry_over_session_balance(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_close_carryover ON finance_cash_register_sessions;
CREATE TRIGGER trg_session_close_carryover
    AFTER UPDATE ON finance_cash_register_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_session_close_carryover();

-- ============================================================================
-- 11. ÍNDICES PARA PERFORMANCE DEL DASHBOARD
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_movements_dashboard
    ON finance_cash_movements(company_id, movement_date, currency, movement_type);

CREATE INDEX IF NOT EXISTS idx_movements_session_currency
    ON finance_cash_movements(session_id, currency);

CREATE INDEX IF NOT EXISTS idx_registers_company_active
    ON finance_cash_registers(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_register_status
    ON finance_cash_register_sessions(cash_register_id, status);

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
