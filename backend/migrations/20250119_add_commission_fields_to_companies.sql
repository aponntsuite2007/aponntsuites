-- ===============================================================
-- MIGRACIÓN: Agregar Campos de Comisiones a Tabla Companies
-- ===============================================================
-- Fecha: 2025-01-19
-- Propósito: Agregar campos para vendedores y comisiones USD
-- Parte de: Sistema de Roles Jerárquicos y Comisiones Piramidales
-- ===============================================================

-- Agregar columnas de vendedores y comisiones
ALTER TABLE companies
  -- Vendedores asignados
  ADD COLUMN IF NOT EXISTS created_by_staff_id UUID REFERENCES aponnt_staff(id),
  ADD COLUMN IF NOT EXISTS assigned_vendor_id UUID REFERENCES aponnt_staff(id),
  ADD COLUMN IF NOT EXISTS support_vendor_id UUID REFERENCES aponnt_staff(id),

  -- Comisiones USD (calculadas automáticamente)
  ADD COLUMN IF NOT EXISTS sales_commission_usd DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS support_commission_usd DECIMAL(12,2) DEFAULT 0.00;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_companies_assigned_vendor ON companies(assigned_vendor_id);
CREATE INDEX IF NOT EXISTS idx_companies_support_vendor ON companies(support_vendor_id);
CREATE INDEX IF NOT EXISTS idx_companies_created_by_staff ON companies(created_by_staff_id);

-- Comentarios
COMMENT ON COLUMN companies.created_by_staff_id IS 'ID del staff que creó la empresa';
COMMENT ON COLUMN companies.assigned_vendor_id IS 'Vendedor asignado a VENTAS (comisión permanente)';
COMMENT ON COLUMN companies.support_vendor_id IS 'Vendedor asignado a SOPORTE (comisión temporal)';
COMMENT ON COLUMN companies.sales_commission_usd IS 'Comisión en USD para vendedor de venta';
COMMENT ON COLUMN companies.support_commission_usd IS 'Comisión en USD para vendedor de soporte';
