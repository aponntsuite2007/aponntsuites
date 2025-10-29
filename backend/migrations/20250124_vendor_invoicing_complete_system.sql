-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN COMPLETA: Sistema de Vendedores, Facturación y Gestión de Ciclo
-- Fecha: 2025-01-24
-- Descripción: Tablas completas para presupuestos, contratos, facturas, pagos,
--              comisiones, períodos de prueba, gestión de bajas y exportación
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- 1. TABLA: quotes (Presupuestos/Cotizaciones)
-- ============================================================================
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

    -- Módulos incluidos
    modules_data JSONB NOT NULL, -- Array de módulos con precios
    total_amount DECIMAL(10,2) NOT NULL,

    -- Información de prueba (para módulos nuevos)
    trial_modules JSONB, -- Módulos en período de prueba
    has_trial BOOLEAN DEFAULT false,
    trial_start_date TIMESTAMP,
    trial_end_date TIMESTAMP,
    trial_bonification_percentage DECIMAL(5,2) DEFAULT 100.00,

    -- Referencias a presupuestos anteriores/siguientes
    previous_quote_id INTEGER REFERENCES quotes(id),
    replaces_quote_id INTEGER REFERENCES quotes(id),
    replaced_by_quote_id INTEGER REFERENCES quotes(id),

    -- Tipo de cambio
    is_upgrade BOOLEAN DEFAULT false, -- Agrega módulos
    is_downgrade BOOLEAN DEFAULT false, -- Quita módulos
    is_modification BOOLEAN DEFAULT false, -- Agrega Y quita
    added_modules JSONB, -- Módulos agregados
    removed_modules JSONB, -- Módulos removidos

    -- Fechas y validez
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    accepted_date TIMESTAMP,
    rejected_date TIMESTAMP,

    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- Estados: draft, sent, in_trial, accepted, active, rejected, expired, superseded

    -- Observaciones
    notes TEXT,
    rejection_reason TEXT,

    -- Términos y condiciones
    terms_and_conditions TEXT,
    includes_trial_clause BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES partners(id),

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN (
        'draft', 'sent', 'in_trial', 'accepted', 'active',
        'rejected', 'expired', 'superseded'
    )),
    CONSTRAINT valid_change_type CHECK (
        (is_upgrade::int + is_downgrade::int + is_modification::int) <= 1
    )
);

-- Índices para quotes
CREATE INDEX idx_quotes_company ON quotes(company_id);
CREATE INDEX idx_quotes_seller ON quotes(seller_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_active ON quotes(company_id, status) WHERE status = 'active';
CREATE INDEX idx_quotes_trial_end ON quotes(trial_end_date) WHERE has_trial = true;

COMMENT ON TABLE quotes IS 'Presupuestos y cotizaciones con soporte para períodos de prueba y cambios de módulos';
COMMENT ON COLUMN quotes.trial_modules IS 'Módulos en período de prueba bonificados al 100% x 30 días';
COMMENT ON COLUMN quotes.replaces_quote_id IS 'Si este presupuesto reemplaza a otro (cuando se acepta)';

-- ============================================================================
-- 2. TABLA: module_trials (Períodos de Prueba de Módulos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS module_trials (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    module_key VARCHAR(50) NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    module_price DECIMAL(10,2) NOT NULL,

    -- Período de prueba
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL, -- start_date + 30 días
    days_duration INTEGER DEFAULT 30,

    -- Facturación proporcional (primer mes después del trial)
    first_billing_month DATE NOT NULL, -- Primer día del mes a facturar
    proportional_days INTEGER NOT NULL, -- Días ya usados en ese mes
    total_days_month INTEGER NOT NULL, -- Total de días del mes
    proportional_percentage DECIMAL(5,2) NOT NULL, -- % a cobrar
    proportional_amount DECIMAL(10,2) NOT NULL, -- Monto proporcional
    full_month_amount DECIMAL(10,2) NOT NULL, -- Monto mes completo

    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- Estados: active, accepted, rejected, billed

    -- Decisión del cliente
    decision_date TIMESTAMP,
    decision VARCHAR(20), -- accepted, rejected

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_trial_status CHECK (status IN ('active', 'accepted', 'rejected', 'billed')),
    CONSTRAINT valid_decision CHECK (decision IN ('accepted', 'rejected') OR decision IS NULL)
);

-- Índices para module_trials
CREATE INDEX idx_module_trials_company ON module_trials(company_id);
CREATE INDEX idx_module_trials_quote ON module_trials(quote_id);
CREATE INDEX idx_module_trials_end_date ON module_trials(end_date) WHERE status = 'active';
CREATE INDEX idx_module_trials_billing_month ON module_trials(first_billing_month, status);

COMMENT ON TABLE module_trials IS 'Gestión de períodos de prueba de módulos con cálculo de facturación proporcional';
COMMENT ON COLUMN module_trials.proportional_days IS 'Días ya transcurridos del trial en el mes de facturación';

-- ============================================================================
-- 3. TABLA: contracts (Contratos de Servicio)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE RESTRICT,
    seller_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    support_id INTEGER REFERENCES partners(id) ON DELETE RESTRICT,

    -- Período del contrato
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = indefinido

    -- Módulos y pricing
    contracted_modules JSONB NOT NULL,
    monthly_amount DECIMAL(10,2) NOT NULL,

    -- Configuración de facturación
    payment_day INTEGER NOT NULL DEFAULT 1, -- Día del mes que se genera factura
    billing_frequency VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, annual

    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- Estados: active, cancelled, expired, suspended

    cancellation_date TIMESTAMP,
    cancellation_reason TEXT,
    cancelled_by INTEGER REFERENCES partners(id),

    -- Términos del contrato
    terms TEXT NOT NULL,
    signed_date TIMESTAMP,
    signed_by_company BOOLEAN DEFAULT false,
    company_signature_data JSONB, -- Info de firma digital

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_contract_status CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    CONSTRAINT valid_payment_day CHECK (payment_day BETWEEN 1 AND 5)
);

-- Índices para contracts
CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_contracts_quote ON contracts(quote_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_active ON contracts(company_id, status) WHERE status = 'active';

COMMENT ON TABLE contracts IS 'Contratos de servicio generados a partir de presupuestos aceptados';

-- ============================================================================
-- 4. TABLA: invoices (Facturas Mensuales)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,

    -- Período facturado
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,

    -- Fechas
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date_first DATE NOT NULL, -- Día 10 del mes
    due_date_second DATE NOT NULL, -- Día 20 del mes (+10%)
    suspension_date DATE NOT NULL, -- Día 21 del mes
    termination_date DATE NOT NULL, -- Día 30 del mes (o último del mes)

    -- Montos
    subtotal DECIMAL(10,2) NOT NULL,
    overdue_surcharge DECIMAL(10,2) DEFAULT 0.00, -- 10% adicional en 2do vencimiento
    total_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2) NOT NULL,

    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Estados: pending, paid, overdue_first, overdue_second, suspended, cancelled

    payment_date TIMESTAMP,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_invoice_status CHECK (status IN (
        'pending', 'paid', 'overdue_first', 'overdue_second', 'suspended', 'cancelled'
    )),
    CONSTRAINT valid_period_month CHECK (period_month BETWEEN 1 AND 12)
);

-- Índices para invoices
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_contract ON invoices(contract_id);
CREATE INDEX idx_invoices_period ON invoices(period_year, period_month);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_dates ON invoices(due_date_first, due_date_second);
CREATE INDEX idx_invoices_pending ON invoices(company_id, status) WHERE status IN ('pending', 'overdue_first', 'overdue_second');

COMMENT ON TABLE invoices IS 'Facturas mensuales generadas automáticamente del 1 al 5 de cada mes';
COMMENT ON COLUMN invoices.overdue_surcharge IS 'Recargo del 10% aplicado del día 11 al 20';

-- ============================================================================
-- 5. TABLA: invoice_items (Ítems de Factura)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    -- Item
    module_key VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    -- Proporcional (para módulos en trial)
    is_proportional BOOLEAN DEFAULT false,
    proportional_days INTEGER,
    total_days_month INTEGER,
    proportional_percentage DECIMAL(5,2),
    trial_id INTEGER REFERENCES module_trials(id),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para invoice_items
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_module ON invoice_items(module_key);
CREATE INDEX idx_invoice_items_proportional ON invoice_items(invoice_id, is_proportional);

COMMENT ON TABLE invoice_items IS 'Ítems individuales de cada factura (módulos contratados + proporcionales)';

-- ============================================================================
-- 6. TABLA: payments (Pagos de Clientes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Información del pago
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    -- Métodos: transfer, cash, check, credit_card, debit_card, mercadopago, other

    -- Referencia y comprobante
    receipt_number VARCHAR(100),
    receipt_file_path VARCHAR(500), -- Ruta al archivo subido
    transaction_reference VARCHAR(200),
    bank_name VARCHAR(100),

    -- Verificación
    verified BOOLEAN DEFAULT false,
    verified_by INTEGER REFERENCES partners(id),
    verified_at TIMESTAMP,
    verification_notes TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES partners(id),

    CONSTRAINT valid_payment_method CHECK (payment_method IN (
        'transfer', 'cash', 'check', 'credit_card', 'debit_card', 'mercadopago', 'other'
    ))
);

-- Índices para payments
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_company ON payments(company_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_verified ON payments(verified);

COMMENT ON TABLE payments IS 'Registro de pagos realizados por clientes con comprobantes';

-- ============================================================================
-- 7. TABLA: commissions (Comisiones)
-- ============================================================================
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    commission_type VARCHAR(20) NOT NULL,
    -- Tipos: sale (única), support (mensual recurrente), leader (sobre comisión de vendedor)

    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,

    -- Partner que cobra la comisión
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    partner_role VARCHAR(20) NOT NULL, -- seller, support, leader

    -- Período (para comisiones recurrentes)
    period_year INTEGER,
    period_month INTEGER,

    -- Cálculo
    base_amount DECIMAL(10,2) NOT NULL, -- Monto sobre el que se calcula
    commission_rate DECIMAL(5,2) NOT NULL, -- Porcentaje
    commission_amount DECIMAL(10,2) NOT NULL, -- Monto final

    -- Comisión de líder (calculada sobre comisión de vendedor)
    parent_commission_id INTEGER REFERENCES commissions(id),

    -- Estado de pago de comisión
    payment_status VARCHAR(20) DEFAULT 'pending',
    -- Estados: pending, paid, cancelled

    paid_date TIMESTAMP,
    payment_reference VARCHAR(200),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_commission_type CHECK (commission_type IN ('sale', 'support', 'leader')),
    CONSTRAINT valid_partner_role CHECK (partner_role IN ('seller', 'support', 'leader')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'cancelled'))
);

-- Índices para commissions
CREATE INDEX idx_commissions_type ON commissions(commission_type);
CREATE INDEX idx_commissions_company ON commissions(company_id);
CREATE INDEX idx_commissions_partner ON commissions(partner_id);
CREATE INDEX idx_commissions_payment ON commissions(payment_id);
CREATE INDEX idx_commissions_period ON commissions(period_year, period_month);
CREATE INDEX idx_commissions_pending ON commissions(payment_status) WHERE payment_status = 'pending';

COMMENT ON TABLE commissions IS 'Comisiones de venta (única), soporte (mensual) y líder (sobre vendedor)';
COMMENT ON COLUMN commissions.parent_commission_id IS 'Referencia a comisión del vendedor (para comisiones de líder)';

-- ============================================================================
-- 8. TABLA: service_termination_requests (Solicitudes de Baja)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_termination_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Tipo de baja
    termination_type VARCHAR(20) NOT NULL,
    -- Tipos: module_downgrade (baja de módulos), total_cancellation (baja total)

    -- Módulos a dar de baja (si es downgrade)
    modules_to_remove JSONB,

    -- Fechas
    request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_from_month DATE NOT NULL, -- Primer día del mes desde que es efectiva

    -- Validación de fecha límite
    received_before_deadline BOOLEAN NOT NULL,
    deadline_date DATE NOT NULL, -- Día 30 del mes

    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Estados: pending, confirmed, processed, rejected

    processed_date TIMESTAMP,
    processed_by INTEGER REFERENCES partners(id),

    -- Notificaciones enviadas
    client_confirmation_sent BOOLEAN DEFAULT false,
    stakeholders_notified BOOLEAN DEFAULT false,

    -- Razón
    reason TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_termination_type CHECK (termination_type IN ('module_downgrade', 'total_cancellation')),
    CONSTRAINT valid_termination_status CHECK (status IN ('pending', 'confirmed', 'processed', 'rejected'))
);

-- Índices para service_termination_requests
CREATE INDEX idx_termination_requests_company ON service_termination_requests(company_id);
CREATE INDEX idx_termination_requests_status ON service_termination_requests(status);
CREATE INDEX idx_termination_requests_effective FROM ON service_termination_requests(effective_from_month);
CREATE INDEX idx_termination_requests_pending ON service_termination_requests(status) WHERE status = 'pending';

COMMENT ON TABLE service_termination_requests IS 'Solicitudes de baja de módulos o servicio completo (límite: antes del día 30)';

-- ============================================================================
-- 9. TABLA: company_data_exports (Exportaciones de Datos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_data_exports (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Razón de la exportación
    export_reason VARCHAR(50) NOT NULL,
    -- Razones: service_termination, manual_request, backup

    -- Archivos generados
    export_format VARCHAR(20) NOT NULL, -- csv, excel, json
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,

    -- Tablas incluidas
    tables_exported JSONB NOT NULL, -- Array de nombres de tablas
    total_records INTEGER,

    -- Link de descarga
    download_token VARCHAR(100) UNIQUE NOT NULL,
    download_url TEXT NOT NULL,
    download_expires_at TIMESTAMP NOT NULL, -- +15 días

    -- Estadísticas de descarga
    download_count INTEGER DEFAULT 0,
    first_download_at TIMESTAMP,
    last_download_at TIMESTAMP,

    -- Estado
    status VARCHAR(20) DEFAULT 'available',
    -- Estados: available, downloaded, expired, deleted

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES partners(id),

    CONSTRAINT valid_export_reason CHECK (export_reason IN ('service_termination', 'manual_request', 'backup')),
    CONSTRAINT valid_export_format CHECK (export_format IN ('csv', 'excel', 'json')),
    CONSTRAINT valid_export_status CHECK (status IN ('available', 'downloaded', 'expired', 'deleted'))
);

-- Índices para company_data_exports
CREATE INDEX idx_data_exports_company ON company_data_exports(company_id);
CREATE INDEX idx_data_exports_token ON company_data_exports(download_token);
CREATE INDEX idx_data_exports_expires ON company_data_exports(download_expires_at) WHERE status = 'available';

COMMENT ON TABLE company_data_exports IS 'Exportaciones de datos de empresas (baja de servicio o solicitud manual)';
COMMENT ON COLUMN company_data_exports.download_token IS 'Token único para acceso anónimo al link de descarga';

-- ============================================================================
-- 10. TABLA: company_lifecycle_log (Log del Ciclo de Vida de Empresas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_lifecycle_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Evento
    event_type VARCHAR(50) NOT NULL,
    -- Eventos: activation, payment, overdue, suspension, termination, reactivation,
    --          module_upgrade, module_downgrade, contract_renewal

    event_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Detalles del evento
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    details JSONB,

    -- Referencias
    related_invoice_id INTEGER REFERENCES invoices(id),
    related_payment_id INTEGER REFERENCES payments(id),
    related_quote_id INTEGER REFERENCES quotes(id),

    -- Notificaciones enviadas
    notifications_sent JSONB, -- Array de destinatarios y tipos

    -- Actor
    triggered_by VARCHAR(50), -- system_cron, admin, customer, automatic
    triggered_by_user_id INTEGER REFERENCES partners(id),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para company_lifecycle_log
CREATE INDEX idx_lifecycle_log_company ON company_lifecycle_log(company_id);
CREATE INDEX idx_lifecycle_log_event_type ON company_lifecycle_log(event_type);
CREATE INDEX idx_lifecycle_log_date ON company_lifecycle_log(event_date);

COMMENT ON TABLE company_lifecycle_log IS 'Auditoría completa del ciclo de vida de cada empresa';

-- ============================================================================
-- 11. ACTUALIZAR TABLA companies (Agregar campos necesarios)
-- ============================================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS current_quote_id INTEGER REFERENCES quotes(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS current_contract_id INTEGER REFERENCES contracts(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS suspension_date TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS termination_scheduled_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_export_completed BOOLEAN DEFAULT false;

COMMENT ON COLUMN companies.lifecycle_status IS 'Estado del ciclo de vida: active, trial, overdue_first, overdue_second, suspended, scheduled_termination, terminated';

-- ============================================================================
-- 12. ACTUALIZAR TABLA partners (Agregar campos necesarios)
-- ============================================================================
ALTER TABLE partners ADD COLUMN IF NOT EXISTS acepta_subastas BOOLEAN DEFAULT false;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS leader_id INTEGER REFERENCES partners(id);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS leader_commission_rate DECIMAL(5,2) DEFAULT 10.00;

COMMENT ON COLUMN partners.acepta_subastas IS 'Si el partner acepta recibir notificaciones de subastas automáticas';
COMMENT ON COLUMN partners.leader_id IS 'ID del líder de este partner (para comisiones de líder)';

-- ============================================================================
-- 13. FUNCIONES HELPER DE POSTGRESQL
-- ============================================================================

-- Función: Validar solo 1 presupuesto activo por empresa
CREATE OR REPLACE FUNCTION validate_single_active_quote()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        IF EXISTS (
            SELECT 1 FROM quotes
            WHERE company_id = NEW.company_id
            AND status = 'active'
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'Ya existe un presupuesto activo para esta empresa';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_single_active_quote
    BEFORE INSERT OR UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION validate_single_active_quote();

-- Función: Actualizar balance de factura al registrar pago
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices
    SET amount_paid = amount_paid + NEW.amount,
        balance = total_amount - (amount_paid + NEW.amount),
        status = CASE
            WHEN (amount_paid + NEW.amount) >= total_amount THEN 'paid'
            ELSE status
        END,
        payment_date = CASE
            WHEN (amount_paid + NEW.amount) >= total_amount THEN NEW.payment_date
            ELSE payment_date
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_balance
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_balance();

-- Función: Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_trials_updated_at BEFORE UPDATE ON module_trials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_termination_requests_updated_at BEFORE UPDATE ON service_termination_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 14. VISTAS ÚTILES
-- ============================================================================

-- Vista: Presupuestos activos por empresa
CREATE OR REPLACE VIEW v_active_quotes AS
SELECT
    q.*,
    c.name as company_name,
    c.slug as company_slug,
    p.name as seller_name,
    p.email as seller_email
FROM quotes q
INNER JOIN companies c ON c.company_id = q.company_id
INNER JOIN partners p ON p.id = q.seller_id
WHERE q.status = 'active';

-- Vista: Facturas vencidas
CREATE OR REPLACE VIEW v_overdue_invoices AS
SELECT
    i.*,
    c.name as company_name,
    c.contact_email as company_email,
    CASE
        WHEN CURRENT_DATE > i.due_date_second THEN 'suspended'
        WHEN CURRENT_DATE > i.due_date_first THEN 'overdue_second'
        ELSE i.status
    END as calculated_status
FROM invoices i
INNER JOIN companies c ON c.company_id = i.company_id
WHERE i.status IN ('pending', 'overdue_first', 'overdue_second')
AND i.balance > 0;

-- Vista: Comisiones pendientes de pago
CREATE OR REPLACE VIEW v_pending_commissions AS
SELECT
    co.*,
    c.name as company_name,
    p.name as partner_name,
    p.email as partner_email,
    py.payment_date,
    py.amount as payment_amount
FROM commissions co
INNER JOIN companies c ON c.company_id = co.company_id
INNER JOIN partners p ON p.id = co.partner_id
INNER JOIN payments py ON py.id = co.payment_id
WHERE co.payment_status = 'pending';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

COMMENT ON DATABASE current_database() IS 'Sistema completo de facturación, vendedores y gestión de ciclo de vida implementado';
