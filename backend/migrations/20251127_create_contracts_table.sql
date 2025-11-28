-- ============================================================================
-- TABLA: contracts (Contratos Digitales EULA)
-- Workflow: altaEmpresa - FASE 2
-- Descripción: Contratos digitales con firma electrónica (EULA)
-- Trace ID: ONBOARDING-{UUID}
-- ============================================================================

CREATE TABLE IF NOT EXISTS contracts (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(100) NOT NULL, -- ONBOARDING-{UUID} (mismo que budget)

  -- Relaciones
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Datos del contrato
  contract_code VARCHAR(50) UNIQUE NOT NULL, -- CTRCT-YYYY-NNNN
  contract_type VARCHAR(50) NOT NULL DEFAULT 'EULA', -- EULA (End User License Agreement)
  contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE, -- NULL = indefinido, o fecha de vencimiento

  -- Template del contrato
  template_version VARCHAR(20) NOT NULL DEFAULT '1.0', -- Versión del template EULA
  template_content TEXT NOT NULL, -- HTML del contrato con variables reemplazadas

  -- Términos comerciales (copiados del budget)
  selected_modules JSONB NOT NULL,
  contracted_employees INTEGER NOT NULL,
  total_monthly DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'TRANSFERENCIA',

  -- Firma digital
  signature_required BOOLEAN DEFAULT TRUE,
  signature_method VARCHAR(50), -- EMAIL_LINK, IN_APP, PHYSICAL
  signer_name VARCHAR(255),
  signer_email VARCHAR(255),
  signer_dni VARCHAR(50),
  signer_role VARCHAR(100), -- Cargo del firmante (ej: Gerente General)

  -- Tracking de firma
  signed_at TIMESTAMP,
  signature_ip VARCHAR(100), -- IP desde donde se firmó
  signature_hash VARCHAR(255), -- Hash SHA-256 del contrato firmado
  signature_certificate TEXT, -- Certificado digital (si aplica)

  -- Estado del contrato
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  -- DRAFT, SENT, VIEWED, SIGNED, REJECTED, EXPIRED, CANCELLED, ACTIVE

  -- Tracking de acciones
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  activated_at TIMESTAMP, -- Cuando se activa tras pago confirmado

  -- Metadata
  notes TEXT,
  legal_representative JSONB, -- { name, dni, role, email, phone }

  -- Auditoría
  created_by UUID REFERENCES aponnt_staff(staff_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_contract_status CHECK (status IN (
    'DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'ACTIVE'
  )),
  CONSTRAINT signature_required_if_signed CHECK (
    (signed_at IS NULL) OR
    (signed_at IS NOT NULL AND signature_hash IS NOT NULL AND signer_name IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_contracts_budget ON contracts(budget_id);
CREATE INDEX idx_contracts_trace_id ON contracts(trace_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_contract_code ON contracts(contract_code);
CREATE INDEX idx_contracts_signed_at ON contracts(signed_at);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_contracts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_timestamp();

-- Función para generar contract_code
CREATE OR REPLACE FUNCTION generate_contract_code()
RETURNS VARCHAR AS $$
DECLARE
  year VARCHAR(4);
  seq_num INTEGER;
  code VARCHAR(50);
BEGIN
  year := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(contract_code FROM 'CTRCT-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM contracts
  WHERE contract_code LIKE 'CTRCT-' || year || '-%';

  code := 'CTRCT-' || year || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Función para generar hash de firma
CREATE OR REPLACE FUNCTION generate_signature_hash(
  p_contract_id UUID,
  p_signer_name VARCHAR,
  p_signer_dni VARCHAR,
  p_signature_ip VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
  hash_input TEXT;
  hash_result VARCHAR;
BEGIN
  -- Concatenar datos para generar hash único
  hash_input := p_contract_id::TEXT ||
                p_signer_name ||
                p_signer_dni ||
                p_signature_ip ||
                EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::TEXT;

  -- Generar hash SHA-256 (requiere extensión pgcrypto)
  hash_result := encode(digest(hash_input, 'sha256'), 'hex');

  RETURN hash_result;
END;
$$ LANGUAGE plpgsql;

-- Función para validar contrato antes de activar
CREATE OR REPLACE FUNCTION validate_contract_for_activation(p_contract_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  contract_record RECORD;
BEGIN
  SELECT * INTO contract_record FROM contracts WHERE id = p_contract_id;

  -- Validaciones
  IF contract_record.status != 'SIGNED' THEN
    RAISE EXCEPTION 'Contract must be SIGNED before activation';
  END IF;

  IF contract_record.signed_at IS NULL THEN
    RAISE EXCEPTION 'Contract must have signature timestamp';
  END IF;

  IF contract_record.signature_hash IS NULL THEN
    RAISE EXCEPTION 'Contract must have signature hash';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-generar signature_hash al firmar
CREATE OR REPLACE FUNCTION auto_generate_signature_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si se está firmando por primera vez
  IF NEW.signed_at IS NOT NULL AND OLD.signed_at IS NULL THEN
    NEW.signature_hash := generate_signature_hash(
      NEW.id,
      NEW.signer_name,
      NEW.signer_dni,
      NEW.signature_ip
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_auto_hash
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_signature_hash();

-- Comentarios de documentación
COMMENT ON TABLE contracts IS 'Contratos digitales EULA para onboarding (Workflow altaEmpresa - FASE 2)';
COMMENT ON COLUMN contracts.trace_id IS 'ID único de trazabilidad (mismo que budget)';
COMMENT ON COLUMN contracts.contract_code IS 'Código legible del contrato (CTRCT-YYYY-NNNN)';
COMMENT ON COLUMN contracts.template_content IS 'HTML del contrato con variables reemplazadas';
COMMENT ON COLUMN contracts.signature_hash IS 'Hash SHA-256 del contrato firmado (inmutable)';
COMMENT ON COLUMN contracts.status IS 'Estado: DRAFT, SENT, VIEWED, SIGNED, REJECTED, EXPIRED, CANCELLED, ACTIVE';

-- Grant permisos
-- GRANT SELECT, INSERT, UPDATE ON contracts TO attendance_system_user;
