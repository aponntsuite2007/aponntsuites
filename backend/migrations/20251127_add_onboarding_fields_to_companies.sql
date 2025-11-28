-- ============================================================================
-- MIGRACIÓN: Agregar campos de onboarding a tabla companies
-- Workflow: altaEmpresa
-- Descripción: Campos para tracking del proceso de alta de empresa
-- ============================================================================

-- Campo 1: onboarding_status (estado del proceso de onboarding)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50) DEFAULT 'PENDING';

-- Campo 2: requiere_supervision_factura (flag para supervisión administrativa)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS requiere_supervision_factura BOOLEAN DEFAULT FALSE;

-- Campo 3: activated_at (fecha de activación definitiva)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;

-- Campo 4: onboarding_trace_id (ID de trazabilidad del onboarding)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS onboarding_trace_id VARCHAR(100);

-- Campo 5: vendor_id (vendedor que dio de alta la empresa)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES aponnt_staff(staff_id) ON DELETE SET NULL;

-- Campo 6: modules_trial (módulos en período de prueba - JSONB)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS modules_trial JSONB DEFAULT '[]'::JSONB;

-- Agregar constraint para onboarding_status
ALTER TABLE companies
DROP CONSTRAINT IF EXISTS valid_onboarding_status;

ALTER TABLE companies
ADD CONSTRAINT valid_onboarding_status CHECK (onboarding_status IN (
  'PENDING',              -- Presupuesto creado, esperando aceptación
  'BUDGET_ACCEPTED',      -- Presupuesto aceptado, generando contrato
  'CONTRACT_SENT',        -- Contrato enviado, esperando firma
  'CONTRACT_SIGNED',      -- Contrato firmado, generando factura
  'INVOICE_GENERATED',    -- Factura generada, esperando pago
  'INVOICE_SUPERVISED',   -- Factura aprobada por admin (si requiere_supervision_factura)
  'PAYMENT_PENDING',      -- Esperando confirmación de pago
  'PAYMENT_CONFIRMED',    -- Pago confirmado, procesando alta
  'ACTIVE',               -- Empresa activa (alta definitiva completada)
  'SUSPENDED',            -- Empresa suspendida temporalmente
  'CANCELLED'             -- Onboarding cancelado
));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_status ON companies(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_companies_vendor ON companies(vendor_id);
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_trace ON companies(onboarding_trace_id);
CREATE INDEX IF NOT EXISTS idx_companies_supervision ON companies(requiere_supervision_factura)
  WHERE requiere_supervision_factura = TRUE;

-- Índice GIN para modules_trial JSONB
CREATE INDEX IF NOT EXISTS idx_companies_modules_trial_gin ON companies USING GIN (modules_trial);

-- Función para validar estructura de modules_trial
CREATE OR REPLACE FUNCTION validate_modules_trial_structure()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que modules_trial sea un array
  IF NEW.modules_trial IS NOT NULL THEN
    IF jsonb_typeof(NEW.modules_trial) != 'array' THEN
      RAISE EXCEPTION 'modules_trial must be a JSON array';
    END IF;

    -- Validar estructura de cada elemento
    -- Cada elemento debe tener: module_key, trial_start, trial_end, status
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(NEW.modules_trial) AS elem
      WHERE NOT (
        elem ? 'module_key' AND
        elem ? 'trial_start' AND
        elem ? 'trial_end' AND
        elem ? 'status'
      )
    ) THEN
      RAISE EXCEPTION 'Each module in modules_trial must have: module_key, trial_start, trial_end, status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar modules_trial
DROP TRIGGER IF EXISTS companies_validate_modules_trial ON companies;

CREATE TRIGGER companies_validate_modules_trial
  BEFORE INSERT OR UPDATE OF modules_trial ON companies
  FOR EACH ROW
  EXECUTE FUNCTION validate_modules_trial_structure();

-- Función para obtener módulos en trial activos de una empresa
CREATE OR REPLACE FUNCTION get_active_trial_modules(p_company_id UUID)
RETURNS TABLE(
  module_key VARCHAR,
  trial_start DATE,
  trial_end DATE,
  days_remaining INTEGER,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (elem->>'module_key')::VARCHAR,
    (elem->>'trial_start')::DATE,
    (elem->>'trial_end')::DATE,
    ((elem->>'trial_end')::DATE - CURRENT_DATE)::INTEGER AS days_remaining,
    (elem->>'status')::VARCHAR
  FROM companies c
  CROSS JOIN LATERAL jsonb_array_elements(c.modules_trial) AS elem
  WHERE
    c.id = p_company_id
    AND (elem->>'status')::VARCHAR = 'ACTIVE'
    AND (elem->>'trial_end')::DATE >= CURRENT_DATE
  ORDER BY (elem->>'trial_end')::DATE ASC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener empresas con trials próximos a expirar
CREATE OR REPLACE FUNCTION get_expiring_trials(p_days_before INTEGER DEFAULT 3)
RETURNS TABLE(
  company_id INTEGER,
  company_name VARCHAR,
  module_key VARCHAR,
  trial_end DATE,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    (elem->>'module_key')::VARCHAR,
    (elem->>'trial_end')::DATE,
    ((elem->>'trial_end')::DATE - CURRENT_DATE)::INTEGER AS days_remaining
  FROM companies c
  CROSS JOIN LATERAL jsonb_array_elements(c.modules_trial) AS elem
  WHERE
    (elem->>'status')::VARCHAR = 'ACTIVE'
    AND (elem->>'trial_end')::DATE >= CURRENT_DATE
    AND (elem->>'trial_end')::DATE <= (CURRENT_DATE + p_days_before)
  ORDER BY (elem->>'trial_end')::DATE ASC;
END;
$$ LANGUAGE plpgsql;

-- Actualizar empresas existentes
UPDATE companies
SET
  onboarding_status = CASE
    WHEN is_active = true THEN 'ACTIVE'
    ELSE 'PENDING'
  END,
  requiere_supervision_factura = FALSE,
  modules_trial = '[]'::JSONB
WHERE onboarding_status IS NULL;

-- Comentarios de documentación
COMMENT ON COLUMN companies.onboarding_status IS 'Estado del proceso de onboarding: PENDING, BUDGET_ACCEPTED, CONTRACT_SENT, CONTRACT_SIGNED, INVOICE_GENERATED, INVOICE_SUPERVISED, PAYMENT_PENDING, PAYMENT_CONFIRMED, ACTIVE, SUSPENDED, CANCELLED';
COMMENT ON COLUMN companies.requiere_supervision_factura IS 'TRUE si las facturas de esta empresa requieren aprobación de admin Aponnt antes de enviar';
COMMENT ON COLUMN companies.activated_at IS 'Fecha y hora de activación definitiva de la empresa (cuando onboarding_status pasa a ACTIVE)';
COMMENT ON COLUMN companies.onboarding_trace_id IS 'Trace ID del proceso de onboarding (ONBOARDING-{UUID})';
COMMENT ON COLUMN companies.vendor_id IS 'Vendedor que dio de alta la empresa (FK a aponnt_staff)';
COMMENT ON COLUMN companies.modules_trial IS 'Array JSONB de módulos en período de prueba: [{ module_key, trial_start, trial_end, status, activated_by }]';

-- Grant permisos
-- GRANT SELECT, UPDATE ON companies TO attendance_system_user;
