-- =====================================================
-- CLEANUP: Eliminar referencias huérfanas en company_modules
-- =====================================================
-- Fecha: 2026-01-04
-- Problema: Hay filas en company_modules con system_module_id
--           que NO existen en system_modules (14 filas huérfanas)
-- =====================================================

BEGIN;

-- Mostrar qué se va a eliminar
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM company_modules cm
  LEFT JOIN system_modules sm ON cm.system_module_id = sm.id
  WHERE sm.id IS NULL;

  RAISE NOTICE '🗑️  Se eliminarán % filas huérfanas en company_modules', v_count;
  RAISE NOTICE '   (Referencias a system_module_id que ya no existen)';
END $$;

-- Eliminar referencias huérfanas
DELETE FROM company_modules
WHERE id IN (
  SELECT cm.id
  FROM company_modules cm
  LEFT JOIN system_modules sm ON cm.system_module_id = sm.id
  WHERE sm.id IS NULL
);

-- Verificar
DO $$
DECLARE
  v_remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM company_modules cm
  LEFT JOIN system_modules sm ON cm.system_module_id = sm.id
  WHERE sm.id IS NULL;

  IF v_remaining = 0 THEN
    RAISE NOTICE '✅ Todas las referencias huérfanas eliminadas';
  ELSE
    RAISE WARNING '❌ Aún quedan % referencias huérfanas', v_remaining;
  END IF;
END $$;

COMMIT;
