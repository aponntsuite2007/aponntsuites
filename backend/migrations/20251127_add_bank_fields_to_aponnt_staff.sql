-- ============================================================================
-- MIGRACIÓN: Agregar campos bancarios a tabla aponnt_staff
-- Workflow: altaEmpresa - FASE 5 (Pago de Comisiones)
-- Descripción: Datos bancarios para pago de comisiones a vendedores
-- ============================================================================

-- Campo 1: cbu (Clave Bancaria Uniforme - Argentina, 22 dígitos)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS cbu VARCHAR(22);

-- Campo 2: alias_cbu (Alias de CBU para transferencias)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS alias_cbu VARCHAR(100);

-- Campo 3: bank_name (Nombre del banco)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);

-- Campo 4: account_type (Tipo de cuenta bancaria)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS account_type VARCHAR(50);

-- Campo 5: account_number (Número de cuenta)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);

-- Campo 6: payment_method_preference (Método de pago preferido)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS payment_method_preference VARCHAR(50) DEFAULT 'TRANSFERENCIA';

-- Campo 7: virtual_wallet_provider (Proveedor de billetera virtual)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS virtual_wallet_provider VARCHAR(100);

-- Campo 8: virtual_wallet_account (Cuenta de billetera virtual)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS virtual_wallet_account VARCHAR(255);

-- Campo 9: tax_id (CUIT/CUIL para retenciones fiscales)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- Campo 10: tax_condition (Condición fiscal)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS tax_condition VARCHAR(100);

-- Campo 11: accepts_electronic_payment (Acepta pagos electrónicos)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS accepts_electronic_payment BOOLEAN DEFAULT TRUE;

-- Campo 12: bank_data_verified (Datos bancarios verificados)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS bank_data_verified BOOLEAN DEFAULT FALSE;

-- Campo 13: bank_data_verified_at (Fecha de verificación)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS bank_data_verified_at TIMESTAMP;

-- Campo 14: bank_data_verified_by (Quién verificó)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS bank_data_verified_by UUID REFERENCES aponnt_staff(staff_id);

-- Constraint para validar CBU (22 dígitos numéricos)
ALTER TABLE aponnt_staff
DROP CONSTRAINT IF EXISTS valid_cbu_format;

ALTER TABLE aponnt_staff
ADD CONSTRAINT valid_cbu_format CHECK (
  cbu IS NULL OR
  (LENGTH(cbu) = 22 AND cbu ~ '^[0-9]{22}$')
);

-- Constraint para validar payment_method_preference
ALTER TABLE aponnt_staff
DROP CONSTRAINT IF EXISTS valid_payment_method;

ALTER TABLE aponnt_staff
ADD CONSTRAINT valid_payment_method CHECK (
  payment_method_preference IN ('TRANSFERENCIA', 'VIRTUAL_WALLET', 'CHEQUE', 'EFECTIVO')
);

-- Constraint para validar account_type
ALTER TABLE aponnt_staff
DROP CONSTRAINT IF EXISTS valid_account_type;

ALTER TABLE aponnt_staff
ADD CONSTRAINT valid_account_type CHECK (
  account_type IS NULL OR
  account_type IN ('CUENTA_CORRIENTE', 'CAJA_AHORRO', 'CVU')
);

-- Constraint: si payment_method_preference es TRANSFERENCIA, debe tener CBU o account_number
ALTER TABLE aponnt_staff
DROP CONSTRAINT IF EXISTS bank_data_if_transfer;

ALTER TABLE aponnt_staff
ADD CONSTRAINT bank_data_if_transfer CHECK (
  payment_method_preference != 'TRANSFERENCIA' OR
  (payment_method_preference = 'TRANSFERENCIA' AND (cbu IS NOT NULL OR account_number IS NOT NULL))
);

-- Constraint: si payment_method_preference es VIRTUAL_WALLET, debe tener datos de wallet
ALTER TABLE aponnt_staff
DROP CONSTRAINT IF EXISTS wallet_data_if_wallet;

ALTER TABLE aponnt_staff
ADD CONSTRAINT wallet_data_if_wallet CHECK (
  payment_method_preference != 'VIRTUAL_WALLET' OR
  (payment_method_preference = 'VIRTUAL_WALLET' AND virtual_wallet_provider IS NOT NULL AND virtual_wallet_account IS NOT NULL)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_staff_cbu ON aponnt_staff(cbu) WHERE cbu IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_bank_verified ON aponnt_staff(bank_data_verified) WHERE bank_data_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_staff_payment_method ON aponnt_staff(payment_method_preference);

-- Función para validar CBU (algoritmo de dígito verificador)
CREATE OR REPLACE FUNCTION validate_cbu_checksum(p_cbu VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_bank_code VARCHAR(8);
  v_account_code VARCHAR(14);
  v_bank_verifier INTEGER;
  v_account_verifier INTEGER;
  v_calc_bank_verifier INTEGER;
  v_calc_account_verifier INTEGER;
  v_weights INTEGER[] := ARRAY[3, 1, 7, 9];
  v_sum INTEGER;
  v_i INTEGER;
BEGIN
  -- Validar longitud
  IF LENGTH(p_cbu) != 22 THEN
    RETURN FALSE;
  END IF;

  -- Validar que sea numérico
  IF p_cbu !~ '^[0-9]{22}$' THEN
    RETURN FALSE;
  END IF;

  -- Extraer partes
  v_bank_code := SUBSTRING(p_cbu FROM 1 FOR 7);
  v_bank_verifier := CAST(SUBSTRING(p_cbu FROM 8 FOR 1) AS INTEGER);
  v_account_code := SUBSTRING(p_cbu FROM 9 FOR 13);
  v_account_verifier := CAST(SUBSTRING(p_cbu FROM 22 FOR 1) AS INTEGER);

  -- Calcular dígito verificador del banco (primeros 7 dígitos)
  v_sum := 0;
  FOR v_i IN 1..7 LOOP
    v_sum := v_sum + (CAST(SUBSTRING(v_bank_code FROM v_i FOR 1) AS INTEGER) * v_weights[((v_i - 1) % 4) + 1]);
  END LOOP;
  v_calc_bank_verifier := (10 - (v_sum % 10)) % 10;

  -- Calcular dígito verificador de la cuenta (13 dígitos)
  v_sum := 0;
  FOR v_i IN 1..13 LOOP
    v_sum := v_sum + (CAST(SUBSTRING(v_account_code FROM v_i FOR 1) AS INTEGER) * v_weights[((v_i - 1) % 4) + 1]);
  END LOOP;
  v_calc_account_verifier := (10 - (v_sum % 10)) % 10;

  -- Validar ambos dígitos verificadores
  RETURN (v_calc_bank_verifier = v_bank_verifier) AND (v_calc_account_verifier = v_account_verifier);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener vendedores con datos bancarios completos
CREATE OR REPLACE FUNCTION get_staff_with_complete_bank_data()
RETURNS TABLE(
  staff_id UUID,
  staff_name VARCHAR,
  email VARCHAR,
  payment_method VARCHAR,
  cbu VARCHAR,
  bank_name VARCHAR,
  bank_data_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    name,
    aponnt_staff.email,
    payment_method_preference,
    aponnt_staff.cbu,
    aponnt_staff.bank_name,
    aponnt_staff.bank_data_verified
  FROM aponnt_staff
  WHERE
    is_active = TRUE
    AND (
      (payment_method_preference = 'TRANSFERENCIA' AND aponnt_staff.cbu IS NOT NULL) OR
      (payment_method_preference = 'VIRTUAL_WALLET' AND virtual_wallet_provider IS NOT NULL) OR
      payment_method_preference IN ('CHEQUE', 'EFECTIVO')
    )
  ORDER BY name;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener vendedores SIN datos bancarios
CREATE OR REPLACE FUNCTION get_staff_without_bank_data()
RETURNS TABLE(
  staff_id UUID,
  staff_name VARCHAR,
  email VARCHAR,
  role VARCHAR,
  payment_method VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    name,
    aponnt_staff.email,
    aponnt_staff.role,
    payment_method_preference
  FROM aponnt_staff
  WHERE
    is_active = TRUE
    AND (
      (payment_method_preference = 'TRANSFERENCIA' AND aponnt_staff.cbu IS NULL AND account_number IS NULL) OR
      (payment_method_preference = 'VIRTUAL_WALLET' AND (virtual_wallet_provider IS NULL OR virtual_wallet_account IS NULL))
    )
  ORDER BY name;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar datos bancarios
CREATE OR REPLACE FUNCTION verify_staff_bank_data(
  p_staff_id UUID,
  p_verified_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_cbu VARCHAR;
BEGIN
  -- Obtener CBU
  SELECT cbu INTO v_cbu
  FROM aponnt_staff
  WHERE id = p_staff_id;

  -- Si tiene CBU, validar checksum
  IF v_cbu IS NOT NULL THEN
    IF NOT validate_cbu_checksum(v_cbu) THEN
      RAISE EXCEPTION 'Invalid CBU checksum for staff %', p_staff_id;
    END IF;
  END IF;

  -- Marcar como verificado
  UPDATE aponnt_staff
  SET
    bank_data_verified = TRUE,
    bank_data_verified_at = CURRENT_TIMESTAMP,
    bank_data_verified_by = p_verified_by
  WHERE id = p_staff_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Comentarios de documentación
COMMENT ON COLUMN aponnt_staff.cbu IS 'CBU de Argentina (22 dígitos numéricos con dígitos verificadores)';
COMMENT ON COLUMN aponnt_staff.alias_cbu IS 'Alias del CBU para transferencias simplificadas';
COMMENT ON COLUMN aponnt_staff.bank_name IS 'Nombre del banco donde tiene la cuenta';
COMMENT ON COLUMN aponnt_staff.account_type IS 'Tipo de cuenta: CUENTA_CORRIENTE, CAJA_AHORRO, CVU';
COMMENT ON COLUMN aponnt_staff.payment_method_preference IS 'Método de pago preferido: TRANSFERENCIA, VIRTUAL_WALLET, CHEQUE, EFECTIVO';
COMMENT ON COLUMN aponnt_staff.virtual_wallet_provider IS 'Proveedor de billetera virtual: MercadoPago, Ualá, etc.';
COMMENT ON COLUMN aponnt_staff.tax_id IS 'CUIT/CUIL para retenciones fiscales';
COMMENT ON COLUMN aponnt_staff.bank_data_verified IS 'TRUE si los datos bancarios fueron verificados por admin';

-- Grant permisos
-- GRANT SELECT, UPDATE ON aponnt_staff TO attendance_system_user;
