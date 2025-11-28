-- ============================================================================
-- TABLA: commission_liquidations (Liquidaciones de Comisiones)
-- Workflow: altaEmpresa - FASE 5 (Liquidación Inmediata)
-- Descripción: Liquidaciones de comisiones (inmediatas o mensuales)
-- Trace ID: COMMISSION-{UUID}
-- ============================================================================

CREATE TABLE IF NOT EXISTS commission_liquidations (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(100) UNIQUE NOT NULL, -- COMMISSION-{UUID}

  -- Relaciones
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Tipo de liquidación
  liquidation_type VARCHAR(50) NOT NULL,
  -- ONBOARDING_IMMEDIATE (alta de empresa), MONTHLY (ciclo mensual)

  liquidation_code VARCHAR(50) UNIQUE NOT NULL, -- LIQ-YYYY-MM-NNNN

  -- Período de liquidación
  liquidation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Factura base
  invoice_amount DECIMAL(12,2) NOT NULL, -- Monto de la factura que genera comisión
  invoice_number VARCHAR(100),
  invoice_date DATE,

  -- Cálculo de comisiones
  total_commissionable DECIMAL(12,2) NOT NULL, -- Monto sobre el que se calcula comisión
  total_commission_amount DECIMAL(12,2) NOT NULL, -- SUM de todas las comisiones calculadas

  -- Breakdown de comisiones (JSONB)
  commission_breakdown JSONB NOT NULL,
  /*
  [
    {
      "vendor_id": "uuid",
      "vendor_name": "Juan Pérez",
      "level": "DIRECT_SALES",
      "percentage": 10.0,
      "amount": 1500.00,
      "payment_status": "PENDING"
    },
    {
      "vendor_id": "uuid",
      "vendor_name": "María López (Supervisor)",
      "level": "PYRAMID_L1",
      "percentage": 5.0,
      "amount": 750.00,
      "payment_status": "PENDING"
    }
  ]
  */

  -- Estado de la liquidación
  status VARCHAR(50) NOT NULL DEFAULT 'CALCULATED',
  -- CALCULATED, APPROVED, REJECTED, PAYMENT_PENDING, PAYMENT_IN_PROGRESS, PAID, CANCELLED

  -- Aprobación
  approved_by UUID REFERENCES aponnt_staff(staff_id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,

  -- Pagos
  payment_batch_id UUID, -- ID del batch de pagos (si se paga en lote)
  payment_scheduled_date DATE, -- Fecha programada de pago
  payment_executed_date DATE, -- Fecha real de pago
  payment_method VARCHAR(50) DEFAULT 'TRANSFERENCIA', -- TRANSFERENCIA, VIRTUAL_WALLET

  -- Metadata
  notes TEXT,
  source VARCHAR(50) DEFAULT 'SYSTEM', -- SYSTEM, MANUAL

  -- Auditoría
  created_by UUID REFERENCES aponnt_staff(staff_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_liquidation_type CHECK (liquidation_type IN ('ONBOARDING_IMMEDIATE', 'MONTHLY')),
  CONSTRAINT valid_liquidation_status CHECK (status IN (
    'CALCULATED', 'APPROVED', 'REJECTED', 'PAYMENT_PENDING',
    'PAYMENT_IN_PROGRESS', 'PAID', 'CANCELLED'
  )),
  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT approved_if_paid CHECK (
    (status != 'PAID') OR
    (status = 'PAID' AND approved_at IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX idx_comm_liq_company ON commission_liquidations(company_id);
CREATE INDEX idx_comm_liq_invoice ON commission_liquidations(invoice_id);
CREATE INDEX idx_comm_liq_trace_id ON commission_liquidations(trace_id);
CREATE INDEX idx_comm_liq_status ON commission_liquidations(status);
CREATE INDEX idx_comm_liq_type ON commission_liquidations(liquidation_type);
CREATE INDEX idx_comm_liq_date ON commission_liquidations(liquidation_date DESC);
CREATE INDEX idx_comm_liq_period ON commission_liquidations(period_start, period_end);
CREATE INDEX idx_comm_liq_payment_date ON commission_liquidations(payment_scheduled_date)
  WHERE status IN ('PAYMENT_PENDING', 'PAYMENT_IN_PROGRESS');

-- Índice GIN para buscar dentro de commission_breakdown JSONB
CREATE INDEX idx_comm_liq_breakdown_gin ON commission_liquidations USING GIN (commission_breakdown);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_comm_liq_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comm_liq_updated_at
  BEFORE UPDATE ON commission_liquidations
  FOR EACH ROW
  EXECUTE FUNCTION update_comm_liq_timestamp();

-- Función para generar liquidation_code
CREATE OR REPLACE FUNCTION generate_liquidation_code()
RETURNS VARCHAR AS $$
DECLARE
  year VARCHAR(4);
  month VARCHAR(2);
  seq_num INTEGER;
  code VARCHAR(50);
BEGIN
  year := TO_CHAR(CURRENT_DATE, 'YYYY');
  month := TO_CHAR(CURRENT_DATE, 'MM');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(liquidation_code FROM 'LIQ-\d{4}-\d{2}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM commission_liquidations
  WHERE liquidation_code LIKE 'LIQ-' || year || '-' || month || '-%';

  code := 'LIQ-' || year || '-' || month || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular comisiones piramidales
CREATE OR REPLACE FUNCTION calculate_pyramid_commissions(
  p_vendor_id UUID,
  p_base_amount DECIMAL
)
RETURNS TABLE(
  vendor_id UUID,
  vendor_name VARCHAR,
  level VARCHAR,
  percentage DECIMAL,
  amount DECIMAL
) AS $$
DECLARE
  v_hierarchy RECORD;
  v_level_name VARCHAR;
  v_percentage DECIMAL;
  v_amount DECIMAL;
BEGIN
  -- Comisión directa (vendedor que cerró la venta)
  SELECT id, name, commission_percentage
  INTO v_hierarchy
  FROM aponnt_staff
  WHERE id = p_vendor_id;

  IF FOUND THEN
    vendor_id := v_hierarchy.id;
    vendor_name := v_hierarchy.name;
    level := 'DIRECT_SALES';
    percentage := v_hierarchy.commission_percentage;
    amount := p_base_amount * (v_hierarchy.commission_percentage / 100.0);
    RETURN NEXT;
  END IF;

  -- Comisiones piramidales (jerarquía ascendente)
  FOR v_hierarchy IN
    SELECT *
    FROM get_vendor_hierarchy(p_vendor_id)
    WHERE hierarchy_level > 0
    ORDER BY hierarchy_level ASC
  LOOP
    -- Calcular porcentaje según nivel
    v_percentage := CASE v_hierarchy.hierarchy_level
      WHEN 1 THEN 5.0  -- Nivel 1 (supervisor directo): 5%
      WHEN 2 THEN 3.0  -- Nivel 2 (regional): 3%
      WHEN 3 THEN 2.0  -- Nivel 3 (gerente): 2%
      WHEN 4 THEN 1.0  -- Nivel 4 (director): 1%
      ELSE 0.0
    END;

    v_level_name := 'PYRAMID_L' || v_hierarchy.hierarchy_level::TEXT;
    v_amount := p_base_amount * (v_percentage / 100.0);

    vendor_id := v_hierarchy.staff_id;
    vendor_name := v_hierarchy.name;
    level := v_level_name;
    percentage := v_percentage;
    amount := v_amount;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener liquidaciones pendientes de pago de un vendedor
CREATE OR REPLACE FUNCTION get_vendor_pending_payments(p_vendor_id UUID)
RETURNS TABLE(
  liquidation_id UUID,
  liquidation_code VARCHAR,
  liquidation_date DATE,
  company_name VARCHAR,
  commission_amount DECIMAL,
  payment_status VARCHAR,
  payment_scheduled_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id,
    cl.liquidation_code,
    cl.liquidation_date,
    c.name,
    (breakdown->>'amount')::DECIMAL AS commission_amount,
    (breakdown->>'payment_status')::VARCHAR AS payment_status,
    cl.payment_scheduled_date
  FROM commission_liquidations cl
  CROSS JOIN LATERAL jsonb_array_elements(cl.commission_breakdown) AS breakdown
  JOIN companies c ON cl.company_id = c.id
  WHERE
    (breakdown->>'vendor_id')::UUID = p_vendor_id
    AND cl.status IN ('PAYMENT_PENDING', 'PAYMENT_IN_PROGRESS', 'APPROVED')
  ORDER BY cl.liquidation_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Vista para dashboard de comisiones
CREATE OR REPLACE VIEW vw_commissions_dashboard AS
SELECT
  cl.id AS liquidation_id,
  cl.liquidation_code,
  cl.liquidation_type,
  cl.liquidation_date,
  cl.status,
  cl.total_commission_amount,
  c.name AS company_name,
  c.slug AS company_slug,
  i.invoice_number,
  cl.payment_scheduled_date,
  jsonb_array_length(cl.commission_breakdown) AS vendor_count
FROM commission_liquidations cl
JOIN companies c ON cl.company_id = c.id
LEFT JOIN invoices i ON cl.invoice_id = i.id
ORDER BY cl.liquidation_date DESC;

-- Comentarios de documentación
COMMENT ON TABLE commission_liquidations IS 'Liquidaciones de comisiones inmediatas o mensuales (Workflow altaEmpresa - FASE 5)';
COMMENT ON COLUMN commission_liquidations.trace_id IS 'ID único de trazabilidad (COMMISSION-{UUID})';
COMMENT ON COLUMN commission_liquidations.liquidation_type IS 'Tipo: ONBOARDING_IMMEDIATE (alta empresa) o MONTHLY (ciclo mensual)';
COMMENT ON COLUMN commission_liquidations.commission_breakdown IS 'Array JSONB con breakdown de comisiones por vendedor (directas + piramidales)';
COMMENT ON COLUMN commission_liquidations.status IS 'Estado: CALCULATED, APPROVED, PAYMENT_PENDING, PAID, CANCELLED';

-- Grant permisos
-- GRANT SELECT, INSERT, UPDATE ON commission_liquidations TO attendance_system_user;
-- GRANT SELECT ON vw_commissions_dashboard TO attendance_system_user;
