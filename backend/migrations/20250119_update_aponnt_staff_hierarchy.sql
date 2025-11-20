-- ===============================================================
-- MIGRACIÓN: Actualizar Tabla aponnt_staff - Jerarquía Completa
-- ===============================================================
-- Fecha: 2025-01-19
-- Propósito: Agregar jerarquía completa de roles, comisiones y configuración
-- Parte de: Sistema de Roles Jerárquicos y Comisiones Piramidales
-- ===============================================================

-- 1. Actualizar ENUM de roles (11 roles completos)
ALTER TABLE aponnt_staff DROP CONSTRAINT IF EXISTS aponnt_staff_role_check;

ALTER TABLE aponnt_staff ADD CONSTRAINT aponnt_staff_role_check CHECK (
  role IN (
    'ceo',                      -- Gerente General (ve TODO)
    'regional_sales_manager',   -- Gerente Regional de Ventas
    'regional_support_manager', -- Gerente Regional de Soporte
    'sales_supervisor',         -- Supervisor de Ventas
    'support_supervisor',       -- Supervisor de Soporte
    'sales_leader',             -- Líder de Ventas
    'sales_rep',                -- Vendedor (Representante de Ventas)
    'support_agent',            -- Agente de Soporte
    'admin',                    -- Administrador del Sistema
    'marketing',                -- Marketing
    'accounting'                -- Contabilidad/Administrativo
  )
);

-- 2. Agregar campos jerárquicos
ALTER TABLE aponnt_staff
  -- Jerárquicos (ya existen: leader_id, supervisor_id)
  ADD COLUMN IF NOT EXISTS regional_manager_id UUID REFERENCES aponnt_staff(id),
  ADD COLUMN IF NOT EXISTS ceo_id UUID REFERENCES aponnt_staff(id),

  -- Comisiones (mover desde vendors.json)
  ADD COLUMN IF NOT EXISTS sales_commission_percentage DECIMAL(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS support_commission_percentage DECIMAL(5,2) DEFAULT 0.00,

  -- Comisiones piramidales (SOLO para ventas)
  ADD COLUMN IF NOT EXISTS pyramid_commission_percentage DECIMAL(5,2) DEFAULT 0.00,

  -- Configuración (mover desde vendors.json)
  ADD COLUMN IF NOT EXISTS accepts_support_packages BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS participates_in_auctions BOOLEAN DEFAULT false,

  -- CBU (mover desde vendors.json)
  ADD COLUMN IF NOT EXISTS cbu VARCHAR(22),

  -- Rating (mover desde vendors.json)
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,

  -- Notas
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_regional_manager ON aponnt_staff(regional_manager_id);
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_ceo ON aponnt_staff(ceo_id);
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_role ON aponnt_staff(role);

-- 4. Comentarios
COMMENT ON COLUMN aponnt_staff.regional_manager_id IS 'ID del gerente regional (sales o support)';
COMMENT ON COLUMN aponnt_staff.ceo_id IS 'ID del CEO/Gerente General';
COMMENT ON COLUMN aponnt_staff.sales_commission_percentage IS 'Porcentaje de comisión por ventas (permanente)';
COMMENT ON COLUMN aponnt_staff.support_commission_percentage IS 'Porcentaje de comisión por soporte (temporal)';
COMMENT ON COLUMN aponnt_staff.pyramid_commission_percentage IS 'Porcentaje de comisión piramidal (SOLO ventas)';
COMMENT ON COLUMN aponnt_staff.accepts_support_packages IS 'Si acepta paquetes de soporte';
COMMENT ON COLUMN aponnt_staff.participates_in_auctions IS 'Si participa en subastas de empresas';
COMMENT ON COLUMN aponnt_staff.cbu IS 'CBU del vendedor para transferencias';
COMMENT ON COLUMN aponnt_staff.rating IS 'Rating promedio (0-5)';
COMMENT ON COLUMN aponnt_staff.total_ratings IS 'Cantidad de calificaciones recibidas';
COMMENT ON COLUMN aponnt_staff.notes IS 'Notas administrativas';
