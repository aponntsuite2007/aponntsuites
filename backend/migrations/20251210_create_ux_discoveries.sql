/**
 * ============================================================================
 * MIGRATION: UX Discoveries - Persistir hallazgos de IntelligentUXTester
 * ============================================================================
 *
 * Tabla para guardar todo lo que IntelligentUXTester descubre:
 * - Botones encontrados
 * - Campos de formularios
 * - Modales detectados
 * - Flujos CRUD funcionando
 * - Errores UX encontrados
 *
 * Esto permite que el sistema APRENDA y mejore con el tiempo.
 * Brain puede consultar esta tabla para mejorar su conocimiento.
 */

-- Tabla principal de descubrimientos UX
CREATE TABLE IF NOT EXISTS ux_discoveries (
    id SERIAL PRIMARY KEY,

    -- Identificación
    module_key VARCHAR(100) NOT NULL,
    company_id INTEGER,  -- NULL = descubrimiento global, INT = específico de empresa

    -- Tipo de descubrimiento
    discovery_type VARCHAR(50) NOT NULL,  -- 'button', 'modal', 'field', 'flow', 'error', 'performance'

    -- Datos del descubrimiento
    discovery_data JSONB NOT NULL,  -- { text, selector, type, location, etc. }

    -- Contexto
    context VARCHAR(100),  -- 'create', 'edit', 'list', 'detail'
    screen_location VARCHAR(100),  -- 'header', 'sidebar', 'mainContent', 'modal'

    -- Validación
    validation_status VARCHAR(20) DEFAULT 'discovered',  -- 'discovered', 'validated', 'deprecated', 'error'
    validation_count INTEGER DEFAULT 1,  -- Cuántas veces se encontró
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Test results
    works_correctly BOOLEAN,  -- ¿El elemento funciona?
    error_details TEXT,  -- Si no funciona, ¿por qué?

    -- Metadata
    test_execution_id VARCHAR(100),  -- ID de la ejecución del test
    browser_context JSONB,  -- { userAgent, viewport, url }

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_ux_discoveries_module ON ux_discoveries(module_key);
CREATE INDEX idx_ux_discoveries_type ON ux_discoveries(discovery_type);
CREATE INDEX idx_ux_discoveries_company ON ux_discoveries(company_id);
CREATE INDEX idx_ux_discoveries_validation ON ux_discoveries(validation_status);
CREATE INDEX idx_ux_discoveries_context ON ux_discoveries(module_key, context);

-- Función para buscar descubrimientos similares (deduplicación)
CREATE OR REPLACE FUNCTION find_similar_discovery(
    p_module_key VARCHAR(100),
    p_discovery_type VARCHAR(50),
    p_discovery_data JSONB,
    p_company_id INTEGER DEFAULT NULL
) RETURNS TABLE(
    id INTEGER,
    validation_count INTEGER,
    last_seen_at TIMESTAMP,
    similarity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ud.id,
        ud.validation_count,
        ud.last_seen_at,
        -- Similarity score basado en datos JSON
        (
            CASE
                WHEN ud.discovery_data->>'text' = p_discovery_data->>'text' THEN 1.0
                WHEN ud.discovery_data->>'selector' = p_discovery_data->>'selector' THEN 0.8
                ELSE 0.5
            END
        )::NUMERIC as similarity_score
    FROM ux_discoveries ud
    WHERE ud.module_key = p_module_key
        AND ud.discovery_type = p_discovery_type
        AND (p_company_id IS NULL OR ud.company_id = p_company_id OR ud.company_id IS NULL)
        AND ud.validation_status != 'deprecated'
    ORDER BY similarity_score DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Función para incrementar validation_count (cuando se re-descubre)
CREATE OR REPLACE FUNCTION increment_discovery_validation(p_discovery_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE ux_discoveries
    SET
        validation_count = validation_count + 1,
        last_seen_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_discovery_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener descubrimientos validados (visto 3+ veces)
CREATE OR REPLACE FUNCTION get_validated_discoveries(
    p_module_key VARCHAR(100),
    p_min_validation_count INTEGER DEFAULT 3
) RETURNS TABLE(
    discovery_type VARCHAR(50),
    discovery_data JSONB,
    context VARCHAR(100),
    validation_count INTEGER,
    works_correctly BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ud.discovery_type,
        ud.discovery_data,
        ud.context,
        ud.validation_count,
        ud.works_correctly
    FROM ux_discoveries ud
    WHERE ud.module_key = p_module_key
        AND ud.validation_count >= p_min_validation_count
        AND ud.validation_status = 'validated'
    ORDER BY ud.validation_count DESC, ud.last_seen_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de descubrimientos por módulo
CREATE OR REPLACE FUNCTION get_module_ux_stats(p_module_key VARCHAR(100))
RETURNS TABLE(
    total_discoveries INTEGER,
    validated_discoveries INTEGER,
    buttons_found INTEGER,
    modals_found INTEGER,
    fields_found INTEGER,
    working_flows INTEGER,
    errors_found INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_discoveries,
        COUNT(*) FILTER (WHERE validation_count >= 3)::INTEGER as validated_discoveries,
        COUNT(*) FILTER (WHERE discovery_type = 'button')::INTEGER as buttons_found,
        COUNT(*) FILTER (WHERE discovery_type = 'modal')::INTEGER as modals_found,
        COUNT(*) FILTER (WHERE discovery_type = 'field')::INTEGER as fields_found,
        COUNT(*) FILTER (WHERE discovery_type = 'flow' AND works_correctly = true)::INTEGER as working_flows,
        COUNT(*) FILTER (WHERE discovery_type = 'error')::INTEGER as errors_found
    FROM ux_discoveries
    WHERE module_key = p_module_key;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE ux_discoveries IS 'Almacena hallazgos de IntelligentUXTester para aprendizaje del sistema';
COMMENT ON COLUMN ux_discoveries.validation_count IS 'Cuántas veces se re-descubrió (mayor = más confiable)';
COMMENT ON COLUMN ux_discoveries.discovery_data IS 'JSON con datos específicos del descubrimiento';
COMMENT ON COLUMN ux_discoveries.works_correctly IS 'NULL = no testeado, true = funciona, false = error';

-- Grant permissions
GRANT ALL ON ux_discoveries TO aponnt_db_user;
GRANT ALL ON SEQUENCE ux_discoveries_id_seq TO aponnt_db_user;
