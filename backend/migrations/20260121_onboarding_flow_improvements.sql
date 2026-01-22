-- ============================================================================
-- MIGRACIÓN: Mejoras al flujo de Onboarding (Circuito de Comercialización)
-- Fecha: 2026-01-21
-- Autor: Sistema Biométrico Enterprise
-- ============================================================================
--
-- CAMBIOS PRINCIPALES:
-- 1. Budget puede crearse desde Lead SIN empresa (company_id opcional)
-- 2. Company tiene estados de onboarding y trace_id
-- 3. Contract tiene trace_id y budget_id
-- 4. Versionado para upgrade/downgrade en todos los documentos
--
-- FLUJO CORRECTO:
-- Lead (etapa final) → Budget (SIN company) → Contract → Firma →
-- Crear Empresa INACTIVA → Factura → Pago → ACTIVAR Empresa
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MODIFICACIONES A TABLA BUDGETS
-- ============================================================================

-- 1.1 Agregar columna lead_id (FK a sales_leads)
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES sales_leads(id) ON DELETE SET NULL;

COMMENT ON COLUMN budgets.lead_id IS 'Lead de origen (para nuevas empresas). Mutualmente excluyente con company_id inicial.';

-- 1.2 Hacer company_id nullable (CAMBIO CRÍTICO)
ALTER TABLE budgets
ALTER COLUMN company_id DROP NOT NULL;

COMMENT ON COLUMN budgets.company_id IS 'Empresa destino. NULL al inicio si viene de lead, se asigna al firmar contrato.';

-- 1.3 Agregar campos de versionado
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS previous_budget_id UUID REFERENCES budgets(id),
ADD COLUMN IF NOT EXISTS replaces_budget_id UUID REFERENCES budgets(id),
ADD COLUMN IF NOT EXISTS replaced_by_budget_id UUID REFERENCES budgets(id),
ADD COLUMN IF NOT EXISTS is_upgrade BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_downgrade BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS added_modules JSONB,
ADD COLUMN IF NOT EXISTS removed_modules JSONB;

COMMENT ON COLUMN budgets.previous_budget_id IS 'Presupuesto anterior de esta empresa (para historial)';
COMMENT ON COLUMN budgets.replaces_budget_id IS 'Presupuesto que este reemplaza (cuando es upgrade/downgrade)';
COMMENT ON COLUMN budgets.replaced_by_budget_id IS 'Presupuesto que reemplazó a este (cuando queda SUPERSEDED)';
COMMENT ON COLUMN budgets.is_upgrade IS 'True si agrega módulos vs presupuesto anterior';
COMMENT ON COLUMN budgets.is_downgrade IS 'True si quita módulos vs presupuesto anterior';
COMMENT ON COLUMN budgets.added_modules IS 'Array de module_keys agregados vs presupuesto anterior';
COMMENT ON COLUMN budgets.removed_modules IS 'Array de module_keys removidos vs presupuesto anterior';

-- 1.4 Agregar nuevos estados válidos
-- (No hay forma directa de modificar CHECK constraint, pero el modelo ya lo maneja)

-- 1.5 Índices para budgets
CREATE INDEX IF NOT EXISTS idx_budgets_lead_id ON budgets(lead_id);
CREATE INDEX IF NOT EXISTS idx_budgets_previous_budget_id ON budgets(previous_budget_id);

-- ============================================================================
-- 2. MODIFICACIONES A TABLA COMPANIES
-- ============================================================================

-- 2.1 Agregar onboarding_status
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50);

COMMENT ON COLUMN companies.onboarding_status IS 'Estado del proceso de onboarding: LEAD_QUALIFIED, BUDGET_SENT, BUDGET_ACCEPTED, CONTRACT_SIGNED, INVOICE_PAID, ACTIVATED, etc.';

-- 2.2 Agregar trace_id para trazabilidad
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS trace_id VARCHAR(100) UNIQUE;

COMMENT ON COLUMN companies.trace_id IS 'ONBOARDING-{UUID} - Trazabilidad del proceso de alta';

-- 2.3 Agregar campos de activación
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS activated_by INTEGER;

COMMENT ON COLUMN companies.activated_at IS 'Fecha de activación definitiva (después de pago)';
COMMENT ON COLUMN companies.activated_by IS 'Usuario que activó la empresa';

-- 2.4 Actualizar valor por defecto de status (si es posible)
-- NOTA: Las empresas existentes mantienen su status actual
ALTER TABLE companies
ALTER COLUMN status SET DEFAULT 'pending';

-- 2.5 Actualizar valor por defecto de is_active
ALTER TABLE companies
ALTER COLUMN is_active SET DEFAULT false;

-- 2.6 Índices para companies
CREATE INDEX IF NOT EXISTS idx_companies_trace_id ON companies(trace_id);
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_status ON companies(onboarding_status);

-- ============================================================================
-- 3. MODIFICACIONES A TABLA CONTRACTS
-- ============================================================================

-- 3.1 Agregar trace_id
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS trace_id VARCHAR(100);

COMMENT ON COLUMN contracts.trace_id IS 'ONBOARDING-{UUID} - Trazabilidad del proceso de alta';

-- 3.2 Agregar budget_id (FK al nuevo sistema de presupuestos)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id) ON DELETE RESTRICT;

COMMENT ON COLUMN contracts.budget_id IS 'Presupuesto (Budget) del cual se generó este contrato (sistema nuevo)';

-- 3.3 Hacer company_id nullable (para contratos desde lead)
ALTER TABLE contracts
ALTER COLUMN company_id DROP NOT NULL;

COMMENT ON COLUMN contracts.company_id IS 'NULL al inicio si viene de lead, se asigna al firmar contrato.';

-- 3.4 Hacer quote_id nullable (ahora puede venir de Budget)
ALTER TABLE contracts
ALTER COLUMN quote_id DROP NOT NULL;

-- 3.5 Agregar campos de versionado (sin FK inline para evitar problemas de auto-referencia)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS previous_contract_id INTEGER,
ADD COLUMN IF NOT EXISTS replaces_contract_id INTEGER,
ADD COLUMN IF NOT EXISTS replaced_by_contract_id INTEGER;

COMMENT ON COLUMN contracts.previous_contract_id IS 'Contrato anterior (para historial de upgrades/downgrades)';
COMMENT ON COLUMN contracts.replaces_contract_id IS 'Contrato que este reemplaza';
COMMENT ON COLUMN contracts.replaced_by_contract_id IS 'Contrato que reemplazó a este (cuando queda SUPERSEDED)';

-- Las FKs se agregan por separado para evitar problemas de auto-referencia
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_contracts_previous') THEN
        ALTER TABLE contracts ADD CONSTRAINT fk_contracts_previous
            FOREIGN KEY (previous_contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_contracts_replaces') THEN
        ALTER TABLE contracts ADD CONSTRAINT fk_contracts_replaces
            FOREIGN KEY (replaces_contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_contracts_replaced_by') THEN
        ALTER TABLE contracts ADD CONSTRAINT fk_contracts_replaced_by
            FOREIGN KEY (replaced_by_contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FKs de auto-referencia en contracts ya existen o no se pueden crear: %', SQLERRM;
END $$;

-- 3.6 Índices para contracts
CREATE INDEX IF NOT EXISTS idx_contracts_trace_id ON contracts(trace_id);
CREATE INDEX IF NOT EXISTS idx_contracts_budget_id ON contracts(budget_id);
CREATE INDEX IF NOT EXISTS idx_contracts_previous_contract_id ON contracts(previous_contract_id);

-- ============================================================================
-- 4. AGREGAR COLUMNA A SALES_LEADS PARA TRACKING DE CONVERSIÓN
-- ============================================================================

ALTER TABLE sales_leads
ADD COLUMN IF NOT EXISTS converted_company_id INTEGER REFERENCES companies(company_id);

COMMENT ON COLUMN sales_leads.converted_company_id IS 'ID de la empresa creada cuando el lead se convierte';

CREATE INDEX IF NOT EXISTS idx_sales_leads_converted_company_id ON sales_leads(converted_company_id);

-- ============================================================================
-- 5. VALIDACIONES Y CONSTRAINTS
-- ============================================================================

-- 5.1 Constraint: Budget debe tener lead_id O company_id (al menos uno)
-- NOTA: Comentado porque la lógica lo maneja en el servicio
-- ALTER TABLE budgets
-- ADD CONSTRAINT chk_budget_origin CHECK (lead_id IS NOT NULL OR company_id IS NOT NULL);

-- 5.2 Constraint: Contract debe tener budget_id O quote_id (al menos uno)
-- NOTA: Comentado porque puede haber contratos legacy sin ninguno
-- ALTER TABLE contracts
-- ADD CONSTRAINT chk_contract_origin CHECK (budget_id IS NOT NULL OR quote_id IS NOT NULL);

-- ============================================================================
-- 6. FUNCIONES HELPER
-- ============================================================================

-- 6.1 Función para obtener estado completo de onboarding por trace_id
CREATE OR REPLACE FUNCTION get_onboarding_status(p_trace_id VARCHAR)
RETURNS TABLE (
    trace_id VARCHAR,
    budget_status VARCHAR,
    contract_status VARCHAR,
    company_status VARCHAR,
    company_onboarding_status VARCHAR,
    invoice_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p_trace_id,
        b.status::VARCHAR AS budget_status,
        c.status::VARCHAR AS contract_status,
        co.status::VARCHAR AS company_status,
        co.onboarding_status AS company_onboarding_status,
        COALESCE(i.status, 'N/A')::VARCHAR AS invoice_status
    FROM budgets b
    LEFT JOIN contracts c ON c.budget_id = b.id OR c.trace_id = p_trace_id
    LEFT JOIN companies co ON co.trace_id = p_trace_id OR co.company_id = b.company_id
    LEFT JOIN invoices i ON i.contract_id = c.id
    WHERE b.trace_id = p_trace_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_onboarding_status(VARCHAR) IS 'Obtiene estado completo del proceso de onboarding por trace_id';

-- 6.2 Función para validar que solo haya 1 presupuesto activo por empresa
CREATE OR REPLACE FUNCTION check_one_active_budget_per_company()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('PENDING', 'SENT', 'VIEWED', 'ACCEPTED', 'ACTIVE') AND NEW.company_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM budgets
            WHERE company_id = NEW.company_id
              AND id != NEW.id
              AND status IN ('PENDING', 'SENT', 'VIEWED', 'ACCEPTED', 'ACTIVE')
        ) THEN
            RAISE EXCEPTION 'Ya existe un presupuesto vigente para esta empresa (company_id: %). Debe marcarse como SUPERSEDED primero.', NEW.company_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (si no existe)
DROP TRIGGER IF EXISTS trg_one_active_budget_per_company ON budgets;
CREATE TRIGGER trg_one_active_budget_per_company
    BEFORE INSERT OR UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION check_one_active_budget_per_company();

-- 6.3 Función para validar que solo haya 1 contrato activo por empresa
CREATE OR REPLACE FUNCTION check_one_active_contract_per_company()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND NEW.company_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM contracts
            WHERE company_id = NEW.company_id
              AND id != NEW.id
              AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'Ya existe un contrato activo para esta empresa (company_id: %). Debe marcarse como SUPERSEDED primero.', NEW.company_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (si no existe)
DROP TRIGGER IF EXISTS trg_one_active_contract_per_company ON contracts;
CREATE TRIGGER trg_one_active_contract_per_company
    BEFORE INSERT OR UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION check_one_active_contract_per_company();

-- ============================================================================
-- 7. DATOS DE EJEMPLO (COMENTADO - SOLO PARA REFERENCIA)
-- ============================================================================

/*
-- Ejemplo: Crear presupuesto desde lead (SIN empresa)
INSERT INTO budgets (
    id, trace_id, lead_id, company_id, vendor_id, budget_code,
    selected_modules, contracted_employees, total_monthly, status, valid_until
) VALUES (
    gen_random_uuid(),
    'ONBOARDING-' || gen_random_uuid(),
    'uuid-del-lead',  -- lead_id
    NULL,             -- company_id = NULL (no existe empresa aún)
    'uuid-del-vendedor',
    'PPTO-2026-0001',
    '[{"module_key": "asistencia", "price": 50}, {"module_key": "nomina", "price": 150}]',
    100,
    200.00,
    'PENDING',
    CURRENT_DATE + INTERVAL '30 days'
);
*/

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
