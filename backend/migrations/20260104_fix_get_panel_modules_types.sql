-- =====================================================
-- FIX: get_panel_modules - Corregir tipos de retorno
-- =====================================================
-- Fecha: 2026-01-04
-- Problema: category debería ser enum_system_modules_category no VARCHAR
-- =====================================================

BEGIN;

DROP FUNCTION IF EXISTS get_panel_modules(VARCHAR, INTEGER);

CREATE OR REPLACE FUNCTION get_panel_modules(
  p_panel_name VARCHAR,
  p_company_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  module_key VARCHAR(50),
  name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  category enum_system_modules_category,
  commercial_type TEXT,
  is_active BOOLEAN,
  base_price NUMERIC(10,2),
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vm.module_key,
    vm.name,
    vm.description,
    vm.icon,
    vm.color,
    vm.category,
    vm.commercial_type,
    CASE
      WHEN p_company_id IS NULL THEN true
      ELSE COALESCE(cm.is_active, false)
    END AS is_active,
    sm.base_price,
    vm.metadata
  FROM v_modules_by_panel vm
  INNER JOIN system_modules sm ON sm.module_key = vm.module_key
  LEFT JOIN company_modules cm ON (
    cm.company_id = p_company_id
    AND cm.system_module_id = sm.id
    AND cm.activo = true
  )
  WHERE vm.target_panel = p_panel_name
    AND vm.show_as_card = true
    AND vm.is_active = true
    AND (
      p_company_id IS NULL
      OR vm.is_core = true
      OR cm.is_active = true
    )
  ORDER BY vm.display_order, vm.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_panel_modules IS
'Obtiene módulos para un panel específico (con tipos corregidos).

Uso:
  -- Panel empresa (todos los módulos disponibles)
  SELECT * FROM get_panel_modules(''panel-empresa'');

  -- Panel empresa para compañía 11 (solo core + contratados)
  SELECT * FROM get_panel_modules(''panel-empresa'', 11);

  -- Panel administrativo
  SELECT * FROM get_panel_modules(''panel-administrativo'');';

-- Verificar
DO $$
BEGIN
  RAISE NOTICE '✅ Función get_panel_modules() recreada con tipos correctos';
  RAISE NOTICE '   - category: enum_system_modules_category (antes: VARCHAR)';
  RAISE NOTICE '   - commercial_type: TEXT';
END $$;

COMMIT;
