-- ============================================================================
-- MIGRACIÓN: Agregar campo is_main a tabla branches
-- Fecha: 2025-12-01
-- Propósito: Identificar sucursal principal que no puede ser borrada
-- ============================================================================

-- 1. Agregar columna is_main si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'branches' AND column_name = 'is_main'
    ) THEN
        ALTER TABLE branches ADD COLUMN is_main BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Columna is_main agregada a branches';
    ELSE
        RAISE NOTICE '⚠️ Columna is_main ya existe en branches';
    END IF;
END $$;

-- 2. Marcar las sucursales existentes llamadas "CENTRAL" como principales
UPDATE branches
SET is_main = true
WHERE UPPER(name) = 'CENTRAL' AND is_main IS NOT true;

-- 3. Verificar resultado
SELECT company_id, id, name, country, state_province, is_main
FROM branches
ORDER BY company_id, is_main DESC;
