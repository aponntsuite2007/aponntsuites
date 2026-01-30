-- ============================================================================
-- MIGRACIÓN: Vincular quotes con pre-invoices
-- Fecha: 2026-01-28
-- ============================================================================

BEGIN;

-- 1. Agregar quote_id a aponnt_pre_invoices si no existe
ALTER TABLE aponnt_pre_invoices
ADD COLUMN IF NOT EXISTS quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_aponnt_pre_invoices_quote_id ON aponnt_pre_invoices(quote_id);

COMMENT ON COLUMN aponnt_pre_invoices.quote_id IS 'ID del presupuesto asociado para facturación inicial';

-- 2. Agregar pre_invoice_id a quotes si no existe
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS pre_invoice_id INTEGER;

COMMENT ON COLUMN quotes.pre_invoice_id IS 'ID de la pre-factura generada para este presupuesto';

-- 3. Hacer que los campos obligatorios sean opcionales para quotes sin contrato
-- (para facturación inicial donde aún no existe contrato formal)
ALTER TABLE aponnt_pre_invoices
ALTER COLUMN cliente_cuit DROP NOT NULL,
ALTER COLUMN cliente_razon_social DROP NOT NULL,
ALTER COLUMN cliente_condicion_iva DROP NOT NULL,
ALTER COLUMN periodo_desde DROP NOT NULL,
ALTER COLUMN periodo_hasta DROP NOT NULL,
ALTER COLUMN items DROP NOT NULL;

-- 4. Agregar columnas adicionales para el nuevo flujo
ALTER TABLE aponnt_pre_invoices
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by INTEGER;

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
