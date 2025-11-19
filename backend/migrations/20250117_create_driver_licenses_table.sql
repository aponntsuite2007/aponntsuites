-- ============================================================================
-- MIGRACIÓN: TAB 2 - Licencias de Conducir
-- Fecha: 2025-01-17
-- Descripción: Crea tabla para licencias de conducir (nacional, internacional, pasajeros)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_driver_licenses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Tipo de licencia
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('nacional', 'internacional', 'pasajeros')),

    -- Información de la licencia
    license_number VARCHAR(100),
    license_class VARCHAR(20), -- A, B, C, D, E, etc.
    subclass VARCHAR(50), -- Subclases (ej: A1, A2, B1, etc.)

    -- Fechas
    issue_date DATE,
    expiry_date DATE, -- 🔔 VENCIMIENTO - Sistema de alertas

    -- Documentación
    photo_url TEXT,
    issuing_authority VARCHAR(255), -- Municipio/provincia que emite
    issuing_country VARCHAR(100) DEFAULT 'Argentina',

    -- Restricciones y observaciones
    restrictions TEXT, -- Restricciones médicas o de uso
    observations TEXT, -- Observaciones generales
    requires_glasses BOOLEAN DEFAULT FALSE, -- Si requiere anteojos para conducir

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    suspension_start_date DATE, -- Si la licencia está suspendida
    suspension_end_date DATE,
    suspension_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_driver_licenses_user ON user_driver_licenses(user_id);
CREATE INDEX idx_driver_licenses_company ON user_driver_licenses(company_id);
CREATE INDEX idx_driver_licenses_type ON user_driver_licenses(license_type);
CREATE INDEX idx_driver_licenses_expiry ON user_driver_licenses(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_driver_licenses_active ON user_driver_licenses(is_active);

-- Comentarios
COMMENT ON TABLE user_driver_licenses IS 'Licencias de conducir del empleado (nacional, internacional, pasajeros)';
COMMENT ON COLUMN user_driver_licenses.license_type IS 'Tipo: nacional (licencia estándar), internacional (para conducir en otros países), pasajeros (transporte público)';
COMMENT ON COLUMN user_driver_licenses.license_class IS 'Clase de licencia: A (motos), B (autos), C (camiones), D (transporte pasajeros), E (articulados)';
COMMENT ON COLUMN user_driver_licenses.expiry_date IS '🔔 VENCIMIENTO - Fecha de vencimiento de la licencia (requiere sistema de alertas)';
COMMENT ON COLUMN user_driver_licenses.photo_url IS 'URL de la foto escaneada de la licencia';
COMMENT ON COLUMN user_driver_licenses.requires_glasses IS 'Si la licencia especifica uso obligatorio de anteojos (importante para biometría)';

-- Trigger para updated_at
CREATE TRIGGER update_driver_licenses_updated_at
BEFORE UPDATE ON user_driver_licenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
