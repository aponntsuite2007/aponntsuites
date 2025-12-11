/**
 * ============================================================================
 * MIGRACIÓN: Process Chain Analytics
 * ============================================================================
 *
 * Tabla para trackear uso de process chains:
 * - Qué acciones se solicitan más
 * - Tasas de completación vs abandono
 * - Tiempos promedio de ejecución
 * - Módulos más utilizados
 * - Tendencias temporales
 *
 * Esta data alimenta:
 * - Dashboard de Analytics
 * - Sistema de Feedback
 * - Auto-mejora con ML
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

-- ============================================================================
-- TABLA: process_chain_analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS process_chain_analytics (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Action info
    action_key VARCHAR(100) NOT NULL,
    action_name VARCHAR(255) NOT NULL,
    module_name VARCHAR(100) NOT NULL,

    -- Chain details
    total_steps INTEGER DEFAULT 0,
    prerequisites_count INTEGER DEFAULT 0,
    prerequisites_fulfilled INTEGER DEFAULT 0,
    prerequisites_missing INTEGER DEFAULT 0,
    can_proceed BOOLEAN DEFAULT false,

    -- Lifecycle tracking
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    abandoned_at TIMESTAMP,

    -- Status
    status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generated', 'started', 'completed', 'abandoned')),

    -- Performance metrics
    generation_time_ms INTEGER,  -- Tiempo que tardó generar la cadena
    completion_time_ms INTEGER,  -- Tiempo que tardó el usuario en completar

    -- User agent & context
    user_agent TEXT,
    ip_address VARCHAR(50),
    referrer_module VARCHAR(100),

    -- Metadata
    warnings_count INTEGER DEFAULT 0,
    tips_count INTEGER DEFAULT 0,
    has_alternative_route BOOLEAN DEFAULT false,

    -- Feedback (se vincula con la tabla de feedback cuando se implemente)
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_comment TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_analytics_company ON process_chain_analytics(company_id);
CREATE INDEX idx_analytics_user ON process_chain_analytics(user_id);
CREATE INDEX idx_analytics_action ON process_chain_analytics(action_key);
CREATE INDEX idx_analytics_module ON process_chain_analytics(module_name);
CREATE INDEX idx_analytics_status ON process_chain_analytics(status);
CREATE INDEX idx_analytics_generated_at ON process_chain_analytics(generated_at DESC);
CREATE INDEX idx_analytics_completed_at ON process_chain_analytics(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Índice compuesto para queries de analytics
CREATE INDEX idx_analytics_company_action_date ON process_chain_analytics(company_id, action_key, generated_at DESC);
CREATE INDEX idx_analytics_company_module_date ON process_chain_analytics(company_id, module_name, generated_at DESC);

-- ============================================================================
-- FUNCIONES HELPER PARA ANALYTICS
-- ============================================================================

/**
 * Obtiene las top N acciones más solicitadas
 */
CREATE OR REPLACE FUNCTION get_top_requested_actions(
    p_company_id INTEGER,
    p_limit INTEGER DEFAULT 10,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    action_key VARCHAR,
    action_name VARCHAR,
    module_name VARCHAR,
    request_count BIGINT,
    completion_rate NUMERIC,
    avg_completion_time_minutes NUMERIC,
    last_requested_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.action_key,
        a.action_name,
        a.module_name,
        COUNT(*)::BIGINT as request_count,
        ROUND(
            (COUNT(*) FILTER (WHERE a.status = 'completed')::NUMERIC /
            NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
            2
        ) as completion_rate,
        ROUND(
            AVG(a.completion_time_ms) FILTER (WHERE a.completion_time_ms IS NOT NULL) / 60000.0,
            2
        ) as avg_completion_time_minutes,
        MAX(a.generated_at) as last_requested_at
    FROM process_chain_analytics a
    WHERE
        a.company_id = p_company_id
        AND a.generated_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY a.action_key, a.action_name, a.module_name
    ORDER BY request_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

/**
 * Obtiene estadísticas por módulo
 */
CREATE OR REPLACE FUNCTION get_module_usage_stats(
    p_company_id INTEGER,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    module_name VARCHAR,
    total_requests BIGINT,
    unique_users BIGINT,
    completion_rate NUMERIC,
    avg_prerequisites_missing NUMERIC,
    blocked_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.module_name,
        COUNT(*)::BIGINT as total_requests,
        COUNT(DISTINCT a.user_id)::BIGINT as unique_users,
        ROUND(
            (COUNT(*) FILTER (WHERE a.status = 'completed')::NUMERIC /
            NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
            2
        ) as completion_rate,
        ROUND(AVG(a.prerequisites_missing), 2) as avg_prerequisites_missing,
        ROUND(
            (COUNT(*) FILTER (WHERE a.can_proceed = false)::NUMERIC /
            NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
            2
        ) as blocked_rate
    FROM process_chain_analytics a
    WHERE
        a.company_id = p_company_id
        AND a.generated_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY a.module_name
    ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql;

/**
 * Obtiene tendencias temporales (por día)
 */
CREATE OR REPLACE FUNCTION get_time_trends(
    p_company_id INTEGER,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    total_requests BIGINT,
    completed_count BIGINT,
    abandoned_count BIGINT,
    blocked_count BIGINT,
    completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.generated_at::DATE as date,
        COUNT(*)::BIGINT as total_requests,
        COUNT(*) FILTER (WHERE a.status = 'completed')::BIGINT as completed_count,
        COUNT(*) FILTER (WHERE a.status = 'abandoned')::BIGINT as abandoned_count,
        COUNT(*) FILTER (WHERE a.can_proceed = false)::BIGINT as blocked_count,
        ROUND(
            (COUNT(*) FILTER (WHERE a.status = 'completed')::NUMERIC /
            NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
            2
        ) as completion_rate
    FROM process_chain_analytics a
    WHERE
        a.company_id = p_company_id
        AND a.generated_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY date
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

/**
 * Identifica bottlenecks (acciones con baja completación o alta tasa de bloqueo)
 */
CREATE OR REPLACE FUNCTION identify_bottlenecks(
    p_company_id INTEGER,
    p_min_requests INTEGER DEFAULT 5,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    action_key VARCHAR,
    action_name VARCHAR,
    issue_type VARCHAR,
    severity VARCHAR,
    request_count BIGINT,
    blocked_rate NUMERIC,
    completion_rate NUMERIC,
    avg_missing_prerequisites NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH action_stats AS (
        SELECT
            a.action_key,
            a.action_name,
            COUNT(*)::BIGINT as requests,
            ROUND(
                (COUNT(*) FILTER (WHERE a.can_proceed = false)::NUMERIC /
                NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
                2
            ) as blocked_pct,
            ROUND(
                (COUNT(*) FILTER (WHERE a.status = 'completed')::NUMERIC /
                NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
                2
            ) as completed_pct,
            ROUND(AVG(a.prerequisites_missing), 2) as avg_missing
        FROM process_chain_analytics a
        WHERE
            a.company_id = p_company_id
            AND a.generated_at >= NOW() - INTERVAL '1 day' * p_days
        GROUP BY a.action_key, a.action_name
        HAVING COUNT(*) >= p_min_requests
    )
    SELECT
        s.action_key,
        s.action_name,
        CASE
            WHEN s.blocked_pct >= 50 THEN 'High Block Rate'
            WHEN s.completed_pct <= 30 THEN 'Low Completion Rate'
            WHEN s.avg_missing >= 3 THEN 'Complex Prerequisites'
            ELSE 'Other'
        END as issue_type,
        CASE
            WHEN s.blocked_pct >= 70 OR s.completed_pct <= 20 THEN 'CRITICAL'
            WHEN s.blocked_pct >= 50 OR s.completed_pct <= 40 THEN 'HIGH'
            ELSE 'MEDIUM'
        END as severity,
        s.requests as request_count,
        s.blocked_pct as blocked_rate,
        s.completed_pct as completion_rate,
        s.avg_missing as avg_missing_prerequisites
    FROM action_stats s
    WHERE
        s.blocked_pct >= 50
        OR s.completed_pct <= 40
        OR s.avg_missing >= 3
    ORDER BY
        CASE
            WHEN s.blocked_pct >= 70 OR s.completed_pct <= 20 THEN 1
            WHEN s.blocked_pct >= 50 OR s.completed_pct <= 40 THEN 2
            ELSE 3
        END,
        s.requests DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER PARA AUTO-UPDATE DE updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_analytics_updated_at
    BEFORE UPDATE ON process_chain_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

-- ============================================================================
-- COMENTARIOS EN TABLA Y COLUMNAS
-- ============================================================================

COMMENT ON TABLE process_chain_analytics IS 'Tracking de uso y performance de process chains para analytics y auto-mejora';

COMMENT ON COLUMN process_chain_analytics.action_key IS 'ID único de la acción (ej: vacation-request, shift-swap)';
COMMENT ON COLUMN process_chain_analytics.status IS 'generated: creada | started: usuario empezó | completed: terminada | abandoned: abandonada';
COMMENT ON COLUMN process_chain_analytics.generation_time_ms IS 'Milisegundos que tardó el sistema en generar la cadena';
COMMENT ON COLUMN process_chain_analytics.completion_time_ms IS 'Milisegundos que tardó el usuario desde start hasta complete';
COMMENT ON COLUMN process_chain_analytics.can_proceed IS 'Si el usuario tenía todos los prerequisites (true) o le faltaban (false)';

-- ============================================================================
-- DONE ✅
-- ============================================================================

-- Verificación
SELECT
    'process_chain_analytics' as tabla_creada,
    COUNT(*) as funciones_helper
FROM pg_proc
WHERE proname IN (
    'get_top_requested_actions',
    'get_module_usage_stats',
    'get_time_trends',
    'identify_bottlenecks'
);
