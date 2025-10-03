-- ================================================
-- MIGRACIÓN: Sistema de Autorización Fuera de Turno
-- Fecha: 01/10/2025
-- Objetivo: Agregar campos para autorizadores jerárquicos
-- ================================================

BEGIN;

-- ================================================
-- 1. TABLA USERS - Campos de Autorizador
-- ================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS can_authorize_late_arrivals BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS authorized_departments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_preference_late_arrivals VARCHAR(20) DEFAULT 'email' CHECK (notification_preference_late_arrivals IN ('email', 'whatsapp', 'both'));

-- Crear índice para búsquedas de autorizadores
CREATE INDEX IF NOT EXISTS idx_users_can_authorize
  ON users(can_authorize_late_arrivals, is_active)
  WHERE can_authorize_late_arrivals = TRUE;

-- Índice GIN para búsquedas en authorized_departments
CREATE INDEX IF NOT EXISTS idx_users_authorized_departments_gin
  ON users USING GIN (authorized_departments);

-- Comentarios para documentación
COMMENT ON COLUMN users.can_authorize_late_arrivals IS 'Indica si el usuario puede autorizar llegadas fuera de tolerancia';
COMMENT ON COLUMN users.authorized_departments IS 'Array de department_ids que este usuario puede autorizar (ej: [1,3,5])';
COMMENT ON COLUMN users.notification_preference_late_arrivals IS 'Canal preferido para recibir notificaciones de autorización';

-- ================================================
-- 2. TABLA ATTENDANCES - Campos de Autorización
-- ================================================
ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS authorization_status VARCHAR(20) CHECK (authorization_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS authorization_token VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS authorized_by_user_id UUID REFERENCES users(user_id),
  ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS authorization_notes TEXT,
  ADD COLUMN IF NOT EXISTS notified_authorizers JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS authorization_requested_at TIMESTAMP;

-- Índices para búsquedas de autorizaciones pendientes
CREATE INDEX IF NOT EXISTS idx_attendances_authorization_status
  ON attendances(authorization_status, authorization_requested_at)
  WHERE authorization_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_attendances_authorization_token
  ON attendances(authorization_token)
  WHERE authorization_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendances_authorized_by
  ON attendances(authorized_by_user_id, authorized_at);

-- Comentarios
COMMENT ON COLUMN attendances.authorization_status IS 'Estado de autorización: pending, approved, rejected';
COMMENT ON COLUMN attendances.authorization_token IS 'Token único para autorizar/rechazar vía link';
COMMENT ON COLUMN attendances.authorized_by_user_id IS 'User ID de quien autorizó (FK a users.user_id)';
COMMENT ON COLUMN attendances.authorized_at IS 'Timestamp de cuándo se autorizó/rechazó';
COMMENT ON COLUMN attendances.authorization_notes IS 'Notas/comentarios del autorizador';
COMMENT ON COLUMN attendances.notified_authorizers IS 'Array de user_ids que fueron notificados para autorizar';
COMMENT ON COLUMN attendances.authorization_requested_at IS 'Timestamp de cuándo se solicitó autorización';

-- ================================================
-- 3. TABLA COMPANIES - Fallback de notificaciones
-- ================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS fallback_notification_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fallback_notification_whatsapp VARCHAR(20);

COMMENT ON COLUMN companies.fallback_notification_email IS 'Email fallback si no hay autorizador asignado (ej: rrhh@empresa.com)';
COMMENT ON COLUMN companies.fallback_notification_whatsapp IS 'WhatsApp fallback si no hay autorizador asignado';

-- ================================================
-- 4. Verificación final
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '   - Campos agregados a users: can_authorize_late_arrivals, authorized_departments, notification_preference_late_arrivals';
  RAISE NOTICE '   - Campos agregados a attendances: authorization_status, authorization_token, authorized_by_user_id, etc.';
  RAISE NOTICE '   - Campos agregados a companies: fallback_notification_email, fallback_notification_whatsapp';
  RAISE NOTICE '   - Índices creados para optimización de consultas';
END $$;

COMMIT;
