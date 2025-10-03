-- 🎭 EXTENSIÓN TABLA USERS PARA BIOMETRÍA
-- Fecha: 23 Septiembre 2025
-- Todos los campos son NULLABLE - NO ROMPE FUNCIONALIDAD EXISTENTE

-- Agregar campos biométricos a tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_enrolled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_templates_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_biometric_scan TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_quality_avg DECIMAL(4,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_analysis_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fatigue_monitoring BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emotion_monitoring BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_notes TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN users.biometric_enrolled IS 'Indica si el usuario tiene biometría registrada';
COMMENT ON COLUMN users.biometric_templates_count IS 'Número de templates biométricos registrados';
COMMENT ON COLUMN users.last_biometric_scan IS 'Última vez que se escaneó biométricamente';
COMMENT ON COLUMN users.biometric_quality_avg IS 'Calidad promedio de templates (0-100)';
COMMENT ON COLUMN users.ai_analysis_enabled IS 'Si está habilitado el análisis IA para este usuario';
COMMENT ON COLUMN users.fatigue_monitoring IS 'Si está habilitado el monitoreo de fatiga';
COMMENT ON COLUMN users.emotion_monitoring IS 'Si está habilitado el monitoreo emocional';
COMMENT ON COLUMN users.biometric_notes IS 'Notas sobre configuración biométrica del usuario';

-- Índices para performance multi-tenant
CREATE INDEX IF NOT EXISTS idx_users_biometric_enrolled ON users(biometric_enrolled, company_id) WHERE biometric_enrolled = true;
CREATE INDEX IF NOT EXISTS idx_users_last_scan ON users(last_biometric_scan, company_id) WHERE last_biometric_scan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_ai_enabled ON users(ai_analysis_enabled, company_id) WHERE ai_analysis_enabled = true;
CREATE INDEX IF NOT EXISTS idx_users_company_biometric ON users(company_id, biometric_enrolled) WHERE biometric_enrolled = true;

-- Nueva tabla para scans biométricos en tiempo real
CREATE TABLE IF NOT EXISTS biometric_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,
    device_id VARCHAR(255),
    device_type VARCHAR(50) DEFAULT 'unknown', -- 'mobile', 'kiosk', 'tablet'
    scan_type VARCHAR(50) NOT NULL DEFAULT 'attendance', -- 'attendance', 'verification', 'monitoring'

    -- Datos biométricos básicos
    template_data TEXT, -- Vector de características faciales
    image_quality DECIMAL(4,2) DEFAULT 0.0,
    confidence_score DECIMAL(4,2) DEFAULT 0.0,
    processing_time_ms INTEGER DEFAULT 0,

    -- Metadatos de captura
    capture_timestamp TIMESTAMP DEFAULT NOW(),
    server_timestamp TIMESTAMP DEFAULT NOW(),

    -- Análisis IA (se completa en background - todos nullable)
    emotion_analysis JSONB, -- Análisis emocional completo
    fatigue_score DECIMAL(4,2), -- Puntuación fatiga (0-100)
    stress_indicators JSONB, -- Indicadores de stress
    behavioral_flags JSONB, -- Flags comportamentales
    ai_processed_at TIMESTAMP, -- Cuándo se completó el análisis IA

    -- Control de calidad
    quality_flags JSONB, -- Flags de calidad de imagen/template
    validation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'validated', 'rejected'
    validated_by UUID, -- ID del usuario que validó
    validated_at TIMESTAMP,

    -- Auditoría y seguridad
    ip_address INET,
    user_agent TEXT,
    location_data JSONB, -- GPS coordinates si disponible

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Índices críticos para performance multi-tenant
CREATE INDEX idx_biometric_scans_company_date ON biometric_scans(company_id, server_timestamp DESC);
CREATE INDEX idx_biometric_scans_user_recent ON biometric_scans(user_id, server_timestamp DESC);
CREATE INDEX idx_biometric_scans_processing ON biometric_scans(ai_processed_at, company_id) WHERE ai_processed_at IS NULL;
CREATE INDEX idx_biometric_scans_type ON biometric_scans(scan_type, company_id, server_timestamp DESC);
CREATE INDEX idx_biometric_scans_device ON biometric_scans(device_id, company_id) WHERE device_id IS NOT NULL;
CREATE INDEX idx_biometric_scans_validation ON biometric_scans(validation_status, company_id) WHERE validation_status = 'pending';

-- Tabla para configuración biométrica por empresa
CREATE TABLE IF NOT EXISTS biometric_company_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL UNIQUE,

    -- Umbrales de identificación
    confidence_threshold DECIMAL(4,2) DEFAULT 0.85,
    quality_threshold DECIMAL(4,2) DEFAULT 70.0,

    -- Configuración IA
    ai_analysis_enabled BOOLEAN DEFAULT true,
    emotion_analysis_enabled BOOLEAN DEFAULT true,
    fatigue_detection_enabled BOOLEAN DEFAULT true,
    behavior_analysis_enabled BOOLEAN DEFAULT false,

    -- Configuración de alertas
    realtime_alerts_enabled BOOLEAN DEFAULT true,
    email_reports_enabled BOOLEAN DEFAULT false,
    alert_email VARCHAR(255),

    -- Configuración avanzada
    batch_processing_enabled BOOLEAN DEFAULT true,
    cache_templates BOOLEAN DEFAULT true,
    retention_days INTEGER DEFAULT 90, -- Días que se mantienen los scans

    -- Configuración de dispositivos
    max_devices_per_user INTEGER DEFAULT 3,
    device_registration_required BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Insertar configuración por defecto para empresas existentes
INSERT INTO biometric_company_config (company_id)
SELECT id FROM companies
WHERE id NOT IN (SELECT company_id FROM biometric_company_config WHERE company_id IS NOT NULL)
ON CONFLICT (company_id) DO NOTHING;

-- Tabla para dispositivos registrados
CREATE TABLE IF NOT EXISTS biometric_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50) DEFAULT 'mobile', -- 'mobile', 'kiosk', 'tablet'

    -- Información del dispositivo
    os_info VARCHAR(255), -- Android version, etc.
    app_version VARCHAR(50),
    hardware_info JSONB,

    -- Estado y configuración
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP,
    registration_date TIMESTAMP DEFAULT NOW(),

    -- Configuración específica del dispositivo
    allow_registration BOOLEAN DEFAULT true, -- Puede registrar nuevos templates
    allow_verification BOOLEAN DEFAULT true, -- Puede hacer verificaciones
    allow_monitoring BOOLEAN DEFAULT false, -- Puede hacer monitoreo continuo

    -- Ubicación y contexto
    location_name VARCHAR(255), -- "Entrada Principal", "Sala de Juntas", etc.
    location_coordinates JSONB, -- GPS coordinates

    -- Auditoría
    registered_by UUID, -- Usuario que registró el dispositivo
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL,

    UNIQUE(company_id, device_id)
);

-- Índices para dispositivos
CREATE INDEX idx_biometric_devices_company ON biometric_devices(company_id, is_active);
CREATE INDEX idx_biometric_devices_active ON biometric_devices(device_id, is_active) WHERE is_active = true;

-- Comentarios para documentación de tablas nuevas
COMMENT ON TABLE biometric_scans IS 'Registro de todos los scans biométricos con análisis IA';
COMMENT ON TABLE biometric_company_config IS 'Configuración biométrica específica por empresa';
COMMENT ON TABLE biometric_devices IS 'Dispositivos registrados para captura biométrica';

-- Función para limpiar datos antiguos (optional)
CREATE OR REPLACE FUNCTION cleanup_old_biometric_scans()
RETURNS void AS $$
BEGIN
    -- Eliminar scans más antiguos que retention_days según configuración de empresa
    DELETE FROM biometric_scans bs
    USING biometric_company_config bcc
    WHERE bs.company_id = bcc.company_id
    AND bs.created_at < NOW() - INTERVAL '1 day' * bcc.retention_days;

    RAISE NOTICE 'Cleanup de scans biométricos completado';
END;
$$ LANGUAGE plpgsql;

-- Vista para estadísticas rápidas por empresa
CREATE OR REPLACE VIEW biometric_company_stats AS
SELECT
    c.id as company_id,
    c.name as company_name,
    COUNT(DISTINCT u.id) FILTER (WHERE u.biometric_enrolled = true) as enrolled_users,
    COUNT(DISTINCT u.id) as total_users,
    COALESCE(AVG(u.biometric_quality_avg), 0) as avg_quality,
    COUNT(DISTINCT bd.id) FILTER (WHERE bd.is_active = true) as active_devices,
    COUNT(bs.id) FILTER (WHERE bs.created_at >= CURRENT_DATE) as scans_today,
    COUNT(bs.id) FILTER (WHERE bs.ai_processed_at IS NULL) as pending_ai_analysis
FROM companies c
LEFT JOIN users u ON c.id = u.company_id AND u."isActive" = true
LEFT JOIN biometric_devices bd ON c.id = bd.company_id
LEFT JOIN biometric_scans bs ON c.id = bs.company_id
WHERE c.is_active = true
GROUP BY c.id, c.name;

COMMENT ON VIEW biometric_company_stats IS 'Estadísticas biométricas resumidas por empresa';

-- Trigger para actualizar campos automáticamente
CREATE OR REPLACE FUNCTION update_user_biometric_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estadísticas del usuario cuando se inserta un nuevo scan
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET
            last_biometric_scan = NEW.server_timestamp,
            biometric_enrolled = true
        WHERE id = NEW.user_id;

        -- Actualizar contador de templates si es un scan de registro
        IF NEW.scan_type = 'registration' THEN
            UPDATE users SET
                biometric_templates_count = biometric_templates_count + 1
            WHERE id = NEW.user_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_update_user_biometric_stats ON biometric_scans;
CREATE TRIGGER trigger_update_user_biometric_stats
    AFTER INSERT ON biometric_scans
    FOR EACH ROW
    EXECUTE FUNCTION update_user_biometric_stats();

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Extensión biométrica de base de datos completada exitosamente';
    RAISE NOTICE '📊 Tablas creadas: biometric_scans, biometric_company_config, biometric_devices';
    RAISE NOTICE '🔍 Índices optimizados para multi-tenant creados';
    RAISE NOTICE '📈 Vista biometric_company_stats disponible';
    RAISE NOTICE '⚡ Triggers automáticos configurados';
END
$$;