-- =====================================================
-- MIGRACIÓN: Agregar campos GPS a tabla attendances
-- Fecha: 2025-12-02
-- Descripción: Permite guardar la ubicación GPS del
--              fichaje de entrada y salida
-- =====================================================

-- Campos GPS para check-in (entrada)
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_latitude NUMERIC(10,8);
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_longitude NUMERIC(11,8);
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_accuracy NUMERIC(6,2);

-- Campos GPS para check-out (salida)
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_latitude NUMERIC(10,8);
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_longitude NUMERIC(11,8);
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_accuracy NUMERIC(6,2);

-- Índice para búsquedas geoespaciales (opcional, mejora performance)
CREATE INDEX IF NOT EXISTS idx_attendances_checkin_gps
ON attendances (check_in_latitude, check_in_longitude)
WHERE check_in_latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendances_checkout_gps
ON attendances (check_out_latitude, check_out_longitude)
WHERE check_out_latitude IS NOT NULL;

-- Comentarios descriptivos
COMMENT ON COLUMN attendances.check_in_latitude IS 'Latitud GPS al momento del fichaje de entrada';
COMMENT ON COLUMN attendances.check_in_longitude IS 'Longitud GPS al momento del fichaje de entrada';
COMMENT ON COLUMN attendances.check_in_accuracy IS 'Precisión del GPS en metros al fichar entrada';
COMMENT ON COLUMN attendances.check_out_latitude IS 'Latitud GPS al momento del fichaje de salida';
COMMENT ON COLUMN attendances.check_out_longitude IS 'Longitud GPS al momento del fichaje de salida';
COMMENT ON COLUMN attendances.check_out_accuracy IS 'Precisión del GPS en metros al fichar salida';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'check_in_latitude'
    ) THEN
        RAISE NOTICE '✅ Migración completada: Campos GPS agregados a attendances';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudieron agregar los campos GPS';
    END IF;
END $$;
