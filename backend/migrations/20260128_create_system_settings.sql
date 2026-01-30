-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Sistema de Configuraciones Parametrizables
-- Fecha: 2026-01-28
-- Descripción: Tabla para guardar settings del sistema modificables desde UI
-- ═══════════════════════════════════════════════════════════════════════════════

-- Crear tabla de settings
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  data_type VARCHAR(20) NOT NULL DEFAULT 'string',
  default_value TEXT,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  requires_restart BOOLEAN DEFAULT false,
  validation_regex VARCHAR(500),
  options JSONB DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  modified_by_staff_id INTEGER,
  modified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_active ON system_settings(is_active);

-- Check constraint para categorías válidas
ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS check_category;
ALTER TABLE system_settings ADD CONSTRAINT check_category CHECK (
  category IN ('google_drive', 'offboarding', 'restoration', 'notifications', 'security', 'billing', 'system', 'integrations')
);

-- Check constraint para tipos de datos válidos
ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS check_data_type;
ALTER TABLE system_settings ADD CONSTRAINT check_data_type CHECK (
  data_type IN ('string', 'number', 'boolean', 'json', 'password')
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DATOS INICIALES (SEED)
-- ═══════════════════════════════════════════════════════════════════════════════

-- GOOGLE DRIVE
INSERT INTO system_settings (category, key, default_value, data_type, display_name, description, requires_restart, sort_order)
VALUES
  ('google_drive', 'GOOGLE_DRIVE_ENABLED', 'false', 'boolean', 'Google Drive Habilitado', 'Activar integración con Google Drive para exports de baja', true, 1),
  ('google_drive', 'GOOGLE_DRIVE_ROOT_FOLDER_ID', '', 'string', 'ID del Folder Raíz', 'ID del folder en Google Drive donde se suben los exports', false, 2),
  ('google_drive', 'GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL', '', 'string', 'Email del Service Account', 'Email del Service Account de Google', false, 3)
ON CONFLICT (key) DO NOTHING;

-- OFFBOARDING
INSERT INTO system_settings (category, key, default_value, data_type, display_name, description, sort_order, options)
VALUES
  ('offboarding', 'OFFBOARDING_INVOICE_OVERDUE_DAYS', '30', 'number', 'Días de Factura Vencida', 'Días de vencimiento de factura antes de iniciar proceso de baja', 1, NULL),
  ('offboarding', 'OFFBOARDING_GRACE_PERIOD_DAYS', '7', 'number', 'Días de Gracia', 'Días hábiles de gracia después del warning', 2, NULL),
  ('offboarding', 'OFFBOARDING_CRON_ENABLED', 'true', 'boolean', 'Cron Automático Habilitado', 'Ejecutar detección automática de facturas vencidas', 3, NULL),
  ('offboarding', 'OFFBOARDING_CRON_HOUR', '8', 'number', 'Hora del Cron', 'Hora del día para ejecutar el cron (0-23)', 4, NULL),
  ('offboarding', 'OFFBOARDING_MIN_ROLE_LEVEL', '1', 'number', 'Nivel Mínimo para Confirmar', 'Nivel mínimo para confirmar baja (0=director, 1=gerente)', 5, '[{"value":"0","label":"Director/Superadmin"},{"value":"1","label":"Gerente o superior"}]')
ON CONFLICT (key) DO NOTHING;

-- RESTORATION
INSERT INTO system_settings (category, key, default_value, data_type, display_name, description, sort_order, options)
VALUES
  ('restoration', 'RESTORE_MIN_COMPATIBILITY_SCORE', '90', 'number', 'Score Mínimo de Compatibilidad (%)', 'Porcentaje mínimo de compatibilidad requerido', 1, NULL),
  ('restoration', 'RESTORE_MIN_ROLE_LEVEL', '0', 'number', 'Nivel Mínimo para Restaurar', 'Nivel de rol mínimo para restaurar', 2, '[{"value":"0","label":"Solo Director/Superadmin"},{"value":"1","label":"Gerente o superior"}]'),
  ('restoration', 'RESTORE_REQUIRE_NEW_CONTRACT', 'true', 'boolean', 'Requiere Contrato Nuevo', 'Exigir contrato activo antes de restaurar', 3, NULL)
ON CONFLICT (key) DO NOTHING;

-- NOTIFICATIONS
INSERT INTO system_settings (category, key, default_value, data_type, display_name, description, sort_order)
VALUES
  ('notifications', 'NOTIFICATION_OFFBOARDING_EMAIL_ENABLED', 'true', 'boolean', 'Emails de Baja Habilitados', 'Enviar emails durante el proceso de baja', 1),
  ('notifications', 'NOTIFICATION_OFFBOARDING_WHATSAPP_ENABLED', 'false', 'boolean', 'WhatsApp de Baja Habilitado', 'Enviar WhatsApp durante baja', 2)
ON CONFLICT (key) DO NOTHING;

-- BILLING
INSERT INTO system_settings (category, key, default_value, data_type, display_name, description, sort_order)
VALUES
  ('billing', 'BILLING_EXPORT_RETENTION_DAYS', '30', 'number', 'Días de Retención de Exports', 'Días que se mantienen los ZIP antes de eliminar', 1)
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN: Obtener valor de setting con fallback
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_system_setting(p_key VARCHAR)
RETURNS TEXT AS $$
  SELECT COALESCE(value, default_value)
  FROM system_settings
  WHERE key = p_key AND is_active = true;
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Migración system_settings ejecutada correctamente';
  RAISE NOTICE '   - Tabla system_settings creada';
  RAISE NOTICE '   - Settings iniciales insertados';
  RAISE NOTICE '   - Función get_system_setting creada';
END $$;
