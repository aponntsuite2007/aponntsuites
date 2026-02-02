-- ============================================================================
-- MIGRACIÓN: Agregar campos para usuario de soporte invisible
-- Fecha: 2026-02-01
-- Descripción: Agrega campos is_system_user e is_visible para ocultar
--              el usuario "soporte" de los listados de usuarios
-- ============================================================================

-- 1. Agregar campo is_system_user (usuario del sistema para tests)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_system_user BOOLEAN DEFAULT false;

COMMENT ON COLUMN users.is_system_user IS 'Usuario del sistema para tests automáticos (ej: soporte)';

-- 2. Agregar campo is_visible (visible en listados de usuarios)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

COMMENT ON COLUMN users.is_visible IS 'Si false, el usuario no aparece en listados (invisible para la empresa)';

-- 3. Crear índice para filtrar usuarios visibles
CREATE INDEX IF NOT EXISTS idx_users_visible
ON users (company_id, is_visible)
WHERE is_visible = true;

-- 4. Verificación
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('is_system_user', 'is_visible');
