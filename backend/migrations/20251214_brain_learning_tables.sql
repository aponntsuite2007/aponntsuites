-- ============================================================================
-- BRAIN LEARNING TABLES
-- ============================================================================
-- Tablas para el sistema de aprendizaje del Brain
-- - learning_patterns: Patrones aprendidos de tests
-- - test_results: Resultados históricos de tests
-- ============================================================================
-- Fecha: 2025-12-14
-- ============================================================================

-- ============================================================================
-- TABLA: learning_patterns
-- Almacena patrones de aprendizaje por módulo
-- ============================================================================

CREATE TABLE IF NOT EXISTS learning_patterns (
    id SERIAL PRIMARY KEY,
    module_key VARCHAR(100) NOT NULL UNIQUE,
    test_count INTEGER DEFAULT 0,
    total_passed INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    last_score INTEGER DEFAULT 0,
    patterns_json JSONB DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_learning_patterns_module ON learning_patterns(module_key);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_score ON learning_patterns(last_score DESC);

-- ============================================================================
-- TABLA: test_results
-- Almacena resultados históricos de tests por módulo y día
-- ============================================================================

CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    module_key VARCHAR(100) NOT NULL,
    test_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_tests INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    coverage INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    results_json JSONB DEFAULT '{}',
    discoveries_json JSONB DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint único por módulo y día (solo un registro por día por módulo)
    CONSTRAINT unique_module_date UNIQUE (module_key, (DATE(test_timestamp)))
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_test_results_module ON test_results(module_key);
CREATE INDEX IF NOT EXISTS idx_test_results_timestamp ON test_results(test_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_module_date ON test_results(module_key, DATE(test_timestamp));

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Función para obtener resumen de learning por módulo
CREATE OR REPLACE FUNCTION get_module_learning_summary(p_module_key VARCHAR)
RETURNS TABLE(
    module_key VARCHAR,
    test_count INTEGER,
    pass_rate NUMERIC,
    last_score INTEGER,
    top_error_patterns JSONB,
    last_tested TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lp.module_key,
        lp.test_count,
        CASE WHEN (lp.total_passed + lp.total_failed) > 0
             THEN ROUND(lp.total_passed::NUMERIC / (lp.total_passed + lp.total_failed) * 100, 2)
             ELSE 0
        END AS pass_rate,
        lp.last_score,
        lp.patterns_json AS top_error_patterns,
        lp.updated_at AS last_tested
    FROM learning_patterns lp
    WHERE lp.module_key = p_module_key;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener tendencia de tests de un módulo (últimos 30 días)
CREATE OR REPLACE FUNCTION get_test_trend(p_module_key VARCHAR, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    test_date DATE,
    total_tests INTEGER,
    passed INTEGER,
    failed INTEGER,
    coverage INTEGER,
    pass_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(tr.test_timestamp) AS test_date,
        tr.total_tests,
        tr.passed,
        tr.failed,
        tr.coverage,
        CASE WHEN tr.total_tests > 0
             THEN ROUND(tr.passed::NUMERIC / tr.total_tests * 100, 2)
             ELSE 0
        END AS pass_rate
    FROM test_results tr
    WHERE tr.module_key = p_module_key
      AND tr.test_timestamp >= NOW() - INTERVAL '1 day' * p_days
    ORDER BY test_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas globales de testing
CREATE OR REPLACE FUNCTION get_global_test_stats()
RETURNS TABLE(
    total_modules_tested BIGINT,
    total_test_runs BIGINT,
    global_pass_rate NUMERIC,
    avg_coverage NUMERIC,
    modules_above_80_percent BIGINT,
    modules_below_50_percent BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT lp.module_key) AS total_modules_tested,
        SUM(lp.test_count)::BIGINT AS total_test_runs,
        CASE WHEN SUM(lp.total_passed + lp.total_failed) > 0
             THEN ROUND(SUM(lp.total_passed)::NUMERIC / SUM(lp.total_passed + lp.total_failed) * 100, 2)
             ELSE 0
        END AS global_pass_rate,
        ROUND(AVG(tr.coverage), 2) AS avg_coverage,
        (SELECT COUNT(*) FROM learning_patterns WHERE last_score >= 80) AS modules_above_80_percent,
        (SELECT COUNT(*) FROM learning_patterns WHERE last_score < 50 AND test_count > 0) AS modules_below_50_percent
    FROM learning_patterns lp
    LEFT JOIN (
        SELECT module_key, MAX(coverage) as coverage
        FROM test_results
        GROUP BY module_key
    ) tr ON lp.module_key = tr.module_key;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MENSAJE DE FINALIZACIÓN
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Brain Learning Tables created successfully!';
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - learning_patterns: Stores learning patterns per module';
    RAISE NOTICE '  - test_results: Stores historical test results';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - get_module_learning_summary(module_key)';
    RAISE NOTICE '  - get_test_trend(module_key, days)';
    RAISE NOTICE '  - get_global_test_stats()';
    RAISE NOTICE '====================================================';
END $$;
