-- =========================================================================
-- MIGRACIÓN: Crear tabla quotes (presupuestos)
-- Sistema de presupuestos con soporte para trials y onboarding
-- =========================================================================

-- 1. Crear tabla quotes
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    seller_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES marketing_leads(id) ON DELETE SET NULL,

    -- Módulos incluidos
    modules_data JSONB NOT NULL DEFAULT '[]',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),

    -- Información de prueba (30 días con 100% bonificación)
    trial_modules JSONB,
    has_trial BOOLEAN DEFAULT FALSE,
    trial_start_date TIMESTAMP,
    trial_end_date TIMESTAMP,
    trial_bonification_percentage DECIMAL(5, 2) DEFAULT 100.00 CHECK (trial_bonification_percentage >= 0 AND trial_bonification_percentage <= 100),

    -- Referencias a presupuestos anteriores/siguientes
    previous_quote_id INTEGER REFERENCES quotes(id),
    replaces_quote_id INTEGER REFERENCES quotes(id),
    replaced_by_quote_id INTEGER REFERENCES quotes(id),

    -- Tipo de cambio
    is_upgrade BOOLEAN DEFAULT FALSE,
    is_downgrade BOOLEAN DEFAULT FALSE,
    is_modification BOOLEAN DEFAULT FALSE,
    added_modules JSONB,
    removed_modules JSONB,

    -- Estado del presupuesto
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_trial', 'accepted', 'active', 'rejected', 'expired', 'superseded')),

    -- Fechas y metadata
    sent_date TIMESTAMP,
    accepted_date TIMESTAMP,
    rejected_date TIMESTAMP,
    expiration_date TIMESTAMP,
    valid_until TIMESTAMP,

    -- Observaciones y términos
    notes TEXT,
    client_notes TEXT,
    terms_and_conditions TEXT,

    -- Archivos adjuntos
    pdf_file_path VARCHAR(500),

    -- Auditoría
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_seller_id ON quotes(seller_id);
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_sent_date ON quotes(sent_date);
CREATE INDEX IF NOT EXISTS idx_quotes_accepted_date ON quotes(accepted_date);
CREATE INDEX IF NOT EXISTS idx_quotes_trial_dates ON quotes(trial_start_date, trial_end_date);

-- Índice parcial para asegurar solo 1 presupuesto activo por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_quotes_per_company
ON quotes(company_id) WHERE status = 'active';

-- 3. Comentarios
COMMENT ON TABLE quotes IS 'Presupuestos del sistema de onboarding con soporte para trials';
COMMENT ON COLUMN quotes.quote_number IS 'Formato: PRES-YYYY-NNNN (auto-generado)';
COMMENT ON COLUMN quotes.lead_id IS 'Lead de marketing de origen (si el presupuesto se creó desde un lead)';
COMMENT ON COLUMN quotes.trial_modules IS 'Array de module_keys que están en período de prueba';
COMMENT ON COLUMN quotes.status IS 'Estados: draft, sent, in_trial, accepted, active, rejected, expired, superseded';

-- 4. Crear tabla module_trials para tracking de trials individuales
CREATE TABLE IF NOT EXISTS module_trials (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    module_key VARCHAR(100) NOT NULL,
    module_name VARCHAR(200),
    module_price DECIMAL(10, 2),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    days_duration INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted', 'cancelled')),
    converted_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_module_trials_company ON module_trials(company_id);
CREATE INDEX IF NOT EXISTS idx_module_trials_quote ON module_trials(quote_id);
CREATE INDEX IF NOT EXISTS idx_module_trials_status ON module_trials(status);

COMMENT ON TABLE module_trials IS 'Tracking de trials individuales por módulo';

-- 5. Crear tabla contracts para contratos generados desde presupuestos
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES partners(id) ON DELETE SET NULL,

    -- Datos del contrato
    modules_data JSONB NOT NULL DEFAULT '[]',
    monthly_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    start_date DATE NOT NULL,
    end_date DATE,

    -- Estado
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'suspended', 'terminated', 'expired')),

    -- Facturación
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
    payment_day INTEGER DEFAULT 10 CHECK (payment_day >= 1 AND payment_day <= 28),
    payment_terms_days INTEGER DEFAULT 10,
    late_payment_surcharge_percentage DECIMAL(5, 2) DEFAULT 10.00,
    suspension_days_threshold INTEGER DEFAULT 20,
    termination_days_threshold INTEGER DEFAULT 30,

    -- Términos
    terms_and_conditions TEXT,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_quote ON contracts(quote_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

COMMENT ON TABLE contracts IS 'Contratos generados desde presupuestos aceptados';

-- 6. Verificación
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
        RAISE NOTICE '✅ Tabla quotes creada exitosamente';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'module_trials') THEN
        RAISE NOTICE '✅ Tabla module_trials creada exitosamente';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
        RAISE NOTICE '✅ Tabla contracts creada exitosamente';
    END IF;
END $$;
