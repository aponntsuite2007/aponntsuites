-- =========================================================================
-- MIGRACIÓN: Agregar lead_id a tabla quotes
-- Vincula presupuestos con leads de marketing para tracking de conversión
-- =========================================================================

-- 1. Agregar columna lead_id a quotes
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES marketing_leads(id) ON DELETE SET NULL;

-- 2. Crear índice para búsquedas por lead
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id) WHERE lead_id IS NOT NULL;

-- 3. Comentario de la columna
COMMENT ON COLUMN quotes.lead_id IS 'Lead de marketing de origen (si el presupuesto se creó desde un lead)';

-- 4. Verificación
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'quotes' AND column_name = 'lead_id') THEN
        RAISE NOTICE '✅ Columna lead_id agregada exitosamente a quotes';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo agregar la columna lead_id';
    END IF;
END $$;
