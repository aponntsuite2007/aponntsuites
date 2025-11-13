-- =====================================================================
-- MIGRACIÓN: Modificar tabla partners - Agregar autenticación y biométrico
-- Fecha: 2025-10-30
-- Descripción: Agrega campos de autenticación (username, password) y
--              biométrico (Azure Face API) a la tabla partners existente
-- =====================================================================

-- 1. Agregar columnas de autenticación
ALTER TABLE partners ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS password VARCHAR(255); -- bcrypt hash
ALTER TABLE partners ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- 2. Agregar columnas biométricas (Azure Face API - mismo formato que users y staff)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS face_image_url VARCHAR(500); -- URL o path
ALTER TABLE partners ADD COLUMN IF NOT EXISTS face_descriptor TEXT; -- Descriptor vectorial de Azure Face
ALTER TABLE partners ADD COLUMN IF NOT EXISTS face_registered_at TIMESTAMP;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS fingerprint_data TEXT; -- Para futura implementación
ALTER TABLE partners ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT false;

-- 3. Agregar campos de aprobación mejorados
ALTER TABLE partners ADD COLUMN IF NOT EXISTS denial_reason TEXT; -- Motivo de denegación
ALTER TABLE partners ADD COLUMN IF NOT EXISTS approval_notes TEXT; -- Notas del aprobador

-- 4. Crear índices para autenticación
CREATE INDEX IF NOT EXISTS idx_partners_username ON partners(username) WHERE approval_status = 'approved' AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_partners_email_auth ON partners(email) WHERE approval_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_partners_dni_auth ON partners(dni);
CREATE INDEX IF NOT EXISTS idx_partners_approval_status ON partners(approval_status) WHERE is_active = true;

-- 5. Actualizar partners existentes aprobados: asignar username = dni
UPDATE partners
SET username = dni
WHERE approval_status = 'approved'
  AND username IS NULL
  AND dni IS NOT NULL;

-- 6. Función helper: Generar contraseña temporal aleatoria
CREATE OR REPLACE FUNCTION generate_temp_password()
RETURNS VARCHAR AS $$
DECLARE
  chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result VARCHAR := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. Función trigger: Auto-asignar username al aprobar
CREATE OR REPLACE FUNCTION auto_assign_partner_username()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está aprobando y no tiene username, asignar DNI
  IF NEW.approval_status = 'approved' AND OLD.approval_status != 'approved' THEN
    IF NEW.username IS NULL AND NEW.dni IS NOT NULL THEN
      NEW.username := NEW.dni;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_assign_partner_username
  BEFORE UPDATE ON partners
  FOR EACH ROW
  WHEN (NEW.approval_status IS DISTINCT FROM OLD.approval_status)
  EXECUTE FUNCTION auto_assign_partner_username();

-- 8. Función para verificar si partner puede loguearse
CREATE OR REPLACE FUNCTION partner_can_login(p_username VARCHAR)
RETURNS TABLE (
  id UUID,
  username VARCHAR,
  password VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR,
  partner_role_id UUID,
  approval_status VARCHAR,
  first_login BOOLEAN,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.password,
    p.first_name,
    p.last_name,
    p.email,
    p.partner_role_id,
    p.approval_status::VARCHAR,
    p.first_login,
    p.is_active
  FROM partners p
  WHERE (p.username = p_username OR p.dni = p_username)
    AND p.approval_status = 'approved'
    AND p.is_active = true
    AND p.password IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 9. Función para obtener partners pendientes de aprobación
CREATE OR REPLACE FUNCTION get_pending_partners()
RETURNS TABLE (
  id UUID,
  first_name VARCHAR,
  last_name VARCHAR,
  dni VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  partner_role_id UUID,
  role_name VARCHAR,
  created_at TIMESTAMP,
  documents_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.dni,
    p.email,
    p.phone,
    p.partner_role_id,
    pr.name AS role_name,
    p.created_at,
    COUNT(pd.id) AS documents_count
  FROM partners p
  LEFT JOIN partner_roles pr ON p.partner_role_id = pr.id
  LEFT JOIN partner_documents pd ON p.id = pd.partner_id
  WHERE p.approval_status = 'pending'
    AND p.is_active = true
  GROUP BY p.id, pr.name
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 10. Comentarios explicativos
COMMENT ON COLUMN partners.username IS 'Usuario para login (generalmente DNI)';
COMMENT ON COLUMN partners.password IS 'Contraseña hasheada con bcrypt';
COMMENT ON COLUMN partners.first_login IS 'Si debe cambiar contraseña en primer login';
COMMENT ON COLUMN partners.face_descriptor IS 'Descriptor facial de Azure Face API (formato JSON)';
COMMENT ON COLUMN partners.biometric_enabled IS 'Si está habilitado el acceso biométrico (para futuras APKs)';
COMMENT ON COLUMN partners.denial_reason IS 'Motivo de denegación de la solicitud';
COMMENT ON FUNCTION generate_temp_password IS 'Genera contraseña temporal aleatoria de 12 caracteres';
COMMENT ON FUNCTION partner_can_login IS 'Verifica credenciales y estado de aprobación de partner';
COMMENT ON FUNCTION get_pending_partners IS 'Retorna lista de partners pendientes de aprobación con metadata';

-- =====================================================================
-- FIN DE MIGRACIÓN
-- =====================================================================
