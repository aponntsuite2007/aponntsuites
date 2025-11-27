-- =============================================================================
-- MIGRACIÓN: Agregar multi_branch_enabled a companies
-- Fecha: 2025-11-26
-- Fase: MB-1
-- Riesgo: CERO - Solo agrega campo, no modifica comportamiento existente
-- =============================================================================
--
-- CONTEXTO:
-- Esta migración es parte del sistema Multi-Sucursal No-Invasivo.
-- El campo multi_branch_enabled actúa como feature flag para habilitar
-- o deshabilitar la funcionalidad de sucursales por empresa.
--
-- COMPORTAMIENTO:
-- - FALSE (default): La empresa NO ve opciones de sucursales en la UI
-- - TRUE: La empresa VE opciones de sucursales y puede usarlas
--
-- RETROCOMPATIBILIDAD:
-- - Todas las empresas existentes tendrán FALSE por defecto
-- - El sistema sigue funcionando exactamente igual para ellas
-- =============================================================================

-- Agregar columna con valor por defecto
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS multi_branch_enabled BOOLEAN DEFAULT false NOT NULL;

-- Agregar comentario descriptivo
COMMENT ON COLUMN companies.multi_branch_enabled IS
'Feature flag para habilitar funcionalidad multi-sucursal. FALSE = comportamiento actual (sin sucursales visibles en UI). TRUE = muestra selector de sucursales y permite gestión.';

-- Verificación: mostrar que la columna fue creada
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'multi_branch_enabled'
    ) THEN
        RAISE NOTICE '✅ Columna multi_branch_enabled creada exitosamente en companies';
    ELSE
        RAISE EXCEPTION '❌ Error: La columna multi_branch_enabled NO fue creada';
    END IF;
END $$;

-- Mostrar estado actual (todas deben tener FALSE)
-- SELECT company_id, name, multi_branch_enabled FROM companies ORDER BY company_id LIMIT 10;
