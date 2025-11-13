-- =====================================================================
-- MIGRACIÓN: Crear tabla aponnt_staff (Personal de Aponnt)
-- Fecha: 2025-10-30
-- Descripción: Personal operativo de Aponnt (admin, supervisor, líder,
--              vendedor, soporte, administrativo, marketing)
-- =====================================================================

-- 1. Crear tabla aponnt_staff
CREATE TABLE IF NOT EXISTS aponnt_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos personales
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dni VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),

  -- Autenticación
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- bcrypt hash

  -- Rol y jerarquía
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'admin',
    'supervisor',
    'leader',
    'vendor',
    'soporte',
    'administrativo',
    'marketing'
  )),
  leader_id UUID REFERENCES aponnt_staff(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES aponnt_staff(id) ON DELETE SET NULL,

  -- Biométrico (Azure Face API - mismo formato que usuarios de empresas)
  face_image_url VARCHAR(500), -- URL o path de la imagen facial
  face_descriptor TEXT, -- Descriptor vectorial de Azure Face (JSON)
  face_registered_at TIMESTAMP,
  fingerprint_data TEXT, -- Para futura implementación
  biometric_enabled BOOLEAN DEFAULT false,

  -- Estado
  is_active BOOLEAN DEFAULT true,
  first_login BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  password_changed_at TIMESTAMP,

  -- Auditoría
  created_by UUID REFERENCES aponnt_staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_username ON aponnt_staff(username) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_email ON aponnt_staff(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_dni ON aponnt_staff(dni);
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_role ON aponnt_staff(role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_leader ON aponnt_staff(leader_id) WHERE leader_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_supervisor ON aponnt_staff(supervisor_id) WHERE supervisor_id IS NOT NULL;

-- 3. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_aponnt_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_aponnt_staff_updated_at
  BEFORE UPDATE ON aponnt_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_aponnt_staff_updated_at();

-- 4. Poblar usuario de testing (soporte/admin123)
INSERT INTO aponnt_staff (
  first_name,
  last_name,
  dni,
  email,
  phone,
  username,
  password,
  role,
  is_active,
  first_login,
  biometric_enabled,
  created_at
) VALUES (
  'Sistema',
  'Testing',
  '00000000',
  'soporte@aponnt.com',
  '0000000000',
  'soporte',
  '$2b$10$jDjYegaGjDBhmaow.I.tQu2bwA6gRRjyYU46Ij4Z5/LiNqqd7DRsK', -- admin123 (bcrypt)
  'admin',
  true,
  false, -- Ya no requiere cambio de contraseña
  false,
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- 5. Comentarios explicativos
COMMENT ON TABLE aponnt_staff IS 'Personal operativo de Aponnt (administradores, vendedores, soporte, etc.)';
COMMENT ON COLUMN aponnt_staff.role IS 'Rol: admin, supervisor, leader, vendor, soporte, administrativo, marketing';
COMMENT ON COLUMN aponnt_staff.leader_id IS 'ID del líder a cargo (si aplica)';
COMMENT ON COLUMN aponnt_staff.supervisor_id IS 'ID del supervisor a cargo (si aplica)';
COMMENT ON COLUMN aponnt_staff.face_descriptor IS 'Descriptor facial de Azure Face API (formato JSON)';
COMMENT ON COLUMN aponnt_staff.biometric_enabled IS 'Si está habilitado el acceso biométrico (para futuras APKs)';

-- =====================================================================
-- FIN DE MIGRACIÓN
-- =====================================================================
