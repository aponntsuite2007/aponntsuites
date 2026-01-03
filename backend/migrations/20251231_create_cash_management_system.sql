-- ============================================================================
-- FINANCE CASH MANAGEMENT SYSTEM
-- Sistema de Cajas, Fondos Fijos y Medios de Pago
-- ============================================================================
-- Arquitectura PLUG-AND-PLAY:
-- - Cualquier módulo (Facturación, Warehouse, etc.) alimenta las cajas
-- - Transferencias entre cajas con workflow de confirmación
-- - Bloqueo de cierre si hay transferencias pendientes
-- - Reversión automática si se rechaza transferencia
-- ============================================================================

-- ============================================
-- 1. MEDIOS DE PAGO (Payment Methods)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_payment_methods (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Identificación
    code VARCHAR(20) NOT NULL,              -- 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'CHECK', 'WALLET'
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Tipo
    method_type VARCHAR(30) NOT NULL,       -- 'cash', 'card', 'bank_transfer', 'check', 'digital_wallet', 'credit', 'other'

    -- Configuración de liquidación
    settlement_type VARCHAR(30) NOT NULL,   -- 'immediate', 'next_day', 'weekly', 'monthly', 'custom'
    settlement_days INTEGER DEFAULT 0,      -- Días para liquidación (ej: tarjeta 2 días)
    settlement_account_id INTEGER REFERENCES finance_bank_accounts(id),

    -- Comisiones
    commission_percent DECIMAL(5,2) DEFAULT 0,
    commission_fixed DECIMAL(15,2) DEFAULT 0,
    tax_on_commission DECIMAL(5,2) DEFAULT 21, -- IVA sobre comisión

    -- Validaciones
    requires_reference BOOLEAN DEFAULT false,   -- Requiere número de referencia/autorización
    requires_bank BOOLEAN DEFAULT false,        -- Requiere seleccionar banco
    requires_due_date BOOLEAN DEFAULT false,    -- Requiere fecha de vencimiento (cheques)
    max_amount DECIMAL(15,2),                   -- Monto máximo por transacción

    -- Integración
    external_processor VARCHAR(50),             -- 'mercadopago', 'payway', 'prisma', 'manual'
    processor_config JSONB DEFAULT '{}',        -- Config específica del procesador

    -- Control
    is_active BOOLEAN DEFAULT true,
    allows_change BOOLEAN DEFAULT false,        -- Permite dar vuelto (solo efectivo)
    accepts_partial BOOLEAN DEFAULT true,       -- Acepta pagos parciales

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, code)
);

-- Datos semilla: Medios de pago estándar
INSERT INTO finance_payment_methods (company_id, code, name, method_type, settlement_type, allows_change) VALUES
(NULL, 'CASH', 'Efectivo', 'cash', 'immediate', true),
(NULL, 'DEBIT', 'Tarjeta Débito', 'card', 'next_day', false),
(NULL, 'CREDIT', 'Tarjeta Crédito', 'card', 'custom', false),
(NULL, 'TRANSFER', 'Transferencia Bancaria', 'bank_transfer', 'immediate', false),
(NULL, 'CHECK', 'Cheque', 'check', 'custom', false),
(NULL, 'MERCADOPAGO', 'MercadoPago', 'digital_wallet', 'next_day', false),
(NULL, 'ACCOUNT', 'Cuenta Corriente', 'credit', 'monthly', false)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. CAJAS (Cash Registers)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_cash_registers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Identificación
    code VARCHAR(20) NOT NULL,              -- 'CAJA-001', 'CAJA-PRINCIPAL'
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Tipo de caja
    register_type VARCHAR(30) NOT NULL,     -- 'individual', 'main', 'petty_cash', 'vault'
    -- individual: Caja de operador/cajero
    -- main: Caja principal/central (recibe transferencias)
    -- petty_cash: Fondo fijo
    -- vault: Bóveda/Tesoro

    -- Jerarquía
    parent_register_id INTEGER REFERENCES finance_cash_registers(id),
    -- NULL para cajas principales, apunta a caja principal para individuales

    -- Ubicación
    branch_id INTEGER,                      -- Sucursal (si aplica)
    location VARCHAR(200),                  -- Ubicación física

    -- Configuración
    default_opening_amount DECIMAL(15,2) DEFAULT 0,
    max_cash_amount DECIMAL(15,2),          -- Monto máximo permitido
    requires_count_on_close BOOLEAN DEFAULT true,
    requires_supervisor_approval BOOLEAN DEFAULT false,
    auto_transfer_to_main BOOLEAN DEFAULT false, -- Auto-transferir al cierre

    -- Medios de pago habilitados
    allowed_payment_methods INTEGER[] DEFAULT '{}', -- IDs de payment_methods

    -- Control
    is_active BOOLEAN DEFAULT true,
    is_open BOOLEAN DEFAULT false,          -- Estado actual
    current_session_id INTEGER,             -- Sesión activa

    -- Moneda
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Vinculación contable
    cash_account_id INTEGER REFERENCES finance_chart_of_accounts(id),
    difference_account_id INTEGER REFERENCES finance_chart_of_accounts(id),

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, code)
);

-- Índices
CREATE INDEX idx_cash_registers_company ON finance_cash_registers(company_id);
CREATE INDEX idx_cash_registers_type ON finance_cash_registers(register_type);
CREATE INDEX idx_cash_registers_parent ON finance_cash_registers(parent_register_id);

-- ============================================
-- 3. ASIGNACIÓN USUARIO-CAJA
-- ============================================
CREATE TABLE IF NOT EXISTS finance_cash_register_assignments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Relación
    cash_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Tipo de asignación
    assignment_type VARCHAR(20) NOT NULL,   -- 'primary', 'backup', 'supervisor'

    -- Permisos específicos
    can_open BOOLEAN DEFAULT true,
    can_close BOOLEAN DEFAULT true,
    can_transfer_out BOOLEAN DEFAULT true,
    can_transfer_in BOOLEAN DEFAULT true,
    can_void BOOLEAN DEFAULT false,
    can_view_other_sessions BOOLEAN DEFAULT false,
    max_void_amount DECIMAL(15,2),

    -- Vigencia
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(user_id),

    UNIQUE(cash_register_id, user_id, assignment_type)
);

-- ============================================
-- 4. SESIONES DE CAJA (Apertura/Cierre)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_cash_register_sessions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cash_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id),

    -- Identificación
    session_number VARCHAR(50) NOT NULL,    -- 'CAJA-001-2025-001'
    session_date DATE NOT NULL,

    -- Operador
    opened_by UUID NOT NULL REFERENCES users(user_id),
    closed_by UUID REFERENCES users(user_id),

    -- Horarios
    opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP,

    -- Montos de apertura (por medio de pago)
    opening_amounts JSONB NOT NULL DEFAULT '{}',
    -- {"CASH": 50000, "CHECK": 0, ...}

    -- Montos esperados al cierre (calculados)
    expected_amounts JSONB DEFAULT '{}',

    -- Montos declarados al cierre (conteo real)
    declared_amounts JSONB DEFAULT '{}',

    -- Diferencias
    differences JSONB DEFAULT '{}',
    total_difference DECIMAL(15,2) DEFAULT 0,

    -- Totales de la sesión
    total_sales DECIMAL(15,2) DEFAULT 0,
    total_collections DECIMAL(15,2) DEFAULT 0,
    total_payments DECIMAL(15,2) DEFAULT 0,
    total_transfers_in DECIMAL(15,2) DEFAULT 0,
    total_transfers_out DECIMAL(15,2) DEFAULT 0,

    -- Estado
    status VARCHAR(20) DEFAULT 'open',      -- 'open', 'closing', 'pending_transfers', 'closed', 'audited'

    -- Bloqueo por transferencias pendientes
    has_pending_transfers BOOLEAN DEFAULT false,
    pending_transfer_ids INTEGER[] DEFAULT '{}',

    -- Aprobaciones
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    approval_notes TEXT,

    -- Notas
    opening_notes TEXT,
    closing_notes TEXT,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, session_number)
);

-- Índices
CREATE INDEX idx_cash_sessions_register ON finance_cash_register_sessions(cash_register_id);
CREATE INDEX idx_cash_sessions_date ON finance_cash_register_sessions(session_date);
CREATE INDEX idx_cash_sessions_status ON finance_cash_register_sessions(status);
CREATE INDEX idx_cash_sessions_user ON finance_cash_register_sessions(opened_by);

-- ============================================
-- 5. MOVIMIENTOS DE CAJA
-- ============================================
CREATE TABLE IF NOT EXISTS finance_cash_movements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES finance_cash_register_sessions(id),
    cash_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id),

    -- Identificación
    movement_number VARCHAR(50) NOT NULL,
    movement_date TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Tipo de movimiento
    movement_type VARCHAR(30) NOT NULL,
    -- 'sale': Venta/Cobro (entrada)
    -- 'collection': Cobranza de cuenta corriente (entrada)
    -- 'payment': Pago a proveedor (salida)
    -- 'expense': Gasto menor (salida)
    -- 'transfer_in': Transferencia recibida (entrada)
    -- 'transfer_out': Transferencia enviada (salida)
    -- 'withdrawal': Retiro a caja principal (salida)
    -- 'deposit': Depósito desde caja principal (entrada)
    -- 'adjustment_pos': Ajuste positivo
    -- 'adjustment_neg': Ajuste negativo
    -- 'opening': Saldo inicial

    -- Dirección
    direction VARCHAR(10) NOT NULL,         -- 'in', 'out'

    -- Medio de pago
    payment_method_id INTEGER REFERENCES finance_payment_methods(id),

    -- Montos
    amount DECIMAL(15,2) NOT NULL,
    commission_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,      -- amount - commission

    -- Referencia del medio de pago
    payment_reference VARCHAR(100),         -- Número de autorización, cheque, etc.
    payment_bank VARCHAR(100),              -- Banco del cheque/transferencia
    payment_due_date DATE,                  -- Vencimiento del cheque

    -- Origen del movimiento (PLUG-AND-PLAY)
    source_module VARCHAR(50),              -- 'billing', 'warehouse', 'manual', 'transfer', etc.
    source_document_type VARCHAR(50),       -- 'invoice', 'receipt', 'purchase', 'expense'
    source_document_id INTEGER,
    source_document_number VARCHAR(100),

    -- Tercero relacionado
    third_party_type VARCHAR(30),           -- 'customer', 'supplier', 'employee'
    third_party_id INTEGER,
    third_party_name VARCHAR(200),

    -- Descripción
    description TEXT,

    -- Transferencia relacionada (si aplica)
    transfer_id INTEGER REFERENCES finance_cash_transfers(id),

    -- Estado
    status VARCHAR(20) DEFAULT 'active',    -- 'active', 'voided', 'pending'
    voided_at TIMESTAMP,
    voided_by UUID REFERENCES users(user_id),
    void_reason TEXT,

    -- Contabilización
    journal_entry_id INTEGER REFERENCES finance_journal_entries(id),
    is_posted BOOLEAN DEFAULT false,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, movement_number)
);

-- Índices
CREATE INDEX idx_cash_movements_session ON finance_cash_movements(session_id);
CREATE INDEX idx_cash_movements_register ON finance_cash_movements(cash_register_id);
CREATE INDEX idx_cash_movements_type ON finance_cash_movements(movement_type);
CREATE INDEX idx_cash_movements_date ON finance_cash_movements(movement_date);
CREATE INDEX idx_cash_movements_source ON finance_cash_movements(source_module, source_document_id);

-- ============================================
-- 6. TRANSFERENCIAS ENTRE CAJAS (Con Workflow)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_cash_transfers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Identificación
    transfer_number VARCHAR(50) NOT NULL,
    transfer_date TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Cajas involucradas
    source_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id),
    source_session_id INTEGER REFERENCES finance_cash_register_sessions(id),
    destination_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id),
    destination_session_id INTEGER REFERENCES finance_cash_register_sessions(id),

    -- Medio de pago transferido
    payment_method_id INTEGER NOT NULL REFERENCES finance_payment_methods(id),

    -- Monto
    amount DECIMAL(15,2) NOT NULL,

    -- Detalle (para cheques, múltiples billetes, etc.)
    transfer_details JSONB DEFAULT '{}',
    -- {"checks": [{"number": "001", "bank": "Galicia", "amount": 50000}], "cash_denominations": {...}}

    -- Descripción
    description TEXT,
    reason VARCHAR(100),                    -- 'daily_close', 'excess_cash', 'requested', 'other'

    -- WORKFLOW DE CONFIRMACIÓN
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- 'pending': Esperando confirmación del receptor
    -- 'confirmed': Receptor confirmó recepción
    -- 'rejected': Receptor rechazó (no recibió)
    -- 'cancelled': Origen canceló antes de confirmación
    -- 'reversed': Reversado después de rechazo

    -- Usuario que inicia
    initiated_by UUID NOT NULL REFERENCES users(user_id),
    initiated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Usuario que confirma/rechaza
    responded_by UUID REFERENCES users(user_id),
    responded_at TIMESTAMP,
    response_notes TEXT,

    -- Si fue rechazado y reversado
    reversed_at TIMESTAMP,
    reversal_movement_id INTEGER,           -- Movimiento de reversión

    -- Bloqueos
    blocks_source_close BOOLEAN DEFAULT true,   -- Bloquea cierre de caja origen
    blocks_destination_close BOOLEAN DEFAULT true, -- Bloquea cierre de caja destino

    -- Movimientos generados
    source_movement_id INTEGER,             -- Movimiento de salida en caja origen
    destination_movement_id INTEGER,        -- Movimiento de entrada en caja destino

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, transfer_number)
);

-- Índices
CREATE INDEX idx_cash_transfers_source ON finance_cash_transfers(source_register_id);
CREATE INDEX idx_cash_transfers_dest ON finance_cash_transfers(destination_register_id);
CREATE INDEX idx_cash_transfers_status ON finance_cash_transfers(status);
CREATE INDEX idx_cash_transfers_date ON finance_cash_transfers(transfer_date);

-- ============================================
-- 7. ARQUEOS DE CAJA (Cash Counts)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_cash_counts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES finance_cash_register_sessions(id),
    cash_register_id INTEGER NOT NULL REFERENCES finance_cash_registers(id),

    -- Tipo de arqueo
    count_type VARCHAR(20) NOT NULL,        -- 'opening', 'closing', 'audit', 'surprise'
    count_date TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Quien realiza
    counted_by UUID NOT NULL REFERENCES users(user_id),
    supervised_by UUID REFERENCES users(user_id),

    -- Detalle de conteo EFECTIVO por denominación
    cash_denominations JSONB DEFAULT '{}',
    -- {
    --   "bills": {"1000": 5, "500": 10, "200": 20, "100": 30},
    --   "coins": {"50": 10, "10": 20, "5": 15, "1": 50}
    -- }

    -- Totales por medio de pago
    totals_by_method JSONB DEFAULT '{}',
    -- {"CASH": 25000, "DEBIT": 150000, "CREDIT": 80000, "CHECK": 50000}

    -- Cheques detallados
    checks_detail JSONB DEFAULT '[]',
    -- [{"number": "001", "bank": "Galicia", "amount": 50000, "due_date": "2025-02-01"}]

    -- Vouchers/Comprobantes
    vouchers_detail JSONB DEFAULT '[]',
    -- [{"type": "DEBIT", "batch": "001", "count": 15, "amount": 150000}]

    -- Total declarado
    total_declared DECIMAL(15,2) NOT NULL,

    -- Total esperado (del sistema)
    total_expected DECIMAL(15,2) NOT NULL,

    -- Diferencia
    difference DECIMAL(15,2) NOT NULL,
    difference_percent DECIMAL(5,2),

    -- Justificación de diferencia
    difference_justified BOOLEAN DEFAULT false,
    difference_reason TEXT,
    difference_approved_by UUID REFERENCES users(user_id),

    -- Notas
    notes TEXT,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(session_id, count_type)
);

-- ============================================
-- 8. FONDOS FIJOS (Petty Cash)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_petty_cash_funds (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Identificación
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Responsable
    custodian_id UUID NOT NULL REFERENCES users(user_id),
    department_id INTEGER REFERENCES departments(id),

    -- Configuración
    fund_amount DECIMAL(15,2) NOT NULL,     -- Monto del fondo
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Saldo actual
    current_balance DECIMAL(15,2) NOT NULL,

    -- Límites
    max_expense_amount DECIMAL(15,2),       -- Máximo por gasto individual
    replenishment_threshold DECIMAL(5,2) DEFAULT 20, -- % para solicitar reposición

    -- Categorías permitidas
    allowed_expense_categories JSONB DEFAULT '[]',
    -- ["office_supplies", "cleaning", "transport", "meals"]

    -- Vinculación contable
    fund_account_id INTEGER REFERENCES finance_chart_of_accounts(id),
    expense_account_id INTEGER REFERENCES finance_chart_of_accounts(id),

    -- Caja asociada (para reposiciones)
    main_register_id INTEGER REFERENCES finance_cash_registers(id),

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Última reposición
    last_replenishment_date DATE,
    last_replenishment_amount DECIMAL(15,2),

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, code)
);

-- ============================================
-- 9. GASTOS DE FONDO FIJO
-- ============================================
CREATE TABLE IF NOT EXISTS finance_petty_cash_expenses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    fund_id INTEGER NOT NULL REFERENCES finance_petty_cash_funds(id),

    -- Identificación
    expense_number VARCHAR(50) NOT NULL,
    expense_date DATE NOT NULL,

    -- Detalle
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,

    -- Monto
    amount DECIMAL(15,2) NOT NULL,

    -- Comprobante
    has_receipt BOOLEAN DEFAULT true,
    receipt_type VARCHAR(30),               -- 'ticket', 'invoice', 'receipt', 'none'
    receipt_number VARCHAR(100),
    receipt_date DATE,

    -- Proveedor/Beneficiario
    vendor_name VARCHAR(200),
    vendor_tax_id VARCHAR(20),

    -- Estado
    status VARCHAR(20) DEFAULT 'pending',   -- 'pending', 'approved', 'rejected', 'replenished'

    -- Aprobación
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,

    -- Reposición
    replenishment_id INTEGER,

    -- Contabilización
    journal_entry_id INTEGER REFERENCES finance_journal_entries(id),

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, expense_number)
);

-- ============================================
-- 10. REPOSICIONES DE FONDO FIJO
-- ============================================
CREATE TABLE IF NOT EXISTS finance_petty_cash_replenishments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    fund_id INTEGER NOT NULL REFERENCES finance_petty_cash_funds(id),

    -- Identificación
    replenishment_number VARCHAR(50) NOT NULL,
    replenishment_date DATE NOT NULL,

    -- Período que cubre
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,

    -- Gastos incluidos
    expense_ids INTEGER[] NOT NULL,
    expense_count INTEGER NOT NULL,

    -- Montos
    total_expenses DECIMAL(15,2) NOT NULL,
    replenishment_amount DECIMAL(15,2) NOT NULL,

    -- Origen del dinero
    source_register_id INTEGER REFERENCES finance_cash_registers(id),
    source_movement_id INTEGER REFERENCES finance_cash_movements(id),
    payment_method_id INTEGER REFERENCES finance_payment_methods(id),

    -- Estado
    status VARCHAR(20) DEFAULT 'pending',   -- 'pending', 'approved', 'paid', 'cancelled'

    -- Aprobaciones
    requested_by UUID NOT NULL REFERENCES users(user_id),
    requested_at TIMESTAMP DEFAULT NOW(),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    paid_by UUID REFERENCES users(user_id),
    paid_at TIMESTAMP,

    -- Contabilización
    journal_entry_id INTEGER REFERENCES finance_journal_entries(id),

    -- Notas
    notes TEXT,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, replenishment_number)
);

-- ============================================
-- 11. CONFIGURACIÓN DE INTEGRACIÓN PLUG-AND-PLAY
-- ============================================
CREATE TABLE IF NOT EXISTS finance_cash_integration_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Módulo que integra
    source_module VARCHAR(50) NOT NULL,     -- 'billing', 'warehouse', 'collections', 'payments'

    -- Caja por defecto para este módulo
    default_register_id INTEGER REFERENCES finance_cash_registers(id),

    -- Comportamiento
    auto_create_movement BOOLEAN DEFAULT true,
    requires_register_selection BOOLEAN DEFAULT false,

    -- Mapeo de tipos de documento a tipos de movimiento
    document_type_mapping JSONB DEFAULT '{}',
    -- {"invoice": "sale", "credit_note": "adjustment_neg", "receipt": "collection"}

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, source_module)
);

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función: Verificar si caja puede cerrar
CREATE OR REPLACE FUNCTION can_close_cash_register(p_session_id INTEGER)
RETURNS TABLE (
    can_close BOOLEAN,
    blocking_reason TEXT,
    pending_transfers INTEGER[]
) AS $$
DECLARE
    v_pending_count INTEGER;
    v_pending_ids INTEGER[];
BEGIN
    -- Buscar transferencias pendientes donde esta sesión es origen o destino
    SELECT
        COUNT(*),
        ARRAY_AGG(id)
    INTO v_pending_count, v_pending_ids
    FROM finance_cash_transfers
    WHERE status = 'pending'
    AND (source_session_id = p_session_id OR destination_session_id = p_session_id);

    IF v_pending_count > 0 THEN
        RETURN QUERY SELECT
            false,
            format('Hay %s transferencia(s) pendiente(s) de confirmación', v_pending_count),
            v_pending_ids;
    ELSE
        RETURN QUERY SELECT true, NULL::TEXT, NULL::INTEGER[];
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función: Procesar confirmación/rechazo de transferencia
CREATE OR REPLACE FUNCTION process_transfer_response(
    p_transfer_id INTEGER,
    p_response VARCHAR(20),
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_transfer RECORD;
    v_reversal_movement_id INTEGER;
BEGIN
    -- Obtener transferencia
    SELECT * INTO v_transfer
    FROM finance_cash_transfers
    WHERE id = p_transfer_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transferencia no encontrada o ya procesada');
    END IF;

    IF p_response = 'confirmed' THEN
        -- Confirmar transferencia
        UPDATE finance_cash_transfers
        SET status = 'confirmed',
            responded_by = p_user_id,
            responded_at = NOW(),
            response_notes = p_notes,
            blocks_source_close = false,
            blocks_destination_close = false,
            updated_at = NOW()
        WHERE id = p_transfer_id;

        -- Actualizar movimiento de destino a activo
        UPDATE finance_cash_movements
        SET status = 'active'
        WHERE id = v_transfer.destination_movement_id;

    ELSIF p_response = 'rejected' THEN
        -- Rechazar y reversar
        UPDATE finance_cash_transfers
        SET status = 'rejected',
            responded_by = p_user_id,
            responded_at = NOW(),
            response_notes = p_notes,
            reversed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_transfer_id;

        -- Anular movimiento de salida en origen
        UPDATE finance_cash_movements
        SET status = 'voided',
            voided_at = NOW(),
            voided_by = p_user_id,
            void_reason = 'Transferencia rechazada por destino: ' || COALESCE(p_notes, '')
        WHERE id = v_transfer.source_movement_id;

        -- Anular movimiento de entrada en destino
        UPDATE finance_cash_movements
        SET status = 'voided',
            voided_at = NOW(),
            voided_by = p_user_id,
            void_reason = 'Transferencia rechazada'
        WHERE id = v_transfer.destination_movement_id;

        -- Desbloquear cierres
        UPDATE finance_cash_transfers
        SET blocks_source_close = false,
            blocks_destination_close = false
        WHERE id = p_transfer_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', p_transfer_id,
        'new_status', p_response
    );
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener saldo actual de caja por medio de pago
CREATE OR REPLACE FUNCTION get_register_balance(p_session_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_object_agg(
        COALESCE(pm.code, 'UNKNOWN'),
        COALESCE(balance, 0)
    )
    INTO v_result
    FROM (
        SELECT
            payment_method_id,
            SUM(CASE WHEN direction = 'in' THEN net_amount ELSE -net_amount END) as balance
        FROM finance_cash_movements
        WHERE session_id = p_session_id
        AND status = 'active'
        GROUP BY payment_method_id
    ) balances
    LEFT JOIN finance_payment_methods pm ON pm.id = balances.payment_method_id;

    RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener transferencias pendientes para una caja
CREATE OR REPLACE FUNCTION get_pending_transfers(p_register_id INTEGER)
RETURNS TABLE (
    transfer_id INTEGER,
    direction VARCHAR(10),
    amount DECIMAL(15,2),
    payment_method VARCHAR(100),
    other_register VARCHAR(100),
    initiated_by_name VARCHAR(200),
    initiated_at TIMESTAMP,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        CASE WHEN t.source_register_id = p_register_id THEN 'out'::VARCHAR ELSE 'in'::VARCHAR END,
        t.amount,
        pm.name,
        CASE WHEN t.source_register_id = p_register_id THEN dest.name ELSE src.name END,
        u.full_name,
        t.initiated_at,
        t.description
    FROM finance_cash_transfers t
    JOIN finance_cash_registers src ON src.id = t.source_register_id
    JOIN finance_cash_registers dest ON dest.id = t.destination_register_id
    JOIN finance_payment_methods pm ON pm.id = t.payment_method_id
    JOIN users u ON u.user_id = t.initiated_by
    WHERE t.status = 'pending'
    AND (t.source_register_id = p_register_id OR t.destination_register_id = p_register_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Actualizar saldo de fondo fijo
CREATE OR REPLACE FUNCTION update_petty_cash_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE finance_petty_cash_funds
        SET current_balance = current_balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.fund_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'rejected' THEN
        -- Devolver monto si se rechaza
        UPDATE finance_petty_cash_funds
        SET current_balance = current_balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.fund_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_petty_cash_balance
AFTER INSERT OR UPDATE ON finance_petty_cash_expenses
FOR EACH ROW EXECUTE FUNCTION update_petty_cash_balance();

-- Trigger: Actualizar flag de transferencias pendientes en sesión
CREATE OR REPLACE FUNCTION update_session_pending_transfers()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar sesión origen
    IF NEW.source_session_id IS NOT NULL THEN
        UPDATE finance_cash_register_sessions
        SET has_pending_transfers = EXISTS(
            SELECT 1 FROM finance_cash_transfers
            WHERE status = 'pending'
            AND (source_session_id = NEW.source_session_id OR destination_session_id = NEW.source_session_id)
        ),
        pending_transfer_ids = (
            SELECT ARRAY_AGG(id) FROM finance_cash_transfers
            WHERE status = 'pending'
            AND (source_session_id = NEW.source_session_id OR destination_session_id = NEW.source_session_id)
        ),
        updated_at = NOW()
        WHERE id = NEW.source_session_id;
    END IF;

    -- Actualizar sesión destino
    IF NEW.destination_session_id IS NOT NULL THEN
        UPDATE finance_cash_register_sessions
        SET has_pending_transfers = EXISTS(
            SELECT 1 FROM finance_cash_transfers
            WHERE status = 'pending'
            AND (source_session_id = NEW.destination_session_id OR destination_session_id = NEW.destination_session_id)
        ),
        pending_transfer_ids = (
            SELECT ARRAY_AGG(id) FROM finance_cash_transfers
            WHERE status = 'pending'
            AND (source_session_id = NEW.destination_session_id OR destination_session_id = NEW.destination_session_id)
        ),
        updated_at = NOW()
        WHERE id = NEW.destination_session_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_session_pending_transfers
AFTER INSERT OR UPDATE ON finance_cash_transfers
FOR EACH ROW EXECUTE FUNCTION update_session_pending_transfers();

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE finance_cash_registers IS 'Cajas del sistema - individuales, principal, fondos fijos, bóveda';
COMMENT ON TABLE finance_cash_register_sessions IS 'Sesiones de caja (apertura/cierre diario)';
COMMENT ON TABLE finance_cash_transfers IS 'Transferencias entre cajas con workflow de confirmación';
COMMENT ON TABLE finance_cash_movements IS 'Movimientos de caja - integra con todos los módulos';
COMMENT ON TABLE finance_petty_cash_funds IS 'Fondos fijos por departamento';
COMMENT ON TABLE finance_payment_methods IS 'Medios de pago configurables';

COMMENT ON FUNCTION can_close_cash_register IS 'Verifica si una caja puede cerrar (no hay transferencias pendientes)';
COMMENT ON FUNCTION process_transfer_response IS 'Procesa confirmación o rechazo de transferencia entre cajas';
COMMENT ON FUNCTION get_register_balance IS 'Obtiene saldo actual de caja por medio de pago';
