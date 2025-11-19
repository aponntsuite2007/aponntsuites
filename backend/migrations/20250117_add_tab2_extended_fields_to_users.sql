-- ============================================================================
-- MIGRACIÓN: TAB 2 - Datos Personales - Campos Extendidos
-- Fecha: 2025-01-17
-- Descripción: Agrega campos faltantes en tabla users para TAB 2
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: DATOS DE CONTACTO AMPLIADO
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS home_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS street VARCHAR(255),
ADD COLUMN IF NOT EXISTS street_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS floor_apt VARCHAR(20);

-- Comentarios
COMMENT ON COLUMN users.secondary_phone IS 'Teléfono secundario del empleado';
COMMENT ON COLUMN users.home_phone IS 'Teléfono fijo del empleado';
COMMENT ON COLUMN users.city IS 'Ciudad de residencia';
COMMENT ON COLUMN users.province IS 'Provincia de residencia';
COMMENT ON COLUMN users.postal_code IS 'Código postal';
COMMENT ON COLUMN users.neighborhood IS 'Barrio de residencia';
COMMENT ON COLUMN users.street IS 'Calle (extraído de address)';
COMMENT ON COLUMN users.street_number IS 'Número de calle';
COMMENT ON COLUMN users.floor_apt IS 'Piso y departamento (ej: 5 B)';

-- ============================================================================
-- SECCIÓN 2: OBRA SOCIAL / PREPAGA
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS health_insurance_provider VARCHAR(255),
ADD COLUMN IF NOT EXISTS health_insurance_plan VARCHAR(255),
ADD COLUMN IF NOT EXISTS health_insurance_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS health_insurance_expiry DATE;

-- Comentarios
COMMENT ON COLUMN users.health_insurance_provider IS 'Obra social o prepaga (ej: OSDE, Swiss Medical, IOMA)';
COMMENT ON COLUMN users.health_insurance_plan IS 'Plan específico (ej: OSDE 210, Swiss Medical SMG11)';
COMMENT ON COLUMN users.health_insurance_number IS 'Número de afiliado';
COMMENT ON COLUMN users.health_insurance_expiry IS '🔔 VENCIMIENTO - Fecha de vencimiento de la credencial (requiere sistema de alertas)';

-- Índice para vencimientos
CREATE INDEX IF NOT EXISTS idx_users_health_insurance_expiry
ON users(health_insurance_expiry) WHERE health_insurance_expiry IS NOT NULL;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
