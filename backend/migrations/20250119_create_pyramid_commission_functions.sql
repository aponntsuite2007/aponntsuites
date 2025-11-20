-- ===============================================================
-- MIGRACIÓN: Funciones PostgreSQL para Sistema de Comisiones Piramidales
-- ===============================================================
-- Fecha: 2025-01-19
-- Propósito: Crear funciones para calcular comisiones piramidales
-- Parte de: Sistema de Roles Jerárquicos y Comisiones Piramidales
-- ===============================================================
-- IMPORTANTE: Comisiones piramidales SOLO aplican para VENTAS, NO para soporte
-- ===============================================================

-- ===============================================================
-- FUNCIÓN 1: Calcular Comisión Piramidal
-- ===============================================================
-- Calcula la comisión piramidal de un staff según su rol y subordinados
-- Jerarquía:
--   CEO (0.5%) → Regional Manager (1%) → Supervisor (1.5%) → Leader (2%) → Rep (0%)

CREATE OR REPLACE FUNCTION calculate_pyramid_commission(
  p_staff_id UUID,
  p_month INTEGER DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_role VARCHAR(50);
  v_pyramid_percentage DECIMAL(5,2);
  v_subordinates UUID[];
  v_total_sales DECIMAL(12,2);
  v_pyramid_commission DECIMAL(12,2);
BEGIN
  -- Obtener rol y % piramidal
  SELECT role, pyramid_commission_percentage INTO v_role, v_pyramid_percentage
  FROM aponnt_staff
  WHERE id = p_staff_id;

  -- Si no tiene % piramidal, retornar 0
  IF v_pyramid_percentage IS NULL OR v_pyramid_percentage = 0 THEN
    RETURN 0;
  END IF;

  -- Obtener todos los subordinados según el rol
  IF v_role = 'sales_leader' THEN
    -- Líder: solo sus vendedores directos
    SELECT ARRAY_AGG(id) INTO v_subordinates
    FROM aponnt_staff
    WHERE leader_id = p_staff_id AND role = 'sales_rep';

  ELSIF v_role = 'sales_supervisor' THEN
    -- Supervisor: todos los vendedores de sus líderes
    SELECT ARRAY_AGG(s.id) INTO v_subordinates
    FROM aponnt_staff s
    WHERE s.leader_id IN (
      SELECT id FROM aponnt_staff WHERE supervisor_id = p_staff_id AND role = 'sales_leader'
    ) AND s.role = 'sales_rep';

  ELSIF v_role = 'regional_sales_manager' THEN
    -- Gerente Regional: todos los vendedores de sus supervisores
    SELECT ARRAY_AGG(s.id) INTO v_subordinates
    FROM aponnt_staff s
    WHERE s.leader_id IN (
      SELECT l.id FROM aponnt_staff l
      WHERE l.supervisor_id IN (
        SELECT sup.id FROM aponnt_staff sup
        WHERE sup.regional_manager_id = p_staff_id AND sup.role = 'sales_supervisor'
      ) AND l.role = 'sales_leader'
    ) AND s.role = 'sales_rep';

  ELSIF v_role = 'ceo' THEN
    -- CEO: TODOS los vendedores
    SELECT ARRAY_AGG(id) INTO v_subordinates
    FROM aponnt_staff
    WHERE role = 'sales_rep';

  ELSE
    -- Roles sin comisión piramidal (support_*, admin, marketing, accounting)
    RETURN 0;
  END IF;

  -- Si no tiene subordinados, retornar 0
  IF v_subordinates IS NULL OR array_length(v_subordinates, 1) = 0 THEN
    RETURN 0;
  END IF;

  -- Calcular total de ventas de subordinados
  SELECT COALESCE(SUM(monthly_total), 0) INTO v_total_sales
  FROM companies
  WHERE assigned_vendor_id = ANY(v_subordinates)
    AND is_active = true
    AND (p_month IS NULL OR EXTRACT(MONTH FROM created_at) = p_month)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM created_at) = p_year);

  -- Calcular comisión piramidal
  v_pyramid_commission := (v_total_sales * v_pyramid_percentage) / 100;

  RETURN v_pyramid_commission;
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- FUNCIÓN 2: Obtener Reporte de Comisiones de Staff
-- ===============================================================
-- Retorna un resumen completo de comisiones de un staff (directas + piramidales)

CREATE OR REPLACE FUNCTION get_staff_commission_summary(
  p_staff_id UUID,
  p_month INTEGER DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  staff_id UUID,
  staff_name VARCHAR,
  role VARCHAR,
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
  v_role VARCHAR;
  v_companies_count INTEGER;
  v_subordinates_count INTEGER;
BEGIN
  -- Obtener datos básicos del staff
  SELECT full_name, role INTO v_staff_name, v_role
  FROM aponnt_staff
  WHERE id = p_staff_id;

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

  -- Contar subordinados directos (depende del rol)
  IF v_role IN ('sales_leader', 'support_supervisor') THEN
    SELECT COUNT(*) INTO v_subordinates_count
    FROM aponnt_staff
    WHERE leader_id = p_staff_id OR supervisor_id = p_staff_id;
  ELSIF v_role IN ('sales_supervisor') THEN
    SELECT COUNT(*) INTO v_subordinates_count
    FROM aponnt_staff
    WHERE supervisor_id = p_staff_id;
  ELSIF v_role IN ('regional_sales_manager', 'regional_support_manager') THEN
    SELECT COUNT(*) INTO v_subordinates_count
    FROM aponnt_staff
    WHERE regional_manager_id = p_staff_id;
  ELSIF v_role = 'ceo' THEN
    SELECT COUNT(*) INTO v_subordinates_count
    FROM aponnt_staff
    WHERE ceo_id = p_staff_id;
  ELSE
    v_subordinates_count := 0;
  END IF;

  -- Retornar fila con resumen
  RETURN QUERY SELECT
    p_staff_id,
    v_staff_name,
    v_role,
    v_direct_sales,
    v_direct_support,
    v_pyramid,
    v_direct_sales + v_direct_support + v_pyramid AS total,
    v_companies_count,
    v_subordinates_count;
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- FUNCIÓN 3: Actualizar Porcentajes Piramidales por Defecto
-- ===============================================================
-- Helper function para asignar porcentajes piramidales según rol

CREATE OR REPLACE FUNCTION set_default_pyramid_percentage()
RETURNS TRIGGER AS $$
BEGIN
  -- Asignar % piramidal según rol (SOLO para roles de ventas)
  CASE NEW.role
    WHEN 'sales_leader' THEN
      NEW.pyramid_commission_percentage := 2.0;
    WHEN 'sales_supervisor' THEN
      NEW.pyramid_commission_percentage := 1.5;
    WHEN 'regional_sales_manager' THEN
      NEW.pyramid_commission_percentage := 1.0;
    WHEN 'ceo' THEN
      NEW.pyramid_commission_percentage := 0.5;
    ELSE
      -- Roles sin comisión piramidal (support_*, admin, marketing, accounting)
      NEW.pyramid_commission_percentage := 0.0;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-asignar % piramidal al crear/actualizar staff
DROP TRIGGER IF EXISTS trigger_set_default_pyramid_percentage ON aponnt_staff;

CREATE TRIGGER trigger_set_default_pyramid_percentage
  BEFORE INSERT OR UPDATE OF role ON aponnt_staff
  FOR EACH ROW
  EXECUTE FUNCTION set_default_pyramid_percentage();

-- ===============================================================
-- COMENTARIOS
-- ===============================================================

COMMENT ON FUNCTION calculate_pyramid_commission(UUID, INTEGER, INTEGER) IS
  'Calcula comisión piramidal de un staff según su rol y ventas de subordinados.
   IMPORTANTE: Solo aplica para roles de VENTAS, NO para soporte.
   Parámetros: staff_id, mes (opcional), año (opcional)';

COMMENT ON FUNCTION get_staff_commission_summary(UUID, INTEGER, INTEGER) IS
  'Retorna resumen completo de comisiones de un staff (ventas + soporte + piramidal).
   Incluye conteo de empresas y subordinados.';

COMMENT ON FUNCTION set_default_pyramid_percentage() IS
  'Función trigger que auto-asigna % piramidal según rol del staff.
   Sales Leader: 2%, Supervisor: 1.5%, Regional: 1%, CEO: 0.5%';
