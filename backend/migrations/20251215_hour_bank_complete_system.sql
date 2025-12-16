-- ============================================================================
-- MIGRACION: Sistema Completo de Banco de Horas
-- ============================================================================
-- Sistema multi-pais con parametrizacion por sucursal via plantillas SSOT
-- Soporta: Argentina, Brasil, Uruguay, Chile, Mexico, Espana, etc.
-- ============================================================================

-- ============================================================================
-- TABLA 1: PLANTILLAS DE BANCO DE HORAS (SSOT)
-- Similar a payroll_templates - parametrizacion por sucursal
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_templates (
    id SERIAL PRIMARY KEY,

    -- === IDENTIFICACION Y SCOPE ===
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    branch_id INTEGER REFERENCES company_branches(id),  -- NULL = aplica a todas las sucursales
    country_code VARCHAR(3),                             -- ISO 3166-1 alpha-3 (ARG, BRA, URY, etc.)

    template_code VARCHAR(50) NOT NULL,                  -- Codigo unico ej: "ARG-COMERCIO-2024"
    template_name VARCHAR(200) NOT NULL,                 -- Nombre descriptivo
    description TEXT,                                     -- Descripcion detallada para el usuario

    -- === HABILITACION GENERAL ===
    is_enabled BOOLEAN DEFAULT true,
    -- HELP: Activa o desactiva el banco de horas para esta sucursal/pais

    -- === CONVERSION DE HORAS EXTRAS A BANCO ===
    conversion_rate_normal DECIMAL(4,2) DEFAULT 1.00,
    -- HELP: Multiplicador para HE en dias normales. 1.0 = 1 hora extra = 1 hora banco.
    -- En Argentina tipicamente 1.5 (50% adicional). Brasil usa 1.0.

    conversion_rate_weekend DECIMAL(4,2) DEFAULT 1.50,
    -- HELP: Multiplicador para HE en sabados/domingos. Tipicamente 1.5 a 2.0.
    -- Argentina: 2.0 (100% adicional). Brasil: 1.5-2.0 segun convenio.

    conversion_rate_holiday DECIMAL(4,2) DEFAULT 2.00,
    -- HELP: Multiplicador para HE en feriados nacionales/provinciales.
    -- Argentina: 2.0. Brasil: 2.0. Mexico: 3.0 para feriados obligatorios.

    conversion_rate_night DECIMAL(4,2) DEFAULT 1.20,
    -- HELP: Multiplicador adicional para HE en horario nocturno.
    -- Argentina: 1.08-1.20. Brasil: 1.20. Se acumula con otros multiplicadores.

    -- === ACUMULACION Y LIMITES ===
    max_accumulation_hours DECIMAL(6,2) DEFAULT 120.00,
    -- HELP: Maximo de horas que un empleado puede acumular en el banco.
    -- Brasil: Sin limite legal pero recomendado 120h. Argentina: A definir por convenio.

    max_monthly_accrual DECIMAL(5,2) DEFAULT 30.00,
    -- HELP: Maximo de horas extras convertibles a banco por mes.
    -- Argentina LCT: max 30h extras/mes. Brasil CLT: Similar.

    min_balance_for_use DECIMAL(4,2) DEFAULT 0.50,
    -- HELP: Saldo minimo requerido para solicitar uso. Evita microsolicitudes.
    -- Recomendado: 0.5h (30 min) minimo.

    -- === VENCIMIENTO ===
    expiration_enabled BOOLEAN DEFAULT true,
    -- HELP: Si las horas acumuladas vencen despues de cierto tiempo.
    -- Brasil: Obligatorio (6-12 meses). Argentina: A definir por convenio.

    expiration_months INTEGER DEFAULT 12,
    -- HELP: Meses hasta que vencen las horas. 0 = no vencen.
    -- Brasil acuerdo individual: 6 meses. Brasil acuerdo escrito: 12 meses.

    expiration_warning_days INTEGER DEFAULT 30,
    -- HELP: Dias antes del vencimiento para notificar al empleado.
    -- Recomendado: 30 dias para permitir planificacion.

    expired_hours_action VARCHAR(20) DEFAULT 'payout',
    -- HELP: Que hacer cuando vencen horas. Opciones:
    -- 'payout' = Pagar automaticamente con recargo legal
    -- 'forfeit' = Se pierden (solo donde legalmente permitido)
    -- 'extend' = Extender automaticamente (requiere aprobacion)
    -- 'notify' = Solo notificar, decision manual

    -- === DECISION DEL EMPLEADO ===
    employee_choice_enabled BOOLEAN DEFAULT true,
    -- HELP: Si el empleado puede elegir entre cobrar o acumular cada HE.
    -- Recomendado: true para mayor flexibilidad y satisfaccion.

    choice_timeout_hours INTEGER DEFAULT 24,
    -- HELP: Horas que tiene el empleado para decidir antes de aplicar default.
    -- Recomendado: 24h. 0 = sin timeout (espera indefinidamente).

    default_action VARCHAR(10) DEFAULT 'bank',
    -- HELP: Accion por defecto si el empleado no elige a tiempo.
    -- 'bank' = Acumula en banco (preferido por empresas)
    -- 'pay' = Paga en liquidacion (preferido por empleados)

    choice_reminder_hours INTEGER DEFAULT 8,
    -- HELP: Horas antes del timeout para enviar recordatorio.
    -- 0 = sin recordatorio.

    -- === USO Y CONSUMO ===
    min_usage_hours DECIMAL(4,2) DEFAULT 0.50,
    -- HELP: Minimo de horas que se pueden solicitar usar por vez.
    -- Recomendado: 0.5h para evitar fragmentacion excesiva.

    max_usage_hours_per_day DECIMAL(4,2) DEFAULT 8.00,
    -- HELP: Maximo de horas banco usables en un solo dia.
    -- Tipicamente = jornada completa (8h).

    allow_partial_day_usage BOOLEAN DEFAULT true,
    -- HELP: Permite usar fracciones de dia (salir temprano, llegar tarde).
    -- Recomendado: true para flexibilidad.

    allow_full_day_usage BOOLEAN DEFAULT true,
    -- HELP: Permite usar dia completo como licencia.
    -- Similar a dia de vacaciones pero del banco.

    allow_early_departure BOOLEAN DEFAULT true,
    -- HELP: Permite marcar salida anticipada descontando del banco.
    -- Integracion directa con fichaje biometrico.

    allow_late_arrival_compensation BOOLEAN DEFAULT true,
    -- HELP: Permite compensar tardanzas con saldo del banco.
    -- Evita marca de tardanza si hay saldo suficiente.

    -- === APROBACIONES ===
    requires_supervisor_approval BOOLEAN DEFAULT false,
    -- HELP: Si el supervisor debe aprobar cada acumulacion.
    -- false = acumulacion automatica, true = requiere OK supervisor.

    requires_hr_approval BOOLEAN DEFAULT false,
    -- HELP: Si RRHH debe aprobar ademas del supervisor.
    -- Para empresas con control centralizado.

    usage_requires_approval BOOLEAN DEFAULT true,
    -- HELP: Si el uso de horas requiere aprobacion previa.
    -- Recomendado: true para planificacion operativa.

    auto_approve_under_hours DECIMAL(4,2) DEFAULT 2.00,
    -- HELP: Auto-aprobar solicitudes menores a X horas.
    -- 0 = siempre requiere aprobacion manual.

    advance_notice_days INTEGER DEFAULT 2,
    -- HELP: Dias de anticipacion requeridos para solicitar uso.
    -- 0 = puede solicitar mismo dia. Recomendado: 2-3 dias.

    -- === NOTIFICACIONES ===
    notify_employee_on_accrual BOOLEAN DEFAULT true,
    -- HELP: Notificar al empleado cuando se acreditan horas.

    notify_supervisor_on_accrual BOOLEAN DEFAULT true,
    -- HELP: Notificar al supervisor cuando su equipo acumula horas.

    notify_hr_on_accrual BOOLEAN DEFAULT true,
    -- HELP: Notificar a RRHH de todas las acumulaciones.

    notify_on_low_balance BOOLEAN DEFAULT true,
    -- HELP: Alertar cuando el saldo baja de cierto umbral.

    low_balance_threshold DECIMAL(4,2) DEFAULT 4.00,
    -- HELP: Umbral en horas para alerta de saldo bajo.

    notify_on_high_balance BOOLEAN DEFAULT true,
    -- HELP: Alertar cuando el saldo supera cierto umbral (riesgo laboral).

    high_balance_threshold DECIMAL(5,2) DEFAULT 80.00,
    -- HELP: Umbral para alerta de acumulacion excesiva.

    -- === RESTRICCIONES TEMPORALES ===
    blackout_dates_enabled BOOLEAN DEFAULT false,
    -- HELP: Habilitar fechas bloqueadas donde no se puede usar banco.
    -- Ej: cierres contables, inventarios, eventos especiales.

    max_concurrent_users_percent DECIMAL(4,2) DEFAULT 20.00,
    -- HELP: Maximo % de empleados que pueden usar banco el mismo dia.
    -- Evita que todos pidan el mismo dia. 0 = sin limite.

    -- === INTEGRACION LEGAL ===
    requires_written_agreement BOOLEAN DEFAULT false,
    -- HELP: Si requiere acuerdo escrito con cada empleado.
    -- Brasil: Obligatorio para compensacion > 6 meses.

    union_agreement_required BOOLEAN DEFAULT false,
    -- HELP: Si requiere convenio colectivo con sindicato.
    -- Brasil: Para compensacion > 12 meses.

    legal_reference VARCHAR(100),
    -- HELP: Referencia legal aplicable.
    -- Ej: "LCT Art. 201", "CLT Art. 59", "ET Art. 34"

    -- === AUDITORIA ===
    version INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT true,
    parent_template_id INTEGER REFERENCES hour_bank_templates(id),
    created_by UUID REFERENCES users(user_id),

    -- === TIMESTAMPS ===
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para busqueda eficiente
CREATE INDEX IF NOT EXISTS idx_hbt_company ON hour_bank_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_hbt_branch ON hour_bank_templates(branch_id);
CREATE INDEX IF NOT EXISTS idx_hbt_country ON hour_bank_templates(country_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hbt_unique_code ON hour_bank_templates(company_id, template_code) WHERE is_current_version = true;

-- ============================================================================
-- TABLA 2: SALDOS DE EMPLEADOS
-- Cache de saldo actual para consultas rapidas
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    branch_id INTEGER REFERENCES company_branches(id),
    template_id INTEGER REFERENCES hour_bank_templates(id),

    -- Saldos
    current_balance DECIMAL(6,2) DEFAULT 0.00,
    total_accrued DECIMAL(8,2) DEFAULT 0.00,      -- Total historico acreditado
    total_used DECIMAL(8,2) DEFAULT 0.00,         -- Total historico usado
    total_expired DECIMAL(8,2) DEFAULT 0.00,      -- Total historico vencido
    total_paid_out DECIMAL(8,2) DEFAULT 0.00,     -- Total convertido a pago

    -- Proximos vencimientos
    next_expiry_date DATE,
    next_expiry_hours DECIMAL(5,2),

    -- Control
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_hbb_user ON hour_bank_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_hbb_company ON hour_bank_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_hbb_expiry ON hour_bank_balances(next_expiry_date) WHERE next_expiry_date IS NOT NULL;

-- ============================================================================
-- TABLA 3: TRANSACCIONES (MOVIMIENTOS)
-- Registro completo de todas las operaciones - auditable
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    branch_id INTEGER REFERENCES company_branches(id),
    template_id INTEGER REFERENCES hour_bank_templates(id),

    -- Tipo de transaccion
    transaction_type VARCHAR(20) NOT NULL,
    -- 'accrual' = Acreditacion por hora extra
    -- 'usage' = Uso de horas (salida anticipada, dia libre, etc.)
    -- 'expiry' = Vencimiento de horas
    -- 'payout' = Conversion a pago
    -- 'adjustment' = Ajuste manual (con justificacion)
    -- 'transfer' = Transferencia entre sucursales (si aplica)

    -- Cantidades
    hours_raw DECIMAL(5,2) NOT NULL,              -- Horas antes de conversion
    conversion_rate DECIMAL(4,2) DEFAULT 1.00,    -- Rate aplicado
    hours_final DECIMAL(5,2) NOT NULL,            -- Horas despues de conversion (+/-)
    balance_before DECIMAL(6,2),                  -- Saldo antes
    balance_after DECIMAL(6,2),                   -- Saldo despues

    -- Origen
    source_type VARCHAR(30),
    -- 'overtime_weekday' = HE dia normal
    -- 'overtime_weekend' = HE fin de semana
    -- 'overtime_holiday' = HE feriado
    -- 'overtime_night' = HE nocturna
    -- 'early_departure' = Salida anticipada
    -- 'late_compensation' = Compensacion tardanza
    -- 'full_day_off' = Dia completo
    -- 'manual_entry' = Ingreso manual HR
    -- 'expiration' = Vencimiento automatico
    -- 'system_payout' = Pago por vencimiento

    source_attendance_id UUID,                    -- Ref a fichada origen
    source_request_id UUID,                       -- Ref a solicitud uso

    -- Vencimiento
    expires_at DATE,                              -- Cuando vencen estas horas
    is_expired BOOLEAN DEFAULT false,

    -- Descripcion
    description TEXT,
    notes TEXT,                                   -- Notas adicionales

    -- Aprobacion
    status VARCHAR(20) DEFAULT 'completed',
    -- 'pending' = Esperando decision empleado
    -- 'pending_approval' = Esperando aprobacion
    -- 'approved' = Aprobado
    -- 'rejected' = Rechazado
    -- 'completed' = Completado
    -- 'cancelled' = Cancelado

    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Auditoria
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hbtx_user ON hour_bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_hbtx_company ON hour_bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_hbtx_type ON hour_bank_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_hbtx_status ON hour_bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_hbtx_created ON hour_bank_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hbtx_expires ON hour_bank_transactions(expires_at) WHERE is_expired = false;

-- ============================================================================
-- TABLA 4: SOLICITUDES DE USO
-- Workflow de aprobacion para uso de horas
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    branch_id INTEGER REFERENCES company_branches(id),
    template_id INTEGER REFERENCES hour_bank_templates(id),

    -- Tipo de solicitud
    request_type VARCHAR(30) NOT NULL,
    -- 'early_departure' = Salida anticipada
    -- 'late_arrival' = Llegada tarde compensada
    -- 'partial_day' = Horas sueltas
    -- 'full_day' = Dia completo
    -- 'multiple_days' = Varios dias

    -- Detalles
    requested_date DATE NOT NULL,
    end_date DATE,                               -- Para multiple_days
    hours_requested DECIMAL(5,2) NOT NULL,

    -- Para partial_day
    start_time TIME,                             -- Hora desde
    end_time TIME,                               -- Hora hasta

    -- Justificacion
    reason TEXT,

    -- Workflow
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' = Esperando aprobacion
    -- 'approved' = Aprobado
    -- 'rejected' = Rechazado
    -- 'used' = Ya utilizado
    -- 'cancelled' = Cancelado por empleado
    -- 'expired' = Vencio sin usar

    -- Aprobadores
    supervisor_id UUID REFERENCES users(user_id),
    supervisor_status VARCHAR(20),
    supervisor_at TIMESTAMP WITH TIME ZONE,
    supervisor_notes TEXT,

    hr_id UUID REFERENCES users(user_id),
    hr_status VARCHAR(20),
    hr_at TIMESTAMP WITH TIME ZONE,
    hr_notes TEXT,

    -- Resultado
    approved_hours DECIMAL(5,2),                 -- Horas finalmente aprobadas
    transaction_id UUID REFERENCES hour_bank_transactions(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hbr_user ON hour_bank_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_hbr_company ON hour_bank_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_hbr_status ON hour_bank_requests(status);
CREATE INDEX IF NOT EXISTS idx_hbr_date ON hour_bank_requests(requested_date);

-- ============================================================================
-- TABLA 5: DECISIONES PENDIENTES
-- Para cuando el empleado debe elegir cobrar vs banco
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_pending_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    attendance_id UUID,                           -- Fichada que genero la HE

    -- Detalles de la hora extra
    overtime_date DATE NOT NULL,
    overtime_hours DECIMAL(5,2) NOT NULL,
    overtime_type VARCHAR(20),                    -- weekday, weekend, holiday, night

    -- Valores calculados
    if_paid_amount DECIMAL(10,2),                -- Cuanto cobraria
    if_banked_hours DECIMAL(5,2),                -- Cuantas horas irian al banco
    conversion_rate DECIMAL(4,2),

    -- Estado
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' = Esperando decision
    -- 'decided_pay' = Eligio cobrar
    -- 'decided_bank' = Eligio banco
    -- 'timeout_pay' = Timeout, aplicado cobro
    -- 'timeout_bank' = Timeout, aplicado banco

    decision VARCHAR(10),                         -- 'pay' | 'bank'
    decided_at TIMESTAMP WITH TIME ZONE,

    -- Timeout
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,

    -- Resultado
    transaction_id UUID REFERENCES hour_bank_transactions(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hbpd_user ON hour_bank_pending_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_hbpd_status ON hour_bank_pending_decisions(status);
CREATE INDEX IF NOT EXISTS idx_hbpd_expires ON hour_bank_pending_decisions(expires_at) WHERE status = 'pending';

-- ============================================================================
-- TABLA 6: FECHAS BLOQUEADAS (BLACKOUT)
-- Periodos donde no se puede usar banco de horas
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_blackout_dates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    branch_id INTEGER REFERENCES company_branches(id),  -- NULL = todas
    template_id INTEGER REFERENCES hour_bank_templates(id),

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(200),                          -- Ej: "Cierre contable", "Inventario"

    -- Excepciones
    allow_emergencies BOOLEAN DEFAULT false,      -- Permitir con aprobacion especial

    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hbbd_company ON hour_bank_blackout_dates(company_id);
CREATE INDEX IF NOT EXISTS idx_hbbd_dates ON hour_bank_blackout_dates(start_date, end_date);

-- ============================================================================
-- TABLA 7: ACUERDOS ESCRITOS
-- Registro de acuerdos individuales (requerido en algunos paises)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    template_id INTEGER REFERENCES hour_bank_templates(id),

    -- Tipo
    agreement_type VARCHAR(30) NOT NULL,
    -- 'individual_verbal' = Acuerdo verbal (Brasil 6 meses)
    -- 'individual_written' = Acuerdo escrito (Brasil 12 meses)
    -- 'collective' = Convenio colectivo

    -- Vigencia
    start_date DATE NOT NULL,
    end_date DATE,                                -- NULL = indefinido

    -- Documento
    document_url TEXT,                            -- URL al documento firmado
    signed_at TIMESTAMP WITH TIME ZONE,

    -- Estado
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hba_user ON hour_bank_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_hba_active ON hour_bank_agreements(is_active) WHERE is_active = true;

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Funcion para obtener template aplicable a un usuario
CREATE OR REPLACE FUNCTION get_applicable_hour_bank_template(
    p_user_id UUID,
    p_company_id INTEGER,
    p_branch_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    template_id INTEGER,
    template_code VARCHAR(50),
    template_name VARCHAR(200),
    is_enabled BOOLEAN
) AS $$
BEGIN
    -- Busca template mas especifico primero (branch > company)
    RETURN QUERY
    SELECT
        t.id,
        t.template_code,
        t.template_name,
        t.is_enabled
    FROM hour_bank_templates t
    WHERE t.company_id = p_company_id
      AND t.is_current_version = true
      AND (t.branch_id = p_branch_id OR (t.branch_id IS NULL AND p_branch_id IS NOT NULL))
    ORDER BY
        CASE WHEN t.branch_id = p_branch_id THEN 0 ELSE 1 END,
        t.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Funcion para calcular saldo con vencimientos
CREATE OR REPLACE FUNCTION calculate_hour_bank_balance(p_user_id UUID)
RETURNS TABLE (
    available_balance DECIMAL(6,2),
    expiring_soon DECIMAL(5,2),
    expiring_date DATE
) AS $$
BEGIN
    RETURN QUERY
    WITH active_hours AS (
        SELECT
            SUM(CASE WHEN transaction_type IN ('accrual', 'adjustment') AND hours_final > 0 THEN hours_final ELSE 0 END) -
            SUM(CASE WHEN transaction_type IN ('usage', 'expiry', 'payout') OR hours_final < 0 THEN ABS(hours_final) ELSE 0 END) as balance,
            MIN(CASE WHEN expires_at > CURRENT_DATE AND NOT is_expired THEN expires_at END) as next_expiry
        FROM hour_bank_transactions
        WHERE user_id = p_user_id
          AND status = 'completed'
    ),
    expiring AS (
        SELECT COALESCE(SUM(hours_final), 0) as hours
        FROM hour_bank_transactions
        WHERE user_id = p_user_id
          AND status = 'completed'
          AND transaction_type = 'accrual'
          AND expires_at <= CURRENT_DATE + INTERVAL '30 days'
          AND NOT is_expired
    )
    SELECT
        COALESCE(a.balance, 0)::DECIMAL(6,2),
        COALESCE(e.hours, 0)::DECIMAL(5,2),
        a.next_expiry
    FROM active_hours a, expiring e;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PLANTILLAS PREDEFINIDAS POR PAIS
-- ============================================================================

-- Crear funcion para insertar templates predefinidos
CREATE OR REPLACE FUNCTION create_default_hour_bank_templates(p_company_id INTEGER)
RETURNS void AS $$
BEGIN
    -- ARGENTINA - Basado en LCT y reforma laboral 2024
    INSERT INTO hour_bank_templates (
        company_id, country_code, template_code, template_name, description,
        conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
        max_accumulation_hours, max_monthly_accrual, expiration_months,
        employee_choice_enabled, default_action, choice_timeout_hours,
        requires_written_agreement, legal_reference
    ) VALUES (
        p_company_id, 'ARG', 'ARG-DEFAULT', 'Argentina - Ley de Contrato de Trabajo',
        'Configuracion basada en LCT Arts. 201-207. Horas extras con recargo 50% dias normales, 100% feriados.',
        1.50, 2.00, 2.00, 1.08,
        200, 30, 12,
        true, 'bank', 24,
        true, 'LCT Arts. 201-207, Reforma 2024'
    ) ON CONFLICT (company_id, template_code) WHERE is_current_version = true DO NOTHING;

    -- BRASIL - Basado en CLT y reforma 2017
    INSERT INTO hour_bank_templates (
        company_id, country_code, template_code, template_name, description,
        conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
        max_accumulation_hours, max_monthly_accrual, expiration_months,
        employee_choice_enabled, default_action, choice_timeout_hours,
        requires_written_agreement, union_agreement_required, legal_reference
    ) VALUES (
        p_company_id, 'BRA', 'BRA-CLT-INDIVIDUAL', 'Brasil - Acordo Individual Escrito (12 meses)',
        'Banco de horas por acordo individual escrito. Compensacao em ate 12 meses. CLT Art. 59 reformado.',
        1.00, 1.50, 2.00, 1.20,
        120, 44, 12,
        false, 'bank', 0,
        true, false, 'CLT Art. 59, Lei 13.467/2017'
    ) ON CONFLICT (company_id, template_code) WHERE is_current_version = true DO NOTHING;

    INSERT INTO hour_bank_templates (
        company_id, country_code, template_code, template_name, description,
        conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
        max_accumulation_hours, max_monthly_accrual, expiration_months,
        employee_choice_enabled, default_action, choice_timeout_hours,
        requires_written_agreement, union_agreement_required, legal_reference
    ) VALUES (
        p_company_id, 'BRA', 'BRA-CLT-VERBAL', 'Brasil - Acordo Verbal (6 meses)',
        'Banco de horas por acordo verbal. Compensacao em ate 6 meses.',
        1.00, 1.50, 2.00, 1.20,
        60, 44, 6,
        false, 'bank', 0,
        false, false, 'CLT Art. 59 par. 5'
    ) ON CONFLICT (company_id, template_code) WHERE is_current_version = true DO NOTHING;

    -- URUGUAY
    INSERT INTO hour_bank_templates (
        company_id, country_code, template_code, template_name, description,
        conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
        max_accumulation_hours, max_monthly_accrual, expiration_months,
        employee_choice_enabled, default_action, legal_reference
    ) VALUES (
        p_company_id, 'URY', 'URY-DEFAULT', 'Uruguay - Ley 18.441',
        'Jornada laboral 8h/dia, 44-48h/semana. HE con 100% recargo.',
        2.00, 2.00, 2.50, 1.20,
        96, 24, 12,
        true, 'bank', 'Ley 18.441, Decreto 550/989'
    ) ON CONFLICT (company_id, template_code) WHERE is_current_version = true DO NOTHING;

    -- CHILE
    INSERT INTO hour_bank_templates (
        company_id, country_code, template_code, template_name, description,
        conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
        max_accumulation_hours, max_monthly_accrual, expiration_months,
        employee_choice_enabled, default_action, legal_reference
    ) VALUES (
        p_company_id, 'CHL', 'CHL-DEFAULT', 'Chile - Codigo del Trabajo',
        'HE max 2h/dia con 50% recargo. Descanso compensatorio obligatorio para dominicales.',
        1.50, 1.50, 2.00, 1.30,
        90, 20, 6,
        true, 'bank', 'CT Arts. 30-32'
    ) ON CONFLICT (company_id, template_code) WHERE is_current_version = true DO NOTHING;

    -- MEXICO
    INSERT INTO hour_bank_templates (
        company_id, country_code, template_code, template_name, description,
        conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
        max_accumulation_hours, max_monthly_accrual, expiration_months,
        employee_choice_enabled, default_action, legal_reference
    ) VALUES (
        p_company_id, 'MEX', 'MEX-LFT', 'Mexico - Ley Federal del Trabajo',
        'HE: 100% primeras 9h/semana, 200% adicionales. Triple en dias de descanso obligatorio.',
        2.00, 2.00, 3.00, 1.35,
        100, 27, 12,
        true, 'bank', 'LFT Arts. 66-68'
    ) ON CONFLICT (company_id, template_code) WHERE is_current_version = true DO NOTHING;

    -- ESPANA
    INSERT INTO hour_bank_templates (
        company_id, country_code, template_code, template_name, description,
        conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
        max_accumulation_hours, max_monthly_accrual, expiration_months,
        employee_choice_enabled, default_action, legal_reference
    ) VALUES (
        p_company_id, 'ESP', 'ESP-ET', 'Espana - Estatuto de los Trabajadores',
        'Max 80 HE/ano. Compensacion por tiempo libre dentro de 4 meses o segun convenio.',
        1.00, 1.00, 1.75, 1.25,
        80, 10, 4,
        true, 'bank', 'ET Art. 35'
    ) ON CONFLICT (company_id, template_code) WHERE is_current_version = true DO NOTHING;

    -- ALEMANIA
    INSERT INTO hour_bank_templates (
        company_id, country_code, template_code, template_name, description,
        conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
        max_accumulation_hours, max_monthly_accrual, expiration_months,
        employee_choice_enabled, default_action, legal_reference
    ) VALUES (
        p_company_id, 'DEU', 'DEU-ARBZG', 'Alemania - Arbeitszeitgesetz',
        'Cuenta de tiempo flexible. Max +150h/-30h anuales. Compensacion dominical en 8 semanas.',
        1.00, 1.25, 1.50, 1.25,
        150, 20, 12,
        false, 'bank', 'ArbZG, AEntG'
    ) ON CONFLICT (company_id, template_code) WHERE is_current_version = true DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACION
-- ============================================================================
COMMENT ON TABLE hour_bank_templates IS 'Plantillas SSOT para parametrizacion de Banco de Horas por sucursal/pais';
COMMENT ON TABLE hour_bank_balances IS 'Saldo actual de horas acumuladas por empleado';
COMMENT ON TABLE hour_bank_transactions IS 'Historial completo de movimientos del banco de horas';
COMMENT ON TABLE hour_bank_requests IS 'Solicitudes de uso de horas con workflow de aprobacion';
COMMENT ON TABLE hour_bank_pending_decisions IS 'Decisiones pendientes del empleado: cobrar vs acumular';
COMMENT ON TABLE hour_bank_blackout_dates IS 'Fechas bloqueadas donde no se permite usar banco';
COMMENT ON TABLE hour_bank_agreements IS 'Registro de acuerdos escritos requeridos legalmente';

COMMENT ON COLUMN hour_bank_templates.conversion_rate_normal IS 'Multiplicador para HE dias normales. 1.0=1:1, 1.5=50% adicional';
COMMENT ON COLUMN hour_bank_templates.expiration_months IS 'Meses hasta vencimiento. 0=no vence. Brasil:6-12, Espana:4';
COMMENT ON COLUMN hour_bank_templates.employee_choice_enabled IS 'Si empleado elige en tiempo real entre cobrar o acumular';
COMMENT ON COLUMN hour_bank_templates.auto_approve_under_hours IS 'Auto-aprobar solicitudes menores a X horas. 0=siempre manual';
