-- ===============================================================
-- MIGRACIÓN: FIX SISTEMA COMPLETO DE COMISIONES PIRAMIDALES
-- ===============================================================
-- Fecha: 2025-01-22
-- Propósito: Agregar campos faltantes y actualizar funciones PostgreSQL
-- Parte de: Completar Sistema de Roles Jerárquicos y Comisiones
-- ===============================================================

-- ===============================================================
-- PASO 1: Agregar campos faltantes
-- ===============================================================

-- Agregar pyramid_commission_percentage a aponnt_staff_roles
ALTER TABLE aponnt_staff_roles
ADD COLUMN IF NOT EXISTS pyramid_commission_percentage DECIMAL(5,2) DEFAULT 0.00
CHECK (pyramid_commission_percentage >= 0 AND pyramid_commission_percentage <= 100);

COMMENT ON COLUMN aponnt_staff_roles.pyramid_commission_percentage IS
'Porcentaje de comisión piramidal por defecto para este rol (0-100%). Ej: Leader=2%, Supervisor=1.5%, Regional=1%, CEO=0.5%';

-- Agregar pyramid_commission_percentage_override a aponnt_staff (override opcional por persona)
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS pyramid_commission_percentage_override DECIMAL(5,2) DEFAULT NULL
CHECK (pyramid_commission_percentage_override IS NULL OR (pyramid_commission_percentage_override >= 0 AND pyramid_commission_percentage_override <= 100));

COMMENT ON COLUMN aponnt_staff.pyramid_commission_percentage_override IS
'Override opcional del % piramidal del rol. Si es NULL, usa el % del rol. Si tiene valor, override del rol.';

-- ===============================================================
-- PASO 2: Poblar porcentajes por defecto según rol
-- ===============================================================

-- Actualizar roles de VENTAS con sus porcentajes piramidales
UPDATE aponnt_staff_roles
SET pyramid_commission_percentage = CASE role_code
  WHEN 'GG' THEN 0.5  -- CEO (Gerente General)
  WHEN 'GR' THEN 1.0  -- Gerente Regional
  WHEN 'SV' THEN 1.5  -- Supervisor de Ventas
  WHEN 'LV' THEN 2.0  -- Líder de Equipo
  WHEN 'VEND' THEN 0.0  -- Vendedor (no tiene comisión piramidal, solo directa)
  ELSE 0.0  -- Todos los demás roles (admin, desarrollo, externos) NO tienen comisión piramidal
END
WHERE role_code IN ('GG', 'GR', 'SV', 'LV', 'VEND') OR role_area = 'ventas';

-- Asegurar que roles NO de ventas tengan 0%
UPDATE aponnt_staff_roles
SET pyramid_commission_percentage = 0.0
WHERE role_area != 'ventas' OR role_area IS NULL;

-- ===============================================================
-- PASO 3: Crear VIEW para obtener % piramidal efectivo
-- ===============================================================

CREATE OR REPLACE VIEW v_staff_pyramid_percentage AS
SELECT
  s.staff_id,
  s.first_name,
  s.last_name,
  s.role_id,
  r.role_code,
  r.role_name,
  r.pyramid_commission_percentage AS role_default_percentage,
  s.pyramid_commission_percentage_override AS staff_override_percentage,
  COALESCE(s.pyramid_commission_percentage_override, r.pyramid_commission_percentage, 0.0) AS effective_pyramid_percentage,
  s.is_active
FROM aponnt_staff s
INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id;

COMMENT ON VIEW v_staff_pyramid_percentage IS
'Vista que calcula el % piramidal efectivo de cada staff: usa override si existe, sino usa % del rol, sino 0%';

-- ===============================================================
-- PASO 4: ACTUALIZAR FUNCIONES POSTGRESQL (SCHEMA CORRECTO)
-- ===============================================================

-- DROP funciones viejas si existen
DROP FUNCTION IF EXISTS calculate_pyramid_commission(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_staff_commission_summary(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS set_default_pyramid_percentage();

-- ===============================================================
-- FUNCIÓN 1: Calcular Comisión Piramidal (ACTUALIZADA)
-- ===============================================================

CREATE OR REPLACE FUNCTION calculate_pyramid_commission(
  p_staff_id UUID,
  p_month INTEGER DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_pyramid_percentage DECIMAL(5,2);
  v_role_code VARCHAR(10);
  v_total_sales DECIMAL(12,2);
  v_pyramid_commission DECIMAL(12,2);
BEGIN
  -- Obtener % piramidal efectivo y rol
  SELECT effective_pyramid_percentage, role_code
  INTO v_pyramid_percentage, v_role_code
  FROM v_staff_pyramid_percentage
  WHERE staff_id = p_staff_id AND is_active = true;

  -- Si no se encontró el staff o no está activo
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Si no tiene % piramidal, retornar 0
  IF v_pyramid_percentage IS NULL OR v_pyramid_percentage = 0 THEN
    RETURN 0;
  END IF;

  -- Calcular total de ventas de subordinados según jerarquía
  -- Usa recursive CTE para obtener TODOS los subordinados en la jerarquía
  WITH RECURSIVE subordinates_hierarchy AS (
    -- Caso base: el staff mismo
    SELECT staff_id, 1 as depth
    FROM aponnt_staff
    WHERE staff_id = p_staff_id

    UNION ALL

    -- Caso recursivo: todos los que reportan a alguien en la jerarquía
    SELECT s.staff_id, sh.depth + 1
    FROM aponnt_staff s
    INNER JOIN subordinates_hierarchy sh ON s.reports_to_staff_id = sh.staff_id
    WHERE s.is_active = true
      AND sh.depth < 10  -- Límite de profundidad para evitar loops infinitos
  )
  SELECT COALESCE(SUM(c.sales_commission_usd), 0) INTO v_total_sales
  FROM companies c
  WHERE c.assigned_vendor_id IN (SELECT staff_id FROM subordinates_hierarchy WHERE staff_id != p_staff_id)
    AND c.is_active = true
    AND (p_month IS NULL OR EXTRACT(MONTH FROM c.created_at) = p_month)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year);

  -- Calcular comisión piramidal
  v_pyramid_commission := (v_total_sales * v_pyramid_percentage) / 100;

  RETURN v_pyramid_commission;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_pyramid_commission(UUID, INTEGER, INTEGER) IS
  'Calcula comisión piramidal de un staff según su rol y ventas de TODOS sus subordinados (recursivo).
   IMPORTANTE: Solo aplica para roles de VENTAS, NO para soporte.
   Parámetros: staff_id, mes (opcional), año (opcional)';

-- ===============================================================
-- FUNCIÓN 2: Obtener Reporte de Comisiones de Staff (ACTUALIZADA)
-- ===============================================================

CREATE OR REPLACE FUNCTION get_staff_commission_summary(
  p_staff_id UUID,
  p_month INTEGER DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  staff_id UUID,
  staff_name VARCHAR,
  role_code VARCHAR,
  role_name VARCHAR,
  direct_sales_commission DECIMAL(12,2),
  direct_support_commission DECIMAL(12,2),
  pyramid_commission DECIMAL(12,2),
  total_commission DECIMAL(12,2),
  companies_count INTEGER,
  subordinates_count INTEGER
) AS $$
DECLARE
  v_direct_sales DECIMAL(12,2);
  v_direct_support DECIMAL(12,2);
  v_pyramid DECIMAL(12,2);
  v_staff_name VARCHAR;
  v_role_code VARCHAR;
  v_role_name VARCHAR;
  v_companies_count INTEGER;
  v_subordinates_count INTEGER;
BEGIN
  -- Obtener datos básicos del staff
  SELECT s.first_name || ' ' || s.last_name, r.role_code, r.role_name
  INTO v_staff_name, v_role_code, v_role_name
  FROM aponnt_staff s
  INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
  WHERE s.staff_id = p_staff_id;

  -- Si no se encontró el staff
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calcular comisiones directas de ventas
  SELECT COALESCE(SUM(sales_commission_usd), 0) INTO v_direct_sales
  FROM companies
  WHERE assigned_vendor_id = p_staff_id
    AND is_active = true
    AND (p_month IS NULL OR EXTRACT(MONTH FROM created_at) = p_month)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM created_at) = p_year);

  -- Calcular comisiones directas de soporte
  SELECT COALESCE(SUM(support_commission_usd), 0) INTO v_direct_support
  FROM companies
  WHERE support_vendor_id = p_staff_id
    AND is_active = true
    AND (p_month IS NULL OR EXTRACT(MONTH FROM created_at) = p_month)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM created_at) = p_year);

  -- Calcular comisión piramidal
  v_pyramid := calculate_pyramid_commission(p_staff_id, p_month, p_year);

  -- Contar empresas asignadas
  SELECT COUNT(*) INTO v_companies_count
  FROM companies
  WHERE (assigned_vendor_id = p_staff_id OR support_vendor_id = p_staff_id)
    AND is_active = true;

  -- Contar subordinados directos
  SELECT COUNT(*) INTO v_subordinates_count
  FROM aponnt_staff
  WHERE reports_to_staff_id = p_staff_id
    AND is_active = true;

  -- Retornar fila con resumen
  RETURN QUERY SELECT
    p_staff_id,
    v_staff_name,
    v_role_code,
    v_role_name,
    v_direct_sales,
    v_direct_support,
    v_pyramid,
    v_direct_sales + v_direct_support + v_pyramid AS total,
    v_companies_count,
    v_subordinates_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_staff_commission_summary(UUID, INTEGER, INTEGER) IS
  'Retorna resumen completo de comisiones de un staff (ventas + soporte + piramidal).
   Incluye conteo de empresas y subordinados directos.';

-- ===============================================================
-- FUNCIÓN 3: Obtener jerarquía completa de subordinados
-- ===============================================================

CREATE OR REPLACE FUNCTION get_staff_subordinates_recursive(
  p_staff_id UUID,
  p_max_depth INTEGER DEFAULT 10
)
RETURNS TABLE (
  staff_id UUID,
  staff_name VARCHAR,
  role_code VARCHAR,
  level INTEGER,
  depth INTEGER,
  path TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates_hierarchy AS (
    -- Caso base: el staff mismo (depth = 0)
    SELECT
      s.staff_id,
      s.first_name || ' ' || s.last_name AS staff_name,
      r.role_code,
      s.level,
      0 AS depth,
      ARRAY[s.staff_id] AS path
    FROM aponnt_staff s
    INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
    WHERE s.staff_id = p_staff_id

    UNION ALL

    -- Caso recursivo: todos los que reportan directamente
    SELECT
      s.staff_id,
      s.first_name || ' ' || s.last_name AS staff_name,
      r.role_code,
      s.level,
      sh.depth + 1,
      sh.path || s.staff_id
    FROM aponnt_staff s
    INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
    INNER JOIN subordinates_hierarchy sh ON s.reports_to_staff_id = sh.staff_id
    WHERE s.is_active = true
      AND sh.depth < p_max_depth
      AND NOT (s.staff_id = ANY(sh.path))  -- Evitar loops
  )
  SELECT * FROM subordinates_hierarchy
  WHERE depth > 0  -- Excluir al staff mismo
  ORDER BY depth, staff_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_staff_subordinates_recursive(UUID, INTEGER) IS
  'Retorna TODOS los subordinados de un staff de forma recursiva (jerarquía completa).
   Incluye depth (profundidad) y path (ruta jerárquica) para evitar loops infinitos.';

-- ===============================================================
-- PASO 5: Crear índices para optimizar queries de comisiones
-- ===============================================================

CREATE INDEX IF NOT EXISTS idx_companies_assigned_vendor_active
ON companies(assigned_vendor_id, is_active)
WHERE assigned_vendor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_support_vendor_active
ON companies(support_vendor_id, is_active)
WHERE support_vendor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_aponnt_staff_reports_to_active
ON aponnt_staff(reports_to_staff_id, is_active)
WHERE reports_to_staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_aponnt_staff_role_active
ON aponnt_staff(role_id, is_active);

-- ===============================================================
-- PASO 6: GRANTS (permisos)
-- ===============================================================

-- Grants a la vista
GRANT SELECT ON v_staff_pyramid_percentage TO PUBLIC;

-- ===============================================================
-- FIN DE MIGRACIÓN
-- ===============================================================

-- Log de éxito
DO $$
BEGIN
  RAISE NOTICE 'Migracion de Sistema de Comisiones Piramidales COMPLETADA';
  RAISE NOTICE '   Agregado pyramid_commission_percentage a aponnt_staff_roles';
  RAISE NOTICE '   Agregado pyramid_commission_percentage_override a aponnt_staff';
  RAISE NOTICE '   Poblados porcentajes por defecto';
  RAISE NOTICE '   Creada vista v_staff_pyramid_percentage';
  RAISE NOTICE '   Actualizadas funciones PostgreSQL';
  RAISE NOTICE '   Creada funcion get_staff_subordinates_recursive';
  RAISE NOTICE '   Creados indices de optimizacion';
END $$;
