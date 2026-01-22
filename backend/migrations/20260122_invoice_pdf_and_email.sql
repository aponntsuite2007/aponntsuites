-- ============================================================================
-- MIGRACIÓN: Sistema de PDF y Envío de Facturas
-- Fecha: 2026-01-22
-- Autor: Sistema Biométrico Enterprise
-- ============================================================================
--
-- CAMBIOS:
-- 1. Agregar columnas para PDF de factura
-- 2. Agregar columnas para tracking de envío por email
-- 3. Agregar FK a contracts para trazabilidad
-- 4. Crear directorio para uploads de facturas
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. COLUMNAS PARA PDF DE FACTURA
-- ============================================================================

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_pdf_path VARCHAR(500);

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_pdf_uploaded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_pdf_uploaded_by UUID;

COMMENT ON COLUMN invoices.invoice_pdf_path IS 'Ruta al archivo PDF de la factura (ej: uploads/invoices/109/FAC-2026-001.pdf)';
COMMENT ON COLUMN invoices.invoice_pdf_uploaded_at IS 'Fecha y hora de subida del PDF';
COMMENT ON COLUMN invoices.invoice_pdf_uploaded_by IS 'Usuario que subió el PDF';

-- ============================================================================
-- 2. COLUMNAS PARA ENVÍO POR EMAIL
-- ============================================================================

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS sent_to_email VARCHAR(255);

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS sent_by UUID;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS email_subject VARCHAR(500);

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS email_body TEXT;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS send_attempts INTEGER DEFAULT 0;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS last_send_error TEXT;

COMMENT ON COLUMN invoices.sent_to_email IS 'Email destino al que se envió la factura';
COMMENT ON COLUMN invoices.sent_by IS 'Usuario que envió la factura por email';
COMMENT ON COLUMN invoices.email_subject IS 'Asunto del email enviado';
COMMENT ON COLUMN invoices.email_body IS 'Cuerpo del email enviado';
COMMENT ON COLUMN invoices.send_attempts IS 'Número de intentos de envío';
COMMENT ON COLUMN invoices.last_send_error IS 'Último error de envío (si hubo)';

-- ============================================================================
-- 3. FK A CONTRACTS PARA TRAZABILIDAD COMPLETA
-- ============================================================================

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS contract_id UUID;

-- Agregar FK solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_contract') THEN
        ALTER TABLE invoices ADD CONSTRAINT fk_invoices_contract
            FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK fk_invoices_contract ya existe o no se puede crear: %', SQLERRM;
END $$;

COMMENT ON COLUMN invoices.contract_id IS 'Contrato asociado a esta factura (para trazabilidad Presupuesto→Contrato→Factura)';

-- ============================================================================
-- 4. ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON invoices(sent_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================================================
-- 5. ACTUALIZAR FACTURA DE PABLO RIVAS CON CONTRACT_ID
-- ============================================================================

UPDATE invoices i
SET contract_id = c.id
FROM contracts c
WHERE i.company_id = c.company_id
  AND i.contract_id IS NULL
  AND c.status IN ('SIGNED', 'ACTIVE');

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
