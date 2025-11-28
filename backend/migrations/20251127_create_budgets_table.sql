-- ============================================================================
-- TABLA: budgets (Presupuestos para Alta de Empresa)
-- Workflow: altaEmpresa - FASE 1
-- Descripción: Almacena presupuestos generados para onboarding de empresas
-- Trace ID: ONBOARDING-{UUID}
-- ============================================================================

CREATE TABLE IF NOT EXISTS budgets (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(100) UNIQUE NOT NULL, -- ONBOARDING-{UUID}

  -- Relaciones
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES aponnt_staff(id) ON DELETE RESTRICT,

  -- Datos del presupuesto
  budget_code VARCHAR(50) UNIQUE NOT NULL, -- PPTO-YYYY-NNNN
  budget_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL, -- budget_date + 30 días

  -- Módulos y pricing
  selected_modules JSONB NOT NULL, -- Array de { module_key, module_name, base_price }
  contracted_employees INTEGER NOT NULL CHECK (contracted_employees > 0),
  price_per_employee DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL, -- SUM(modules.base_price)
  total_monthly DECIMAL(12,2) NOT NULL, -- subtotal * contracted_employees

  -- Contacto
  client_contact_name VARCHAR(255) NOT NULL,
  client_contact_email VARCHAR(255) NOT NULL,
  client_contact_phone VARCHAR(50),

  -- Estado del presupuesto
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  -- PENDING, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, CANCELLED

  -- Tracking de acciones
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,

  -- Metadata
  notes TEXT, -- Observaciones del vendedor
  payment_method VARCHAR(50) DEFAULT 'TRANSFERENCIA', -- SOLO transferencia

  -- Auditoría
  created_by UUID REFERENCES aponnt_staff(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('PENDING', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  CONSTRAINT valid_dates CHECK (valid_until > budget_date)
);

-- Índices para performance
CREATE INDEX idx_budgets_company ON budgets(company_id);
CREATE INDEX idx_budgets_vendor ON budgets(vendor_id);
CREATE INDEX idx_budgets_trace_id ON budgets(trace_id);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_budget_code ON budgets(budget_code);
CREATE INDEX idx_budgets_valid_until ON budgets(valid_until) WHERE status IN ('PENDING', 'SENT', 'VIEWED');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_budgets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_budgets_timestamp();

-- Función para generar budget_code
CREATE OR REPLACE FUNCTION generate_budget_code()
RETURNS VARCHAR AS $$
DECLARE
  year VARCHAR(4);
  seq_num INTEGER;
  code VARCHAR(50);
BEGIN
  year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Obtener el siguiente número de secuencia para el año actual
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(budget_code FROM 'PPTO-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM budgets
  WHERE budget_code LIKE 'PPTO-' || year || '-%';

  code := 'PPTO-' || year || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Función para detectar presupuestos expirados (cron job)
CREATE OR REPLACE FUNCTION expire_old_budgets()
RETURNS TABLE(expired_count INTEGER) AS $$
BEGIN
  UPDATE budgets
  SET status = 'EXPIRED',
      updated_at = CURRENT_TIMESTAMP
  WHERE status IN ('PENDING', 'SENT', 'VIEWED')
    AND valid_until < CURRENT_DATE;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Comentarios de documentación
COMMENT ON TABLE budgets IS 'Presupuestos para onboarding de empresas (Workflow altaEmpresa - FASE 1)';
COMMENT ON COLUMN budgets.trace_id IS 'ID único de trazabilidad del workflow completo (ONBOARDING-{UUID})';
COMMENT ON COLUMN budgets.budget_code IS 'Código legible del presupuesto (PPTO-YYYY-NNNN)';
COMMENT ON COLUMN budgets.selected_modules IS 'Array JSON de módulos seleccionados con pricing';
COMMENT ON COLUMN budgets.total_monthly IS 'Total mensual = SUM(módulos base_price) × empleados';
COMMENT ON COLUMN budgets.status IS 'Estado: PENDING, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, CANCELLED';
COMMENT ON COLUMN budgets.valid_until IS 'Fecha de expiración (30 días desde creación)';

-- Grant permisos (ajustar según usuario de BD)
-- GRANT SELECT, INSERT, UPDATE ON budgets TO attendance_system_user;
