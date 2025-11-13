-- =====================================================================
-- MIGRACIÓN SIMPLIFICADA: Crear tabla partners (base mínima)
-- Fecha: 2025-10-30
-- Descripción: Crea SOLO la tabla partners con los campos esenciales
-- =====================================================================

-- 1. Crear tabla partners (base mínima)
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos personales básicos
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dni VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),

  -- Rol profesional
  partner_role_id UUID, -- Se vinculará después cuando exista la tabla partner_roles

  -- Estado de aprobación
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  approved_by UUID, -- ID del staff que aprobó (se vinculará después)
  approved_at TIMESTAMP,

  -- Estado general
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Crear índices básicos
CREATE INDEX IF NOT EXISTS idx_partners_dni ON partners(dni);
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_approval_status ON partners(approval_status) WHERE is_active = true;

-- 3. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_partners_updated_at();

-- 4. Comentarios
COMMENT ON TABLE partners IS 'Asociados profesionales (médicos, abogados, etc.)';
COMMENT ON COLUMN partners.approval_status IS 'Estado: pending, approved, denied';
COMMENT ON COLUMN partners.approved_by IS 'ID del staff de Aponnt que aprobó (UUID de aponnt_staff)';

-- =====================================================================
-- FIN DE MIGRACIÓN
-- =====================================================================
