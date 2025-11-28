-- ============================================================================
-- TABLA: commission_payments (Pagos de Comisiones)
-- Workflow: altaEmpresa - FASE 5 (Pago a Vendedores)
-- Descripción: Registro individual de pagos de comisiones a vendedores
-- Trace ID: PAYMENT-{UUID}
-- ============================================================================

CREATE TABLE IF NOT EXISTS commission_payments (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(100) UNIQUE NOT NULL, -- PAYMENT-{UUID}

  -- Relaciones
  liquidation_id UUID NOT NULL REFERENCES commission_liquidations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES aponnt_staff(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Datos del pago
  payment_code VARCHAR(50) UNIQUE NOT NULL, -- PAY-YYYY-MM-NNNN
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Monto
  commission_amount DECIMAL(12,2) NOT NULL CHECK (commission_amount > 0),
  tax_withholding DECIMAL(12,2) DEFAULT 0.00, -- Retenciones fiscales si aplica
  net_amount DECIMAL(12,2) NOT NULL, -- commission_amount - tax_withholding

  -- Tipo de comisión
  commission_type VARCHAR(50) NOT NULL,
  -- DIRECT_SALES, PYRAMID_L1, PYRAMID_L2, PYRAMID_L3, PYRAMID_L4, SUPPORT_TEMPORARY

  commission_percentage DECIMAL(5,2) NOT NULL, -- % aplicado

  -- Método de pago
  payment_method VARCHAR(50) NOT NULL DEFAULT 'TRANSFERENCIA',
  -- TRANSFERENCIA, VIRTUAL_WALLET, CHEQUE, EFECTIVO

  -- Datos bancarios (si es transferencia)
  bank_name VARCHAR(255),
  account_type VARCHAR(50), -- CUENTA_CORRIENTE, CAJA_AHORRO, CBU, ALIAS
  account_number VARCHAR(100),
  cbu VARCHAR(22), -- CBU de Argentina (22 dígitos)
  alias VARCHAR(100), -- Alias de CBU

  -- Datos de billetera virtual (si aplica)
  wallet_provider VARCHAR(100), -- MercadoPago, Ualá, etc.
  wallet_account VARCHAR(255),

  -- Estado del pago
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  -- PENDING, SCHEDULED, IN_PROCESS, COMPLETED, FAILED, CANCELLED, REFUNDED

  -- Tracking del pago
  scheduled_date DATE, -- Fecha programada de pago
  executed_date DATE, -- Fecha real de ejecución
  confirmation_code VARCHAR(100), -- Código de confirmación bancaria
  transaction_id VARCHAR(255), -- ID de transacción externa (banco, wallet)

  -- Errores/Problemas
  failure_reason TEXT,
  failure_date TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,

  -- Reconciliación
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMP,
  reconciled_by UUID REFERENCES aponnt_staff(id),

  -- Comprobante
  receipt_url VARCHAR(500), -- URL del comprobante de pago
  receipt_generated_at TIMESTAMP,

  -- Notificaciones al vendedor
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP,

  -- Metadata
  notes TEXT,
  payment_batch_id UUID, -- Si se paga en lote con otros pagos

  -- Auditoría
  created_by UUID REFERENCES aponnt_staff(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_payment_status CHECK (status IN (
    'PENDING', 'SCHEDULED', 'IN_PROCESS', 'COMPLETED',
    'FAILED', 'CANCELLED', 'REFUNDED'
  )),
  CONSTRAINT valid_payment_method CHECK (payment_method IN (
    'TRANSFERENCIA', 'VIRTUAL_WALLET', 'CHEQUE', 'EFECTIVO'
  )),
  CONSTRAINT valid_commission_type CHECK (commission_type IN (
    'DIRECT_SALES', 'PYRAMID_L1', 'PYRAMID_L2', 'PYRAMID_L3',
    'PYRAMID_L4', 'SUPPORT_TEMPORARY'
  )),
  CONSTRAINT valid_net_amount CHECK (net_amount = commission_amount - tax_withholding),
  CONSTRAINT bank_data_if_transfer CHECK (
    (payment_method != 'TRANSFERENCIA') OR
    (payment_method = 'TRANSFERENCIA' AND (cbu IS NOT NULL OR account_number IS NOT NULL))
  ),
  CONSTRAINT wallet_data_if_wallet CHECK (
    (payment_method != 'VIRTUAL_WALLET') OR
    (payment_method = 'VIRTUAL_WALLET' AND wallet_provider IS NOT NULL AND wallet_account IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX idx_comm_pay_vendor ON commission_payments(vendor_id);
CREATE INDEX idx_comm_pay_liquidation ON commission_payments(liquidation_id);
CREATE INDEX idx_comm_pay_company ON commission_payments(company_id);
CREATE INDEX idx_comm_pay_status ON commission_payments(status);
CREATE INDEX idx_comm_pay_date ON commission_payments(payment_date DESC);
CREATE INDEX idx_comm_pay_scheduled ON commission_payments(scheduled_date)
  WHERE status IN ('PENDING', 'SCHEDULED');
CREATE INDEX idx_comm_pay_trace_id ON commission_payments(trace_id);
CREATE INDEX idx_comm_pay_code ON commission_payments(payment_code);
CREATE INDEX idx_comm_pay_batch ON commission_payments(payment_batch_id) WHERE payment_batch_id IS NOT NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_comm_pay_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comm_pay_updated_at
  BEFORE UPDATE ON commission_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_comm_pay_timestamp();

-- Función para generar payment_code
CREATE OR REPLACE FUNCTION generate_payment_code()
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
    CAST(SUBSTRING(payment_code FROM 'PAY-\d{4}-\d{2}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM commission_payments
  WHERE payment_code LIKE 'PAY-' || year || '-' || month || '-%';

  code := 'PAY-' || year || '-' || month || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener pagos pendientes de un vendedor
CREATE OR REPLACE FUNCTION get_vendor_pending_payments_detailed(p_vendor_id UUID)
RETURNS TABLE(
  payment_id UUID,
  payment_code VARCHAR,
  liquidation_code VARCHAR,
  company_name VARCHAR,
  commission_type VARCHAR,
  commission_amount DECIMAL,
  net_amount DECIMAL,
  status VARCHAR,
  scheduled_date DATE,
  payment_method VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.payment_code,
    cl.liquidation_code,
    c.name,
    cp.commission_type,
    cp.commission_amount,
    cp.net_amount,
    cp.status,
    cp.scheduled_date,
    cp.payment_method
  FROM commission_payments cp
  JOIN commission_liquidations cl ON cp.liquidation_id = cl.id
  JOIN companies c ON cp.company_id = c.id
  WHERE
    cp.vendor_id = p_vendor_id
    AND cp.status IN ('PENDING', 'SCHEDULED', 'IN_PROCESS')
  ORDER BY cp.scheduled_date ASC NULLS FIRST, cp.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener historial de pagos de un vendedor
CREATE OR REPLACE FUNCTION get_vendor_payment_history(
  p_vendor_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  payment_id UUID,
  payment_code VARCHAR,
  payment_date DATE,
  company_name VARCHAR,
  commission_type VARCHAR,
  net_amount DECIMAL,
  status VARCHAR,
  payment_method VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.payment_code,
    cp.payment_date,
    c.name,
    cp.commission_type,
    cp.net_amount,
    cp.status,
    cp.payment_method
  FROM commission_payments cp
  JOIN companies c ON cp.company_id = c.id
  WHERE
    cp.vendor_id = p_vendor_id
    AND cp.status IN ('COMPLETED', 'REFUNDED')
  ORDER BY cp.payment_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular total de comisiones pagadas a un vendedor
CREATE OR REPLACE FUNCTION get_vendor_total_commissions(
  p_vendor_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_gross DECIMAL,
  total_net DECIMAL,
  total_tax_withheld DECIMAL,
  payment_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(commission_amount), 0.00) AS total_gross,
    COALESCE(SUM(net_amount), 0.00) AS total_net,
    COALESCE(SUM(tax_withholding), 0.00) AS total_tax_withheld,
    COUNT(*)::INTEGER AS payment_count
  FROM commission_payments
  WHERE
    vendor_id = p_vendor_id
    AND status = 'COMPLETED'
    AND (p_start_date IS NULL OR payment_date >= p_start_date)
    AND (p_end_date IS NULL OR payment_date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Función para procesar pagos programados (cron job)
CREATE OR REPLACE FUNCTION process_scheduled_payments()
RETURNS TABLE(processed_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE commission_payments
  SET
    status = 'IN_PROCESS',
    updated_at = CURRENT_TIMESTAMP
  WHERE
    status = 'SCHEDULED'
    AND scheduled_date <= CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  processed_count := v_count;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Vista para dashboard de pagos
CREATE OR REPLACE VIEW vw_commission_payments_dashboard AS
SELECT
  cp.id,
  cp.payment_code,
  cp.payment_date,
  cp.status,
  cp.commission_type,
  cp.net_amount,
  cp.payment_method,
  v.name AS vendor_name,
  v.email AS vendor_email,
  c.name AS company_name,
  cl.liquidation_code,
  cp.scheduled_date,
  cp.executed_date
FROM commission_payments cp
JOIN aponnt_staff v ON cp.vendor_id = v.id
JOIN companies c ON cp.company_id = c.id
JOIN commission_liquidations cl ON cp.liquidation_id = cl.id
ORDER BY cp.payment_date DESC;

-- Comentarios de documentación
COMMENT ON TABLE commission_payments IS 'Pagos individuales de comisiones a vendedores (Workflow altaEmpresa - FASE 5)';
COMMENT ON COLUMN commission_payments.trace_id IS 'ID único de trazabilidad (PAYMENT-{UUID})';
COMMENT ON COLUMN commission_payments.commission_type IS 'Tipo: DIRECT_SALES, PYRAMID_L1-L4, SUPPORT_TEMPORARY';
COMMENT ON COLUMN commission_payments.payment_method IS 'Método: TRANSFERENCIA, VIRTUAL_WALLET, CHEQUE, EFECTIVO';
COMMENT ON COLUMN commission_payments.status IS 'Estado: PENDING, SCHEDULED, IN_PROCESS, COMPLETED, FAILED, CANCELLED';
COMMENT ON COLUMN commission_payments.cbu IS 'CBU de Argentina (22 dígitos)';

-- Grant permisos
-- GRANT SELECT, INSERT, UPDATE ON commission_payments TO attendance_system_user;
-- GRANT SELECT ON vw_commission_payments_dashboard TO attendance_system_user;
