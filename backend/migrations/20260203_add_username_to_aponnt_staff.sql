-- ============================================================================
-- MIGRACIÓN: Agregar columna username a AponntStaff
-- Fecha: 2026-02-03
-- ============================================================================
-- Problema: El login en Render falla con "column username does not exist"
-- Solución: Agregar la columna username que existe en el modelo pero no en Render
-- ============================================================================

-- Agregar columna username si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'AponntStaff'
        AND column_name = 'username'
    ) THEN
        ALTER TABLE "AponntStaff"
        ADD COLUMN username VARCHAR(100) UNIQUE;

        COMMENT ON COLUMN "AponntStaff".username IS 'Username opcional para login (alternativo a email)';

        RAISE NOTICE '✅ Columna username agregada a AponntStaff';
    ELSE
        RAISE NOTICE '⚠️  Columna username ya existe en AponntStaff';
    END IF;
END $$;
