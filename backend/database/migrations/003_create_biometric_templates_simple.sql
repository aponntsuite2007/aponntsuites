/*
 * 🐘 SIMPLE BIOMETRIC TEMPLATES MIGRATION
 * ======================================
 * Tabla biometric_templates sin particionado para deployment rápido
 * Fecha: 2025-09-26
 */

-- Crear tabla biometric_templates simplificada
CREATE TABLE IF NOT EXISTS biometric_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Datos biométricos
    template_data TEXT NOT NULL,
    template_hash CHAR(64) NOT NULL,

    -- Métricas
    quality_score DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    algorithm_version VARCHAR(20) NOT NULL DEFAULT '2.0.0',
    device_id VARCHAR(255),

    -- Metadatos
    capture_metadata JSONB DEFAULT '{}'::jsonb,
    verification_count INTEGER DEFAULT 0,
    last_verification_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Índices para performance multi-tenant
CREATE INDEX IF NOT EXISTS idx_biometric_templates_company_employee
ON biometric_templates (company_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_biometric_templates_quality
ON biometric_templates (company_id, quality_score DESC)
WHERE quality_score >= 0.7;

CREATE INDEX IF NOT EXISTS idx_biometric_templates_active
ON biometric_templates (company_id, is_active, expires_at)
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_biometric_templates_hash_unique
ON biometric_templates (company_id, template_hash);

-- Tabla para análisis IA avanzado
CREATE TABLE IF NOT EXISTS biometric_ai_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    template_id UUID REFERENCES biometric_templates(id) ON DELETE CASCADE,

    -- Análisis Harvard EmotiNet
    emotion_analysis JSONB,
    emotion_confidence DECIMAL(5,4),

    -- Análisis MIT Behavior
    behavior_patterns JSONB,
    behavior_confidence DECIMAL(5,4),

    -- Análisis Stanford Facial
    facial_features JSONB,
    facial_landmarks JSONB,

    -- WHO-GDHI Health Indicators
    health_indicators JSONB,
    fatigue_score DECIMAL(5,4),
    stress_score DECIMAL(5,4),

    -- Procesamiento
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    processing_time_ms INTEGER,
    analysis_version VARCHAR(20) DEFAULT '1.0.0',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para análisis IA
CREATE INDEX IF NOT EXISTS idx_biometric_ai_company_date
ON biometric_ai_analysis (company_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_biometric_ai_employee
ON biometric_ai_analysis (employee_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_biometric_ai_template
ON biometric_ai_analysis (template_id) WHERE template_id IS NOT NULL;

-- Función de estadísticas
CREATE OR REPLACE FUNCTION get_biometric_stats(company_id_param INTEGER)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object(
            'total_templates', COUNT(*),
            'active_templates', COUNT(*) FILTER (WHERE is_active = true),
            'avg_quality', AVG(quality_score),
            'unique_employees', COUNT(DISTINCT employee_id),
            'devices_count', COUNT(DISTINCT device_id),
            'recent_verifications', COUNT(*) FILTER (WHERE last_verification_at > NOW() - INTERVAL '7 days')
        )
        FROM biometric_templates
        WHERE company_id = company_id_param
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamps
CREATE OR REPLACE FUNCTION update_biometric_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_biometric_template_timestamp ON biometric_templates;
CREATE TRIGGER trigger_update_biometric_template_timestamp
    BEFORE UPDATE ON biometric_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_biometric_template_timestamp();

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Tablas biométricas creadas exitosamente';
    RAISE NOTICE '📊 Tablas: biometric_templates, biometric_ai_analysis';
    RAISE NOTICE '🚀 Listo para uso en producción';
END
$$;