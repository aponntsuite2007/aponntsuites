-- ========================================
-- CREACIÓN DE TABLAS BIOMÉTRICAS FALTANTES
-- Sistema de Asistencia Biométrico
-- ========================================

-- 1. TABLA PARA DATOS BIOMÉTRICOS FACIALES
CREATE TABLE IF NOT EXISTS facial_biometric_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,
    face_encoding TEXT NOT NULL, -- Codificación facial (base64 o array)
    face_template BYTEA, -- Template binario para comparación rápida
    quality_score DECIMAL(5,2) DEFAULT 0.0, -- Calidad de 0-100
    capture_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    device_info JSONB, -- Info del dispositivo usado para captura
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_facial_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_facial_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- 2. TABLA PARA DATOS BIOMÉTRICOS DE HUELLAS DACTILARES
CREATE TABLE IF NOT EXISTS fingerprint_biometric_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,
    finger_position INTEGER, -- 1-10 para dedos específicos
    template_data BYTEA NOT NULL, -- Template binario
    minutiae_data JSONB, -- Puntos característicos
    quality_score DECIMAL(5,2) DEFAULT 0.0,
    capture_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    device_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fingerprint_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_fingerprint_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- 3. TABLA PARA REGISTRO DE EVENTOS BIOMÉTRICOS
CREATE TABLE IF NOT EXISTS biometric_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'face_recognition', 'fingerprint_scan', 'enrollment', etc.
    biometric_type VARCHAR(20) NOT NULL, -- 'face', 'fingerprint', 'iris', etc.
    success BOOLEAN NOT NULL,
    confidence_score DECIMAL(5,2), -- Nivel de confianza de la coincidencia
    device_id VARCHAR(255),
    device_location VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB, -- Datos adicionales del evento

    CONSTRAINT fk_biometric_events_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_biometric_events_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- 4. TABLA PARA CONFIGURACIÓN BIOMÉTRICA POR EMPRESA
CREATE TABLE IF NOT EXISTS biometric_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL UNIQUE,
    face_recognition_enabled BOOLEAN DEFAULT true,
    fingerprint_enabled BOOLEAN DEFAULT true,
    iris_enabled BOOLEAN DEFAULT false,
    voice_enabled BOOLEAN DEFAULT false,
    min_confidence_threshold DECIMAL(5,2) DEFAULT 85.0, -- Umbral mínimo de confianza
    max_attempts INTEGER DEFAULT 3, -- Intentos máximos antes de bloqueo
    template_update_interval INTEGER DEFAULT 30, -- Días para actualizar templates
    settings JSONB, -- Configuraciones adicionales
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_biometric_settings_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- 5. TABLA PARA DISPOSITIVOS BIOMÉTRICOS
CREATE TABLE IF NOT EXISTS biometric_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- 'camera', 'fingerprint_reader', 'iris_scanner'
    device_model VARCHAR(255),
    device_serial VARCHAR(255),
    location VARCHAR(255),
    ip_address INET,
    is_active BOOLEAN DEFAULT true,
    last_ping TIMESTAMP,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_biometric_devices_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_facial_user_id ON facial_biometric_data(user_id);
CREATE INDEX IF NOT EXISTS idx_facial_company_id ON facial_biometric_data(company_id);
CREATE INDEX IF NOT EXISTS idx_facial_active ON facial_biometric_data(is_active);

CREATE INDEX IF NOT EXISTS idx_fingerprint_user_id ON fingerprint_biometric_data(user_id);
CREATE INDEX IF NOT EXISTS idx_fingerprint_company_id ON fingerprint_biometric_data(company_id);

CREATE INDEX IF NOT EXISTS idx_biometric_events_user_id ON biometric_events(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_events_company_id ON biometric_events(company_id);
CREATE INDEX IF NOT EXISTS idx_biometric_events_timestamp ON biometric_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_biometric_events_type ON biometric_events(event_type);

CREATE INDEX IF NOT EXISTS idx_biometric_devices_company ON biometric_devices(company_id);
CREATE INDEX IF NOT EXISTS idx_biometric_devices_active ON biometric_devices(is_active);

-- TRIGGERS PARA ACTUALIZAR CAMPOS updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Eliminar triggers existentes si existen
DROP TRIGGER IF EXISTS update_facial_biometric_data_updated_at ON facial_biometric_data;
DROP TRIGGER IF EXISTS update_fingerprint_biometric_data_updated_at ON fingerprint_biometric_data;
DROP TRIGGER IF EXISTS update_biometric_settings_updated_at ON biometric_settings;
DROP TRIGGER IF EXISTS update_biometric_devices_updated_at ON biometric_devices;

-- Crear triggers
CREATE TRIGGER update_facial_biometric_data_updated_at BEFORE UPDATE ON facial_biometric_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fingerprint_biometric_data_updated_at BEFORE UPDATE ON fingerprint_biometric_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_biometric_settings_updated_at BEFORE UPDATE ON biometric_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_biometric_devices_updated_at BEFORE UPDATE ON biometric_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- INSERTAR CONFIGURACIONES BIOMÉTRICAS PREDETERMINADAS PARA EMPRESAS EXISTENTES
INSERT INTO biometric_settings (company_id, face_recognition_enabled, fingerprint_enabled, min_confidence_threshold)
SELECT company_id, true, true, 85.0
FROM companies
WHERE company_id NOT IN (SELECT company_id FROM biometric_settings WHERE company_id IS NOT NULL);