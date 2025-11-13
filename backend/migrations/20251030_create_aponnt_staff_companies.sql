-- =====================================================================
-- MIGRACIÓN: Crear tabla aponnt_staff_companies
-- Fecha: 2025-10-30
-- Descripción: Relación many-to-many entre staff de Aponnt y empresas
--              cliente. Define qué vendedores/soportes atienden qué empresas.
-- =====================================================================

-- 1. Crear tabla aponnt_staff_companies
CREATE TABLE IF NOT EXISTS aponnt_staff_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  staff_id UUID NOT NULL REFERENCES aponnt_staff(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Metadata
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES aponnt_staff(id) ON DELETE SET NULL, -- Quién asignó
  assignment_note TEXT, -- Notas sobre la asignación

  -- Estado
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMP,
  deactivated_by UUID REFERENCES aponnt_staff(id) ON DELETE SET NULL,

  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraint: Un staff no puede estar asignado 2 veces a la misma empresa
  UNIQUE(staff_id, company_id)
);

-- 2. Crear índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_staff_companies_staff ON aponnt_staff_companies(staff_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_companies_company ON aponnt_staff_companies(company_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_companies_assigned_by ON aponnt_staff_companies(assigned_by);
CREATE INDEX IF NOT EXISTS idx_staff_companies_active ON aponnt_staff_companies(is_active, assigned_at);

-- 3. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_staff_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_companies_updated_at
  BEFORE UPDATE ON aponnt_staff_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_companies_updated_at();

-- 4. Función helper: Obtener empresas de un staff
CREATE OR REPLACE FUNCTION get_staff_companies(p_staff_id UUID)
RETURNS TABLE (
  company_id INTEGER,
  company_name VARCHAR,
  company_slug VARCHAR,
  assigned_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.company_id,
    c.name,
    c.slug,
    sc.assigned_at
  FROM aponnt_staff_companies sc
  JOIN companies c ON sc.company_id = c.company_id
  WHERE sc.staff_id = p_staff_id
    AND sc.is_active = true
    AND c.is_active = true
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

-- 5. Función helper: Verificar si un staff puede ver una empresa
CREATE OR REPLACE FUNCTION staff_can_view_company(
  p_staff_id UUID,
  p_staff_role VARCHAR,
  p_company_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_view BOOLEAN;
BEGIN
  -- Admins y supervisores pueden ver todas las empresas
  IF p_staff_role IN ('admin', 'supervisor') THEN
    RETURN true;
  END IF;

  -- Líderes pueden ver empresas de su equipo
  IF p_staff_role = 'leader' THEN
    SELECT EXISTS (
      SELECT 1
      FROM aponnt_staff_companies sc
      JOIN aponnt_staff s ON sc.staff_id = s.id
      WHERE sc.company_id = p_company_id
        AND sc.is_active = true
        AND (
          s.id = p_staff_id OR
          s.leader_id = p_staff_id
        )
    ) INTO v_can_view;
    RETURN v_can_view;
  END IF;

  -- Vendedores, soporte, etc: Solo sus empresas asignadas
  SELECT EXISTS (
    SELECT 1
    FROM aponnt_staff_companies
    WHERE staff_id = p_staff_id
      AND company_id = p_company_id
      AND is_active = true
  ) INTO v_can_view;

  RETURN v_can_view;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentarios explicativos
COMMENT ON TABLE aponnt_staff_companies IS 'Relación many-to-many: Staff de Aponnt → Empresas cliente';
COMMENT ON COLUMN aponnt_staff_companies.staff_id IS 'ID del staff (vendedor, soporte, etc.)';
COMMENT ON COLUMN aponnt_staff_companies.company_id IS 'ID de la empresa cliente';
COMMENT ON COLUMN aponnt_staff_companies.assigned_by IS 'Quién realizó la asignación (supervisor/admin)';
COMMENT ON FUNCTION get_staff_companies IS 'Retorna lista de empresas asignadas a un staff';
COMMENT ON FUNCTION staff_can_view_company IS 'Verifica permisos multi-tenant para ver una empresa';

-- =====================================================================
-- FIN DE MIGRACIÓN
-- =====================================================================
