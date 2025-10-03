/*
 * 🐘 PROFESSIONAL BIOMETRIC TEMPLATES MIGRATION - FASE 3
 * ======================================================
 * Creación de tabla biometric_templates con particionado
 * Índices especializados, optimización para millones de registros
 * Fecha: 2025-09-26
 * Versión: 2.0.0
 */

-- ═══════════════════════════════════════════════════════════════
-- 🎯 CREAR TABLA PRINCIPAL PARTICIONADA
-- ═══════════════════════════════════════════════════════════════

-- Eliminar tabla si existe (para desarrollo)
DROP TABLE IF EXISTS biometric_templates CASCADE;
DROP TABLE IF EXISTS biometric_templates_partition_1 CASCADE;
DROP TABLE IF EXISTS biometric_templates_partition_2 CASCADE;
DROP TABLE IF EXISTS biometric_templates_partition_3 CASCADE;
DROP TABLE IF EXISTS biometric_templates_partition_4 CASCADE;
DROP TABLE IF EXISTS biometric_templates_partition_5 CASCADE;

-- Crear tabla principal particionada por HASH de company_id
CREATE TABLE biometric_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 🧬 DATOS BIOMÉTRICOS ENCRIPTADOS
    template_data TEXT NOT NULL, -- Template FaceNet de 512 dimensiones encriptado
    template_hash CHAR(64) NOT NULL, -- SHA-256 para detección de duplicados

    -- 📊 MÉTRICAS DE CALIDAD Y RENDIMIENTO
    quality_score DECIMAL(5,4) NOT NULL DEFAULT 0.0000 CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    algorithm_version VARCHAR(20) NOT NULL DEFAULT '2.0.0',
    device_id VARCHAR(255),

    -- 📱 METADATOS DE CAPTURA (JSONB para queries eficientes)
    capture_metadata JSONB DEFAULT '{}'::jsonb,

    -- 📈 ESTADÍSTICAS DE USO
    verification_count INTEGER DEFAULT 0,
    last_verification_at TIMESTAMPTZ,

    -- ⏰ TIMESTAMPS Y CONTROL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Para auto-cleanup
    is_active BOOLEAN DEFAULT true,

    -- 🏢 MULTI-TENANT: Unicidad manejada por índice (constraints no son compatibles con particionado)

) PARTITION BY HASH (company_id);

-- ═══════════════════════════════════════════════════════════════
-- 📦 CREAR PARTICIONES (5 particiones para distribución eficiente)
-- ═══════════════════════════════════════════════════════════════

-- Partición 1 (20% de empresas)
CREATE TABLE biometric_templates_partition_1
    PARTITION OF biometric_templates
    FOR VALUES WITH (modulus 5, remainder 0);

-- Partición 2 (20% de empresas)
CREATE TABLE biometric_templates_partition_2
    PARTITION OF biometric_templates
    FOR VALUES WITH (modulus 5, remainder 1);

-- Partición 3 (20% de empresas)
CREATE TABLE biometric_templates_partition_3
    PARTITION OF biometric_templates
    FOR VALUES WITH (modulus 5, remainder 2);

-- Partición 4 (20% de empresas)
CREATE TABLE biometric_templates_partition_4
    PARTITION OF biometric_templates
    FOR VALUES WITH (modulus 5, remainder 3);

-- Partición 5 (20% de empresas)
CREATE TABLE biometric_templates_partition_5
    PARTITION OF biometric_templates
    FOR VALUES WITH (modulus 5, remainder 4);

-- ═══════════════════════════════════════════════════════════════
-- 📊 ÍNDICES ESPECIALIZADOS MULTI-TENANT
-- ═══════════════════════════════════════════════════════════════

-- 🎯 Índice principal: empresa + empleado (queries más frecuentes)
CREATE INDEX CONCURRENTLY idx_biometric_templates_company_employee
ON biometric_templates USING btree (company_id, employee_id);

-- 📈 Índice para templates de alta calidad
CREATE INDEX CONCURRENTLY idx_biometric_templates_quality
ON biometric_templates USING btree (company_id, quality_score DESC)
WHERE quality_score >= 0.7;

-- ✅ Índice para templates activos y válidos
CREATE INDEX CONCURRENTLY idx_biometric_templates_active
ON biometric_templates USING btree (company_id, is_active, expires_at)
WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW());

-- 🔍 Índice ÚNICO para detección de duplicados por empresa (reemplaza UNIQUE constraint)
CREATE UNIQUE INDEX CONCURRENTLY idx_biometric_templates_hash_company_unique
ON biometric_templates USING btree (company_id, template_hash);

-- 🧹 Índice para cleanup automático de templates expirados
CREATE INDEX CONCURRENTLY idx_biometric_templates_expires
ON biometric_templates USING btree (expires_at)
WHERE expires_at IS NOT NULL AND expires_at <= NOW();

-- 📊 Índice para métricas de uso y estadísticas
CREATE INDEX CONCURRENTLY idx_biometric_templates_usage
ON biometric_templates USING btree (company_id, verification_count DESC, last_verification_at DESC);

-- 🔎 Índice GIN para metadatos JSONB (queries complejas)
CREATE INDEX CONCURRENTLY idx_biometric_templates_metadata
ON biometric_templates USING gin (capture_metadata);

-- 📅 Índice para queries temporales (created_at)
CREATE INDEX CONCURRENTLY idx_biometric_templates_created
ON biometric_templates USING btree (company_id, created_at DESC);

-- 🆔 Índice para búsquedas por device_id
CREATE INDEX CONCURRENTLY idx_biometric_templates_device
ON biometric_templates USING btree (company_id, device_id)
WHERE device_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 🔧 FUNCIONES DE UTILIDAD PROFESIONAL
-- ═══════════════════════════════════════════════════════════════

-- 🧹 Función para cleanup automático de templates expirados
CREATE OR REPLACE FUNCTION cleanup_expired_templates()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Eliminar templates expirados
    DELETE FROM biometric_templates
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log del cleanup
    INSERT INTO system_logs (level, message, created_at)
    VALUES ('INFO',
            'Cleanup biométrico: ' || deleted_count || ' templates expirados eliminados',
            NOW());

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 📊 Función para obtener estadísticas por empresa
CREATE OR REPLACE FUNCTION get_biometric_stats(p_company_id INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'company_id', p_company_id,
        'total_templates', COUNT(*),
        'active_templates', COUNT(*) FILTER (WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())),
        'expired_templates', COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW()),
        'average_quality', ROUND(AVG(quality_score)::numeric, 4),
        'unique_employees', COUNT(DISTINCT employee_id),
        'total_verifications', SUM(verification_count),
        'recent_templates_30d', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'),
        'high_quality_templates', COUNT(*) FILTER (WHERE quality_score >= 0.8),
        'last_updated', NOW()
    ) INTO result
    FROM biometric_templates
    WHERE company_id = p_company_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 🔍 Función optimizada para búsqueda de similitud (simulada)
CREATE OR REPLACE FUNCTION find_similar_templates(
    p_company_id INTEGER,
    p_template_hash CHAR(64),
    p_threshold DECIMAL DEFAULT 0.75,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    template_id UUID,
    employee_id UUID,
    similarity_score DECIMAL,
    quality_score DECIMAL,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- En producción, implementar cálculo real de similitud
    -- Por ahora, retornar templates con hash similar (simulación)
    RETURN QUERY
    SELECT
        bt.id,
        bt.employee_id,
        -- Simulación de similarity basada en quality_score
        (0.5 + (bt.quality_score * 0.5))::DECIMAL as similarity_score,
        bt.quality_score,
        bt.created_at
    FROM biometric_templates bt
    WHERE bt.company_id = p_company_id
      AND bt.is_active = true
      AND (bt.expires_at IS NULL OR bt.expires_at > NOW())
      AND bt.quality_score >= p_threshold
    ORDER BY similarity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- ⚡ TRIGGERS PARA AUTOMATIZACIÓN
-- ═══════════════════════════════════════════════════════════════

-- 🔄 Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_biometric_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_biometric_template_timestamp
    BEFORE UPDATE ON biometric_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_biometric_template_timestamp();

-- 📊 Trigger para logging de cambios críticos
CREATE OR REPLACE FUNCTION log_biometric_template_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log cuando se desactiva un template
    IF OLD.is_active = true AND NEW.is_active = false THEN
        INSERT INTO system_logs (level, message, metadata, created_at)
        VALUES ('WARN',
                'Template biométrico desactivado',
                json_build_object(
                    'template_id', NEW.id,
                    'company_id', NEW.company_id,
                    'employee_id', NEW.employee_id,
                    'reason', 'manual_deactivation'
                ),
                NOW());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_biometric_template_changes
    AFTER UPDATE ON biometric_templates
    FOR EACH ROW
    EXECUTE FUNCTION log_biometric_template_changes();

-- ═══════════════════════════════════════════════════════════════
-- 🎯 CONFIGURACIONES DE PERFORMANCE POSTGRESQL
-- ═══════════════════════════════════════════════════════════════

-- Configurar autovacuum agresivo para esta tabla
ALTER TABLE biometric_templates SET (
    autovacuum_vacuum_scale_factor = 0.01,    -- Vacuum más frecuente
    autovacuum_analyze_scale_factor = 0.005,  -- Analyze más frecuente
    autovacuum_vacuum_cost_limit = 2000       -- Límite de costo más alto
);

-- Configurar parámetros de tabla para mejor performance
ALTER TABLE biometric_templates SET (
    fillfactor = 90,  -- Dejar espacio para updates
    toast_tuple_threshold = 2000  -- Optimizar TOAST para template_data
);

-- ═══════════════════════════════════════════════════════════════
-- 📅 PROGRAMAR CLEANUP AUTOMÁTICO
-- ═══════════════════════════════════════════════════════════════

-- Crear extensión para cron jobs (requiere superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar cleanup diario a las 2:00 AM
-- SELECT cron.schedule('biometric-cleanup', '0 2 * * *', 'SELECT cleanup_expired_templates();');

-- ═══════════════════════════════════════════════════════════════
-- 📋 INSERTAR DATOS DE PRUEBA (OPCIONAL - SOLO DESARROLLO)
-- ═══════════════════════════════════════════════════════════════

-- Templates de prueba para empresa ISI (company_id = 11)
INSERT INTO biometric_templates (
    company_id,
    employee_id,
    template_data,
    template_hash,
    quality_score,
    capture_metadata,
    expires_at
) VALUES
(
    11,
    'test-employee-001'::UUID,
    'encrypted_template_data_ejemplo_512_dimensiones',
    sha256('template_test_1'::bytea)::text,
    0.9234,
    '{"liveness_passed": true, "anti_spoofing_score": 0.95, "device_info": {"platform": "android", "model": "Galaxy S21"}}'::jsonb,
    NOW() + INTERVAL '90 days'
),
(
    11,
    'test-employee-002'::UUID,
    'encrypted_template_data_ejemplo_512_dimensiones_v2',
    sha256('template_test_2'::bytea)::text,
    0.8876,
    '{"liveness_passed": true, "anti_spoofing_score": 0.89, "device_info": {"platform": "ios", "model": "iPhone 13"}}'::jsonb,
    NOW() + INTERVAL '90 days'
);

-- ═══════════════════════════════════════════════════════════════
-- ✅ VERIFICACIONES DE INTEGRIDAD
-- ═══════════════════════════════════════════════════════════════

-- Verificar que las particiones se crearon correctamente
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables
WHERE tablename LIKE 'biometric_templates%'
ORDER BY tablename;

-- Verificar índices creados
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'biometric_templates'
ORDER BY indexname;

-- Verificar funciones creadas
SELECT
    proname,
    pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname IN ('cleanup_expired_templates', 'get_biometric_stats', 'find_similar_templates');

COMMIT;

-- 📝 COMENTARIOS FINALES
COMMENT ON TABLE biometric_templates IS 'Tabla principal para almacenamiento de templates biométricos con particionado por empresa';
COMMENT ON COLUMN biometric_templates.template_data IS 'Template biométrico FaceNet de 512 dimensiones encriptado con AES-256';
COMMENT ON COLUMN biometric_templates.template_hash IS 'Hash SHA-256 del template original para detección de duplicados';
COMMENT ON COLUMN biometric_templates.capture_metadata IS 'Metadatos JSONB con información de captura, liveness, anti-spoofing, dispositivo';

-- 🎯 Log de migración exitosa
INSERT INTO system_logs (level, message, created_at)
VALUES ('INFO', 'Migración biometric_templates_professional completada exitosamente', NOW());

-- 📊 Mostrar estadísticas iniciales
SELECT
    'Templates table created successfully' as status,
    COUNT(*) as initial_records,
    COUNT(DISTINCT company_id) as companies_with_templates
FROM biometric_templates;